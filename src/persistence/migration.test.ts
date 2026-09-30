import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSave,saveGame,loadGame,SAVE_KEY,BACKUP_KEY} from './save.ts';
import {transition} from '../game/engine.ts';
import {defaultSupports} from '../content/supports.ts';

const fixture=(role:string,phase:string)=>readFileSync(new URL(`./fixtures/v1-${role}-${phase}.json`,import.meta.url),'utf8');
test('real v1 saves migrate with original stats, RNG and March records intact',()=>{
  for(const role of ['batter','pitcher'])for(const phase of ['start','match','complete']){
    const raw=fixture(role,phase),old=JSON.parse(raw),s=parseSave(raw);
    assert.equal(s.version,4);assert.equal(s.name,old.name);assert.equal(s.rng,old.rng);
    assert.deepEqual(s.stats,old.stats);assert.equal(s.energy,old.energy);assert.equal(s.trust,old.trust);
    if(phase==='complete'){
      assert.equal(s.month,4);assert.equal(s.phase,'lineup');assert.equal(s.week,1);
      assert.equal(s.records.length,1);assert.deepEqual(s.records[0].match.batting,old.match.batting);
      assert.equal(s.schedule.length,5);assert.equal(s.match,null);
    }else if(phase==='start')assert.equal(s.phase,'lineup');
    else {assert.equal(s.phase,old.phase);assert.deepEqual(s.match?.last,old.match.last);}
    assert.deepEqual(parseSave(JSON.stringify(s)),s);
  }
});
test('loading is read-only; first current save backs up exact legacy data before replacing it',()=>{
  const raw=fixture('pitcher','complete'),items=new Map([[SAVE_KEY,raw]]);
  const storage={getItem:(k:string)=>items.get(k)??null,setItem:(k:string,v:string)=>{items.set(k,v);}};
  const loaded=loadGame(storage);assert.equal(loaded.kind,'ok');assert.equal(items.size,1);
  if(loaded.kind!=='ok')throw Error('load');
  const next=transition(loaded.state,{type:'lineup',supports:defaultSupports('pitcher'),revision:loaded.state.revision});
  assert.equal(saveGame(next,storage),true);assert.equal(items.get(BACKUP_KEY),raw);
  assert.deepEqual(parseSave(items.get(SAVE_KEY)!),next);
  assert.equal(saveGame(next,storage),true);assert.equal(items.get(BACKUP_KEY),raw);
});
test('a failed backup leaves the legacy save untouched',()=>{
  const raw=fixture('batter','complete');let overwritten=false;
  const storage={getItem:(k:string)=>k===SAVE_KEY?raw:null,setItem:(k:string)=>{if(k===BACKUP_KEY)throw Error('quota');overwritten=true;}};
  assert.equal(saveGame(parseSave(raw),storage),false);assert.equal(overwritten,false);
});
