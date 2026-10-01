import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {createMatch,advanceMatch,chooseTactic,isDecisionPoint,intervene,initializeMatch} from './match.ts';
function state(role:'batter'|'pitcher'='pitcher',duty:'starter'|'middle'|'closer'='middle',seed=93){const s=createGame('선수',role,seed);s.match=createMatch();s.match.pitchingRole=duty;initializeMatch(s);return s;}
test('득점권·중심 타선·라이벌·후반 접전에서 투수의 선택을 받는다',()=>{
 const s=state(),m=s.match!;m.pitcherIds[1]='player';m.entered=true;m.order[0]=0;
 assert.equal(isDecisionPoint(s),false);
 m.bases[1]={id:'r',name:'주자',owner:'opponent',speed:40,responsible:'player'};assert.equal(isDecisionPoint(s),true);m.bases[1]=null;
 for(const slot of [2,3,4]){m.order[0]=slot;assert.equal(isDecisionPoint(s),true);}m.order[0]=0;
 m.inning=7;m.score=[0,2];assert.equal(isDecisionPoint(s),true);m.score=[0,3];assert.equal(isDecisionPoint(s),false);
 m.retired=true;assert.equal(isDecisionPoint(s),false);
});
test('타자 모든 타석, 대타 투입 이후 모든 타석, 마무리 모든 승부에서 선택한다',()=>{
 for(const appearance of ['starter','substitute','reserve'] as const){
  const s=state('batter'),m=s.match!;m.appearance=appearance;m.rosters=null;initializeMatch(s);
  for(let n=0;n<300&&!m.over;n++){advanceMatch(s);if(m.awaiting)chooseTactic(s,'contact');}
  assert.ok(m.over);assert.equal(m.highlights,m.batting.pa);if(appearance==='reserve')assert.equal(m.batting.pa,0);if(appearance==='substitute')assert.ok(m.feed.filter(e=>e.playerBatter).every(e=>e.inning>=7));
 }
 const s=state('pitcher','closer'),m=s.match!;for(let n=0;n<300&&!m.over;n++){advanceMatch(s);if(m.awaiting)chooseTactic(s,'control');}
 assert.ok(m.over);assert.ok(m.entered);assert.equal(m.faced,m.highlights);assert.ok(m.feed.filter(e=>e.playerPitcher).every(e=>e.inning>=9));
});
test('이번 승부는 내가 요청은 아직 계산하지 않은 본인 승부만 멈추고 맡기기는 자동으로 기록한다',()=>{
 const s=state(),m=s.match!;advanceMatch(s);assert.ok(m.playerBoundary);
 const before=m.feed.length;assert.equal(intervene(s),true);assert.equal(m.feed.length,before);assert.ok(m.awaiting);
 assert.ok(chooseTactic(s,'control','auto'));assert.equal(m.skillChecks.at(-1)?.source,'auto');assert.equal(m.highlights,0);
 m.retired=true;assert.equal(intervene(s),false);
});
test('같은 시드의 전체 경기는 같은 이벤트와 점수를 만들며 선택 3회 제한이 없다',()=>{
 const run=()=>{const s=state('batter','middle',93),m=s.match!;for(let n=0;n<300&&!m.over;n++){advanceMatch(s);if(m.awaiting)chooseTactic(s,'contact');}assert.ok(m.over);assert.ok(m.highlights>=4);assert.equal(m.score[0],m.lines[0].reduce((a,b)=>a+b,0));return m;};
 assert.deepEqual(run(),run());
});
