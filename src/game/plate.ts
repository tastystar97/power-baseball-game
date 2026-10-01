import type {MatchPlayer} from './roster.ts';
import type {SkillEffect} from '../cards/schema.ts';
import {matchRules as rules} from '../content/match-rules.ts';
export const outcomes=['strikeout','walk','hitByPitch','groundOut','flyOut','lineOut','doublePlay','sacrificeFly','sacrificeBunt','infieldSingle','single','double','triple','homer','error'] as const;
export type PlateOutcome=typeof outcomes[number];
export type Ball='ground'|'line'|'fly';
export type Direction='left'|'center'|'right';
export interface BaseRunner {id:string;name:string;owner:'player'|'team'|'opponent';speed:number;responsible:string|null;}
export interface RunnerMove {runner:BaseRunner;from:0|1|2|3;to:1|2|3|4|'out';}
export interface PlateContext {
 batter:MatchPlayer;pitcher:MatchPlayer;fielders:MatchPlayer[];inning:number;half:0|1;order:number;outs:number;
 bases:[BaseRunner|null,BaseRunner|null,BaseRunner|null];score:[number,number];energy:number;load:number;
 playerBatter:boolean;playerPitcher:boolean;source:'manual'|'auto';effects:SkillEffect[];
}
export interface PlatePath {outcome:PlateOutcome;ball:Ball|null;direction:Direction|null;fielder:{id:string;name:string;position:string}|null;probability:number;}
export interface Distribution {paths:PlatePath[];probabilities:Record<PlateOutcome,number>;disabled:boolean;burden:number;}
export interface PlayEvent extends Omit<PlatePath,'probability'|'outcome'> {
 outcome:PlateOutcome|'stolenBase'|'caughtStealing';
 kind:'plate'|'steal';inning:number;half:0|1;order:number;batter:{id:string;name:string};pitcher:{id:string;name:string};
 playerBatter:boolean;playerPitcher:boolean;tactic:string;source:'manual'|'auto';burden:number;
 moves:RunnerMove[];outs:number;runs:number;rbi:number;before:{outs:number;bases:PlateContext['bases'];score:[number,number]};
 after:{outs:number;bases:PlateContext['bases'];score:[number,number]};
}
export const outcomeNames:Record<PlateOutcome,string>={strikeout:'삼진',walk:'볼넷',hitByPitch:'사구',groundOut:'땅볼 아웃',flyOut:'뜬공 아웃',lineOut:'직선타 아웃',doublePlay:'병살',sacrificeFly:'희생플라이',sacrificeBunt:'희생번트',infieldSingle:'내야안타',single:'안타',double:'2루타',triple:'3루타',homer:'홈런',error:'실책 출루'};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const directions:Direction[]=['left','center','right'];
const groups:Record<string,PlateOutcome[]>={strikeout:['strikeout'],out:['groundOut','flyOut','lineOut','doublePlay'],walk:['walk'],single:['single','infieldSingle'],double:['double','triple'],homer:['homer'],sacrifice:['sacrificeBunt','sacrificeFly']};
const burdens:Record<string,number>={contact:0,power:0,patient:0,bunt:0,fastball:4.1,breaking:4.3,control:3.4,chase:4.5};
function fielderFor(ctx:PlateContext,ball:Ball,direction:Direction):MatchPlayer{
 const pos=ball==='fly'||ball==='line'?{left:'LF',center:'CF',right:'RF'}[direction]:{left:'SS',center:'2B',right:'1B'}[direction];
 return ctx.fielders.find(p=>p.position===pos)??ctx.fielders[0]??ctx.pitcher;
}
/** The joint tree is also the preview: stage 1 → contact type → direction/defense → runners. */
export function plateDistribution(ctx:PlateContext,tactic:string):Distribution {
 const b=ctx.batter.ratings,p=ctx.pitcher.ratings;
 const relief=Math.max(0,...ctx.effects.filter(e=>e.kind==='fatigue').map(e=>e.amount));
 const fatigue=ctx.energy<45?.035*(1-relief):0;
 const wear=Math.max(0,ctx.load-(70+p.stamina*.55))*.0015;
 const mental=(b.mental-p.mental)*.0003;
 let k=clamp(.205+(p.velocity-b.contact)*.0015+(p.breaking-b.eye)*.0006-mental-wear+(ctx.playerBatter?fatigue:-fatigue),.06,.43);
 let walk=clamp(rules.walkBase+(b.eye-p.control)*.0011+wear+(ctx.playerPitcher?fatigue:0),.02,.20);
 const hbp=clamp(.006+(50-p.control)*.00008,.002,.012);
 let ground=.46+(b.contact-b.power)*.001, line=.20+(b.contact-50)*.0005;
 let hitBonus=(b.contact-p.control)*.0007+mental+wear+(ctx.playerPitcher?fatigue:ctx.playerBatter?-fatigue:0);
 let homerBonus=(b.power-50)*.0008;
 switch(tactic){
 case 'contact':k-=.025;ground+=.03;line+=.015;hitBonus+=.008;homerBonus-=.007;break;
 case 'power':k+=.075;ground-=.11;line-=.025;hitBonus-=.02;homerBonus+=.065;break;
 case 'patient':k+=.025;walk+=.05+(b.eye-p.control)*.0005;hitBonus-=.018;break;
 case 'fastball':k+=.04+(p.velocity-50)*.0004;ground-=.05;homerBonus+=.014;break;
 case 'breaking':k+=.055+(p.breaking-50)*.0004;walk+=.015;ground+=.07;hitBonus-=.015;homerBonus-=.015;break;
 case 'control':k-=.045;walk-=.025;ground+=.065;hitBonus+=.008;break;
 case 'chase':k+=.065;walk+=.07+(b.eye-p.control)*.0004;hitBonus-=.045;homerBonus-=.025;break;
 }
 k=clamp(k,.025,.55);walk=clamp(walk,.015,.3);ground=clamp(ground,.2,.7);line=clamp(line,.10,.32);
 const paths:PlatePath[]=[];
 const add=(outcome:PlateOutcome,probability:number,ball:Ball|null=null,direction:Direction|null=null,fielder:MatchPlayer|null=null)=>{if(probability>0)paths.push({outcome,probability,ball,direction,fielder:fielder?{id:fielder.id,name:fielder.name,position:fielder.position}:null});};
 const disabled=tactic==='bunt'&&(ctx.outs>=2||!ctx.bases.some(Boolean));
 if(tactic==='bunt'&&!disabled){
  const success=clamp(.62+(b.contact+b.speed-100)*.002+(ctx.batter.traits.includes('bunt')?.1:0)-fatigue,.35,.90);
  add('strikeout',.10);add('sacrificeBunt',success,'ground','center',ctx.pitcher);add('infieldSingle',.035,'ground','left',ctx.pitcher);add('groundOut',.865-success,'ground','center',ctx.pitcher);
 }else{
  add('strikeout',k);add('walk',walk);add('hitByPitch',hbp);
  for(const ball of ['ground','line','fly'] as const)for(const direction of directions){
   const f=fielderFor(ctx,ball,direction),defense=(f.ratings.field-50)*.0007;
   const ballWeight=ball==='ground'?ground:ball==='line'?line:1-ground-line;
   const dirWeight=direction==='center'?.36:direction===(ctx.batter.bats==='R'?'left':'right')?.36:.28;
   const weight=(1-k-walk-hbp)*ballWeight*dirWeight;
   const error=clamp(.020-defense*.3,.004,.04);
   const hit=clamp((ball==='ground'?rules.groundHit:ball==='line'?rules.lineHit:rules.flyHit)+hitBonus-defense,.03,.82);
   const hr=ball==='fly'?clamp(rules.flyHomer+homerBonus,.008,.2):0;
   const double=hit*(ball==='ground'?.05:ball==='line'?.28:.55);
   const triple=ball==='ground'?0:hit*clamp(.025+(b.speed-50)*.0007,.005,.07);
   const infield=ball==='ground'?hit*clamp(.1+(b.speed-40)*.005,.03,.4):0;
   const out=1-hit-hr-error;
   const dp=ball==='ground'&&ctx.bases[0]&&ctx.outs<2?out*clamp(.30+(f.ratings.field-b.speed)*.002,.1,.5):0;
   const sf=ball==='fly'&&ctx.bases[2]&&ctx.outs<2?out*clamp(.4+ctx.bases[2].speed*.004-f.ratings.field*.001,.3,.8):0;
   const push=(o:PlateOutcome,n:number)=>add(o,n*weight,ball,direction,f);
   push('error',error);push('homer',hr);push('double',double);push('triple',triple);push('infieldSingle',infield);push('single',hit-double-triple-infield);
   push('doublePlay',dp);push('sacrificeFly',sf);push(ball==='ground'?'groundOut':ball==='line'?'lineOut':'flyOut',out-dp-sf);
  }
 }
 for(const effect of ctx.effects){
  if(effect.kind!=='probability')continue;
  const from=paths.filter(p=>groups[effect.from].includes(p.outcome)),to=paths.filter(p=>groups[effect.to].includes(p.outcome));
  const total=from.reduce((a,p)=>a+p.probability,0),target=to.reduce((a,p)=>a+p.probability,0);
  if(!total||!target)continue; // Never manufacture an impossible sacrifice in an empty-base situation.
  const transfer=Math.min(total,effect.amount);
  for(const p of from)p.probability*=1-transfer/total;
  for(const p of to)p.probability+=transfer*p.probability/target;
 }
 const probabilities=Object.fromEntries(outcomes.map(k=>[k,0])) as Record<PlateOutcome,number>;
 for(const p of paths)probabilities[p.outcome]+=p.probability;
 const burden=Math.max(ctx.playerPitcher?1:0,(burdens[tactic]??3.8)-ctx.effects.filter(e=>e.kind==='burden').reduce((a,e)=>a+e.amount,0));
 return {paths,probabilities,disabled,burden};
}
function pick<T>(items:T[],weight:(item:T)=>number,rng:()=>number):T {
 let roll=rng()*items.reduce((sum,item)=>sum+weight(item),0);
 for(const item of items){roll-=weight(item);if(roll<0)return item;}return items[items.length-1];
}
export function resolvePlate(ctx:PlateContext,tactic:string,rng:()=>number,distribution=plateDistribution(ctx,tactic)):PlayEvent {
 if(distribution.disabled)throw Error('이 상황에서는 번트할 수 없습니다.');
 let paths=distribution.paths;
 // Conditional draws preserve the exact joint distribution even after card probability transfers.
 for(const key of ['ball','direction'] as const){
  const values=[...new Set(paths.map(p=>p[key]))];
  const value=pick(values,v=>paths.filter(p=>p[key]===v).reduce((a,p)=>a+p.probability,0),rng);
  paths=paths.filter(p=>p[key]===value);
 }
 const path=pick(paths,p=>p.probability,rng);
 return createPlay(ctx,tactic,path,rng,distribution.burden);
}
/** Final stage records explicit movements. Applying and drawing this event never rolls again. */
export function createPlay(ctx:PlateContext,tactic:string,path:Omit<PlatePath,'probability'>,rng:()=>number,burden=0):PlayEvent {
 const before={outs:ctx.outs,bases:structuredClone(ctx.bases),score:[...ctx.score] as [number,number]};
 const after=structuredClone(before),moves:RunnerMove[]=[];
 const runner:BaseRunner={id:ctx.batter.id,name:ctx.batter.name,speed:ctx.batter.ratings.speed,owner:ctx.playerBatter||ctx.playerPitcher?'player':ctx.half===0?'opponent':'team',responsible:ctx.pitcher.id};
 const o=path.outcome;
 const move=(r:BaseRunner,from:0|1|2|3,to:1|2|3|4|'out')=>{
  if(after.outs>=3)return;
  if(o!=='homer'&&ctx.inning>=9&&ctx.half===1&&after.score[1]>after.score[0])return;
  if(from)after.bases[from-1]=null;
  if(to==='out')after.outs++;
  else if(to===4)after.score[ctx.half]++;
  else after.bases[to-1]=r;
  moves.push({runner:r,from,to});
 };
 if(o==='walk'||o==='hitByPitch'){
  if(ctx.bases[0]){if(ctx.bases[1]){if(ctx.bases[2])move(ctx.bases[2],3,4);move(ctx.bases[1],2,3);}move(ctx.bases[0],1,2);}move(runner,0,1);
 }else if(o==='doublePlay'){
  if(ctx.bases[0])move(ctx.bases[0],1,'out');move(runner,0,'out');
  if(after.outs<3){if(ctx.bases[2])move(ctx.bases[2],3,4);if(ctx.bases[1])move(ctx.bases[1],2,3);}
 }else if(o==='sacrificeFly'||o==='sacrificeBunt'){
  move(runner,0,'out');
  if(ctx.bases[2])move(ctx.bases[2],3,4);
  if(o==='sacrificeBunt'){if(ctx.bases[1])move(ctx.bases[1],2,3);if(ctx.bases[0])move(ctx.bases[0],1,2);}
 }else if(['single','infieldSingle','double','triple','homer','error'].includes(o)){
  const step=o==='homer'?4:o==='triple'?3:o==='double'?2:1;
  for(let i=2;i>=0;i--){const r=ctx.bases[i];if(!r)continue;let to=Math.min(4,i+1+step) as 1|2|3|4;
   if(o==='single'&&i===1){const attempt=rng()<.45+r.speed*.004;if(attempt){if(rng()<.09){move(r,2,'out');continue;}to=4;}}
   if(o==='single'&&i===0&&!after.bases[2]&&rng()<.1+r.speed*.003)to=3;
   if(o==='double'&&i===0&&rng()<rules.doubleHomeBase+r.speed*rules.doubleHomeSpeed)to=4;
   move(r,(i+1) as 1|2|3,to);
  }
  move(runner,0,step as 1|2|3|4);
 }else {move(runner,0,'out');if(o==='groundOut'&&after.outs<3&&rng()<rules.groundAdvance){if(ctx.bases[2])move(ctx.bases[2],3,4);if(ctx.bases[1])move(ctx.bases[1],2,3);}}
 const runs=after.score[ctx.half]-before.score[ctx.half];
 return {outcome:path.outcome,ball:path.ball,direction:path.direction,fielder:path.fielder,kind:'plate',inning:ctx.inning,half:ctx.half,order:ctx.order,batter:{id:ctx.batter.id,name:ctx.batter.name},pitcher:{id:ctx.pitcher.id,name:ctx.pitcher.name},playerBatter:ctx.playerBatter,playerPitcher:ctx.playerPitcher,tactic,source:ctx.source,burden,moves,outs:after.outs-before.outs,runs,rbi:o==='error'||o==='doublePlay'?0:runs,before,after};
}
