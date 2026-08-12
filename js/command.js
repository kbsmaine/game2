(async function(){
  const A=window.DeadhaulAuth;
  const session=await A.getSession(); if(!session){location.href='index.html';return}
  let data;
  try{data=await A.getPlayerData()}catch(err){alert('Could not load survivor data: '+err.message);return}
  const $=id=>document.getElementById(id), money=n=>'$'+Number(n||0).toLocaleString();
  const recordAmmoMeta=x=>{const item=A.catalog[x?.item_id]||{},d=x?.item_data||{};if(item.category==='magazine')return `${Array.isArray(d.contents)?d.contents.length:0}/${item.capacity||0} RD`;if(item.category==='ammo')return `${Math.max(0,Number(d.rounds??item.stackRounds??0)||0)} RD`;return''};
  $('callsign').textContent=data.profile?.callsign||session.user.user_metadata?.callsign||'UNKNOWN';
  $('level').textContent=data.state.level||1;$('raidsCount').textContent=data.state.raids||0;$('extractCount').textContent=data.state.extractions||0;$('stashValue').textContent=money(data.state.stash_value);
  $('bunkerLevel').textContent='LEVEL '+(data.state.bunker_level||1);$('powerMeter').style.width=(data.state.power||0)+'%';$('powerText').textContent=(data.state.power||0)+'%';
  if(data.state.has_generator){$('generatorState').textContent='GENERATOR // GX-220 ONLINE';$('generatorState').style.color='#c9f36a';$('generatorState').style.borderColor='#526840';$('generatorState').style.background='#0d160a';$('generatorRoom').classList.add('online');$('generatorRoom').innerHTML='GENERATOR<br><small style="color:#c9f36a">GX-220 ONLINE</small>'}

  const loadout=data.loadout||A.defaultLoadout||{};
  if($('loadoutGrid')){const slots=[['head','HEAD'],['armor','CARRIER / ARMOR'],['front_plate','FRONT PLATE'],['back_plate','BACK PLATE'],['rig','CHEST RIG'],['backpack','BACKPACK'],['primary','PRIMARY'],['secondary','SIDEARM']];$('loadoutGrid').innerHTML=slots.map(([slot,label])=>{const id=loadout[slot],item=A.catalog[id]||{};return `<article class="stash-card ${item.rarity||''}"><span>${label}</span><h3>${item.name||'EMPTY'}</h3><b>${item.weight?Number(item.weight).toFixed(1)+' KG':'--'}</b></article>`}).join('')}

  const inv=data.inventory||[];
  $('recentInventory').innerHTML=inv.length?inv.slice(0,5).map(x=>`<div class="inventory-row"><b>${x.item_name||x.item_id}${recordAmmoMeta(x)?' // '+recordAmmoMeta(x):''}</b><span>${Number(x.weight||0).toFixed(2)} KG</span><span>${money(x.value)}</span></div>`).join(''):'No recovered items yet. Launch a raid.';
  let stashCategory='all',stashSearch='',stashSort='recent';
  const stashCollator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'}),rarityRank={common:0,rare:1,epic:2,heavy:3};
  function stashRecordCategory(x){const category=A.catalog[x.item_id]?.category||'misc';if(category==='weapon')return'weapons';if(category==='magazine')return'magazines';if(category==='ammo')return'ammo';if(category==='medical')return'medical';if(['food','throwable'].includes(category))return'supplies';if(['industrial','heavy'].includes(category))return'industrial';if(category==='tech')return'tech';if(category==='valuable')return'valuables';if(category==='gear')return'gear';return'misc'}
  function stashRecordName(x){return A.catalog[x.item_id]?.name||x.item_name||x.item_id||'Unknown Item'}
  function stashRecordTime(x){const time=Date.parse(x.acquired_at||'');return Number.isFinite(time)?time:null}
  function compareStashRecords(a,b){const byName=()=>stashCollator.compare(stashRecordName(a),stashRecordName(b));if(stashSort==='name_asc')return byName();if(stashSort==='name_desc')return-byName();if(stashSort==='category')return stashCollator.compare(stashRecordCategory(a),stashRecordCategory(b))||byName();if(stashSort==='value_desc')return Number(b.value||0)-Number(a.value||0)||byName();if(stashSort==='value_asc')return Number(a.value||0)-Number(b.value||0)||byName();if(stashSort==='weight_desc')return Number(b.weight||0)-Number(a.weight||0)||byName();if(stashSort==='weight_asc')return Number(a.weight||0)-Number(b.weight||0)||byName();if(stashSort==='rarity_desc')return (rarityRank[b.rarity]||0)-(rarityRank[a.rarity]||0)||byName();if(stashSort==='oldest'||stashSort==='recent'){const at=stashRecordTime(a),bt=stashRecordTime(b);if(at===null&&bt===null)return 0;if(at===null)return 1;if(bt===null)return-1;return stashSort==='oldest'?at-bt:bt-at}return 0}
  function filteredStash(){const q=stashSearch.trim().toLowerCase();return inv.map((record,index)=>({record,index})).filter(({record})=>{const category=stashRecordCategory(record),item=A.catalog[record.item_id]||{};if(stashCategory!=='all'&&category!==stashCategory)return false;return!q||`${stashRecordName(record)} ${record.item_id||''} ${item.category||''} ${category}`.toLowerCase().includes(q)}).sort((a,b)=>compareStashRecords(a.record,b.record)||a.index-b.index).map(x=>x.record)}
  function renderCommandStash(){const visible=filteredStash();$('commandStashCount').textContent=`${visible.length} / ${inv.length}`;$('stashGrid').innerHTML=visible.length?visible.map(x=>`<article class="stash-card ${x.rarity||''}"><span>${stashRecordCategory(x).toUpperCase()} // ${(x.rarity||'RECOVERED').toUpperCase()}</span><h3>${stashRecordName(x)}</h3><b>${recordAmmoMeta(x)?recordAmmoMeta(x)+' // ':''}${Number(x.weight||0).toFixed(2)} KG // ${money(x.value)}</b></article>`).join(''):`<div class="empty-state">${inv.length?'No items match this stash view.':'Stash empty. The surface has what you need.'}</div>`}
  $('commandStashSearch')?.addEventListener('input',e=>{stashSearch=e.target.value||'';renderCommandStash()});$('commandStashCategory')?.addEventListener('change',e=>{stashCategory=e.target.value||'all';renderCommandStash()});$('commandStashSort')?.addEventListener('change',e=>{stashSort=e.target.value||'recent';renderCommandStash()});renderCommandStash();

  const raids=data.raids||[];
  if(raids.length){const r=raids[0];$('latestRaidStatus').textContent=(r.status||'extracted').toUpperCase();$('latestRaidZone').textContent=(r.zone||'Industrial Fringe').toUpperCase();$('latestRaidDuration').textContent=formatTime(r.duration_seconds);$('latestRaidValue').textContent=money(r.recovered_value);$('latestRaidItems').textContent=r.item_count||0}
  $('raidList').innerHTML=raids.length?raids.map((r,i)=>`<article class="raid-row"><div><span>RAID #${String(raids.length-i).padStart(4,'0')}</span><h3>${(r.zone||'Industrial Fringe').toUpperCase()}</h3></div><div><span>RESULT</span><b class="success">${(r.status||'extracted').toUpperCase()}</b></div><div><span>DURATION</span><b>${formatTime(r.duration_seconds)}</b></div><div><span>RECOVERED</span><b>${money(r.recovered_value)}</b></div><div><span>ITEMS</span><b>${r.item_count||0}</b></div></article>`).join(''):'<div class="empty-state">No field records yet.</div>';

  function formatTime(sec){sec=Number(sec||0);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.command-view').forEach(v=>v.classList.remove('active'));$('view-'+btn.dataset.view).classList.add('active');
  }));
  $('signOutBtn').addEventListener('click',async()=>{await A.signOut();location.href='index.html'});
})();
