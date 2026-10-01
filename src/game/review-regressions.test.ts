import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {createMatch,initializeMatch,advanceMatch,tactics,plateContext} from './match.ts';
import {plateDistribution} from './plate.ts';
import {presentationAt} from './playback.ts';
import {validateContent} from '../cards/pack.ts';
import {eligibleSkills} from './skill-activation.ts';
import {previewExpectation} from './tactic-preview.ts';
import type {SkillEffect} from '../cards/schema.ts';
import {validateMatch} from '../persistence/match-validation.ts';

test('주인공 투구 직전 도루도 선택 전에 적용하고 같은 경계를 다시 처리하지 않는다',()=>{
 const s=createGame('투수','pitcher',1);s.match=createMatch();s.match.pitchingRole='starter';initializeMatch(s);
 s.match.bases[0]={id:'runner',name:'주자',speed:100,owner:'opponent',responsible:'player'};
 advanceMatch(s);assert.equal(s.match.feed[0]?.outcome,'stolenBase');assert.equal(s.match.bases[1]?.id,'runner');assert.ok(s.match.awaiting);
 const before=structuredClone(s);advanceMatch(s);assert.deepEqual(s,before);assert.equal(s.match.faced,0);
});
test('대타 이전 재생은 차준서의 수비 위치·타순·오늘 성적을 보존한다',()=>{
 const s=createGame('대타','batter',42);s.match=createMatch('substitute');advanceMatch(s);
 assert.equal(s.match.inning,7);const early=presentationAt(s.match,0);
 assert.ok(early.fielders.some(p=>p.id==='junseo'));assert.ok(!early.fielders.some(p=>p.id==='player'));
 const i=s.match.feed.findIndex(e=>e.batter.id==='junseo'),turn=presentationAt(s.match,i);
 assert.equal(turn.batter?.slot,8);assert.ok(turn.score.batterLines[turn.batter!.id].pa>0);
 assert.equal(presentationAt(s.match,s.match.feed.length).batter?.id,'player');
 validateMatch(s.match,s.role);const wrong=structuredClone(s.match);wrong.substitutions[0].feedIndex=0;assert.throws(()=>validateMatch(wrong,s.role));
});
test('투수 작전 전망의 아웃에는 실책 출루를 포함하지 않는다',()=>{
 const s=createGame('전망','pitcher',7);s.match=createMatch();s.match.pitchingRole='starter';initializeMatch(s);
 for(const p of [...s.match.rosters![0].batters,...s.match.rosters![1].pitchers,...s.match.rosters![1].batters])for(const key of Object.keys(p.ratings) as (keyof typeof p.ratings)[])p.ratings[key]=53;
 const d=plateDistribution(plateContext(s),'breaking').probabilities,t=tactics(s).find(t=>t.id==='breaking')!;
 const outs=d.strikeout+d.groundOut+d.flyOut+d.lineOut+d.doublePlay+d.sacrificeFly+d.sacrificeBunt;
 assert.ok(Math.abs(t.probabilities[0]+t.probabilities[1]+t.probabilities[6]-outs)<1e-12);
 assert.equal(t.probabilities[7],d.error);
});
test('허용된 많은 외부 스킬을 가진 작전 미리보기도 빠르고 난수를 보존한다',()=>{
 const s=createGame('외부','batter',23);
 s.content.skills=s.content.skills.filter(k=>k.tier==='normal');for(const c of s.content.cards)c.ultimates={batter:null,pitcher:null};for(const e of s.content.events)for(const c of e.choices){c.unlocks=[];c.hints=[];}
 for(let i=0;i<12;i++){const id=`test_skill_${i}`;s.content.skills.push({id,name:id,description:'외부 테스트',family:id,tier:'normal',role:'both',cost:6,requires:{},conditions:[],effects:[{kind:'probability',from:'out',to:i%2?'single':'homer',amount:.01+i*.001}]});s.content.cards[Math.floor(i/2)].hints[i%2?'batter':'pitcher']=id;}
 validateContent(s.content);s.skills=s.content.skills.filter(k=>k.tier==='normal'&&(k.role==='both'||k.role==='batter')).map(k=>k.id);
 s.energy=40;s.match=createMatch();s.match.half=1;s.match.outs=2;s.match.order[1]=7;initializeMatch(s);
 assert.ok(eligibleSkills(s,'contact').length>=15);const before=structuredClone(s),start=performance.now(),result=tactics(s),elapsed=performance.now()-start;
 assert.ok(elapsed<1200,`작전 미리보기 ${elapsed.toFixed(0)}ms`);assert.deepEqual(s,before);assert.ok(result.every(t=>Math.abs(t.probabilities.reduce((a,b)=>a+b,0)-1)<1e-9));
});
test('빠른 기대값은 피로·중첩·확률 소진·부담 하한에서도 실제 분포의 모든 조합과 같다',()=>{
 const s=createGame('기대','pitcher',4);s.match=createMatch();s.match.pitchingRole='starter';initializeMatch(s);s.energy=30;
 const ctx=plateContext(s),effects:SkillEffect[][]=[[{kind:'fatigue',amount:.7}],[{kind:'probability',from:'walk',to:'out',amount:.08},{kind:'burden',amount:3}],[{kind:'probability',from:'out',to:'strikeout',amount:.04}],[{kind:'probability',from:'single',to:'out',amount:.08}]],chance=.68;
 const expected=Array<number>(8).fill(0);let load=0;
 for(let mask=0;mask<16;mask++){const active=effects.filter((_,i)=>mask&2**i),w=chance**active.length*(1-chance)**(4-active.length),d=plateDistribution({...ctx,effects:active.flat()},'control'),p=d.probabilities;
  [p.strikeout,p.groundOut+p.flyOut+p.lineOut+p.doublePlay,p.walk+p.hitByPitch,p.single+p.infieldSingle,p.double+p.triple,p.homer,p.sacrificeBunt+p.sacrificeFly,p.error].forEach((v,i)=>expected[i]+=v*w);load+=d.burden*w;
 }
 const actual=previewExpectation(ctx,'control',effects,chance);actual.probabilities.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-12));assert.ok(Math.abs(actual.burden-load)<1e-12);
 const many=Array.from({length:32},()=>[{kind:'probability',from:'out',to:'strikeout',amount:.001}] as SkillEffect[]),base=previewExpectation(ctx,'control',[],chance),before=structuredClone(s),start=performance.now(),large=previewExpectation(ctx,'control',many,chance);
 assert.ok(performance.now()-start<1200);assert.ok(Math.abs(large.probabilities[0]-base.probabilities[0]-.032*chance)<.0001);assert.deepEqual(s,before);
});

