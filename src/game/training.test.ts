import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,previewActivity,transition} from './engine.ts';
import {defaultSupports} from '../content/supports.ts';
import {parseSave} from '../persistence/save.ts';
import type {Action,GameState,Role} from './types.ts';

const act=(s:GameState,a:Omit<Action,'revision'>)=>transition(s,{...a,revision:s.revision});
const ready=(role:Role='pitcher')=>act(createGame('여름',role,71),{type:'lineup',supports:defaultSupports(role)});

test('training preview uses starting energy, with increasing risk but intact success rewards',()=>{
  for(const role of ['batter','pitcher'] as const){
    const s=ready(role),id=role==='batter'?'batting':'control';s.placements={};
    for(const [energy,chance] of [[100,0],[70,0],[69,1],[50,15],[30,40],[10,80],[0,95]]){
      s.energy=energy;
      const p=previewActivity(s,id)!;
      assert.equal(p.failureChance,chance);
      assert.equal(p.gains[role==='batter'?'contact':'control'],7);
    }
    s.energy=80;assert.equal(previewActivity(s,id)!.failureChance,0,'post-training fatigue must not change this roll');
  }
});

test('a failed training consumes its slot, loses condition, and gives no ability growth or skill points',()=>{
  const s=ready();s.placements={};s.energy=40;s.rng=1;
  const n=act(s,{type:'activity',id:'control'});
  assert.equal(n.stats.control,40);assert.equal(n.stats.mental,38);
  assert.equal(n.energy,8);assert.equal(n.stress,33);assert.equal(n.skillPoints,8);
  assert.equal(n.phase,'event');assert.equal(n.schedule[0].weekday,'제구 훈련');
  assert.deepEqual(n.log[0].changes,{mental:-2,energy:-32,stress:18});
  assert.deepEqual(n.log[0].training,{outcome:'failure',energyBefore:40,failureChance:25,points:0});
  assert.match(n.notice,/실패/);assert.notEqual(n.rng,s.rng);
});

test('the same roll succeeds with moderate energy but fails with very low energy; safe training does not roll',()=>{
  const s=ready();s.placements={};s.energy=40;s.rng=123456789;
  const n=act(s,{type:'activity',id:'control'});
  assert.equal(n.stats.control,47);assert.equal(n.energy,16);assert.equal(n.skillPoints,14);
  assert.equal(n.log[0].training?.outcome,'success');
  const tired=act({...s,energy:10},{type:'activity',id:'control'});
  assert.equal(tired.log[0].training?.outcome,'failure');
  const safe=act({...s,energy:70},{type:'activity',id:'control'});
  assert.equal(safe.rng,s.rng);assert.equal(safe.log[0].training?.outcome,'success');
});

test('rest, study, tactics and light catch stay safe at zero energy and recovery is stronger',()=>{
  const s=ready();s.placements={};s.energy=0;s.stress=50;
  for(const id of ['rest','study','tactics']){
    assert.equal(previewActivity(s,id)!.failureChance,0);
    assert.equal(act(s,{type:'activity',id}).rng,s.rng);
  }
  const rest=act(s,{type:'activity',id:'rest'});assert.equal(rest.energy,40);assert.equal(rest.stress,28);
  const weekend={...s,phase:'weekend' as const};
  for(const id of ['weekend_rest','outing','selfstudy','catch']){
    assert.equal(previewActivity(weekend,id)!.failureChance,0);
    assert.equal(act(weekend,{type:'activity',id}).rng,s.rng);
  }
  assert.equal(act(weekend,{type:'activity',id:'weekend_rest'}).energy,32);
});

test('failure saves and resumes exactly without reroll or duplicate cost; older logs remain valid',()=>{
  const s=ready();s.energy=40;s.rng=1;
  const a={type:'activity',id:'control',revision:s.revision} as const;
  const after=transition(s,a),resumed=parseSave(JSON.stringify(after));
  assert.equal(after.log[0].training?.outcome,'failure');
  assert.deepEqual(resumed,after);assert.deepEqual(transition(parseSave(JSON.stringify(s)),a),after);
  assert.equal(transition(resumed,a),resumed);
  const legacy=structuredClone(after);delete legacy.log[0].training;
  assert.deepEqual(parseSave(JSON.stringify(legacy)),legacy);
  const corrupt=structuredClone(after);corrupt.log[0].training!.failureChance=101;
  assert.throws(()=>parseSave(JSON.stringify(corrupt)));
});

test('failed joint training keeps shared bonds but cannot award support growth, academics or points',()=>{
  const s=act(createGame('여름','pitcher',71),{type:'lineup',supports:['catcher','classmate','manager']});
  s.energy=40;s.rng=1;s.catcher=40;s.bonds.classmate=40;s.bonds.manager=40;
  s.placements={catcher:'control',classmate:'control',manager:'control'};
  const n=act(s,{type:'activity',id:'control'});
  assert.equal(n.stats.control,s.stats.control);assert.equal(n.academics,s.academics);
  assert.equal(n.stats.mental,s.stats.mental-2);assert.equal(n.skillPoints,s.skillPoints);
  assert.equal(n.catcher,55);assert.equal(n.bonds.classmate,55);assert.equal(n.bonds.manager,55);
  assert.equal(n.phase,'supportEvent');assert.equal(n.log[0].training?.outcome,'failure');
});

test('last March weekend practice can fail and preserves its result into April lineup',()=>{
  let s=ready('batter');
  for(let step=0;step<100&&!(s.week===4&&s.phase==='weekend');step++){
    const a:Omit<Action,'revision'>=s.phase==='weekday'?{type:'activity',id:'rest'}:s.phase==='weekend'?{type:'activity',id:'weekend_rest'}
      :['event','supportEvent'].includes(s.phase)?{type:'choice',index:0}:s.phase==='match'?{type:'tactic',id:'contact'}:{type:'continue'};
    s=act(s,a);
  }
  assert.equal(s.phase,'weekend');s.energy=20;s.rng=1;
  const before=s.stats.power,n=act(s,{type:'activity',id:'practice',target:'power'});
  assert.equal(n.stats.power,before);assert.equal(n.month,4);assert.equal(n.phase,'lineup');
  assert.equal(n.log.at(-1)?.training?.outcome,'failure');assert.equal(n.log.at(-1)?.month,3);
  assert.equal(n.schedule[3].weekend,'개인 연습 · 파워');assert.equal(n.records.length,1);
  assert.deepEqual(parseSave(JSON.stringify(n)),n);
});

test('failure costs and larger success rewards clamp at stat bounds and match the preview',()=>{
  const s=ready();s.placements={};s.energy=0;s.stress=99;s.stats.mental=1;s.rng=1;
  const p=previewActivity(s,'control')!,n=act(s,{type:'activity',id:'control'});
  assert.equal(n.stats.mental,0);assert.equal(n.energy,0);assert.equal(n.stress,100);
  assert.deepEqual(n.log[0].changes,{mental:-1,stress:1});
  assert.equal(p.failure?.energy,0);assert.equal(p.failure?.stress,1);assert.deepEqual(p.failure?.gains,{mental:-1});
  const healthy={...s,energy:100,stress:0,stats:{...s.stats,control:99}};
  assert.equal(previewActivity(healthy,'control')!.gains.control,1);
  assert.equal(act(healthy,{type:'activity',id:'control'}).stats.control,100);
});
