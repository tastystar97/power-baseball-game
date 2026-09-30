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
  if(s.phase==='weekday')return act(s,{type:'activity',id:s.role==='batter'?'batting':'control'});
  if(s.phase==='weekend')return act(s,{type:'activity',id:'catch'});
  if(['event','weekendEvent','supportEvent'].includes(s.phase))return act(s,{type:'choice',index:0});
  if(s.phase==='match')return act(s,{type:'tactic',id:s.role==='batter'?'contact':'control'});
  return act(s,{type:'continue'});
}
test('three unique support people are required before starting; lineup costs no activity',()=>{
  const s=createGame('봄','batter',1);
  assert.equal(s.phase,'lineup');
  assert.equal(act(s,{type:'lineup',supports:['catcher','catcher','rival']}),s);
  assert.equal(act(s,{type:'activity',id:'batting'}),s);
  const n=act(s,{type:'lineup',supports:['bat_senior','manager','classmate']});
  assert.equal(n.phase,'weekday');assert.equal(n.energy,s.energy);assert.equal(n.schedule[0].weekday,'');
});
test('monthly editing retains each person placement and locks after first activity',()=>{
  let s=ready();const original={...s.placements};
  s=act(s,{type:'editLineup'});assert.equal(s.phase,'lineup');
  s=act(s,{type:'lineup',supports:['bat_senior','rival','classmate']});
  assert.equal(s.placements.bat_senior,original.bat_senior);
  s=act(s,{type:'activity',id:'batting'});
  assert.equal(act(s,{type:'editLineup'}),s);
  assert.equal(s.lineupHistory.length,1);
});
test('visible participants give actual growth, bond and skill points; joint preview uses prior bond',()=>{
  let s=ready();s.placements={bat_senior:'batting',catcher:'fielding',manager:'rest'};
  s.bonds.bat_senior=40;
  const preview=previewActivity(s,'batting')!;
  assert.ok(preview.gains.contact!>3);assert.ok(preview.joint.includes('bat_senior'));
  const n=act(s,{type:'activity',id:'batting'});
  assert.equal(n.stats.contact-s.stats.contact,preview.gains.contact);
  assert.equal(bond(n,'bat_senior'),55);
  assert.equal(n.skillPoints-s.skillPoints,preview.points);
  assert.match(n.notice,/컨택/);assert.match(n.notice,/스킬 Pt/);
  assert.equal(n.phase,'supportEvent');
});

test('bond tiers add one to five growth on top of existing support and joint rewards for both roles',()=>{
  for(const role of ['batter','pitcher'] as const){
    const id=role==='batter'?'batting':'control',stat=role==='batter'?'contact':'control';
    for(const [value,bonus,total] of [[0,1,10],[19,1,10],[20,2,11],[39,2,11],[40,3,15],[59,3,15],[60,4,16],[79,4,16],[80,5,17],[100,5,17]]){
      const s=ready(role);s.placements={catcher:id};s.catcher=value;
      const p=previewActivity(s,id)!;
      assert.equal(p.gains[stat],total,`${role} bond ${value}`);
      assert.equal(p.bondBonus?.amount,bonus);
      assert.equal(p.bondBonus?.stat,stat);
      assert.equal(act(s,{type:'activity',id}).stats[stat]-s.stats[stat],total);
    }
  }
});

test('bond rewards use starting bond and only partners at the selected training',()=>{
  const s=ready();s.placements={bat_senior:'batting',catcher:'fielding',manager:'rest',rival:'batting'};
  s.bonds.bat_senior=39;s.rival=100;s.catcher=100;s.bonds.manager=100;
  const before=structuredClone(s),p=previewActivity(s,'batting')!;
  assert.equal(p.gains.contact,11);
  assert.deepEqual(p.bondBonus?.partners,[{id:'bat_senior',bond:39,amount:2}]);
  assert.equal(previewActivity(s,'weights')!.bondBonus,null);
  assert.deepEqual(s,before);
  const n=act(s,{type:'activity',id:'batting'});
  assert.equal(n.stats.contact,51);assert.equal(n.bonds.bat_senior,54);
  assert.match(n.log.at(-1)!.text,/인연 보너스 · 컨택 \+2/);
  assert.match(n.log.at(-1)!.text,/강민재 인연 39/);
  assert.equal(transition(n,{type:'activity',id:'batting',revision:s.revision}),n);
});

test('all partner roles add bond growth and stack independently of lineup order',()=>{
  const s=ready();s.supports=['bat_senior','catcher','manager'];
  s.placements={bat_senior:'batting',catcher:'batting',manager:'batting'};
  s.bonds.bat_senior=80;s.catcher=20;s.bonds.manager=40;
  const p=previewActivity(s,'batting')!;
  assert.equal(p.bondBonus?.amount,10);assert.equal(p.gains.contact,27);
  assert.equal(p.energy,-20);assert.equal(p.stress,7);assert.equal(p.points,13);
  const reversed=previewActivity({...s,supports:[...s.supports].reverse()},'batting')!;
  assert.deepEqual(reversed.gains,p.gains);assert.equal(reversed.bondBonus?.amount,10);
  const school=ready();school.supports=['classmate','manager','catcher'];school.placements={classmate:'batting'};school.bonds.classmate=60;
  const ps=previewActivity(school,'batting')!;
  assert.equal(ps.gains.contact,14);assert.equal(ps.gains.mental,2);assert.equal(ps.academics,3);assert.equal(ps.bondBonus?.amount,4);
});

test('preview distinguishes nominal bond bonus from actual growth after stress and ability limits',()=>{
  const s=ready();s.placements={catcher:'batting'};s.catcher=20;s.stress=75;
  const stressed=previewActivity(s,'batting')!;
  assert.equal(stressed.gains.contact,5);assert.equal(stressed.bondBonus?.potential,2);assert.equal(stressed.bondBonus?.amount,1);
  s.stress=0;s.stats.contact=90;
  const capped=previewActivity(s,'batting')!;
  assert.equal(capped.gains.contact,2);assert.equal(capped.bondBonus?.amount,0);
  s.stats.contact=99;
  assert.equal(previewActivity(s,'batting')!.bondBonus?.amount,0);
});

test('safe tactics gain bond growth, rest and study do not, and failed training grants none',()=>{
  const s=ready('pitcher');s.placements={catcher:'tactics'};s.catcher=60;
  assert.equal(previewActivity(s,'tactics')!.gains.control,11);
  assert.equal(previewActivity(s,'tactics')!.bondBonus?.amount,4);
  for(const id of ['rest','study']){s.placements={catcher:id};assert.equal(previewActivity(s,id)!.bondBonus,null);}
  s.placements={catcher:'control'};s.energy=40;s.rng=1;
  assert.equal(previewActivity(s,'control')!.bondBonus?.amount,4);
  const n=act(s,{type:'activity',id:'control'});
  assert.equal(n.stats.control,s.stats.control);assert.equal(n.skillPoints,s.skillPoints);assert.equal(n.catcher,75);
  assert.match(n.log.at(-1)!.text,/인연 보너스 없음/);
});

test('bond bonus and its actual result survive saves without changing placements or awarding twice',()=>{
  const s=ready();s.bonds.bat_senior=60;s.catcher=80;s.bonds.manager=40;
  const id=s.placements.bat_senior;
  const p=previewActivity(s,id)!;assert.ok(p.bondBonus);
  const loaded=parseSave(JSON.stringify(s));
  assert.deepEqual(previewActivity(loaded,id),p);
  const n=act(loaded,{type:'activity',id});
  assert.deepEqual(parseSave(JSON.stringify(n)),n);
  assert.equal(transition(n,{type:'activity',id,revision:s.revision}),n);
});
test('support event rewards once then returns to original weekday continuation',()=>{
  let s=ready();s.placements={bat_senior:'batting'};s.bonds.bat_senior=30;
  s=act(s,{type:'activity',id:'batting'});assert.equal(s.phase,'supportEvent');
  const a={type:'choice',index:0,revision:s.revision} as const;
  s=transition(s,a);assert.equal(s.phase,'supportResult');
  assert.equal(transition(s,a),s);assert.ok(s.supportCompleted.includes('bat_senior'));assert.ok(s.hints.includes('contact_focus'));
  s=act(s,{type:'continue'});assert.equal(s.phase,'event');
});
test('everyone reaching a personal event together gets a turn before the normal story resumes',()=>{
  let s=ready();s.placements={bat_senior:'batting',catcher:'batting',manager:'rest'};
  s.bonds.bat_senior=25;s.catcher=25;
  s=act(s,{type:'activity',id:'batting'});assert.equal(s.activeSupport,'bat_senior');
  s=act(s,{type:'choice',index:0});s=act(s,{type:'continue'});
  assert.equal(s.phase,'supportEvent');assert.equal(s.activeSupport,'catcher');
  const seniorBond=s.bonds.bat_senior;
  s=act(s,{type:'choice',index:0});s=act(s,{type:'continue'});
  assert.equal(s.phase,'event');assert.equal(s.activeSupport,null);
  assert.equal(s.bonds.bat_senior,seniorBond);assert.deepEqual(s.supportCompleted,['bat_senior','catcher']);
});
test('the same support lineup gives the same rewards regardless of selection order',()=>{
  const start=createGame('봄','batter',27);
  const a=act(start,{type:'lineup',supports:['classmate','bat_senior','manager']});
  const b=act(start,{type:'lineup',supports:['bat_senior','classmate','manager']});
  assert.equal(a.placements.classmate,'study');assert.equal(a.placements.bat_senior,'study');
  for(const state of [a,b]){state.bonds.classmate=40;state.bonds.bat_senior=40;}
  const pa=previewActivity(a,'study')!,pb=previewActivity(b,'study')!;
  assert.deepEqual(pa.gains,pb.gains);assert.equal(pa.energy,pb.energy);assert.equal(pa.academics,pb.academics);assert.equal(pa.points,pb.points);
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
test('March weekend events finish before April lineup; memories, skills and March records persist',()=>{
  let s=ready();s.skills=['steady'];s.supportCompleted=['manager'];s.bonds.manager=48;
  for(let i=0;i<100&&s.month!==4;i++){const n=auto(s);assert.notEqual(n,s,s.phase);s=n;}
  assert.equal(s.month,4);assert.equal(s.week,1);assert.equal(s.phase,'lineup');
  assert.equal(s.schedule.length,5);assert.ok(s.schedule.slice(0,4).every(w=>w.weekday&&w.weekend));
  assert.ok(s.skills.includes('steady'));assert.ok(s.supportCompleted.includes('manager'));assert.ok(s.bonds.manager>=48);
  assert.equal(s.records.length,1);assert.equal(s.match,null);assert.equal(s.matchRecorded,false);
  const before=s.bonds.manager;s=act(s,{type:'lineup',supports:['pitch_senior','rival','classmate']});
  assert.equal(s.bonds.manager,before);assert.deepEqual(s.placements,weeklyPlacements(s));
});
test('both roles reach the April final weekend with two matches and a transparent selection decision',()=>{
  for(const role of ['batter','pitcher'] as const){
    let s=createGame('봄',role,14);
    for(let i=0;i<180&&!(s.month===4&&s.week===4&&s.phase==='weekend');i++){const n=auto(s);assert.notEqual(n,s,s.phase);s=n;}
    assert.equal(s.phase,'weekend');assert.equal(s.month,4);assert.equal(s.week,4);
    assert.equal(s.records.length,2);assert.equal(s.schedule.length,8);assert.equal(s.completedEvents.length,6);
    assert.ok(s.evaluation);assert.equal(s.evaluation.total,s.evaluation.ability+s.evaluation.performance+s.evaluation.trust);
    assert.equal(s.records[1].match.appearance,s.evaluation.rank);
  }
});

