import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {createMatch,advanceMatch,chooseTactic} from './match.ts';
import {playbackDuration} from '../content/match-presentation.ts';
import type {TeamId} from './types.ts';
import {plateContext,initializeMatch} from './match.ts';
import {plateDistribution,resolvePlate} from './plate.ts';
import {random} from './random.ts';
function simulate(seed:number,role:'batter'|'pitcher',duty:'starter'|'middle'|'closer',opponentId:TeamId,order:1|8=8){
 const s=createGame('측정',role,Math.imul(seed,2654435761)>>>0);for(const k of Object.keys(s.attributes) as (keyof typeof s.attributes)[])s.attributes[k]=60;for(const k of Object.keys(s.proficiency) as (keyof typeof s.proficiency)[])s.proficiency[k]=50;s.energy=90;
 s.match={...createMatch(),pitchingRole:duty,opponentId,battingOrder:order};let stops=0;
 for(let n=0;n<300&&!s.match.over;n++){advanceMatch(s);if(s.match.awaiting){stops++;chooseTactic(s,role==='batter'?'contact':'control','auto');}}
 assert.ok(s.match.over);return {m:s.match,stops};
}
test('1,000경기가 득점·안타·병살·홈런·보직 출전량·선택·재생 시간 목표를 만족한다',()=>{
 const rows:{role:string;stops:number;ip:number;pa:number;runs:number;hits:number;dp:number;hr:number;seconds:number}[]=[];
 for(let i=1;i<=1000;i++){
  const role=i%4===0?'batter':'pitcher',duty=i%4===1?'starter':i%4===2?'middle':'closer';
  const {m,stops}=simulate(i,role,duty,(['haesol','mirim','taeyang','hanbit','bada','sanho','gangsan'] as TeamId[])[i%7]);
  rows.push({role:role==='batter'?role:duty,stops,ip:m.pitching.outs/3,pa:m.batting.pa,runs:(m.score[0]+m.score[1])/2,hits:(m.totals[0].hits+m.totals[1].hits)/2,dp:m.feed.filter(e=>e.outcome==='doublePlay').length/2,hr:m.feed.filter(e=>e.outcome==='homer').length/2,seconds:playbackDuration(m.feed)/1000});
 }
 const avg=(key:Exclude<keyof typeof rows[number],'role'>,role?:string)=>{const list=role?rows.filter(r=>r.role===role):rows;return list.reduce((n,r)=>n+r[key],0)/list.length;};
 const report={runs:avg('runs'),hits:avg('hits'),dp:avg('dp'),hr:avg('hr'),seconds:avg('seconds'),starter:{ip:avg('ip','starter'),stops:avg('stops','starter')},middle:{ip:avg('ip','middle'),stops:avg('stops','middle')},closer:{ip:avg('ip','closer'),stops:avg('stops','closer')}};console.log('1,000경기:',JSON.stringify(report));
 for(const [value,min,max] of [[report.runs,3,5],[report.hits,7,10],[report.dp,.5,1],[report.hr,.3,.8],[report.seconds,90,130],[report.starter.ip,5,7],[report.starter.stops,5,12],[report.middle.ip,2,3],[report.middle.stops,3,6],[report.closer.ip,1,2]])assert.ok(value>=min&&value<=max,`${value} outside ${min}~${max}`);
});
test('강한 미림고와 약한 강산고의 차이 및 1번 타자의 추가 타석이 실제로 나타난다',()=>{
 let strong=0,weak=0,first=0,eighth=0;
 for(let i=1;i<=120;i++){
  const a=simulate(i,'batter','middle','mirim'),b=simulate(i,'batter','middle','gangsan');strong+=a.m.score[0]-a.m.score[1];weak+=b.m.score[0]-b.m.score[1];
  first+=simulate(i,'batter','middle','haesol',1).m.batting.pa;eighth+=simulate(i,'batter','middle','haesol',8).m.batting.pa;
 }
 const extra=(first-eighth)/120;console.log('전력·타순:',JSON.stringify({strongMargin:strong/120,weakMargin:weak/120,extraPA:extra}));assert.ok(strong>weak);assert.ok(extra>=.4&&extra<=1.2);
});
test('빈 베이스의 장타와 3루 주자의 번트는 기대 득점이 달라 한 작전이 모든 상황을 지배하지 않는다',()=>{
 const s=createGame('작전','batter',401);s.match=createMatch();s.match.half=1;s.match.order[1]=7;initializeMatch(s);
 const ctx=plateContext(s);ctx.batter.ratings.contact=75;ctx.batter.ratings.power=75;ctx.batter.ratings.speed=70;
 const results:Record<string,Record<string,number>>={};
 for(const situation of ['empty','third']){
  results[situation]={};
  for(const tactic of ['contact','power','patient','bunt']){
   const first=structuredClone(ctx);first.outs=situation==='third'?1:0;if(situation==='third')first.bases[2]={id:'runner',name:'3루 주자',owner:'team',speed:65,responsible:null};
   const d=plateDistribution(first,tactic);if(d.disabled)continue;let runs=0;
   for(let i=1;i<=1200;i++){
    const rng={rng:Math.imul(i,2654435761)>>>0};let c=structuredClone(first),e=resolvePlate(c,tactic,()=>random(rng),d);runs+=e.runs;
    for(let n=0;n<60&&e.after.outs<3;n++){c={...c,outs:e.after.outs,bases:e.after.bases,score:e.after.score,order:c.order+1,batter:s.match.rosters![1].batters[(n+8)%9]};e=resolvePlate(c,'contact',()=>random(rng));runs+=e.runs;}
   }
   results[situation][tactic]=runs/1200;
  }
 }
 console.log('상황별 이닝 기대 득점:',JSON.stringify(results));
 assert.ok(results.empty.power>results.empty.contact);assert.ok(results.third.bunt>results.third.power);
});
