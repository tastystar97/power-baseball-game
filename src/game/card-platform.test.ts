import {encounterContent} from '../content/encounters.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,transition,previewActivity} from './engine.ts';
import type {GameState,Action} from './types.ts';
import {builtinPack} from '../cards/builtin.ts';
import {catalogFromPacks} from '../cards/catalog.ts';
import {createMatch,tactics} from './match.ts';
import {eligibleSkills} from './skill-activation.ts';
const deck=['bat_senior','pitch_senior','rival','catcher','manager','classmate'];
const act=(s:GameState,a:Omit<Action,'revision'>)=>transition(s,{...a,revision:s.revision});
const start=(role:'batter'|'pitcher',seed=123)=> (createGame as any)('새 덱',role,seed,catalogFromPacks([builtinPack]),deck) as GameState;
function step(s:GameState){return act(s,s.phase==='weekday'?{type:'activity',id:'rest'}:s.phase==='weekend'?{type:'activity',id:'weekend_rest'}:s.phase==='supportEvent'?{type:'choice',index:0}:s.phase==='roleEvent'?{type:'choice',id:'stay'}:s.phase==='match'&&s.match!.awaiting?{type:'tactic',id:s.role==='batter'?'contact':'control'}:{type:'continue'});}

test('선수 생성 덱 전체가 참여하며 월 전환에 재선택이 없다',()=>{
  let s=start('pitcher');assert.equal(s.phase,'weekday');assert.deepEqual(s.supports,deck);
  assert.equal(Object.keys(s.placements).length,6);
  assert.throws(()=>(createGame as any)('잘못된 덱','pitcher',1,catalogFromPacks([builtinPack]),deck.slice(0,5)));
  for(let i=0;i<150&&s.month===3;i++){const next=step(s);assert.notEqual(next,s);s=next;}
  assert.equal(s.month,4);assert.equal(s.phase,'weekday');assert.deepEqual(s.supports,deck);
  assert.equal(act(s,{type:'editLineup'}),s);
});
test('후반 사건을 마쳐도 평일 성장·보상을 반복하지 않고 주말로 간다',()=>{
  let found=false;
  for(let seed=1;seed<30&&!found;seed++){
    let s=start('batter',seed);
    while(s.phase==='weekday'&&s.weekdayPart===1||s.phase==='supportEvent'||s.phase==='supportResult'){
      s=step(s);if(s.phase==='weekday'&&s.weekdayPart===2)break;
    }
    s=step(s);
    if(s.phase!=='supportEvent')continue;
    found=true;assert.equal(s.weekdayPart,2);assert.equal(s.competitor.weeks.length,1);
    assert.equal(s.encounterHistory.length,2);
    const reward=step(s),again=transition(reward,{type:'choice',index:0,revision:s.revision});assert.equal(again,reward);
    s=step(reward);assert.equal(s.phase,'weekend');assert.equal(s.competitor.weeks.length,1);
    assert.equal(s.schedule[0].weekday2,'휴식');
  }
  assert.ok(found);
});
test('상위는 고유 사건으로 개방하고 일반 스킬과 SP를 갖춰야 배운다',()=>{
  let s=start('batter');s.skillPoints=200;for(const key of Object.keys(s.attributes))s.attributes[key as keyof typeof s.attributes]=923;
  for(const key of Object.keys(s.proficiency))s.proficiency[key as keyof typeof s.proficiency]=800;
  s.skills=['contact_focus'];assert.equal(act(s,{type:'learn',id:'contact_master'}),s);
  s.rival=100;s.catcher=100;for(const key of Object.keys(s.bonds))s.bonds[key as keyof typeof s.bonds]=100;
  for(let i=0;i<200&&!(s as any).unlockedSkills?.includes('contact_master');i++)s=step(s);
  assert.ok((s as any).unlockedSkills.includes('contact_master'));
  while(!['weekday','weekend','selection'].includes(s.phase))s=step(s);
  const before=s.skillPoints;s=act(s,{type:'learn',id:'contact_master'});
  assert.ok(s.skills.includes('contact_master'));assert.equal(before-s.skillPoints,24);
  assert.equal(act(s,{type:'learn',id:'contact_master'}),s);
  s.attributes.intelligence=1500;s.match=createMatch();assert.deepEqual(eligibleSkills(s,'contact'),['contact_master']);
  const boosted=tactics(s)[0].probabilities[3];s.skills=[];
  assert.ok(Math.abs(boosted-tactics(s)[0].probabilities[3]-.075*.9)<1e-9);
});
test('외부 카드의 선언적 동행 효과가 실제 훈련 미리 보기에 적용된다',()=>{
  const extra=structuredClone(builtinPack);extra.id='custom';extra.cards.find(c=>c.id==='sera')!.specialty='mental';
  const content=catalogFromPacks([builtinPack,extra]);
  const s=(createGame as any)('외부','batter',3,content,[...deck.slice(0,5),'custom/sera']) as GameState;
  s.placements={'custom/sera':'train_sense'};
  const p=previewActivity(s,'train_sense')!;assert.ok(p.gains.mental!>=2);assert.deepEqual(p.present,['custom/sera']);
  extra.cards.find(c=>c.id==='sera')!.specialty='power';
  assert.ok(previewActivity(s,'train_sense')!.gains.mental!>=2);
});

test('스킬 포인트 상한에서 실제 보상과 미리 보기가 일치한다',()=>{
 let s=start('pitcher',3);s.skillPoints=999;const p=previewActivity(s,'train_intelligence')!;assert.equal(p.points,1);s=act(s,{type:'activity',id:'train_intelligence'});assert.equal(s.skillPoints,1000);
 if(s.phase==='supportEvent'){s=act(s,{type:'choice',index:0});assert.equal(s.skillPoints,1000);}
});

test('18장 모두 양 역할에서 고유 사건 세 단계가 연결되고 해당 역할 상위만 개방된다',()=>{
 const content=catalogFromPacks([builtinPack]);
 for(const role of ['batter','pitcher'] as const)for(const card of builtinPack.cards){
  const ids=[card.id,...deck.filter(id=>id!==card.id).slice(0,5)];let s=createGame('카드별',role,17,content,ids);
  if(card.id==='rival')s.rival=100;else if(card.id==='catcher')s.catcher=100;else s.bonds[card.id]=100;
  for(let i=0;i<100&&!s.supportCompleted.includes(`${card.id}-growth-3`);i++)s=step(s);
  assert.ok(s.supportCompleted.includes(`${card.id}-growth-3`),`${card.name}/${role}`);
  const upper=card.ultimates[role];if(upper)assert.ok(s.unlockedSkills.includes(upper));
  const other=card.ultimates[role==='batter'?'pitcher':'batter'];if(other&&other!==upper)assert.ok(!s.unlockedSkills.includes(other));
 }
});

test('카드 사건은 체력·스트레스·인연 상한의 실제 보상을 미리 보여준다',()=>{
 const s=start('batter');s.energy=99;s.stress=1;s.bonds.manager=99;
 const c=encounterContent(s,'manager-daily-a').choices[1];assert.equal(c.energy,1);assert.equal(c.stress,-1);assert.equal(c.bond,1);
});
