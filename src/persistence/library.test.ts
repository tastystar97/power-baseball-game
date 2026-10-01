import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createDatabase} from './database.ts';
import {builtinPack} from '../cards/builtin.ts';
import {catalogFromPacks} from '../cards/catalog.ts';
import {createGame} from '../game/engine.ts';
const pack=()=>({...structuredClone(builtinPack),id:'testcards',name:'별빛 학교',revision:1});
test('카드팩 등록·중복·충돌·명시적 개정을 원자적으로 처리한다',async()=>{
 const db=createDatabase(new IDBFactory(),'library');const p=pack();
 assert.equal(await db.importPack(p),'added');assert.equal(await db.importPack(p),'duplicate');
 const other=structuredClone(p);other.cards[0].name='다른 이름';await assert.rejects(db.importPack(other),/충돌/);
 other.revision=2;await assert.rejects(db.importPack(other),/갱신 확인/);
 assert.equal(await db.importPack(other,1),'updated');assert.equal((await db.listPacks())[0].cards[0].name,'다른 이름');
 await assert.rejects(db.importPack(p),/낮은 개정/);await assert.rejects(db.importPack({...p,id:'core'}),/기본 팩/);
 const bad=structuredClone(other);bad.revision=3;bad.cards[0].hints.batter='missing';await assert.rejects(db.importPack(bad,2));
 assert.equal((await db.listPacks())[0].revision,2);db.close();
});
test('라이브러리 교체·삭제 후에도 진행 중 덱과 별도 제작 초안은 보존된다',async()=>{
 const factory=new IDBFactory(),db=createDatabase(factory,'snapshots'),p=pack();await db.importPack(p);
 const deck=['bat_senior','pitch_senior','rival','catcher','manager','testcards/sera'];
 const s=createGame('고정 덱','pitcher',9,catalogFromPacks([builtinPack,p]),deck);
 await db.saveSession(s);await db.writeDraft('{"unfinished":true}');await db.removePack(p.id);db.close();
 const reopened=createDatabase(factory,'snapshots');const loaded=await reopened.loadSession();assert.equal(loaded.kind,'ok');if(loaded.kind==='ok')assert.deepEqual(loaded.state,s);
 assert.deepEqual(await reopened.listPacks(),[]);assert.equal(await reopened.readDraft(),'{"unfinished":true}');reopened.close();
});
test('손상된 세션과 저장 불가는 실패를 알리며 원래 진행은 덮어쓰지 않는다',async()=>{
 const db=createDatabase(new IDBFactory(),'fail');const s=createGame('보존','batter');await db.saveSession(s);
 const bad=structuredClone(s);bad.version=6 as never;await assert.rejects(db.saveSession(bad));
 const loaded=await db.loadSession();assert.equal(loaded.kind,'ok');
 const unavailable=createDatabase(undefined,'disabled');await assert.rejects(unavailable.saveSession(s));assert.equal((await unavailable.loadSession()).kind,'unavailable');
 db.close();
});
