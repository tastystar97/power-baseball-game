import {labels,primaryLabels} from '../game/types.ts';
import type {GameState,PrimaryKey} from '../game/types.ts';
import {changeLabel} from '../content/supports.ts';
import {visibleJournal} from '../game/journal.ts';

export type LogCategory='training'|'event'|'match'|'condition';
export type LineKind='act'|'talk'|'gain'|'loss'|'game'|'system';
export interface LogLine {key:string;entry:number;time:string;category:LogCategory;kind:LineKind;text:string;condition:boolean;speakerColor?:string}

export function journalSpeaker(s:GameState,id:string|null){
  const card=s.content.cards.find(c=>c.id===id);
  return id?{name:card?.name??(id==='coach'?'감독':id),color:card?.color??'#405f46'}:null;
}

const slotNames={first:'전반',second:'후반',weekend:'주말',match:'경기'} as const;

function changeText(s:GameState,key:string,value:number):string|null {
  // Proficiency (hidden baseball skill) never shows a number; it is summarized once per entry.
  if(key.startsWith('proficiency_'))return null;
  const label=key.startsWith('primary_')?primaryLabels[key.slice(8) as PrimaryKey]:changeLabel(s,key,labels[key]);
  return `${label} ${value>0?'+':''}${value}`;
}
const isGood=(key:string,value:number)=>key==='stress'?value<0:value>0;

/**
 * Turns the saved journal into display lines: one action line per entry, then a gain line and a
 * loss line when the entry changed anything. Newest entries come first.
 */
export function logLines(s:GameState):LogLine[] {
  const lines:LogLine[]=[];
  visibleJournal(s).forEach(e=>{
    const i=e.id,category=e.category;
    const time=e.summary?`${e.month}월 · 월 요약`:`${e.month}월 ${e.week}주${e.slot?` · ${slotNames[e.slot]}`:''}`;
    const entries=Object.entries(e.changes).filter(([,v])=>v!==0);
    const condition=category==='condition'||entries.some(([k])=>k==='energy'||k==='stress');
    const kind:LineKind=category==='match'?'game':({action:'act',dialogue:'talk',reward:'gain',loss:'loss',system:'system'} as const)[e.kind];
    const person=journalSpeaker(s,e.speaker);
    const text=person?`${e.title} · ${person.name}: “${e.text}”`:e.title===e.text||!e.text?e.title:`${e.title} · ${e.text}`;
    lines.push({key:`${i}-a`,entry:i,time,category,kind,text,condition,...(person?{speakerColor:person.color}:{})});
    const technical=entries.some(([k,v])=>k.startsWith('proficiency_')&&v>0);
    const good=entries.filter(([k,v])=>isGood(k,v)).map(([k,v])=>changeText(s,k,v)).filter(Boolean) as string[];
    const bad=entries.filter(([k,v])=>!isGood(k,v)).map(([k,v])=>changeText(s,k,v)).filter(Boolean) as string[];
    if(technical)good.push('기술 ▲');
    if(good.length)lines.push({key:`${i}-g`,entry:i,time:'',category,kind:'gain',text:good.join(' · '),condition});
    if(bad.length)lines.push({key:`${i}-l`,entry:i,time:'',category,kind:'loss',text:bad.join(' · '),condition});
  });
  return lines.reverse();
}

export type LogFilter='all'|LogCategory|'condition';
export const logFilters:{id:LogFilter;label:string}[]=[{id:'all',label:'전체'},{id:'training',label:'훈련·성장'},{id:'event',label:'사건·대화'},{id:'match',label:'경기'},{id:'condition',label:'컨디션'}];
export function filterLines(lines:LogLine[],filter:LogFilter):LogLine[] {
  return filter==='all'?lines:filter==='condition'?lines.filter(l=>l.condition):lines.filter(l=>l.category===filter);
}
