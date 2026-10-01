// Actual 16-week runtime; includes encounters, full matches, support bonds and weekend costs.
// PowerShell: $env:N='30'; node --experimental-strip-types docs/superpowers/sims/2026-10-01-stage1-runtime.mjs
import {createGame,transition} from '../../../src/game/engine.ts';
import {overall} from '../../../src/game/abilities.ts';
import {defaultSupports} from '../../../src/content/supports.ts';
import {evaluateSelection} from '../../../src/game/competition.ts';
import {WEEKEND_MULTIPLIERS} from '../../../src/content/activities.ts';
const N=Number(process.env.N||30),policies=(process.env.POLICIES||'mixed,practice,partner,body,technical').split(',');
const rotate={mixed:['power','sense','endurance','mental','sense','intelligence'],body:['power','endurance','power','endurance','intelligence'],technical:['sense','mental','sense','intelligence']};
if(process.env.PRACTICE)WEEKEND_MULTIPLIERS.practice=Number(process.env.PRACTICE);
if(process.env.PARTNER)WEEKEND_MULTIPLIERS.partner=Number(process.env.PARTNER);
for(const role of ['batter','pitcher'])for(const policy of policies){
 const rows=[];
 for(let seed=2000;seed<2000+N;seed++){
  let s=createGame('측정',role,seed,undefined,defaultSupports(role)),slot=0,steps=0,weekendCount=0;
  while(s.phase!=='complete'&&steps++<500){
   let a;
   if(s.phase==='weekday')a={type:'activity',id:s.energy<45?'rest':`train_${(rotate[policy]||rotate.mixed)[slot++%(rotate[policy]||rotate.mixed).length]}`};
   else if(s.phase==='weekend'){
    const partner=s.supports.find(id=>(id==='rival'?s.rival:id==='catcher'?s.catcher:s.bonds[id])>=40);
    const id=s.stress>=55?'outing':s.energy<60?'weekend_rest':policy==='partner'&&partner?'partner':policy==='practice'?'practice':'catch';
    a={type:'activity',id,target:`primary_${rotate.mixed[weekendCount++%rotate.mixed.length]}`,partner};
   }else if(s.phase==='supportEvent')a={type:'choice',index:0};
   else if(s.phase==='roleEvent')a={type:'choice',id:'stay'};
   else if(s.phase==='match'&&s.match.awaiting)a={type:'delegate'};
   else a={type:'continue'};
   const next=transition(s,{...a,revision:s.revision});if(next===s)throw Error(`stuck ${s.phase}`);s=next;
  }
  if(s.phase!=='complete')throw Error('season did not finish');
  const score=evaluateSelection(s);
  rows.push({primary:Object.values(s.attributes).reduce((a,b)=>a+b)/5,overall:overall(s),ability:score.ability,total:score.total,failures:s.log.reduce((sum,l)=>sum+(l.summary?.failures??(l.training?.outcome==='failure'?1:0)),0)});
 }
 const means=Object.fromEntries(Object.keys(rows[0]).map(k=>[k,+(rows.reduce((sum,r)=>sum+r[k],0)/N).toFixed(2)]));
 console.log(JSON.stringify({role,policy,N,...means,weekend:{...WEEKEND_MULTIPLIERS}}));
}
