import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,previewActivity,transition} from './engine.ts';
import {parseSave} from '../persistence/save.ts';
import {derivedStats,resolveGrowth,proficiencyMultiplier,secondaryKeys,effectiveMental} from './abilities.ts';
import {primaryKeys} from './types.ts';
import {skillRequirements} from '../content/skills.ts';
test('새 선수는 v9 원본 능력과 역할 숙련만 저장하고 구형 진행은 변환하지 않는다',()=>{
 for(const role of ['batter','pitcher'] as const){const s=createGame('선수',role);assert.equal(s.version,9);assert.equal(Object.keys(s.proficiency).length,5);assert.equal('stats' in s,false);assert.deepEqual(parseSave(JSON.stringify(s)),s);}
 assert.throws(()=>parseSave(JSON.stringify({...createGame('선수','batter'),version:8})),/새 게임|지원/);
});
test('스트레스는 멘탈을 쓰는 파생 능력만 낮추고 원본을 바꾸지 않는다',()=>{
 const s=createGame('선수','pitcher'),original=structuredClone(s.attributes),normal=derivedStats(s);s.stress=100;const stressed=derivedStats(s);
 assert.ok(stressed.control<normal.control);assert.ok(stressed.stamina<normal.stamina);assert.equal(stressed.velocity,normal.velocity);assert.deepEqual(s.attributes,original);
 s.stress=0;assert.deepEqual(derivedStats(s),normal);assert.equal(effectiveMental(1500,100),85);
});
test('숙련의 정확한 격차 10과 20은 추가 둔화하지 않고 초과분부터 적용한다',()=>{
 assert.equal(proficiencyMultiplier(50,40),1);assert.equal(proficiencyMultiplier(50.1,40),.5);assert.equal(proficiencyMultiplier(60,40),.5);assert.equal(proficiencyMultiplier(60.1,40),.25);
 const s=createGame('선수','batter');s.proficiency.contact=600;
 const growth=resolveGrowth(s,{sense:20},{contact:10});s.stress=100;assert.deepEqual(resolveGrowth(s,{sense:20},{contact:10}),growth);
});
test('숨긴 숙련은 단계별 곡선과 소수 누적을 적용하고 최소 1을 강제하지 않는다',()=>{
 const s=createGame('성장','pitcher');for(const k of primaryKeys)s.attributes[k]=1500;
 for(const [value,want] of [[590,100],[600,40],[700,22],[800,12],[900,6],[1000,0]]){s.proficiency.control=value;assert.equal(resolveGrowth(s,{}, {control:10}).proficiency.control,want);}
 s.proficiency.control=900;assert.equal(resolveGrowth(s,{}, {control:1}).proficiency.control,1);
});
test('비선형 기반의 실제 격차가 10·20을 조금 넘어도 숙련 둔화를 적용한다',()=>{
 const s=createGame('정밀도','batter');for(const k of primaryKeys)s.attributes[k]=248;
 // Base contact is about 43.6964, so these gaps exceed 10 and 20.
 s.proficiency.contact=537;assert.equal(resolveGrowth(s,{}, {contact:7}).proficiency.contact,35);
 s.proficiency.contact=637;assert.equal(resolveGrowth(s,{}, {contact:7}).proficiency.contact,7);
});
test('1차 성장 곡선 경계와 손해는 정수이며 학년 상한을 넘은 값도 깎지 않는다',()=>{
 const s=createGame('경계','batter');
 for(const [value,want] of [[799,34],[800,29],[999,1],[1000,0],[1300,0]]){s.attributes.power=value;assert.equal(resolveGrowth(s,{power:34}).gains.power,want);}
 s.attributes.mental=8;assert.equal(resolveGrowth(s,{mental:-17}).gains.mental,-8);
});
test('능력과 숙련의 양 끝에서 파생 능력은 정수·상한을 지키고 원본을 보존한다',()=>{
 for(const role of ['batter','pitcher'] as const)for(const primary of [0,1500])for(const prof of [0,1000])for(const stress of [0,100]){
 const s=createGame('경계',role);for(const k of primaryKeys)s.attributes[k]=primary;for(const k of secondaryKeys(role))s.proficiency[k]=prof;s.stress=stress;
 const before=JSON.stringify(s),result=derivedStats(s);for(const k of secondaryKeys(role)){assert.ok(Number.isInteger(result[k]));assert.ok(result[k]>=0&&result[k]<=100);}assert.equal(JSON.stringify(s),before);}
});
test('산책의 일시 회복과 영구 성장은 미리보기와 실제 결과가 일치한다',()=>{
 const s=createGame('산책','batter');s.phase='weekend';s.stress=100;
 const p=previewActivity(s,'outing')!;assert.ok(p.abilityChanges.some(c=>c.condition>0));const n=transition(s,{type:'activity',id:'outing',revision:s.revision});
 for(const c of p.abilityChanges){assert.equal(c.after,derivedStats(n)[c.stat]);assert.equal(c.after-c.before,c.growth+c.condition);}
 assert.equal(n.attributes.mental,277);assert.equal(n.proficiency.contact,420);
});
test('스킬 습득 조건은 일시적인 스트레스에 영향을 받지 않는다',()=>{
 const s=createGame('학습','pitcher');for(const k of primaryKeys)s.attributes[k]=650;for(const k of secondaryKeys(s.role))s.proficiency[k]=650;s.skills=['precision'];
 const before=skillRequirements(s,'efficient_pitch');s.stress=100;assert.deepEqual(skillRequirements(s,'efficient_pitch'),before);
});
