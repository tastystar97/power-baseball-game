import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition,previewActivity} from './engine.ts';
import {encounterIds,drawEncounter,encounterContent,encounterOwner} from '../content/encounters.ts';
import {supportIds} from './types.ts';
import {bond} from '../content/supports.ts';
import {parseSave} from '../persistence/save.ts';

test('all ninety events respect deck ownership, chain prerequisites and immediate repeat protection',()=>{
 const owners=new Set<string>();
 for(const id of encounterIds){const s=createGame('인연','batter');assert.equal(encounterContent(s,id).choices.length,2);owners.add(encounterOwner(id));}
 assert.equal(encounterIds.length,90);assert.equal(owners.size,18);
 for(let seed=1;seed<=100;seed++){
  const s=createGame('인연','batter',(Math.imul(seed,2654435761)>>>0)||1);s.supports=[...supportIds];
  s.rival=100;s.catcher=100;for(const id of Object.keys(s.bonds))s.bonds[id]=100;
  drawEncounter(s);const first=s.activeEncounter;
  if(first){assert.ok(s.supports.includes(encounterOwner(first)));assert.ok(first.endsWith('growth-1'));}
  s.weekdayPart=2;s.activeEncounter=null;drawEncounter(s);if(first)assert.notEqual(s.activeEncounter,first);
  const before=structuredClone(s);drawEncounter(s);assert.deepEqual(s,before);
  const low=createGame('인연','pitcher',s.rng);low.supports=s.supports;drawEncounter(low);assert.ok(!low.activeEncounter?.includes('growth'));
 }
});
test('two dry slots guarantee an encounter and the saved growth choice pays only once',()=>{
 const s=createGame('인연','pitcher',123456789);s.supports=[...supportIds];s.week=2;
 s.encounterHistory=[1,2].map(part=>({key:1,part:part as 1|2,eventId:null,support:null,choice:null}));drawEncounter(s);assert.ok(s.activeEncounter);
 for(let seed=1;seed<200;seed++){
  let q=createGame('인연','batter',seed);q=transition(q,{type:'lineup',supports:[...supportIds],revision:q.revision});
  for(const id of Object.keys(q.bonds))q.bonds[id]=60;q.catcher=60;q.rival=60;
  q=transition(q,{type:'activity',id:'rest',revision:q.revision});if(!q.activeEncounter?.includes('growth-1'))continue;
  const owner=q.activeSupport!,before=bond(q,owner),a={type:'choice' as const,index:0,revision:q.revision};
  const n=transition(parseSave(JSON.stringify(q)),a);
  assert.equal(bond(n,owner),Math.min(100,before+4));assert.ok(n.supportCompleted.includes(q.activeEncounter));assert.equal(n.hints.length,1);
  assert.deepEqual(parseSave(JSON.stringify(n)),n);assert.equal(transition(n,a),n);return;
 }
 assert.fail('a growth encounter should be reachable');
});

test('weekend partner training requires an equipped bonded partner and consumes one weekend',()=>{
 const s=createGame('특훈','pitcher');s.phase='weekend';s.supports=['rival','classmate','manager','bat_senior','pitch_senior','catcher'];
 assert.ok(previewActivity(s,'partner','primary_sense')!.disabledReason);
 s.rival=60;assert.equal(previewActivity(s,'partner','primary_sense','rival')!.disabledReason,'');
 assert.ok(previewActivity(s,'partner','primary_sense','sera')!.disabledReason);
 const before=structuredClone(s),p=previewActivity(s,'partner','primary_sense','rival')!;
 const a={type:'activity' as const,id:'partner',target:'primary_sense' as const,partner:'rival' as const,revision:s.revision};
 const n=transition(s,a);assert.equal(n.proficiency.control!-before.proficiency.control!,p.proficiency.control);
 assert.equal(n.rival,68);assert.equal(n.week,2);assert.equal(n.weekdayPart,1);assert.equal(transition(n,a),n);
});
