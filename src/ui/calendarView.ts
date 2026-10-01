import {matchPlan,nextMatch,weekTitle} from '../game/season.ts';
import {teamName} from '../content/teams.ts';
import type {GameState} from '../game/types.ts';

export type CellState='done'|'now'|'future';
export interface CalendarWeek {
  month:number;week:number;title:string;state:CellState;
  first:string;second:string;weekend:string;
  /** Saturday match: upcoming opponent, or the played result. */
  match:{title:string;opponent:string;result?:string}|null;
}

// The current season has four playable months. Extend this when the year calendar arrives.
export const calendarMonths=[3,4,5,6] as const;

function stateOf(s:Pick<GameState,'month'|'week'|'phase'>,month:number,week:number):CellState {
  if(s.phase==='complete')return 'done';
  const at=(s.month-3)*4+s.week,here=(month-3)*4+week;
  return here<at?'done':here===at?'now':'future';
}

export function calendarWeek(s:GameState,month:number,week:number):CalendarWeek {
  const plan=matchPlan({...s,month,week});
  const played=plan?s.records.find(r=>r.match.id===plan.id)?.match:undefined;
  const done=s.schedule.find(w=>w.month===month&&w.week===week);
  const result=played?`${played.score[1]>played.score[0]?'승':played.score[1]<played.score[0]?'패':'무'} ${played.score[1]}:${played.score[0]}`:undefined;
  return {month,week,title:weekTitle({...s,month},week),state:stateOf(s,month,week),
    first:done?.weekday??'',second:done?.weekday2??'',weekend:done?.weekend??'',
    match:plan?{title:plan.title,opponent:teamName(plan.opponentId),...(result?{result}:{})}:null};
}

export function calendarMonth(s:GameState,month:number):CalendarWeek[] {
  return [1,2,3,4].map(w=>calendarWeek(s,month,w));
}

/** Weeks until the next unplayed match, counted from the current week (0 = this week). */
export function nextMatchCountdown(s:GameState):{title:string;opponent:string;weeks:number}|null {
  const plan=nextMatch(s);
  if(!plan)return null;
  return {title:plan.title,opponent:teamName(plan.opponentId),weeks:(plan.month-s.month)*4+plan.week-s.week};
}
