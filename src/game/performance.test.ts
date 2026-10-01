import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateScore,selectionThresholds} from './competition.ts';
import {createMatch} from './match.ts';
import {createGame} from './engine.ts';
import {derivedStats} from './abilities.ts';
test('같은 비율 성적의 선발·중계·마무리는 근접한 평가를 받는다',()=>{
 const st=derivedStats(createGame('평가','pitcher'));
 const scores=[18,6,3].map(outs=>{const match=createMatch();match.pitching.outs=outs;match.pitching.k=outs/3;match.pitching.hits=outs/3;match.faced=outs+outs/3;return candidateScore('pitcher',st,40,[{month:3,match}]).performance!;});
 assert.ok(Math.max(...scores)-Math.min(...scores)<=2,JSON.stringify(scores));
 assert.deepEqual(selectionThresholds,{starter:65,substitute:52});
});
test('한 타석 홈런과 삼진만으로 평가가 극단으로 이동하지 않는다',()=>{
 const st=derivedStats(createGame('평가','batter'));
 const score=(hit:boolean)=>{const match=createMatch();match.batting.pa=1;match.batting.ab=1;match.batting.hits=hit?1:0;match.batting.hr=hit?1:0;return candidateScore('batter',st,40,[{month:3,match}]).performance!;};
 assert.ok(score(true)-score(false)<=6);assert.ok(score(true)<20);assert.ok(score(false)>5);
});
test('경기 수와 누적 아웃 자체가 성적 보너스가 되지 않으며 빈 기록은 평가에 넣지 않는다',()=>{
 const st=derivedStats(createGame('평가','pitcher'));const match=createMatch();
 assert.equal(candidateScore('pitcher',st,40,[{month:3,match}]).performance,null);
 match.pitching.outs=12;match.pitching.k=4;match.pitching.hits=4;match.pitching.runs=1;match.faced=16;
 const one=candidateScore('pitcher',st,40,[{month:3,match}]).performance!;
 const many=candidateScore('pitcher',st,40,[{month:3,match},{month:4,match},{month:5,match}]).performance!;
 assert.ok(Math.abs(one-many)<=2);
});
