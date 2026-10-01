import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,advanceMatch,chooseTactic,initializeMatch} from './match.ts';
import {createGame} from './engine.ts';
import {identifyDuel,duelEntry,summarizeDuels,duelDialogue} from './rivalry.ts';
import type {Outcome} from './types.ts';
test('named opponents follow actual innings, batting order and appearances',()=>{
 const s=createGame('대결','batter',7);s.match=createMatch();const m=s.match;m.opponentId='haesol';initializeMatch(s);m.half=1;m.inning=6;
 assert.equal(identifyDuel('batter',m,true),'taeo');m.inning=7;assert.equal(identifyDuel('batter',m,true),'taeo');m.pitcherIds[0]='haesol_p2';assert.equal(identifyDuel('batter',m,true),null);
 m.half=0;m.order[0]=3;assert.equal(identifyDuel('pitcher',m,true),'jihwan');
 m.order[0]=12;assert.equal(identifyDuel('pitcher',m,true),'jihwan');m.order[0]=4;assert.equal(identifyDuel('pitcher',m,true),null);
 m.order[0]=3;m.retired=true;assert.equal(identifyDuel('pitcher',m,true),null);
 m.retired=false;m.opponentId='bada';assert.equal(identifyDuel('pitcher',m,true),null);
 m.opponentId='haesol';assert.equal(identifyDuel('pitcher',m,false),null);
 m.appearance='reserve';assert.equal(identifyDuel('pitcher',m,true),null);
 m.appearance='substitute';m.inning=6;assert.equal(identifyDuel('pitcher',m,true),null);
});
test('duel summaries keep walks and sacrifices distinct from at bats and missing history',()=>{
 const m=createMatch();m.half=1;m.inning=3;m.order[1]=4;
 const outcomes:Outcome[]=['single','walk','strikeout','sacrificeBunt','homer'];
 const entries=outcomes.map((o,i)=>{m.order[1]=4+i*9;return duelEntry(m,'taeo','contact','manual',o);});
 assert.equal(entries[0].order,4);assert.equal(entries[0].inning,3);
 assert.deepEqual(summarizeDuels(entries),{ab:3,hits:2,hr:1,walks:1,k:1,sacrifices:1});
 for(const role of ['batter','pitcher'] as const){
  const text=duelDialogue(role,entries);
  assert.match(text,role==='batter'?/1홈런/:/1피홈런/);assert.match(text,/1희생번트/);
 }
 assert.match(duelDialogue('batter',null),/세부 기록 없음/);assert.match(duelDialogue('batter',[]),/대결 없음/);
});
test('actual manual and auto duels are reproducible with the same random state',()=>{
 let manual=0,auto=0;
 for(const role of ['batter','pitcher'] as const)for(const appearance of ['starter','substitute','reserve'] as const)for(let seed=1;seed<=8;seed++){
  const tracked=createGame('대결',role,seed);tracked.match={...createMatch(appearance),opponentId:'haesol'};
  const old=structuredClone(tracked);
  for(const s of [tracked,old])for(let turn=0;turn<300&&!s.match!.over;turn++){
   advanceMatch(s);if(s.match!.awaiting)chooseTactic(s,role==='batter'?'contact':'control',seed%2?'manual':'auto');
  }
  assert.ok(tracked.match.over);assert.deepEqual(tracked.match.score,old.match!.score);assert.equal(tracked.rng,old.rng);
  assert.deepEqual(tracked.match.batting,old.match!.batting);assert.deepEqual(tracked.match.pitching,old.match!.pitching);assert.equal(tracked.match.load,old.match!.load);
  const entries=tracked.match.duels!;assert.ok(Array.isArray(entries));assert.equal(new Set(entries.map(e=>`${e.half}:${e.order}`)).size,entries.length);
  for(const e of entries){assert.equal(e.half,role==='batter'?1:0);if(role==='pitcher')assert.equal(e.order%9,3);assert.ok(tracked.match.feed.some(p=>p.order===e.order&&p.half===e.half&&(role==='batter'?p.pitcher.id==='taeo':p.batter.id==='jihwan')));}
  manual+=entries.filter(e=>e.source==='manual').length;auto+=entries.filter(e=>e.source==='auto').length;
  if(appearance==='reserve')assert.equal(entries.length,0);
 }
 assert.ok(manual>0);assert.ok(auto>0);
});
