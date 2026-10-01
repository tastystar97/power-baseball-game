import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resultFace,diceFaces,resultEffect} from '../content/match-presentation.ts';
import {createGame} from './engine.ts';
import {createMatch,advanceMatch,chooseTactic} from './match.ts';
import {presentationAt} from './playback.ts';

test('dice shows the resolved outcome from the player perspective without changing the match or RNG',()=>{
 const s=createGame('연출','batter',3);s.match=createMatch();advanceMatch(s);chooseTactic(s,'contact');
 const event=s.match.feed.find(e=>e.source==='manual')!,before=structuredClone(s);
 assert.ok(event);
 for(const outcome of ['single','double','triple','homer','walk','hitByPitch'] as const){
  assert.equal(resultFace({...event,outcome,runs:0}),'★');
  assert.equal(resultFace({...event,outcome,runs:1,playerBatter:false,playerPitcher:true}),'✕');
 }
 assert.equal(resultFace({...event,outcome:'strikeout',runs:0}),'✕');
 assert.equal(resultFace({...event,outcome:'strikeout',runs:0,playerBatter:false,playerPitcher:true}),'★');
 assert.equal(resultFace({...event,outcome:'sacrificeBunt',runs:0}),'●');
 assert.equal(resultEffect({...event,outcome:'hitByPitch'}).label,'사구');
 for(let i=0;i<s.match.feed.length;i++){presentationAt(s.match,i);presentationAt(s.match,i,true);}
 assert.deepEqual(s,before);
});
test('dice outlook uses six symbol faces rather than a second roll',()=>{
 for(const [outlook,good] of [['유리',4],['보통',3],['불리',2]] as const){
  const faces=diceFaces(outlook);assert.equal(faces.length,6);assert.equal(faces.filter(f=>f==='★').length,good);
  assert.ok(faces.every(f=>['★','●','✕'].includes(f)));
 }
});
