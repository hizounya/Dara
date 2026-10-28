(function(){
'use strict';

/* ================= CONFIG =================
   Set at build time from environment variables (see .env.example; on Vercel: Project Settings > Environment Variables).
   Demo mode runs ONLY when PUBLIC_DEMO_MODE=true. Missing Supabase values never fall back to the demo:
   the Hub shows a configuration error instead (see boot). */
const CONFIG={SUPABASE_URL:import.meta.env.PUBLIC_SUPABASE_URL||'',SUPABASE_ANON_KEY:import.meta.env.PUBLIC_SUPABASE_ANON_KEY||'',GOOGLE_LOGIN:import.meta.env.PUBLIC_GOOGLE_LOGIN==='true'};
const DEMO=import.meta.env.PUBLIC_DEMO_MODE==='true';
const CONFIGURED=!!(CONFIG.SUPABASE_URL&&CONFIG.SUPABASE_ANON_KEY);

/* Brand images (logo and Dala). URLs of the build-optimised files, passed in by src/pages/hub/index.astro. */
const IMG={logo:document.getElementById('app').dataset.logo,dala:document.getElementById('app').dataset.dala};
const dalaImg=(cls,alt)=>'<img class="'+cls+'" src="'+IMG.dala+'" alt="'+(alt||'')+'" width="640" height="548">';

/* ================= constants ================= */
const LEVELS=[{v:'intern',l:'Intern'},{v:'entry',l:'Entry level'},{v:'junior',l:'Junior'},{v:'mid',l:'Mid level'},{v:'senior',l:'Senior'}];
const STATUSES=[{v:'student',l:'Student'},{v:'fresh_grad',l:'Fresh graduate'},{v:'career_switcher',l:'Career switcher'},{v:'professional',l:'Working professional'}];
const CATEGORIES=['Data & Analytics','Software Engineering','Product & Project','UI/UX Design','Marketing & Community','Operations & Business','QA & Security'];
const JOB_TYPES=[{v:'internship',l:'Internship'},{v:'full_time',l:'Full-time'},{v:'part_time',l:'Part-time'},{v:'contract',l:'Contract'},{v:'freelance',l:'Freelance'}];
const MODES=[{v:'remote',l:'Remote'},{v:'hybrid',l:'Hybrid'},{v:'onsite',l:'On-site'}];
const KINDS=[
 {v:'job',l:'Jobs',one:'Job',d:'A role you are hiring for. Members see a match score.',dl:''},
 {v:'event',l:'Events',one:'Event',d:'A meetup, workshop, webinar or competition.',dl:'Event date'},
 {v:'cert',l:'Certifications',one:'Certification',d:'A course, bootcamp or certificate worth taking.',dl:'Registration deadline'},
 {v:'program',l:'Programs & scholarships',one:'Program',d:'Scholarships, fellowships, mentoring or internship programs.',dl:'Apply by'},
 {v:'tip',l:'Tips & sharing',one:'Tip',d:'A resource, lesson or story the community can use.',dl:''}
];
const CV_MAX=2*1024*1024;
const CV_EXT=['pdf','docx'];
const SUG_BY_CAT={
 'Data & Analytics':['SQL','Excel','Python','Power BI','Tableau','Statistics','Google Sheets','Looker Studio','Data Visualization','R'],
 'Software Engineering':['JavaScript','TypeScript','React','Node.js','HTML/CSS','Java','Spring Boot','Python','Git','REST API','PostgreSQL','Docker'],
 'Product & Project':['Product Management','Agile','Jira','User Research','Roadmapping','Stakeholder Management','Project Management','Notion','Excel','SQL'],
 'UI/UX Design':['Figma','UI/UX Design','Prototyping','User Research','Design Systems','Wireframing','Usability Testing'],
 'Marketing & Community':['Social Media','Copywriting','SEO','Community Management','Content Strategy','Canva','Public Speaking','Google Analytics','Email Marketing'],
 'Operations & Business':['Excel','Project Management','Business Analysis','Process Improvement','Communication','Notion','Google Sheets','Presentation'],
 'QA & Security':['Manual Testing','Test Automation','Postman','Jira','SQL','Selenium','Cybersecurity Basics','API Testing']
};
const ALIAS={'js':'javascript','ts':'typescript','ml':'machine learning','py':'python','postgres':'postgresql','nodejs':'node.js','node':'node.js','reactjs':'react','react.js':'react','vuejs':'vue','vue.js':'vue','golang':'go','ms excel':'excel','microsoft excel':'excel','google sheet':'google sheets','gsheets':'google sheets','powerbi':'power bi','looker':'looker studio','ui/ux':'ui/ux design','ui ux':'ui/ux design','ux/ui':'ui/ux design','ui-ux':'ui/ux design','springboot':'spring boot','spring':'spring boot','restful api':'rest api','rest':'rest api'};

/* ================= helpers ================= */
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lbl=(list,v)=>{const f=list.find(x=>x.v===v);return f?f.l:(v||'')};
const first=n=>String(n||'').trim().split(/\s+/)[0]||'';
const ini=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const fmtD=d=>{if(!d)return '';const t=new Date(d);return isNaN(t)?'':t.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})};
const uid8=()=>Math.random().toString(36).slice(2,10);
const nk=s=>{s=String(s).toLowerCase().trim().replace(/\s+/g,' ');return ALIAS[s]||s};
const safeUrl=u=>{u=String(u||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u;try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:''}catch(e){return ''}};
const isEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isOpen=j=>j.is_open!==false&&!(j.deadline&&new Date(j.deadline+'T23:59:59')<new Date());
const isPast=d=>!!d&&new Date(d+'T23:59:59')<new Date();
const fmtSize=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const fileExt=n=>String(n||'').split('.').pop().toLowerCase();

const mem={};
const store={
 get(k,d){try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return k in mem?mem[k]:d},
 set(k,v){mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};

const ICON={
 check:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 x:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 plus:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 search:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
 ext:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const CIRCUIT='<svg class="circuit" viewBox="0 0 240 150" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle class="c" cx="14" cy="38" r="5"/><path class="l" d="M19 38H70L90 20H240"/><circle class="c" cx="78" cy="112" r="5"/><path class="l" d="M78 107V76L100 56H240"/><path class="l" d="M130 130V98L146 86H240"/></svg>';

/* ================= match engine ================= */
function levelIdx(v){return LEVELS.findIndex(l=>l.v===v)}
function levelScore(mv,jv){
  const a=levelIdx(mv),b=levelIdx(jv);if(a<0||b<0)return null;
  const d=a-b;
  if(d===0)return 1;
  if(d<0)return d===-1?0.5:d===-2?0.15:0;
  return d===1?0.75:d===2?0.4:0.15;
}
function sameCity(a,b){
  a=String(a||'').toLowerCase().trim();b=String(b||'').toLowerCase().trim();
  if(a.length<3||b.length<3)return false;
  return a.includes(b)||b.includes(a);
}
function matchScore(m,j){
  const ms=new Set((m.skills||[]).map(nk));
  const req=j.req_skills||[],nice=j.nice_skills||[];
  const reqHit=req.filter(s=>ms.has(nk(s))),reqMiss=req.filter(s=>!ms.has(nk(s)));
  const niceHit=nice.filter(s=>ms.has(nk(s))),niceMiss=nice.filter(s=>!ms.has(nk(s)));
  const parts=[];
  parts.push({key:'req',label:'Required skills',w:40,ok:req.length>0,s:req.length?reqHit.length/req.length:0,
    note:req.length?(reqHit.length+' of '+req.length+' required skills covered'):'The role lists no required skills'});
  parts.push({key:'nice',label:'Nice-to-have skills',w:10,ok:nice.length>0,s:nice.length?niceHit.length/nice.length:0,
    note:nice.length?(niceHit.length+' of '+nice.length+' extras covered'):'The role lists no extras'});
  const inField=(m.interests||[]).includes(j.category);
  parts.push({key:'field',label:'Field of interest',w:20,ok:true,s:inField?1:0,
    note:inField?(j.category+' is one of your fields'):(j.category+' is not one of your fields')});
  const ls=levelScore(m.level,j.level);
  parts.push({key:'level',label:'Experience level',w:15,ok:ls!==null,s:ls||0,
    note:ls===null?'Level not set':(ls===1?'Same level: '+lbl(LEVELS,j.level):('You: '+lbl(LEVELS,m.level)+'. Role: '+lbl(LEVELS,j.level)))});
  const modes=m.work_modes||[];
  let ws=0,wn='';
  if(j.work_mode==='remote'){
    ws=modes.includes('remote')?1:0.5;
    wn=modes.includes('remote')?'Remote fits your setup':'Remote role, not your preferred setup';
  }else{
    const modeOK=modes.includes(j.work_mode);
    const cityOK=!j.location||sameCity(m.city,j.location);
    ws=modeOK&&cityOK?1:modeOK?0.4:cityOK?0.2:0;
    wn=(modeOK?lbl(MODES,j.work_mode)+' fits your setup':lbl(MODES,j.work_mode)+' is not your preferred setup')+(j.location?(cityOK?', and the city matches':', but the city differs'):'');
  }
  parts.push({key:'setup',label:'Work setup and location',w:10,ok:modes.length>0,s:ws,note:wn});
  const types=m.job_types||[];
  const typeOK=types.includes(j.job_type);
  parts.push({key:'type',label:'Job type',w:5,ok:types.length>0,s:typeOK?1:0,
    note:typeOK?(lbl(JOB_TYPES,j.job_type)+' is on your list'):(lbl(JOB_TYPES,j.job_type)+' is not on your list')});
  let num=0,den=0;
  parts.forEach(p=>{if(p.ok){num+=p.s*p.w;den+=p.w}});
  const total=den?Math.max(0,Math.min(100,Math.round(100*num/den))):0;
  return {total,parts,reqHit,reqMiss,niceHit,niceMiss,reqN:req.length};
}
const band=p=>p>=80?'hi':p>=60?'mid':p>=35?'low':'min';
const bandLabel=p=>p>=80?'Strong match':p>=60?'Good match':p>=35?'Partial match':'Low match';
function completeness(m){
  const checks=[[!!m.headline,'Add a headline'],[!!m.city,'Add your city'],[(m.skills||[]).length>=4,'List at least 4 skills for sharper matches'],[(m.interests||[]).length>=1,'Pick a field of interest'],[(m.job_types||[]).length>=1,'Say what kind of role you want'],[(m.work_modes||[]).length>=1,'Choose your work setup'],[!!m.bio,'Write a short bio'],[!!m.linkedin,'Add your LinkedIn']];
  return {pct:Math.round(100*checks.filter(c=>c[0]).length/checks.length),tips:checks.filter(c=>!c[0]).map(c=>c[1])};
}

/* ================= demo backend ================= */
function seedDemo(){
  const ago=n=>new Date(Date.now()-n*864e5).toISOString();
  const inD=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
  const mk=(id,o)=>Object.assign({id,email:id+'@example.com',linkedin:'',institution:'',bio:'',in_pool:true,demo:true},o);
  const members=[
   mk('demo_m1',{full_name:'Nadia Putri',city:'Jakarta',status:'career_switcher',headline:'Accountant moving into data analysis',level:'entry',skills:['SQL','Excel','Power BI','Python'],interests:['Data & Analytics'],job_types:['full_time'],work_modes:['hybrid','remote'],bio:'Six years in finance, now building a data portfolio.',created_at:ago(12)}),
   mk('demo_m2',{full_name:'Salsa Amelia',city:'Jakarta',status:'fresh_grad',headline:'Informatics graduate, frontend focus',level:'junior',skills:['JavaScript','React','Node.js','Git','HTML/CSS','PostgreSQL'],interests:['Software Engineering'],job_types:['full_time','internship'],work_modes:['remote','hybrid'],created_at:ago(10)}),
   mk('demo_m3',{full_name:'Rara Wulandari',city:'Bandung',status:'professional',headline:'Marketing executive exploring product',level:'junior',skills:['Product Management','Agile','Jira','User Research','Excel'],interests:['Product & Project','Data & Analytics'],job_types:['full_time'],work_modes:['hybrid','onsite'],created_at:ago(8)}),
   mk('demo_m4',{full_name:'Tiara Maharani',city:'Jakarta',status:'student',headline:'Visual communication design student',level:'intern',skills:['Figma','UI/UX Design','Prototyping','User Research'],interests:['UI/UX Design'],job_types:['internship','part_time'],work_modes:['remote','hybrid'],created_at:ago(6)}),
   mk('demo_m5',{full_name:'Dewi Anggraini',city:'Tangerang',status:'career_switcher',headline:'Former teacher learning QA',level:'entry',skills:['Manual Testing','Jira','SQL','Postman'],interests:['QA & Security','Software Engineering'],job_types:['full_time','contract'],work_modes:['remote'],created_at:ago(3)})
  ];
  [[0,'Nadia_Putri_CV.pdf',182000,true],[1,'Salsa_Amelia_CV.pdf',164000,true],[2,'Rara_Wulandari_CV.pdf',171000,false]].forEach(c=>{Object.assign(members[c[0]],{cv_path:'demo',cv_name:c[1],cv_size:c[2],cv_shared:c[3]})});
  const jb=(id,by,o)=>Object.assign({id,posted_by:by,description:'',apply_link:'',contact_email:'talent@example.com',is_open:true,demo:true},o);
  const jobs=[
   jb('demo_j1','demo_m2',{title:'Junior Data Analyst',company:'Northwind Labs',category:'Data & Analytics',level:'junior',job_type:'full_time',work_mode:'hybrid',location:'Jakarta',req_skills:['SQL','Excel','Power BI'],nice_skills:['Python','Statistics'],description:'Build weekly dashboards for the operations team and answer ad hoc questions with SQL.\nYou will work with two senior analysts.',deadline:inD(21),created_at:ago(2)}),
   jb('demo_j2','demo_m1',{title:'Frontend Developer Intern',company:'Orbit Commerce',category:'Software Engineering',level:'intern',job_type:'internship',work_mode:'remote',location:'Indonesia',req_skills:['JavaScript','React','Git'],nice_skills:['HTML/CSS','TypeScript'],description:'Ship small features on our storefront with a mentor. Three-month program with a possible full-time offer.',deadline:inD(14),created_at:ago(4)}),
   jb('demo_j3','demo_m3',{title:'Associate Product Manager',company:'Kopi Data',category:'Product & Project',level:'junior',job_type:'full_time',work_mode:'onsite',location:'Jakarta',req_skills:['Product Management','Agile','User Research'],nice_skills:['Jira','SQL'],description:'Own discovery and delivery for the loyalty app together with design and engineering.',deadline:inD(30),created_at:ago(5)}),
   jb('demo_j4','demo_m5',{title:'UI/UX Design Intern',company:'Lumen Studio',category:'UI/UX Design',level:'intern',job_type:'internship',work_mode:'hybrid',location:'Jakarta',req_skills:['Figma','UI/UX Design'],nice_skills:['Prototyping','User Research'],description:'Support the design team on client projects: wireframes, prototypes and user interviews.',deadline:inD(10),created_at:ago(7)}),
   jb('demo_j5','demo_m4',{title:'QA Engineer',company:'Northwind Labs',category:'QA & Security',level:'entry',job_type:'full_time',work_mode:'remote',location:'Indonesia',req_skills:['Manual Testing','Jira'],nice_skills:['SQL','Postman'],description:'Write test cases, run regression cycles and report bugs for our web platform.',deadline:inD(25),created_at:ago(9)})
  ];
  const pk=(id,by,o)=>Object.assign({id,posted_by:by,organizer:'',description:'',link:'',event_date:null,location:'',pinned:false,demo:true},o);
  const posts=[
   pk('demo_p1','demo_m3',{kind:'event',title:'Dara Socials: Meet Your People',organizer:'Dara in Tech',description:'Our first networking night. Meet other women moving into tech, swap stories and make friends before you swap CVs.\nSpeakers and venue details will be shared in the group.',event_date:'2026-11-21',location:'Jakarta',pinned:true,created_at:ago(1)}),
   pk('demo_p2','demo_m1',{kind:'cert',title:'AZ-900 exam prep group',organizer:'Study group by members',description:'Six weekly sessions to prepare for the Azure Fundamentals exam together. We share notes and practice questions. Beginners welcome.',event_date:inD(12),created_at:ago(3)}),
   pk('demo_p3','demo_m2',{kind:'program',title:'Open call: junior mentoring program',organizer:'Example Tech Foundation',description:'Twelve weeks of 1:1 mentoring with an engineer or designer. Open to women with up to two years of experience.',event_date:inD(20),created_at:ago(6)}),
   pk('demo_p4','demo_m4',{kind:'tip',title:'How I wrote my first data portfolio project',description:'Pick one question you care about, find a public dataset and write down every decision you make. Recruiters read the thinking more than the chart.',created_at:ago(8)})
  ];
  return {members,jobs,posts};
}
function demoPdf(m){
  const t=s=>String(s||'').replace(/[^\x20-\x7e]/g,'').replace(/[\\()]/g,'\\$&');
  const stream='BT /F1 20 Tf 72 740 Td ('+t(m.full_name||'Member')+') Tj /F1 12 Tf 0 -28 Td (Example CV, demo data only) Tj 0 -18 Td (Real members upload their own file here.) Tj ET';
  const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out='%PDF-1.4\n';const off=[];
  objs.forEach((o,i)=>{off.push(out.length);out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});
  const x=out.length;
  out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF';
  return new Blob([out],{type:'application/pdf'});
}
const DemoAPI=(()=>{
  const KEY='dara_demo_db_v1',SKEY='dara_demo_session_v1';
  let cur=null;
  const load=()=>{let d=store.get(KEY,null);if(!d){d=seedDemo();store.set(KEY,d)}else if(!d.posts){d.posts=seedDemo().posts;store.set(KEY,d)}return d};
  const save=d=>store.set(KEY,d);
  const isAdm=u=>!!u&&/^admin/i.test(u.email);
  return {
   async init(){},
   async session(){cur=store.get(SKEY,null);return cur},
   async sendCode(){},
   async verify(email,code){
     if(String(code).trim()!=='123456')throw new Error('That code is not right. In demo mode the code is 123456.');
     cur={id:'u_'+email.toLowerCase().replace(/[^a-z0-9]/g,'_'),email:email.toLowerCase()};
     store.set(SKEY,cur);return cur;
   },
   async google(){throw new Error('Google sign-in needs the live setup.')},
   async signOut(){cur=null;store.set(SKEY,null)},
   async isAdmin(u){return isAdm(u)},
   async getMe(id){return load().members.find(m=>m.id===id)||null},
   async saveMe(row){
     const d=load(),i=d.members.findIndex(m=>m.id===row.id);
     if(i>=0)d.members[i]=Object.assign({},d.members[i],row);else d.members.push(Object.assign({},row,{created_at:new Date().toISOString()}));
     save(d);return d.members.find(m=>m.id===row.id);
   },
   async deleteMe(id){const d=load();d.members=d.members.filter(m=>m.id!==id);save(d)},
   async deleteMember(id){const d=load();d.members=d.members.filter(m=>m.id!==id);save(d)},
   async listMembers(){
     const d=load();
     return d.members.filter(m=>isAdm(cur)||m.in_pool||(cur&&m.id===cur.id)).slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
   },
   async listJobs(){return load().jobs.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))},
   async saveJob(job){
     const d=load();
     if(job.id){const i=d.jobs.findIndex(j=>j.id===job.id);if(i>=0)d.jobs[i]=Object.assign({},d.jobs[i],job)}
     else d.jobs.push(Object.assign({},job,{id:'j_'+uid8(),posted_by:cur.id,is_open:true,created_at:new Date().toISOString()}));
     save(d);
   },
   async deleteJob(id){const d=load();d.jobs=d.jobs.filter(j=>j.id!==id);save(d)},
   async resetDemo(){save(seedDemo())},
   async listPosts(){return load().posts.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))},
   async savePost(p){
     const d=load();
     if(p.id){const i=d.posts.findIndex(x=>x.id===p.id);if(i>=0)d.posts[i]=Object.assign({},d.posts[i],p)}
     else d.posts.push(Object.assign({},p,{id:'p_'+uid8(),posted_by:cur.id,pinned:!!p.pinned&&isAdm(cur),created_at:new Date().toISOString()}));
     save(d);
   },
   async deletePost(id){const d=load();d.posts=d.posts.filter(p=>p.id!==id);save(d)},
   async setPinned(id,v){const d=load();const p=d.posts.find(x=>x.id===id);if(p){p.pinned=!!v;save(d)}},
   async uploadCV(userId,file){
     const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Could not read that file.'));r.readAsDataURL(file)});
     store.set('dara_demo_cv_'+userId,{data});
     return {cv_path:'demo',cv_name:file.name,cv_size:file.size};
   },
   async removeCV(m){if(m&&m.id)store.set('dara_demo_cv_'+m.id,null)},
   async getCV(m){
     const c=store.get('dara_demo_cv_'+m.id,null);
     if(c&&c.data){
       const mime=(c.data.match(/^data:([^;,]+)/)||[])[1]||'application/octet-stream';
       const bin=atob(c.data.split(',')[1]||'');const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
       return new Blob([u],{type:mime});
     }
     return demoPdf(m);
   }
  };
})();

/* ================= Supabase backend ================= */
const SbAPI=(()=>{
  let sb=null;
  const must=r=>{if(r.error)throw new Error(r.error.message||'Something went wrong. Try again.');return r.data};
  const loadScript=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load the sign-in library. Check your connection.'));document.head.appendChild(s)});
  return {
   async init(){
     await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
     sb=window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY,{auth:{persistSession:true,detectSessionInUrl:true}});
   },
   async session(){const r=await sb.auth.getSession();const s=r.data&&r.data.session;return s?{id:s.user.id,email:s.user.email}:null},
   async sendCode(email){must(await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}}))},
   async verify(email,code){
     const d=must(await sb.auth.verifyOtp({email,token:String(code).trim(),type:'email'}));
     const u=d.user||(d.session&&d.session.user);
     if(!u)throw new Error('Could not sign you in. Request a new code.');
     return {id:u.id,email:u.email};
   },
   async google(){must(await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}}))},
   async signOut(){await sb.auth.signOut()},
   async isAdmin(u){const r=await sb.from('admins').select('user_id').eq('user_id',u.id).maybeSingle();return !!r.data},
   async getMe(id){return must(await sb.from('members').select('*').eq('id',id).maybeSingle())},
   async saveMe(row){return must(await sb.from('members').upsert(row).select().single())},
   async deleteMe(id){must(await sb.from('members').delete().eq('id',id))},
   async deleteMember(id){must(await sb.from('members').delete().eq('id',id))},
   async listMembers(){return must(await sb.from('members').select('*').order('created_at',{ascending:false}))||[]},
   async listJobs(){return must(await sb.from('jobs').select('*').order('created_at',{ascending:false}))||[]},
   async saveJob(job){
     if(job.id){const id=job.id;const rest=Object.assign({},job);delete rest.id;must(await sb.from('jobs').update(rest).eq('id',id))}
     else must(await sb.from('jobs').insert(job));
   },
   async deleteJob(id){must(await sb.from('jobs').delete().eq('id',id))},
   async resetDemo(){},
   async listPosts(){return must(await sb.from('posts').select('*').order('created_at',{ascending:false}))||[]},
   async savePost(p){
     if(p.id){const id=p.id;const rest=Object.assign({},p);delete rest.id;must(await sb.from('posts').update(rest).eq('id',id))}
     else must(await sb.from('posts').insert(p));
   },
   async deletePost(id){must(await sb.from('posts').delete().eq('id',id))},
   async setPinned(id,v){must(await sb.from('posts').update({pinned:!!v}).eq('id',id))},
   async uploadCV(userId,file){
     const ext=fileExt(file.name);
     const path=userId+'/cv-'+Date.now()+'.'+ext;
     const r=await sb.storage.from('cvs').upload(path,file,{contentType:file.type||(ext==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),upsert:false});
     if(r.error)throw new Error(r.error.message||'Could not upload the CV.');
     return {cv_path:path,cv_name:file.name,cv_size:file.size};
   },
   async removeCV(m){if(m&&m.cv_path&&m.cv_path!=='demo'){await sb.storage.from('cvs').remove([m.cv_path])}},
   async getCV(m){
     const r=await sb.storage.from('cvs').download(m.cv_path);
     if(r.error)throw new Error(r.error.message||'Could not download that CV.');
     return r.data;
   }
  };
})();
const API=DEMO?DemoAPI:SbAPI;

/* ================= state ================= */
const S={user:null,admin:false,me:null,members:[],jobs:[],posts:[],mad:'all',openPost:null,cvPending:null,cvRemove:false,cvShare:null,view:'home',tab:'roles',openJob:null,ready:false,authStep:'email',authEmail:'',authErr:'',busy:false,
  f:{q:'',cat:'',mode:'',type:'',min:0,sort:'match',open:true},mf:{q:'',level:'',city:''},aq:'',confirm:null,candMin:0};
const PK={},PKS={},TG={};

/* ================= small UI pieces ================= */
function opts(list,sel,ph){
  return (ph!=null?'<option value="">'+esc(ph)+'</option>':'')+list.map(o=>{const v=o.v!==undefined?o.v:o,l=o.l!==undefined?o.l:o;return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(l)+'</option>'}).join('');
}
function field(id,label,control,hint,cls){return '<div class="field'+(cls?' '+cls:'')+'"><label for="'+id+'">'+esc(label)+'</label>'+control+(hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>'}
function pickerHTML(name,values,sugg,ph){PK[name]=values.slice();PKS[name]=sugg;return '<div class="picker" data-picker="'+name+'"><div class="chips" data-chips></div><input class="input" id="pk-'+name+'" type="text" autocomplete="off" placeholder="'+esc(ph)+'" aria-label="'+esc(ph)+'"><div class="sugg" data-sugg></div></div>'}
function pickerRefresh(name){
  const root=$('[data-picker="'+name+'"]');if(!root)return;
  const vals=PK[name]||[];
  $('[data-chips]',root).innerHTML=vals.map((v,i)=>'<span class="chip hit">'+esc(v)+'<button type="button" class="chip-x" data-act="pk-del" data-pk="'+name+'" data-i="'+i+'" aria-label="Remove '+esc(v)+'">'+ICON.x+'</button></span>').join('');
  const have=new Set(vals.map(nk));
  const rest=(PKS[name]||[]).filter(s=>!have.has(nk(s))).slice(0,12);
  $('[data-sugg]',root).innerHTML=rest.length?rest.map(s=>'<button type="button" class="chip add" data-act="pk-add" data-pk="'+name+'" data-v="'+esc(s)+'">'+ICON.plus+esc(s)+'</button>').join(''):'';
}
function pickerAdd(name,v){
  v=String(v).trim().replace(/\s+/g,' ').slice(0,40);if(!v)return;
  PK[name]=PK[name]||[];
  if(PK[name].some(x=>nk(x)===nk(v))||PK[name].length>=25)return;
  PK[name].push(v);pickerRefresh(name);
}
function flushPickers(){$$('[data-picker]').forEach(p=>{const n=p.dataset.picker,inp=$('input',p);if(inp&&inp.value.trim()){pickerAdd(n,inp.value);inp.value=''}})}
function initPickers(){$$('[data-picker]').forEach(p=>pickerRefresh(p.dataset.picker))}
function toggleHTML(name,options,values){
  TG[name]=values.slice();
  return '<div class="tgl-group" role="group" data-tgg="'+name+'">'+options.map(o=>{const v=o.v!==undefined?o.v:o,l=o.l!==undefined?o.l:o;return '<button type="button" class="tgl" aria-pressed="'+values.includes(v)+'" data-act="tg" data-tg="'+name+'" data-v="'+esc(v)+'">'+esc(l)+'</button>'}).join('')+'</div>';
}
function sugForInterests(list){
  const cats=list&&list.length?list:CATEGORIES;
  const out=[];cats.forEach(c=>(SUG_BY_CAT[c]||[]).forEach(s=>{if(!out.some(x=>nk(x)===nk(s)))out.push(s)}));
  return out;
}
function emptyHTML(title,text,btn){return '<div class="empty">'+dalaImg('dala-sm')+'<h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>'+(btn||'')+'</div>'}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2800)}
function chipsFor(hit,miss,max){
  const all=hit.map(s=>({s,h:1})).concat(miss.map(s=>({s,h:0})));
  const shown=max?all.slice(0,max):all;
  return shown.map(x=>x.h?'<span class="chip hit">'+ICON.check+esc(x.s)+'</span>':'<span class="chip miss">'+esc(x.s)+'</span>').join('')+(max&&all.length>max?'<span class="chip more">+'+(all.length-max)+' more</span>':'');
}
function scoreHTML(total,small){const b=band(total);return '<div class="mscore m-'+b+(small?' sm':'')+'" role="img" aria-label="'+total+' percent match, '+bandLabel(total)+'"><strong>'+total+'%</strong><span>match</span><div class="bar"><i style="width:'+total+'%"></i></div></div>'}

/* ================= views ================= */
function shell(inner,withTabs){
  const tabs=withTabs?[['home','Home'],['mading','Mading'],['pool','Talent Pool'],['postings','My Postings'],['profile','Profile']].concat(S.admin?[['admin','Admin']]:[]):[];
  return '<header class="top"><div class="top-in"><a class="brand" href="#" data-act="nav" data-v="home" aria-label="Dara in Tech home"><img class="logo-img" src="'+IMG.logo+'" alt="Dara in Tech"><span class="brand-tag">Talent Hub</span></a>'+(DEMO?'<span class="demo-chip">Demo</span>':'')+
   '<div class="acct"><span class="who">'+esc(first(S.me&&S.me.full_name)||S.user.email)+'</span><button class="btn ghost sm" data-act="signout">Sign out</button></div>'+
   (withTabs?'<nav class="tabs" aria-label="Main">'+tabs.map(t=>'<button class="tab" data-act="nav" data-v="'+t[0]+'"'+(S.view===t[0]?' aria-current="page"':'')+'>'+t[1]+'</button>').join('')+'</nav>':'')+
   '</div></header><main class="wrap" id="main">'+inner+'</main><footer class="foot"><div class="foot-in"><a href="https://www.instagram.com/daraintech.id/" target="_blank" rel="noopener noreferrer">@daraintech.id</a><span>Members you see here chose to share their profile with the community.</span></div></footer>';
}
function authHTML(){
  const email=S.authStep==='email';
  const form=email?
   '<form class="login" data-form="auth-email" novalidate><h2>Sign in or join</h2><p class="muted">Enter your email. We send you a 6-digit code.</p>'+
   field('a-email','Email','<input class="input" id="a-email" type="email" autocomplete="email" inputmode="email" placeholder="you@email.com" value="'+esc(S.authEmail)+'">')+
   '<p class="err" role="alert">'+esc(S.authErr)+'</p><button class="btn" type="submit"'+(S.busy?' disabled':'')+'>'+(S.busy?'Sending…':'Send code')+'</button>'+
   (CONFIG.GOOGLE_LOGIN&&!DEMO?'<div class="divider">or</div><button class="btn ghost" type="button" data-act="google">Continue with Google</button>':'')+'</form>':
   '<form class="login" data-form="auth-code" novalidate><h2>Check your email</h2><p class="muted">We sent a code to <b class="sel">'+esc(S.authEmail)+'</b>. You can also tap the link in that email.</p>'+
   field('a-code','6-digit code','<input class="input mono" id="a-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456">')+
   '<p class="err" role="alert">'+esc(S.authErr)+'</p><div class="btn-row"><button class="btn" type="submit"'+(S.busy?' disabled':'')+'>'+(S.busy?'Checking…':'Sign in')+'</button><button class="btn ghost" type="button" data-act="back-email">Use another email</button></div></form>';
  return '<div class="auth">'+CIRCUIT+'<section><div class="auth-brand"><img class="logo-img" src="'+IMG.logo+'" alt="Dara in Tech"></div><p class="eyebrow">~/talent-hub</p><h1>Find your people, then your <span class="grad">next role</span>.</h1><p class="lede">A hub for women in Jakarta moving into tech. Keep one profile, see roles that members post, and know how well each one fits you before you apply.</p>'+
   '<ol class="log"><li><code>join</code><b>One profile for the community</b><span>Your details are shared with other members only if you opt in.</span></li><li><code>post</code><b>Members post roles they are hiring for</b><span>Internships, full-time jobs and freelance work from people in the community.</span></li><li><code>match</code><b>A score for every role</b><span>Skills, field, level, work setup and job type, with the reasons shown.</span></li></ol></section>'+
   '<div class="auth-side">'+dalaImg('dala','Dala, the Dara in Tech elephant')+'<section class="card">'+(DEMO?'<p class="demo-note">Demo mode: data stays in this browser. Use any email and the code <b class="mono">123456</b>. An email starting with <b>admin</b> opens the admin panel.</p><div style="height:14px"></div>':'')+form+'</section></div></div>';
}
function profileFormHTML(onb){
  const m=S.me||{};
  const email=m.email||(S.user&&S.user.email)||'';
  const sk=sugForInterests(m.interests||[]);
  return '<form class="card form" data-form="profile" novalidate>'+
   '<div class="grid2">'+
   field('f-name','Full name','<input class="input" id="f-name" type="text" autocomplete="name" maxlength="120" value="'+esc(m.full_name||'')+'">')+
   field('f-city','City','<input class="input" id="f-city" type="text" maxlength="80" placeholder="Jakarta" value="'+esc(m.city||'')+'">')+
   field('f-status','Where are you now','<select class="input" id="f-status">'+opts(STATUSES,m.status,'Choose one')+'</select>')+
   field('f-level','Level you are aiming for','<select class="input" id="f-level">'+opts(LEVELS,m.level,'Choose one')+'</select>')+
   field('f-headline','Headline','<input class="input" id="f-headline" type="text" maxlength="120" placeholder="Accountant moving into data analysis" value="'+esc(m.headline||'')+'">','Your current role, or what you study.','span2')+
   field('f-inst','School or company (optional)','<input class="input" id="f-inst" type="text" maxlength="120" value="'+esc(m.institution||'')+'">')+
   field('f-email','Contact email','<input class="input" id="f-email" type="email" maxlength="160" value="'+esc(email)+'">')+
   field('f-linkedin','LinkedIn (optional)','<input class="input" id="f-linkedin" type="text" maxlength="200" placeholder="linkedin.com/in/yourname" value="'+esc(m.linkedin||'')+'">','','span2')+
   '</div>'+
   '<div class="field"><span class="lbl">Fields you are interested in</span>'+toggleHTML('interests',CATEGORIES,m.interests||[])+'</div>'+
   '<div class="field"><span class="lbl">Your skills</span>'+pickerHTML('skills',m.skills||[],sk,'Type a skill and press Enter')+'<span class="hint">Matches get sharper with 4 or more skills.</span></div>'+
   '<div class="field"><span class="lbl">Kind of role you want</span>'+toggleHTML('job_types',JOB_TYPES,m.job_types||[])+'</div>'+
   '<div class="field"><span class="lbl">Work setup you are fine with</span>'+toggleHTML('work_modes',MODES,m.work_modes||[])+'</div>'+
   field('f-bio','Short bio (optional)','<textarea class="input" id="f-bio" maxlength="280" placeholder="What are you working towards?">'+esc(m.bio||'')+'</textarea>','Up to 280 characters.')+
   '<div class="field"><span class="lbl">CV (optional)</span><div id="cv-box">'+cvBoxHTML()+'</div></div>'+
   '<div class="pool-box"><label class="chk"><input type="checkbox" id="f-pool"'+(m.in_pool===false?'':' checked')+'><span><b>Show me in the Talent Pool</b><br><span class="hint">Other members can then see your name, headline, skills, level, city, contact email and LinkedIn, and roles they post will rank you by match. Turn this off any time and you disappear from the pool.</span></span></label></div>'+
   (onb?'<label class="chk"><input type="checkbox" id="f-consent"><span>I agree that Dara in Tech stores this information to run the community hub.</span></label>':'')+
   '<p class="err" id="form-err" role="alert"></p>'+
   '<div class="btn-row"><button class="btn" type="submit">'+(onb?'Join the community':'Save profile')+'</button></div></form>';
}
function onboardHTML(){return '<section class="hero-row"><div><p class="eyebrow">welcome</p><h1>Tell us about <span class="grad">you</span>.</h1><p class="lede">This takes about three minutes. It is what the match score is built from, so the more accurate, the better.</p>'+(S.admin?'<div style="height:12px"></div><button class="btn ghost sm" data-act="nav" data-v="admin">Open the admin panel first</button>':'')+'</div>'+dalaImg('dala-hero')+'</section>'+profileFormHTML(true)}
function rankedForMe(){
  return S.jobs.filter(j=>isOpen(j)&&j.posted_by!==S.user.id).map(j=>({j,r:matchScore(S.me,j)})).sort((a,b)=>b.r.total-a.r.total);
}
function jobCardHTML(j,r){
  const mine=S.user&&j.posted_by===S.user.id;
  const open=isOpen(j);
  return '<article class="job" data-act="open-job" data-id="'+esc(j.id)+'"><div class="job-main"><div class="job-top"><button class="job-title" data-act="open-job" data-id="'+esc(j.id)+'">'+esc(j.title)+'</button>'+(mine?'<span class="badge you">Your post</span>':'')+(open?'':'<span class="badge warn">Closed</span>')+'</div>'+
   '<p class="co">'+esc(j.company)+(j.location?' · '+esc(j.location):'')+'</p>'+
   '<div class="tags"><span class="tag">'+esc(j.category)+'</span><span class="tag">'+esc(lbl(JOB_TYPES,j.job_type))+'</span><span class="tag">'+esc(lbl(MODES,j.work_mode))+'</span><span class="tag">'+esc(lbl(LEVELS,j.level))+'</span></div>'+
   '<div class="chips">'+chipsFor(r.reqHit,r.reqMiss,6)+'</div></div>'+scoreHTML(r.total)+'</article>';
}
function homeHTML(){
  const top=rankedForMe().slice(0,3);
  const c=completeness(S.me);
  const pool=S.members.filter(m=>m.in_pool).length;
  const openN=S.jobs.filter(isOpen).length;
  return '<section class="hero-row"><div><p class="eyebrow">~/home</p><h1>Hi, <span class="grad">'+esc(first(S.me.full_name))+'</span>.</h1><p class="lede">'+(top.length?'Your best match right now is <b>'+esc(top[0].j.title)+'</b> at '+esc(top[0].j.company)+', scored '+top[0].r.total+'%.':'No open roles yet. Post one, or check back soon.')+'</p></div>'+dalaImg('dala-hero')+'</section>'+
   '<div class="strip"><span><b>'+pool+'</b> members in the pool</span><span><b>'+openN+'</b> open roles</span><span>Profile <b>'+c.pct+'%</b> complete</span></div>'+
   (c.pct<100?'<div class="card"><h3>Sharpen your matches</h3><ul class="tip-list">'+c.tips.slice(0,3).map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul><div style="height:12px"></div><button class="btn ghost sm" data-act="nav" data-v="profile">Edit profile</button></div>':'')+
   '<section class="list"><div class="sec-h"><h2>Your top matches</h2><button class="btn ghost sm" data-act="nav" data-v="pool">See all roles</button></div>'+
   (top.length?top.map(x=>jobCardHTML(x.j,x.r)).join(''):emptyHTML('Nothing to match yet','When members post roles, the best fits for you show up here.','<button class="btn" data-act="post-job">'+ICON.plus+' Post a role</button>'))+'</section>'+latestHTML();
}
function filteredJobs(){
  const f=S.f,q=f.q.toLowerCase().trim();
  return S.jobs.map(j=>({j,r:matchScore(S.me,j)})).filter(x=>{
    const j=x.j;
    if(f.open&&!isOpen(j))return false;
    if(f.cat&&j.category!==f.cat)return false;
    if(f.mode&&j.work_mode!==f.mode)return false;
    if(f.type&&j.job_type!==f.type)return false;
    if(x.r.total<f.min)return false;
    if(q&&!((j.title+' '+j.company+' '+(j.location||'')+' '+(j.req_skills||[]).join(' ')+' '+(j.nice_skills||[]).join(' ')).toLowerCase().includes(q)))return false;
    return true;
  }).sort((a,b)=>f.sort==='new'?String(b.j.created_at).localeCompare(String(a.j.created_at)):(b.r.total-a.r.total)||String(b.j.created_at).localeCompare(String(a.j.created_at)));
}
function rolesResultsHTML(){
  const rows=filteredJobs();
  if(!rows.length)return emptyHTML('No roles match these filters','Lower the minimum match or clear a filter.','<button class="btn ghost sm" data-act="clear-filters">Clear filters</button>');
  return '<p class="count">'+rows.length+' role'+(rows.length===1?'':'s')+(S.f.sort==='match'?', best match first':', newest first')+'</p>'+rows.map(x=>jobCardHTML(x.j,x.r)).join('');
}
function rolesViewHTML(){
  const f=S.f;
  return '<div class="filters card"><div class="search">'+ICON.search+'<input class="input" id="f-q" data-f="q" type="search" placeholder="Search title, company or skill" aria-label="Search roles" value="'+esc(f.q)+'"></div>'+
   '<div class="field"><label for="f-cat">Field</label><select class="input" id="f-cat" data-f="cat">'+opts(CATEGORIES,f.cat,'All fields')+'</select></div>'+
   '<div class="field"><label for="f-mode">Setup</label><select class="input" id="f-mode" data-f="mode">'+opts(MODES,f.mode,'Any')+'</select></div>'+
   '<div class="field"><label for="f-type">Job type</label><select class="input" id="f-type" data-f="type">'+opts(JOB_TYPES,f.type,'Any')+'</select></div>'+
   '<div class="field"><label for="f-sort">Sort by</label><select class="input" id="f-sort" data-f="sort">'+opts([{v:'match',l:'Best match'},{v:'new',l:'Newest'}],f.sort)+'</select></div>'+
   '<label class="range" style="grid-column:span 2">Minimum match: <span id="minv" class="mono">'+f.min+'%</span><input type="range" min="0" max="100" step="5" value="'+f.min+'" data-f="min"></label>'+
   '<label class="chk" style="grid-column:span 2"><input type="checkbox" data-f="open"'+(f.open?' checked':'')+'><span>Open roles only</span></label></div>'+
   '<div class="list" id="results" aria-live="polite">'+rolesResultsHTML()+'</div>';
}
function filteredMembers(){
  const f=S.mf,q=f.q.toLowerCase().trim(),c=f.city.toLowerCase().trim();
  return S.members.filter(m=>m.in_pool&&m.id!==S.user.id).filter(m=>{
    if(f.level&&m.level!==f.level)return false;
    if(c&&!String(m.city||'').toLowerCase().includes(c))return false;
    if(q&&!((m.full_name+' '+(m.headline||'')+' '+(m.skills||[]).join(' ')).toLowerCase().includes(q)))return false;
    return true;
  }).sort((a,b)=>String(a.full_name).localeCompare(String(b.full_name)));
}
function personHTML(m,r,jobSkills){
  const hit=new Set((jobSkills||[]).map(nk));
  const sk=(m.skills||[]).slice().sort((a,b)=>(hit.has(nk(b))?1:0)-(hit.has(nk(a))?1:0));
  const li=safeUrl(m.linkedin);
  return '<div class="person"><div class="avatar" aria-hidden="true">'+esc(ini(m.full_name))+'</div><div class="person-main"><b>'+esc(m.full_name)+'</b><span class="co">'+esc(m.headline||'')+'</span><div class="tags"><span class="tag">'+esc(lbl(LEVELS,m.level))+'</span>'+(m.city?'<span class="tag">'+esc(m.city)+'</span>':'')+'<span class="tag">'+esc(lbl(STATUSES,m.status))+'</span></div>'+
   '<div class="chips">'+sk.slice(0,8).map(s=>'<span class="chip'+(hit.has(nk(s))?' hit':'')+'">'+(hit.has(nk(s))?ICON.check:'')+esc(s)+'</span>').join('')+(sk.length>8?'<span class="chip more">+'+(sk.length-8)+' more</span>':'')+'</div>'+
   (m.bio?'<p class="note">'+esc(m.bio)+'</p>':'')+
   '<div class="contact"><span class="sel">'+esc(m.email||'')+'</span>'+(li?'<a href="'+esc(li)+'" target="_blank" rel="noopener noreferrer">LinkedIn</a>':'')+(m.cv_path&&(m.cv_shared||S.admin||m.id===S.user.id)?'<button type="button" class="btn ghost sm" data-act="dl-cv" data-id="'+esc(m.id)+'">Download CV</button>':'')+'</div></div>'+(r?scoreHTML(r.total,true):'')+'</div>';
}
function membersResultsHTML(){
  const rows=filteredMembers();
  if(!rows.length)return emptyHTML('No members found','Try a different search, or invite more members to turn on the Talent Pool.');
  return '<p class="count">'+rows.length+' member'+(rows.length===1?'':'s')+' in the pool</p>'+rows.map(m=>personHTML(m,null,[])).join('');
}
function membersViewHTML(){
  const f=S.mf;
  return '<div class="filters card"><div class="search">'+ICON.search+'<input class="input" data-mf="q" type="search" placeholder="Search name, headline or skill" aria-label="Search members" value="'+esc(f.q)+'"></div>'+
   '<div class="field" style="grid-column:span 2"><label for="m-level">Level</label><select class="input" id="m-level" data-mf="level">'+opts(LEVELS,f.level,'Any level')+'</select></div>'+
   '<div class="field" style="grid-column:span 2"><label for="m-city">City</label><input class="input" id="m-city" data-mf="city" type="text" placeholder="Jakarta" value="'+esc(f.city)+'"></div></div>'+
   '<div class="list" id="members-results" aria-live="polite">'+membersResultsHTML()+'</div>';
}
function poolHTML(){
  return '<div class="sec-h"><div><p class="eyebrow">talent pool</p><h1>Roles and members</h1></div><button class="btn" data-act="post-job">'+ICON.plus+' Post a role</button></div>'+
   '<div class="seg" role="tablist" aria-label="Talent pool sections"><button class="seg-b" role="tab" aria-selected="'+(S.tab==='roles')+'" data-act="tab" data-v="roles">Roles for me</button><button class="seg-b" role="tab" aria-selected="'+(S.tab==='members')+'" data-act="tab" data-v="members">Members</button></div>'+
   (S.tab==='roles'?rolesViewHTML():membersViewHTML());
}
function candidatesFor(j){
  return S.members.filter(m=>m.in_pool&&m.id!==j.posted_by).map(m=>({m,r:matchScore(m,j)})).sort((a,b)=>b.r.total-a.r.total);
}
function postingsHTML(){
  const mine=S.jobs.filter(j=>j.posted_by===S.user.id);
  return '<div class="sec-h"><div><p class="eyebrow">my postings</p><h1>Roles you posted</h1></div><button class="btn" data-act="post-job">'+ICON.plus+' Post a role</button></div>'+
   (mine.length?'<div class="list">'+mine.map(j=>{
     const c=candidatesFor(j);const strong=c.filter(x=>x.r.total>=70).length;
     return '<article class="job" data-act="open-job" data-id="'+esc(j.id)+'"><div class="job-main"><div class="job-top"><button class="job-title" data-act="open-job" data-id="'+esc(j.id)+'">'+esc(j.title)+'</button>'+(isOpen(j)?'<span class="badge you">Open</span>':'<span class="badge warn">Closed</span>')+'</div><p class="co">'+esc(j.company)+' · posted '+esc(fmtD(j.created_at))+(j.deadline?' · closes '+esc(fmtD(j.deadline)):'')+'</p>'+
      '<p class="count"><b class="mono">'+strong+'</b> member'+(strong===1?'':'s')+' at 70% or more'+(c.length?', best match <b class="mono">'+c[0].r.total+'%</b>':'')+' · '+c.length+' in the pool</p></div><div class="btn-row"><span class="btn ghost sm">View candidates</span></div></article>';
   }).join('')+'</div>':emptyHTML('You have not posted a role yet','Post an opening and see which members fit it, ranked by match.','<button class="btn" data-act="post-job">'+ICON.plus+' Post a role</button>'))+myPostsHTML();
}
/* ================= CV box ================= */
function cvShareVal(){return S.cvShare!==null?S.cvShare:!!(S.me&&S.me.cv_shared)}
function cvBoxHTML(){
  const cur=S.me&&S.me.cv_path&&!S.cvRemove?S.me:null;
  const p=S.cvPending;
  let row='';
  if(p)row='<div class="cv-row"><span class="cv-name">'+esc(p.name)+' <span class="muted">('+fmtSize(p.size)+', uploads when you save)</span></span><button type="button" class="btn ghost sm" data-act="cv-clear">Remove</button></div>';
  else if(cur)row='<div class="cv-row"><span class="cv-name">'+esc(cur.cv_name||'CV')+' <span class="muted">('+fmtSize(cur.cv_size||0)+')</span></span><span class="btn-row"><button type="button" class="btn ghost sm" data-act="dl-cv" data-id="'+esc(cur.id)+'">Download</button><button type="button" class="btn ghost sm" data-act="cv-remove">Remove</button></span></div>';
  else if(S.cvRemove&&S.me&&S.me.cv_path)row='<p class="hint">Your CV will be removed when you save.</p>';
  const has=!!(p||cur);
  return row+'<input class="input" id="f-cv" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Choose a CV file"><span class="hint">PDF or DOCX, up to 2 MB.</span>'+
   '<label class="chk"><input type="checkbox" id="f-cvshare"'+(has&&cvShareVal()?' checked':'')+(has?'':' disabled')+'><span>Let members who post roles download my CV <span class="hint">(only while you are in the Talent Pool. Admins can always see it.)</span></span></label>';
}

/* ================= Mading (community board) ================= */
const kindOf=v=>KINDS.find(x=>x.v===v)||KINDS[4];
function postCardHTML(p){
  const k=kindOf(p.kind);
  const mine=S.user&&p.posted_by===S.user.id;
  return '<article class="post" data-act="open-post" data-id="'+esc(p.id)+'"><div class="job-main"><div class="job-top"><span class="badge kind">'+esc(k.one)+'</span>'+(p.pinned?'<span class="badge you">Pinned</span>':'')+(mine?'<span class="badge you">Your post</span>':'')+(p.event_date&&isPast(p.event_date)?'<span class="badge warn">Past</span>':'')+'</div>'+
   '<button class="job-title" data-act="open-post" data-id="'+esc(p.id)+'">'+esc(p.title)+'</button>'+(p.organizer?'<p class="co">'+esc(p.organizer)+'</p>':'')+
   '<p class="post-desc">'+esc(p.description)+'</p>'+
   '<div class="tags">'+(p.event_date?'<span class="tag">'+esc(k.dl||'Date')+': '+esc(fmtD(p.event_date))+'</span>':'')+(p.location?'<span class="tag">'+esc(p.location)+'</span>':'')+'<span class="tag">Posted '+esc(fmtD(p.created_at))+'</span></div></div></article>';
}
function feedItems(){
  const k=S.mad,items=[];
  if(k==='all'||k==='job')S.jobs.filter(isOpen).forEach(j=>items.push({t:'job',j,date:j.created_at,pin:0}));
  S.posts.filter(p=>k==='all'||p.kind===k).forEach(p=>items.push({t:'post',p,date:p.created_at,pin:p.pinned?1:0}));
  return items.sort((a,b)=>(b.pin-a.pin)||String(b.date).localeCompare(String(a.date)));
}
function feedHTML(){
  const items=feedItems();
  if(!items.length)return emptyHTML('Nothing here yet','Be the first to post in this section.','<button class="btn" data-act="post-menu">'+ICON.plus+' Post to Mading</button>');
  return '<p class="count">'+items.length+' post'+(items.length===1?'':'s')+', pinned first, then newest</p>'+items.map(x=>x.t==='job'?jobCardHTML(x.j,matchScore(S.me,x.j)):postCardHTML(x.p)).join('');
}
function madingHTML(){
  const chips=[{v:'all',l:'All'}].concat(KINDS);
  return '<div class="sec-h"><div><p class="eyebrow">mading</p><h1>Community board</h1><p class="lede">Job info, events, certifications and anything else worth sharing with the community.</p></div><button class="btn" data-act="post-menu">'+ICON.plus+' Post to Mading</button></div>'+
   '<div class="tgl-group" role="group" aria-label="Filter by type">'+chips.map(c=>'<button class="tgl" aria-pressed="'+(S.mad===c.v)+'" data-act="mad-filter" data-v="'+esc(c.v)+'">'+esc(c.l)+'</button>').join('')+'</div>'+
   '<div class="list" id="feed" aria-live="polite">'+feedHTML()+'</div>';
}
function latestHTML(){
  const l=S.posts.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||String(b.created_at).localeCompare(String(a.created_at))).slice(0,3);
  if(!l.length)return '';
  return '<section class="list"><div class="sec-h"><h2>Latest on Mading</h2><button class="btn ghost sm" data-act="nav" data-v="mading">Open Mading</button></div>'+l.map(postCardHTML).join('')+'</section>';
}
function myPostsHTML(){
  const mine=S.posts.filter(p=>p.posted_by===S.user.id);
  return '<div class="sec-h"><h2>Your Mading posts</h2><button class="btn ghost sm" data-act="post-menu">'+ICON.plus+' Post to Mading</button></div>'+(mine.length?'<div class="list">'+mine.map(postCardHTML).join('')+'</div>':'<p class="muted">Events, certifications and tips you share on Mading show up here.</p>');
}
function postMenuHTML(){
  return '<h2 id="modal-title">What do you want to share?</h2><div class="choices">'+KINDS.map(k=>'<button type="button" class="choice" data-act="post-kind" data-v="'+esc(k.v)+'"><b>'+esc(k.one)+'</b><span>'+esc(k.d)+'</span></button>').join('')+'</div>';
}
function postFormHTML(kind,p){
  p=p||{};const k=kindOf(kind);
  return '<form class="form" data-form="post" data-id="'+esc(p.id||'')+'" data-kind="'+esc(kind)+'" novalidate><h2 id="modal-title">'+(p.id?'Edit ':'Post ')+esc(k.one.toLowerCase())+'</h2>'+
   '<div class="grid2">'+
   field('p-title','Title','<input class="input" id="p-title" maxlength="140" value="'+esc(p.title||'')+'">','','span2')+
   field('p-org','Organizer or source (optional)','<input class="input" id="p-org" maxlength="140" value="'+esc(p.organizer||'')+'">')+
   (k.dl?field('p-date',k.dl+' (optional)','<input class="input" id="p-date" type="date" value="'+esc(p.event_date||'')+'">'):'')+
   (kind==='event'?field('p-loc','Venue or online (optional)','<input class="input" id="p-loc" maxlength="120" value="'+esc(p.location||'')+'">'):'')+
   '</div>'+
   field('p-desc','Details','<textarea class="input" id="p-desc" maxlength="2000">'+esc(p.description||'')+'</textarea>','Say what it is, who it is for and how to join. Up to 2000 characters.')+
   field('p-link','Link (optional)','<input class="input" id="p-link" maxlength="300" placeholder="example.com/info" value="'+esc(p.link||'')+'">')+
   (S.admin?'<label class="chk"><input type="checkbox" id="p-pin"'+(p.pinned?' checked':'')+'><span>Pin to the top of Mading</span></label>':'')+
   '<p class="err" id="form-err" role="alert"></p><div class="btn-row"><button class="btn" type="submit">'+(p.id?'Save changes':'Post')+'</button><button class="btn ghost" type="button" data-act="close">Cancel</button></div></form>';
}
function postDetailHTML(p){
  const k=kindOf(p.kind);
  const mine=p.posted_by===S.user.id,manage=mine||S.admin;
  const poster=S.members.find(m=>m.id===p.posted_by);
  const link=safeUrl(p.link);
  const conf=S.confirm==='p:'+p.id;
  return '<div class="detail-head"><p class="eyebrow">'+esc(k.l)+'</p><h2 id="modal-title">'+esc(p.title)+'</h2>'+(p.organizer?'<p class="co">'+esc(p.organizer)+'</p>':'')+
   '<div class="tags">'+(p.pinned?'<span class="badge you">Pinned</span>':'')+(p.event_date?'<span class="tag">'+esc(k.dl||'Date')+': '+esc(fmtD(p.event_date))+'</span>'+(isPast(p.event_date)?'<span class="badge warn">Past</span>':''):'')+(p.location?'<span class="tag">'+esc(p.location)+'</span>':'')+'</div>'+
   '<p class="hint">Posted '+esc(fmtD(p.created_at))+' by '+esc(poster?poster.full_name:'a Dara member')+'</p></div>'+
   '<section class="sub"><p class="desc">'+esc(p.description)+'</p></section>'+
   (link?'<div class="btn-row"><a class="btn" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Open link '+ICON.ext+'</a></div>':'')+
   (manage?'<section class="btn-row">'+(mine?'<button class="btn ghost" data-act="edit-post" data-id="'+esc(p.id)+'">Edit</button>':'')+(S.admin?'<button class="btn ghost" data-act="pin-post" data-id="'+esc(p.id)+'">'+(p.pinned?'Unpin':'Pin to top')+'</button>':'')+(conf?'<button class="btn danger" data-act="del-post-yes" data-id="'+esc(p.id)+'">Yes, delete this post</button><button class="btn ghost" data-act="cancel-confirm">Keep it</button>':'<button class="btn ghost" data-act="del-post" data-id="'+esc(p.id)+'">Delete</button>')+'</section>':'');
}
function showPost(id,fresh){
  const p=S.posts.find(x=>x.id===id);if(!p)return;
  S.openPost=id;
  if(fresh)openModal(postDetailHTML(p));else setModal(postDetailHTML(p));
}
async function submitPost(form){
  const g=id=>{const e=$('#'+id,form);return e?e.value.trim():''};
  const p={kind:form.dataset.kind,title:g('p-title'),organizer:g('p-org'),description:g('p-desc'),link:g('p-link'),event_date:g('p-date')||null,location:g('p-loc')};
  if(!p.title)return setErr('Enter a title.');
  if(p.description.length<10)return setErr('Add a few lines of details so members know what it is.');
  if(p.link){const u=safeUrl(p.link);if(!u)return setErr('That link does not look right.');p.link=u}
  const pin=$('#p-pin',form);if(pin)p.pinned=pin.checked;
  const id=form.dataset.id;if(id)p.id=id;
  const btn=$('button[type=submit]',form);btn.disabled=true;
  try{
    await API.savePost(p);await refreshData();closeModal();render();
    toast(id?'Post updated':'Posted to Mading');
  }catch(e){btn.disabled=false;setErr(e.message)}
}

function profileHTML(){
  const confirm=S.confirm==='me';
  return '<section><p class="eyebrow">profile</p><h1>Your profile</h1><p class="lede">Changes update your match scores right away.</p></section>'+profileFormHTML(false)+
   '<section class="card"><h3>Delete my profile</h3><p class="muted" style="margin:6px 0 12px">Removes your profile from the community database. Roles you posted stay until you delete them.</p>'+
   (confirm?'<div class="btn-row"><button class="btn danger" data-act="del-me-yes">Yes, delete my profile</button><button class="btn ghost" data-act="cancel-confirm">Keep it</button></div>':'<button class="btn ghost" data-act="del-me">Delete my profile</button>')+'</section>';
}
function adminRows(){
  const q=S.aq.toLowerCase().trim();
  return S.members.filter(m=>!q||((m.full_name+' '+(m.email||'')+' '+(m.city||'')+' '+(m.headline||'')+' '+(m.skills||[]).join(' ')).toLowerCase().includes(q)));
}
function adminTableHTML(){
  const rows=adminRows();
  if(!rows.length)return '<div style="padding:20px">'+emptyHTML('No participants found','Members appear here after they sign in and save a profile.')+'</div>';
  return '<table><thead><tr><th>Name</th><th>Email</th><th>City</th><th>Status</th><th>Level</th><th>Skills</th><th>Joined</th><th>In pool</th><th>CV</th><th></th></tr></thead><tbody>'+rows.map(m=>{
    const conf=S.confirm==='m:'+m.id;
    return '<tr><td><b>'+esc(m.full_name)+'</b><br><span class="note">'+esc(m.headline||'')+'</span></td><td class="sel">'+esc(m.email||'')+'</td><td>'+esc(m.city||'')+'</td><td>'+esc(lbl(STATUSES,m.status))+'</td><td>'+esc(lbl(LEVELS,m.level))+'</td><td>'+esc((m.skills||[]).join(', '))+'</td><td>'+esc(fmtD(m.created_at))+'</td><td>'+(m.in_pool?'Yes':'No')+'</td><td>'+(m.cv_path?'<button class="btn ghost sm" data-act="dl-cv" data-id="'+esc(m.id)+'">Download</button>':'')+'</td><td>'+(conf?'<button class="btn danger sm" data-act="member-del-yes" data-id="'+esc(m.id)+'">Confirm</button> <button class="btn ghost sm" data-act="cancel-confirm">Cancel</button>':'<button class="btn ghost sm" data-act="member-del" data-id="'+esc(m.id)+'">Remove</button>')+'</td></tr>';
  }).join('')+'</tbody></table>';
}
function adminHTML(){
  if(!S.admin)return emptyHTML('Admins only','Ask the community team to add you as an admin.');
  const total=S.members.length,pool=S.members.filter(m=>m.in_pool).length;
  return (S.me?'':'<div><button class="btn ghost sm" data-act="nav" data-v="home">Back to profile setup</button></div>')+'<div class="sec-h"><div><p class="eyebrow">admin</p><h1>Participants</h1></div><div class="btn-row"><button class="btn" data-act="export-csv">Export CSV</button>'+(DEMO?'<button class="btn ghost" data-act="reset-demo">Reset demo data</button>':'')+'</div></div>'+
   '<div class="strip"><span><b>'+total+'</b> registered</span><span><b>'+pool+'</b> in the talent pool</span><span><b>'+S.jobs.length+'</b> roles posted</span><span><b>'+S.posts.length+'</b> Mading posts</span></div>'+
   '<div class="field"><label for="a-q">Search participants</label><input class="input" id="a-q" data-aq type="search" placeholder="Name, email, city or skill" value="'+esc(S.aq)+'"></div>'+
   '<div class="tbl-wrap" id="admin-table">'+adminTableHTML()+'</div>';
}
function viewHTML(){
  if(!S.ready)return '<p style="padding:40px 16px;text-align:center;color:var(--muted)">Loading Dara in Tech…</p>';
  if(!S.user)return authHTML();
  if(!S.me&&S.admin&&S.view==='admin')return shell(adminHTML(),false);
  if(!S.me)return shell(onboardHTML(),false);
  const v=S.view;
  const body=v==='pool'?poolHTML():v==='mading'?madingHTML():v==='postings'?postingsHTML():v==='profile'?profileHTML():v==='admin'?adminHTML():homeHTML();
  return shell(body,true);
}
function render(){
  $('#app').innerHTML=viewHTML();
  initPickers();
  const code=$('#a-code');if(code)code.focus();
  const cur=$('.tab[aria-current="page"]');
  if(cur&&cur.scrollIntoView){try{cur.scrollIntoView({inline:'center',block:'nearest'})}catch(e){}}
}

/* ================= modals ================= */
let lastFocus=null;
function openModal(html){
  lastFocus=document.activeElement;
  $('#modal-root').innerHTML='<div class="overlay" data-act="overlay"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><button class="modal-x" data-act="close" aria-label="Close">'+ICON.x+'</button>'+html+'</div></div>';
  document.body.classList.add('lock');
  initPickers();
  const m=$('.modal');if(m)m.focus();
}
function setModal(html){
  const m=$('#modal-root .modal');
  if(!m)return openModal(html);
  m.innerHTML='<button class="modal-x" data-act="close" aria-label="Close">'+ICON.x+'</button>'+html;
  initPickers();
}
function closeModal(){
  S.openJob=null;S.openPost=null;
  $('#modal-root').innerHTML='';document.body.classList.remove('lock');
  if(lastFocus&&lastFocus.focus){try{lastFocus.focus()}catch(e){}}
}
function candListHTML(j){
  const rows=candidatesFor(j).filter(x=>x.r.total>=S.candMin).slice(0,25);
  const sk=(j.req_skills||[]).concat(j.nice_skills||[]);
  if(!rows.length)return emptyHTML('No members at this level','Lower the filter, or wait for more members to join the pool.');
  return '<ul class="cand-list">'+rows.map(x=>'<li>'+personHTML(x.m,x.r,sk)+'</li>').join('')+'</ul>';
}
function jobDetailHTML(j){
  const mine=j.posted_by===S.user.id,manage=mine||S.admin;
  const r=matchScore(S.me,j);
  const poster=S.members.find(m=>m.id===j.posted_by);
  const link=safeUrl(j.apply_link);
  const conf=S.confirm==='j:'+j.id;
  return '<div class="detail-head"><p class="eyebrow">'+esc(j.category)+'</p><h2 id="modal-title">'+esc(j.title)+'</h2><p class="co">'+esc(j.company)+(j.location?' · '+esc(j.location):'')+'</p>'+
   '<div class="tags"><span class="tag">'+esc(lbl(JOB_TYPES,j.job_type))+'</span><span class="tag">'+esc(lbl(MODES,j.work_mode))+'</span><span class="tag">'+esc(lbl(LEVELS,j.level))+'</span>'+(isOpen(j)?'':'<span class="badge warn">Closed</span>')+(j.deadline?'<span class="tag">Closes '+esc(fmtD(j.deadline))+'</span>':'')+'</div>'+
   '<p class="hint">Posted '+esc(fmtD(j.created_at))+' by '+esc(poster?poster.full_name:'a Dara member')+'</p></div>'+
   (mine?'':'<section class="panel"><div class="mscore m-'+band(r.total)+'"><strong>'+r.total+'%</strong><span>'+bandLabel(r.total)+'</span><div class="bar"><i style="width:'+r.total+'%"></i></div></div><ul class="bk">'+r.parts.map(p=>'<li><div class="bk-top"><span>'+esc(p.label)+'</span><span class="mono">'+(p.ok?Math.round(p.s*p.w)+' / '+p.w:'not rated')+'</span></div><div class="track"><i style="width:'+(p.ok?Math.round(p.s*100):0)+'%"></i></div><p class="note">'+esc(p.note)+'</p></li>').join('')+'</ul></section>')+
   ((j.req_skills||[]).length?'<section class="sub"><h3>Required skills</h3><div class="chips">'+(mine?(j.req_skills||[]).map(s=>'<span class="chip">'+esc(s)+'</span>').join(''):chipsFor(r.reqHit,r.reqMiss))+'</div></section>':'')+
   ((j.nice_skills||[]).length?'<section class="sub"><h3>Nice to have</h3><div class="chips">'+(mine?(j.nice_skills||[]).map(s=>'<span class="chip">'+esc(s)+'</span>').join(''):chipsFor(r.niceHit,r.niceMiss))+'</div></section>':'')+
   (j.description?'<section class="sub"><h3>About the role</h3><p class="desc">'+esc(j.description)+'</p></section>':'')+
   '<section class="sub"><h3>How to apply</h3><div class="btn-row">'+(link?'<a class="btn" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Apply on their site '+ICON.ext+'</a>':'')+(j.contact_email?'<span>Contact: <b class="sel">'+esc(j.contact_email)+'</b></span><button class="btn ghost sm" data-act="copy" data-v="'+esc(j.contact_email)+'">Copy</button>':'')+'</div></section>'+
   (manage?'<section class="sub"><div class="sec-h"><h3>Matching members</h3><div class="field" style="min-width:150px"><label for="cand-min">Show</label><select class="input" id="cand-min">'+opts([{v:'0',l:'Everyone'},{v:'40',l:'40% and up'},{v:'60',l:'60% and up'},{v:'80',l:'80% and up'}],String(S.candMin))+'</select></div></div><div id="cand-list">'+candListHTML(j)+'</div></section>':'')+
   (manage?'<section class="btn-row">'+(mine?'<button class="btn ghost" data-act="edit-job" data-id="'+esc(j.id)+'">Edit</button><button class="btn ghost" data-act="toggle-open" data-id="'+esc(j.id)+'">'+(j.is_open===false?'Reopen role':'Close role')+'</button>':'')+(conf?'<button class="btn danger" data-act="del-job-yes" data-id="'+esc(j.id)+'">Yes, delete this role</button><button class="btn ghost" data-act="cancel-confirm" data-id="'+esc(j.id)+'">Keep it</button>':'<button class="btn ghost" data-act="del-job" data-id="'+esc(j.id)+'">Delete</button>')+'</section>':'');
}
function jobFormHTML(j){
  j=j||{};
  const cat=j.category||CATEGORIES[0];
  const sug=SUG_BY_CAT[cat]||[];
  return '<form class="form" data-form="job" data-id="'+esc(j.id||'')+'" novalidate><h2 id="modal-title">'+(j.id?'Edit role':'Post a role')+'</h2><p class="muted">Members see this role with a match score. Only members in the pool are ranked for you.</p>'+
   '<div class="grid2">'+
   field('j-title','Role title','<input class="input" id="j-title" maxlength="140" value="'+esc(j.title||'')+'" placeholder="Junior Data Analyst">')+
   field('j-company','Company','<input class="input" id="j-company" maxlength="140" value="'+esc(j.company||'')+'">')+
   field('j-cat','Field','<select class="input" id="j-cat">'+opts(CATEGORIES,cat)+'</select>')+
   field('j-level','Level','<select class="input" id="j-level">'+opts(LEVELS,j.level||'junior')+'</select>')+
   field('j-type','Job type','<select class="input" id="j-type">'+opts(JOB_TYPES,j.job_type||'full_time')+'</select>')+
   field('j-mode','Work setup','<select class="input" id="j-mode">'+opts(MODES,j.work_mode||'hybrid')+'</select>')+
   field('j-loc','Location','<input class="input" id="j-loc" maxlength="100" value="'+esc(j.location||'')+'" placeholder="Jakarta">','Leave empty if it does not matter.')+
   field('j-deadline','Apply by (optional)','<input class="input" id="j-deadline" type="date" value="'+esc(j.deadline||'')+'">')+
   '</div>'+
   '<div class="field"><span class="lbl">Required skills</span>'+pickerHTML('req',j.req_skills||[],sug,'Type a skill and press Enter')+'<span class="hint">Worth 40% of the match score.</span></div>'+
   '<div class="field"><span class="lbl">Nice-to-have skills</span>'+pickerHTML('nice',j.nice_skills||[],sug,'Type a skill and press Enter')+'<span class="hint">Worth 10%.</span></div>'+
   field('j-desc','About the role (optional)','<textarea class="input" id="j-desc" maxlength="4000">'+esc(j.description||'')+'</textarea>')+
   '<div class="grid2">'+field('j-link','Apply link','<input class="input" id="j-link" maxlength="300" value="'+esc(j.apply_link||'')+'" placeholder="company.com/careers/role">')+field('j-mail','Contact email','<input class="input" id="j-mail" type="email" maxlength="160" value="'+esc(j.contact_email||'')+'">')+'</div>'+
   '<p class="err" id="form-err" role="alert"></p><div class="btn-row"><button class="btn" type="submit">'+(j.id?'Save changes':'Post role')+'</button><button class="btn ghost" type="button" data-act="close">Cancel</button></div></form>';
}
function showJob(id,fresh){
  const j=S.jobs.find(x=>x.id===id);if(!j)return;
  S.openJob=id;
  if(fresh)openModal(jobDetailHTML(j));else setModal(jobDetailHTML(j));
}

/* ================= actions ================= */
async function refreshData(){
  const r=await Promise.all([API.listMembers(),API.listJobs(),API.listPosts()]);
  S.members=r[0]||[];S.jobs=r[1]||[];S.posts=r[2]||[];
}
async function afterLogin(u){
  S.user=u;S.authStep='email';S.authErr='';S.busy=false;
  S.admin=await API.isAdmin(u);
  S.me=await API.getMe(u.id);
  await refreshData();
  S.view='home';S.ready=true;
  render();window.scrollTo(0,0);
}
function setErr(msg){const e=$('#form-err');if(e){e.textContent=msg;e.scrollIntoView({block:'center',behavior:'smooth'})}}
async function submitProfile(form){
  flushPickers();
  const onb=!S.me;
  const g=id=>{const e=$('#'+id,form);return e?e.value.trim():''};
  const row={id:S.user.id,full_name:g('f-name'),city:g('f-city'),status:g('f-status'),level:g('f-level'),headline:g('f-headline'),institution:g('f-inst'),email:g('f-email'),linkedin:g('f-linkedin'),
    skills:(PK.skills||[]).slice(),interests:(TG.interests||[]).slice(),job_types:(TG.job_types||[]).slice(),work_modes:(TG.work_modes||[]).slice(),bio:g('f-bio'),in_pool:$('#f-pool',form).checked,updated_at:new Date().toISOString()};
  if(!row.full_name)return setErr('Enter your full name.');
  if(!row.city)return setErr('Enter your city.');
  if(!row.status)return setErr('Choose where you are now.');
  if(!row.level)return setErr('Choose the level you are aiming for.');
  if(!row.headline)return setErr('Add a short headline.');
  if(!isEmail(row.email))return setErr('Enter a valid contact email.');
  if(!row.interests.length)return setErr('Pick at least one field of interest.');
  if(!row.skills.length)return setErr('Add at least one skill.');
  if(row.bio.length>280)return setErr('Keep the bio to 280 characters.');
  if(row.linkedin){const u=safeUrl(row.linkedin);if(!u)return setErr('That LinkedIn link does not look right.');row.linkedin=u}
  if(onb&&!$('#f-consent',form).checked)return setErr('Tick the box to agree before joining.');
  const btn=$('button[type=submit]',form);btn.disabled=true;
  try{
    const oldCv=S.me&&S.me.cv_path?S.me:null;
    let cv={cv_path:oldCv?oldCv.cv_path:null,cv_name:oldCv?oldCv.cv_name:null,cv_size:oldCv?oldCv.cv_size:null};
    let replaced=false;
    if(S.cvPending){cv=await API.uploadCV(S.user.id,S.cvPending);replaced=true}
    else if(S.cvRemove&&oldCv){await API.removeCV(oldCv);cv={cv_path:null,cv_name:null,cv_size:null}}
    cv.cv_shared=!!cv.cv_path&&row.in_pool&&cvShareVal();
    Object.assign(row,cv);
    const saved=await API.saveMe(row);
    if(replaced&&oldCv&&!DEMO)await API.removeCV(oldCv).catch(()=>{});
    S.me=Object.assign({},row,saved||{});
    S.cvPending=null;S.cvRemove=false;S.cvShare=null;
    await refreshData();
    if(onb){S.view='home';render();window.scrollTo(0,0);toast('Welcome to Dara in Tech')}
    else{render();toast('Profile saved')}
  }catch(e){btn.disabled=false;setErr(e.message)}
}
async function submitJob(form){
  flushPickers();
  const g=id=>{const e=$('#'+id,form);return e?e.value.trim():''};
  const p={title:g('j-title'),company:g('j-company'),category:g('j-cat'),level:g('j-level'),job_type:g('j-type'),work_mode:g('j-mode'),location:g('j-loc'),
    req_skills:(PK.req||[]).slice(),nice_skills:(PK.nice||[]).slice(),description:g('j-desc'),apply_link:g('j-link'),contact_email:g('j-mail'),deadline:g('j-deadline')||null};
  if(!p.title)return setErr('Enter the role title.');
  if(!p.company)return setErr('Enter the company name.');
  if(!p.req_skills.length)return setErr('Add at least one required skill. The match score depends on it.');
  if(p.contact_email&&!isEmail(p.contact_email))return setErr('Enter a valid contact email.');
  if(p.apply_link){const u=safeUrl(p.apply_link);if(!u)return setErr('That apply link does not look right.');p.apply_link=u}
  if(!p.apply_link&&!p.contact_email)return setErr('Add an apply link or a contact email so members can reach you.');
  const id=form.dataset.id;if(id)p.id=id;
  const btn=$('button[type=submit]',form);btn.disabled=true;
  try{
    await API.saveJob(p);await refreshData();closeModal();render();
    toast(id?'Role updated':'Role posted');
  }catch(e){btn.disabled=false;setErr(e.message)}
}
function csvCell(v){
  let s=Array.isArray(v)?v.join('; '):String(v==null?'':v);
  if(/^[=+\-@\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
function csvText(){
  const cols=['full_name','email','city','status','headline','institution','level','skills','interests','job_types','work_modes','linkedin','cv_name','in_pool','created_at'];
  return '﻿'+[cols.join(',')].concat(S.members.map(m=>cols.map(c=>csvCell(m[c])).join(','))).join('\r\n');
}
async function saveFile(name,data){
  const blob=data instanceof Blob?data:new Blob([data],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-act]');if(!t)return;
  const a=t.dataset.act;
  if(a==='overlay'){if(e.target===t)closeModal();return}
  if(t.tagName==='A'&&t.getAttribute('href')==='#')e.preventDefault();
  try{
    switch(a){
      case 'nav':S.view=t.dataset.v;S.confirm=null;S.cvPending=null;S.cvRemove=false;S.cvShare=null;render();window.scrollTo(0,0);break;
      case 'tab':S.tab=t.dataset.v;render();break;
      case 'open-job':S.candMin=0;S.confirm=null;showJob(t.dataset.id,true);break;
      case 'close':closeModal();break;
      case 'post-job':PK.req=[];PK.nice=[];openModal(jobFormHTML());break;
      case 'edit-job':{const j=S.jobs.find(x=>x.id===t.dataset.id);if(j)setModal(jobFormHTML(j));break}
      case 'toggle-open':{const j=S.jobs.find(x=>x.id===t.dataset.id);if(j){await API.saveJob({id:j.id,is_open:j.is_open===false});await refreshData();showJob(j.id);render();toast(j.is_open===false?'Role reopened':'Role closed')}break}
      case 'del-job':S.confirm='j:'+t.dataset.id;showJob(t.dataset.id);break;
      case 'del-job-yes':await API.deleteJob(t.dataset.id);S.confirm=null;await refreshData();closeModal();render();toast('Role deleted');break;
      case 'cancel-confirm':{const c=S.confirm;S.confirm=null;if(c&&c.indexOf('j:')===0)showJob(c.slice(2));else if(c&&c.indexOf('p:')===0)showPost(c.slice(2));else render();break}
      case 'mad-filter':S.mad=t.dataset.v;render();break;
      case 'post-menu':openModal(postMenuHTML());break;
      case 'post-kind':if(t.dataset.v==='job'){PK.req=[];PK.nice=[];setModal(jobFormHTML())}else setModal(postFormHTML(t.dataset.v));break;
      case 'open-post':S.confirm=null;showPost(t.dataset.id,true);break;
      case 'edit-post':{const p=S.posts.find(x=>x.id===t.dataset.id);if(p)setModal(postFormHTML(p.kind,p));break}
      case 'del-post':S.confirm='p:'+t.dataset.id;showPost(t.dataset.id);break;
      case 'del-post-yes':await API.deletePost(t.dataset.id);S.confirm=null;await refreshData();closeModal();render();toast('Post deleted');break;
      case 'pin-post':{const p=S.posts.find(x=>x.id===t.dataset.id);if(p){await API.setPinned(p.id,!p.pinned);await refreshData();showPost(p.id);render();toast(p.pinned?'Unpinned':'Pinned to the top')}break}
      case 'cv-clear':{S.cvPending=null;const i=$('#f-cv');if(i)i.value='';$('#cv-box').innerHTML=cvBoxHTML();break}
      case 'cv-remove':S.cvRemove=true;$('#cv-box').innerHTML=cvBoxHTML();break;
      case 'dl-cv':{const m=S.members.find(x=>x.id===t.dataset.id)||(S.me&&S.me.id===t.dataset.id?S.me:null);if(!m||!m.cv_path)break;toast('Preparing CV…');const blob=await API.getCV(m);await saveFile(m.cv_name||'cv.pdf',blob);break}
      case 'pk-add':pickerAdd(t.dataset.pk,t.dataset.v);break;
      case 'pk-del':PK[t.dataset.pk].splice(+t.dataset.i,1);pickerRefresh(t.dataset.pk);break;
      case 'tg':{
        const n=t.dataset.tg,v=t.dataset.v;TG[n]=TG[n]||[];
        const i=TG[n].indexOf(v);if(i>=0)TG[n].splice(i,1);else TG[n].push(v);
        t.setAttribute('aria-pressed',String(i<0));
        if(n==='interests'&&PKS.skills){PKS.skills=sugForInterests(TG.interests);pickerRefresh('skills')}
        break}
      case 'clear-filters':S.f={q:'',cat:'',mode:'',type:'',min:0,sort:'match',open:true};render();break;
      case 'copy':try{await navigator.clipboard.writeText(t.dataset.v);toast('Copied')}catch(err){toast('Select the text to copy it')}break;
      case 'signout':await API.signOut();Object.assign(S,{user:null,admin:false,me:null,view:'home',authStep:'email',authErr:'',busy:false,confirm:null,cvPending:null,cvRemove:false,cvShare:null,mad:'all'});closeModal();render();break;
      case 'google':try{await API.google()}catch(err){S.authErr=err.message;render()}break;
      case 'back-email':S.authStep='email';S.authErr='';render();break;
      case 'export-csv':await saveFile('dara-in-tech-participants.csv',csvText());break;
      case 'member-del':S.confirm='m:'+t.dataset.id;$('#admin-table').innerHTML=adminTableHTML();break;
      case 'member-del-yes':{const mm=S.members.find(x=>x.id===t.dataset.id);if(mm&&mm.cv_path)await API.removeCV(mm).catch(()=>{})}await API.deleteMember(t.dataset.id);S.confirm=null;await refreshData();render();toast('Participant removed');break;
      case 'reset-demo':await API.resetDemo();await refreshData();S.me=await API.getMe(S.user.id);render();toast('Demo data reset');break;
      case 'del-me':S.confirm='me';render();break;
      case 'del-me-yes':if(S.me&&S.me.cv_path)await API.removeCV(S.me).catch(()=>{});await API.deleteMe(S.user.id);S.me=null;S.confirm=null;await refreshData();render();window.scrollTo(0,0);toast('Profile deleted');break;
    }
  }catch(err){toast(err&&err.message?err.message:'Something went wrong. Try again.')}
});
document.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-form]');if(!f)return;
  e.preventDefault();
  const k=f.dataset.form;
  if(k==='profile')return submitProfile(f);
  if(k==='job')return submitJob(f);
  if(k==='post')return submitPost(f);
  if(k==='auth-email'){
    const email=($('#a-email',f).value||'').trim().toLowerCase();
    S.authEmail=email;
    if(!isEmail(email)){S.authErr='Enter a valid email address.';return render()}
    S.busy=true;S.authErr='';render();
    try{await API.sendCode(email);S.authStep='code'}catch(err){S.authErr=err.message}
    S.busy=false;render();
  }
  if(k==='auth-code'){
    const code=($('#a-code',f).value||'').trim();
    if(!code){S.authErr='Enter the code from your email.';return render()}
    S.busy=true;S.authErr='';render();
    try{const u=await API.verify(S.authEmail,code);await afterLogin(u)}catch(err){S.busy=false;S.authErr=err.message||'That code did not work. Request a new one.';render()}
  }
});
function onInput(e){
  const t=e.target;
  if(t.dataset&&t.dataset.f!==undefined){
    const k=t.dataset.f;let v=t.type==='checkbox'?t.checked:t.value;
    if(k==='min'){v=+v;const mv=$('#minv');if(mv)mv.textContent=v+'%'}
    S.f[k]=v;const r=$('#results');if(r)r.innerHTML=rolesResultsHTML();
  }else if(t.dataset&&t.dataset.mf!==undefined){
    S.mf[t.dataset.mf]=t.value;const r=$('#members-results');if(r)r.innerHTML=membersResultsHTML();
  }else if(t.dataset&&t.dataset.aq!==undefined){
    S.aq=t.value;const r=$('#admin-table');if(r)r.innerHTML=adminTableHTML();
  }else if(t.id==='cand-min'){
    S.candMin=+t.value;const j=S.jobs.find(x=>x.id===S.openJob);
    const l=$('#cand-list');if(l&&j)l.innerHTML=candListHTML(j);
  }else if(t.id==='j-cat'){
    const s=SUG_BY_CAT[t.value]||[];PKS.req=s;PKS.nice=s;pickerRefresh('req');pickerRefresh('nice');
  }else if(t.id==='f-cv'){
    const f=t.files&&t.files[0];if(!f)return;
    if(!CV_EXT.includes(fileExt(f.name))){toast('Choose a PDF or DOCX file.');t.value='';return}
    if(f.size>CV_MAX){toast('That file is over 2 MB. Choose a smaller one.');t.value='';return}
    S.cvPending=f;S.cvRemove=false;$('#cv-box').innerHTML=cvBoxHTML();
  }else if(t.id==='f-cvshare'){
    S.cvShare=t.checked;
  }
}
document.addEventListener('input',onInput);
document.addEventListener('change',onInput);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#modal-root .modal')){closeModal();return}
  const t=e.target;
  if(t&&t.id&&t.id.indexOf('pk-')===0){
    const n=t.id.slice(3);
    if(e.key==='Enter'||e.key===','){e.preventDefault();pickerAdd(n,t.value);t.value=''}
    else if(e.key==='Backspace'&&!t.value&&PK[n]&&PK[n].length){PK[n].pop();pickerRefresh(n)}
  }
});
document.addEventListener('visibilitychange',async()=>{
  if(document.visibilityState!=='visible'||!S.user||!S.me)return;
  if($('#modal-root .modal')||S.view==='profile')return;
  try{await refreshData();render()}catch(e){}
});

/* ================= boot ================= */
async function boot(){
  if(!DEMO&&!CONFIGURED){
    console.error('[Dara Hub] Not configured: set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY (or PUBLIC_DEMO_MODE=true for local development only).');
    $('#app').innerHTML='<div class="auth"><section class="card" data-hub-unconfigured><h2>The Member Hub is not available yet</h2><p class="muted" style="margin-top:8px">We are still setting it up. Please check back soon.</p><div style="height:14px"></div><a class="btn ghost" href="/">Back to Dara in Tech</a></section></div>';
    return;
  }
  try{
    await API.init();
    const u=await API.session();
    if(u){await afterLogin(u)}else{S.ready=true;render()}
  }catch(e){
    $('#app').innerHTML='<div class="auth"><section class="card"><h2>Could not start</h2><p class="muted" style="margin-top:8px">'+esc(e.message||'Unknown error')+'</p></section></div>';
  }
}
if(window.__DARA_TEST)window.__DARA_TEST={matchScore,nk,seedDemo,csvText,S};
boot();
})();
