// Rules mirrored from v0.7 (abilities.ts / training.ts / support.ts), simplified where noted.
const clamp=v=>Math.max(0,Math.min(100,v));
const W={contact:{sense:.5,mental:.3,intelligence:.2},power:{power:.7,sense:.3},eye:{intelligence:.5,mental:.5},speed:{endurance:.4,power:.3,sense:.3},
 velocity:{power:.6,sense:.2,endurance:.2},control:{sense:.4,mental:.4,intelligence:.2},breaking:{sense:.4,intelligence:.4,power:.2},stamina:{endurance:.7,mental:.3},field:{sense:.4,intelligence:.3,endurance:.3}};
const SEC={batter:['contact','power','eye','speed','field'],pitcher:['velocity','control','breaking','stamina','field']};
const effMental=(m,st)=>Math.max(0,m-Math.max(0,st-50)*.3);
const base=(a,k,st=0)=>Object.entries(W[k]).reduce((t,[s,w])=>t+(s==='mental'?effMental(a.mental,st):a[s])*w,0);
const sec=(p,k)=>clamp(Math.round(base(p.a,k,p.stress)*.6+Math.floor(p.prof[k])*.4));
const CURVE=JSON.parse(process.env.CURVE||'[[90,.25],[80,.5],[60,.75]]');
const curve=(v,shift=0)=>{for(const[t,m]of CURVE)if(v>=t+shift)return m;return 1;};
const FRAC=process.env.FRAC==='1';
const CAP=+(process.env.CAP||100);
const grow=(v,raw,m=1,shift=0)=>raw<=0?0:FRAC?Math.max(0,Math.min(CAP+shift/2-v,raw*curve(v,shift)*m)):Math.min(100-v,Math.max(1,Math.floor(raw*curve(v,shift)*m)));
const gapM=(v,b)=>v-b>20?.25:v-b>10?.5:1;
const failCurve=[[0,95],[10,80],[20,60],[30,40],[40,25],[50,15],[60,5],[70,0],[100,0]];
const failP=e=>{for(let i=1;i<failCurve.length;i++){const[u,c]=failCurve[i],[l,pc]=failCurve[i-1];if(e<=u)return(pc+(c-pc)*(e-l)/(u-l))/100;}return 0;};
const BB=JSON.parse(process.env.BB||'[1,1,2,2,3]');const bondBonus=b=>BB[Math.min(4,Math.floor(b/20))];const JOINT=+(process.env.JOINT??1),MATCH=+(process.env.MATCH??1),BASE=+(process.env.BASEB??1);
function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
const PRIM=['power','endurance','mental','intelligence','sense'];
const LABEL={power:'파',endurance:'지구',mental:'멘',intelligence:'지능',sense:'센'};

// Menus. p: primary gains, f: proficiency gains, e: energy, s: stress, t: training (failure check)
const OLD={batter:{batting:{p:{sense:1},f:{contact:10,eye:2},e:-18,s:6,t:1},freebatting:{p:{power:1},f:{power:10},e:-20,s:7,t:1},fielding:{p:{sense:1},f:{speed:6,field:6},e:-16,s:5,t:1}},
 pitcher:{velocity:{p:{power:1},f:{velocity:10},e:-20,s:7,t:1},control:{p:{sense:1},f:{control:10},e:-16,s:5,t:1},breaking:{p:{sense:1},f:{breaking:10},e:-18,s:6,t:1},endurance:{p:{endurance:1},f:{stamina:6,field:6},e:-16,s:5,t:1}},
 common:role=>({weights:{p:{power:5},f:{},e:-21,s:7,t:1},running:{p:{endurance:5},f:{},e:-18,s:6,t:1},tactics:{p:{intelligence:1,mental:1},f:role==='batter'?{eye:4}:{control:4},e:-8,s:3,t:0},study:{p:{intelligence:4},f:{},e:-8,s:4,t:0}})};
const variants=JSON.parse(process.env.VARIANTS||'{}');
const REST={p:{},f:{},e:28,s:-14,t:0};
const CFG=JSON.parse(process.env.CFG||'{}');
const summer=CFG.summer||{p:1.4,f:1.8}, winter=CFG.winter||{p:1.8,f:1.2}, matchBonus=CFG.matchBonus??1;

function run({role,menu,plan,seed,isOld,deck,awaken=true}){
 const R=rng(seed);
 const p={a:{power:35,endurance:35,mental:40,intelligence:45,sense:35},prof:role==='batter'?{contact:42,power:28,eye:24,speed:43,field:30}:{velocity:38,control:42,breaking:16,stamina:45,field:30},energy:80,stress:15,shift:{}};
 const cards=deck.map(spec=>({spec,bond:10}));
 const opts=Object.keys(menu);
 let fails=0,trains=0;
 const apply=(act,mult,present,main)=>{
  if(act.t){trains++; if(R()<failP(p.energy)){fails++;p.energy=clamp(p.energy+act.e-8);p.stress=clamp(p.stress+act.s+10);p.a.mental=Math.max(0,p.a.mental-2);return;}}
  const gp={...act.p};
  for(const c of present){
   const b=BASE+(c.bond>=40?JOINT:0)+bondBonus(c.bond)+(main&&main===c.spec?MATCH:0);
   gp[c.spec]=(gp[c.spec]||0)+b; c.bond=Math.min(100,c.bond+8);}
  const b0=Object.fromEntries(SEC[role].map(k=>[k,base(p.a,k)]));
  for(const[k,v]of Object.entries(gp))p.a[k]+=grow(p.a[k],v*mult.p,1,p.shift[k]||0);
  for(const[k,v]of Object.entries(act.f))p.prof[k]+=grow(p.prof[k],v*mult.f,gapM(p.prof[k],b0[k]),p.shift[k]||0);
  p.energy=clamp(p.energy+Math.round(act.e*(mult.e||1)));p.stress=clamp(p.stress+act.s);
 };
 const place=()=>{const m={};for(const c of cards){if(R()<.85){const o=opts[Math.floor(R()*opts.length)];(m[o]=m[o]||[]).push(c);}}return m;};
 let slot=0;
 const train=(mult)=>{
  const pl=place();
  if(p.energy<45){apply(mult.e?{...REST,e:35}:REST,{p:1,f:1},[],null);return;}
  const id=plan(slot++,pl,p);
  apply(menu[id],mult,pl[id]||[],isOld?null:id);
 };
 const weekend=()=>{
  if(p.stress>=55){p.a.mental+=grow(p.a.mental,2,1,p.shift.mental||0);p.energy=clamp(p.energy+12);p.stress=clamp(p.stress-40);return;}
  if(p.energy<60){p.energy=clamp(p.energy+32);p.stress=clamp(p.stress-18);return;}
  p.a.sense+=grow(p.a.sense,1,1,p.shift.sense||0);p.prof.field+=grow(p.prof.field,3,gapM(p.prof.field,base(p.a,'field')));p.energy=clamp(p.energy-12);p.stress=clamp(p.stress-8);
 };
 const game=()=>{p.a.sense+=grow(p.a.sense,2*matchBonus,1,p.shift.sense||0);p.energy=clamp(p.energy-8);p.stress=clamp(p.stress+(R()<.5?-5:5));};
 const week=g=>{train({p:1,f:1});train({p:1,f:1});if(g)game();weekend();};
 const g1=new Set([3,7,11,13,14,15]);
 for(let w=0;w<16;w++)week(g1.has(w));
 const s16=measure(p,role);
 for(let w=0;w<4;w++)week(w===1);                       // 7월
 for(let t=0;t<3;t++)train({...summer,e:1.4}); game();game(); if(awaken)awake(p,role); // 8월 합숙
 const g2=new Set([1,3,5,6,7,11]);
 for(let w=0;w<12;w++)week(g2.has(w));                   // 9~11월
 for(let t=0;t<4;t++)train({...winter,e:1.4}); if(awaken)awake(p,role); // 동계
 for(let w=0;w<4;w++)week(w===1||w===3);                 // 2월
 return {s16,year:measure(p,role),fails,trains};
}
function awake(p,role){
 const opts=role==='batter'?[['contact','sense'],['power','power'],['speed','endurance'],['field','sense']]:[['velocity','power'],['control','mental'],['breaking','sense'],['stamina','endurance']];
 const best=opts.sort((x,y)=>sec(p,y[0])-sec(p,x[0]))[0];
 p.shift[best[0]]=(p.shift[best[0]]||0)+10;if(best[1]!==best[0])p.shift[best[1]]=(p.shift[best[1]]||0)+10;
}
function measure(p,role){
 const st=Object.fromEntries(SEC[role].map(k=>[k,sec(p,k)]));
 const ab=role==='batter'?st.contact*.5+st.power*.25+st.eye*.2+st.field*.2:st.control*.5+st.velocity*.25+st.breaking*.2+st.stamina*.2;
 const avg=Object.values(st).reduce((x,y)=>x+y,0)/5;return {avg,ab,st,a:Object.fromEntries(Object.entries(p.a).map(([k,v])=>[k,Math.floor(v)])),max:Math.max(...Object.values(st)),min:Math.min(...Object.values(st))};
}
const rot=list=>i=>list[i%list.length];
const bestOf=list=>(i,pl)=>list.slice().sort((x,y)=>((pl[y]||[]).length-(pl[x]||[]).length))[0];
function strategies(role,isOld){
 if(isOld) return role==='batter'?{기술:rot(['batting','freebatting','fielding','tactics']),몸:rot(['weights','running','study','weights']),혼합:rot(['batting','weights','fielding','running','freebatting','study'])}
  :{기술:rot(['velocity','control','breaking','endurance']),몸:rot(['weights','running','study','running']),혼합:rot(['control','weights','velocity','running','breaking','study'])};
 return {몸:rot(['power','endurance','power','endurance','intelligence']),기술:rot(['sense','mental','sense','intelligence']),혼합:rot(['power','sense','endurance','mental','sense','intelligence']),
  카드따라:bestOf(['power','endurance','mental','intelligence','sense']),센스만:rot(['sense']),파워만:rot(['power'])};
}
const DECK={batter:['sense','sense','power','power','endurance','intelligence'],pitcher:['sense','power','endurance','endurance','mental','intelligence']};
function report(label,role,menu,isOld,N=300){
 const S=strategies(role,isOld);
 console.log(`\n== ${label} · ${role==='batter'?'타자':'투수'}`);
 for(const[n,plan]of Object.entries(S)){
  let v16=0,vy=0,a16=0,ay=0,mx=0,mn=0,fl=0,tr=0,A={},ST={};
  for(let i=0;i<N;i++){const r=run({role,menu,plan,seed:1000+i,isOld,deck:DECK[role]});a16+=r.s16.ab;ay+=r.year.ab;v16+=r.s16.avg;vy+=r.year.avg;mx+=r.year.max;mn+=r.year.min;fl+=r.fails;tr+=r.trains;for(const k of PRIM)A[k]=(A[k]||0)+r.year.a[k];for(const[k,v]of Object.entries(r.year.st))ST[k]=(ST[k]||0)+v;}
  const f=x=>Math.round(x/N);
  console.log(`${n.padEnd(4)} 16주 ${f(a16)}·평균${f(v16)} | 1년 ${f(ay)}·평균${f(vy)} (2차 ${Object.values(ST).map(f).join('/')}) | 1차 ${PRIM.map(k=>LABEL[k]+f(A[k])).join(' ')} | 실패 ${(fl/tr*100).toFixed(0)}%`);
 }
}
const which=process.argv[2]||'all';
for(const role of ['batter','pitcher']){
 if(which==='all'||which==='old')report('v0.7 기준',role,{...OLD[role],...OLD.common(role)},true);
 for(const v of Object.keys(variants)) if(which==='all'||which===v) report(v,role,variants[v][role],false);
}
