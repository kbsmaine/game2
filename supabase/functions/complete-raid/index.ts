import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Item={name:string,value:number,weight:number,rarity:string}
const I=(name:string,value:number,weight:number,rarity='common'):Item=>({name,value,weight,rarity})
const catalog:Record<string,Item>={
  bandage:I('Army Bandage',85,.12),medkit:I('Field Medkit',390,1.1),morphine:I('Morphine Injector',520,.08,'rare'),splint:I('Aluminum Splint',170,.22),antibiotic:I('Antibiotics',440,.15,'rare'),blood_bag:I('O-Neg Blood Bag',930,.55,'rare'),
  canned_beans:I('Canned Beans',95,.48),water_bottle:I('Purified Water',120,.65),energy_bar:I('Emergency Ration Bar',75,.18),coffee:I('Instant Coffee',160,.20),
  copper_wire:I('Copper Wire Coil',110,.4),battery:I('12V Battery',620,3.8),fuel_can:I('Fuel Can',740,6.2),tool_case:I('Industrial Tool Case',1180,7.8,'rare'),power_inverter:I('Industrial Power Inverter',2450,5.4,'rare'),drill:I('Cordless Drill',560,1.9),wrench_set:I('Mechanic Wrench Set',410,2.4),spark_plugs:I('Spark Plug Set',260,.35),motor:I('Electric Motor',1680,9.6,'rare'),portable_generator:I('Portable Generator GX-220',4800,94,'heavy'),
  ssd:I('Encrypted SSD',760,.08,'rare'),gpu:I('Graphics Processor',1850,1.1,'rare'),circuit_board:I('Control Circuit Board',670,.35),military_radio:I('Encrypted Field Radio',2100,1.8,'epic'),keycard:I('Restricted Access Keycard',3200,.02,'epic'),wristwatch:I('Mechanical Wristwatch',890,.12,'rare'),cash_bundle:I('Emergency Cash Bundle',1250,.20,'rare'),gold_chain:I('Gold Chain',2200,.09,'epic'),
  ammo_9x18:I('9x18mm FMJ x30',190,.32),ammo_9x19:I('9x19mm FMJ x30',230,.36),ammo_45:I('.45 ACP x24',260,.42),ammo_545:I('5.45x39mm PS x30',310,.39),ammo_556:I('5.56x45mm M855 x30',380,.38,'rare'),ammo_762x39:I('7.62x39mm PS x30',350,.52),ammo_762x54:I('7.62x54R LPS x20',420,.48,'rare'),ammo_12g:I('12 Gauge Buckshot x12',290,.58),ammo_308:I('.308 Match x20',520,.47,'rare'),
  makarov:I('PM Makarov',980,.73),glock17:I('Glock 17',1600,.91,'rare'),pistol1911:I('M1911A1',1750,1.1,'rare'),mp5:I('MP5A3',4100,2.9,'rare'),ak74:I('AK-74',5200,3.3,'rare'),m4a1:I('M4A1',6900,3.1,'epic'),sks:I('SKS Carbine',3600,3.8,'rare'),mosin:I('Mosin-Nagant',3300,4,'rare'),pump12:I('12 Gauge Pump Shotgun',2900,3.2,'rare'),saiga12:I('Saiga-12',6100,3.6,'epic'),r700:I('Remington 700',7200,4.1,'epic'),vector:I('KRISS Vector',7600,2.7,'epic'),
  frag_grenade:I('M67 Fragmentation Grenade',720,.40,'rare'),tactical_gloves:I('Tactical Gloves',280,.18),work_gloves:I('Leather Work Gloves',150,.22),winter_gloves:I('Insulated Field Gloves',460,.30,'rare'),frag_grenade:I('M67 Fragmentation Grenade',720,.40,'rare'),tactical_gloves:I('Tactical Gloves',280,.18),work_gloves:I('Leather Work Gloves',150,.22),winter_gloves:I('Insulated Field Gloves',460,.30,'rare'),scav_pack:I('Scavenger Backpack',850,1.2),patrol_pack:I('Patrol Backpack',1650,1.8,'rare'),soft_armor:I('Level II Soft Armor',1900,3.1),plate_carrier:I('Level III Plate Carrier',5100,7.4,'rare'),helmet:I('Ballistic Helmet',2400,1.45,'rare'),heavy_visor_helmet:I('Heavy Visor Helmet',5200,2.35,'epic'),gas_mask:I('Full-Face Gas Mask',3100,1.15,'rare'),heavy_visor_helmet:I('Heavy Visor Helmet',5200,2.35,'epic'),gas_mask:I('Full-Face Gas Mask',3100,1.15,'rare'),chest_rig:I('Utility Chest Rig',980,1),field_sling:I('Field Sling Bag',420,.65),expedition_pack:I('Expedition Rucksack',3400,2.9,'epic'),security_rig:I('Security Chest Rig',1350,1.25),tactical_rig:I('Tactical Chest Rig',2250,1.55,'rare'),assault_rig:I('Assault Chest Rig',3600,1.9,'epic'),slick_carrier:I('Slick Plate Carrier',2800,3.4,'rare'),heavy_plate_carrier:I('Heavy Plate Carrier',7600,5.8,'epic'),armor_plate_lvl2:I('Level II Armor Plate',1200,1.6),armor_plate_lvl3:I('Level III Armor Plate',2400,2.2,'rare'),armor_plate_lvl4:I('Level IV Armor Plate',3900,2.8,'rare'),armor_plate_lvl5:I('Level V Armor Plate',6100,3.2,'epic'),armor_plate_lvl6:I('Level VI Armor Plate',8800,3.8,'epic'),fast_helmet:I('FAST Ballistic Helmet',3900,1.25,'rare')
}

Deno.serve(async(req)=>{
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  try{
    const authHeader=req.headers.get('Authorization')||''
    const userClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authHeader}}})
    const {data:{user}}=await userClient.auth.getUser();if(!user)return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{...cors,'Content-Type':'application/json'}})
    const body=await req.json(),ids:Array<string>=Array.isArray(body.items)?body.items:[]
    if(ids.length>60)throw new Error('Invalid extraction payload.')
    const invalid=ids.find(id=>!catalog[id]);if(invalid)throw new Error('Unknown recovered item: '+invalid)
    if(ids.filter(id=>id==='portable_generator').length>1)throw new Error('Invalid heavy haul count.')
    const packWeight=ids.filter(id=>id!=='portable_generator').reduce((n,id)=>n+catalog[id].weight,0);if(packWeight>112.05)throw new Error('Field pack weight exceeded.')
    const zones=['Industrial Fringe','Mercy Clinic','Route 17 Checkpoint'];const zone=zones.includes(body.zone)?body.zone:'Industrial Fringe'
    const duration=Math.max(1,Math.min(7200,Number(body.duration_seconds)||1)),total=ids.reduce((n,id)=>n+catalog[id].value,0)
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const rows=ids.map(id=>({item_id:id,item_name:catalog[id].name,value:catalog[id].value,weight:catalog[id].weight,rarity:catalog[id].rarity}))
    const {data:commit,error}=await admin.rpc('record_extraction',{p_user_id:user.id,p_zone:zone,p_duration:duration,p_total:total,p_items:rows,p_has_generator:ids.includes('portable_generator')});if(error)throw error
    return new Response(JSON.stringify(commit),{headers:{...cors,'Content-Type':'application/json'}})
  }catch(e:any){return new Response(JSON.stringify({error:String(e?.message||e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
})
