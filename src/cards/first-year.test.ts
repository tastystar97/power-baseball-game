import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {builtinPack} from './builtin.ts';
import {decodePack,encodePack,validatePack} from './pack.ts';
import {skillRequirements} from '../content/skills.ts';
import {createGame} from '../game/engine.ts';
import {previewCard} from './authoring.ts';
const legacy=()=>JSON.parse(readFileSync(new URL('./fixtures/v1.cardpack.json',import.meta.url),'utf8'));
test('새 카드팩은 학년과 1차·종합 조건을 이미지와 함께 왕복한다',()=>{
 assert.equal(builtinPack.version,2);
 assert.deepEqual(decodePack(encodePack(builtinPack)),builtinPack);
 const withoutGrade=structuredClone(builtinPack);delete (withoutGrade.cards[0] as {grade?:number}).grade;
 assert.equal(validatePack(withoutGrade).cards[0].grade,2);
 assert.deepEqual([1,2,3].map(g=>builtinPack.cards.filter(c=>(c as {grade?:number}).grade===g).length),[7,8,3]);
 for(const skill of builtinPack.skills)assert.ok(Object.keys(skill.requires).every(k=>['power','endurance','mental','intelligence','sense','overall'].includes(k)));
});
test('옛 팩은 누락 학년을 2로 읽고 활동·조건·보상을 한 번만 변환한다',()=>{
 const source=legacy(),p=validatePack(source);
 assert.equal(p.version,2);assert.ok(p.cards.every(c=>(c as {grade?:number}).grade===2));
 assert.ok(p.cards.every(c=>Object.values(c.training).flat().every(id=>id==='rest'||id.startsWith('train_'))));
 assert.deepEqual(decodePack(encodePack(p)),p);
 assert.equal(source.version,1);
 const bad=legacy();bad.skills[0].requires={control:60};bad.skills[0].role='batter';assert.throws(()=>validatePack(bad));
 const unknown=legacy();unknown.skills[0].requires={mystery:60};assert.throws(()=>validatePack(unknown));
});
test('스킬은 스트레스나 역할 숙련 대신 영구 1차·종합 기준을 사용한다',()=>{
 const s=createGame('학습','batter');const skill=s.content.skills.find(k=>k.id==='power_drive')!;
 skill.requires={power:500};s.attributes.power=499;
 assert.equal(skillRequirements(s,skill.id)[0].met,false);s.attributes.power=500;
 assert.equal(skillRequirements(s,skill.id)[0].met,true);s.stress=100;
 assert.equal(skillRequirements(s,skill.id)[0].met,true);
 const p=structuredClone(builtinPack);(p.skills[0].requires as Record<string,number>).overall=101;assert.throws(()=>validatePack(p));
 for(const role of ['batter','pitcher'] as const){const preview=previewCard(builtinPack,'rival',role,60,'none');assert.equal(preview.activity.gains.power,49);}
});
