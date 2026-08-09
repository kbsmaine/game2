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
  $('stashGrid').innerHTML=inv.length?inv.map(x=>`<article class="stash-card ${x.rarity||''}"><span>${(x.rarity||'RECOVERED').toUpperCase()}</span><h3>${x.item_name||x.item_id}</h3><b>${recordAmmoMeta(x)?recordAmmoMeta(x)+' // ':''}${Number(x.weight||0).toFixed(2)} KG // ${money(x.value)}</b></article>`).join(''):'<div class="empty-state">Stash empty. The surface has what you need.</div>';

  const raids=data.raids||[];
  if(raids.length){const r=raids[0];$('latestRaidStatus').textContent=(r.status||'extracted').toUpperCase();$('latestRaidZone').textContent=(r.zone||'Industrial Fringe').toUpperCase();$('latestRaidDuration').textContent=formatTime(r.duration_seconds);$('latestRaidValue').textContent=money(r.recovered_value);$('latestRaidItems').textContent=r.item_count||0}
  $('raidList').innerHTML=raids.length?raids.map((r,i)=>`<article class="raid-row"><div><span>RAID #${String(raids.length-i).padStart(4,'0')}</span><h3>${(r.zone||'Industrial Fringe').toUpperCase()}</h3></div><div><span>RESULT</span><b class="success">${(r.status||'extracted').toUpperCase()}</b></div><div><span>DURATION</span><b>${formatTime(r.duration_seconds)}</b></div><div><span>RECOVERED</span><b>${money(r.recovered_value)}</b></div><div><span>ITEMS</span><b>${r.item_count||0}</b></div></article>`).join(''):'<div class="empty-state">No field records yet.</div>';

  function formatTime(sec){sec=Number(sec||0);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.command-view').forEach(v=>v.classList.remove('active'));$('view-'+btn.dataset.view).classList.add('active');
  }));
  $('signOutBtn').addEventListener('click',async()=>{await A.signOut();location.href='index.html'});
})();
