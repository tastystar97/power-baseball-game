// Real character creation and 16-week engine, including matches and support events.
// node --experimental-strip-types docs/superpowers/sims/2026-10-01-stage2-runtime.mjs
// N controls samples per role/grade (default 30). No seeds, dice or growth are rewritten.
import {newCreation,creationTransition,createPlayer} from '../../../src/game/creation.ts';
import {rollTalent,fateRoll} from '../../../src/game/character.ts';
import {transition} from '../../../src/game/engine.ts';
import {overall} from '../../../src/game/abilities.ts';
import {evaluateSelection} from '../../../src/game/competition.ts';
import {catalogFromPacks} from '../../../src/cards/catalog.ts';
import {builtinPack} from '../../../src/cards/builtin.ts';
import {parseSave} from '../../../src/persistence/save.ts';
const content=catalogFromPacks([builtinPack]),N=Number(process.env.N||30);
const background={origin:'regular',body:'ordinary',personality:'calm',specialties:[],weaknesses:[],sportFocus:null};
const rotate=['power','sense','endurance','mental','sense','intelligence'];
function create(seed,role){
 let d=newCreation(content,seed);
 const act=a=>{d=creationTransition(d,{...a,revision:d.revision});};
 for(const a of [{type:'identity',name:'측정',role},{type:'next'},{type:'background',background},{type:'next'},{type:'talent'},{type:'next'},{type:'fate'},{type:'next'},{type:'scout'},{type:'revealAll'},{type:'next'}])act(a);
 act({type:'deck',ids:d.poolIds.slice(0,6)});act({type:'next'});
 return parseSave(JSON.stringify(createPlayer(d)));
}
const frequency={D:0,C:0,B:0,A:0,S:0};
for(let seed=1;seed<=100000;seed++)frequency[rollTalent(seed,0).grade]++;
console.log(JSON.stringify({samples:100000,frequency}));
for(const role of ['batter','pitcher'])for(const grade of ['D','S']){
 const rows=[];
 for(let seed=1;rows.length<N;seed++){
  // Isolate grade from hidden talents. Background is identical; scouting remains real.
  if(rollTalent(seed,0).grade!==grade||fateRoll(seed,role).hidden)continue;
  let s=create(seed,role),slot=0,steps=0,weekends=0,june=null;
  while(s.phase!=='complete'&&steps++<500){
   let a;
   if(s.phase==='selection'&&s.month===6)june=evaluateSelection(s);
   if(s.phase==='weekday')a={type:'activity',id:s.energy<45?'rest':`train_${rotate[slot++%rotate.length]}`};
   else if(s.phase==='weekend')a={type:'activity',id:s.stress>=55?'outing':s.energy<60?'weekend_rest':'catch',target:`primary_${rotate[weekends++%rotate.length]}`};
   else if(s.phase==='supportEvent')a={type:'choice',index:0};
   else if(s.phase==='roleEvent')a={type:'choice',id:'stay'};
   else if(s.phase==='match'&&s.match.awaiting)a={type:'delegate'};
   else a={type:'continue'};
   const next=transition(s,{...a,revision:s.revision});if(next===s)throw Error(`stuck ${s.phase}`);s=next;
  }
  if(s.phase!=='complete'||!june)throw Error('June season did not finish');
  parseSave(JSON.stringify(s));
  const score=evaluateSelection(s);
  rows.push({seed,primary:Object.values(s.attributes).reduce((a,b)=>a+b)/5,overall:overall(s),ability:score.ability,total:score.total,juneAbility:june.ability,juneTotal:june.total});
 }
 const means=Object.fromEntries(Object.keys(rows[0]).filter(k=>k!=='seed').map(k=>[k,+(rows.reduce((sum,r)=>sum+r[k],0)/N).toFixed(2)]));
 console.log(JSON.stringify({role,grade,N,firstSeed:rows[0].seed,lastSeed:rows.at(-1).seed,...means,abilityRange:[Math.min(...rows.map(r=>r.ability)),Math.max(...rows.map(r=>r.ability))]}));
}
