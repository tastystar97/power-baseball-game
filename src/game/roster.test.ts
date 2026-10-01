import test from 'node:test';
import assert from 'node:assert/strict';
import {rosterFor,batterRatings,pitcherRatings} from './roster.ts';
import {rosterEntries,teamBases} from '../content/rosters.ts';
import {createGame} from './engine.ts';
import {teamIds} from './types.ts';

test('선수단은 승인된 타순·학년·특징으로 결정적으로 능력을 생성한다',()=>{
  const first=rosterEntries.mirim.batters[0];
  assert.equal(batterRatings(first,56).speed,71);
  assert.equal(batterRatings(first,56).contact,67);
  assert.equal(batterRatings(first,56).power,59);
  assert.equal(pitcherRatings(rosterEntries.mirim.pitchers[0],58).velocity,81);
  for(const team of teamIds)for(const p of [...rosterEntries[team].batters,...rosterEntries[team].pitchers]){
    const ratings=p.position==='P'?pitcherRatings(p,100):batterRatings(p,100);
    assert.ok(Object.values(ratings).every(n=>n>=0&&n<=100));
  }
});
test('8개 고교 선수 이름과 ID는 유일하며 아홉 타자와 2~3 투수를 가진다',()=>{
  const all=teamIds.flatMap(id=>[...rosterEntries[id].batters,...rosterEntries[id].pitchers]);
  assert.equal(new Set(all.map(p=>p.id)).size,all.length);
  assert.equal(new Set(all.map(p=>p.name)).size,all.length);
  for(const id of teamIds){assert.equal(rosterEntries[id].batters.length,9);assert.ok(rosterEntries[id].pitchers.length>=2);}
  assert.ok(teamBases.mirim.batting>teamBases.gangsan.batting);
});
test('주인공 타순을 옮겨도 동료 상대 순서는 보존하고 대기 시 준서가 자리를 맡는다',()=>{
  const s=createGame('타자','batter',42);
  const peers=rosterEntries.cheongram.batters.filter(p=>p.id!=='dojun').map(p=>p.id);
  for(const order of [8,6,1,3,4] as const){
    const roster=rosterFor('cheongram',s,{battingOrder:order,appearance:'starter'});
    assert.equal(roster.batters[order-1].id,'player');
    assert.deepEqual(roster.batters.filter(p=>p.id!=='player').map(p=>p.id),peers);
    assert.equal(rosterFor('cheongram',s,{battingOrder:order,appearance:'reserve'}).batters[order-1].id,'junseo');
  }
});
test('투수 보직에 맞게 시작·중계·마무리를 배치하고 편성 덱과 무관하게 동료를 유지한다',()=>{
  const s=createGame('투수','pitcher',42);
  for(const role of ['starter','middle','closer'] as const){
    const roster=rosterFor('cheongram',s,{pitchingRole:role,appearance:'starter'});
    assert.equal(roster.pitchers.find(p=>p.duty===role)?.id,'player');
    assert.equal(roster.batters[7].id,'dojun');
    assert.equal(rosterFor('cheongram',s,{pitchingRole:role,appearance:'reserve'}).pitchers.find(p=>p.duty===role)?.id,'junseo');
    assert.deepEqual(rosterFor('cheongram',{...s,supports:[]},{pitchingRole:role,appearance:'starter'}),roster);
  }
  assert.equal(rosterFor('haesol',s).pitchers[0].id,'taeo');
  assert.equal(rosterFor('haesol',s).batters[3].id,'jihwan');
});
