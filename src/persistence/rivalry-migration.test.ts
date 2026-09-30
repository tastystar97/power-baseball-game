import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSave,saveGame,loadGame,SAVE_KEY} from './save.ts';
import {createGame,transition,previewActivity} from '../game/engine.ts';
import {defaultSupports} from '../content/supports.ts';
test('v4 migrates every v3 stage without rewriting a fixed appearance or old duel history',()=>{
 for(const role of ['batter','pitcher'])for(const stage of ['start','weekday','event','support-event','selection','match','match-result','weekend','complete']){
  const raw=readFileSync(new URL(`./fixtures/v3-${role}-${stage}.json`,import.meta.url),'utf8'),old=JSON.parse(raw),s=parseSave(raw);
  assert.equal(s.version,4);assert.deepEqual(s.stats,old.stats);assert.equal(s.rng,old.rng);assert.deepEqual(s.skills,old.skills);assert.deepEqual(s.bonds,old.bonds);
  assert.equal(s.phase,old.phase);assert.deepEqual(s.selectionHistory,[]);assert.equal(s.competitor.weeks.length,s.schedule.filter(w=>w.weekday).length);
  assert.ok(s.competitor.weeks.every(w=>w.source==='migrated'&&!w.sharedPrimary));
  if(s.evaluation){assert.equal(s.evaluation.basis,'legacy');assert.equal(s.evaluation.rank,old.evaluation.rank);assert.equal(s.evaluation.total,old.evaluation.total);}
  if(s.match){assert.equal(s.match.duels,null);assert.deepEqual(s.match.last,old.match.last);}
  assert.ok(s.records.every(r=>r.match.duels===null));assert.deepEqual(parseSave(JSON.stringify(s)),s);
  if(stage==='selection'){const n=transition(s,{type:'continue',revision:s.revision});assert.equal(n.match?.appearance,old.evaluation.rank);assert.equal(n.match?.duels,null);assert.deepEqual(parseSave(JSON.stringify(n)),n);}
 }
});
test('v3 backup is verbatim and backup failure preserves original',()=>{
 const raw=readFileSync(new URL('./fixtures/v3-pitcher-selection.json',import.meta.url),'utf8');
 const items=new Map([[SAVE_KEY,raw]]);const storage={getItem:(k:string)=>items.get(k)??null,setItem:(k:string,v:string)=>{items.set(k,v);}};
 const result=loadGame(storage);assert.equal(result.kind,'ok');assert.equal(items.size,1);
 const s=parseSave(raw);assert.equal(saveGame(s,{...storage,setItem:()=>{throw Error('full');}}),false);assert.equal(items.get(SAVE_KEY),raw);
 assert.equal(saveGame(s,storage),true);assert.equal(items.get('last-summer.backup.v3'),raw);
});
test('weekday rival growth matches previews and cannot be repeated by old actions',()=>{
 let s=createGame('경쟁','pitcher',71);assert.equal(s.version,4);
 s=transition(s,{type:'lineup',supports:defaultSupports('pitcher'),revision:s.revision});
 const p=previewActivity(s,'control')!;const a={type:'activity' as const,id:'control',revision:s.revision};
 const n=transition(s,a);assert.equal(n.competitor.weeks.length,1);assert.deepEqual(n.competitor.weeks[0].gains,p.competitorGrowth!.success);
 assert.equal(transition(n,a),n);assert.deepEqual(parseSave(JSON.stringify(n)),n);
});
