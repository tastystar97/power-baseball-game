import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createDatabase} from './database.ts';
import {newCreation,creationTransition,createPlayer} from '../game/creation.ts';
import type {CreationAction} from '../game/creation.ts';
import {catalogFromPacks} from '../cards/catalog.ts';
import {builtinPack} from '../cards/builtin.ts';
import {parseSave} from './save.ts';
import {createGame} from '../game/engine.ts';
function draft(){
 let d=newCreation(catalogFromPacks([builtinPack]),719);
 const actions:Omit<CreationAction,'revision'>[]=[{type:'identity',name:'보존',role:'pitcher'},{type:'next'},{type:'background',background:{origin:'beginner',body:'ordinary',personality:'calm',specialties:[],weaknesses:[],sportFocus:null}},{type:'next'},{type:'talent'},{type:'next'},{type:'fate'},{type:'next'},{type:'scout'},{type:'revealAll'},{type:'next'}];
 for(const a of actions)d=creationTransition(d,{...a,revision:d.revision});
 d=creationTransition(d,{type:'deck',ids:d.poolIds!.slice(0,6),revision:d.revision});return creationTransition(d,{type:'next',revision:d.revision});
}
test('생성 임시 저장은 진행·제작기와 분리하며 재시작 뒤 굴림·공개·풀을 보존한다',async()=>{
 const factory=new IDBFactory(),db=createDatabase(factory,'creation'),d=draft(),old=createGame('기존','batter');
 await db.saveSession(old);await db.writeDraft('제작기 원문');await db.writeCreation(d);db.close();
 const reopen=createDatabase(factory,'creation');assert.deepEqual(await reopen.readCreation(),d);assert.equal(await reopen.readDraft(),'제작기 원문');
 const loaded=await reopen.loadSession();assert.equal(loaded.kind,'ok');if(loaded.kind==='ok')assert.deepEqual(loaded.state,old);
 await reopen.admitPlayer(createPlayer(d));assert.equal(await reopen.readCreation(),undefined);assert.equal(await reopen.readDraft(),'제작기 원문');reopen.close();
});
test('입학 저장 실패는 기존 세션과 생성 임시 상태를 보존한다',async()=>{
 const db=createDatabase(new IDBFactory(),'invalid-admission'),d=draft(),old=createGame('기존','batter');await db.saveSession(old);await db.writeCreation(d);
 const bad=createPlayer(d);bad.character!.talent.sum++;
 await assert.rejects(db.admitPlayer(bad));assert.deepEqual(await db.readCreation(),d);
 const loaded=await db.loadSession();assert.equal(loaded.kind,'ok');if(loaded.kind==='ok')assert.deepEqual(loaded.state,old);
 const disabled=createDatabase(undefined);await assert.rejects(disabled.writeCreation(d));db.close();
});
test('입학 저장은 배경·등급·횟수·역할 재능·풀 스냅샷의 위조/누락을 거절한다',()=>{
 const s=createPlayer(draft());assert.deepEqual(parseSave(JSON.stringify(s)),s);
 for(const damage of [
  (v:typeof s)=>{v.character!.talent.grade='S';},
  (v:typeof s)=>{v.character!.rerollsRemaining=5;},
  (v:typeof s)=>{v.character!.fate.hidden='batting_sense';},
  (v:typeof s)=>{v.character!.poolIds[0]=v.character!.poolIds[1];},
  (v:typeof s)=>{v.character!.background.origin=null;},
  (v:typeof s)=>{v.initial.primary_power++;},
 ]){const bad=structuredClone(s);damage(bad);assert.throws(()=>parseSave(JSON.stringify(bad)));}
 const missing=JSON.parse(JSON.stringify(s));delete missing.character;assert.throws(()=>parseSave(JSON.stringify(missing)));
});
