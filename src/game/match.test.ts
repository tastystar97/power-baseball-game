import {primaryKeys} from './types.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,tactics,initializeMatch} from './match.ts';
import {createGame} from './engine.ts';
test('displayed tactic probabilities sum to one even at ability boundaries', () => {
  for(const role of ['batter','pitcher'] as const)for(const ability of [0,100]) {
    const s=createGame('여름',role,3);s.match=createMatch();s.match.pitchingRole='starter';s.match.half=role==='batter'?1:0;s.match.order[1]=7;
    for(const key of primaryKeys)s.attributes[key]=ability;for(const key of Object.keys(s.proficiency) as (keyof typeof s.proficiency)[])s.proficiency[key]=ability;
    if(role==='batter'){s.proficiency.contact=0;s.proficiency.power=100;s.energy=0;s.stress=100;}
    for(const t of tactics(s)) {
      assert.ok(t.probabilities.every(p=>p>=0&&p<=1));
      assert.ok(Math.abs(t.probabilities.reduce((a,b)=>a+b,0)-1)<1e-9,`${role} ${t.id} probabilities must sum to one`);
    }
  }
});
test('fatigue and accumulated pitch load lower the appropriate success outlook',()=>{
  const s=createGame('여름','pitcher',4);s.match=createMatch();s.match.pitchingRole='starter';
  const healthy=tactics(s).find(t=>t.id==='control')!;
  s.energy=10;s.stress=90;s.match.load=60;
  const tired=tactics(s).find(t=>t.id==='control')!;
  assert.ok(tired.probabilities[0]+tired.probabilities[1]<healthy.probabilities[0]+healthy.probabilities[1]);
});
