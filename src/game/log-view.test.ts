import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {logLines,filterLines} from '../ui/logView.ts';
import type {GameState} from './types.ts';

const withLog=(log:GameState['log'])=>({...createGame('기록','batter'),log});

test('each entry becomes an action line followed by gain and loss lines, newest first', () => {
  const s=withLog([
    {month:3,week:1,title:'웨이트',text:'끝까지 연습을 마쳤다.',slot:'first',changes:{primary_power:5,energy:-21,stress:7}},
    {month:3,week:1,title:'한 번 더, 같은 스윙',text:'노트를 정리했다.',changes:{primary_sense:3}},
  ]);
  const lines=logLines(s);
  assert.deepEqual(lines.map(l=>[l.kind,l.text]),[
    ['gain','센스 +3'],['talk','한 번 더, 같은 스윙 · 노트를 정리했다.'],
    ['loss','체력 -21 · 스트레스 +7'],['gain','파워 +5'],['act','웨이트 · 끝까지 연습을 마쳤다.'],
  ]);
  assert.equal(lines.find(l=>l.kind==='act')!.time,'3월 1주 · 전반');
});

test('hidden proficiency never shows a number, only a technique marker', () => {
  const s=withLog([{month:4,week:2,title:'타격 훈련',text:'',slot:'second',changes:{proficiency_contact:10,primary_sense:1}}]);
  const text=logLines(s).map(l=>l.text).join('\n');
  assert.match(text,/기술 ▲/);
  assert.doesNotMatch(text,/컨택|10/);
});

test('stress going down counts as a gain and matches are their own category', () => {
  const s=withLog([
    {month:3,week:4,title:'첫 연습경기',text:'청람고 3 : 1',changes:{stress:-5,trust:3}},
    {month:3,week:4,title:'혼자 산책하기',text:'',slot:'weekend',changes:{stress:-40,energy:12}},
  ]);
  const lines=logLines(s);
  assert.deepEqual(filterLines(lines,'match').map(l=>l.kind),['gain','game']);
  assert.equal(filterLines(lines,'condition').length,lines.length);
  assert.deepEqual(lines.find(l=>l.category==='training'&&l.kind==='gain')!.text.split(' · ').sort(),['스트레스 -40','체력 +12'].sort());
});
