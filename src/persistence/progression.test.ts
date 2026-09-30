import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition, snapshot } from '../game/engine.ts';
import { createMatch, applyOutcome } from '../game/match.ts';
import type { Action } from '../game/types.ts';
import { parseSave } from './save.ts';
import { defaultSupports } from '../content/supports.ts';

test('reject conflicting event, consumed slot and missing snapshot saves', () => {
  const start=createGame('여름','pitcher',17);
  const ready=transition(start,{type:'lineup',supports:defaultSupports('pitcher'),revision:0});
  const event=transition(ready,{type:'activity',id:'control',revision:ready.revision});
  assert.throws(()=>parseSave(JSON.stringify({...event,completedEvents:[1]})),'completed event cannot await a choice');
  assert.throws(()=>parseSave(JSON.stringify({...event,phase:'weekday'})),'consumed weekday cannot be played again');
  const missing=structuredClone(start);delete missing.initial.energy;
  assert.throws(()=>parseSave(JSON.stringify(missing)));
  assert.throws(()=>parseSave(JSON.stringify({...event,phase:'weekend'})),'weekend requires completed event');
});
test('reject a retired pitcher or wrong half awaiting a tactic',()=>{
  let s=createGame('여름','pitcher',17);
  for(let step=0;step<80&&s.phase!=='match';step++){
    const a:Omit<Action,'revision'>=s.phase==='lineup'?{type:'lineup',supports:defaultSupports('pitcher')}
      :s.phase==='weekday'?{type:'activity',id:'rest'}:s.phase==='weekend'?{type:'activity',id:'weekend_rest'}
      :['event','supportEvent'].includes(s.phase)?{type:'choice',index:0}:{type:'continue'};
    s=transition(s,{...a,revision:s.revision});
  }
  assert.equal(s.phase,'match');assert.deepEqual(parseSave(JSON.stringify(s)),s);
  s.match!.retired=true;
  assert.throws(()=>parseSave(JSON.stringify(s)),/선수가 선택할 수 없는 경기 상태/);
  s.match!.retired=false;s.match!.half=1;
  assert.throws(()=>parseSave(JSON.stringify(s)),/선수가 선택할 수 없는 경기 상태/);
});
test('every phase resumes identically across both roles and three raising styles', () => {
  for(const role of ['batter','pitcher'] as const)for(const style of ['training','balanced','study']) {
    let state=createGame('여름',role,712);
    for(let step=0;step<350&&state.phase!=='complete';step++) {
      const resumed=parseSave(JSON.stringify(state));
      let a:Omit<Action,'revision'>;
      if(state.phase==='lineup')a={type:'lineup',supports:defaultSupports(role)};
      else if(state.phase==='weekday')a={type:'activity',id:style==='study'?'study':style==='balanced'&&state.week%2===0?'rest':role==='batter'?'batting':'control'};
      else if(state.phase==='weekend')a={type:'activity',id:style==='training'?'practice':style==='balanced'?'catch':'selfstudy',...(style==='training'?{target:role==='batter'?'power' as const:'breaking' as const}:{})};
      else if(['event','weekendEvent','supportEvent'].includes(state.phase))a={type:'choice',index:state.week%2};
      else if(state.phase==='match')a={type:'tactic',id:role==='batter'?'power':'breaking'};
      else a={type:'continue'};
      const action={...a,revision:state.revision};
      const next=transition(state,action);
      assert.notEqual(next,state,`${role} ${style} ${state.phase} must advance`);
      assert.deepEqual(transition(resumed,action),next);
      state=next;
    }
    assert.equal(state.phase,'complete');
    assert.deepEqual(parseSave(JSON.stringify(state)),state);
    assert.equal(state.schedule.filter(w=>w.weekday&&w.weekend).length,16);
    for(const [key,initial] of Object.entries(state.initial))assert.equal(initial+state.log.reduce((n,l)=>n+(l.changes[key]||0),0),snapshot(state)[key],`${key} growth must match logs`);
  }
});
test('player batter identity follows the runner through hits and scoring',()=>{
  const m=createMatch();m.half=1;
  applyOutcome(m,'single',true,false);
  assert.equal(m.bases[0]?.owner,'player');
  applyOutcome(m,'single',false,false);
  assert.equal(m.bases[1]?.owner,'player');
  applyOutcome(m,'double',false,false);
  assert.ok(!m.bases.some(r=>r?.owner==='player'));
  assert.equal(m.pitching.runs,0);
});
