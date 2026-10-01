import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {createMatch,chooseTactic,tactics,advanceMatch} from './match.ts';
import {skillActivationChance,eligibleSkills} from './skill-activation.ts';
import {readFileSync} from 'node:fs';
import {parseSave} from '../persistence/save.ts';

test('intelligence changes activation from 50 to 90 percent and improves activation contribution as well as the derived ability',()=>{
 assert.equal(skillActivationChance(0),.5);assert.equal(skillActivationChance(45),.68);assert.equal(skillActivationChance(100),.9);
 const s=createGame('지능','batter',345);s.skills=['contact_focus'];s.match=createMatch();s.match.half=1;s.match.order[1]=7;
 s.attributes.intelligence=0;const low=tactics(s)[0];s.attributes.intelligence=100;const high=tactics(s)[0];
 s.skills=[];s.attributes.intelligence=0;const lowBase=tactics(s)[0];s.attributes.intelligence=100;const highBase=tactics(s)[0];assert.ok(Math.abs((high.probabilities[3]-highBase.probabilities[3])-(low.probabilities[3]-lowBase.probabilities[3])-.02)<1e-9);assert.ok(highBase.probabilities[3]>lowBase.probabilities[3]);
 const before=structuredClone(s);for(let i=0;i<10;i++)tactics(s);assert.deepEqual(s,before);
});
test('each eligible skill rolls independently before one actual manual or automatic appearance',()=>{
 const seen=new Set<string>();
 for(let seed=1;seed<=60;seed++){
  const s=createGame('발동','batter',(Math.imul(seed,2654435761)>>>0)||1);s.skills=['contact_focus','contact_master','calm'];
  s.match=createMatch();s.match.awaiting=true;s.match.half=1;s.match.outs=2;s.match.order[1]=7;
  assert.deepEqual(eligibleSkills(s,'contact'),['contact_master','calm']);
  assert.ok(chooseTactic(s,'contact'));const e=s.match.skillChecks![0];assert.equal(e.order,7);assert.equal(e.source,'manual');
  seen.add(e.active.join(','));const snapshot=structuredClone(s);assert.equal(chooseTactic(s,'contact'),false);assert.deepEqual(s,snapshot);
 }
 assert.ok(seen.size===4,'independent outcomes include partial activation');
 const p=createGame('발동','pitcher',21);p.skills=['efficient_pitch'];p.match=createMatch();
 for(let i=0;i<200&&!p.match.over;i++){advanceMatch(p);if(p.match.awaiting)chooseTactic(p,'control','auto');}
 assert.ok(p.match.skillChecks!.length>=2);assert.ok(p.match.skillChecks!.every(e=>e.source==='auto'));
 const expected=p.match.skillChecks.reduce((sum,e)=>sum+(e.active.includes('efficient_pitch')?1:3.4),0);
 assert.ok(Math.abs(p.match.load-expected)<1e-9);
});
