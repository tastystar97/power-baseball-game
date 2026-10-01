import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,transition,snapshot,previewActivity} from './engine.ts';
import {parseSave} from '../persistence/save.ts';
import {defaultSupports} from '../content/supports.ts';
import {activities} from '../content/activities.ts';
import type {GameState,Action,Role} from './types.ts';
import {competitorTrainingFeedback} from './rivalry.ts';

function step(s:GameState,style='training'):GameState {
 const a:Omit<Action,'revision'>=s.phase==='lineup'?{type:'lineup',supports:defaultSupports(s.role)}
 :s.phase==='weekday'?{type:'activity',id:style==='train_intelligence'?'train_intelligence':s.energy<(style==='training'?65:80)?'rest':s.role==='batter'?'train_sense':'train_sense'}
 :s.phase==='weekend'?{type:'activity',id:style==='train_intelligence'?'selfstudy':style==='balanced'&&s.energy>65?'catch':'weekend_rest'}
 :['supportEvent','event','weekendEvent'].includes(s.phase)?{type:'choice',index:0}
 :s.phase==='roleEvent'?{type:'choice',id:'stay'}:s.phase==='match'&&s.match!.awaiting?{type:'tactic',id:s.role==='batter'?'contact':'control'}:{type:'continue'};
 return transition(s,{...a,revision:s.revision});
}
test('weekend practice never repeats weekday competitor growth in training feedback',()=>{
 let s=createGame('피드백','batter',1);s=step(s);
 s=transition(s,{type:'activity',id:'train_sense',revision:s.revision});
 const weekday=s.log.find(l=>l.training)!;
 assert.equal(competitorTrainingFeedback(s,weekday),null);assert.equal(s.competitor.weeks.length,0);
 while(s.phase!=='weekend')s=step(s);
 const before=structuredClone(s.competitor);
 s=transition(s,{type:'activity',id:'practice',target:'primary_sense',revision:s.revision});
 const weekend=[...s.log].reverse().find(l=>l.training)!;
 assert.notEqual(weekday.title,weekend.title);assert.deepEqual(s.competitor,before);
 assert.equal(competitorTrainingFeedback(s,weekend),null);
});
test('switching from study to training can reclaim a starter place for both roles',()=>{
 for(const role of ['batter','pitcher'] as const){
  let reclaimed=0;
  for(let seed=1;seed<=20;seed++){
   let s=createGame('재도전',role,seed);
   while(s.phase!=='complete')s=step(s,s.month<=4?'train_intelligence':'training');
   if(s.selectionHistory.some(h=>h.previous==='junseo'&&h.starter==='player'))reclaimed++;
  }
  console.log(`${role} 학업→훈련 선발 탈환: ${reclaimed}/20`);assert.ok(reclaimed>0);
 }
});
test('120 full seasons preserve every phase, actual haesol history and all rival weeks',()=>{
 const report:Record<string,{starter:number;substitute:number;reserve:number;changes:number;minGap:number;maxGap:number}>={};
 for(const role of ['batter','pitcher'] as const)for(const style of ['training','balanced','train_intelligence'])for(let seed=1;seed<=20;seed++){
  let s=createGame('라이벌',role,seed);const key=`${role}/${style}`;
  const r=report[key]??={starter:0,substitute:0,reserve:0,changes:0,minGap:999,maxGap:-999};
  for(let i=0;i<350&&s.phase!=='complete';i++){
   const loaded=parseSave(JSON.stringify(s)),next=step(s,style);assert.notEqual(next,s);assert.deepEqual(step(loaded,style),next);s=next;
  }
  assert.equal(s.phase,'complete');assert.deepEqual(parseSave(JSON.stringify(s)),s);
  assert.equal(s.competitor.weeks.length,16);assert.equal(s.schedule.filter(w=>w.weekday&&w.weekend).length,16);
  assert.ok(s.selectionHistory.length<=5);assert.equal(s.records.filter(r=>r.match.opponentId==='haesol').length,3);
  for(const row of s.records){r[row.match.appearance]++;assert.equal(new Set(row.match.duels!.map(e=>`${e.half}:${e.order}`)).size,row.match.duels!.length);}
  for(const h of s.selectionHistory){const gap=h.player.total-h.junseo.total;r.minGap=Math.min(r.minGap,gap);r.maxGap=Math.max(r.maxGap,gap);if(h.previous&&h.starter!==h.previous)r.changes++;}
  for(const [k,initial] of Object.entries(s.initial))assert.equal(initial+s.log.reduce((sum,l)=>sum+(l.changes[k]||0),0),snapshot(s)[k]);
 }
 console.log('경쟁 분포:',JSON.stringify(report));
});
test('save rejects invented rival growth, histories and impossible personal duels',()=>{
 let s=createGame('검증','batter',11);
 while(s.phase!=='selection')s=step(s);
 const bad=structuredClone(s);bad.competitor.stats.power++;assert.throws(()=>parseSave(JSON.stringify(bad)));
 const hist=structuredClone(s);hist.selectionHistory.push(hist.selectionHistory[0]);assert.throws(()=>parseSave(JSON.stringify(hist)));
 const future=structuredClone(s);future.selectionHistory[0].previous='player';assert.throws(()=>parseSave(JSON.stringify(future)));
 const duel=structuredClone(s);const m=duel.records.find(r=>r.match.duels!.length>0)!.match;
 m.duels!.push({...m.duels![0]});assert.throws(()=>parseSave(JSON.stringify(duel)));
 const wrong=structuredClone(s);wrong.records[0].match.duels![0].opponent='jihwan';assert.throws(()=>parseSave(JSON.stringify(wrong)));
 const turn=structuredClone(s);turn.records[0].match.duels![0].order=turn.records[0].match.order[1];assert.throws(()=>parseSave(JSON.stringify(turn)));
});
test('shared training failure keeps only the rival weekly plan and success uses preview',()=>{
 for(const role of ['batter','pitcher'] as Role[])for(const energy of [0,100]){
  let s:GameState|undefined;
  for(let seed=1;seed<200;seed++){
   let q=createGame('합동',role,seed);q=transition(q,{type:'lineup',supports:['rival','catcher','manager','bat_senior','pitch_senior','classmate'],revision:q.revision});
   if(activities(q).find(a=>a.id===q.placements.rival)?.training){s=q;break;}
  }
  assert.ok(s);s.energy=energy;const p=previewActivity(s,s.placements.rival)!;
  let next=transition(s,{type:'activity',id:s.placements.rival,revision:s.revision});
  const failed=next.log.find(l=>l.training)?.training?.outcome==='failure';assert.equal(failed,energy===0);
  assert.equal(next.competitor.weeks.length,0);
  while(next.phase==='supportEvent'||next.phase==='supportResult')next=step(next);
  next=transition(next,{type:'activity',id:'rest',revision:next.revision});
  assert.deepEqual(next.competitor.weeks[0].gains,failed?p.competitorGrowth!.failure:p.competitorGrowth!.success);
  assert.equal(next.competitor.weeks[0].sharedPrimary,failed?null:p.competitorGrowth!.sharedPrimary);
  assert.deepEqual(parseSave(JSON.stringify(next)),next);
 }
});
