import {availableSkills} from '../content/skills.ts';
import type {GameState,Match,SkillId} from '../game/types.ts';
const unique=(items:unknown[])=>new Set(items).size===items.length;
const fail=(s:string):never=>{throw Error(s);};

export function validateLoop(s:GameState){
 const count=s.schedule.length,w=s.schedule.at(-1)!;
 const support=['supportEvent','supportResult'].includes(s.phase);
 if(s.phase==='lineup'&&(s.weekdayPart!==1||w.weekday||w.weekday2))fail('편성 시점이 올바르지 않습니다.');
 if(s.phase==='weekday'&&(Boolean(w.weekday)!==(s.weekdayPart===2)||w.weekday2))fail('전후반 활동 슬롯이 맞지 않습니다.');
 if(support&&(!w.weekday||Boolean(w.weekday2)!==(s.weekdayPart===2)))fail('활동 이후의 사건 위치가 맞지 않습니다.');
 if(!['lineup','weekday'].includes(s.phase)&&!support&&(!w.weekday||!w.weekday2||s.weekdayPart!==2))fail('평일 활동이 완료되지 않았습니다.');
 const expected=s.schedule.flatMap((w,i)=>[...(w.weekday?[{key:i+1,part:1}]:[]),...(w.weekday2?[{key:i+1,part:2}]:[])]);
 if(expected.length!==s.encounterHistory.length||s.encounterHistory.some((e,i)=>e.key!==expected[i].key||e.part!==expected[i].part))fail('인카운터 추첨 이력이 맞지 않습니다.');
 const growth=new Set<string>(),unlocks=new Set<string>();let previous:string|null=null;
 for(const e of s.encounterHistory){
  const ongoing=e.key===count&&e.part===s.weekdayPart&&support;
  if(e.eventId){
   const event=s.content.events.find(event=>event.id===e.eventId)||fail('사건 정의가 없습니다.');
   if(e.support!==event.owner||e.eventId===previous)fail('카드 인카운터가 올바르지 않습니다.');
   if(!e.support||!s.supports.includes(e.support))fail('덱에 없는 카드의 인카운터입니다.');
   if((e.choice===null)!==(ongoing&&s.phase==='supportEvent'))fail('인카운터 선택 결과가 맞지 않습니다.');
   if(event.previous&&!growth.has(event.previous))fail('성장 사건의 선행 이력이 없습니다.');
   if(event.kind==='growth'){
    if(growth.has(event.id))fail('성장 인카운터가 중복되었습니다.');
    if(e.choice!==null)growth.add(event.id);
   }
   if(e.choice!==null)for(const id of event.choices[e.choice].unlocks)if(s.content.cards.find(c=>c.id===e.support)?.ultimates[s.role]===id)unlocks.add(id);
  }else if(e.support||e.choice!==null||ongoing)fail('발생하지 않은 인카운터의 결과가 있습니다.');
  if(ongoing&&(s.activeEncounter!==e.eventId||s.activeSupport!==e.support))fail('진행 중 카드가 일치하지 않습니다.');
  previous=e.eventId;
 }
 if(growth.size!==s.supportCompleted.length||s.supportCompleted.some(id=>!growth.has(id)))fail('성장 사건 완료 보상이 맞지 않습니다.');
 if(unlocks.size!==s.unlockedSkills.length||s.unlockedSkills.some(id=>!unlocks.has(id)))fail('상위 스킬의 개방 보상이 맞지 않습니다.');
 if(Boolean(s.activeEncounter)!==support)fail('인카운터 복귀 위치가 올바르지 않습니다.');
}
export function validateSkillChecks(s:GameState,m:Match){
 const valid=availableSkills(s).map(k=>k.id),actions=s.role==='batter'?['contact','power','patient','bunt']:['fastball','breaking','control','chase'];
 let order=-1,inning=0;
 for(const e of m.skillChecks){
  if(e.half!==(s.role==='batter'?1:0)||e.order<=order||e.order>=m.order[e.half]||e.inning<inning||e.inning>m.inning)fail('스킬 판정 타석 순서가 올바르지 않습니다.');
  if(!actions.includes(e.tactic)||(e.source==='auto'&&e.tactic!==(s.role==='batter'?'contact':'control')))fail('스킬 판정 작전이 올바르지 않습니다.');
  if(!unique(e.eligible)||!unique(e.active)||e.eligible.some(id=>!valid.includes(id as SkillId)||!s.skills.includes(id as SkillId))||e.active.some(id=>!e.eligible.includes(id)))fail('스킬 발동 이력이 올바르지 않습니다.');
  if(m.appearance==='reserve'||m.appearance==='substitute'&&e.inning<7||s.role==='batter'&&m.appearance==='starter'&&e.order%9!==m.battingOrder-1)fail('출전하지 않은 타석의 스킬 판정입니다.');
  order=e.order;inning=e.inning;
 }
 if(m.skillChecks.filter(e=>e.source==='manual').length!==m.highlights)fail('선택 타석의 스킬 판정이 누락되었습니다.');
 const expected=s.role==='pitcher'?m.faced:m.batting.pa;
 if(m.skillChecks.length!==expected)fail('스킬 판정과 개인 기록이 다릅니다.');
}
