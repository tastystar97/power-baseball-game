import test from 'node:test';
import assert from 'node:assert/strict';
import {newCreation,creationTransition,parseCreation,createPlayer,remainingRerolls,backgroundBudget} from './creation.ts';
import type {CreationDraft,CreationAction} from './creation.ts';
import {catalogFromPacks} from '../cards/catalog.ts';
import {builtinPack} from '../cards/builtin.ts';
import {rollTalent} from './character.ts';
import type {BackgroundChoice} from './character.ts';
import {resolveGrowth,derivedStats} from './abilities.ts';
import {previewActivity,transition} from './engine.ts';
import {parseSave} from '../persistence/save.ts';
import {loadLimit} from './match.ts';
import {createMatch,advanceMatch,chooseTactic,plateContext} from './match.ts';
import {recoveryStress} from './character.ts';

const content=catalogFromPacks([builtinPack]);
const basic:BackgroundChoice={origin:'regular',body:'ordinary',personality:'calm',specialties:[],weaknesses:[],sportFocus:null};
const act=(s:CreationDraft,a:Omit<CreationAction,'revision'>)=>creationTransition(s,{...a,revision:s.revision});
function prepared(seed=42,role:'batter'|'pitcher'='batter',background=basic){
 let s=newCreation(content,seed);s=act(s,{type:'identity',name:'신입',role});s=act(s,{type:'next'});s=act(s,{type:'background',background,confirmed:true});s=act(s,{type:'next'});return s;
}
function finished(seed=42,role:'batter'|'pitcher'='batter',background=basic){
 let s=prepared(seed,role,background);s=act(s,{type:'talent'});s=act(s,{type:'next'});s=act(s,{type:'fate'});s=act(s,{type:'next'});s=act(s,{type:'scout'});s=act(s,{type:'revealAll'});s=act(s,{type:'next'});s=act(s,{type:'deck',ids:s.poolIds!.slice(0,6)});return act(s,{type:'next'});
}
test('일곱 단계는 선행 결과·편성·입학을 검사하고 두 역할 모두 저장 왕복한다',()=>{
 const empty=newCreation(content,7);assert.equal(act(empty,{type:'next'}),empty);assert.throws(()=>createPlayer(empty));
 for(const role of ['batter','pitcher'] as const){const d=finished(42,role);assert.equal(d.step,6);assert.deepEqual(parseCreation(JSON.stringify(d)),d);
  const s=createPlayer(d);assert.equal(s.role,role);assert.equal(s.phase,'weekday');assert.equal(s.character!.pool.cards.length,10);assert.equal(s.content.cards.length,6);
  assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.equal(s.initial.primary_power,s.attributes.power);
  assert.throws(()=>parseSave(JSON.stringify({...s,version:10})));
 }
});
test('다시 굴리기는 3회/5회이며 옛 revision과 재개가 추가 결과를 만들지 않는다',()=>{
 for(const specialties of [[],['confidence']]){let s=prepared(41,'batter',{...basic,specialties});s=act(s,{type:'talent'});
  const max=specialties.length?5:3;
  for(let i=0;i<max;i++){const old=s;s=act(s,{type:'reroll'});assert.equal(s.talentIndex,i+1);assert.equal(creationTransition(s,{type:'reroll',revision:old.revision}),s);s=parseCreation(JSON.stringify(s));}
  assert.equal(remainingRerolls(s),0);assert.equal(act(s,{type:'reroll'}),s);
 }
});
test('배경 변경은 확인 후 결과를 비우고 D 포인트·시드·소비한 횟수는 중복되지 않는다',()=>{
 const seed=Array.from({length:500},(_,i)=>i+1).find(n=>rollTalent(n,0).grade==='D')!;
 let d=finished(seed);d=act(d,{type:'back',step:1});const changed={...basic,specialties:['network']};
 assert.equal(act(d,{type:'background',background:changed}),d);
 const old=d;d=act(d,{type:'background',background:changed,confirmed:true});
 assert.equal(d.talent,null);assert.equal(d.fate,null);assert.equal(d.poolIds,null);assert.equal(d.deck.length,0);assert.equal(backgroundBudget(d).budget,12);
 d=act(d,{type:'next'});d=act(d,{type:'talent'});assert.deepEqual(d.talent,old.talent);assert.equal(remainingRerolls(d),3);
 d=act(d,{type:'back',step:0});assert.equal(act(d,{type:'identity',name:'신입',role:'pitcher'}),d);
});
test('카드 공개·추천 편성은 뽑힌 풀로 한정되고 위조된 재능/풀 저장은 거절한다',()=>{
 let d=finished(62,'pitcher',{...basic,specialties:['network']});assert.equal(d.poolIds!.length,12);
 const outside=content.cards.find(c=>!d.poolIds!.includes(c.id))!.id;
 d=act(d,{type:'back',step:5});assert.equal(act(d,{type:'deck',ids:[outside,...d.deck.slice(1)]}),d);
 const corrupted=structuredClone(d);corrupted.talent!.grade='S';if(d.talent!.grade==='S')corrupted.talent!.grade='D';
 assert.throws(()=>parseCreation(JSON.stringify(corrupted)));
 assert.throws(()=>parseCreation(JSON.stringify({...d,poolIds:[outside,...d.poolIds!.slice(1)]})));
});
test('재능 성장·S 상한·배경 효율·숨은 재능은 실제 성장과 미리보기에 적용된다',()=>{
 const dSeed=Array.from({length:500},(_,i)=>i+1).find(n=>rollTalent(n,0).grade==='D')!,sSeed=Array.from({length:500},(_,i)=>i+1).find(n=>rollTalent(n,0).grade==='S')!;
 const d=createPlayer(finished(dSeed)),s=createPlayer(finished(sSeed));
 assert.equal(resolveGrowth(d,{power:100}).gains.power,92);assert.equal(resolveGrowth(s,{power:100}).gains.power,115);
 s.attributes.power=1049;assert.equal(resolveGrowth(s,{power:100}).gains.power,1);s.attributes.power=1050;assert.equal(resolveGrowth(s,{power:100}).gains.power,0);
 const poor=createPlayer(finished(42,'batter',{...basic,weaknesses:['poor_study']}));poor.placements={};const normal=structuredClone(poor);normal.character!.background.weaknesses=[];
 assert.ok(previewActivity(poor,'train_intelligence')!.gains.intelligence!<previewActivity(normal,'train_intelligence')!.gains.intelligence!);
 const optimistic=createPlayer(finished(42,'batter',{...basic,personality:'optimistic'}));optimistic.placements={};optimistic.stress=80;
 assert.equal(previewActivity(optimistic,'rest')!.stress,-17);
 const rested=transition(optimistic,{type:'activity',id:'rest',revision:0});assert.equal(rested.stress,63);
 const p=createPlayer(finished(42,'pitcher'));const limit=loadLimit(p);p.character!.fate.hidden='rubber_arm';assert.ok(Math.abs(loadLimit(p)-limit*1.1)<1e-9);
 p.character!.fate.hidden=null;p.stress=90;const mental=derivedStats(p).mental;p.character!.fate.hidden='iron_heart';assert.equal(derivedStats(p).mental,mental+6);
});
test('무대 공포는 공식전의 실제 첫 출전에서 한 번만 적용되고 벤치/연습경기는 제외한다',()=>{
 for(const role of ['batter','pitcher'] as const){
  const make=()=>createPlayer(finished(55,role,{...basic,weaknesses:['stage_fright']}));
  const s=make();s.month=4;s.match={...createMatch('starter'),id:'april',opponentId:'haesol',pitchingRole:'starter'};s.phase='match';
  advanceMatch(s);assert.equal(s.stress,20);const before=s.stress;
  if(s.match.awaiting)chooseTactic(s,role==='batter'?'contact':'control');advanceMatch(s);assert.equal(s.stress,before);
  for(const [month,appearance] of [[3,'starter'],[4,'reserve']] as const){const excluded=make();excluded.month=month;excluded.match={...createMatch(appearance),id:'excluded',opponentId:'haesol'};advanceMatch(excluded);assert.equal(excluded.stress,15);}
 }
});

test('무대 공포는 선발·교체 출전의 실제 경기 능력에 반영되며 재개 후 중복되지 않는다',()=>{
 for(const role of ['batter','pitcher'] as const)for(const appearance of ['starter','substitute'] as const){
  let s=createPlayer(finished(55,role,{...basic,weaknesses:['stage_fright']}));s.stress=60;
  s.month=4;s.match={...createMatch(appearance),id:'april',opponentId:'haesol',pitchingRole:'starter'};s.phase='match';
  for(let n=0;n<250&&s.stress===60&&!s.match.over;n++){if(s.match.awaiting)chooseTactic(s,role==='batter'?'contact':'control');else advanceMatch(s);}
  assert.equal(s.stress,65);
  const ctx=plateContext(s),player=role==='batter'?ctx.batter:ctx.pitcher;
  assert.equal(player.id,'player');assert.deepEqual(player.ratings,derivedStats(s));
  // Keep the entry marker and roster through serialization; season tests cover full save validation.
  s=JSON.parse(JSON.stringify(s));
  if(s.match!.awaiting)chooseTactic(s,role==='batter'?'contact':'control');advanceMatch(s);
  assert.equal(s.stress,65);assert.equal(s.log.filter(e=>e.title==='첫 승부의 긴장').length,1);
 }
});

test('생성한 두 역할의 훈련·균형·학업 육성은 6월까지 매 전이 저장·재개하며 완료한다',()=>{
 for(const role of ['batter','pitcher'] as const)for(const policy of ['training','balanced','study']){
  let s=createPlayer(finished(55,role,{...basic,weaknesses:['stage_fright']})),count=0,slot=0;
  while(s.phase!=='complete'&&count++<500){
   const rotation=['power','sense','endurance','mental','intelligence'];
   const action=s.phase==='weekday'?{type:'activity' as const,id:s.energy<45?'rest':policy==='study'?'train_intelligence':`train_${rotation[slot++%rotation.length]}`}:
    s.phase==='weekend'?{type:'activity' as const,id:s.energy<50?'weekend_rest':policy==='study'?'selfstudy':policy==='training'?'catch':'weekend_rest'}:
    s.phase==='supportEvent'?{type:'choice' as const,index:0}:
    s.phase==='roleEvent'?{type:'choice' as const,id:'stay'}:
    s.phase==='match'&&s.match!.awaiting?{type:'delegate' as const}:{type:'continue' as const};
   const next=transition(s,{...action,revision:s.revision});assert.notEqual(next,s,`${role}/${policy}/${s.phase}`);
   s=parseSave(JSON.stringify(next));
  }
  assert.equal(s.phase,'complete');assert.equal(s.month,6);assert.equal(s.week,4);
  assert.equal(s.character!.talent.grade,rollTalent(55,0).grade);
  assert.equal(s.supports.length,6);assert.equal(s.character!.poolIds.length,10);
 }
});
