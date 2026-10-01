import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneFor} from '../ui/scene/director.ts';

const base={role:'batter' as const,phase:'weekday',weekdayPart:1 as const};

test('choosing a training shows the player alone, curious, at that training place', () => {
  const s=sceneFor({...base,activity:'batting'});
  assert.equal(s.place,'batting');
  assert.equal(s.time,'day');
  assert.deepEqual(s.cast.map(c=>[c.id,c.pos,c.expression,c.bubble]),[['player_batter','center','normal','question']]);
});

test('placed supports join the stage, at most two, and the player steps aside', () => {
  const s=sceneFor({...base,activity:'sense',present:['bat_senior','sera','yerin']});
  assert.deepEqual(s.cast.map(c=>[c.id,c.pos]),[['player_batter','left'],['bat_senior','right'],['sera','center']]);
});

test('success and failure change the expression and bubble but not the place', () => {
  const ok=sceneFor({...base,activity:'weights',outcome:'success'}),fail=sceneFor({...base,activity:'weights',outcome:'failure'});
  assert.equal(ok.place,fail.place);
  assert.deepEqual([ok.cast[0].expression,ok.cast[0].bubble],['determined','fire']);
  assert.deepEqual([fail.cast[0].expression,fail.cast[0].bubble],['sad','sigh']);
});

test('time of day follows the slot and indoor places stay indoor', () => {
  assert.equal(sceneFor({...base,weekdayPart:2,activity:'running'}).time,'dusk');
  assert.equal(sceneFor({...base,weekdayPart:2,activity:'study'}).time,'indoor');
  assert.equal(sceneFor({...base,phase:'weekend',activity:'outing'}).time,'dusk');
  assert.equal(sceneFor({...base,phase:'weekend',activity:'catch'}).time,'day');
});

test('an encounter puts the speaker opposite the dimmed player until the choice is made', () => {
  const asking=sceneFor({...base,phase:'supportEvent',speaker:'bat_senior'}),answered=sceneFor({...base,phase:'supportResult',speaker:'bat_senior',answered:true});
  assert.deepEqual(asking.cast.map(c=>[c.id,c.pos,!!c.dim]),[['player_batter','left',true],['bat_senior','right',false]]);
  assert.equal(answered.cast[0].dim,false);
  assert.equal(answered.cast[1].expression,'smile');
});

test('unknown activities fall back to a sensible place instead of failing', () => {
  assert.equal(sceneFor({...base,activity:'something_new'}).place,'ground');
  assert.equal(sceneFor({...base,phase:'weekend'}).place,'riverside');
  assert.equal(sceneFor({...base,role:'pitcher'}).cast[0].id,'player_pitcher');
});
