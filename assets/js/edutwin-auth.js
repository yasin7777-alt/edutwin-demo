/* EduTwin demonstration-only account and session store. This is NOT server-side authentication. */
(function (global) {
  'use strict';
  const SESSION = 'edutwin_demo_session_v1';
  const ACCOUNTS = 'edutwin_registered_accounts_v1';
  const builtins = [
    {id:1,role:'admin',name:'Рахимжан Ясин',email:'admin@edutwin.ru',password:'Yasin_grozniy2010',access:'full',studentId:null},
    {id:2,role:'teacher',name:'Сауле Сериковна',email:'teacher@edutwin.ru',password:'Aa123456',access:'full',studentId:null},
    {id:3,role:'student',name:'Рахимжан Ясин',email:'student@edutwin.ru',password:'Student2026!',access:'full',studentId:115}
  ];
  const read = (key, fallback) => {try {const v=JSON.parse(localStorage.getItem(key));return v===null?fallback:v;}catch(_){return fallback;}};
  const accounts = () => {const rows=read(ACCOUNTS, []);return Array.isArray(rows)?rows:[];};
  const all = () => [...builtins,...accounts()];
  const session = () => {
    const obj=read(SESSION,null);
    if(!obj || !Number.isSafeInteger(obj.id)) return null;
    const found=all().find(u=>u.id===obj.id && u.email===obj.email) || null;
    if(found && found.blocked){ logout(); return null; }
    return found;
  };
  const setSession = (user) => {localStorage.setItem(SESSION,JSON.stringify({id:user.id,email:user.email}));localStorage.removeItem('loggedInUser');};
  const login = (email,password) => {
    const found=all().find(u=>u.email===String(email||'').trim().toLowerCase());
    if(!found) return null;
    if(found.blocked) return {blocked:true,name:found.name,email:found.email};
    if(found.password!==password) return null;
    setSession(found);
    return found;
  };
  const register = (data) => {
    const name=String(data.name||'').trim().replace(/\s+/g,' ');
    const email=String(data.email||'').trim().toLowerCase();
    const pwd=String(data.password||'');
    if(!/^[\p{L} -]{3,80}$/u.test(name)) throw new Error('Введите имя и фамилию (без специальных символов).');
    if(!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)) throw new Error('Введите корректный Email.');
    if(pwd.length<6) throw new Error('Пароль должен содержать не меньше 6 символов.');
    if(pwd!==data.confirmPassword) throw new Error('Пароли не совпадают.');
    if(all().some(u=>u.email===email)) throw new Error('Этот Email уже зарегистрирован.');
    const id=Math.max(1000,...accounts().map(u=>u.id))+1;
    const user={id,role:'student',name,email,password:pwd,access:'read_only',group:'ПО25-2Б',studentId:100000+id,registered:true,blocked:false};
    const next=[...accounts(),user];
    localStorage.setItem(ACCOUNTS,JSON.stringify(next));
    setSession(user);
    return user;
  };
  const setAccess = (id,access) => {
    if(session()?.role!=='admin') return false;
    if(!['full','read_only'].includes(access)) return false;
    const next=accounts();
    const found=next.find(u=>u.id===Number(id));
    if(!found) return false;
    found.access=access;
    localStorage.setItem(ACCOUNTS,JSON.stringify(next));
    return true;
  };
  const setRole = (id,role) => {
    if(session()?.role!=='admin' || !['student','teacher'].includes(role)) return false;
    const next=accounts();
    const found=next.find(u=>u.id===Number(id));
    if(!found) return false;
    found.role=role;
    found.access=role==='teacher'?'full':'read_only';
    localStorage.setItem(ACCOUNTS,JSON.stringify(next));
    return true;
  };

  const blockUser = (id) => {
    if(session()?.role!=='admin') return false;
    const next=accounts();
    const found=next.find(u=>u.id===Number(id));
    if(!found) return false;
    found.blocked=true;
    found.access='read_only';
    localStorage.setItem(ACCOUNTS,JSON.stringify(next));
    return true;
  };
  const deleteUser = (id) => {
    if(session()?.role!=='admin') return false;
    const uid=Number(id);
    const next=accounts();
    const filtered=next.filter(u=>u.id!==uid);
    if(filtered.length===next.length) return false;
    localStorage.setItem(ACCOUNTS,JSON.stringify(filtered));
    return true;
  };
  const logout = () => {localStorage.removeItem(SESSION);localStorage.removeItem('loggedInUser');};
  const setupNavigation = () => {
    const user=session();
    document.querySelectorAll('a.btn-nav').forEach(a=>{
      const label=a.textContent.trim();
      if(label==='Войти' || a.getAttribute('href')==='account.html') {
        a.href='account.html';
        if(user && label==='Войти') a.textContent='Личный кабинет';
      }
    });
    document.querySelectorAll('a[href="register.html"]').forEach(a=>{
      if(a.textContent.trim()==='Личный кабинет' || a.textContent.trim()==='Войти') a.href='account.html';
    });
  };
  const api={all,accounts,session,login,register,setAccess,setRole,blockUser,deleteUser,logout,setupNavigation};
  global.EduTwinAuth=api;
})(window);
