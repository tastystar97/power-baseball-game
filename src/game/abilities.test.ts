import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {parseSave} from '../persistence/save.ts';
import {baseStats,derivedStats,effectiveMental,resolveGrowth,proficiencyMultiplier,secondaryKeys} from './abilities.ts';
import {primaryKeys} from './types.ts';
import {previewActivity,transition} from './engine.ts';
import {skillRequirements} from '../content/skills.ts';

test('새 선수는 v6의 1차 능력과 역할 숙련만 저장한다',()=>{
 for(const role of ['batter','pitcher'] as const){
  const s=createGame('선수',role);
  assert.equal(s.version,7);
  const raw=JSON.parse(JSON.stringify(s));
  assert.deepEqual(raw.attributes,{power:35,endurance:35,mental:40,intelligence:45,sense:35});
  assert.equal(Object.keys(raw.proficiency).length,5);
  assert.equal('stats' in raw,false);
  assert.equal('intelligence' in raw,false);
 }
});
test('이전 버전은 자동 변환하지 않는다',()=>{
 const raw=JSON.stringify({...createGame('선수','batter'),version:5});
 assert.throws(()=>parseSave(raw),/새 게임|지원/);
});

test('역할별 시작 야구 능력과 기반 가중치가 설계값과 일치한다',()=>{
 const b=createGame('타자','batter'),p=createGame('투수','pitcher');
 assert.deepEqual(secondaryKeys(b.role).map(k=>derivedStats(b)[k]),[40,32,35,38,35]);
 assert.deepEqual(secondaryKeys(p.role).map(k=>derivedStats(p)[k]),[36,40,30,40,35]);
 assert.equal(baseStats(b.attributes).contact,38.5);
 b.attributes.power+=10;
 assert.equal(derivedStats(b).power,36);assert.equal(derivedStats(b).contact,40);
});

test('스트레스 50까지 무보정, 이후 유효 멘탈만 낮추고 원래 능력은 보존한다',()=>{
 assert.equal(effectiveMental(40,50),40);assert.equal(effectiveMental(40,51),39.7);
 assert.equal(effectiveMental(40,100),25);assert.equal(effectiveMental(2,100),0);
 const s=createGame('선수','pitcher'),original=structuredClone(s.attributes),normal=derivedStats(s);
 s.stress=100;const stressed=derivedStats(s);
 assert.equal(stressed.control,37);assert.equal(stressed.velocity,normal.velocity);
 assert.equal(stressed.stamina,37);assert.deepEqual(s.attributes,original);
 s.stress=0;assert.deepEqual(derivedStats(s),normal);
});

test('숙련 격차는 10과 20 초과에서 둔화하고 스트레스와 보상 적용 순서에 영향받지 않는다',()=>{
 assert.equal(proficiencyMultiplier(50,40),1);assert.equal(proficiencyMultiplier(51,40),.5);
 assert.equal(proficiencyMultiplier(60,40),.5);assert.equal(proficiencyMultiplier(61,40),.25);
 const s=createGame('선수','batter');s.proficiency.contact=60;
 const growth=resolveGrowth(s,{sense:20},{contact:10});assert.equal(growth.proficiency.contact,1);
 s.stress=100;assert.deepEqual(resolveGrowth(s,{sense:20},{contact:10}),growth);
 s.proficiency.contact=100;s.attributes.sense=100;
 assert.deepEqual(resolveGrowth(s,{sense:5},{contact:10}),{gains:{sense:0},proficiency:{contact:0}});
});

test('능력과 숙련의 0/100 경계에서 계산값이 유효하며 저장에 파생값을 추가하지 않는다',()=>{
 for(const role of ['batter','pitcher'] as const)for(const primary of [0,100])for(const prof of [0,100])for(const stress of [0,100]){
  const s=createGame('경계',role);for(const k of primaryKeys)s.attributes[k]=primary;
  for(const k of secondaryKeys(role))s.proficiency[k]=prof;s.stress=stress;
  const before=JSON.stringify(s);const result=derivedStats(s);
  for(const k of secondaryKeys(role)){assert.ok(Number.isInteger(result[k]));assert.ok(result[k]>=0&&result[k]<=100);}
  assert.equal(JSON.stringify(s),before);
 }
});

test('산책의 야구 능력 회복과 영구 성장을 구분하고 실제 결과와 일치한다',()=>{
 const s=createGame('산책','batter');s.phase='weekend';s.stress=100;
 const p=previewActivity(s,'outing')!;assert.ok(p.abilityChanges.some(c=>c.condition>0));
 const n=transition(s,{type:'activity',id:'outing',revision:s.revision});
 for(const c of p.abilityChanges){assert.equal(c.after,derivedStats(n)[c.stat]);assert.equal(c.after-c.before,c.growth+c.condition);}
 assert.equal(n.attributes.mental,42);assert.equal(n.proficiency.contact,42);
});

test('역할별 주말 숙련과 1차 대상만 허용하고 스킬 습득은 평소 능력을 사용한다',()=>{
 const s=createGame('연습','pitcher');s.phase='weekend';s.supports=['rival','catcher','manager','bat_senior','pitch_senior','classmate'];s.rival=80;
 assert.equal(previewActivity(s,'practice','contact'),null);
 assert.equal(previewActivity(s,'practice','primary_mental'),null);
 assert.equal(previewActivity(s,'practice','primary_power')!.gains.power,3);
 assert.equal(previewActivity(s,'partner','primary_mental','rival')!.gains.mental,6);
 for(const k of primaryKeys)s.attributes[k]=65;for(const k of secondaryKeys(s.role))s.proficiency[k]=65;s.skills=['precision'];
 const before=skillRequirements(s,'efficient_pitch');s.stress=100;
 assert.deepEqual(skillRequirements(s,'efficient_pitch'),before);
});

test('실제 가중 기반의 정확한 격차 10과 20에 소수 오차로 둔화를 추가하지 않는다',()=>{
 const s=createGame('경계','batter');s.attributes.power=46;s.attributes.sense=36;
 s.proficiency.power=53;
 assert.equal(resolveGrowth(s,{}, {power:10}).proficiency.power,10);
 s.proficiency.power=63;
 assert.equal(resolveGrowth(s,{}, {power:16}).proficiency.power,6);
});

test('가중 기반과 숙련의 합이 정확히 .5일 때 올림하고 스킬 조건에도 동일하게 반영한다',()=>{
 const s=createGame('반올림','batter');s.attributes.power=48;s.attributes.sense=63;s.proficiency.power=70;
 assert.equal(derivedStats(s).power,60);
 assert.equal(skillRequirements(s,'slugger')[0].met,true);
});
