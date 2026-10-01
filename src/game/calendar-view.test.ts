import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {calendarMonth,calendarWeek,nextMatchCountdown} from '../ui/calendarView.ts';
import {matchPlan} from './season.ts';

test('calendar cells follow the season schedule and mark the current week', () => {
  const s=createGame('달력','batter');
  const march=calendarMonth(s,3);
  assert.deepEqual(march.map(w=>w.state),['now','future','future','future']);
  // Every Saturday the season plans a match on is shown with its opponent, and only those.
  for(const month of [3,4,5]) for(const w of calendarMonth(s,month)) assert.equal(!!w.match,!!matchPlan({...s,month,week:w.week}));
  assert.equal(calendarWeek(s,3,4).match?.opponent,'해솔고');
});

test('past weeks show what was done and played matches show the result', () => {
  const s=createGame('달력','batter');
  const later={...s,month:4,week:2,schedule:[{month:3,week:4,weekday:'타격 훈련',weekday2:'휴식',weekend:'산책'}],
    records:[{month:3,match:{...structuredClone(s.match??({} as never)),id:matchPlan({...s,month:3,week:4})!.id,score:[1,3]} as never}]} as typeof s;
  const w=calendarWeek(later,3,4);
  assert.equal(w.state,'done');
  assert.deepEqual([w.first,w.second,w.weekend],['타격 훈련','휴식','산책']);
  assert.equal(w.match?.result,'승 3:1');
  assert.equal(calendarWeek(later,4,2).state,'now');
});

test('the countdown points at the next unplayed match in weeks', () => {
  const s=createGame('달력','pitcher');
  assert.deepEqual(nextMatchCountdown(s),{title:'첫 연습경기',opponent:'해솔고',weeks:3});
  assert.equal(nextMatchCountdown({...s,week:4})?.weeks,0);
});
