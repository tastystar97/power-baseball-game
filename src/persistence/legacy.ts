import { stateSchema, statKeys } from './legacy-schema.ts';
import type { GameState } from './legacy-schema.ts';
export const SAVE_KEY='last-summer.save.v1';
export type LoadResult={kind:'ok';state:GameState}|{kind:'empty'}|{kind:'invalid';message:string}|{kind:'unavailable';message:string};
export function parseSave(raw:string):GameState {
  const s=stateSchema.parse(JSON.parse(raw));
  const matchPhase=['match','matchResult','matchEnd'].includes(s.phase);
  if(matchPhase&&(!s.match||s.week!==4))throw new Error('경기 상태가 빠졌습니다.');
  if(s.phase==='complete'&&(s.week!==4||!s.match?.over||!s.matchRecorded))throw new Error('완료 상태가 올바르지 않습니다.');
  if(s.phase==='match'&&(!s.match!.awaiting||s.match!.over))throw new Error('승부 선택 상태가 올바르지 않습니다.');
  if(s.phase==='matchResult'&&(!s.match!.last||s.match!.awaiting))throw new Error('승부 결과가 없습니다.');
  if(s.phase==='matchEnd'&&(!s.match!.over||!s.matchRecorded))throw new Error('경기가 아직 끝나지 않았습니다.');
  if(s.schedule.length!==s.week||s.schedule.some((w,i)=>w.week!==i+1))throw new Error('활동 기록이 올바르지 않습니다.');
  if(new Set(s.completedEvents).size!==s.completedEvents.length)throw new Error('사건 기록이 중복되었습니다.');
  if(['event','eventResult'].includes(s.phase)&&s.week>3)throw new Error('사건 주차가 올바르지 않습니다.');
  const eventDone=s.week<=3&&!['weekday','event'].includes(s.phase);
  const expectedEvents=Array.from({length:Math.min(s.week-1,3)+(eventDone?1:0)},(_,i)=>i+1);
  if(expectedEvents.length!==s.completedEvents.length||expectedEvents.some((n,i)=>s.completedEvents[i]!==n))throw new Error('사건 이력과 진행 단계가 맞지 않습니다.');
  const weekendDone=['weekendEvent','weekendResult','complete'].includes(s.phase);
  for(const [i,w] of s.schedule.entries()) {
    if(i<s.week-1&&(!w.weekday||!w.weekend))throw new Error('이전 주 활동이 완료되지 않았습니다.');
    if(i===s.week-1&&(Boolean(w.weekday)!==(s.phase!=='weekday')||Boolean(w.weekend)!==weekendDone))throw new Error('활동 슬롯과 진행 단계가 맞지 않습니다.');
  }
  if(['weekendEvent','weekendResult'].includes(s.phase)&&s.schedule[s.week-1].weekend!=='동료와 캐치볼')throw new Error('주말 사건의 선행 활동이 없습니다.');
  const matchExists=s.week===4&&s.phase!=='weekday';
  const recorded=matchExists&&['matchEnd','weekend','weekendEvent','weekendResult','complete'].includes(s.phase);
  if(Boolean(s.match)!==matchExists||s.matchRecorded!==recorded)throw new Error('경기 이력과 진행 단계가 맞지 않습니다.');
  for(const key of [...statKeys,'energy','stress','academics','trust','rival','catcher'])if(!(key in s.initial)||!(key in s.weekStart))throw new Error('능력 기록이 없습니다.');
  if(s.match) {
    const m=s.match;
    if(m.awaiting!==(s.phase==='match')||(recorded&&!m.over))throw new Error('경기 처리 위치가 올바르지 않습니다.');
    if(s.phase==='match'&&(m.outs>=3||m.highlights>=3||(s.role==='pitcher'?(m.retired||m.half!==0||m.faced!==m.highlights*3):(m.half!==1||m.order[1]%9!==4))))throw new Error('선수가 선택할 수 없는 경기 상태입니다.');
    if(m.lines[0].length!==m.inning||m.lines[1].length!==m.inning)throw new Error('이닝 기록이 올바르지 않습니다.');
    for(const team of [0,1])if(m.lines[team].reduce((a,b)=>a+b,0)!==m.score[team])throw new Error('점수가 일치하지 않습니다.');
    if(m.batting.hits>m.batting.ab||m.batting.hr>m.batting.hits)throw new Error('타격 기록이 올바르지 않습니다.');
    if(m.pitching.k>m.pitching.outs)throw new Error('투구 기록이 올바르지 않습니다.');
  }
  return s;
}
export function loadGame(storage:Pick<Storage,'getItem'>):LoadResult {
  let raw:string|null;
  try {raw=storage.getItem(SAVE_KEY);}catch{return {kind:'unavailable',message:'브라우저 저장소를 사용할 수 없습니다. 이번 플레이는 저장되지 않습니다.'};}
  if(raw===null)return {kind:'empty'};
  try{return {kind:'ok',state:parseSave(raw)};}catch{return {kind:'invalid',message:'저장 데이터가 손상되었거나 지원하지 않는 형식입니다. 기존 데이터는 그대로 보존했습니다.'};}
}
export function saveGame(state:GameState,storage:Pick<Storage,'setItem'>) {
  try{storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}
}

