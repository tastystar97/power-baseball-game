import {readDraftPack} from './draft.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newDraft,duplicateCard,deleteCard,previewCard,addSkillPair,setCardImage,setCardSkill} from './authoring.ts';
import {validatePack,encodePack,decodePack} from './pack.ts';
test('카드 복제와 삭제는 스킬·성장 사건 참조를 새 ID로 연결한다',()=>{
 let p=newDraft();const old=p.cards[0].id;p=duplicateCard(p,old,'copy');
 assert.equal(p.cards.length,2);assert.equal(validatePack(p).cards[1].id,'copy');
 assert.ok(p.events.filter(e=>e.owner==='copy').every(e=>!e.previous||e.previous.startsWith('copy_')));
 p=deleteCard(p,old);assert.deepEqual(decodePack(encodePack(p)),p);assert.equal(p.cards.length,1);
});
test('제작 미리 보기는 양 역할의 실제 훈련·경기 계산을 사용한다',()=>{
 const p=newDraft();for(const role of ['batter','pitcher'] as const){const result=previewCard(p,p.cards[0].id,role,60,'upper');assert.ok(result.activity.present.length);assert.equal(result.tactics.length,4);assert.ok(result.tactics.every(t=>Math.abs(t.probabilities.reduce((a,b)=>a+b,0)-1)<1e-9));}
});

test('미완성 이름·수치·훈련 선택 초안도 재개하며 구조 손상은 거부한다',()=>{
 const p=newDraft();p.cards[0].name='';p.cards[0].training.batter=[];p.skills[0].cost=999;
 const raw=JSON.stringify({format:'editor-draft-1',pack:p});assert.deepEqual(readDraftPack(raw),p);
 assert.throws(()=>readDraftPack(JSON.stringify({format:'editor-draft-1',pack:{...p,cards:[{name:8}]}})));
});

test('같은 카드에 역할별 새 구종·타격 계열을 만들어 고유 보상까지 연결한다',()=>{
 let p=newDraft();p=addSkillPair(p,p.cards[0].id,'pitcher','my_pitch');p=addSkillPair(p,p.cards[0].id,'batter','my_swing');
 const c=p.cards[0];assert.notEqual(c.hints.batter,c.hints.pitcher);assert.equal(validatePack(p).skills.length,4);
 for(const role of ['batter','pitcher'] as const)assert.ok(p.events.some(e=>e.choices.every(ch=>ch.unlocks.includes(c.ultimates[role]!))));
});

test('복제한 카드의 그림은 원본 그림 재업로드와 독립적으로 유지된다',()=>{
 const img={mime:'image/png' as const,data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='};
 let p=newDraft();const id=p.cards[0].id;p=setCardImage(p,id,img,'first_image');p=duplicateCard(p,id,'copy');
 const previous=p.cards.find(c=>c.id==='copy')!.portrait!;p=setCardImage(p,id,{...img,data:img.data},'second_image');
 assert.notEqual(p.cards[0].portrait,previous);assert.equal(p.cards[1].portrait,previous);assert.deepEqual(p.images[previous],img);assert.equal(Object.keys(p.images).length,2);
});
test('미완성 카드 삭제는 나머지 초안의 오류와 내용을 그대로 보존한다',()=>{
 let p=newDraft();p=duplicateCard(p,p.cards[0].id,'copy');p.cards[0].name='';p.cards[1].description='';
 p=deleteCard(p,p.cards[0].id);assert.equal(p.cards.length,1);assert.equal(p.cards[0].description,'');assert.ok(p.events.every(e=>e.owner==='copy'));
});
test('스킬 연결 해제는 숨은 사건 보상과 사용하지 않는 정의를 정리한다',()=>{
 let p=newDraft();const id=p.cards[0].id;
 p=setCardSkill(p,id,'batter','ultimates',null);assert.ok(p.skills.some(s=>s.id==='clear_plan'));
 p=setCardSkill(p,id,'pitcher','ultimates',null);assert.ok(!p.skills.some(s=>s.id==='clear_plan'));assert.ok(p.events.every(e=>e.choices.every(c=>c.unlocks.length===0)));assert.doesNotThrow(()=>validatePack(p));
 p=setCardSkill(p,id,'batter','hints',null);p=setCardSkill(p,id,'pitcher','hints',null);assert.equal(p.skills.length,0);assert.doesNotThrow(()=>validatePack(p));
});
