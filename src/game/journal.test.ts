import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition,snapshot} from './engine.ts';
import {parseSave} from '../persistence/save.ts';
import {activityRolls,compactJournal,visibleJournal} from './journal.ts';
import type {Action,GameState} from './types.ts';

function step(s:GameState){
 const a:Omit<Action,'revision'>=s.phase==='lineup'?{type:'lineup',supports:['bat_senior','pitch_senior','rival','catcher','manager','classmate']}:
 s.phase==='weekday'?{type:'activity',id:s.energy<25?'rest':'train_sense'}:
 s.phase==='weekend'?{type:'activity',id:'outing'}:
 s.phase==='supportEvent'?{type:'choice',index:0}:s.phase==='roleEvent'?{type:'choice',id:'stay'}:
 s.phase==='match'&&s.match!.awaiting?{type:'delegate'}:{type:'continue'};
 return transition(s,{...a,revision:s.revision});
}

test('stored activity and encounter rolls are deterministic views, including quiet encounters',()=>{
 const outcomes=new Set<string>();
 for(let seed=1;seed<=30;seed++){
  let s=step(createGame('주사위','batter',seed*99991));s.energy=10;
  const before=s;s=transition(s,{type:'activity',id:'train_sense',revision:s.revision});
  const saved=JSON.stringify(s),rolls=activityRolls(s,s.revision);
  assert.equal(rolls.length,2);
  rolls.forEach(r=>outcomes.add(r.outcome));
  assert.equal(s.encounterHistory.length,1);
  assert.deepEqual(activityRolls(parseSave(saved),s.revision),rolls);
  assert.equal(JSON.stringify(s),saved);
  assert.equal(transition(s,{type:'activity',id:'train_sense',revision:before.revision}),s);
  assert.ok(s.log.every(e=>e.id>0&&e.action===s.revision&&e.slot==='first'));
 }
 assert.deepEqual([...outcomes].sort(),['appeared','failure','quiet','success']);
});

test('both roles retain exact growth and failure audits after monthly compaction and resume',()=>{
 for(const role of ['batter','pitcher'] as const){
  let s=createGame('월 요약',role,17),hadSummary=false,failed=0;
  for(let i=0;i<450&&s.phase!=='complete';i++){
   const previous=s;s=step(s);assert.notEqual(s,previous);
   failed+=s.log.filter(e=>e.action===s.revision&&e.training?.outcome==='failure').length;
   assert.deepEqual(parseSave(JSON.stringify(s)),s);
   for(const [key,initial] of Object.entries(s.initial))assert.equal(initial+s.log.reduce((sum,e)=>sum+(e.changes[key]||0),0),snapshot(s)[key]);
   if(s.month>previous.month){
    assert.ok(s.log.some(e=>e.action===s.revision&&e.month===previous.month&&e.slot==='weekend'),'last action remains readable across month boundary');
   }
   const packed=JSON.stringify(s);compactJournal(s);assert.equal(JSON.stringify(s),packed,'compaction is idempotent');
   if(s.log.some(e=>e.summary))hadSummary=true;
  }
  assert.equal(s.phase,'complete');assert.ok(hadSummary);assert.ok(failed>0);
  assert.ok(s.log.length<150);
  assert.equal(s.log.reduce((n,e)=>n+(e.summary?.failedSlots.length??(e.training?.outcome==='failure'&&e.slot!=='weekend'?1:0)),0),failed);
  assert.ok(s.log.every(e=>e.month===s.month||e.summary));
  assert.ok(s.log.some(e=>e.kind==='dialogue'&&e.speaker));
  const broken=structuredClone(s);broken.log[1].id=broken.log[0].id;
  assert.throws(()=>parseSave(JSON.stringify(broken)),/기록/);
  const badMonth=structuredClone(s);badMonth.log.find(e=>e.summary)!.month=s.month;
  assert.throws(()=>parseSave(JSON.stringify(badMonth)),/요약/);
  const duplicateFailure=structuredClone(s),summary=duplicateFailure.log.find(e=>e.summary?.failedSlots.length)!;
  summary.summary!.failedSlots.push({...summary.summary!.failedSlots[0]});
  assert.throws(()=>parseSave(JSON.stringify(duplicateFailure)));
 }
});

test('match journal includes only starts, player duels, scoring plays and results without playback spoilers',()=>{
 let s=createGame('중계','pitcher',8);
 while(!s.match)s=step(s);
 const start=s.log.find(e=>e.category==='match');assert.ok(start);assert.match(start.title,/시작/);
 while(s.phase!=='weekend'&&s.phase!=='roleEvent'){
  if(s.match)assert.ok(visibleJournal(s).filter(e=>e.matchRef?.id===s.match!.id).every(e=>e.matchRef!.index<=s.match!.playbackIndex));
  s=step(s);
 }
 const m=s.match!,entries=s.log.filter(e=>e.matchRef?.id===m.id&&e.title==='경기 장면');
 const relevant=m.feed.filter(p=>p.playerBatter||p.playerPitcher||p.runs>0);
 assert.equal(entries.length,relevant.length);
 assert.ok(s.log.some(e=>e.category==='match'&&/청람고/.test(e.text)&&e.changes.trust));
 assert.ok(visibleJournal(s).some(e=>e.title==='경기에서 배운 것'));
});
