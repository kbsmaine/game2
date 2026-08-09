(function(){
  const cfg=window.DEADHAUL_CONFIG||{};
  const configured=!!(cfg.supabaseUrl&&cfg.supabaseAnonKey&&!cfg.supabaseUrl.includes('YOUR_')&&!cfg.supabaseAnonKey.includes('YOUR_'));
  const client=configured&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
  const DEMO_SESSION_KEY='deadhaul_demo_session';
  const DEMO_DATA_KEY='deadhaul_demo_data_v3';
  const PREVIOUS_DEMO_DATA_KEY='deadhaul_demo_data_v2';
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
    ammo_9x18:{name:'9x18mm FMJ',weight:.0107,value:7,rarity:'common',category:'ammo',caliber:'9x18',stackRounds:60},
    ammo_9x19:{name:'9x19mm FMJ',weight:.012,value:8,rarity:'common',category:'ammo',caliber:'9x19',stackRounds:60},
    ammo_45:{name:'.45 ACP FMJ',weight:.0175,value:11,rarity:'common',category:'ammo',caliber:'45acp',stackRounds:50},
    ammo_545:{name:'5.45x39mm PS',weight:.013,value:11,rarity:'common',category:'ammo',caliber:'545',stackRounds:60},
    ammo_556:{name:'5.56x45mm M855',weight:.0127,value:13,rarity:'rare',category:'ammo',caliber:'556',stackRounds:60},
    ammo_762x39:{name:'7.62x39mm PS',weight:.0173,value:12,rarity:'common',category:'ammo',caliber:'762x39',stackRounds:60},
    ammo_762x54:{name:'7.62x54R LPS',weight:.024,value:21,rarity:'rare',category:'ammo',caliber:'762x54',stackRounds:40},
    ammo_308:{name:'.308 Match',weight:.0235,value:26,rarity:'rare',category:'ammo',caliber:'308',stackRounds:40},
    ammo_12g:{name:'12 Gauge 00 Buckshot',weight:.048,value:24,rarity:'common',category:'ammo',caliber:'12g',stackRounds:20,shellType:'buckshot'},
    ammo_12g_slug:{name:'12 Gauge Rifled Slug',weight:.045,value:42,rarity:'rare',category:'ammo',caliber:'12g',stackRounds:20,shellType:'slug'},
    ammo_12g_flechette:{name:'12 Gauge Flechette',weight:.041,value:58,rarity:'rare',category:'ammo',caliber:'12g',stackRounds:20,shellType:'flechette'},
    // Detachable magazines — Build 2.6.12. Magazines are persistent containers and spawn empty.
    mag_pm_8:{name:'PM 8-rd Magazine',weight:.16,value:145,rarity:'common',category:'magazine',weapons:['makarov'],capacity:8,caliber:'9x18',cells:1},
    mag_g17_17:{name:'G17 17-rd Magazine',weight:.27,value:260,rarity:'common',category:'magazine',weapons:['glock17'],capacity:17,caliber:'9x19',cells:1},
    mag_g17_33:{name:'G17 33-rd Extended Magazine',weight:.42,value:540,rarity:'rare',category:'magazine',weapons:['glock17'],capacity:33,caliber:'9x19',cells:2},
    mag_1911_8:{name:'1911 8-rd Magazine',weight:.22,value:220,rarity:'common',category:'magazine',weapons:['pistol1911'],capacity:8,caliber:'45acp',cells:1},
    mag_1911_15:{name:'1911 15-rd Extended Magazine',weight:.36,value:490,rarity:'rare',category:'magazine',weapons:['pistol1911'],capacity:15,caliber:'45acp',cells:2},
    mag_mp5_30:{name:'MP5 30-rd Magazine',weight:.48,value:420,rarity:'common',category:'magazine',weapons:['mp5'],capacity:30,caliber:'9x19',cells:1},
    mag_mp5_50:{name:'MP5 50-rd Drum',weight:.88,value:1120,rarity:'epic',category:'magazine',weapons:['mp5'],capacity:50,caliber:'9x19',cells:2},
    mag_ak74_30:{name:'AK-74 30-rd Magazine',weight:.52,value:510,rarity:'common',category:'magazine',weapons:['ak74'],capacity:30,caliber:'545',cells:1},
    mag_ak74_45:{name:'AK-74 45-rd Extended Magazine',weight:.69,value:790,rarity:'rare',category:'magazine',weapons:['ak74'],capacity:45,caliber:'545',cells:2},
    mag_ak74_75:{name:'AK-74 75-rd Drum',weight:1.28,value:1850,rarity:'epic',category:'magazine',weapons:['ak74'],capacity:75,caliber:'545',cells:2},
    mag_m4_30:{name:'STANAG 30-rd Magazine',weight:.47,value:590,rarity:'rare',category:'magazine',weapons:['m4a1'],capacity:30,caliber:'556',cells:1},
    mag_m4_40:{name:'STANAG 40-rd Extended Magazine',weight:.61,value:880,rarity:'rare',category:'magazine',weapons:['m4a1'],capacity:40,caliber:'556',cells:2},
    mag_m4_60:{name:'M4 60-rd Drum',weight:1.02,value:1760,rarity:'epic',category:'magazine',weapons:['m4a1'],capacity:60,caliber:'556',cells:2},
    mag_saiga_8:{name:'Saiga-12 8-rd Magazine',weight:.72,value:680,rarity:'rare',category:'magazine',weapons:['saiga12'],capacity:8,caliber:'12g',cells:1},
    mag_saiga_12:{name:'Saiga-12 12-rd Extended Magazine',weight:.94,value:1180,rarity:'rare',category:'magazine',weapons:['saiga12'],capacity:12,caliber:'12g',cells:2},
    mag_saiga_20:{name:'Saiga-12 20-rd Drum',weight:1.46,value:2350,rarity:'epic',category:'magazine',weapons:['saiga12'],capacity:20,caliber:'12g',cells:2},
    mag_vector_25:{name:'Vector 25-rd Magazine',weight:.41,value:520,rarity:'rare',category:'magazine',weapons:['vector'],capacity:25,caliber:'9x19',cells:1},
    mag_vector_40:{name:'Vector 40-rd Extended Magazine',weight:.59,value:930,rarity:'rare',category:'magazine',weapons:['vector'],capacity:40,caliber:'9x19',cells:2},
    mag_vector_50:{name:'Vector 50-rd Drum',weight:.91,value:1680,rarity:'epic',category:'magazine',weapons:['vector'],capacity:50,caliber:'9x19',cells:2},
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

  const uid=()=>crypto.randomUUID?.()||('i_'+Math.random().toString(36).slice(2));
  function makeItemData(itemId,opts={}){const item=catalog[itemId];if(!item)return null;if(item.category==='magazine')return {uid:opts.uid||uid(),contents:Array.isArray(opts.contents)?[...opts.contents]:[]};if(item.category==='ammo')return {uid:opts.uid||uid(),rounds:Math.max(0,Math.min(item.stackRounds||60,Number(opts.rounds??item.stackRounds??60)))};return opts&&Object.keys(opts).length?{...opts}:null}
  function inputItem(ref){if(typeof ref==='string')return {id:ref,data:makeItemData(ref)};const id=ref?.id||ref?.item_id;const data=id?makeItemData(id,ref?.item_data||ref||{}):null;return {id,data}}
  function itemMetrics(itemId,data={}){const item=catalog[itemId];if(!item)return {value:0,weight:0};if(item.category==='ammo'){const rounds=Math.max(0,Number(data?.rounds??item.stackRounds??0)||0);return {value:item.value*rounds,weight:item.weight*rounds}}if(item.category==='magazine'){const contents=Array.isArray(data?.contents)?data.contents:[];return {value:item.value+contents.reduce((n,a)=>n+Number(catalog[a]?.value||0),0),weight:item.weight+contents.reduce((n,a)=>n+Number(catalog[a]?.weight||0),0)}}return {value:item.value,weight:item.weight}}
  const loadedMag=(id,ammo)=>({id,uid:uid(),contents:Array.from({length:catalog[id]?.capacity||0},()=>ammo)});
  const ammoStack=(id,rounds=catalog[id]?.stackRounds||60)=>({id,uid:uid(),rounds});
  const defaultLoadout={head:'helmet',hands:'tactical_gloves',armor:'plate_carrier',front_plate:'armor_plate_lvl3',back_plate:'armor_plate_lvl3',rig:'chest_rig',backpack:'scav_pack',primary:'ak74',secondary:'makarov',_bag:['bandage','water_bottle',ammoStack('ammo_545',60)],_rigItems:[loadedMag('mag_ak74_30','ammo_545'),loadedMag('mag_ak74_30','ammo_545'),loadedMag('mag_ak74_30','ammo_545'),'frag_grenade'],_pocketItems:[loadedMag('mag_pm_8','ammo_9x18'),'bandage'],_weaponMags:{ak74:loadedMag('mag_ak74_30','ammo_545'),makarov:loadedMag('mag_pm_8','ammo_9x18')},_internalAmmo:{}};
  function initialDemoData(callsign='ROOK-17'){
    return {profile:{callsign},state:{level:1,xp:0,raids:0,extractions:0,stash_value:0,bunker_level:1,power:18,has_generator:false},loadout:{...defaultLoadout},inventory:[],raids:[]};
  }
  function loadDemo(){try{const fresh=JSON.parse(localStorage.getItem(DEMO_DATA_KEY));if(fresh)return fresh;const prior=JSON.parse(localStorage.getItem(PREVIOUS_DEMO_DATA_KEY));if(prior){prior.loadout=prior.loadout||{...defaultLoadout};saveDemo(prior);return prior}const old=JSON.parse(localStorage.getItem(OLD_DEMO_DATA_KEY));if(old){old.loadout=old.loadout||{...defaultLoadout};saveDemo(old);return old}return initialDemoData()}catch{return initialDemoData()}}
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
  function inventoryRecordFor(ref){const {id:itemId,data}=inputItem(ref),item=catalog[itemId];if(!item)throw new Error('Unknown item: '+itemId);const metrics=itemMetrics(itemId,data);return {id:uid(),item_id:itemId,item_name:item.name,value:metrics.value,weight:metrics.weight,rarity:item.rarity,item_data:data||{},acquired_at:new Date().toISOString()}}
  async function addInventoryItem(ref){
    const session=await getSession();if(!session)throw new Error('No authenticated survivor session.');const parsed=inputItem(ref),itemId=parsed.id,item=catalog[itemId];if(!item)throw new Error('Unknown item: '+itemId);
    if(session.demo){const d=loadDemo(),rec=inventoryRecordFor(ref);d.inventory=[rec,...(d.inventory||[])];saveDemo(d);return rec}
    const metrics=itemMetrics(itemId,parsed.data);const row={user_id:session.user.id,item_id:itemId,item_name:item.name,value:metrics.value,weight:metrics.weight,rarity:item.rarity,item_data:parsed.data||{}};
    let q=await client.from('inventory').insert(row).select('*').single();if(q.error&&String(q.error.message||q.error).includes('item_data')){delete row.item_data;q=await client.from('inventory').insert(row).select('*').single()}if(q.error)throw q.error;return q.data;
  }
  async function addInventoryItems(itemRefs){
    const session=await getSession();if(!session)throw new Error('No authenticated survivor session.');
    const valid=(Array.isArray(itemRefs)?itemRefs:[]).map(inputItem).filter(x=>catalog[x.id]);if(!valid.length)return[];
    if(session.demo){const d=loadDemo(),records=(Array.isArray(itemRefs)?itemRefs:[]).filter(x=>catalog[inputItem(x).id]).map(inventoryRecordFor);d.inventory=[...records,...(d.inventory||[])];saveDemo(d);return records}
    let rows=valid.map(({id:itemId,data})=>{const item=catalog[itemId];const metrics=itemMetrics(itemId,data);return {user_id:session.user.id,item_id:itemId,item_name:item.name,value:metrics.value,weight:metrics.weight,rarity:item.rarity,item_data:data||{}}});
    let q=await client.from('inventory').insert(rows).select('*');if(q.error&&String(q.error.message||q.error).includes('item_data')){rows=rows.map(({item_data,...r})=>r);q=await client.from('inventory').insert(rows).select('*')}if(q.error)throw q.error;return q.data||[];
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
      const items=(payload.items||[]).map(inputItem).filter(x=>catalog[x.id]).map(({id:itemId,data})=>{const metrics=itemMetrics(itemId,data);return {id:uid(),item_id:itemId,item_name:catalog[itemId].name,value:metrics.value,weight:metrics.weight,rarity:catalog[itemId].rarity,item_data:data||{},acquired_at:new Date().toISOString()}});
      const value=items.reduce((a,b)=>a+b.value,0);
      const raid={id:crypto.randomUUID?.()||String(Math.random()),zone:payload.zone||'Unknown Zone',status:'extracted',duration_seconds:payload.duration_seconds||0,recovered_value:value,item_count:items.length,created_at:new Date().toISOString()};
      d.inventory=[...items,...d.inventory];d.raids=[raid,...d.raids];d.state.raids+=1;d.state.extractions+=1;d.state.stash_value+=value;d.state.xp+=Math.max(60,Math.round(value/18));d.state.level=1+Math.floor(d.state.xp/650);
      if((payload.items||[]).some(x=>inputItem(x).id==='portable_generator')){d.state.has_generator=true;d.state.power=92;d.state.bunker_level=Math.max(2,d.state.bunker_level)}
      saveDemo(d);return {raid,value,state:d.state};
    }
    const {data,error}=await client.functions.invoke(cfg.edgeFunctionName||'complete-raid',{body:payload});if(error)throw error;return data;
  }

  window.DeadhaulAuth={configured,client,catalog,defaultLoadout,getSession,enterDemo,signIn,signUp,signOut,getPlayerData,completeRaid,getLoadout,saveLoadout,addInventoryItem,addInventoryItems,removeInventoryRecord};
})();
