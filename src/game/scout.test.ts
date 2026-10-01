import test from 'node:test';
import assert from 'node:assert/strict';
import {drawCards} from './scout.ts';
import {builtinPack} from '../cards/builtin.ts';

test('스카우트는 10/12장을 중복 없이 뽑고 입력과 시드를 보존한다',()=>{
 const library=builtinPack.cards,copy=structuredClone(library);
 for(const count of [10,12]){const ids=drawCards(library,[],count,()=>true,42);assert.equal(ids.length,count);assert.equal(new Set(ids).size,count);assert.deepEqual(ids,drawCards(library,[],count,()=>true,42));}
 assert.deepEqual(library,copy);assert.notDeepEqual(drawCards(library,[],10,()=>true,42),drawCards(library,[],10,()=>true,43));
});
test('부족한 카드·외부 카드·제외 목록·학년 조건을 같은 추첨 함수로 처리한다',()=>{
 const cards=[...builtinPack.cards.slice(0,4),{...builtinPack.cards[4],id:'external/one'}];
 assert.equal(drawCards(cards,[],12,()=>true,8).length,5);
 assert.ok(drawCards(cards,[],12,()=>true,8).includes('external/one'));
 const ids=drawCards(builtinPack.cards,['rival'],100,c=>c.grade<3,8);
 assert.ok(!ids.includes('rival'));assert.ok(ids.every(id=>builtinPack.cards.find(c=>c.id===id)!.grade<3));
 assert.deepEqual(drawCards(cards,cards.map(c=>c.id),10,()=>true,8),[]);
 assert.equal(new Set(drawCards([...cards,cards[0]],[],12,()=>true,8)).size,5);
 assert.throws(()=>drawCards(cards,[],-1,()=>true,8));
});
