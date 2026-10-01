import type {GameState,Match,StatKey} from '../game/types.ts';
import type {CandidateScore,Starter} from '../game/rival-types.ts';
import {createCompetitor,growCompetitor,summarizeDuels} from '../game/rivalry.ts';
import {candidateScore,decideStarter} from '../game/competition.ts';
import {matchPlan,weekKey} from '../game/season.ts';
import {sharedTraining} from '../game/shared-training.ts';

export const equalData=(a:unknown,b:unknown):boolean=>{
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const ak=Object.keys(a),bk=Object.keys(b);
 return ak.length===bk.length&&ak.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&equalData((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k]));
};
function fail(message:string):never {throw Error(message);}
function checkScore(c:CandidateScore){
 if(c.readiness!==Math.max(c.practice,c.performance??0)||c.total!==c.ability+c.readiness+c.trust||c.readinessSource!==((c.performance??0)>c.practice?'match':'practice'))fail('경쟁 평가 합계가 맞지 않습니다.');
}
function checkDuels(s:GameState,m:Match){
 if(m.duels===null)return;
 const entries=m.duels;
 if(entries.length&&(m.opponentId!=='haesol'||m.appearance==='reserve'))fail('맞대결 상대나 출전 역할이 맞지 않습니다.');
 let order=-1,inning=0;const actions=s.role==='batter'?['contact','power','patient','bunt']:['fastball','breaking','control','chase'];
 for(const e of entries){
  if(e.half!==(s.role==='batter'?1:0)||e.order<=order||e.order>=m.order[e.half]||e.inning<inning||e.inning>m.inning)fail('맞대결 타석 순서가 올바르지 않습니다.');
  const play=m.feed.find(p=>p.kind==='plate'&&p.half===e.half&&p.order===e.order);
  if(!play||play.outcome!==e.outcome||play.source!==e.source||play.tactic!==e.tactic||(s.role==='batter'?(e.opponent!=='taeo'||play.pitcher.id!=='taeo'):(e.opponent!=='jihwan'||play.batter.id!=='jihwan')))fail('맞대결 선수와 타순이 다릅니다.');
  if(m.appearance==='substitute'&&e.inning<7)fail('교체 출전 전 맞대결이 있습니다.');
  if(!actions.includes(e.tactic)||(e.source==='auto'&&e.tactic!==(s.role==='batter'?'contact':'control'))||(e.outcome==='sacrificeBunt'&&(s.role!=='batter'||e.tactic!=='bunt')))fail('맞대결 작전이 올바르지 않습니다.');
  order=e.order;inning=e.inning;
 }
 if(entries.filter(e=>e.source==='manual').length>m.highlights)fail('선택 횟수보다 맞대결이 많습니다.');
 const t=summarizeDuels(entries);
 if(s.role==='batter'){
  const b=m.batting;if(t.ab>b.ab||t.hits>b.hits||t.hr>b.hr||t.walks>b.walks+b.hbp||t.k>b.k||entries.length>m.order[1])fail('맞대결 타격 성적이 전체 성적을 넘습니다.');
 }else {const p=m.pitching;if(t.ab+t.walks+t.sacrifices>m.faced||t.hits>p.hits||t.walks>p.walks+p.hbp||t.k>p.k)fail('맞대결 투구 성적이 전체 성적을 넘습니다.');}
}
export function validateRivalryState(s:GameState):void {
 if(s.competitor.weeks.length!==s.schedule.filter(w=>w.weekday2).length)fail('라이벌 성장 횟수가 주간 활동과 다릅니다.');
 let expected=createCompetitor(s.role);
 const progress=new Map<number,typeof expected>();
 for(const [i,w] of s.competitor.weeks.entries()){
  if(w.key!==i+1||w.source!=='v6')fail('라이벌 성장 이력이 올바르지 않습니다.');
  if(w.sharedPrimary!==sharedTraining(s,i,1)||w.sharedSecondary!==sharedTraining(s,i,2))fail('전후반 공동 훈련 기록이 맞지 않습니다.');
  expected=growCompetitor(expected,s.role,w.key,w.sharedPrimary,w.source,w.sharedSecondary);progress.set(w.key,expected);
 }
 if(!equalData(expected,s.competitor))fail('라이벌 능력과 성장 기록이 다릅니다.');
 const expectedIds=s.records.filter(r=>r.month>=4&&r.match.duels!==null).map(r=>r.match.id!);
 const currentId=matchPlan(s)?.id;
 if(s.evaluation?.basis==='rival'&&currentId&&!expectedIds.includes(currentId))expectedIds.push(currentId);
 if(!equalData(expectedIds,s.selectionHistory.map(h=>h.matchId)))fail('선발 경쟁 이력이 경기와 다릅니다.');
 let previous:Starter|null=null;
 for(const h of s.selectionHistory){
  const plan=matchPlan({...s,month:h.month,week:h.week});
  if(h.matchId!==plan?.id||h.previous!==previous)fail('선발 경쟁의 이전 명단이 다릅니다.');
  checkScore(h.player);checkScore(h.junseo);
  const c=progress.get(weekKey(h.month,h.week));
  if(!c||!equalData(h.junseo,candidateScore(s.role,c.stats,c.trust,null)))fail('차준서 평가와 당시 능력이 다릅니다.');
  const decision=decideStarter(h.player.total,h.junseo.total,previous);
  if(h.starter!==decision.starter||h.reason!==decision.reason)fail('선발 경쟁 결과가 올바르지 않습니다.');
  const record=s.records.find(r=>r.match.id===h.matchId);
  if(record&&record.match.appearance!==(h.starter==='player'?'starter':h.player.total>=52?'substitute':'reserve'))fail('경기 출전과 선발 경쟁 결과가 다릅니다.');
  previous=h.starter;
 }
 const e=s.evaluation;
 if(e){
  const h=s.selectionHistory.find(h=>h.matchId===currentId);
  if(!h||!equalData(h,e.competition))fail('현재 명단과 경쟁 기록이 다릅니다.');
  const p=h.player;
  if(e.total!==p.total||e.ability!==p.ability||e.performance!==p.readiness||e.trust!==p.trust||e.rank!==(h.starter==='player'?'starter':p.total>=52?'substitute':'reserve'))fail('현재 명단의 평가 항목이 다릅니다.');
 }
 for(const r of s.records)checkDuels(s,r.match);
 if(s.match)checkDuels(s,s.match);
}
