// 3-year simulation with primary attributes on a 0-1500 scale.
// Primary -> 0-100 contribution via conv(s) = 100*(s/1500)^P, then the existing 2nd-ability formulas.
const env=k=>process.env[k];
const K=+(env('K')||12);            // primary gain multiplier from the 0-100 menu values
const P=+(env('P')||0.55);          // conversion exponent
const PCURVE=JSON.parse(env('PCURVE')||'[[1300,0.25],[1100,0.45],[800,0.7]]');
const FCURVE=JSON.parse(env('FCURVE')||'[[90,0.06],[80,0.12],[70,0.22],[60,0.4]]');
const FK=+(env('FK')||1);
const SB=+(env('SB')||1);
const CAPS=JSON.parse(env('CAPS')||'[1500,1500,1500]');let YEAR=0;           // proficiency multiplier
const clamp=(v,hi=100)=>Math.max(0,Math.min(hi,v));
const conv=s=>100*Math.pow(Math.max(0,s)/1500,P);
const W={contact:{sense:.5,mental:.3,intelligence:.2},power:{power:.7,sense:.3},eye:{intelligence:.5,mental:.5},speed:{endurance:.4,power:.3,sense:.3},
 velocity:{power:.6,sense:.2,endurance:.2},control:{sense:.4,mental:.4,intelligence:.2},breaking:{sense:.4,intelligence:.4,power:.2},stamina:{endurance:.7,mental:.3},field:{sense:.4,intelligence:.3,endurance:.3}};
const SEC={batter:['contact','power','eye','speed','field'],pitcher:['velocity','control','breaking','stamina','field']};
const effMentalC=(m,st)=>Math.max(0,conv(m)-Math.max(0,st-50)*.3);
const base=(a,k,st=0)=>Object.entries(W[k]).reduce((t,[s,w])=>t+(s==='mental'?effMentalC(a.mental,st):conv(a[s]))*w,0);
const sec=(p,k)=>clamp(Math.round(base(p.a,k,p.stress)*.6+Math.floor(p.prof[k])*.4));
const cur=(c,v)=>{for(const[t,m]of c)if(v>=t)return m;return 1;};
const growP=(v,raw)=>raw<=0?0:Math.max(0,Math.min(CAPS[YEAR]-v,raw*cur(PCURVE,v)));
const growF=(v,raw,m)=>raw<=0?0:Math.min(100-v,raw*cur(FCURVE,v)*m);
const gapM=(v,b)=>v-b>20?.25:v-b>10?.5:1;
const failCurve=[[0,95],[10,80],[20,60],[30,40],[40,25],[50,15],[60,5],[70,0],[100,0]];
const failP=e=>{for(let i=1;i<failCurve.length;i++){const[u,c]=failCurve[i],[l,pc]=failCurve[i-1];if(e<=u)return(pc+(c-pc)*(e-l)/(u-l))/100;}return 0;};
function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
const PRIM=['power','endurance','mental','intelligence','sense'];
const MENU={
 batter:{power:{p:{power:4},f:{power:3},e:-20,s:7,t:1},endurance:{p:{endurance:4},f:{speed:3},e:-18,s:6,t:1},sense:{p:{sense:2},f:{contact:7,field:3},e:-18,s:6,t:1},mental:{p:{mental:2},f:{eye:5},e:-10,s:-3,t:0},intelligence:{p:{intelligence:3},f:{eye:2,field:3},e:-8,s:3,t:0}},
 pitcher:{power:{p:{power:4},f:{velocity:3},e:-20,s:7,t:1},endurance:{p:{endurance:4},f:{stamina:3},e:-18,s:6,t:1},sense:{p:{sense:2},f:{control:4,breaking:4,field:2},e:-18,s:6,t:1},mental:{p:{mental:2},f:{control:5},e:-10,s:-3,t:0},intelligence:{p:{intelligence:3},f:{breaking:5},e:-8,s:3,t:0}}};
const START=JSON.parse(env('START')||'{"power":230,"endurance":230,"mental":260,"intelligence":290,"sense":230}');
const SUMMER={p:1.2,f:1.5},WINTER={p:1.5,f:1.1};
function run(role,plan,seed,years){
 const R=rng(seed),menu=MENU[role],opts=Object.keys(menu);
 const p={a:{...START},prof:role==='batter'?{contact:42,power:28,eye:24,speed:43,field:30}:{velocity:38,control:42,breaking:16,stamina:45,field:30},energy:80,stress:15};
 const cards=(role==='batter'?['sense','sense','power','power','endurance','intelligence']:['sense','power','endurance','endurance','mental','intelligence']).map(spec=>({spec,bond:10}));
 let slot=0;const out=[];
 const apply=(act,mult,present,main)=>{
  if(act.t&&R()<failP(p.energy)){p.energy=clamp(p.energy+act.e-8);p.stress=clamp(p.stress+act.s+10);p.a.mental=Math.max(0,p.a.mental-2*K);return;}
  const gp={};for(const[k,v]of Object.entries(act.p))gp[k]=v*K;
  for(const c of present){const b=1+(main===c.spec?1:0)+(c.bond>=60?1:0);gp[c.spec]=(gp[c.spec]||0)+b*K*SB;c.bond=Math.min(100,c.bond+8);}
  const b0=Object.fromEntries(SEC[role].map(k=>[k,base(p.a,k)]));
  for(const[k,v]of Object.entries(gp))p.a[k]+=growP(p.a[k],v*mult.p);
  for(const[k,v]of Object.entries(act.f))p.prof[k]+=growF(p.prof[k],v*mult.f*FK,gapM(p.prof[k],b0[k]));
  p.energy=clamp(p.energy+Math.round(act.e*(mult.e||1)));p.stress=clamp(p.stress+act.s);
 };
 const place=()=>{const m={};for(const c of cards){if(R()<.85){const o=opts[Math.floor(R()*opts.length)];(m[o]=m[o]||[]).push(c);}}return m;};
 const train=mult=>{const pl=place();if(p.energy<45){p.energy=clamp(p.energy+(mult.e?35:28));p.stress=clamp(p.stress-14);return;}const id=plan(slot++,pl);apply(menu[id],mult,pl[id]||[],id);};
 const weekend=()=>{if(p.stress>=55){p.a.mental+=growP(p.a.mental,2*K);p.energy=clamp(p.energy+12);p.stress=clamp(p.stress-40);return;}
  if(p.energy<60){p.energy=clamp(p.energy+32);p.stress=clamp(p.stress-18);return;}
  p.a.sense+=growP(p.a.sense,1*K);p.prof.field+=growF(p.prof.field,3*FK,gapM(p.prof.field,base(p.a,'field')));p.energy=clamp(p.energy-12);p.stress=clamp(p.stress-8);};
 const game=()=>{p.a.sense+=growP(p.a.sense,1*K);p.energy=clamp(p.energy-8);p.stress=clamp(p.stress+(R()<.5?-5:5));};
 const week=g=>{train({p:1,f:1});train({p:1,f:1});if(g)game();weekend();};
 for(let y=0;y<years;y++){YEAR=y;
  const g1=new Set([3,7,11,13,14,15]);for(let w=0;w<16;w++)week(g1.has(w));
  if(y===0)out.push(measure(p,role,'1학년 6월'));
  for(let w=0;w<4;w++)week(w===1);
  for(let t=0;t<3;t++)train({...SUMMER,e:1.4});game();game();
  const g2=new Set([1,3,5,6,7,11]);for(let w=0;w<12;w++)week(g2.has(w));
  for(let t=0;t<4;t++)train({...WINTER,e:1.4});
  for(let w=0;w<4;w++)week(w===1||w===3);
  out.push(measure(p,role,`${y+1}학년 끝`));
 }
 return out;
}
function measure(p,role,label){
 const st=Object.fromEntries(SEC[role].map(k=>[k,sec(p,k)]));
 const ovr=Object.values(st).reduce((a,b)=>a+b,0)/5;
 const ab=role==='batter'?st.contact*.5+st.power*.25+st.eye*.2+st.field*.2:st.control*.5+st.velocity*.25+st.breaking*.2+st.stamina*.2;
 const pavg=PRIM.reduce((t,k)=>t+p.a[k],0)/5;
 return {label,ovr,ab,pavg,pmax:Math.max(...PRIM.map(k=>p.a[k])),a:{...p.a}};
}
const rot=l=>i=>l[i%l.length];
const bestOf=l=>(i,pl)=>l.slice().sort((x,y)=>((pl[y]||[]).length-(pl[x]||[]).length))[0];
const STRATS={혼합:rot(['power','sense','endurance','mental','sense','intelligence']),카드따라:bestOf(PRIM),몸:rot(['power','endurance','power','endurance','intelligence']),기술:rot(['sense','mental','sense','intelligence']),파워만:rot(['power'])};
const N=+(env('N')||200);
console.log(`start 1차 평균 ${PRIM.reduce((t,k)=>t+START[k],0)/5}, conv(250)=${conv(250).toFixed(1)} conv(750)=${conv(750).toFixed(1)} conv(1150)=${conv(1150).toFixed(1)} conv(1350)=${conv(1350).toFixed(1)}`);
for(const role of ['batter','pitcher']){
 console.log(`== ${role==='batter'?'타자':'투수'}`);
 for(const[n,plan]of Object.entries(STRATS)){
  const acc=[];for(let i=0;i<N;i++){run(role,plan,2000+i,3).forEach((m,j)=>{acc[j]=acc[j]||{label:m.label,ovr:0,ab:0,pavg:0,pmax:0};acc[j].ovr+=m.ovr;acc[j].ab+=m.ab;acc[j].pavg+=m.pavg;acc[j].pmax+=m.pmax;});}
  console.log(n.padEnd(4)+' '+acc.map(m=>`${m.label}: 1차 ${Math.round(m.pavg/N)}(최고 ${Math.round(m.pmax/N)}) OVR ${Math.round(m.ovr/N)} 선발 ${Math.round(m.ab/N)}`).join(' | '));
 }
}
