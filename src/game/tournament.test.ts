import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition} from './engine.ts';
import {createMatch,tactics,advanceMatch,chooseTactic} from './match.ts';
import {finishRound,pairings,matchPlan,tournamentResult,winner,weekTitle} from './season.ts';
import {currentEvent} from '../content/events.ts';
import {evaluateSelection} from './competition.ts';
import {parseSave,saveGame,loadGame,SAVE_KEY} from '../persistence/save.ts';
import {readFileSync} from 'node:fs';
import {defaultSupports} from '../content/supports.ts';
import type {GameState,Action} from './types.ts';

function auto(s:GameState){
  const a:Omit<Action,'revision'>=s.phase==='lineup'?{type:'lineup',supports:defaultSupports(s.role)}:s.phase==='weekday'?{type:'activity',id:s.energy<65?'rest':s.role==='batter'?'batting':'control'}:s.phase==='weekend'?{type:'activity',id:'weekend_rest'}:['event','weekendEvent','supportEvent'].includes(s.phase)?{type:'choice',index:0}:s.phase==='roleEvent'?{type:'choice',id:'stay'}:s.phase==='match'&&s.match!.awaiting?{type:'tactic',id:s.role==='batter'?'contact':'control'}:{type:'continue'};
  return transition(s,{...a,revision:s.revision});
}
test('bracket advancement uses actual results, eliminates once, and completes all other games without consuming play RNG',()=>{
  for(const loseAt of [1,2,3,4]){
    const s=createGame('대회','batter',71);s.month=6;
    for(let round=1;round<=3;round++){
      s.week=round+1;
      const plan=matchPlan(s);
      if(round<=loseAt){
        assert.ok(plan);const m=createMatch();m.id=plan.id;m.opponentId=plan.opponentId;m.over=true;
        m.score=round===loseAt?[5,2]:[1,6];s.records.push({month:6,match:m});
      }else assert.equal(plan,null);
      const rng=s.rng;finishRound(s);assert.equal(s.rng,rng);
      const before=structuredClone(s);finishRound(s);assert.deepEqual(s,before);
      assert.equal(s.tournament.rounds[round-1].games.length,2**(3-round));
    }
    assert.equal(tournamentResult(s),loseAt===4?'우승':loseAt===3?'준우승':loseAt===2?'4강 탈락':'8강 탈락');
    assert.equal(winner(s.tournament.rounds[2].games[0])==='cheongram',loseAt===4);
    assert.equal(pairings(s,3).length,1);
  }
});
test('future tournament weeks show advancement conditions until an actual loss is recorded',()=>{
  const s=createGame('대진','pitcher',71);s.month=6;s.week=1;
  assert.match(weekTitle(s,3),/진출 시/);assert.match(weekTitle(s,4),/진출 시/);
  assert.ok(!weekTitle(s,3).includes('탈락'));
  s.week=2;const plan=matchPlan(s)!;const m={...createMatch(),id:plan.id,opponentId:plan.opponentId};m.score=[5,2];m.over=true;
  s.records.push({month:6,match:m});finishRound(s);
  assert.match(weekTitle(s,3),/탈락 후/);
});
test('efficient pitching replaces precision and clamps the remaining walk probability',()=>{
  const s=createGame('제구','pitcher',1);s.match=createMatch();s.skills=['precision'];
  const base=tactics(s).find(t=>t.id==='control')!;s.skills.push('efficient_pitch');
  const result=tactics(s).find(t=>t.id==='control')!;
  assert.ok(result.probabilities[2]<=base.probabilities[2]);
  assert.ok(result.burden<base.burden);
  s.skills=['efficient_pitch'];const standalone=tactics(s).find(t=>t.id==='control')!;
  assert.deepEqual(standalone.probabilities,result.probabilities);
  s.skills=[];assert.ok(standalone.probabilities[2]<tactics(s).find(t=>t.id==='control')!.probabilities[2]);
});
test('every summer phase and each elimination outcome can resume with identical next action',()=>{
  const outcomes=new Set<string>();
  for(const seed of [...Array.from({length:32},(_,i)=>i+1),36]){
    let s=createGame('대회','pitcher',seed);
    for(let step=0;step<350&&s.phase!=='complete';step++){
      if(s.month===6){assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.deepEqual(auto(parseSave(JSON.stringify(s))),auto(s));}
      s=auto(s);
    }
    assert.equal(s.phase,'complete');assert.equal(s.schedule.length,16);assert.ok(s.schedule.every(w=>w.weekday&&w.weekend));
    assert.deepEqual(parseSave(JSON.stringify(s)),s);outcomes.add(tournamentResult(s));
  }
  assert.deepEqual([...outcomes].sort(),['8강 탈락','4강 탈락','준우승','우승'].sort());
});
test('corrupt, future, repeated and inconsistent tournament records are rejected',()=>{
  let s=createGame('대회','batter',71);for(let n=0;n<350&&s.phase!=='complete';n++)s=auto(s);
  const wrongPair=structuredClone(s);wrongPair.tournament.rounds[1].games[0].home='cheongram';wrongPair.tournament.rounds[1].games[0].away='cheongram';
  const wrongScore=structuredClone(s);wrongScore.tournament.rounds[0].games[0].homeScore++;
  const duplicate=structuredClone(s);duplicate.records.push(structuredClone(duplicate.records[0]));
  const missing=structuredClone(s);missing.tournament.rounds.pop();
  for(const bad of [wrongPair,wrongScore,duplicate,missing])assert.throws(()=>parseSave(JSON.stringify(bad)));
  const early=createGame('대회','batter',1);early.tournament=s.tournament;assert.throws(()=>parseSave(JSON.stringify(early)));
});
test('May and June use equipped card encounters and do not reintroduce scheduled club events',()=>{
 let s=createGame('새달','pitcher',71),seen=0;
 for(let n=0;n<350&&s.phase!=='complete';n++){
  if(s.month>=5){assert.notEqual(s.phase,'event');assert.notEqual(s.phase,'eventResult');
   if(s.phase==='supportEvent'){assert.ok(s.activeSupport&&s.supports.includes(s.activeSupport));assert.ok(currentEvent(s).choices.length);seen++;}}
  s=auto(s);
 }
 assert.ok(seen>0);assert.equal(s.phase,'complete');
});
test('opponent strengths change real tactic probabilities and matching approaches soften them',()=>{
  for(const role of ['batter','pitcher'] as const){
    const s=createGame('분석',role,1);s.match={...createMatch(),opponentId:'haesol'};
    const base=tactics(s);s.match.opponentId=role==='batter'?'hanbit':'taeyang';
    const changed=tactics(s);
    assert.notDeepEqual(changed[0].probabilities,base[0].probabilities);
    assert.ok(changed.every(t=>Math.abs(t.probabilities.reduce((a,b)=>a+b,0)-1)<1e-9));
    assert.match(changed[0].reason,role==='batter'?/한빛고/:/태양고/);
  }
});
test('efficient pitching also reduces real load in automatic plate appearances',()=>{
  const s=createGame('투구','pitcher',21);s.match=createMatch();s.match.pitchingRole='starter';
  const skilled=structuredClone(s);skilled.skills=['efficient_pitch'];
  for(const state of [s,skilled]){while(state.match!.skillChecks.length<3&&!state.match!.over){advanceMatch(state);if(state.match!.awaiting)chooseTactic(state,'control','auto');}}
  assert.ok(skilled.match!.load<s.match.load);assert.ok(skilled.match!.skillChecks.every(e=>e.source==='auto'));
});
test('later selection uses recent performance rather than only the March record',()=>{
  const s=createGame('평가','batter',1);s.month=5;
  const a=createMatch(),b=createMatch();a.id='m3-w4';b.id='m4-w4';a.batting.pa=4;a.batting.ab=4;a.batting.hits=0;b.batting.pa=6;b.batting.ab=4;b.batting.hits=4;b.batting.walks=2;
  s.records=[{month:3,match:a}];const before=evaluateSelection(s).performance;s.records.push({month:4,match:b});assert.ok(evaluateSelection(s).performance>before);
});
