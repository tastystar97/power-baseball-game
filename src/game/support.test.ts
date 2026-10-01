import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition,previewActivity} from './engine.ts';
import {weeklyPlacements} from './support.ts';
import {bond,defaultSupports} from '../content/supports.ts';
import {skillCost} from '../content/skills.ts';
import type {Action,GameState,Role} from './types.ts';
import {parseSave} from '../persistence/save.ts';

const act=(s:GameState,a:Omit<Action,'revision'>)=>transition(s,{...a,revision:s.revision});
function ready(role:Role='batter') {return act(createGame('봄',role,71),{type:'lineup',supports:defaultSupports(role)});}
function auto(s:GameState) {
  if(s.phase==='lineup')return act(s,{type:'lineup',supports:defaultSupports(s.role)});
  if(s.phase==='weekday')return act(s,{type:'activity',id:s.role==='batter'?'train_sense':'train_sense'});
  if(s.phase==='weekend')return act(s,{type:'activity',id:'catch'});
  if(['event','weekendEvent','supportEvent'].includes(s.phase))return act(s,{type:'choice',index:0});
  if(s.phase==='roleEvent')return act(s,{type:'choice',id:'stay'});
  if(s.phase==='match'&&s.match!.awaiting)return act(s,{type:'tactic',id:s.role==='batter'?'contact':'control'});
  return act(s,{type:'continue'});
}
test('six unique support people are required before starting; lineup costs no activity',()=>{
  const s=createGame('봄','batter',1);
  assert.equal(s.phase,'lineup');
  assert.equal(act(s,{type:'lineup',supports:['catcher','catcher','rival']}),s);
  assert.equal(act(s,{type:'activity',id:'train_sense'}),s);
  const n=act(s,{type:'lineup',supports:['bat_senior','manager','classmate','pitch_senior','rival','catcher']});
  assert.equal(n.phase,'weekday');assert.equal(n.energy,s.energy);assert.equal(n.schedule[0].weekday,'');
});
test('the initial deck stays fixed before and after the first activity',()=>{
 let s=ready();assert.equal(act(s,{type:'editLineup'}),s);
 s=act(s,{type:'activity',id:'train_sense'});assert.equal(act(s,{type:'editLineup'}),s);assert.equal(s.supports.length,6);
});

test('support specialties affect primary abilities, never proficiency, using pre-action bond tiers',()=>{
 for(const [value,bonus,total] of [[0,0,5],[39,0,5],[40,0,5],[59,0,5],[60,5,10],[79,5,10],[80,5,10],[100,5,10]]){
  const s=ready('pitcher');s.placements={catcher:'train_sense'};s.catcher=value;
  const p=previewActivity(s,'train_sense')!;
  assert.equal(p.proficiency.control,40);assert.equal(p.gains.mental,total);
  assert.equal(p.bondBonuses[0].amount,bonus);assert.equal(p.bondBonuses[0].stat,'primary_mental');
  const n=act(s,{type:'activity',id:'train_sense'});
  assert.equal(n.attributes.mental-s.attributes.mental,total);assert.equal(n.catcher,Math.min(100,value+8));
 }
});

test('different specialties stack once and are independent of lineup ordering',()=>{
 const s=ready();s.supports=['bat_senior','catcher','classmate','pitch_senior','rival','manager'];s.placements={bat_senior:'train_sense',catcher:'train_sense',classmate:'train_sense'};
 s.bonds.bat_senior=80;s.catcher=40;s.bonds.classmate=40;
 const p=previewActivity(s,'train_sense')!;
 assert.deepEqual(p.gains,{sense:32,mental:5,intelligence:5});assert.deepEqual(p.proficiency,{contact:70,field:30});
 assert.deepEqual(previewActivity({...s,supports:[...s.supports].reverse()},'train_sense')!.gains,p.gains);
 const n=act(s,{type:'activity',id:'train_sense'});
 assert.equal(n.attributes.sense,262);assert.equal(n.proficiency.contact,490);assert.equal(n.bonds.bat_senior,88);
 assert.match(n.notice,/센스/);assert.doesNotMatch(n.notice,/숙련/);
});

test('bond growth is capped by primary level, but stress cannot halve learning',()=>{
 const s=ready();s.placements={bat_senior:'train_sense'};s.bonds.bat_senior=80;
 const p=previewActivity(s,'train_sense')!;s.stress=100;
 assert.deepEqual(previewActivity(s,'train_sense')!.gains,p.gains);
 assert.deepEqual(previewActivity(s,'train_sense')!.proficiency,p.proficiency);
 s.attributes.sense=999;const capped=previewActivity(s,'train_sense')!;
 assert.equal(capped.gains.sense,1);assert.equal(capped.bondBonuses[0].amount,0);
 s.attributes.sense=1000;assert.equal(previewActivity(s,'train_sense')!.gains.sense,0);
});

test('rest has no growth or points even with partners; failed training preserves only friendship',()=>{
 const s=ready('pitcher');s.supports=['catcher','classmate','manager','bat_senior','pitch_senior','rival'];s.catcher=80;s.bonds.classmate=80;s.bonds.manager=80;
 s.placements={catcher:'rest',classmate:'rest',manager:'rest'};
 const rest=previewActivity(s,'rest')!;assert.deepEqual(rest.gains,{});assert.equal(rest.points,0);assert.deepEqual(rest.bondBonuses,[]);
 s.placements={catcher:'train_intelligence'};assert.equal(previewActivity(s,'train_intelligence')!.gains.mental,10);
 s.placements={catcher:'train_sense',classmate:'train_sense',manager:'train_sense'};s.energy=40;s.rng=1;
 const n=act(s,{type:'activity',id:'train_sense'});
 assert.deepEqual(n.proficiency,s.proficiency);assert.equal(n.attributes.intelligence,s.attributes.intelligence);
 assert.equal(n.attributes.mental,s.attributes.mental-17);assert.equal(n.skillPoints,s.skillPoints);assert.equal(n.catcher,88);
 assert.match(n.log.at(-1)!.text,/인연 보너스 없음/);
});

test('support previews and rewards resume without rerolling or duplication',()=>{
 const s=ready();s.bonds.bat_senior=60;s.catcher=80;
 const id=s.placements.bat_senior,p=previewActivity(s,id)!;assert.ok(p.bondBonuses.length);
 const loaded=parseSave(JSON.stringify(s));assert.deepEqual(previewActivity(loaded,id),p);
 const n=act(loaded,{type:'activity',id});assert.deepEqual(parseSave(JSON.stringify(n)),n);
 assert.equal(transition(n,{type:'activity',id,revision:s.revision}),n);
});

test('one equipped card encounter returns to the second activity without chaining other cards',()=>{
 let s=ready();s.bonds.bat_senior=80;s.catcher=80;s.bonds.manager=80;
 s=act(s,{type:'activity',id:'rest'});assert.equal(s.phase,'supportEvent');
 const owner=s.activeSupport!,prior=bond(s,owner),rng=s.rng;
 const a={type:'choice',index:0,revision:s.revision} as const;
 const chosen=transition(s,a);assert.equal(chosen.phase,'supportResult');assert.equal(bond(chosen,owner),Math.min(100,prior+4));
 assert.equal(transition(chosen,a),chosen);assert.equal(chosen.rng,rng);
 const next=act(chosen,{type:'continue'});assert.equal(next.phase,'weekday');assert.equal(next.weekdayPart,2);
 assert.equal(next.activeSupport,null);assert.equal(next.encounterHistory.length,1);
 assert.equal(next.encounterHistory[0].choice,0);assert.equal(next.schedule[0].weekday2,'');
});
test('the same support lineup gives the same rewards regardless of selection order',()=>{
  const start=createGame('봄','batter',27);
  const a=act(start,{type:'lineup',supports:['classmate','bat_senior','manager','pitch_senior','rival','catcher']});
  const b=act(start,{type:'lineup',supports:['bat_senior','classmate','manager','pitch_senior','rival','catcher']});
  assert.deepEqual(a.placements,b.placements);
  for(const state of [a,b]){state.bonds.classmate=40;state.bonds.bat_senior=40;}
  const pa=previewActivity(a,'train_intelligence')!,pb=previewActivity(b,'train_intelligence')!;
  assert.deepEqual(pa.gains,pb.gains);assert.equal(pa.energy,pb.energy);assert.equal(pa.gains.intelligence,pb.gains.intelligence);assert.equal(pa.points,pb.points);
});
test('skills require enough points and correct role; learning is once without consuming week or rerolling',()=>{
  let s=ready();s.skillPoints=30;s.hints=['contact_focus'];
  const cost=skillCost(s,'contact_focus');const placement={...s.placements};
  const n=act(s,{type:'learn',id:'contact_focus'});
  assert.equal(n.skillPoints,30-cost);assert.equal(n.week,s.week);assert.deepEqual(n.placements,placement);
  assert.equal(act(n,{type:'learn',id:'contact_focus'}),n);
  assert.equal(act(n,{type:'learn',id:'precision'}),n);
  assert.equal(act({...s,skillPoints:0},{type:'learn',id:'contact_focus'}).skills.length,0);
});
test('March weekend events finish before April activity; memories, skills and March records persist',()=>{
  let s=ready();s.skills=['steady'];s.bonds.manager=48;
  for(let i=0;i<100&&s.month!==4;i++){const n=auto(s);assert.notEqual(n,s,s.phase);s=n;}
  assert.equal(s.month,4);assert.equal(s.week,1);assert.equal(s.phase,'weekday');
  assert.equal(s.schedule.length,5);assert.ok(s.schedule.slice(0,4).every(w=>w.weekday&&w.weekend));
  assert.ok(s.skills.includes('steady'));assert.ok(s.bonds.manager>=48);
  assert.equal(s.records.length,1);assert.equal(s.match,null);assert.equal(s.matchRecorded,false);
  const before=s.bonds.manager;s=act(s,{type:'lineup',supports:['pitch_senior','rival','classmate','bat_senior','catcher','manager']});
  assert.equal(s.bonds.manager,before);assert.deepEqual(s.placements,weeklyPlacements(s));
});
test('both roles reach the April final weekend with two matches and a transparent selection decision',()=>{
  for(const role of ['batter','pitcher'] as const){
    let s=createGame('봄',role,14);
    for(let i=0;i<180&&!(s.month===4&&s.week===4&&s.phase==='weekend');i++){const n=auto(s);assert.notEqual(n,s,s.phase);s=n;}
    assert.equal(s.phase,'weekend');assert.equal(s.month,4);assert.equal(s.week,4);
    assert.equal(s.records.length,2);assert.equal(s.schedule.length,8);
    assert.ok(s.evaluation);assert.equal(s.evaluation.total,s.evaluation.ability+s.evaluation.performance+s.evaluation.trust);
    assert.equal(s.records[1].match.appearance,s.evaluation.rank);
  }
});

