import {matchPlan} from './season.ts';
import type { GameState } from './types.ts';
export const selectionThresholds={starter:65,substitute:52};
export function evaluateSelection(s:GameState) {
 const id=matchPlan(s)?.id||`preview-${s.month}-${s.week}`;
 const competition=compareCandidates(s,s.competitor,s.selectionHistory,id),p=competition.player;
 const rank=competition.starter==='player'?'starter':p.total>=52?'substitute':'reserve';
 return {ability:p.ability,performance:p.readiness,trust:p.trust,total:p.total,rank,basis:'rival',competition} as const;
}
export function appearanceName(s:Pick<GameState,'role'>,rank:'starter'|'substitute'|'reserve') {
  return rank==='starter'?(s.role==='pitcher'?'선발 투수':'선발 타자'):rank==='substitute'?(s.role==='pitcher'?'구원 투수':'대타'):'출전 대기';
}
export const matchTitle=(month:number)=>month===3?'첫 연습경기':'4월 교류 리그 · 첫 공식전';

import type {Role,Stats} from './types.ts';
import type {CandidateScore,CompetitionSnapshot,RivalProgress,Starter} from './rival-types.ts';
export function candidateScore(role:Role,st:Stats,trustValue:number,records:GameState['records']|null):CandidateScore {
 const ability=Math.round(role==='batter'?st.contact*.5+st.power*.25+st.eye*.2+st.field*.2:st.control*.5+st.velocity*.25+st.breaking*.2+st.stamina*.2);
 const practice=Math.round(role==='batter'?(st.contact+st.power)/10:(st.control+st.velocity)/10);
 const played=records?.filter(r=>r.match.appearance!=='reserve').slice(-3);
 const scores=played?.map(({match:m})=>role==='batter'?Math.min(20,m.batting.hits*3+m.batting.walks*2+m.batting.rbi*2):Math.max(0,Math.min(20,m.pitching.outs+m.pitching.k*2-m.pitching.runs*2)));
 const performance=scores?.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
 const readiness=Math.max(practice,performance??0),trust=Math.round(trustValue*.2);
 return {ability,practice,performance,readiness,readinessSource:(performance??0)>practice?'match':'practice',trust,total:ability+readiness+trust};
}
export function decideStarter(a:number,b:number,previous:Starter|null):{starter:Starter;reason:CompetitionSnapshot['reason']} {
 if(Math.max(a,b)<65)return {starter:'other',reason:'below_threshold'};
 if(a===b)return previous==='player'||previous==='junseo'?{starter:previous,reason:'incumbent'}:{starter:'player',reason:'first_chance'};
 return {starter:a>b?'player':'junseo',reason:'lead'};
}
export function compareCandidates(s:Pick<GameState,'role'|'stats'|'trust'|'records'|'month'|'week'>,competitor:RivalProgress,history:CompetitionSnapshot[],matchId:string):CompetitionSnapshot {
 const player=candidateScore(s.role,s.stats,s.trust,s.records.filter(r=>r.match.id!==matchId));
 const junseo=candidateScore(s.role,competitor.stats,competitor.trust,null),previous=history.filter(h=>h.matchId!==matchId).at(-1)?.starter??null;
 return {matchId,month:s.month,week:s.week,player,junseo,previous,...decideStarter(player.total,junseo.total,previous)};
}
