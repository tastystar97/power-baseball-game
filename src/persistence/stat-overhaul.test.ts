import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createGame,transition,previewActivity} from '../game/engine.ts';
import {parseSave,loadGame,SAVE_KEY} from './save.ts';

test('모든 구형 fixture를 원문 유지하며 거절하고 새 선수 안내를 제공한다',()=>{
 const dir=new URL('./fixtures/',import.meta.url);
 for(const file of readdirSync(dir).filter(f=>/^v[1-4]-.*\.json$/.test(f))){
  const raw=readFileSync(new URL(file,dir),'utf8');let writes=0;
  const storage={getItem:(k:string)=>k===SAVE_KEY?raw:null,setItem:()=>writes++};
  const loaded=loadGame(storage);assert.equal(loaded.kind,'invalid',file);
  if(loaded.kind==='invalid')assert.match(loaded.message,/새 선수/);
  assert.equal(writes,0);assert.equal(storage.getItem(SAVE_KEY),raw);
 }
 const v5=JSON.stringify({...createGame('테스트','pitcher'),version:5});assert.throws(()=>parseSave(v5),/새 게임/);
});

test('v6의 잘못된 역할 숙련·1차 누락·상한 초과를 거절한다',()=>{
 const s=createGame('검사','pitcher');
 for(const patch of [{proficiency:{contact:42,power:28,eye:24,speed:43,field:30}},{proficiency:{...s.proficiency,mental:40}},{attributes:{...s.attributes,sense:1501}},{attributes:{...s.attributes,intelligence:undefined}}]){
  assert.throws(()=>parseSave(JSON.stringify({...s,...patch})));
 }
});

test('새 원본 능력과 숙련을 왕복한 뒤 같은 훈련 미리보기와 결과를 얻는다',()=>{
 for(const role of ['batter','pitcher'] as const){
  const start=createGame('재개',role,42),s=transition(start,{type:'lineup',supports:['rival','catcher','classmate','bat_senior','pitch_senior','manager'],revision:0});
  s.attributes.power=628;s.attributes.sense=923;s.stress=90;
  const loaded=parseSave(JSON.stringify(s)),id=role==='batter'?'train_power':'velocity';
  assert.deepEqual(loaded,s);assert.deepEqual(previewActivity(loaded,id),previewActivity(s,id));
  const a={type:'activity' as const,id,revision:s.revision},n=transition(s,a);
  assert.deepEqual(transition(loaded,a),n);assert.equal(transition(n,a),n);
 }
});
