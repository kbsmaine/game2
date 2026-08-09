(function(){
  const cfg=window.DEADHAUL_CONFIG||{};
  const configured=!!(cfg.supabaseUrl&&cfg.supabaseAnonKey&&!cfg.supabaseUrl.includes('YOUR_')&&!cfg.supabaseAnonKey.includes('YOUR_'));
  const client=configured&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
  const DEMO_SESSION_KEY='deadhaul_demo_session';
  const DEMO_DATA_KEY='deadhaul_demo_data_v2';
  const OLD_DEMO_DATA_KEY='deadhaul_demo_data_v1';

  const catalog={
    // Medical
    bandage:{name:'Army Bandage',weight:.12,value:85,rarity:'common',category:'medical'},
    medkit:{name:'Field Medkit',weight:1.1,value:390,rarity:'common',category:'medical'},
    morphine:{name:'Morphine Injector',weight:.08,value:520,rarity:'rare',category:'medical'},
    splint:{name:'Aluminum Splint',weight:.22,value:170,rarity:'common',category:'medical'},
    antibiotic:{name:'Antibiotics',weight:.15,value:440,rarity:'rare',category:'medical'},
    blood_bag:{name:'O-Neg Blood Bag',weight:.55,value:930,rarity:'rare',category:'medical'},
    // Food / survival
    canned_beans:{name:'Canned Beans',weight:.48,value:95,rarity:'common',category:'food'},
    water_bottle:{name:'Purified Water',weight:.65,value:120,rarity:'common',category:'food'},
    energy_bar:{name:'Emergency Ration Bar',weight:.18,value:75,rarity:'common',category:'food'},
    coffee:{name:'Instant Coffee',weight:.20,value:160,rarity:'common',category:'food'},
    // Industrial / hardware
    copper_wire:{name:'Copper Wire Coil',weight:.4,value:110,rarity:'common',category:'industrial'},
    battery:{name:'12V Battery',weight:3.8,value:620,rarity:'common',category:'industrial'},
    fuel_can:{name:'Fuel Can',weight:6.2,value:740,rarity:'common',category:'industrial'},
    tool_case:{name:'Industrial Tool Case',weight:7.8,value:1180,rarity:'rare',category:'industrial'},
    power_inverter:{name:'Industrial Power Inverter',weight:5.4,value:2450,rarity:'rare',category:'industrial'},
    drill:{name:'Cordless Drill',weight:1.9,value:560,rarity:'common',category:'industrial'},
    wrench_set:{name:'Mechanic Wrench Set',weight:2.4,value:410,rarity:'common',category:'industrial'},
    spark_plugs:{name:'Spark Plug Set',weight:.35,value:260,rarity:'common',category:'industrial'},
    motor:{name:'Electric Motor',weight:9.6,value:1680,rarity:'rare',category:'industrial'},
    portable_generator:{name:'Portable Generator GX-220',weight:94,value:4800,rarity:'heavy',category:'heavy'},
    // Electronics / valuables
    ssd:{name:'Encrypted SSD',weight:.08,value:760,rarity:'rare',category:'tech'},
    gpu:{name:'Graphics Processor',weight:1.1,value:1850,rarity:'rare',category:'tech'},
    circuit_board:{name:'Control Circuit Board',weight:.35,value:670,rarity:'common',category:'tech'},
    military_radio:{name:'Encrypted Field Radio',weight:1.8,value:2100,rarity:'epic',category:'tech'},
    keycard:{name:'Restricted Access Keycard',weight:.02,value:3200,rarity:'epic',category:'valuable'},
    wristwatch:{name:'Mechanical Wristwatch',weight:.12,value:890,rarity:'rare',category:'valuable'},
    cash_bundle:{name:'Emergency Cash Bundle',weight:.20,value:1250,rarity:'rare',category:'valuable'},
    gold_chain:{name:'Gold Chain',weight:.09,value:2200,rarity:'epic',category:'valuable'},
    // Ammunition
    ammo_9x18:{name:'9x18mm FMJ x30',weight:.32,value:190,rarity:'common',category:'ammo'},
    ammo_9x19:{name:'9x19mm FMJ x30',weight:.36,value:230,rarity:'common',category:'ammo'},
    ammo_45:{name:'.45 ACP x24',weight:.42,value:260,rarity:'common',category:'ammo'},
    ammo_545:{name:'5.45x39mm PS x30',weight:.39,value:310,rarity:'common',category:'ammo'},
    ammo_556:{name:'5.56x45mm M855 x30',weight:.38,value:380,rarity:'rare',category:'ammo'},
    ammo_762x39:{name:'7.62x39mm PS x30',weight:.52,value:350,rarity:'common',category:'ammo'},
    ammo_762x54:{name:'7.62x54R LPS x20',weight:.48,value:420,rarity:'rare',category:'ammo'},
    ammo_12g:{name:'12 Gauge Buckshot x12',weight:.58,value:290,rarity:'common',category:'ammo'},
    ammo_308:{name:'.308 Match x20',weight:.47,value:520,rarity:'rare',category:'ammo'},
    // Detachable magazines — Build 2.6.8
    mag_pm_8:{name:'PM 8-rd Magazine',weight:.16,value:145,rarity:'common',category:'magazine',weapon:'makarov',rounds:8,ammo:'ammo_9x18'},
    mag_g17_17:{name:'G17 17-rd Magazine',weight:.27,value:260,rarity:'common',category:'magazine',weapon:'glock17',rounds:17,ammo:'ammo_9x19'},
    mag_1911_8:{name:'1911 8-rd Magazine',weight:.22,value:220,rarity:'common',category:'magazine',weapon:'pistol1911',rounds:8,ammo:'ammo_45'},
    mag_mp5_30:{name:'MP5 30-rd Magazine',weight:.48,value:420,rarity:'common',category:'magazine',weapon:'mp5',rounds:30,ammo:'ammo_9x19'},
    mag_ak74_30:{name:'AK-74 30-rd Magazine',weight:.52,value:510,rarity:'common',category:'magazine',weapon:'ak74',rounds:30,ammo:'ammo_545'},
    mag_m4_30:{name:'STANAG 30-rd Magazine',weight:.47,value:590,rarity:'rare',category:'magazine',weapon:'m4a1',rounds:30,ammo:'ammo_556'},
    mag_saiga_8:{name:'Saiga-12 8-rd Magazine',weight:.72,value:680,rarity:'rare',category:'magazine',weapon:'saiga12',rounds:8,ammo:'ammo_12g'},
    mag_vector_25:{name:'Vector 25-rd Magazine',weight:.41,value:520,rarity:'rare',category:'magazine',weapon:'vector',rounds:25,ammo:'ammo_9x19'},
    // Weapons
    makarov:{name:'PM Makarov',weight:.73,value:980,rarity:'common',category:'weapon'},
    glock17:{name:'Glock 17',weight:.91,value:1600,rarity:'rare',category:'weapon'},
    pistol1911:{name:'M1911A1',weight:1.1,value:1750,rarity:'rare',category:'weapon'},
    mp5:{name:'MP5A3',weight:2.9,value:4100,rarity:'rare',category:'weapon'},
    ak74:{name:'AK-74',weight:3.3,value:5200,rarity:'rare',category:'weapon'},
    m4a1:{name:'M4A1',weight:3.1,value:6900,rarity:'epic',category:'weapon'},
    sks:{name:'SKS Carbine',weight:3.8,value:3600,rarity:'rare',category:'weapon'},
    mosin:{name:'Mosin-Nagant',weight:4.0,value:3300,rarity:'rare',category:'weapon'},
    pump12:{name:'12 Gauge Pump Shotgun',weight:3.2,value:2900,rarity:'rare',category:'weapon'},
    saiga12:{name:'Saiga-12',weight:3.6,value:6100,rarity:'epic',category:'weapon'},
    r700:{name:'Remington 700',weight:4.1,value:7200,rarity:'epic',category:'weapon'},
    vector:{name:'KRISS Vector',weight:2.7,value:7600,rarity:'epic',category:'weapon'},
    // Throwables
    frag_grenade:{name:'M67 Fragmentation Grenade',weight:.40,value:720,rarity:'rare',category:'throwable'},
    // Hand gear
    tactical_gloves:{name:'Tactical Gloves',weight:.18,value:280,rarity:'common',category:'gear'},
    work_gloves:{name:'Leather Work Gloves',weight:.22,value:150,rarity:'common',category:'gear'},
    winter_gloves:{name:'Insulated Field Gloves',weight:.30,value:460,rarity:'rare',category:'gear'},
    // Gear
    field_sling:{name:'Field Sling Bag',weight:.65,value:420,rarity:'common',category:'gear'},
    scav_pack:{name:'Scavenger Backpack',weight:1.2,value:850,rarity:'common',category:'gear'},
    patrol_pack:{name:'Patrol Backpack',weight:1.8,value:1650,rarity:'rare',category:'gear'},
    expedition_pack:{name:'Expedition Rucksack',weight:2.9,value:3400,rarity:'epic',category:'gear'},
    chest_rig:{name:'Utility Chest Rig',weight:1.0,value:980,rarity:'common',category:'gear'},
    security_rig:{name:'Security Chest Rig',weight:1.25,value:1350,rarity:'common',category:'gear'},
    tactical_rig:{name:'Tactical Chest Rig',weight:1.55,value:2250,rarity:'rare',category:'gear'},
    assault_rig:{name:'Assault Chest Rig',weight:1.9,value:3600,rarity:'epic',category:'gear'},
    soft_armor:{name:'Level II Soft Armor',weight:3.1,value:1900,rarity:'common',category:'gear'},
    slick_carrier:{name:'Slick Plate Carrier',weight:3.4,value:2800,rarity:'rare',category:'gear'},
    plate_carrier:{name:'Modular Plate Carrier',weight:4.2,value:5100,rarity:'rare',category:'gear'},
    heavy_plate_carrier:{name:'Heavy Plate Carrier',weight:5.8,value:7600,rarity:'epic',category:'gear'},
    armor_plate_lvl2:{name:'Level II Armor Plate',weight:1.6,value:1200,rarity:'common',category:'gear'},
    armor_plate_lvl3:{name:'Level III Armor Plate',weight:2.2,value:2400,rarity:'rare',category:'gear'},
    armor_plate_lvl4:{name:'Level IV Armor Plate',weight:2.8,value:3900,rarity:'rare',category:'gear'},
    armor_plate_lvl5:{name:'Level V Armor Plate',weight:3.2,value:6100,rarity:'epic',category:'gear'},
    armor_plate_lvl6:{name:'Level VI Armor Plate',weight:3.8,value:8800,rarity:'epic',category:'gear'},
    helmet:{name:'Ballistic Helmet',weight:1.45,value:2400,rarity:'rare',category:'gear'},
    fast_helmet:{name:'FAST Ballistic Helmet',weight:1.25,value:3900,rarity:'rare',category:'gear'},
    heavy_visor_helmet:{name:'Heavy Visor Helmet',weight:2.35,value:5200,rarity:'epic',category:'gear'},
    gas_mask:{name:'Full-Face Gas Mask',weight:1.15,value:3100,rarity:'rare',category:'gear'}
  };

  const defaultLoadout={head:'helmet',hands:'tactical_gloves',armor:'plate_carrier',front_plate:'armor_plate_lvl3',back_plate:'armor_plate_lvl3',rig:'chest_rig',backpack:'scav_pack',primary:'ak74',secondary:'makarov',_bag:['bandage','water_bottle'],_rigItems:['mag_ak74_30','mag_ak74_30','mag_ak74_30','frag_grenade'],_pocketItems:['mag_pm_8','bandage']};
  function initialDemoData(callsign='ROOK-17'){
    return {profile:{callsign},state:{level:1,xp:0,raids:0,extractions:0,stash_value:0,bunker_level:1,power:18,has_generator:false},loadout:{...defaultLoadout},inventory:[],raids:[]};
  }
  function loadDemo(){try{const fresh=JSON.parse(localStorage.getItem(DEMO_DATA_KEY));if(fresh)return fresh;const old=JSON.parse(localStorage.getItem(OLD_DEMO_DATA_KEY));if(old){old.loadout=old.loadout||{...defaultLoadout};saveDemo(old);return old}return initialDemoData()}catch{return initialDemoData()}}
  function saveDemo(data){localStorage.setItem(DEMO_DATA_KEY,JSON.stringify(data))}
  function demoSession(){try{return JSON.parse(sessionStorage.getItem(DEMO_SESSION_KEY))}catch{return null}}

  async function getSession(){if(client){const {data}=await client.auth.getSession();return data.session}return demoSession()}
  async function enterDemo(callsign='ROOK-17'){
    const session={user:{id:'demo-survivor',email:'offline@deadhaul.local',user_metadata:{callsign}},demo:true};
    sessionStorage.setItem(DEMO_SESSION_KEY,JSON.stringify(session));
    const d=loadDemo();if(!d.profile?.callsign){d.profile={callsign};saveDemo(d)}return session;
  }
  async function signIn(email,password){if(!client)throw new Error('Backend not configured. Use Offline Demo or configure Supabase in config.js.');const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data.session}
  async function signUp(callsign,email,password){if(!client)throw new Error('Backend not configured. Configure Supabase first, or use Offline Demo.');const {data,error}=await client.auth.signUp({email,password,options:{data:{callsign}}});if(error)throw error;return data}
  async function signOut(){if(client)await client.auth.signOut();sessionStorage.removeItem(DEMO_SESSION_KEY)}

  async function getLoadout(){
    const session=await getSession();if(!session)return {...defaultLoadout};
    if(session.demo)return {...defaultLoadout,...(loadDemo().loadout||{})};
    const {data,error}=await client.from('player_loadout').select('loadout').eq('user_id',session.user.id).maybeSingle();
    if(error)console.warn('Loadout read failed',error);return {...defaultLoadout,...(data?.loadout||{})};
  }
  async function saveLoadout(loadout){
    const session=await getSession();if(!session)return;
    if(session.demo){const d=loadDemo();d.loadout={...defaultLoadout,...loadout};saveDemo(d);return}
    const {error}=await client.from('player_loadout').upsert({user_id:session.user.id,loadout:{...defaultLoadout,...loadout},updated_at:new Date().toISOString()});if(error)throw error;
  }

  async function getPlayerData(){
    const session=await getSession();if(!session)return null;
    if(session.demo){const d=loadDemo();d.loadout={...defaultLoadout,...(d.loadout||{})};return d}
    const uid=session.user.id;
    const [p,s,i,r,l]=await Promise.all([
      client.from('profiles').select('*').eq('id',uid).single(),
      client.from('player_state').select('*').eq('user_id',uid).single(),
      client.from('inventory').select('*').eq('user_id',uid).order('acquired_at',{ascending:false}),
      client.from('raids').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(50),
      client.from('player_loadout').select('loadout').eq('user_id',uid).maybeSingle()
    ]);
    if(p.error)throw p.error;if(s.error)throw s.error;
    return {profile:p.data,state:s.data,inventory:i.data||[],raids:r.data||[],loadout:{...defaultLoadout,...(l.data?.loadout||{})}};
  }
  function inventoryRecordFor(itemId){const item=catalog[itemId];if(!item)throw new Error('Unknown item: '+itemId);return {id:crypto.randomUUID?.()||String(Math.random()),item_id:itemId,item_name:item.name,value:item.value,weight:item.weight,rarity:item.rarity,acquired_at:new Date().toISOString()}}
  async function addInventoryItem(itemId){
    const session=await getSession();if(!session)throw new Error('No authenticated survivor session.');const item=catalog[itemId];if(!item)throw new Error('Unknown item: '+itemId);
    if(session.demo){const d=loadDemo(),rec=inventoryRecordFor(itemId);d.inventory=[rec,...(d.inventory||[])];saveDemo(d);return rec}
    const row={user_id:session.user.id,item_id:itemId,item_name:item.name,value:item.value,weight:item.weight,rarity:item.rarity};
    const {data,error}=await client.from('inventory').insert(row).select('*').single();if(error)throw error;return data;
  }
  async function removeInventoryRecord(recordId){
    const session=await getSession();if(!session)throw new Error('No authenticated survivor session.');
    if(session.demo){const d=loadDemo(),idx=(d.inventory||[]).findIndex(x=>String(x.id)===String(recordId));if(idx<0)throw new Error('Stash item not found.');const [removed]=d.inventory.splice(idx,1);saveDemo(d);return removed}
    const {data,error}=await client.from('inventory').delete().eq('user_id',session.user.id).eq('id',recordId).select('*').maybeSingle();if(error)throw error;if(!data)throw new Error('Stash item not found.');return data;
  }

  async function completeRaid(payload){
    const session=await getSession();if(!session)throw new Error('No authenticated survivor session.');
    if(session.demo){
      const d=loadDemo();
      const items=(payload.items||[]).filter(id=>catalog[id]).map(id=>({id:crypto.randomUUID?.()||String(Math.random()),item_id:id,item_name:catalog[id].name,value:catalog[id].value,weight:catalog[id].weight,rarity:catalog[id].rarity,acquired_at:new Date().toISOString()}));
      const value=items.reduce((a,b)=>a+b.value,0);
      const raid={id:crypto.randomUUID?.()||String(Math.random()),zone:payload.zone||'Unknown Zone',status:'extracted',duration_seconds:payload.duration_seconds||0,recovered_value:value,item_count:items.length,created_at:new Date().toISOString()};
      d.inventory=[...items,...d.inventory];d.raids=[raid,...d.raids];d.state.raids+=1;d.state.extractions+=1;d.state.stash_value+=value;d.state.xp+=Math.max(60,Math.round(value/18));d.state.level=1+Math.floor(d.state.xp/650);
      if((payload.items||[]).includes('portable_generator')){d.state.has_generator=true;d.state.power=92;d.state.bunker_level=Math.max(2,d.state.bunker_level)}
      saveDemo(d);return {raid,value,state:d.state};
    }
    const {data,error}=await client.functions.invoke(cfg.edgeFunctionName||'complete-raid',{body:payload});if(error)throw error;return data;
  }

  window.DeadhaulAuth={configured,client,catalog,defaultLoadout,getSession,enterDemo,signIn,signUp,signOut,getPlayerData,completeRaid,getLoadout,saveLoadout,addInventoryItem,removeInventoryRecord};
})();
