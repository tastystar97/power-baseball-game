import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {primaryGrade,strengthTags} from '../ui/abilityDisplay.ts';

test('ability labels reflect each role’s strongest and weakest skills without numeric ratings',()=>{
 for(const role of ['batter','pitcher'] as const){
  const s=createGame('특징',role);s.attributes={power:500,endurance:500,mental:500,intelligence:500,sense:500};s.stress=0;
  s.proficiency=role==='batter'?{contact:1000,power:900,speed:800,field:700,eye:0}:{velocity:1000,control:900,breaking:800,stamina:700,field:0};
  const before=JSON.stringify(s),tags=strengthTags(s);
  assert.deepEqual(tags.map(t=>t.label),role==='batter'?['컨택이 강점','장타력이 강점','공을 보는 눈이 과제']:['공이 빠름','제구가 정교함','수비가 과제']);
  assert.deepEqual(tags.map(t=>t.kind),['strength','strength','weakness']);
  assert.ok(tags.every(t=>!/[0-9%]/.test(t.label)));assert.equal(JSON.stringify(s),before);
 }
 assert.equal(primaryGrade(0),'G');assert.equal(primaryGrade(1500),'S');assert.equal(primaryGrade(1000),'B');
});
