(async function(){
  const A=window.DeadhaulAuth;
  const modal=document.getElementById('authModal'), launch=document.getElementById('launchBtn'), account=document.getElementById('accountBtn');
  const demoBtn=document.getElementById('demoAccess'), errorBox=document.getElementById('authError');
  document.getElementById('authStatus').textContent=A.configured?'ONLINE':'DEMO READY';
  document.getElementById('dbStatus').textContent=A.configured?'CONNECTED':'NOT CONFIGURED';
  if(!A.configured && window.DEADHAUL_CONFIG?.allowDemoMode) demoBtn.classList.remove('hidden');

  function open(){modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false')}
  function close(){modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');errorBox.textContent=''}
  document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',close));
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    document.getElementById('loginForm').classList.toggle('hidden',btn.dataset.tab!=='login');
    document.getElementById('registerForm').classList.toggle('hidden',btn.dataset.tab!=='register');
  }));

  async function routeIfAuthed(){const s=await A.getSession();if(s){location.href='command.html';return true}return false}
  launch.addEventListener('click',async()=>{if(!await routeIfAuthed()) open()});
  account.addEventListener('click',async()=>{if(!await routeIfAuthed()) open()});

  document.getElementById('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();errorBox.textContent='';
    try{await A.signIn(document.getElementById('loginEmail').value,document.getElementById('loginPassword').value);location.href='command.html'}catch(err){errorBox.textContent=err.message||String(err)}
  });
  document.getElementById('registerForm').addEventListener('submit',async e=>{
    e.preventDefault();errorBox.textContent='';
    try{
      const result=await A.signUp(document.getElementById('registerName').value,document.getElementById('registerEmail').value,document.getElementById('registerPassword').value);
      if(result.session) location.href='command.html'; else errorBox.textContent='Account created. Check your email if confirmation is enabled, then sign in.';
    }catch(err){errorBox.textContent=err.message||String(err)}
  });
  demoBtn.addEventListener('click',async()=>{await A.enterDemo('ROOK-17');location.href='command.html'});
})();
