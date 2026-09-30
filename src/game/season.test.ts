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
    :s.phase==='weekday'?{type:'activity',id:s.energy<65?'rest':s.role==='batter'?'batting':'control'}
    :s.phase==='weekend'?{type:'activity',id:'weekend_rest'}
    :['event','supportEvent','weekendEvent'].includes(s.phase)?{type:'choice',index:0}
    :s.phase==='match'?{type:'tactic',id:s.role==='batter'?'contact':'control'}:{type:'continue'};
  return act(s,a);
}
test('both roles play sixteen weeks through summer with every weekend and monthly lineup intact',()=>{
  for(const role of ['batter','pitcher'] as const){
    let s=createGame('여름',role,71);
    for(let step=0;step<350&&s.phase!=='complete';step++){
      const n=advanceSeason(s);assert.notEqual(n,s,`${s.month}/${s.week} ${s.phase}`);s=n;
    }
    assert.equal(s.phase,'complete');assert.equal(s.month,6);
    assert.equal(s.schedule.length,16);assert.ok(s.schedule.every(w=>w.weekday&&w.weekend));
    assert.equal(s.lineupHistory.length,4);assert.ok(s.records.length>=4&&s.records.length<=6);
    assert.equal(s.tournament.rounds.length,3);
    assert.equal(act(s,{type:'continue'}),s);
  }
});
test('v2 saves preserve abilities, RNG and pending games; April completion resumes at May lineup',()=>{
  for(const role of ['batter','pitcher'])for(const stage of ['start','match','selection','complete']){
    const raw=readFileSync(new URL(`../persistence/fixtures/v2-${role}-${stage}.json`,import.meta.url),'utf8');
    const old=JSON.parse(raw),s=parseSave(raw);
    assert.equal(s.version,4);assert.deepEqual(s.stats,old.stats);assert.equal(s.rng,old.rng);
    assert.deepEqual(s.skills,old.skills);assert.deepEqual(s.bonds,old.bonds);
    assert.equal(s.records.length,old.records.length);
    if(stage==='complete'){assert.equal(s.month,5);assert.equal(s.week,1);assert.equal(s.phase,'lineup');assert.equal(s.schedule.length,9);}
    else {assert.equal(s.phase,old.phase);assert.deepEqual(s.match?.last,old.match?.last);}
    assert.deepEqual(parseSave(JSON.stringify(s)),s);
  }
});
test('higher abilities grow gradually and success previews still match actual gains',()=>{
  for(const [start,expected] of [[59,7],[60,5],[79,5],[80,3],[89,3],[90,1],[99,1],[100,0]]){
    const s=act(createGame('성장','pitcher',71),{type:'lineup',supports:defaultSupports('pitcher')});
    s.placements={};s.stats.control=start;
    assert.equal(previewActivity(s,'control')!.gains.control,expected,`control ${start}`);
    assert.equal(act(s,{type:'activity',id:'control'}).stats.control-start,expected);
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
    Object.assign(s.stats,stats);assert.equal(act(s,{type:'learn',id}),s);
    s.skills=[base];const n=act(s,{type:'learn',id});
    assert.ok(n.skills.includes(id));assert.equal(n.skillPoints,76);
    assert.equal(act(n,{type:'learn',id}),n);assert.equal(n.week,s.week);
  }
  let mixed=createGame('혼합','batter',4);mixed.skillPoints=100;mixed.skills=['contact_focus','power_drive'];
  Object.assign(mixed.stats,{contact:65,eye:55,power:65});
  mixed=act(mixed,{type:'learn',id:'contact_master'});mixed=act(mixed,{type:'learn',id:'slugger'});
  assert.ok(mixed.skills.includes('contact_master')&&mixed.skills.includes('slugger'));
});
test('specialized skills change the matching tactic probabilities and real pitching burden',()=>{
  for(const [role,id,tactic,index,delta] of [
    ['batter','contact_master','contact',3,.04],['batter','slugger','power',5,.04],
    ['pitcher','power_finish','breaking',0,.05],['pitcher','efficient_pitch','control',2,-.01],
  ] as const){
    const s=createGame('특화',role,51);s.match=createMatch();s.match.awaiting=true;
    const base=tactics(s).find(t=>t.id===tactic)!;s.skills=[id];
    const t=tactics(s).find(t=>t.id===tactic)!;
    assert.ok(Math.abs(t.probabilities[index]-base.probabilities[index]-delta)<1e-9);
    assert.match(t.reason,/적용 스킬/);
    if(id==='efficient_pitch'){assert.equal(t.burden,3);chooseTactic(s,tactic);assert.equal(s.match.load,3);}
  }
});
