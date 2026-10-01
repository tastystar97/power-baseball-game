import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition} from '../game/engine.ts';
import {defaultSupports} from '../content/supports.ts';
import type {Action,GameState} from '../game/types.ts';
import {parseSave,loadGame,SAVE_KEY} from './save.ts';
function next(s:GameState):GameState{
 const action:Omit<Action,'revision'>=s.phase==='lineup'?{type:'lineup',supports:defaultSupports(s.role)}:s.phase==='weekday'?{type:'activity',id:s.energy<60?'rest':s.role==='batter'?'train_sense':'train_sense'}:s.phase==='weekend'?{type:'activity',id:'weekend_rest'}:s.phase==='supportEvent'?{type:'choice',index:0}:s.phase==='roleEvent'?{type:'choice',id:'stay'}:s.phase==='match'&&s.match!.awaiting?{type:'delegate'}:{type:'continue'};
 return transition(s,{...action,revision:s.revision});
}
test('v8는 모든 경기 단계의 이벤트와 난수·기록을 그대로 왕복한다',()=>{
 const phases=new Set<string>();
 for(const role of ['batter','pitcher'] as const){let s=createGame('저장',role,196);for(let i=0;i<500&&s.phase!=='complete';i++){
  const restored=parseSave(JSON.stringify(s));assert.deepEqual(restored,s);phases.add(s.phase);
  const a=next(s),b=next(restored);assert.deepEqual(a,b);assert.notEqual(a,s,`${role} ${s.phase}`);s=a;
 }
 assert.equal(s.phase,'complete');assert.equal(s.version,10);assert.deepEqual(parseSave(JSON.stringify(s)),s);
 assert.ok(s.records.every(r=>r.match.summary&&r.match.feed.every(e=>e.playerBatter||e.playerPitcher)));
 assert.ok(JSON.stringify(s).length<600000);
 }
 assert.ok(phases.has('match')&&phases.has('matchResult')&&phases.has('matchEnd'));
});
test('손상된 점수·주자·이벤트·선수단·재생 위치를 거절한다',()=>{
 let s=createGame('손상','batter',31);for(let n=0;n<90&&s.phase!=='match';n++)s=next(s);assert.equal(s.phase,'match');
 for(const damage of [(v:GameState)=>{v.match!.score[0]++;},(v:GameState)=>{v.match!.feed[0].runs++;},(v:GameState)=>{v.match!.rosters![0].batters.pop();},(v:GameState)=>{v.match!.playbackIndex=1;},(v:GameState)=>{v.match!.pitcherIds[0]='missing';},(v:GameState)=>{v.match!.batting.hits++;}]){
  const bad=structuredClone(s);damage(bad);assert.throws(()=>parseSave(JSON.stringify(bad)));
 }
});
test('반 이닝 재생 확인은 결과나 난수를 바꾸지 않고 v7 원문을 유지한다',()=>{
 let s=createGame('재생','batter',35);for(let n=0;n<90&&s.phase!=='match';n++)s=next(s);
 const index=s.match!.feed.findIndex((e,i)=>i>0&&(e.half!==s.match!.feed[i-1].half||e.inning!==s.match!.feed[i-1].inning));assert.ok(index>0);
 const rng=s.rng,score=[...s.match!.score];s=transition(s,{type:'playback',index,revision:s.revision});assert.equal(s.rng,rng);assert.deepEqual(s.match!.score,score);assert.equal(parseSave(JSON.stringify(s)).match!.playbackIndex,index);
 const raw=JSON.stringify({...s,version:7}),storage=new Map([[SAVE_KEY,raw]]);const result=loadGame({getItem:key=>storage.get(key)??null});assert.equal(result.kind,'invalid');assert.equal(storage.get(SAVE_KEY),raw);
});
