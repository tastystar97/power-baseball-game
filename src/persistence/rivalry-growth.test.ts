import {defaultSupports} from '../content/supports.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition,previewActivity} from '../game/engine.ts';
import {parseSave} from './save.ts';
test('weekday rival growth matches previews and cannot be repeated by old actions',()=>{
 let s=createGame('경쟁','pitcher',71);assert.equal(s.version,8);
 s=transition(s,{type:'lineup',supports:defaultSupports('pitcher'),revision:s.revision});
 s=transition(s,{type:'activity',id:'rest',revision:s.revision});
 while(s.phase==='supportEvent'||s.phase==='supportResult')s=transition(s,{type:s.phase==='supportEvent'?'choice':'continue',index:0,revision:s.revision});
 const p=previewActivity(s,'control')!;const a={type:'activity' as const,id:'control',revision:s.revision};
 const n=transition(s,a);assert.equal(n.competitor.weeks.length,1);assert.deepEqual(n.competitor.weeks[0].gains,p.competitorGrowth!.success);
 assert.equal(transition(n,a),n);assert.deepEqual(parseSave(JSON.stringify(n)),n);
});
