-- DEADHAUL vertical-slice schema for Supabase/Postgres.
-- Run in Supabase SQL Editor, then deploy the complete-raid Edge Function.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  callsign text not null unique check (callsign ~ '^[A-Za-z0-9_-]{3,20}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  raids integer not null default 0 check (raids >= 0),
  extractions integer not null default 0 check (extractions >= 0),
  stash_value integer not null default 0 check (stash_value >= 0),
  bunker_level integer not null default 1 check (bunker_level >= 1),
  power integer not null default 18 check (power between 0 and 100),
  has_generator boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  value integer not null default 0 check (value >= 0),
  weight numeric(8,2) not null default 0 check (weight >= 0),
  rarity text not null default 'common',
  acquired_at timestamptz not null default now()
);
create index if not exists inventory_user_idx on public.inventory(user_id, acquired_at desc);

create table if not exists public.raids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  zone text not null,
  status text not null default 'extracted',
  duration_seconds integer not null default 0,
  recovered_value integer not null default 0,
  item_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists raids_user_idx on public.raids(user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,callsign)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'callsign',''),'SURVIVOR-'||substr(new.id::text,1,6)));
  insert into public.player_state(user_id) values(new.id);
  insert into public.player_loadout(user_id) values(new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.player_state enable row level security;
alter table public.inventory enable row level security;
alter table public.raids enable row level security;

-- Players can read their own data. Writes to progression tables are intentionally
-- omitted; the service-role Edge Function performs those writes.
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "state_select_own" on public.player_state for select using (auth.uid() = user_id);
create policy "inventory_select_own" on public.inventory for select using (auth.uid() = user_id);
create policy "raids_select_own" on public.raids for select using (auth.uid() = user_id);

-- Atomic server-only raid commit. The Edge Function validates the item catalog,
-- then this function commits inventory + raid history + progression together.
create or replace function public.record_extraction(
  p_user_id uuid,
  p_zone text,
  p_duration integer,
  p_total integer,
  p_items jsonb,
  p_has_generator boolean
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.player_state%rowtype;
  new_xp integer;
  new_level integer;
begin
  select * into s from public.player_state where user_id=p_user_id for update;
  if not found then raise exception 'player state missing'; end if;

  insert into public.inventory(user_id,item_id,item_name,value,weight,rarity)
  select p_user_id, x.item_id, x.item_name, x.value, x.weight, x.rarity
  from jsonb_to_recordset(p_items) as x(item_id text,item_name text,value integer,weight numeric,rarity text);

  insert into public.raids(user_id,zone,status,duration_seconds,recovered_value,item_count)
  values(p_user_id,p_zone,'extracted',p_duration,p_total,jsonb_array_length(p_items));

  new_xp := s.xp + greatest(50, round(p_total::numeric/20)::integer);
  new_level := 1 + floor(new_xp::numeric/500)::integer;

  update public.player_state set
    xp=new_xp,
    level=new_level,
    raids=s.raids+1,
    extractions=s.extractions+1,
    stash_value=s.stash_value+p_total,
    has_generator=(s.has_generator or p_has_generator),
    power=case when p_has_generator then greatest(s.power,92) else s.power end,
    bunker_level=case when p_has_generator then greatest(s.bunker_level,2) else s.bunker_level end,
    updated_at=now()
  where user_id=p_user_id;

  return jsonb_build_object('ok',true,'recovered_value',p_total,'xp',new_xp,'level',new_level);
end;
$$;

revoke all on function public.record_extraction(uuid,text,integer,integer,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.record_extraction(uuid,text,integer,integer,jsonb,boolean) to service_role;

-- Build 2.0: persistent equipment/loadout shared by the website and browser client.
create table if not exists public.player_loadout (
  user_id uuid primary key references auth.users(id) on delete cascade,
  loadout jsonb not null default '{"head":"helmet","armor":"soft_armor","rig":"chest_rig","backpack":"scav_pack","primary":"ak74","secondary":"makarov"}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.player_loadout enable row level security;
drop policy if exists "loadout_select_own" on public.player_loadout;
drop policy if exists "loadout_insert_own" on public.player_loadout;
drop policy if exists "loadout_update_own" on public.player_loadout;
create policy "loadout_select_own" on public.player_loadout for select using (auth.uid()=user_id);
create policy "loadout_insert_own" on public.player_loadout for insert with check (auth.uid()=user_id);
create policy "loadout_update_own" on public.player_loadout for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
insert into public.player_loadout(user_id)
select id from public.profiles
on conflict (user_id) do nothing;


-- Build 2.6.0: authenticated stash management. Equipping/unequipping and preparing
-- raid supplies moves concrete inventory rows in/out of the persistent stash.
drop policy if exists "inventory_insert_own" on public.inventory;
drop policy if exists "inventory_delete_own" on public.inventory;
create policy "inventory_insert_own" on public.inventory for insert with check (auth.uid() = user_id);
create policy "inventory_delete_own" on public.inventory for delete using (auth.uid() = user_id);
