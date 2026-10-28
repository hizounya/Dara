// Demo backend for local development only (PUBLIC_DEMO_MODE=true on localhost).
// Loaded with a dynamic import that production builds remove entirely, so none of this ships to the live site.
// Moved unchanged from hub.js (Phase 5 security pass); the helpers it needs are passed in.
export function createDemoAPI({store,uid8}){ // ES modules are always strict
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
  const jb=(id,by,o)=>Object.assign({id,posted_by:by,description:'',apply_link:'',contact_email:'talent@example.com',is_open:true,demo:true},o,{approved_at:o.created_at,approved_by:'demo_admin'});
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
  const load=()=>{let d=store.get(KEY,null);if(!d){d=seedDemo();store.set(KEY,d)}else if(!d.posts){d.posts=seedDemo().posts;store.set(KEY,d)}
    /* Demo data saved before role approval existed: treat those roles as approved. */
    if(d.jobs.some(j=>!('approved_at' in j))){d.jobs.forEach(j=>{if(!('approved_at' in j))j.approved_at=j.created_at||new Date().toISOString()});store.set(KEY,d)}
    return d};
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
   onSignedOut(cb){window.addEventListener('storage',e=>{if(e.key===SKEY&&(e.newValue===null||e.newValue==='null')){cur=null;cb()}})},
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
     else{const now=new Date().toISOString();d.jobs.push(Object.assign({},job,{id:'j_'+uid8(),posted_by:cur.id,is_open:true,created_at:now,approved_at:isAdm(cur)?now:null,approved_by:isAdm(cur)?cur.id:null}))} /* mirrors migration B: admins' roles are approved on posting */
     save(d);
   },
   async deleteJob(id){const d=load();d.jobs=d.jobs.filter(j=>j.id!==id);save(d)},
   async approveJob(id){const d=load();const j=d.jobs.find(x=>x.id===id);if(j&&isAdm(cur)){j.approved_at=new Date().toISOString();j.approved_by=cur.id;save(d)}},
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
   async purgeCVs(uid){store.set('dara_demo_cv_'+uid,null)},
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
return DemoAPI;
}
