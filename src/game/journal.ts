import type {GameState,JournalEntry} from './types.ts';
import {resultEffect} from '../content/match-presentation.ts';

type JournalInput=Pick<JournalEntry,'title'|'text'|'changes'>&Partial<Omit<JournalEntry,'id'|'action'>>;
export function appendJournal(s:GameState,input:JournalInput):JournalEntry {
 const match=s.phase.startsWith('match'),event=s.phase.startsWith('support')||s.phase==='roleEvent';
 const slot=match?'match':s.phase==='weekend'?'weekend':s.phase==='weekday'||s.phase.startsWith('support')?(s.weekdayPart===1?'first':'second'):undefined;
 const entry:JournalEntry={id:++s.logSequence,action:s.revision+1,month:s.month,week:s.week,...(slot?{slot}:{}),
  kind:event?'dialogue':'action',category:match?'match':event?'event':'training',speaker:event?(s.activeSupport??'coach'):null,...input};
 s.log.push(entry);return entry;
}

/** Keep the latest action readable at month rollover; fold it on the next committed action. */
export function compactJournal(s:GameState,latestAction=s.revision){
 const keep:JournalEntry[]=[],groups=new Map<string,JournalEntry[]>();
 for(const e of s.log){
  if(e.month>=s.month||e.action===latestAction){keep.push(e);continue;}
  const key=`${e.month}:${e.category}`,group=groups.get(key)??[];group.push(e);groups.set(key,group);
 }
 for(const entries of groups.values()){
  const last=entries.at(-1)!,changes:Record<string,number>={},failedSlots:NonNullable<JournalEntry['summary']>['failedSlots']=[];
  let count=0,failures=0;
  for(const e of entries){
   count+=e.summary?.count??1;
   failures+=e.summary?.failures??(e.training?.outcome==='failure'?1:0);
   for(const [key,value] of Object.entries(e.changes))changes[key]=(changes[key]??0)+value;
   failedSlots.push(...(e.summary?.failedSlots??(e.training?.outcome==='failure'&&(e.slot==='first'||e.slot==='second')?[{week:e.week,part:e.slot==='first'?1 as const:2 as const}]:[])));
  }
  keep.push({id:last.id,action:last.action,month:last.month,week:4,title:`${last.month}월 요약`,text:`${count}개의 기록을 모았다. 변화량은 한 달의 합계다.`,
   kind:'system',category:last.category,speaker:null,changes,summary:{count,failures,failedSlots}});
 }
 s.log=keep.sort((a,b)=>a.id-b.id);
}

export function journalFailed(s:GameState,month:number,week:number,part:1|2){
 return s.log.some(e=>e.month===month&&(e.summary?.failedSlots.some(f=>f.week===week&&f.part===part)||e.week===week&&e.slot===(part===1?'first':'second')&&e.training?.outcome==='failure'));
}

export function logEncounter(s:GameState){
 const h=s.encounterHistory.at(-1)!;
 appendJournal(s,{title:'활동 뒤 만남',text:h.eventId?'연습을 마치자 동료가 말을 걸었다.':'오늘은 조용히 다음 일정을 준비했다.',
  kind:'system',category:'event',speaker:null,changes:{},roll:{kind:'encounter',outcome:h.eventId?'appeared':'quiet'}});
}

export function logMatchPlays(s:GameState,from:number){
 const m=s.match!;
 m.feed.slice(from).forEach((p,offset)=>{
  if(!p.playerBatter&&!p.playerPitcher&&!p.runs)return;
  appendJournal(s,{title:'경기 장면',text:`${p.inning}회${p.half===0?'초':'말'} · ${p.batter.name} — ${resultEffect(p).label}${p.runs?` · ${p.runs}득점`:''} · 청람고 ${p.after.score[1]} : ${p.after.score[0]}`,
   kind:'action',category:'match',slot:'match',speaker:null,changes:{},matchRef:{id:m.id!,index:from+offset+1}});
 });
}

/** The engine may have already resolved the inning; the journal must not reveal it early. */
export function visibleJournal(s:GameState){
 return s.log.filter(e=>!e.matchRef||e.matchRef.id!==s.match?.id||!s.phase.startsWith('match')||e.matchRef.index<=s.match.playbackIndex);
}

export function activityRolls(s:GameState,action:number){
 return s.log.filter(e=>e.action===action&&e.roll).map(e=>{
  const roll=e.roll!,good=roll.outcome==='success'||roll.outcome==='appeared';
  return {id:e.id,...roll,face:good?'★' as const:roll.outcome==='failure'?'✕' as const:'●' as const,
   tone:good?'good' as const:roll.outcome==='failure'?'bad' as const:'neutral' as const,
   label:({success:'훈련 성공',failure:'훈련 실패',appeared:'동료와의 만남',quiet:'조용한 하루'})[roll.outcome]};
 });
}
