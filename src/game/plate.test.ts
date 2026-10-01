import test from 'node:test';
import assert from 'node:assert/strict';
import {plateDistribution,resolvePlate,outcomes} from './plate.ts';
import type {PlateContext} from './plate.ts';
import {createGame} from './engine.ts';
import {rosterFor} from './roster.ts';
import {random} from './random.ts';
const context=():PlateContext=>{
 const s=createGame('시타','batter',31),home=rosterFor('cheongram',s),away=rosterFor('haesol',s);
 return {batter:home.batters[7],pitcher:away.pitchers[0],fielders:away.batters,inning:1,half:1,order:7,outs:0,bases:[null,null,null],score:[0,0],energy:100,load:0,playerBatter:true,playerPitcher:false,source:'manual',effects:[]};
};
test('네 단계 분포 합은 1이며 상황상 불가능한 병살·희생플라이·번트를 차단한다',()=>{
 for(const id of ['contact','power','patient','bunt','fastball','breaking','control','chase']){
  const ctx=context(),d=plateDistribution(ctx,id);
  assert.ok(Math.abs(d.paths.reduce((sum,p)=>sum+p.probability,0)-1)<1e-10);
  assert.equal(d.probabilities.doublePlay,0);assert.equal(d.probabilities.sacrificeFly,0);
  assert.equal(d.disabled,id==='bunt');
  ctx.bases=[{id:'runner',name:'주자',owner:'team',speed:60,responsible:null},null,{id:'third',name:'3루',owner:'team',speed:60,responsible:null}];
  assert.ok(plateDistribution(ctx,'contact').probabilities.doublePlay>0);
  assert.ok(plateDistribution(ctx,'contact').probabilities.sacrificeFly>0);
  assert.equal(plateDistribution(ctx,'bunt').disabled,false);
  ctx.outs=2;assert.equal(plateDistribution(ctx,'contact').probabilities.doublePlay,0);assert.equal(plateDistribution(ctx,'contact').probabilities.sacrificeFly,0);
 }
});
test('표본의 결과 분포는 미리 보기와 일치하며 타구·처리 수비수를 보존한다',()=>{
 const ctx=context(),rng={rng:931},preview=plateDistribution(ctx,'power');
 const observed=Object.fromEntries(outcomes.map(k=>[k,0]));
 for(let i=0;i<20000;i++){
  const event=resolvePlate(ctx,'power',()=>random(rng),preview);
  observed[event.outcome]++;
  if(event.ball){assert.ok(event.direction);assert.ok(event.fielder);}
 }
 for(const id of outcomes)assert.ok(Math.abs(observed[id]/20000-preview.probabilities[id])<.012,`${id} 불일치`);
 const before=structuredClone(ctx);plateDistribution(ctx,'patient');assert.deepEqual(ctx,before);
});
test('실제 상대 능력과 수비, 작전·선구안·주루가 분포를 바꾼다',()=>{
 const c=context(),base=plateDistribution(c,'contact');
 c.pitcher.ratings.velocity=100;assert.ok(plateDistribution(c,'contact').probabilities.strikeout>base.probabilities.strikeout);
 c.batter.ratings.eye=100;assert.ok(plateDistribution(c,'patient').probabilities.walk>base.probabilities.walk);
 assert.ok(plateDistribution(c,'power').probabilities.homer>plateDistribution(c,'contact').probabilities.homer);
 const weak=context(),strong=structuredClone(weak);weak.fielders.forEach(p=>p.ratings.field=0);strong.fielders.forEach(p=>p.ratings.field=100);
 assert.ok(plateDistribution(weak,'contact').probabilities.error>plateDistribution(strong,'contact').probabilities.error);
});
test('기존 카드 확률 효과는 세부 결과에 합이 보존되도록 배분한다',()=>{
 const ctx=context(),base=plateDistribution(ctx,'contact');
 ctx.effects=[{kind:'probability',from:'out',to:'single',amount:.06}];
 const buff=plateDistribution(ctx,'contact');
 assert.ok(Math.abs(buff.probabilities.single+buff.probabilities.infieldSingle-base.probabilities.single-base.probabilities.infieldSingle-.06)<1e-10);
 assert.ok(Math.abs(buff.paths.reduce((sum,p)=>sum+p.probability,0)-1)<1e-10);
});
