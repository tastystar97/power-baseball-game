import {plateDistribution} from './plate.ts';
import type {PlateContext} from './plate.ts';
import type {SkillEffect} from '../cards/schema.ts';
// The seven authoring categories plus error/HBP; transfers never treat either as an out.
const names=['strikeout','out','walk','single','double','homer','sacrifice'];
const primes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131];
function radicalInverse(n:number,base:number){let value=0,f=1/base;while(n){value+=(n%base)*f;n=Math.floor(n/base);f/=base;}return value;}
export function previewExpectation(ctx:PlateContext,tactic:string,skills:SkillEffect[][],chance:number){
 const prepared=skills.map(effects=>({relief:Math.max(0,...effects.filter(e=>e.kind==='fatigue').map(e=>e.amount)),burden:effects.filter(e=>e.kind==='burden').reduce((n,e)=>n+e.amount,0),moves:effects.filter(e=>e.kind==='probability').map(e=>({from:names.indexOf(e.from),to:names.indexOf(e.to),amount:e.amount}))}));
 const cache=new Map<number,number[]>(),base=plateDistribution({...ctx,effects:[]},tactic);
 function initial(relief:number){let value=cache.get(relief);if(!value){const p=(relief?plateDistribution({...ctx,effects:[{kind:'fatigue',amount:relief}]},tactic):base).probabilities;value=[p.strikeout,p.groundOut+p.flyOut+p.lineOut+p.doublePlay,p.walk,p.single+p.infieldSingle,p.double+p.triple,p.homer,p.sacrificeBunt+p.sacrificeFly,p.error,p.hitByPitch];cache.set(relief,value);}return value;}
 // Below 19 simultaneous skills this is the exact same independent activation mixture.
 // Unusually large imported sets use a bounded, fixed low-discrepancy integration (no game RNG).
 const estimated=skills.length>18,count=estimated?8192:2**skills.length,result=Array<number>(9).fill(0),active=Array<boolean>(skills.length).fill(false);let burden=0;
 const weights=Array.from({length:skills.length+1},(_,n)=>chance**n*(1-chance)**(skills.length-n));
 for(let sample=0;sample<count;sample++){
  let relief=0,reduction=0,activated=0;
  for(let j=0;j<skills.length;j++){active[j]=estimated?radicalInverse(sample+1,primes[j%primes.length])<chance:!!(sample&2**j);if(active[j]){activated++;relief=Math.max(relief,prepared[j].relief);reduction+=prepared[j].burden;}}
  const weight=estimated?1/count:weights[activated],p=initial(relief).slice();
  for(let j=0;j<skills.length;j++)if(active[j])for(const e of prepared[j].moves){if(!p[e.from]||!p[e.to])continue;const transfer=Math.min(p[e.from],e.amount);p[e.from]-=transfer;p[e.to]+=transfer;}
  for(let j=0;j<p.length;j++)result[j]+=p[j]*weight;
  burden+=Math.max(ctx.playerPitcher?1:0,base.burden-reduction)*weight;
 }
 const success=tactic==='bunt'?result[6]:ctx.playerBatter?result[2]+result[3]+result[4]+result[5]+result[7]+result[8]:result[0]+result[1]+result[6];
 return {probabilities:[result[0],result[1],result[2]+result[8],result[3],result[4],result[5],result[6],result[7]],burden,success,disabled:base.disabled,estimated};
}
