import test from 'node:test';
import assert from 'node:assert/strict';
import {createScoreState,applyPlay,advanceHalf,enterPitcher,leavePitcher,finishPitching,stealPlay} from './scoring.ts';
import {createPlay} from './plate.ts';
import type {PlateContext,PlateOutcome,BaseRunner} from './plate.ts';
import {rosterFor} from './roster.ts';
import {createGame} from './engine.ts';
const runner=(id:string,responsible:string|null='player'):BaseRunner=>({id,name:id,owner:'player',speed:60,responsible});
function setup(half:0|1=1){
 const s=createGame('기록','batter',77),h=rosterFor('cheongram',s),a=rosterFor('haesol',s),m=createScoreState();m.half=half;
 const ctx:PlateContext={batter:h.batters[7],pitcher:{...a.pitchers[0],id:'player'},fielders:a.batters,inning:1,half,order:0,outs:0,bases:[null,null,null],score:[0,0],energy:100,load:0,playerBatter:half===1,playerPitcher:half===0,source:'manual',effects:[]};
 return {m,ctx};
}
function play(result:PlateOutcome,baseIndices:number[],outs=0,half:0|1=1){
 const {m,ctx}=setup(half);m.outs=ctx.outs=outs;for(const i of baseIndices)m.bases[i]=ctx.bases[i]=runner(`r${i}`);
 const e=createPlay(ctx,'contact',{outcome:result,ball:null,direction:null,fielder:null},()=>.99);applyPlay(m,e);return {m,e};
}
test('결과 표에 따라 아웃·진루·타수·안타·타점이 일관된다',()=>{
 for(const [result,ab,hits,outs,runs,rbi] of [
  ['strikeout',1,0,1,0,0],['walk',0,0,0,1,1],['hitByPitch',0,0,0,1,1],['doublePlay',1,0,2,1,0],['sacrificeFly',0,0,1,1,1],['sacrificeBunt',0,0,1,1,1],['infieldSingle',1,1,0,1,1],['single',1,1,0,1,1],['double',1,1,0,2,2],['triple',1,1,0,3,3],['homer',1,1,0,4,4],['error',1,0,0,1,0],
 ] as const){const {m,e}=play(result,[0,1,2]);assert.deepEqual([m.batting.ab,m.batting.hits,m.outs,m.score[1],m.batting.rbi],[ab,hits,outs,runs,rbi],result);assert.equal(e.runs,runs);}
 const {m}=play('doublePlay',[0,2],1);assert.equal(m.outs,3);assert.equal(m.score[1],0);
});
test('볼넷은 강제 진루만 적용하고 두 아웃 희생 판정은 분포에서 막는다',()=>{
 const {m}=play('walk',[1,2]);assert.equal(m.score[1],0);assert.equal(m.bases[1]?.id,'r1');assert.equal(m.bases[2]?.id,'r2');
});
test('승계 주자는 출루시킨 투수에게 실점, 승부치기 주자는 개인 실점 제외',()=>{
 const {m,ctx}=setup(0);m.bases=ctx.bases=[runner('old'),runner('tie',null),null];ctx.playerPitcher=false;ctx.pitcher.id='reliever';
 applyPlay(m,createPlay(ctx,'control',{outcome:'double',ball:'line',direction:'left',fielder:null},()=>.99));
 assert.equal(m.score[0],1);assert.equal(m.pitching.runs,0);
 const second={...ctx,bases:m.bases,score:m.score,order:m.order[0]};applyPlay(m,createPlay(second,'control',{outcome:'triple',ball:'line',direction:'right',fielder:null},()=>.99));
 assert.equal(m.pitching.runs,1);
});
test('끝내기 안타는 결승 득점에 멈추고 홈런은 모든 득점을 인정한다',()=>{
 for(const result of ['double','homer'] as const){const {m,ctx}=setup();m.inning=ctx.inning=9;m.bases=ctx.bases=[runner('a'),runner('b'),runner('c')];applyPlay(m,createPlay(ctx,'power',{outcome:result,ball:'fly',direction:'left',fielder:null},()=>.99));advanceHalf(m);assert.equal(m.over,true);assert.equal(m.score[1],result==='homer'?4:1);}
 const {m}=setup(0);m.inning=9;m.outs=3;m.score=[2,3];advanceHalf(m);assert.equal(m.over,true);assert.equal(m.half,0);
});
test('자동 도루 실패는 타석·타수 없이 아웃과 주자만 바꾼다',()=>{
 const {m,ctx}=setup(0);m.bases=ctx.bases=[runner('stealer'),null,null];m.outs=ctx.outs=2;
 const e=stealPlay(ctx,false);applyPlay(m,e);assert.equal(m.outs,3);assert.equal(m.order[0],0);assert.equal(m.faced,0);assert.equal(m.pitching.outs,1);
});
test('세이브·홀드·블론은 등판과 교체 상황 및 실제 아웃으로 판정한다',()=>{
 const {m}=setup(0);m.inning=9;m.score=[2,3];enterPitcher(m,1,'player',false);m.pitching.outs=3;m.pitcherLines.player.outs=3;finishPitching(m);assert.equal(m.pitching.sv,1);assert.equal(m.pitching.hold,0);
 const hold=setup(0).m;hold.score=[1,3];enterPitcher(hold,1,'player',false);hold.pitcherLines.player.outs=2;leavePitcher(hold,'player');assert.equal(hold.pitching.hold,1);
 const blown=setup(0);blown.m.score=blown.ctx.score=[2,3];enterPitcher(blown.m,1,'player',false);applyPlay(blown.m,createPlay(blown.ctx,'control',{outcome:'homer',ball:'fly',direction:'left',fielder:null},()=>.5));assert.equal(blown.m.pitching.bs,1);finishPitching(blown.m);assert.equal(blown.m.pitching.sv,0);
});
