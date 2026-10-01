import {primaryKeys} from './types.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {evaluateSelection} from './competition.ts';
import {createMatch,advanceMatch,chooseTactic,tactics} from './match.ts';
import type {SkillId} from './types.ts';

test('selection uses role-specific ability and crosses both public thresholds exactly',()=>{
  for(const role of ['batter','pitcher'] as const){
    const s=createGame('봄',role,9);
    for(const key of primaryKeys)s.attributes[key]=0;for(const key of Object.keys(s.proficiency) as (keyof typeof s.proficiency)[])s.proficiency[key]=0;
    s.proficiency[role==='batter'?'contact':'control']=100;
    const low=evaluateSelection(s);assert.equal(low.ability,20);assert.equal(low.rank,'reserve');
    for(const key of primaryKeys)s.attributes[key]=60;for(const key of Object.keys(s.proficiency) as (keyof typeof s.proficiency)[])s.proficiency[key]=60;
    assert.equal(evaluateSelection(s).rank,'starter');
    const m=createMatch();m.batting.hits=2;m.batting.walks=1;m.batting.rbi=1;m.pitching.outs=6;m.pitching.k=3;m.pitching.runs=1;
    m.batting.pa=5;m.batting.ab=4;m.faced=9;s.records=[{month:3,match:m}];const after=evaluateSelection(s);assert.ok(after.performance>=0&&after.performance<=20);
  }
});

test('starter, substitute and reserve assignments produce different real appearances for both roles',()=>{
  for(const role of ['batter','pitcher'] as const)for(const appearance of ['starter','substitute','reserve'] as const)for(let seed=1;seed<=25;seed++){
    const s=createGame('봄',role,seed);s.match=createMatch(appearance);const m=s.match;
    let choices=0;
    for(let n=0;n<300&&!m.over;n++){
      advanceMatch(s);
      if(m.awaiting){
        assert.notEqual(appearance,'reserve');
        if(appearance==='substitute')assert.ok(m.inning>=7);
        choices++;assert.equal(chooseTactic(s,role==='batter'?'contact':'control'),true);
      }
    }
    assert.ok(m.over,`${role} ${appearance} ${seed} finishes`);
    if(appearance==='reserve'){
      assert.equal(choices,0);assert.ok(Object.values(m.batting).every(n=>n===0));assert.ok(Object.values(m.pitching).every(n=>n===0));
    }else if(role==='batter'&&appearance==='substitute'){
      assert.ok(choices>=1);assert.equal(m.batting.pa,choices);
    }else assert.ok(choices>0);
  }
});

test('learned skills change actual tactic probability and explain their activation',()=>{
  const cases:[SkillId,'batter'|'pitcher',string,number,number][]=[
    ['contact_focus','batter','contact',3,.05*.68],['power_drive','batter','power',5,.035*.68],['patient_eye','batter','patient',2,.05*.68],
    ['fastball_edge','pitcher','fastball',0,.055*.68],['precision','pitcher','control',2,-.035*.68],['breaking_read','pitcher','breaking',3,-.035*.68],
  ];
  for(const [skill,role,tactic,index,delta] of cases){
    const s=createGame('봄',role,2);s.match=createMatch();s.match.pitchingRole='starter';s.match.half=role==='batter'?1:0;s.match.order[1]=7;
    const base=tactics(s).find(t=>t.id===tactic)!;
    s.skills=[skill];const changed=tactics(s).find(t=>t.id===tactic)!;
    assert.ok(Math.abs(changed.probabilities[index]-base.probabilities[index]-delta)<1e-9);
    assert.match(changed.reason,/발동 후보/);
    assert.ok(Math.abs(changed.probabilities.reduce((a,b)=>a+b)-1)<1e-9);
  }
});

test('situational skills activate only in the documented conditions',()=>{
  for(const role of ['batter','pitcher'] as const){
    const s=createGame('봄',role,6);s.match=createMatch();s.match.pitchingRole='starter';s.match.half=role==='batter'?1:0;s.match.order[1]=7;s.skills=['calm','steady'];
    assert.ok(!tactics(s)[0].reason.includes('적용 스킬'));
    if(role==='batter')s.match.outs=2;else s.match.bases[0]={id:'r',name:'주자',owner:'team',speed:50,responsible:null};
    assert.match(tactics(s)[0].reason,/흔들리지 않는 마음/);
    s.energy=20;const without=structuredClone(s);without.skills=[];
    const favorable=(g:typeof s)=>{const p=tactics(g)[0].probabilities;return role==='batter'?p.slice(2,6).reduce((a,b)=>a+b):p[0]+p[1];};
    assert.ok(favorable(s)>favorable(without));assert.match(tactics(s)[0].reason,/마지막까지 같은 자세/);
  }
});
