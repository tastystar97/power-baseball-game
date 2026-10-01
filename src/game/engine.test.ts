import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition, previewActivity } from './engine.ts';
import { activities } from '../content/activities.ts';
import type { GameState, Action, Role } from './types.ts';
import { defaultSupports } from '../content/supports.ts';

const act = (s: GameState, a: Omit<Action, 'revision'>) => transition(s, { ...a, revision: s.revision } as Action);
const ready=(name:string,role:Role,seed:number)=>({...act(createGame(name,role,seed),{type:'lineup',supports:defaultSupports(role)}),placements:{}});
export function finishMonth(role: Role, seed = 42, training = 'rest') {
  let s = createGame('김여름', role, seed);
  for (let i = 0; i < 350 && s.phase !== 'complete'; i++) {
    if (s.phase === 'lineup') s=act(s,{type:'lineup',supports:defaultSupports(role)});
    else if (s.phase === 'weekday') s = act(s, { type: 'activity', id: training });
    else if (s.phase === 'weekend') s = act(s, { type: 'activity', id: 'catch' });
    else if (['event','weekendEvent','supportEvent'].includes(s.phase)) s = act(s, { type: 'choice', index: 0 });
    else if(s.phase==='roleEvent')s=act(s,{type:'choice',id:'stay'});
    else if (s.phase === 'match'&&s.match!.awaiting) s = act(s, { type: 'tactic', id: role === 'batter' ? 'contact' : 'control' });
    else s = act(s, { type: 'continue' });
  }
  return s;
}
test('roles get different meaningful stats and only role-appropriate training', () => {
  for (const role of ['batter', 'pitcher'] as const) {
    const s = createGame(' 새봄 ', role, 5);
    assert.equal(s.name, '새봄');
    assert.equal(s.week, 1);
    assert.equal(activities(s).length, 6);
    assert.ok(s.proficiency[role === 'batter' ? 'contact' : 'control']! > 0);
    assert.equal(transition(s, { type: 'activity', id: role === 'batter' ? 'velocity' : 'train_sense', revision: 0 }), s);
  }
});
test('name validation rejects empty and more than eight characters', () => {
  assert.throws(() => createGame('  ', 'batter', 1));
  assert.throws(() => createGame('123456789', 'pitcher', 1));
});
test('normal-condition training applies the activity table and logs actual changes', () => {
  const s = ready('여름', 'batter', 7);
  const after = act(s, { type: 'activity', id: 'train_sense' });
  assert.equal(after.proficiency.contact, s.proficiency.contact! + 70);
  assert.equal(after.proficiency.eye, s.proficiency.eye!);
  assert.equal(after.energy, s.energy - 18);
  assert.equal(after.stress, s.stress + 6);
  assert.ok(['weekday','supportEvent'].includes(after.phase));assert.equal(after.schedule[0].weekday2,'');
  assert.equal(after.log[0].changes.proficiency_contact, 70);
});
test('stale input cannot consume a second action or duplicate an event reward', () => {
  const s = ready('여름', 'pitcher', 9);
  const action = { type: 'activity', id: 'train_sense', revision: s.revision } as const;
  const after = transition(s, action);
  assert.equal(transition(after, action), after);
  const choice = { type: 'choice', index: 0, revision: after.revision } as const;
  const chosen = transition(after, choice);
  assert.equal(transition(chosen, choice), chosen);
});
test('stress leaves learning intact, rest recovers and values stay in bounds', () => {
  const s = ready('여름', 'pitcher', 8);
  s.stress = 80;
  const p = previewActivity(s, 'train_sense');
  assert.ok(p && p.proficiency.control === 40);
  const rested = act({ ...s, energy: 90, stress: 3 }, { type: 'activity', id: 'rest' });
  assert.equal(rested.energy, 100);
  assert.equal(rested.stress, 0);
  assert.equal(rested.log[0].changes.energy, 10);
});
test('weekend practice rejects an unavailable target and consumes exactly one slot', () => {
  let s = createGame('여름', 'pitcher', 8);
  s.phase = 'weekend';
  assert.equal(act(s, { type: 'activity', id: 'practice', target: 'power' }), s);
  s = act(s, { type: 'activity', id: 'practice', target: 'primary_sense' });
  assert.equal(s.week, 2);
  assert.equal(s.phase, 'weekday');
});
test('both roles complete thirty-two weekday slots and sixteen weekends through the summer tournament', () => {
  for (const role of ['batter', 'pitcher'] as const) {
    const s = finishMonth(role);
    assert.equal(s.phase, 'complete');
    assert.equal(s.week, 4);
    assert.equal(s.schedule.length, 16);
    assert.ok(s.schedule.every(w => w.weekday && w.weekday2 && w.weekend));
    assert.equal(s.encounterHistory.length,32);
    assert.ok(s.records.every(r=>r.match.over));
    assert.ok(s.records.length>=4&&s.records.length<=6);
    assert.ok(s.records.every(r=>r.match.highlights===r.match.skillChecks.filter(e=>e.source==='manual').length));
    assert.equal(act(s, { type: 'continue' }), s);
  }
});
test('same seed and actions reproduce state without mutating previous state', () => {
  assert.deepEqual(finishMonth('pitcher'), finishMonth('pitcher'));
  const s = createGame('여름', 'pitcher', 12);
  const before = JSON.stringify(s);
  act(s, { type: 'activity', id: 'train_sense' });
  assert.equal(JSON.stringify(s), before);
});
