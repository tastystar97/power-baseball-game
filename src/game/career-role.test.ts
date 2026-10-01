import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition} from './engine.ts';
import {createMatch} from './match.ts';
import {pendingRoleEvent,roleChoices,applyRoleChoice} from './career-role.ts';
import type {GameState} from './types.ts';
function result(s:GameState,order:1|3|4|6|8=8){const m=createMatch();m.id=`game-${s.records.length}`;m.over=true;m.battingOrder=order;m.batting.pa=4;m.batting.ab=4;m.batting.hits=2;m.pitching.outs=6;m.pitching.k=2;m.pitching.hits=2;m.faced=8;s.match=m;s.matchRecorded=true;s.records.push({month:3,match:structuredClone(m)});}
test('8번 승격에는 최근 두 선발 경기와 신뢰 경계가 필요하다',()=>{
 const s=createGame('승격','batter');s.trust=30;result(s);assert.equal(pendingRoleEvent(s),null);result(s);assert.equal(pendingRoleEvent(s),'bat_six');
 s.trust=29;assert.equal(pendingRoleEvent(s),null);s.trust=30;s.records[0].match.appearance='substitute';assert.equal(pendingRoleEvent(s),null);
});
test('여섯 경기 안에 단계별 한 경기 경험을 쌓고 경로를 고정한다',()=>{
 const s=createGame('중심','batter');s.trust=70;for(const k of Object.keys(s.attributes) as (keyof typeof s.attributes)[])s.attributes[k]=1054;s.proficiency.power=650;
 result(s);result(s);s.career.pending=pendingRoleEvent(s);assert.ok(applyRoleChoice(s,'six'));assert.equal(s.career.battingOrder,6);assert.equal(pendingRoleEvent(s),null);
 result(s,6);s.career.pending=pendingRoleEvent(s);assert.equal(s.career.pending,'bat_path');assert.ok(roleChoices(s).some(c=>c.id==='leadoff'&&!c.disabled));assert.ok(applyRoleChoice(s,'center'));assert.equal(s.career.battingOrder,3);
 result(s,3);s.records.at(-1)!.match.batting.doubles=2;s.career.pending=pendingRoleEvent(s);assert.ok(applyRoleChoice(s,'cleanup'));assert.equal(s.career.battingOrder,4);assert.equal(s.career.history.length,3);assert.equal(pendingRoleEvent(s),null);
});
test('거절 보상은 같은 경기에서 반복할 수 없고 다음 경기 후 다시 제안한다',()=>{
 const s=createGame('계속','batter');s.trust=40;result(s);result(s);s.career.pending=pendingRoleEvent(s);const before=s.attributes.mental;
 assert.ok(applyRoleChoice(s,'stay'));assert.equal(s.attributes.mental,before+17);assert.equal(applyRoleChoice(s,'stay'),false);assert.equal(pendingRoleEvent(s),null);
 result(s);assert.equal(pendingRoleEvent(s),'bat_six');
});
test('중계 두 경기의 비율 성적과 적성으로 보직을 제안하고 시즌 동안 유지한다',()=>{
 const s=createGame('보직','pitcher');s.trust=45;for(const k of Object.keys(s.attributes) as (keyof typeof s.attributes)[])s.attributes[k]=803;
 result(s);assert.equal(pendingRoleEvent(s),null);result(s);s.career.pending=pendingRoleEvent(s);assert.equal(s.career.pending,'pitch_role');assert.ok(roleChoices(s).filter(c=>!c.disabled).length===3);
 assert.ok(applyRoleChoice(s,'closer'));assert.equal(s.career.pitchingRole,'closer');result(s);assert.equal(pendingRoleEvent(s),null);
});
test('감독 면담은 경기 화면 다음에 한 번만 열리고 선택 후 주말로 돌아간다',()=>{
 let s=createGame('면담','batter');s.trust=40;result(s);result(s);s.phase='matchEnd';
 s=transition(s,{type:'continue',revision:s.revision});assert.equal(s.phase,'roleEvent');
 const action={type:'choice' as const,id:'stay',revision:s.revision};s=transition(s,action);assert.equal(s.phase,'weekend');assert.equal(transition(s,action),s);
});
