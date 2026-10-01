import {pitchingRoleNames} from '../content/career-events.ts';
import {derivedStats} from './abilities.ts';
import {matchPlan} from './season.ts';
import type { GameState } from './types.ts';
export const selectionThresholds={starter:65,substitute:52};
export function evaluateSelection(s:GameState) {
 const id=matchPlan(s)?.id||`preview-${s.month}-${s.week}`;
 const competition=compareCandidates(s,s.competitor,s.selectionHistory,id),p=competition.player;
 const rank=competition.starter==='player'?'starter':p.total>=52?'substitute':'reserve';
 return {ability:p.ability,performance:p.readiness,trust:p.trust,total:p.total,rank,basis:'rival',competition} as const;
}
export function appearanceName(s:Pick<GameState,'role'>&Partial<Pick<GameState,'career'>>,rank:'starter'|'substitute'|'reserve') {
  return rank==='starter'?(s.role==='pitcher'?`${pitchingRoleNames[s.career?.pitchingRole??'middle']} 투수`:'선발 타자'):rank==='substitute'?(s.role==='pitcher'?'구원 투수':'대타'):'출전 대기';
}
export const matchTitle=(month:number)=>month===3?'첫 연습경기':'4월 교류 리그 · 첫 공식전';

import type {Role,Stats} from './types.ts';
import type {CandidateScore,CompetitionSnapshot,RivalProgress,Starter} from './rival-types.ts';
export function candidateScore(role:Role,st:Stats,trustValue:number,records:GameState['records']|null):CandidateScore {
 const ability=Math.round(role==='batter'?st.contact*.5+st.power*.25+st.eye*.2+st.field*.2:st.control*.5+st.velocity*.25+st.breaking*.2+st.stamina*.2);
 const practice=Math.round(role==='batter'?(st.contact+st.power)/10:(st.control+st.velocity)/10);
 const played=records?.filter(r=>r.match.appearance!=='reserve'&&(role==='batter'?r.match.batting.pa>0:r.match.faced>0)).slice(-3);
 let performance:number|null=null;
 if(played?.length){
  if(role==='batter'){
   const sum=played.reduce((v,{match:m})=>{const b=m.batting;return {pa:v.pa+b.pa,ab:v.ab+b.ab,reach:v.reach+b.hits+b.walks+b.hbp+b.errors,tb:v.tb+b.hits+b.doubles+2*b.triples+3*b.hr,rbi:v.rbi+b.rbi,chances:v.chances+b.rbiChances};},{pa:0,ab:0,reach:0,tb:0,rbi:0,chances:0});
   const obp=(sum.reach+18*.33)/(sum.pa+18),slug=(sum.tb+18*.38)/(sum.ab+18),rbi=(sum.rbi+8*.18)/(sum.chances+8);
   performance=Math.round(Math.max(0,Math.min(20,8+(obp-.25)*35+(slug-.3)*15+rbi*6)));
  }else{
   const sum=played.reduce((v,{match:m})=>{const p=m.pitching;return {outs:v.outs+p.outs,runs:v.runs+p.runs,traffic:v.traffic+p.hits+p.walks+p.hbp,k:v.k+p.k,role:v.role+p.sv*.5+p.hold*.5-p.bs*.5};},{outs:0,runs:0,traffic:0,k:0,role:0});
   const runs=(sum.runs+18*.12)/(sum.outs+18),traffic=(sum.traffic+18*.4)/(sum.outs+18),k=(sum.k+18*.3)/(sum.outs+18);
   performance=Math.round(Math.max(0,Math.min(20,12+(.12-runs)*22+(.4-traffic)*12+(k-.3)*8+sum.role/played.length)));
  }
 }
 const readiness=Math.max(practice,performance??0),trust=Math.round(trustValue*.2);
 return {ability,practice,performance,readiness,readinessSource:(performance??0)>practice?'match':'practice',trust,total:ability+readiness+trust};
}
export function decideStarter(a:number,b:number,previous:Starter|null):{starter:Starter;reason:CompetitionSnapshot['reason']} {
 if(Math.max(a,b)<65)return {starter:'other',reason:'below_threshold'};
 if(a===b)return previous==='player'||previous==='junseo'?{starter:previous,reason:'incumbent'}:{starter:'player',reason:'first_chance'};
 return {starter:a>b?'player':'junseo',reason:'lead'};
}
export function compareCandidates(s:Pick<GameState,'role'|'attributes'|'proficiency'|'stress'|'trust'|'records'|'month'|'week'>,competitor:RivalProgress,history:CompetitionSnapshot[],matchId:string):CompetitionSnapshot {
 const player=candidateScore(s.role,derivedStats(s),s.trust,s.records.filter(r=>r.match.id!==matchId));
 const junseo=candidateScore(s.role,competitor.stats,competitor.trust,null),previous=history.filter(h=>h.matchId!==matchId).at(-1)?.starter??null;
 return {matchId,month:s.month,week:s.week,player,junseo,previous,...decideStarter(player.total,junseo.total,previous)};
}
