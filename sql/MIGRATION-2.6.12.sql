-- DEADHAUL Build 2.6.12
-- Run once in Supabase SQL Editor for persistent magazine/ammo instance data.

alter table public.inventory
  add column if not exists item_data jsonb not null default '{}'::jsonb;

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

  insert into public.inventory(user_id,item_id,item_name,value,weight,rarity,item_data)
  select p_user_id, x.item_id, x.item_name, x.value, x.weight, x.rarity, coalesce(x.item_data,'{}'::jsonb)
  from jsonb_to_recordset(p_items)
    as x(item_id text,item_name text,value integer,weight numeric,rarity text,item_data jsonb);

  insert into public.raids(user_id,zone,status,duration_seconds,recovered_value,item_count)
  values(p_user_id,p_zone,'extracted',p_duration,p_total,jsonb_array_length(p_items));

  new_xp := s.xp + greatest(50, round(p_total::numeric/20)::integer);
  new_level := 1 + floor(new_xp::numeric/500)::integer;

  update public.player_state set
    xp=new_xp, level=new_level, raids=s.raids+1, extractions=s.extractions+1,
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
