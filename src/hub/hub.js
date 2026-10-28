import svgUsers from '../assets/icons/users.svg?raw';
import svgBriefcase from '../assets/icons/briefcase.svg?raw';
import svgStar from '../assets/icons/star.svg?raw';

(function(){
'use strict';

/* ================= CONFIG =================
   Set at build time from environment variables (see .env.example; on Vercel: Project Settings > Environment Variables).
   Demo mode runs ONLY when PUBLIC_DEMO_MODE=true. Missing Supabase values never fall back to the demo:
   the Hub shows a configuration error instead (see boot). */
const CONFIG={SUPABASE_URL:import.meta.env.PUBLIC_SUPABASE_URL||'',SUPABASE_ANON_KEY:import.meta.env.PUBLIC_SUPABASE_ANON_KEY||'',GOOGLE_LOGIN:import.meta.env.PUBLIC_GOOGLE_LOGIN==='true'};
const DEMO_BUILD=import.meta.env.PUBLIC_DEMO_MODE==='true';
/* Demo runs only on a local machine. A demo build served from anywhere else behaves as unconfigured. */
const DEMO=DEMO_BUILD&&/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const CONFIGURED=!!(CONFIG.SUPABASE_URL&&CONFIG.SUPABASE_ANON_KEY);

/* Brand images (logo and Dala). URLs of the build-optimised files, passed in by src/pages/hub/index.astro. */
const APP=document.getElementById('app').dataset;
const IMG={logo:APP.logo,dala:APP.dala,dalaEmpty:APP.dalaEmpty};
/* The same app also runs on /signup (data-mode="signup"): sign-up copy, then hand over to /hub/ once signed in. */
const SIGNUP=APP.mode==='signup';
/* Dala's official poses (optimised URLs). Dala reacts to what just happened, per the design system's pose rules. */
const POSES=(()=>{try{return JSON.parse(APP.poses||'{}')}catch(e){return {}}})();
const dalaImg=pose=>'<img src="'+(POSES[pose]||IMG.dalaEmpty)+'" alt="" width="240" height="211" loading="lazy" data-pose="'+(POSES[pose]?pose:'read')+'">';

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
/* Roles are approved by an admin before their poster can download shared CVs (migration B).
   Before that migration the field does not exist, and every role counts as approved. */
const isApproved=j=>!('approved_at' in j)||!!j.approved_at;
const fmtSize=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const fileExt=n=>String(n||'').split('.').pop().toLowerCase();
/* CV files must live at <owner id>/cv-<timestamp>.pdf|docx; anything else is not treated as that member's CV. */
const CV_PATH_RE=/^[0-9A-Za-z_-]+\/cv-[0-9]+\.(pdf|docx)$/;
const ownsCV=m=>!!(m&&m.cv_path&&CV_PATH_RE.test(m.cv_path)&&m.cv_path.split('/')[0]===String(m.id));
/* Real file type from the first bytes (not the name or the declared type): PDF "%PDF-", DOCX is a ZIP "PK\x03\x04". */
async function sniffCV(blob){
  const b=new Uint8Array(await blob.slice(0,5).arrayBuffer());
  if(b[0]===0x25&&b[1]===0x50&&b[2]===0x44&&b[3]===0x46&&b[4]===0x2d)return 'pdf';
  if(b[0]===0x50&&b[1]===0x4b&&b[2]===0x03&&b[3]===0x04)return 'docx';
  return null;
}
const CV_MIME={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
/* Download names are built here, never taken from the stored file name. */
const cvFileName=(m,ext)=>(String(m.full_name||'member').normalize('NFKD').replace(/[^A-Za-z0-9 _-]/g,'').trim().replace(/\s+/g,'_').slice(0,60)||'member')+'_CV.'+ext;
const linkedinUrl=u=>{u=safeUrl(u);if(!u)return '';try{const h=new URL(u).hostname.toLowerCase();return h==='linkedin.com'||h.endsWith('.linkedin.com')?u:''}catch(e){return ''}};

const mem={};
const store={
 get(k,d){try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return k in mem?mem[k]:d},
 set(k,v){mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};

const fa=svg=>svg.trim().replace('<svg ','<svg class="ic" aria-hidden="true" focusable="false" fill="currentColor" ');
const ICON={
 check:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 x:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 plus:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 search:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
 ext:'<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 moon:'<svg class="ic dit-icon i-moon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.6 10.3A6 6 0 0 1 5.7 2.4a6 6 0 1 0 7.9 7.9z" fill="currentColor"/></svg>',
 sun:'<svg class="ic dit-icon i-sun" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><path d="M8 .8v2.1M8 13.1v2.1M.8 8h2.1M13.1 8h2.1M2.9 2.9l1.5 1.5M11.6 11.6l1.5 1.5M2.9 13.1l1.5-1.5M11.6 4.4l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
 users:fa(svgUsers), briefcase:fa(svgBriefcase), star:fa(svgStar)
};
const orb=name=>'<span class="hub-orb" aria-hidden="true">'+ICON[name]+'</span>';
/* Light/dark switch. Clicks are handled by the shared theme script (ThemeInit), not by this file. */
const themeBtn=()=>'<button type="button" class="dit-theme-toggle" data-theme-toggle aria-pressed="'+(window.ditTheme&&window.ditTheme.get()==='dark')+'" aria-label="Dark mode" title="Light / dark mode">'+ICON.moon+ICON.sun+'</button>';

/* Routes: each view has its own address (/hub/#/mading), so Back, bookmarks and new tabs work.
   Only hashes starting with "#/" are routes, so Supabase sign-in tokens (#access_token=...) are left alone. */
const VIEWS=['home','mading','pool','postings','profile','admin'];
const SLUG={pool:'talent-pool'};
const TITLES={home:'Home',mading:'Mading',pool:'Talent Pool',postings:'My postings',profile:'Profile',admin:'Admin'};
const slugOf=v=>SLUG[v]||v;
const viewFromHash=()=>{const m=location.hash.match(/^#\/([a-z-]+)$/);if(!m)return null;const v=Object.keys(SLUG).find(k=>SLUG[k]===m[1])||m[1];return VIEWS.includes(v)?v:null};

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
  m=m||{}; /* e.g. an admin without a profile opening a role */
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

/* ================= Supabase backend ================= */
const SbAPI=(()=>{
  let sb=null;
  const must=r=>{if(r.error)throw new Error(r.error.message||'Something went wrong. Try again.');return r.data};
  const membersOrder=q=>q.order('created_at',{ascending:false});
  return {
   async init(){
     /* Bundled from npm (pinned) instead of a third-party CDN, so the site can run a strict Content Security Policy. */
     let lib;try{lib=await import('@supabase/supabase-js')}catch(e){throw new Error('Could not load the sign-in library. Check your connection.')}
     sb=lib.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY,{auth:{persistSession:true,detectSessionInUrl:true}});
   },
   /* Sign-out in another tab (or an expired session) ends this one too. */
   onSignedOut(cb){sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT')cb()})},
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
   async listMembers(isAdmin){
     if(isAdmin)return must(await membersOrder(sb.from('members').select('*')))||[];
     /* Members read others through the pool_members view (consented columns only, migration 02).
        Until that migration is applied the view does not exist, so fall back to the table. */
     const v=await membersOrder(sb.from('pool_members').select('*'));
     if(!v.error)return v.data||[];
     return must(await membersOrder(sb.from('members').select('*')))||[];
   },
   async listJobs(){return must(await sb.from('jobs').select('*').order('created_at',{ascending:false}))||[]},
   async saveJob(job){
     if(job.id){const id=job.id;const rest=Object.assign({},job);delete rest.id;must(await sb.from('jobs').update(rest).eq('id',id))}
     else must(await sb.from('jobs').insert(job));
   },
   async deleteJob(id){must(await sb.from('jobs').delete().eq('id',id))},
   async approveJob(id){must(await sb.from('jobs').update({approved_at:new Date().toISOString()}).eq('id',id))},
   async resetDemo(){},
   async listPosts(){return must(await sb.from('posts').select('*').order('created_at',{ascending:false}))||[]},
   async savePost(p){
     if(p.id){const id=p.id;const rest=Object.assign({},p);delete rest.id;must(await sb.from('posts').update(rest).eq('id',id))}
     else must(await sb.from('posts').insert(p));
   },
   async deletePost(id){must(await sb.from('posts').delete().eq('id',id))},
   async setPinned(id,v){must(await sb.from('posts').update({pinned:!!v}).eq('id',id))},
   async uploadCV(userId,file,kind){
     const ext=kind;
     const path=userId+'/cv-'+Date.now()+'.'+ext;
     const r=await sb.storage.from('cvs').upload(path,file,{contentType:file.type||(ext==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),upsert:false});
     if(r.error)throw new Error(r.error.message||'Could not upload the CV.');
     return {cv_path:path,cv_name:file.name,cv_size:file.size};
   },
   /* Only ever removes a file inside the member's own folder (a cv_path pointing elsewhere is ignored). */
   async removeCV(m){if(!ownsCV(m))return;const r=await sb.storage.from('cvs').remove([m.cv_path]);if(r.error)throw new Error(r.error.message||'Could not remove the CV file.')},
   /* Erasure: every file in the member's folder, including older CVs. */
   async purgeCVs(uid){
     const l=await sb.storage.from('cvs').list(uid,{limit:100});if(l.error)throw new Error(l.error.message||'Could not list CV files.');
     const names=(l.data||[]).map(o=>uid+'/'+o.name);
     if(names.length){const r=await sb.storage.from('cvs').remove(names);if(r.error)throw new Error(r.error.message||'Could not remove CV files.')}
   },
   async getCV(m){
     const r=await sb.storage.from('cvs').download(m.cv_path);
     if(r.error)throw new Error(r.error.message||'Could not download that CV.');
     return r.data;
   }
  };
})();
let API=SbAPI; /* replaced by the demo backend in boot() when DEMO */

/* ================= state ================= */
const S={user:null,admin:false,me:null,members:[],jobs:[],posts:[],mad:'all',openPost:null,cvPending:null,cvRemove:false,cvShare:null,view:'home',tab:'roles',openJob:null,ready:false,authStep:'email',authEmail:'',authErr:'',busy:false,
  f:{q:'',cat:'',mode:'',type:'',min:0,sort:'match',open:true},mf:{q:'',level:'',city:''},aq:'',confirm:null,candMin:0};
const PK={},PKS={},TG={};

/* ================= small UI pieces ================= */
function opts(list,sel,ph){
  return (ph!=null?'<option value="">'+esc(ph)+'</option>':'')+list.map(o=>{const v=o.v!==undefined?o.v:o,l=o.l!==undefined?o.l:o;return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(l)+'</option>'}).join('');
}
function field(id,label,control,hint,cls){return '<div class="dit-field'+(cls?' '+cls:'')+'"><label class="dit-label" for="'+id+'">'+esc(label)+'</label>'+control+(hint?'<span class="dit-hint">'+esc(hint)+'</span>':'')+'</div>'}
function group(id,label,inner,hint){return '<div class="dit-field"><span class="dit-label" id="'+id+'">'+esc(label)+'</span>'+inner+(hint?'<span class="dit-hint">'+esc(hint)+'</span>':'')+'</div>'}
function pickerHTML(name,values,sugg,ph){PK[name]=values.slice();PKS[name]=sugg;return '<div class="picker" data-picker="'+name+'"><div class="chips" data-chips></div><input class="dit-input" id="pk-'+name+'" type="text" autocomplete="off" placeholder="'+esc(ph)+'" aria-label="'+esc(ph)+'"><div class="sugg" data-sugg></div></div>'}
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
function toggleHTML(name,options,values,labelId){
  TG[name]=values.slice();
  return '<div class="tgl-group" role="group"'+(labelId?' aria-labelledby="'+labelId+'"':'')+' data-tgg="'+name+'">'+options.map(o=>{const v=o.v!==undefined?o.v:o,l=o.l!==undefined?o.l:o;return '<button type="button" class="tgl" aria-pressed="'+values.includes(v)+'" data-act="tg" data-tg="'+name+'" data-v="'+esc(v)+'">'+esc(l)+'</button>'}).join('')+'</div>';
}
function sugForInterests(list){
  const cats=list&&list.length?list:CATEGORIES;
  const out=[];cats.forEach(c=>(SUG_BY_CAT[c]||[]).forEach(s=>{if(!out.some(x=>nk(x)===nk(s)))out.push(s)}));
  return out;
}
function emptyHTML(title,text,btn,pose){return '<div class="empty">'+dalaImg(pose)+'<h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>'+(btn||'')+'</div>'}
function toast(msg,pose){
  const t=$('#toast'),src=pose&&POSES[pose];
  t.innerHTML=(src?'<img src="'+src+'" alt="" width="48" height="42" data-pose="'+pose+'">':'')+'<span>'+esc(msg)+'</span>';
  t.classList.toggle('has-dala',!!src);t.classList.add('show');
  clearTimeout(toast._t);toast._t=setTimeout(()=>{t.classList.remove('show');toast._t=setTimeout(()=>{t.innerHTML=''},400)},src?3400:2800);
}
function chipsFor(hit,miss,max){
  const all=hit.map(s=>({s,h:1})).concat(miss.map(s=>({s,h:0})));
  const shown=max?all.slice(0,max):all;
  return shown.map(x=>x.h?'<span class="chip hit">'+ICON.check+'<span class="dit-visually-hidden">You have </span>'+esc(x.s)+'</span>':'<span class="chip miss"><span class="dit-visually-hidden">Missing: </span>'+esc(x.s)+'</span>').join('')+(max&&all.length>max?'<span class="chip more">+'+(all.length-max)+' more</span>':'');
}
function scoreHTML(total,small){const b=band(total);return '<div class="mscore m-'+b+(small?' sm':'')+'" role="img" aria-label="'+total+' percent match, '+bandLabel(total)+'"><strong>'+total+'%</strong><span>'+bandLabel(total)+'</span><div class="bar"><i style="width:'+total+'%"></i></div></div>'}
const navLink=(v,label,cls)=>'<a class="'+cls+'" href="#/'+slugOf(v)+'" data-act="nav" data-v="'+v+'">'+label+'</a>';

/* ================= views ================= */
const TABS=[['home','Home'],['mading','Mading'],['pool','Talent Pool'],['postings','My postings'],['profile','Profile']];
function hubBar(right){
  return '<div class="dit-container dit-hdr__bar"><a class="dit-hdr__logo hub-logo" href="/" aria-label="Dara in Tech home"><img src="'+IMG.logo+'" alt="Dara in Tech" width="76" height="40"></a><span class="hub-badge">Member Hub</span>'+(DEMO?'<span class="hub-badge hub-badge--demo demo-chip">Demo</span>':'')+'<div class="dit-hdr__actions">'+right+'</div></div>';
}
function shell(inner,withTabs){
  const tabs=withTabs?TABS.concat(S.admin?[['admin','Admin']]:[]):[];
  const name=(S.me&&S.me.full_name)||S.user.email;
  return '<header class="dit-hdr hub-hdr">'+hubBar('<span class="hub-who"><span class="avatar avatar--sm" aria-hidden="true">'+esc(ini(name))+'</span><span class="who">'+esc(first(S.me&&S.me.full_name)||S.user.email)+'</span></span><button class="dit-btn dit-btn--ghost dit-btn--sm" data-act="signout">Sign out</button>'+themeBtn())+
   (withTabs?'<nav class="hub-tabs tabs" aria-label="Member Hub"><div class="dit-container hub-tabs__in">'+tabs.map(t=>'<a class="tab" href="#/'+slugOf(t[0])+'" data-act="nav" data-v="'+t[0]+'"'+(S.view===t[0]?' aria-current="page"':'')+'>'+t[1]+'</a>').join('')+'</div></nav>':'')+
   '</header><main class="hub-main" id="main" tabindex="-1"><div class="dit-container hub-wrap">'+inner+'</div></main>';
}
function authHTML(){
  const email=S.authStep==='email';
  const form=email?
   '<form class="hub-login" data-form="auth-email" novalidate>'+(SIGNUP?'<h2>Create your account</h2><p class="dit-muted">Enter your email and we’ll send you a 6-digit code to confirm it. No password needed.</p>':'<h2>Sign in</h2><p class="dit-muted">Welcome back. Enter your email and we’ll send you a 6-digit code. No password needed.</p>')+
   field('a-email','Email','<input class="dit-input" id="a-email" type="email" autocomplete="email" inputmode="email" placeholder="you@email.com" value="'+esc(S.authEmail)+'">')+
   '<p class="err" role="alert">'+esc(S.authErr)+'</p><button class="dit-btn" type="submit"'+(S.busy?' disabled':'')+'>'+(S.busy?'Sending…':'Send code')+'</button>'+
   (CONFIG.GOOGLE_LOGIN&&!DEMO?'<div class="divider">or</div><button class="dit-btn dit-btn--outline" type="button" data-act="google">Continue with Google</button>':'')+'</form>':
   '<form class="hub-login" data-form="auth-code" novalidate><h2>Check your email</h2><p class="dit-muted">We sent a code to <b class="sel">'+esc(S.authEmail)+'</b>. You can also tap the link in that email.</p>'+
   field('a-code','6-digit code','<input class="dit-input mono" id="a-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456">')+
   '<p class="err" role="alert">'+esc(S.authErr)+'</p><div class="btn-row"><button class="dit-btn" type="submit"'+(S.busy?' disabled':'')+'>'+(S.busy?'Checking…':'Sign in')+'</button><button class="dit-btn dit-btn--ghost" type="button" data-act="back-email">Use another email</button></div></form>';
  const steps=SIGNUP?
   [['users','1. Enter your email','We send you a 6-digit code. No password to remember.'],['star','2. Confirm the code','Type the code from your email, or tap the link in it.'],['briefcase','3. Set up your profile','About three minutes. You choose whether other members can see you in the Talent Pool.']]:
   [['users','One profile for the community','Your details are shared with other members only if you opt in.'],['briefcase','Roles from the community','Internships, full-time jobs and freelance work that members are hiring for.'],['star','A match score for every role','Skills, field, level, work setup and job type, with the reasons shown.']];
  const swap='<p class="hub-switch">'+(SIGNUP?'Already a member? <a href="/hub/">Sign in</a>':'New here? <a href="/signup">Create an account</a>')+'</p>';
  return '<header class="dit-hdr hub-hdr">'+hubBar(themeBtn())+'</header>'+
   '<main class="hub-main" id="main" tabindex="-1"><div class="dit-container hub-auth">'+
   '<section class="hub-auth__intro">'+(SIGNUP?
     '<p class="hub-eyebrow">Sign up</p><h1>Join the <span class="dit-grad-text">Member Hub</span>.</h1><p class="dit-lead">Keep one profile, see roles that members post, and know how well each one fits you before you apply. Here is how it works:</p>':
     '<p class="hub-eyebrow">Member Hub</p><h1>Find your people, then your <span class="dit-grad-text">next role</span>.</h1><p class="dit-lead">Keep one profile, see roles that members post, and know how well each one fits you before you apply.</p>')+
   '<ul class="hub-steps" role="list">'+steps.map(s=>'<li>'+orb(s[0])+'<div><h2 class="hub-steps__title">'+s[1]+'</h2><p>'+s[2]+'</p></div></li>').join('')+'</ul></section>'+
   '<section class="hub-auth__card" aria-label="'+(SIGNUP?'Sign up':'Sign in')+'"><img class="hub-auth__dala" src="'+IMG.dala+'" alt="" width="480" height="421"><div class="dit-card dit-card--float">'+
   (DEMO?'<div class="dit-alert dit-alert--info demo-note" role="note">'+ICON.star+'<div><strong class="dit-alert__title">Demo mode</strong><span class="dit-alert__body">Data stays in this browser. Use any email and the code <b class="mono">123456</b>. An email starting with <b>admin</b> opens the admin panel.</span></div></div><div style="height:16px"></div>':'')+
   form+(S.authStep==='email'?swap:'')+'</div></section></div></main>';
}
function profileFormHTML(onb){
  const m=S.me||{};
  const email=m.email||(S.user&&S.user.email)||'';
  const sk=sugForInterests(m.interests||[]);
  const sec=(id,title,hint,body)=>'<section class="hub-fsec" aria-labelledby="'+id+'"><div class="hub-fsec__head"><h2 id="'+id+'">'+title+'</h2>'+(hint?'<p class="dit-hint">'+hint+'</p>':'')+'</div><div class="hub-fsec__body">'+body+'</div></section>';
  return '<form class="dit-card dit-card--soft hub-form" data-form="profile" novalidate>'+
   sec('fs-you','About you','Fields marked optional can stay empty.','<div class="grid2">'+
     field('f-name','Full name','<input class="dit-input" id="f-name" type="text" autocomplete="name" maxlength="120" value="'+esc(m.full_name||'')+'">')+
     field('f-city','City','<input class="dit-input" id="f-city" type="text" autocomplete="address-level2" maxlength="80" placeholder="Jakarta" value="'+esc(m.city||'')+'">')+
     field('f-status','Where you are now','<select class="dit-input" id="f-status">'+opts(STATUSES,m.status,'Choose one')+'</select>')+
     field('f-level','Level you are aiming for','<select class="dit-input" id="f-level">'+opts(LEVELS,m.level,'Choose one')+'</select>')+
     field('f-headline','Headline','<input class="dit-input" id="f-headline" type="text" maxlength="120" placeholder="Accountant moving into data analysis" value="'+esc(m.headline||'')+'">','Your current role, or what you study.','span2')+
     field('f-inst','School or company (optional)','<input class="dit-input" id="f-inst" type="text" autocomplete="organization" maxlength="120" value="'+esc(m.institution||'')+'">')+
     field('f-email','Contact email','<input class="dit-input" id="f-email" type="email" autocomplete="email" maxlength="160" value="'+esc(email)+'">')+
     field('f-linkedin','LinkedIn (optional)','<input class="dit-input" id="f-linkedin" type="text" autocomplete="url" maxlength="200" placeholder="linkedin.com/in/yourname" value="'+esc(m.linkedin||'')+'">','','span2')+
     field('f-bio','Short bio (optional)','<textarea class="dit-input" id="f-bio" maxlength="280" placeholder="What are you working towards?">'+esc(m.bio||'')+'</textarea>','Up to 280 characters.','span2')+
   '</div>')+
   sec('fs-goals','What you’re looking for','Used for your match scores.',
     group('g-int','Fields you are interested in',toggleHTML('interests',CATEGORIES,m.interests||[],'g-int'),'Pick at least one.')+
     group('g-type','Kind of role you want',toggleHTML('job_types',JOB_TYPES,m.job_types||[],'g-type'))+
     group('g-mode','Work setup you are fine with',toggleHTML('work_modes',MODES,m.work_modes||[],'g-mode')))+
   sec('fs-skills','Your skills','Matches get sharper with 4 or more skills. Pick suggestions or type your own and press Enter.',pickerHTML('skills',m.skills||[],sk,'Type a skill and press Enter'))+
   sec('fs-cv','CV (optional)','PDF or DOCX, up to 2 MB. Private unless you choose to share it.','<div id="cv-box">'+cvBoxHTML()+'</div>')+
   sec('fs-privacy','Privacy','You can change these at any time.',
     '<label class="dit-check hub-pool"><input type="checkbox" id="f-pool"'+(m.in_pool===true?' checked':'')+'><span><b>Show me in the Talent Pool</b><span class="dit-hint">Off unless you turn it on. When on, other members can see your name, headline, status, level, city, school or company, skills, bio, the fields, kinds of role and work setup you are looking for, contact email and LinkedIn, and roles they post will rank you by match. Your CV stays private unless you share it below.</span></span></label>'+
     (onb?'<label class="dit-check"><input type="checkbox" id="f-consent"><span>I agree that Dara in Tech stores this information to run the Member Hub.</span></label>':''))+
   '<div class="hub-form__foot"><p class="err" id="form-err" role="alert"></p><button class="dit-btn dit-btn--lg" type="submit">'+(onb?'Create my profile':'Save profile')+'</button></div></form>';
}
function onboardHTML(){return '<div class="hub-head"><div><h1>Tell us about <span class="dit-grad-text">you</span>.</h1><p class="dit-lead">It takes about three minutes. Your match scores are built from this, so the more accurate, the better.</p></div>'+(S.admin?'<button class="dit-btn dit-btn--outline dit-btn--sm" data-act="nav" data-v="admin">Open the admin panel first</button>':'')+'</div>'+profileFormHTML(true)}
function rankedForMe(){
  return S.jobs.filter(j=>isOpen(j)&&j.posted_by!==S.user.id).map(j=>({j,r:matchScore(S.me,j)})).sort((a,b)=>b.r.total-a.r.total);
}
function jobCardHTML(j,r){
  const mine=S.user&&j.posted_by===S.user.id;
  const open=isOpen(j);
  return '<article class="job" data-act="open-job" data-id="'+esc(j.id)+'"><div class="job-main"><div class="job-top"><h3><button class="job-title" data-act="open-job" data-id="'+esc(j.id)+'">'+esc(j.title)+'</button></h3>'+(mine?'<span class="badge you">Your post</span>':'')+(open?'':'<span class="badge warn">Closed</span>')+(!isApproved(j)&&(mine||S.admin)?'<span class="badge">Awaiting approval</span>':'')+'</div>'+
   '<p class="co">'+esc(j.company)+(j.location?' · '+esc(j.location):'')+'</p>'+
   '<div class="tags"><span class="tag">'+esc(j.category)+'</span><span class="tag">'+esc(lbl(JOB_TYPES,j.job_type))+'</span><span class="tag">'+esc(lbl(MODES,j.work_mode))+'</span><span class="tag">'+esc(lbl(LEVELS,j.level))+'</span></div>'+
   '<div class="chips">'+chipsFor(r.reqHit,r.reqMiss,6)+'</div></div>'+scoreHTML(r.total)+'</article>';
}
function homeHTML(){
  const top=rankedForMe().slice(0,3);
  const c=completeness(S.me);
  const pool=S.members.filter(m=>m.in_pool).length;
  const openN=S.jobs.filter(isOpen).length;
  return '<div class="hub-head"><div><h1>Hi, <span class="dit-grad-text">'+esc(first(S.me.full_name))+'</span>.</h1><p class="dit-lead">'+(top.length?'Your best match right now is <b>'+esc(top[0].j.title)+'</b> at '+esc(top[0].j.company)+': '+top[0].r.total+'% match.':'No open roles yet. Post one, or check back soon.')+'</p></div></div>'+
   '<ul class="hub-stats" role="list"><li class="dit-card dit-card--soft"><span class="hub-stats__num">'+pool+'</span><span>members in the Talent Pool</span></li><li class="dit-card dit-card--soft"><span class="hub-stats__num">'+openN+'</span><span>open roles</span></li>'+
   '<li class="dit-card dit-card--soft"><span class="hub-stats__num">'+c.pct+'%</span><span>profile complete</span><div class="progress" role="progressbar" aria-label="Profile completeness" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+c.pct+'"><i style="width:'+c.pct+'%"></i></div></li></ul>'+
   (c.pct<100?'<div class="dit-card dit-card--soft hub-tips"><div><h2 class="hub-h2">Sharpen your matches</h2><ul class="tip-list">'+c.tips.slice(0,3).map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></div>'+navLink('profile','Edit profile','dit-btn dit-btn--outline dit-btn--sm')+'</div>':'')+
   '<section class="list" aria-labelledby="h-top"><div class="sec-h"><h2 id="h-top" class="hub-h2">Your top matches</h2>'+navLink('pool','See all roles','dit-btn dit-btn--ghost dit-btn--sm')+'</div>'+
   (top.length?top.map(x=>jobCardHTML(x.j,x.r)).join(''):emptyHTML('Nothing to match yet','When members post roles, the best fits for you show up here.','<button class="dit-btn" data-act="post-job">'+ICON.plus+' Post a role</button>'))+'</section>'+latestHTML();
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
  if(!rows.length)return emptyHTML('No roles match these filters','Lower the minimum match or clear a filter.','<button class="dit-btn dit-btn--outline dit-btn--sm" data-act="clear-filters">Clear filters</button>','comfort');
  return '<p class="count">'+rows.length+' role'+(rows.length===1?'':'s')+(S.f.sort==='match'?', best match first':', newest first')+'</p>'+rows.map(x=>jobCardHTML(x.j,x.r)).join('');
}
function rolesViewHTML(){
  const f=S.f;
  return '<div class="filters dit-card dit-card--soft" role="search" aria-label="Filter roles"><div class="search">'+ICON.search+'<input class="dit-input" id="f-q" data-f="q" type="search" placeholder="Search title, company or skill" aria-label="Search roles" value="'+esc(f.q)+'"></div>'+
   field('f-cat','Field','<select class="dit-input" id="f-cat" data-f="cat">'+opts(CATEGORIES,f.cat,'All fields')+'</select>')+
   field('f-mode','Setup','<select class="dit-input" id="f-mode" data-f="mode">'+opts(MODES,f.mode,'Any')+'</select>')+
   field('f-type','Job type','<select class="dit-input" id="f-type" data-f="type">'+opts(JOB_TYPES,f.type,'Any')+'</select>')+
   field('f-sort','Sort by','<select class="dit-input" id="f-sort" data-f="sort">'+opts([{v:'match',l:'Best match'},{v:'new',l:'Newest'}],f.sort)+'</select>')+
   '<label class="range wide">Minimum match: <span id="minv" class="mono">'+f.min+'%</span><input type="range" min="0" max="100" step="5" value="'+f.min+'" data-f="min" aria-label="Minimum match percentage"></label>'+
   '<label class="dit-check wide"><input type="checkbox" data-f="open"'+(f.open?' checked':'')+'><span>Open roles only</span></label></div>'+
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
/* Who may download another member's shared CV: admins, and members with an approved, open role of their own
   (the database enforces the same rule; this only avoids showing a button that would fail). */
function canGetSharedCVs(){return S.admin||S.jobs.some(j=>j.posted_by===S.user.id&&isOpen(j)&&isApproved(j))}
function personHTML(m,r,jobSkills){
  const hit=new Set((jobSkills||[]).map(nk));
  const sk=(m.skills||[]).slice().sort((a,b)=>(hit.has(nk(b))?1:0)-(hit.has(nk(a))?1:0));
  const li=linkedinUrl(m.linkedin);
  return '<div class="person"><div class="avatar" aria-hidden="true">'+esc(ini(m.full_name))+'</div><div class="person-main"><b>'+esc(m.full_name)+'</b><span class="co">'+esc(m.headline||'')+'</span><div class="tags"><span class="tag">'+esc(lbl(LEVELS,m.level))+'</span>'+(m.city?'<span class="tag">'+esc(m.city)+'</span>':'')+'<span class="tag">'+esc(lbl(STATUSES,m.status))+'</span></div>'+
   '<div class="chips">'+sk.slice(0,8).map(s=>'<span class="chip'+(hit.has(nk(s))?' hit':'')+'">'+(hit.has(nk(s))?ICON.check:'')+esc(s)+'</span>').join('')+(sk.length>8?'<span class="chip more">+'+(sk.length-8)+' more</span>':'')+'</div>'+
   (m.bio?'<p class="note">'+esc(m.bio)+'</p>':'')+
   '<div class="contact"><span class="sel">'+esc(m.email||'')+'</span>'+(li?'<a href="'+esc(li)+'" target="_blank" rel="noopener noreferrer">LinkedIn<span class="dit-visually-hidden"> (opens in a new tab)</span></a>':'')+(m.cv_path&&(m.id===S.user.id||S.admin||(m.cv_shared&&m.in_pool&&canGetSharedCVs()))?'<button type="button" class="dit-btn dit-btn--outline dit-btn--sm" data-act="dl-cv" data-id="'+esc(m.id)+'">Download CV</button>':'')+'</div></div>'+(r?scoreHTML(r.total,true):'')+'</div>';
}
function membersResultsHTML(){
  const rows=filteredMembers();
  if(!rows.length)return emptyHTML('No members found','Try a different search, or invite more members to turn on the Talent Pool.','','comfort');
  return '<p class="count">'+rows.length+' member'+(rows.length===1?'':'s')+' in the Talent Pool</p>'+rows.map(m=>personHTML(m,null,[])).join('');
}
function membersViewHTML(){
  const f=S.mf;
  return '<div class="filters dit-card dit-card--soft" role="search" aria-label="Filter members"><div class="search">'+ICON.search+'<input class="dit-input" data-mf="q" type="search" placeholder="Search name, headline or skill" aria-label="Search members" value="'+esc(f.q)+'"></div>'+
   field('m-level','Level','<select class="dit-input" id="m-level" data-mf="level">'+opts(LEVELS,f.level,'Any level')+'</select>','','wide')+
   field('m-city','City','<input class="dit-input" id="m-city" data-mf="city" type="text" placeholder="Jakarta" value="'+esc(f.city)+'">','','wide')+'</div>'+
   '<div class="list" id="members-results" aria-live="polite">'+membersResultsHTML()+'</div>';
}
function poolHTML(){
  return '<div class="hub-head"><div><h1>Talent Pool</h1><p class="dit-lead">Roles posted by members, ranked by how well they fit you, and the members who chose to be listed.</p></div><button class="dit-btn" data-act="post-job">'+ICON.plus+' Post a role</button></div>'+
   '<div class="seg" role="tablist" aria-label="Talent Pool sections"><button class="seg-b" role="tab" aria-selected="'+(S.tab==='roles')+'" data-act="tab" data-v="roles">Roles for me</button><button class="seg-b" role="tab" aria-selected="'+(S.tab==='members')+'" data-act="tab" data-v="members">Members</button></div>'+
   (S.tab==='roles'?rolesViewHTML():membersViewHTML());
}
function candidatesFor(j){
  return S.members.filter(m=>m.in_pool&&m.id!==j.posted_by).map(m=>({m,r:matchScore(m,j)})).sort((a,b)=>b.r.total-a.r.total);
}
function postingsHTML(){
  const mine=S.jobs.filter(j=>j.posted_by===S.user.id);
  return '<div class="hub-head"><div><h1>My postings</h1><p class="dit-lead">Roles you posted, with the members who fit them best.</p></div><button class="dit-btn" data-act="post-job">'+ICON.plus+' Post a role</button></div>'+
   (mine.length?'<div class="list">'+mine.map(j=>{
     const c=candidatesFor(j);const strong=c.filter(x=>x.r.total>=70).length;
     return '<article class="job" data-act="open-job" data-id="'+esc(j.id)+'"><div class="job-main"><div class="job-top"><h3><button class="job-title" data-act="open-job" data-id="'+esc(j.id)+'">'+esc(j.title)+'</button></h3>'+(isOpen(j)?'<span class="badge you">Open</span>':'<span class="badge warn">Closed</span>')+(isApproved(j)?'':'<span class="badge">Awaiting approval</span>')+'</div><p class="co">'+esc(j.company)+' · posted '+esc(fmtD(j.created_at))+(j.deadline?' · closes '+esc(fmtD(j.deadline)):'')+'</p>'+
      '<p class="count"><b class="mono">'+strong+'</b> member'+(strong===1?'':'s')+' at 70% or more'+(c.length?', best match <b class="mono">'+c[0].r.total+'%</b>':'')+' · '+c.length+' in the Talent Pool</p></div><div class="btn-row"><span class="dit-btn dit-btn--outline dit-btn--sm">View candidates</span></div></article>';
   }).join('')+'</div>':emptyHTML('You have not posted a role yet','Post an opening and see which members fit it, ranked by match.','<button class="dit-btn" data-act="post-job">'+ICON.plus+' Post a role</button>'))+myPostsHTML();
}
/* ================= CV box ================= */
function cvShareVal(){return S.cvShare!==null?S.cvShare:!!(S.me&&S.me.cv_shared)}
function cvBoxHTML(){
  const cur=S.me&&S.me.cv_path&&!S.cvRemove?S.me:null;
  const p=S.cvPending;
  let row='';
  if(p)row='<div class="cv-row"><span class="cv-name">'+esc(p.name)+' <span class="dit-muted">('+fmtSize(p.size)+', uploads when you save)</span></span><button type="button" class="dit-btn dit-btn--ghost dit-btn--sm" data-act="cv-clear">Remove</button></div>';
  else if(cur)row='<div class="cv-row"><span class="cv-name">'+esc(cur.cv_name||'CV')+' <span class="dit-muted">('+fmtSize(cur.cv_size||0)+')</span></span><span class="btn-row"><button type="button" class="dit-btn dit-btn--outline dit-btn--sm" data-act="dl-cv" data-id="'+esc(cur.id)+'">Download</button><button type="button" class="dit-btn dit-btn--ghost dit-btn--sm" data-act="cv-remove">Remove</button></span></div>';
  else if(S.cvRemove&&S.me&&S.me.cv_path)row='<p class="dit-hint">Your CV will be removed when you save.</p>';
  const has=!!(p||cur);
  return row+'<input class="dit-input" id="f-cv" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Choose a CV file (PDF or DOCX, up to 2 MB)">'+
   '<label class="dit-check"><input type="checkbox" id="f-cvshare"'+(has&&cvShareVal()?' checked':'')+(has?'':' disabled')+'><span>Let members who post roles download my CV<span class="dit-hint">Only while you are in the Talent Pool. Admins can always open it.'+(has?'':' Add a CV first.')+'</span></span></label>';
}

/* ================= Mading (community board) ================= */
const kindOf=v=>KINDS.find(x=>x.v===v)||KINDS[4];
function postCardHTML(p){
  const k=kindOf(p.kind);
  const mine=S.user&&p.posted_by===S.user.id;
  return '<article class="post" data-act="open-post" data-id="'+esc(p.id)+'"><div class="job-main"><div class="job-top"><span class="badge kind">'+esc(k.one)+'</span>'+(p.pinned?'<span class="badge you">Pinned</span>':'')+(mine?'<span class="badge you">Your post</span>':'')+(p.event_date&&isPast(p.event_date)?'<span class="badge warn">Past</span>':'')+'</div>'+
   '<h3><button class="job-title" data-act="open-post" data-id="'+esc(p.id)+'">'+esc(p.title)+'</button></h3>'+(p.organizer?'<p class="co">'+esc(p.organizer)+'</p>':'')+
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
  if(!items.length)return emptyHTML('Nothing here yet','Be the first to post in this section.','<button class="dit-btn" data-act="post-menu">'+ICON.plus+' Post to Mading</button>');
  return '<p class="count">'+items.length+' post'+(items.length===1?'':'s')+', pinned first, then newest</p>'+items.map(x=>x.t==='job'?jobCardHTML(x.j,matchScore(S.me,x.j)):postCardHTML(x.p)).join('');
}
function madingHTML(){
  const chips=[{v:'all',l:'All'}].concat(KINDS);
  return '<div class="hub-head"><div><h1>Mading</h1><p class="dit-lead">Jobs, events, certifications and anything else worth sharing with the community.</p></div><button class="dit-btn" data-act="post-menu">'+ICON.plus+' Post to Mading</button></div>'+
   '<div class="tgl-group" role="group" aria-label="Filter by type">'+chips.map(c=>'<button class="tgl" aria-pressed="'+(S.mad===c.v)+'" data-act="mad-filter" data-v="'+esc(c.v)+'">'+esc(c.l)+'</button>').join('')+'</div>'+
   '<div class="list" id="feed" aria-live="polite">'+feedHTML()+'</div>';
}
function latestHTML(){
  const l=S.posts.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||String(b.created_at).localeCompare(String(a.created_at))).slice(0,3);
  if(!l.length)return '';
  return '<section class="list" aria-labelledby="h-latest"><div class="sec-h"><h2 id="h-latest" class="hub-h2">Latest on Mading</h2>'+navLink('mading','Open Mading','dit-btn dit-btn--ghost dit-btn--sm')+'</div>'+l.map(postCardHTML).join('')+'</section>';
}
function myPostsHTML(){
  const mine=S.posts.filter(p=>p.posted_by===S.user.id);
  return '<section class="list" aria-labelledby="h-myposts"><div class="sec-h"><h2 id="h-myposts" class="hub-h2">Your Mading posts</h2><button class="dit-btn dit-btn--ghost dit-btn--sm" data-act="post-menu">'+ICON.plus+' Post to Mading</button></div>'+(mine.length?mine.map(postCardHTML).join(''):'<p class="dit-muted">Events, certifications and tips you share on Mading show up here.</p>')+'</section>';
}
function postMenuHTML(){
  return '<h2 id="modal-title">What do you want to share?</h2><div class="choices">'+KINDS.map(k=>'<button type="button" class="choice" data-act="post-kind" data-v="'+esc(k.v)+'"><b>'+esc(k.one)+'</b><span>'+esc(k.d)+'</span></button>').join('')+'</div>';
}
function postFormHTML(kind,p){
  p=p||{};const k=kindOf(kind);
  return '<form class="form" data-form="post" data-id="'+esc(p.id||'')+'" data-kind="'+esc(kind)+'" novalidate><h2 id="modal-title">'+(p.id?'Edit ':'Post ')+esc(k.one.toLowerCase())+'</h2>'+
   '<div class="grid2">'+
   field('p-title','Title','<input class="dit-input" id="p-title" maxlength="140" value="'+esc(p.title||'')+'">','','span2')+
   field('p-org','Organizer or source (optional)','<input class="dit-input" id="p-org" maxlength="140" value="'+esc(p.organizer||'')+'">')+
   (k.dl?field('p-date',k.dl+' (optional)','<input class="dit-input" id="p-date" type="date" value="'+esc(p.event_date||'')+'">'):'')+
   (kind==='event'?field('p-loc','Venue or online (optional)','<input class="dit-input" id="p-loc" maxlength="120" value="'+esc(p.location||'')+'">'):'')+
   '</div>'+
   field('p-desc','Details','<textarea class="dit-input" id="p-desc" maxlength="2000">'+esc(p.description||'')+'</textarea>','Say what it is, who it is for and how to join. Up to 2000 characters.')+
   field('p-link','Link (optional)','<input class="dit-input" id="p-link" type="url" maxlength="300" placeholder="example.com/info" value="'+esc(p.link||'')+'">')+
   (S.admin?'<label class="dit-check"><input type="checkbox" id="p-pin"'+(p.pinned?' checked':'')+'><span>Pin to the top of Mading</span></label>':'')+
   '<p class="err" id="form-err" role="alert"></p><div class="btn-row"><button class="dit-btn" type="submit">'+(p.id?'Save changes':'Post')+'</button><button class="dit-btn dit-btn--ghost" type="button" data-act="close">Cancel</button></div></form>';
}
function postDetailHTML(p){
  const k=kindOf(p.kind);
  const mine=p.posted_by===S.user.id,manage=mine||S.admin;
  const poster=S.members.find(m=>m.id===p.posted_by);
  const link=safeUrl(p.link);
  const conf=S.confirm==='p:'+p.id;
  return '<div class="detail-head"><p class="hub-eyebrow">'+esc(k.l)+'</p><h2 id="modal-title">'+esc(p.title)+'</h2>'+(p.organizer?'<p class="co">'+esc(p.organizer)+'</p>':'')+
   '<div class="tags">'+(p.pinned?'<span class="badge you">Pinned</span>':'')+(p.event_date?'<span class="tag">'+esc(k.dl||'Date')+': '+esc(fmtD(p.event_date))+'</span>'+(isPast(p.event_date)?'<span class="badge warn">Past</span>':''):'')+(p.location?'<span class="tag">'+esc(p.location)+'</span>':'')+'</div>'+
   '<p class="note">Posted '+esc(fmtD(p.created_at))+' by '+esc(poster?poster.full_name:'a Dara member')+'</p></div>'+
   '<section class="sub"><p class="desc">'+esc(p.description)+'</p></section>'+
   (link?'<div class="btn-row"><a class="dit-btn" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Open link '+ICON.ext+'<span class="dit-visually-hidden"> (opens in a new tab)</span></a></div>':'')+
   (manage?'<section class="btn-row">'+(mine?'<button class="dit-btn dit-btn--outline" data-act="edit-post" data-id="'+esc(p.id)+'">Edit</button>':'')+(S.admin?'<button class="dit-btn dit-btn--outline" data-act="pin-post" data-id="'+esc(p.id)+'">'+(p.pinned?'Unpin':'Pin to top')+'</button>':'')+(conf?'<button class="dit-btn dit-btn--danger" data-act="del-post-yes" data-id="'+esc(p.id)+'">Yes, delete this post</button><button class="dit-btn dit-btn--ghost" data-act="cancel-confirm">Keep it</button>':'<button class="dit-btn dit-btn--ghost" data-act="del-post" data-id="'+esc(p.id)+'">Delete</button>')+'</section>':'');
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
    toast(id?'Post updated':'Posted to Mading',id?'thumbs-up':'cheer');
  }catch(e){btn.disabled=false;setErr(e.message)}
}

function profileHTML(){
  const confirm=S.confirm==='me';
  return '<div class="hub-head"><div><h1>Your profile</h1><p class="dit-lead">Changes update your match scores right away.</p></div></div>'+profileFormHTML(false)+
   '<section class="hub-danger" aria-labelledby="h-del"><h2 id="h-del" class="hub-h2">Delete my profile</h2><p class="dit-muted">Removes your profile and CV from the community database. Roles and Mading posts you made stay until you delete them.</p>'+
   (confirm?'<div class="btn-row"><button class="dit-btn dit-btn--danger" data-act="del-me-yes">Yes, delete my profile</button><button class="dit-btn dit-btn--ghost" data-act="cancel-confirm">Keep it</button></div>':'<div><button class="dit-btn dit-btn--ghost" data-act="del-me">Delete my profile</button></div>')+'</section>';
}
function adminRows(){
  const q=S.aq.toLowerCase().trim();
  return S.members.filter(m=>!q||((m.full_name+' '+(m.email||'')+' '+(m.city||'')+' '+(m.headline||'')+' '+(m.skills||[]).join(' ')).toLowerCase().includes(q)));
}
function adminTableHTML(){
  const rows=adminRows();
  if(!rows.length)return '<div style="padding:20px">'+emptyHTML('No participants found','Members appear here after they sign in and save a profile.')+'</div>';
  return '<table><caption class="dit-visually-hidden">Participants</caption><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">City</th><th scope="col">Status</th><th scope="col">Level</th><th scope="col">Skills</th><th scope="col">Joined</th><th scope="col">In pool</th><th scope="col">CV</th><th scope="col"><span class="dit-visually-hidden">Actions</span></th></tr></thead><tbody>'+rows.map(m=>{
    const conf=S.confirm==='m:'+m.id;
    return '<tr><td><b>'+esc(m.full_name)+'</b><br><span class="note">'+esc(m.headline||'')+'</span></td><td class="sel">'+esc(m.email||'')+'</td><td>'+esc(m.city||'')+'</td><td>'+esc(lbl(STATUSES,m.status))+'</td><td>'+esc(lbl(LEVELS,m.level))+'</td><td>'+esc((m.skills||[]).join(', '))+'</td><td>'+esc(fmtD(m.created_at))+'</td><td>'+(m.in_pool?'Yes':'No')+'</td><td>'+(m.cv_path?'<button class="dit-btn dit-btn--outline dit-btn--sm" data-act="dl-cv" data-id="'+esc(m.id)+'">Download</button>':'')+'</td><td>'+(conf?'<button class="dit-btn dit-btn--danger dit-btn--sm" data-act="member-del-yes" data-id="'+esc(m.id)+'">Confirm</button> <button class="dit-btn dit-btn--ghost dit-btn--sm" data-act="cancel-confirm">Cancel</button>':'<button class="dit-btn dit-btn--ghost dit-btn--sm" data-act="member-del" data-id="'+esc(m.id)+'">Remove</button>')+'</td></tr>';
  }).join('')+'</tbody></table>';
}
function pendingRolesHTML(){
  const pending=S.jobs.filter(j=>!isApproved(j));
  if(!S.jobs.some(j=>'approved_at' in j))return '';
  return '<section class="list" aria-labelledby="h-pending"><div class="sec-h"><h2 id="h-pending" class="hub-h2">Roles awaiting approval</h2><span class="count">'+pending.length+'</span></div>'+
   (pending.length?pending.map(j=>jobCardHTML(j,matchScore(S.me||{},j))).join(''):'<p class="dit-muted">Nothing to review.</p>')+'</section>';
}
function adminHTML(){
  if(!S.admin)return emptyHTML('Admins only','Ask the community team to add you as an admin.');
  const total=S.members.length,pool=S.members.filter(m=>m.in_pool).length;
  return (S.me?'':'<div>'+navLink('home','Back to profile setup','dit-btn dit-btn--ghost dit-btn--sm')+'</div>')+'<div class="hub-head"><div><h1>Participants</h1><p class="dit-lead">Everyone who has saved a profile, including members outside the Talent Pool.</p></div><div class="btn-row"><button class="dit-btn" data-act="export-csv">Export CSV</button>'+(DEMO?'<button class="dit-btn dit-btn--outline" data-act="reset-demo">Reset demo data</button>':'')+'</div></div>'+
   '<ul class="hub-stats" role="list"><li class="dit-card dit-card--soft"><span class="hub-stats__num">'+total+'</span><span>registered</span></li><li class="dit-card dit-card--soft"><span class="hub-stats__num">'+pool+'</span><span>in the Talent Pool</span></li><li class="dit-card dit-card--soft"><span class="hub-stats__num">'+S.jobs.length+'</span><span>roles posted</span></li><li class="dit-card dit-card--soft"><span class="hub-stats__num">'+S.posts.length+'</span><span>Mading posts</span></li></ul>'+
   '<div class="filters dit-card dit-card--soft" role="search" aria-label="Search participants"><div class="search">'+ICON.search+'<input class="dit-input" id="a-q" data-aq type="search" placeholder="Name, email, city or skill" aria-label="Search participants" value="'+esc(S.aq)+'"></div></div>'+
   '<div class="tbl-wrap" id="admin-table">'+adminTableHTML()+'</div>'+pendingRolesHTML();
}
function viewHTML(){
  if(!S.ready)return '<div class="hub-loading">'+dalaImg('read')+'<p>Loading the Member Hub…</p></div>';
  if(!S.user)return authHTML();
  if(!S.me&&S.admin&&S.view==='admin')return shell(adminHTML(),false);
  if(!S.me)return shell(onboardHTML(),false);
  const v=S.view;
  const body=v==='pool'?poolHTML():v==='mading'?madingHTML():v==='postings'?postingsHTML():v==='profile'?profileHTML():v==='admin'?adminHTML():homeHTML();
  return shell(body,true);
}
function render(){
  $('#app').innerHTML=viewHTML();
  document.title=(!S.user?(SIGNUP?'Sign up':'Sign in'):!S.me&&S.view!=='admin'?'Welcome':TITLES[S.view]||'Home')+' · Member Hub · Dara in Tech';
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
  if(!rows.length)return emptyHTML('No members at this level','Lower the filter, or wait for more members to join the Talent Pool.','','comfort');
  return '<ul class="cand-list">'+rows.map(x=>'<li>'+personHTML(x.m,x.r,sk)+'</li>').join('')+'</ul>';
}
function jobDetailHTML(j){
  const mine=j.posted_by===S.user.id,manage=mine||S.admin;
  const r=matchScore(S.me,j);
  const poster=S.members.find(m=>m.id===j.posted_by);
  const link=safeUrl(j.apply_link);
  const conf=S.confirm==='j:'+j.id;
  return '<div class="detail-head"><p class="hub-eyebrow">'+esc(j.category)+'</p><h2 id="modal-title">'+esc(j.title)+'</h2><p class="co">'+esc(j.company)+(j.location?' · '+esc(j.location):'')+'</p>'+
   '<div class="tags"><span class="tag">'+esc(lbl(JOB_TYPES,j.job_type))+'</span><span class="tag">'+esc(lbl(MODES,j.work_mode))+'</span><span class="tag">'+esc(lbl(LEVELS,j.level))+'</span>'+(isOpen(j)?'':'<span class="badge warn">Closed</span>')+(j.deadline?'<span class="tag">Closes '+esc(fmtD(j.deadline))+'</span>':'')+'</div>'+
   '<p class="note">Posted '+esc(fmtD(j.created_at))+' by '+esc(poster?poster.full_name:'a Dara member')+'</p></div>'+
   (!isApproved(j)&&mine?'<div class="dit-alert dit-alert--info" role="note">'+ICON.star+'<div><strong class="dit-alert__title">Awaiting approval</strong><span class="dit-alert__body">An admin reviews new roles. Until then, members can see this role but you cannot download shared CVs.</span></div></div>':'')+
   (!isApproved(j)&&S.admin?'<div class="btn-row"><button class="dit-btn" data-act="approve-job" data-id="'+esc(j.id)+'">Approve role</button><span class="dit-muted">Approving lets the poster download CVs that members chose to share.</span></div>':'')+
   (mine?'':'<section class="panel" aria-label="Your match"><div class="mscore m-'+band(r.total)+'"><strong>'+r.total+'%</strong><span>'+bandLabel(r.total)+'</span><div class="bar"><i style="width:'+r.total+'%"></i></div></div><ul class="bk">'+r.parts.map(p=>'<li><div class="bk-top"><span>'+esc(p.label)+'</span><span class="mono">'+(p.ok?Math.round(p.s*p.w)+' / '+p.w:'not rated')+'</span></div><div class="track"><i style="width:'+(p.ok?Math.round(p.s*100):0)+'%"></i></div><p class="note">'+esc(p.note)+'</p></li>').join('')+'</ul></section>')+
   ((j.req_skills||[]).length?'<section class="sub"><h3>Required skills</h3><div class="chips">'+(mine?(j.req_skills||[]).map(s=>'<span class="chip">'+esc(s)+'</span>').join(''):chipsFor(r.reqHit,r.reqMiss))+'</div></section>':'')+
   ((j.nice_skills||[]).length?'<section class="sub"><h3>Nice to have</h3><div class="chips">'+(mine?(j.nice_skills||[]).map(s=>'<span class="chip">'+esc(s)+'</span>').join(''):chipsFor(r.niceHit,r.niceMiss))+'</div></section>':'')+
   (j.description?'<section class="sub"><h3>About the role</h3><p class="desc">'+esc(j.description)+'</p></section>':'')+
   '<section class="sub"><h3>How to apply</h3><div class="btn-row">'+(link?'<a class="dit-btn" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Apply on their site '+ICON.ext+'<span class="dit-visually-hidden"> (opens in a new tab)</span></a>':'')+(j.contact_email?'<span>Contact: <b class="sel">'+esc(j.contact_email)+'</b></span><button class="dit-btn dit-btn--ghost dit-btn--sm" data-act="copy" data-v="'+esc(j.contact_email)+'">Copy</button>':'')+'</div></section>'+
   (manage?'<section class="sub"><div class="sec-h"><h3>Matching members</h3><div class="dit-field" style="min-width:170px"><label class="dit-label" for="cand-min">Show</label><select class="dit-input" id="cand-min">'+opts([{v:'0',l:'Everyone'},{v:'40',l:'40% and up'},{v:'60',l:'60% and up'},{v:'80',l:'80% and up'}],String(S.candMin))+'</select></div></div><div id="cand-list">'+candListHTML(j)+'</div></section>':'')+
   (manage?'<section class="btn-row">'+(mine?'<button class="dit-btn dit-btn--outline" data-act="edit-job" data-id="'+esc(j.id)+'">Edit</button><button class="dit-btn dit-btn--outline" data-act="toggle-open" data-id="'+esc(j.id)+'">'+(j.is_open===false?'Reopen role':'Close role')+'</button>':'')+(conf?'<button class="dit-btn dit-btn--danger" data-act="del-job-yes" data-id="'+esc(j.id)+'">Yes, delete this role</button><button class="dit-btn dit-btn--ghost" data-act="cancel-confirm" data-id="'+esc(j.id)+'">Keep it</button>':'<button class="dit-btn dit-btn--ghost" data-act="del-job" data-id="'+esc(j.id)+'">Delete</button>')+'</section>':'');
}
function jobFormHTML(j){
  j=j||{};
  const cat=j.category||CATEGORIES[0];
  const sug=SUG_BY_CAT[cat]||[];
  return '<form class="form" data-form="job" data-id="'+esc(j.id||'')+'" novalidate><h2 id="modal-title">'+(j.id?'Edit role':'Post a role')+'</h2><p class="dit-muted">Members see this role with a match score. Only members in the Talent Pool are ranked for you.</p>'+
   '<div class="grid2">'+
   field('j-title','Role title','<input class="dit-input" id="j-title" maxlength="140" value="'+esc(j.title||'')+'" placeholder="Junior Data Analyst">')+
   field('j-company','Company','<input class="dit-input" id="j-company" maxlength="140" autocomplete="organization" value="'+esc(j.company||'')+'">')+
   field('j-cat','Field','<select class="dit-input" id="j-cat">'+opts(CATEGORIES,cat)+'</select>')+
   field('j-level','Level','<select class="dit-input" id="j-level">'+opts(LEVELS,j.level||'junior')+'</select>')+
   field('j-type','Job type','<select class="dit-input" id="j-type">'+opts(JOB_TYPES,j.job_type||'full_time')+'</select>')+
   field('j-mode','Work setup','<select class="dit-input" id="j-mode">'+opts(MODES,j.work_mode||'hybrid')+'</select>')+
   field('j-loc','Location','<input class="dit-input" id="j-loc" maxlength="100" value="'+esc(j.location||'')+'" placeholder="Jakarta">','Leave empty if it does not matter.')+
   field('j-deadline','Apply by (optional)','<input class="dit-input" id="j-deadline" type="date" value="'+esc(j.deadline||'')+'">')+
   '</div>'+
   group('g-req','Required skills',pickerHTML('req',j.req_skills||[],sug,'Type a skill and press Enter'),'Worth 40% of the match score.')+
   group('g-nice','Nice-to-have skills',pickerHTML('nice',j.nice_skills||[],sug,'Type a skill and press Enter'),'Worth 10%.')+
   field('j-desc','About the role (optional)','<textarea class="dit-input" id="j-desc" maxlength="4000">'+esc(j.description||'')+'</textarea>')+
   '<div class="grid2">'+field('j-link','Apply link','<input class="dit-input" id="j-link" type="url" maxlength="300" value="'+esc(j.apply_link||'')+'" placeholder="company.com/careers/role">')+field('j-mail','Contact email','<input class="dit-input" id="j-mail" type="email" maxlength="160" value="'+esc(j.contact_email||'')+'">')+'</div>'+
   '<p class="dit-hint">Add an apply link, a contact email, or both.</p>'+
   '<p class="err" id="form-err" role="alert"></p><div class="btn-row"><button class="dit-btn" type="submit">'+(j.id?'Save changes':'Post role')+'</button><button class="dit-btn dit-btn--ghost" type="button" data-act="close">Cancel</button></div></form>';
}
function showJob(id,fresh){
  const j=S.jobs.find(x=>x.id===id);if(!j)return;
  S.openJob=id;
  if(fresh)openModal(jobDetailHTML(j));else setModal(jobDetailHTML(j));
}

/* ================= actions ================= */
async function refreshData(){
  const r=await Promise.all([API.listMembers(S.admin),API.listJobs(),API.listPosts()]);
  S.members=r[0]||[];S.jobs=r[1]||[];S.posts=r[2]||[];
}
async function afterLogin(u){
  if(SIGNUP){location.replace('/hub/');return}
  S.user=u;S.authStep='email';S.authErr='';S.busy=false;
  S.admin=await API.isAdmin(u);
  S.me=await API.getMe(u.id);
  await refreshData();
  S.view=viewFromHash()||'home';S.ready=true;
  if(S.me)history.replaceState(null,'','#/'+slugOf(S.view));
  render();toTop();
}
/* Clear everything held in memory for the signed-in member. Used by Sign out and when another tab signs out. */
function signedOut(){
  history.replaceState(null,'',location.pathname);
  Object.assign(S,{user:null,admin:false,me:null,members:[],jobs:[],posts:[],view:'home',authStep:'email',authErr:'',busy:false,confirm:null,cvPending:null,cvRemove:false,cvShare:null,mad:'all'});
  if($('#modal-root .modal'))closeModal();render();
}
/* View changes jump to the top instantly (the site's smooth scrolling is for in-page anchors only). */
function toTop(){window.scrollTo({top:0,left:0,behavior:'instant'})}
/* Move to a view: new history entry, fresh render, focus on the content (so keyboard and screen reader users land there). */
function go(v){
  S.view=v;S.confirm=null;S.cvPending=null;S.cvRemove=false;S.cvShare=null;
  const h='#/'+slugOf(v);if(location.hash!==h)history.pushState(null,'',h);
  render();toTop();
  const m=$('#main');if(m)m.focus({preventScroll:true});
}
window.addEventListener('popstate',()=>{
  if(!S.user)return;
  const v=viewFromHash()||'home';if(v===S.view)return;
  if($('#modal-root .modal'))closeModal();
  S.view=v;S.confirm=null;render();
});
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
  if(row.linkedin){const u=linkedinUrl(row.linkedin);if(!u)return setErr('That LinkedIn link does not look right. Use your linkedin.com profile address.');row.linkedin=u}
  if(onb&&!$('#f-consent',form).checked)return setErr('Tick the box to agree before joining.');
  const btn=$('button[type=submit]',form);btn.disabled=true;
  try{
    const oldCv=S.me&&S.me.cv_path?S.me:null;
    let cv={cv_path:oldCv?oldCv.cv_path:null,cv_name:oldCv?oldCv.cv_name:null,cv_size:oldCv?oldCv.cv_size:null};
    let replaced=false;
    if(S.cvPending){cv=await API.uploadCV(S.user.id,S.cvPending,S.cvKind);replaced=true}
    else if(S.cvRemove&&oldCv){await API.removeCV(oldCv);cv={cv_path:null,cv_name:null,cv_size:null}}
    cv.cv_shared=!!cv.cv_path&&row.in_pool&&cvShareVal();
    Object.assign(row,cv);
    let saved;
    try{saved=await API.saveMe(row)}
    catch(err){if(replaced&&!DEMO)await API.removeCV(Object.assign({id:S.user.id},cv)).catch(()=>{});throw err} /* no orphaned upload */
    if(replaced&&oldCv&&!DEMO)await API.removeCV(oldCv).catch(()=>toast('Your new CV is saved, but the old file could not be removed. Try again later.','comfort'));
    S.me=Object.assign({},row,saved||{});
    S.cvPending=null;S.cvRemove=false;S.cvShare=null;
    await refreshData();
    if(onb){S.view='home';history.replaceState(null,'','#/home');render();toTop();toast('Welcome to Dara in Tech','excited')}
    else{render();{const full=completeness(S.me).pct===100;toast(full?'Profile saved. It’s 100% complete!':'Profile saved',full?'trophy':'thumbs-up')}}
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
    toast(id?'Role updated':'Role posted',id?'thumbs-up':'announce');
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
  if(t.tagName==='A'&&(t.getAttribute('href')||'').charAt(0)==='#'){if(e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault()}
  try{
    switch(a){
      case 'nav':go(t.dataset.v);break;
      case 'tab':S.tab=t.dataset.v;render();break;
      case 'open-job':S.candMin=0;S.confirm=null;showJob(t.dataset.id,true);break;
      case 'close':closeModal();break;
      case 'post-job':PK.req=[];PK.nice=[];openModal(jobFormHTML());break;
      case 'edit-job':{const j=S.jobs.find(x=>x.id===t.dataset.id);if(j)setModal(jobFormHTML(j));break}
      case 'approve-job':await API.approveJob(t.dataset.id);await refreshData();showJob(t.dataset.id);render();toast('Role approved','thumbs-up');break;
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
      case 'dl-cv':{const m=S.members.find(x=>x.id===t.dataset.id)||(S.me&&S.me.id===t.dataset.id?S.me:null);if(!m||!m.cv_path)break;toast('Preparing CV…');
        const blob=await API.getCV(m),kind=await sniffCV(blob);
        if(!kind)throw new Error('That file is not a real PDF or DOCX, so it was not downloaded.');
        await saveFile(cvFileName(m,kind),new Blob([blob],{type:CV_MIME[kind]}));break}
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
      case 'signout':await API.signOut();signedOut();break;
      case 'google':try{await API.google()}catch(err){S.authErr=err.message;render()}break;
      case 'back-email':S.authStep='email';S.authErr='';render();break;
      case 'export-csv':await saveFile('dara-in-tech-participants.csv',csvText());break;
      case 'member-del':S.confirm='m:'+t.dataset.id;$('#admin-table').innerHTML=adminTableHTML();break;
      case 'member-del-yes':await API.purgeCVs(t.dataset.id);await API.deleteMember(t.dataset.id);S.confirm=null;await refreshData();render();toast('Participant removed');break;
      case 'reset-demo':await API.resetDemo();await refreshData();S.me=await API.getMe(S.user.id);render();toast('Demo data reset');break;
      case 'del-me':S.confirm='me';render();break;
      case 'del-me-yes':await API.purgeCVs(S.user.id);await API.deleteMe(S.user.id);S.me=null;S.confirm=null;await refreshData();render();toTop();toast('Profile deleted');break;
    }
  }catch(err){toast(err&&err.message?err.message:'Something went wrong. Try again.','comfort')}
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
    sniffCV(f).then(kind=>{
      if(!kind||kind!==fileExt(f.name)){toast('That file doesn’t look like a real PDF or DOCX. Choose another file.','comfort');t.value='';return}
      S.cvPending=f;S.cvKind=kind;S.cvRemove=false;$('#cv-box').innerHTML=cvBoxHTML();
    });
  }else if(t.id==='f-cvshare'){
    S.cvShare=t.checked;
  }
}
document.addEventListener('input',onInput);
document.addEventListener('change',onInput);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#modal-root .modal')){closeModal();return}
  /* Keep Tab inside an open dialog. */
  const dlg=$('#modal-root .modal');
  if(e.key==='Tab'&&dlg){
    const f=$$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',dlg).filter(x=>x.offsetParent!==null);
    if(f.length){const a=f[0],z=f[f.length-1];if(e.shiftKey&&(document.activeElement===a||document.activeElement===dlg)){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
  }
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
  if(DEMO)API=(await import('./demo.js')).createDemoAPI({store,uid8});
  if(!DEMO&&!CONFIGURED){
    console.error('[Dara Hub] Not configured: set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY (or PUBLIC_DEMO_MODE=true for local development only).');
    $('#app').innerHTML='<main class="hub-main" id="main"><div class="dit-container hub-center"><section class="dit-card dit-card--soft hub-msg" data-hub-unconfigured><h1 class="hub-h2">The Member Hub is not available yet</h1><p class="dit-muted">We are still setting it up. Please check back soon.</p><a class="dit-btn dit-btn--outline" href="/">Back to Dara in Tech</a></section></div></main>';
    return;
  }
  try{
    await API.init();
    API.onSignedOut(()=>{if(S.user){signedOut();toast('You were signed out.')}});
    const u=await API.session();
    if(u){await afterLogin(u)}else{S.ready=true;render()}
  }catch(e){
    $('#app').innerHTML='<main class="hub-main" id="main"><div class="dit-container hub-center"><section class="dit-card dit-card--soft hub-msg" role="alert"><h1 class="hub-h2">The Member Hub could not start</h1><p class="dit-muted">'+esc(e.message||'Unknown error')+'</p><a class="dit-btn dit-btn--outline" href="/">Back to Dara in Tech</a></section></div></main>';
  }
}
/* Test hook: demo builds only (it exposes in-memory state). */
if(DEMO&&window.__DARA_TEST)window.__DARA_TEST={matchScore,nk,csvText,S};
boot();
})();
