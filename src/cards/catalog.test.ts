import {test} from 'node:test';
import assert from 'node:assert/strict';
import {builtinPack} from './builtin.ts';
import {catalogFromPacks,catalogForDeck} from './catalog.ts';
import {validatePack,encodePack,decodePack,subsetPack} from './pack.ts';

test('기본 카드마다 이미지 없이도 두 역할의 훈련·고유 보상이 왕복된다',()=>{
  const pack=validatePack(builtinPack);
  for(const card of pack.cards){
    const one=decodePack(encodePack(subsetPack(pack,[card.id])));
    assert.equal(one.cards[0].name,card.name);
    assert.equal(one.events.filter(e=>e.kind==='growth').length,3);
    for(const role of ['batter','pitcher'] as const){
      assert.ok(card.training[role].length);
      if(card.ultimates[role])assert.ok(one.events.some(e=>e.choices.every(c=>c.unlocks.includes(card.ultimates[role]!))));
    }
  }
});
test('팩 이름공간은 같은 내부 카드 ID를 구분하고 육성 덱 스냅샷을 고정한다',()=>{
  const extra={...structuredClone(builtinPack),id:'custom',name:'내 카드팩'};
  const catalog=catalogFromPacks([builtinPack,extra]);
  assert.ok(catalog.cards.some(c=>c.id==='bat_senior'));assert.ok(catalog.cards.some(c=>c.id==='custom/bat_senior'));
  const ids=['bat_senior','pitch_senior','rival','catcher','manager','custom/sera'];
  const snapshot=catalogForDeck(catalog,ids);
  assert.equal(snapshot.cards.length,6);assert.ok(snapshot.events.every(e=>ids.includes(e.owner)));
  assert.ok(snapshot.skills.some(s=>s.owner==='custom/sera'));
  catalog.cards.find(c=>c.id==='custom/sera')!.name='수정됨';
  assert.equal(snapshot.cards.find(c=>c.id==='custom/sera')!.name,'정세라');
  assert.throws(()=>catalogForDeck(catalog,[...ids.slice(0,5),'bat_senior']));
  assert.throws(()=>catalogForDeck(catalog,ids.slice(0,5)));
});

test('이미지 이름공간은 밑줄을 포함한 팩 ID와 파일 이름도 충돌하지 않는다',()=>{
 const a=structuredClone(builtinPack),b=structuredClone(builtinPack);
 a.id='aaa';b.id='aaa__bbb';const png={mime:'image/png' as const,data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='};
 a.images={'bbb__portrait.png':png};a.cards[0].portrait='bbb__portrait.png';b.images={'portrait.png':png};b.cards[0].portrait='portrait.png';
 const catalog=catalogFromPacks([a,b]);assert.equal(Object.keys(catalog.images).length,2);assert.notEqual(catalog.cards[0].portrait,catalog.cards[18].portrait);
});
