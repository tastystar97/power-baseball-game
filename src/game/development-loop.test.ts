import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition,previewActivity,snapshot} from './engine.ts';
import {createMatch,chooseTactic,tactics} from './match.ts';
import {parseSave} from '../persistence/save.ts';
import type {GameState,Action} from './types.ts';

export function playStep(s:GameState):GameState {
 const a:Omit<Action,'revision'>=s.phase==='lineup'?{type:'lineup',supports:['bat_senior','pitch_senior','rival','catcher','manager','classmate']}:
 s.phase==='weekday'?{type:'activity',id:s.energy<65?'rest':s.role==='batter'?'train_sense':'train_sense'}:
 s.phase==='weekend'?{type:'activity',id:s.stress>=30?'outing':'weekend_rest'}:
 ['event','supportEvent','weekendEvent'].includes(s.phase)?{type:'choice',index:0}:
 s.phase==='roleEvent'?{type:'choice',id:'stay'}:s.phase==='match'&&s.match!.awaiting?{type:'tactic',id:s.role==='batter'?'contact':'control'}:{type:'continue'};
 return transition(s,{...a,revision:s.revision});
}
test('intelligence replaces academics and every week has two distinct weekday activities',()=>{
 let s=createGame('새로운 봄','batter',7);
 assert.equal(s.version,10);assert.equal(s.attributes.intelligence,290);assert.equal('academics' in s,false);
 s=playStep(s);s=playStep(s);
 while(s.phase==='supportEvent'||s.phase==='supportResult')s=playStep(s);
 assert.equal(s.phase,'weekday');assert.equal(s.weekdayPart,2);assert.equal(s.week,1);
 assert.ok(s.schedule[0].weekday);assert.equal(s.schedule[0].weekday2,'');assert.equal(s.competitor.weeks.length,0);
 const rev=s.revision;s=playStep(s);while(s.phase==='supportEvent'||s.phase==='supportResult')s=playStep(s);assert.equal(s.phase,'weekend');assert.ok(s.schedule[0].weekday2);assert.equal(s.competitor.weeks.length,1);
 assert.equal(transition(s,{type:'activity',id:'rest',revision:rev}),s);
});
test('walking has a clear mental recovery reward and weekend offers seven choices',()=>{
 let s=createGame('산책','pitcher',1);s=playStep(s);
 while(s.phase!=='weekend')s=playStep(s);
 s.energy=30;s.stress=60;
 const walk=previewActivity(s,'outing')!,rest=previewActivity(s,'weekend_rest')!;
 assert.equal(walk.stress,-40);assert.equal(walk.gains.mental,17);assert.ok(rest.energy>walk.energy);
 assert.ok(previewActivity(s,'watch'));assert.ok(previewActivity(s,'partner','primary_sense'));
});
test('skill previews do not consume random state and real decisions retain their skill checks',()=>{
 const s=createGame('스킬','batter',19);s.skills=['contact_focus','contact_master'];s.match=createMatch();s.match.awaiting=true;s.match.half=1;s.match.order[1]=7;
 const rng=s.rng,view=tactics(s);assert.equal(s.rng,rng);assert.deepEqual(tactics(s),view);
 assert.ok(chooseTactic(s,'contact'));assert.equal(s.match.skillChecks?.length,1);
 const check=s.match.skillChecks![0];assert.deepEqual(check.eligible,['contact_master']);assert.equal(check.intelligence,290);
 assert.ok(check.active.every(id=>check.eligible.includes(id)));assert.equal(check.order,7);
});
test('both roles complete 32 weekday choices and 16 weekends with exact save resume',()=>{
 for(const role of ['batter','pitcher'] as const)for(let seed=1;seed<=8;seed++){
  let s=createGame('시즌',role,seed);
  for(let step=0;step<400&&s.phase!=='complete';step++){
   const saved=parseSave(JSON.stringify(s)),next=playStep(s);assert.notEqual(next,s);assert.deepEqual(playStep(saved),next);s=next;
  }
  assert.equal(s.phase,'complete');assert.equal(s.schedule.filter(w=>w.weekday&&w.weekday2&&w.weekend).length,16);
  assert.equal(s.competitor.weeks.length,16);assert.equal(s.encounterHistory.length,32);
  assert.deepEqual(parseSave(JSON.stringify(s)),s);
  for(const [key,initial] of Object.entries(s.initial))assert.equal(initial+s.log.reduce((sum,l)=>sum+(l.changes[key]||0),0),snapshot(s)[key]);
 }
});
