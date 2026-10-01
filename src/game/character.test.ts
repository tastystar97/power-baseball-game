import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBackground,rollTalent,talentGrade,fateRoll,backgroundEffects,talentRules} from './character.ts';
import {backgrounds,hiddenTalents} from '../content/backgrounds.ts';

const basic={origin:'beginner',body:'ordinary',personality:'calm',specialties:[],weaknesses:[],sportFocus:null} as const;
const choice=()=>({...basic,specialties:[] as string[],weaknesses:[] as string[]});
test('배경은 필수 항목·10포인트 예산·고유 항목·최대 두 약점을 검사한다',()=>{
 assert.equal(validateBackground(choice()).remaining,9);
 assert.equal(validateBackground({...choice(),origin:null}).valid,false);
 assert.equal(validateBackground({...choice(),origin:'elite',body:'muscular',specialties:['arm','eye','network']}).valid,false);
 assert.equal(validateBackground({...choice(),weaknesses:['stubborn','stage_fright','poor_study']}).valid,false);
 assert.equal(validateBackground({...choice(),specialties:['arm','arm']}).valid,false);
 assert.equal(validateBackground({...choice(),body:'unknown'}).valid,false);
 assert.equal(validateBackground({...choice(),origin:'other_sport'}).valid,false);
 assert.equal(validateBackground({...choice(),origin:'other_sport',sportFocus:'power'}).valid,true);
 assert.equal(validateBackground({...choice(),weaknesses:['stubborn','poor_study']}).remaining,13);
 for(const id of ['tall','fast_recovery','fragile'])assert.ok(backgrounds.find(b=>b.id===id)?.unavailable);
 assert.equal(validateBackground({...choice(),weaknesses:['fragile']}).valid,false);
});
test('D 보너스는 추가 예산 2로 계산하고 반복 검사로 누적되지 않는다',()=>{
 const c={...choice(),origin:'elite',body:'muscular',specialties:['arm','network']};
 assert.equal(validateBackground(c).valid,false);
 for(let i=0;i<10;i++){assert.equal(validateBackground(c,2).budget,12);assert.equal(validateBackground(c,2).remaining,0);}
 assert.equal(talentRules.D.growth,.92);assert.equal(talentRules.S.growth,1.15);assert.equal(talentRules.S.cap,50);
});
test('재능은 정확한 등급 경계·2d6 능력 범위·시드와 순번 재현성을 지킨다',()=>{
 for(const [n,g] of [[10,'D'],[29,'D'],[30,'C'],[35,'C'],[36,'B'],[40,'B'],[41,'A'],[45,'A'],[46,'S'],[60,'S']] as const)assert.equal(talentGrade(n),g);
 assert.throws(()=>talentGrade(61));assert.throws(()=>rollTalent(1,-1));
 const a=rollTalent(2026,0);assert.deepEqual(a,rollTalent(2026,0));assert.notDeepEqual(a,rollTalent(2026,1));
 for(let seed=1;seed<=300;seed++){
  const r=rollTalent(seed,0);assert.equal(r.dice.length,10);assert.equal(r.sum,r.dice.reduce((a,b)=>a+b,0));
  Object.values(r.attributes).forEach(v=>assert.ok(v>=190&&v<=310));
  Object.values(r.attributes).forEach((v,i)=>assert.equal(v,166+(r.dice[i*2]+r.dice[i*2+1])*12));
 }
});
test('대량 표본의 재능 등급 비율은 설계 표에 근사한다',()=>{
 const counts={D:0,C:0,B:0,A:0,S:0},N=100000;
 for(let seed=1;seed<=N;seed++)counts[rollTalent(seed,0).grade]++;
 for(const [g,p] of Object.entries({D:15.7,C:38,B:30.7,A:13.1,S:2.5}))assert.ok(Math.abs(counts[g as keyof typeof counts]/N*100-p)<.65,`${g}: ${counts[g as keyof typeof counts]/N*100}`);
});
test('운명은 20에서만 역할에 맞는 숨은 재능을 주며 고정 시드를 보존한다',()=>{
 for(const role of ['batter','pitcher'] as const){let hits=0;
  for(let seed=1;seed<=10000;seed++){
   const f=fateRoll(seed,role);assert.deepEqual(f,fateRoll(seed,role));assert.ok(f.die>=1&&f.die<=20);
   assert.equal(Boolean(f.hidden),f.die===20);if(f.hidden){hits++;assert.ok(hiddenTalents.find(h=>h.id===f.hidden)!.roles.includes(role));}
  }assert.ok(hits>400&&hits<600);
 }
});
test('배경은 역할 숙련·능력·감독 신뢰와 기존 보정에 연결한다',()=>{
 const c={...choice(),origin:'elite',body:'muscular',personality:'analyst',specialties:['arm','eye'],weaknesses:['poor_study']};
 const b=backgroundEffects(c,'batter'),p=backgroundEffects(c,'pitcher');
 assert.equal(b.attributes.power,60);assert.equal(b.attributes.sense,-20);assert.equal(b.attributes.intelligence,-10);
 assert.equal(b.proficiency.field,10);assert.equal(b.proficiency.eye,10);assert.equal(p.proficiency.velocity,9);assert.equal(p.proficiency.control,10);assert.equal(b.trust,10);
 assert.equal(backgroundEffects(choice(),'batter').proficiencyGrowth,1.15);
});
