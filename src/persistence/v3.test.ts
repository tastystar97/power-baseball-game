import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseV3} from './v3.ts';
test('frozen v3 parser reads all real stages and rejects inconsistent saves',()=>{
 for(const role of ['batter','pitcher'])for(const stage of ['start','weekday','event','support-event','selection','match','match-result','weekend','complete']){
  const raw=readFileSync(new URL(`./fixtures/v3-${role}-${stage}.json`,import.meta.url),'utf8');
  const old=JSON.parse(raw);assert.deepEqual(parseV3(raw),old);
  if(stage==='selection'){old.evaluation.rank='reserve';assert.throws(()=>parseV3(JSON.stringify(old)));}
  if(stage==='event'){old.phase='weekday';assert.throws(()=>parseV3(JSON.stringify(old)));}
  if(stage==='complete'){old.records.push(old.records[0]);assert.throws(()=>parseV3(JSON.stringify(old)));old.records.pop();old.tournament.rounds[0].games[0].homeScore++;assert.throws(()=>parseV3(JSON.stringify(old)));}
 }
});
