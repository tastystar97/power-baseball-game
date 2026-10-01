import {primaryKeys} from './types.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,previewActivity,transition} from './engine.ts';
import {defaultSupports} from '../content/supports.ts';
import {availableSkills} from '../content/skills.ts';
import {parseSave} from '../persistence/save.ts';
import {createMatch,tactics,chooseTactic} from './match.ts';
import type {Action,GameState,Role} from './types.ts';

const act=(s:GameState,a:Omit<Action,'revision'>)=>transition(s,{...a,revision:s.revision});
export function advanceSeason(s:GameState):GameState {
  const a:Omit<Action,'revision'>=s.phase==='lineup'?{type:'lineup',supports:defaultSupports(s.role)}
    :s.phase==='weekday'?{type:'activity',id:s.energy<65?'rest':s.role==='batter'?'train_sense':'train_sense'}
    :s.phase==='weekend'?{type:'activity',id:'weekend_rest'}
    :['event','supportEvent','weekendEvent'].includes(s.phase)?{type:'choice',index:0}
    :s.phase==='roleEvent'?{type:'choice',id:'stay'}:s.phase==='match'&&s.match!.awaiting?{type:'tactic',id:s.role==='batter'?'contact':'control'}:{type:'continue'};
  return act(s,a);
}
test('both roles play sixteen weeks through summer with every weekend and fixed deck intact',()=>{
  for(const role of ['batter','pitcher'] as const){
    let s=createGame('여름',role,71);
    for(let step=0;step<350&&s.phase!=='complete';step++){
      const n=advanceSeason(s);assert.notEqual(n,s,`${s.month}/${s.week} ${s.phase}`);s=n;
    }
    assert.equal(s.phase,'complete');assert.equal(s.month,6);
    assert.equal(s.schedule.length,16);assert.ok(s.schedule.every(w=>w.weekday&&w.weekend));
    assert.equal(s.supports.length,6);assert.ok(s.records.length>=4&&s.records.length<=6);
    assert.equal(s.tournament.rounds.length,3);
    assert.equal(act(s,{type:'continue'}),s);
  }
});
test('higher abilities grow gradually and success previews still match actual gains',()=>{
  for(const [start,expected] of [[590,40],[600,16],[790,9],[800,5],[890,5],[900,2],[990,2],[1000,0]]){
    const s=act(createGame('성장','pitcher',71),{type:'lineup',supports:defaultSupports('pitcher')});
    s.placements={};for(const k of primaryKeys)s.attributes[k]=1500;s.proficiency.control=start;
    assert.equal(previewActivity(s,'train_sense')!.proficiency.control,expected,`control ${start}`);
    assert.equal(act(s,{type:'activity',id:'train_sense'}).proficiency.control!-start,expected);
  }
});
test('specialized skills unlock by training and prerequisite without a permanent class choice',()=>{
  for(const [role,id,base,stats] of [
    ['batter','contact_master','contact_focus',{contact:60,eye:50}],
    ['batter','slugger','power_drive',{power:60,contact:45}],
    ['pitcher','power_finish','fastball_edge',{velocity:60,breaking:45}],
    ['pitcher','efficient_pitch','precision',{control:60,stamina:50}],
  ] as const){
    const s=createGame('특화',role,9);s.skillPoints=100;
    assert.ok(availableSkills(s).some(k=>k.id===id));
    assert.equal(act(s,{type:'learn',id}),s);
    for(const k of primaryKeys)s.attributes[k]=691;for(const k of Object.keys(s.proficiency) as (keyof typeof s.proficiency)[])s.proficiency[k]=700;assert.equal(act(s,{type:'learn',id}),s);
    s.skills=[base];assert.equal(act(s,{type:'learn',id}),s);s.unlockedSkills=[id];const n=act(s,{type:'learn',id});
    assert.ok(n.skills.includes(id));assert.equal(n.skillPoints,76);
    assert.equal(act(n,{type:'learn',id}),n);assert.equal(n.week,s.week);
  }
  let mixed=createGame('혼합','batter',4);mixed.skillPoints=100;mixed.skills=['contact_focus','power_drive'];
  for(const k of primaryKeys)mixed.attributes[k]=691;for(const k of Object.keys(mixed.proficiency) as (keyof typeof mixed.proficiency)[])mixed.proficiency[k]=700;
  mixed.unlockedSkills=['contact_master','slugger'];mixed=act(mixed,{type:'learn',id:'contact_master'});mixed=act(mixed,{type:'learn',id:'slugger'});
  assert.ok(mixed.skills.includes('contact_master')&&mixed.skills.includes('slugger'));
});
test('specialized skills change the matching tactic probabilities and real pitching burden',()=>{
  for(const [role,id,tactic,index,delta] of [
    ['batter','contact_master','contact',3,.075*.9],['batter','slugger','power',5,.065*.9],
    ['pitcher','power_finish','breaking',0,.08*.9],['pitcher','efficient_pitch','control',2,-.045*.9],
  ] as const){
    const s=createGame('특화',role,51);s.attributes.intelligence=1500;s.match=createMatch();s.match.awaiting=true;s.match.pitchingRole='starter';s.match.half=role==='batter'?1:0;s.match.order[1]=7;
    const base=tactics(s).find(t=>t.id===tactic)!;s.skills=[id];
    const t=tactics(s).find(t=>t.id===tactic)!;
    assert.ok(Math.abs(t.probabilities[index]-base.probabilities[index]-delta)<1e-9);
    assert.match(t.reason,/발동 후보/);
    if(id==='efficient_pitch'){assert.ok(Math.abs(t.burden-(3.4-2.4*.9))<1e-9);chooseTactic(s,tactic);assert.equal(s.match.load,s.match.skillChecks![0].active.includes('efficient_pitch')?1:3.4);}
  }
});
