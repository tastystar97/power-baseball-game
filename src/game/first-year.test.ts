import test from 'node:test';
import assert from 'node:assert/strict';
import * as abilities from './abilities.ts';
import {createGame} from './engine.ts';
import {primaryKeys} from './types.ts';
import {stateSchema} from './types.ts';
import {skillActivationChance} from './skill-activation.ts';
import {rosterFor} from './roster.ts';
import {plateDistribution} from './plate.ts';
import type {PlateContext} from './plate.ts';
import {activities} from '../content/activities.ts';
import {previewActivity,transition} from './engine.ts';
import {defaultSupports} from '../content/supports.ts';
import {weeklyPlacements} from './support.ts';
import {parseSave} from '../persistence/save.ts';

test('A안은 양 역할에 같은 여섯 메뉴와 역할에 맞는 숙련을 제공한다',()=>{
 for(const role of ['batter','pitcher'] as const){
  const s=createGame('훈련',role,42,undefined,defaultSupports(role));s.placements={};
  assert.deepEqual(activities(s).map(a=>a.id),['train_power','train_endurance','train_mental','train_intelligence','train_sense','rest']);
  const p=previewActivity(s,'train_power')!;
  assert.equal(p.gains.power,34);assert.equal(p.proficiency[role==='batter'?'power':'velocity'],30);
  s.phase='weekend';assert.equal(previewActivity(s,'practice','control'),null);
  assert.equal(abilities.trainingTargets(role).length,5);
  for(const target of abilities.trainingTargets(role))assert.ok(previewActivity(s,'practice',target));
 }
});
test('서포트는 전문 일치와 인연을 합해 카드당 15까지만 성장시키며 실패·휴식은 성장하지 않는다',()=>{
 const s=createGame('서포트','batter',1,undefined,defaultSupports('batter'));s.placements={rival:'train_power'};s.rival=100;
 assert.equal(previewActivity(s,'train_power')!.gains.power,49);
 s.placements={rival:'train_sense'};assert.equal(previewActivity(s,'train_sense')!.gains.power,10);
 s.placements={rival:'rest'};assert.deepEqual(previewActivity(s,'rest')!.gains,{});
 s.placements={rival:'train_power'};s.energy=0;s.rng=1;
 const failed=transition(s,{type:'activity',id:'train_power',revision:s.revision});
 assert.equal(failed.attributes.power,s.attributes.power);assert.equal(failed.attributes.mental,243);
 assert.deepEqual(failed.proficiency,s.proficiency);assert.equal(failed.skillPoints,s.skillPoints);
});
test('성장은 1학년 상한에서 멈추고 숙련의 작은 소수 성장도 저장·재개한다',()=>{
 const s=createGame('성장','pitcher',17,undefined,defaultSupports('pitcher'));
 s.attributes.power=999;assert.equal(abilities.resolveGrowth(s,{power:34}).gains.power,1);
 s.attributes.power=1000;assert.equal(abilities.resolveGrowth(s,{power:34}).gains.power,0);
 for(const k of primaryKeys)s.attributes[k]=1000;s.proficiency.control=800;
 assert.equal(abilities.resolveGrowth(s,{}, {control:5}).proficiency.control,6);
 s.proficiency.control=806;
 // Update snapshots consistently to represent the same current saved growth baseline.
 s.initial.proficiency_control=806;s.weekStart.proficiency_control=806;s.monthStart.proficiency_control=806;
 assert.equal(parseSave(JSON.stringify(s)).proficiency.control,806);
 assert.deepEqual(weeklyPlacements(s),weeklyPlacements(s));
 for(let seed=1;seed<80;seed++){
  const placements=weeklyPlacements({...s,trainingSeed:seed});
  assert.ok(Object.values(placements).every(id=>id===''||id.startsWith('train_')));
 }
});

test('1500 스케일 시작과 비선형 변환은 원본을 보존하고 양 역할 경기 능력을 100 이내로 만든다',()=>{
 const api=abilities as typeof abilities & {convertPrimary:(n:number)=>number;overall:(s:ReturnType<typeof createGame>)=>number};
 assert.equal(typeof api.convertPrimary,'function');
 for(const [input,want] of [[0,0],[250,44],[750,73],[1500,100]])assert.ok(Math.abs(api.convertPrimary(input)-want)<1);
 for(const role of ['batter','pitcher'] as const){
  const s=createGame('신입',role);assert.equal(primaryKeys.reduce((n,k)=>n+s.attributes[k],0)/5,248);
  assert.ok(api.overall(s)>=35&&api.overall(s)<=43);
  for(const k of primaryKeys)s.attributes[k]=1500;
  for(const k of abilities.secondaryKeys(role))s.proficiency[k]=1000;
  assert.ok(abilities.secondaryKeys(role).every(k=>abilities.derivedStats(s)[k]===100));
  assert.equal(stateSchema.safeParse(s).success,true);
  s.attributes.power=1501;assert.equal(stateSchema.safeParse(s).success,false);
 }
});
test('유효 멘탈과 발동률은 변환값을 쓰고 스트레스 50을 넘어서만 멘탈을 낮춘다',()=>{
 assert.equal(skillActivationChance(1500),.9);assert.equal(skillActivationChance(0),.5);
 assert.ok(skillActivationChance(250)>.67&&skillActivationChance(250)<.68);
 assert.equal(abilities.effectiveMental(1500,50),100);
 assert.equal(abilities.effectiveMental(1500,51),99.7);
 assert.equal(abilities.effectiveMental(0,100),0);
});
test('타석 판정은 별도의 멘탈 수치에 영향을 받지 않는다',()=>{
 const s=createGame('타자','batter'),home=rosterFor('cheongram',s),away=rosterFor('haesol',s);
 const ctx:PlateContext={batter:home.batters[7],pitcher:away.pitchers[0],fielders:away.batters,inning:1,half:1,order:7,outs:0,bases:[null,null,null],score:[0,0],energy:100,load:0,playerBatter:true,playerPitcher:false,source:'manual',effects:[]};
 const before=plateDistribution(ctx,'contact');ctx.batter.ratings.mental=0;ctx.pitcher.ratings.mental=100;
 assert.deepEqual(plateDistribution(ctx,'contact'),before);
});
