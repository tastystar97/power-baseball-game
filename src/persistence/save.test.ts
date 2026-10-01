import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../game/engine.ts';
import { defaultSupports } from '../content/supports.ts';
import { parseSave, loadGame, saveGame, SAVE_KEY } from './save.ts';
test('valid state round-trips with role, revision and RNG preserved', () => {
  const s = createGame('여름', 'pitcher', 84);
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});
test('reject malformed, unsupported, out-of-range and impossible phase states', () => {
  const s = createGame('여름', 'batter', 3);
  for (const raw of ['{', '{}', JSON.stringify({...s, version: 99}), JSON.stringify({...s, energy: 101}), JSON.stringify({...s, phase:'match', match:null}), JSON.stringify({...s, phase:'complete', week:1})]) {
    assert.throws(() => parseSave(raw));
  }
});
test('missing role-specific stats are rejected', () => {
  const s = createGame('여름', 'pitcher', 9);
  const raw = JSON.parse(JSON.stringify(s)); delete raw.proficiency.control;
  assert.throws(() => parseSave(JSON.stringify(raw)));
});
test('saving failures are surfaced and corrupt data is not removed', () => {
  let removed = false;
  const storage = { getItem: () => '{', setItem: () => { throw new Error('quota'); }, removeItem: () => { removed = true; } };
  assert.equal(loadGame(storage).kind, 'invalid');
  assert.equal(removed, false);
  assert.equal(saveGame(createGame('여름','batter',1), storage), false);
});
test('event in progress resumes once with no duplicate reward', () => {
  const ready=transition(createGame('여름','batter',1),{type:'lineup',supports:defaultSupports('batter'),revision:0});
  const s = transition(ready, {type:'activity', id:'train_sense', revision:ready.revision});
  const resumed = parseSave(JSON.stringify(s));
  assert.equal(resumed.phase, 'supportEvent');
  const action = {type:'choice', index:0, revision:s.revision} as const;
  const after = transition(resumed, action);
  assert.equal(transition(after, action), after);
});
test('storage key is namespaced and empty storage is a new session', () => {
  assert.match(SAVE_KEY, /last-summer/);
  assert.equal(loadGame({getItem:()=>null}).kind, 'empty');
});
