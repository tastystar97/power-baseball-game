import {primaryKeys} from './types.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, applyOutcome, advanceMatch, chooseTactic, tactics } from './match.ts';
import { createGame } from './engine.ts';

test('bases-loaded walk forces each runner one base and scores exactly one run', () => {
  const m = createMatch();
  m.half = 1; m.bases = [{ owner: 'team' }, { owner: 'team' }, { owner: 'team' }];
  applyOutcome(m, 'walk', true, false);
  assert.equal(m.score[1], 1);
  assert.equal(m.batting.walks, 1);
  assert.equal(m.batting.ab, 0);
  assert.ok(m.bases.every(Boolean));
});
test('walk does not move an unforced runner on second', () => {
  const m = createMatch();
  const runner = { owner: 'player' as const };
  m.bases = [null, runner, null];
  applyOutcome(m, 'walk', false, true);
  assert.equal(m.bases[1], runner);
  assert.equal(m.bases[2], null);
});
test('grand slam records four runs and RBI, one at-bat, and empty bases', () => {
  const m = createMatch(); m.half = 1;
  m.bases = [{ owner: 'team' }, { owner: 'team' }, { owner: 'team' }];
  applyOutcome(m, 'homer', true, false);
  assert.deepEqual(m.score, [0, 4]);
  assert.equal(m.batting.rbi, 4);
  assert.equal(m.batting.hits, 1);
  assert.equal(m.batting.ab, 1);
  assert.ok(m.bases.every(b => b === null));
});
test('sacrifice bunt advances runners, records an out, and does not charge an at-bat', () => {
  const m = createMatch(); m.half = 1; m.bases[0] = { owner: 'team' };
  applyOutcome(m, 'sacrifice', true, false);
  assert.equal(m.outs, 1); assert.ok(m.bases[1]); assert.equal(m.batting.ab, 0);
});
test('two-out bunt is disabled and invalid choice is not applied', () => {
  const s = createGame('여름', 'batter', 99); s.match = createMatch();
  s.match.half = 1; s.match.outs = 2; s.match.awaiting = true;
  s.match.bases[0] = { owner: 'team' };
  assert.equal(tactics(s).find(t => t.id === 'bunt')?.disabled, true);
  assert.equal(chooseTactic(s, 'bunt'), false);
});
test('an inherited runner is charged to player after pitcher replacement', () => {
  const m = createMatch(); m.retired = true; m.bases[2] = { owner: 'player' };
  applyOutcome(m, 'single', false, false);
  assert.equal(m.pitching.runs, 1);
  assert.equal(m.pitching.hits, 0);
});
test('pitcher records outs and strikeouts only while actually pitching', () => {
  const m = createMatch();
  applyOutcome(m, 'strikeout', false, true);
  applyOutcome(m, 'strikeout', false, false);
  assert.equal(m.pitching.outs, 1); assert.equal(m.pitching.k, 1);
});
test('across seeds matches finish with consistent inning totals and limited highlights', () => {
  for (const role of ['batter', 'pitcher'] as const) for (let seed = 1; seed <= 35; seed++) {
    const s = createGame('여름', role, seed); s.match = createMatch();
    for (let n = 0; n < 10 && !s.match.over; n++) {
      advanceMatch(s);
      if (s.match.awaiting) chooseTactic(s, role === 'batter' ? 'contact' : 'control');
    }
    assert.ok(s.match.over, `${role} seed ${seed}`);
    assert.notEqual(s.match.score[0], s.match.score[1]);
    for (const team of [0, 1]) assert.equal(s.match.lines[team].reduce((a,b) => a+b, 0), s.match.score[team]);
    assert.ok(s.match.highlights <= 3);
    if (role === 'pitcher') assert.ok(s.match.retired);
  }
});

test('displayed tactic probabilities sum to one even at ability boundaries', () => {
  for(const role of ['batter','pitcher'] as const)for(const ability of [0,100]) {
    const s=createGame('여름',role,3);s.match=createMatch();
    for(const key of primaryKeys)s.attributes[key]=ability;for(const key of Object.keys(s.proficiency) as (keyof typeof s.proficiency)[])s.proficiency[key]=ability;
    if(role==='batter'){s.proficiency.contact=0;s.proficiency.power=100;s.energy=0;s.stress=100;}
    for(const t of tactics(s)) {
      assert.ok(t.probabilities.every(p=>p>=0&&p<=1));
      assert.ok(Math.abs(t.probabilities.reduce((a,b)=>a+b,0)-1)<1e-9,`${role} ${t.id} probabilities must sum to one`);
    }
  }
});
test('fatigue and accumulated pitch load lower the appropriate success outlook',()=>{
  const s=createGame('여름','pitcher',4);s.match=createMatch();
  const healthy=tactics(s).find(t=>t.id==='control')!;
  s.energy=10;s.stress=90;s.match.load=60;
  const tired=tactics(s).find(t=>t.id==='control')!;
  assert.ok(tired.probabilities[0]+tired.probabilities[1]<healthy.probabilities[0]+healthy.probabilities[1]);
});
