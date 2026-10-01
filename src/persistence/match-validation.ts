import type {GameState,Match} from '../game/types.ts';
import type {PlayEvent} from '../game/plate.ts';
import {createScoreState,applyPlay,advanceHalf,enterPitcher,leavePitcher,finishPitching} from '../game/scoring.ts';
import {equalData} from './rivalry-validation.ts';
import {pendingRoleEvent} from '../game/career-role.ts';
const fail=(text:string):never=>{throw Error(text);};
export function validPlaybackIndex(m:Match,index:number){
 if(!Number.isInteger(index)||index<0||index>m.feed.length)return false;
 if(index===0)return true;
 const previous=m.feed[index-1],next=m.feed[index];
 return next?previous.inning!==next.inning||previous.half!==next.half:m.over||previous.inning!==m.inning||previous.half!==m.half;
}
function checkMovement(e:PlayEvent){
 const bases=structuredClone(e.before.bases),score=[...e.before.score];let outs=e.before.outs;
 const used=new Set<string>();
 for(const move of e.moves){
  if(used.has(move.runner.id)||outs>=3)fail('플레이 주자 이동이 중복되거나 종료 후 발생했습니다.');used.add(move.runner.id);
  if(move.from){if(!equalData(bases[move.from-1],move.runner))fail('출발 베이스의 주자가 다릅니다.');bases[move.from-1]=null;}
  else if(move.runner.id!==e.batter.id)fail('타자와 출루 주자가 다릅니다.');
  if(move.to==='out')outs++;
  else if(move.to===4)score[e.half]++;
  else {if(bases[move.to-1])fail('같은 베이스에 주자가 둘입니다.');bases[move.to-1]=move.runner;}
 }
 if(!equalData({outs,bases,score},e.after)||e.outs!==outs-e.before.outs||e.runs!==score[e.half]-e.before.score[e.half]||e.rbi!==(e.outcome==='error'||e.outcome==='doublePlay'?0:e.runs))fail('플레이의 이동·아웃·득점 합계가 맞지 않습니다.');
 if(e.kind==='steal'&&!['stolenBase','caughtStealing'].includes(e.outcome)||e.kind==='plate'&&['stolenBase','caughtStealing'].includes(e.outcome))fail('플레이 종류가 다릅니다.');
 if(e.outcome==='doublePlay'&&(!e.before.bases[0]||e.before.outs>=2)||e.outcome==='sacrificeFly'&&(!e.before.bases[2]||e.before.outs>=2)||e.outcome==='sacrificeBunt'&&(!e.before.bases.some(Boolean)||e.before.outs>=2))fail('불가능한 희생·병살 결과입니다.');
}
export function validateMatch(m:Match,role:GameState['role']){
 if(!m.rosters||m.rosters[0].teamId!==(m.opponentId??'haesol')||m.rosters[1].teamId!=='cheongram')fail('경기 선수단이 없습니다.');
 if(m.lines.some(line=>line.length!==m.inning)||m.lines.some((line,i)=>line.reduce((a,b)=>a+b,0)!==m.score[i]))fail('이닝 점수가 일치하지 않습니다.');
 for(const team of [0,1] as const){
  const r=m.rosters![team];
  if(new Set(r.batters.map(p=>p.id)).size!==9||r.batters.some((p,i)=>p.slot!==i+1)||new Set(r.pitchers.map(p=>p.id)).size!==r.pitchers.length)fail('선수단 중복 또는 타순이 올바르지 않습니다.');
  if(!r.pitchers.some(p=>p.id===m.pitcherIds[team])||new Set(m.usedPitchers[team]).size!==m.usedPitchers[team].length||m.usedPitchers[team].some(id=>!r.pitchers.some(p=>p.id===id)))fail('투수 교체 이력이 올바르지 않습니다.');
 }
 if(m.appearance==='reserve'&&(Object.values(m.batting).some(Boolean)||Object.values(m.pitching).some(Boolean)||m.highlights||m.load||!m.retired))fail('대기 선수의 출전 기록이 있습니다.');
 for(const b of [m.batting,...Object.values(m.batterLines)])if(b.hits>b.ab||b.hr+b.doubles+b.triples>b.hits||b.k>b.ab||b.pa!==b.ab+b.walks+b.hbp+b.sf+b.sh||b.errors>b.ab-b.hits)fail('타격 기록이 올바르지 않습니다.');
 for(const p of [m.pitching,...Object.values(m.pitcherLines)])if(p.k>p.outs||p.hr>p.hits||p.sv&&p.hold)fail('투구 기록이 올바르지 않습니다.');
 if(!validPlaybackIndex(m,m.playbackIndex)||m.summary&&m.playbackIndex!==0)fail('반 이닝 재생 위치가 올바르지 않습니다.');
 const keys=new Set<string>();
 for(const e of m.feed){
  const key=`${e.inning}:${e.half}:${e.order}:${e.kind}`;if(keys.has(key))fail('중복된 경기 플레이입니다.');keys.add(key);checkMovement(e);
  if(e.playerBatter!==(e.kind==='plate'&&e.batter.id==='player')||e.playerPitcher!==(e.pitcher.id==='player'))fail('플레이 주인공이 다릅니다.');
  if(m.summary&&!e.playerBatter&&!e.playerPitcher)fail('요약에 전체 플레이가 남아 있습니다.');
 }
 const personal=m.feed.filter(e=>e.kind==='plate'&&(e.playerBatter||e.playerPitcher));
 if(personal.length!==m.skillChecks.length||personal.some((e,i)=>{const check=m.skillChecks[i];return e.order!==check.order||e.half!==check.half||e.inning!==check.inning||e.tactic!==check.tactic||e.source!==check.source;}))fail('플레이와 스킬 판정이 다릅니다.');
 if(m.summary){
  if(!m.over||m.playerBoundary||m.awaiting||m.feed.some(e=>role==='batter'?e.playerPitcher:e.playerBatter))fail('완료 경기 요약이 올바르지 않습니다.');
  if(m.batterLines.player&&!equalData(m.batting,m.batterLines.player))fail('개인 타격 기록이 다릅니다.');
  if(m.pitcherLines.player){const p=m.pitcherLines.player;if(Object.keys(m.pitching).some(k=>m.pitching[k as keyof typeof m.pitching]!==p[k as keyof typeof m.pitching])||m.load!==p.load||m.faced!==p.faced)fail('개인 투구 기록이 다릅니다.');}
  return;
 }
 const replay=createScoreState(),current=['',''];
 for(const team of [0,1] as const){const first=m.rosters![team].pitchers.find(p=>p.duty==='starter')!;if(!first)fail('선발 투수가 없습니다.');current[team]=first.id;enterPitcher(replay,team,first.id,true);}
 for(const e of m.feed){
  const team=e.half===0?1:0;
  if(current[team]!==e.pitcher.id){leavePitcher(replay,current[team]);current[team]=e.pitcher.id;enterPitcher(replay,team,e.pitcher.id,false);}
  applyPlay(replay,e);advanceHalf(replay);
 }
 for(const team of [0,1] as const)if(current[team]!==m.pitcherIds[team]){leavePitcher(replay,current[team]);enterPitcher(replay,team,m.pitcherIds[team],false);}
 if(m.over)finishPitching(replay);
 for(const key of ['inning','half','outs','bases','score','lines','order','over','batting','pitching','faced','load','batterLines','pitcherLines','totals'] as const)if(!equalData(replay[key],m[key]))fail(`플레이 재생과 경기 ${key} 기록이 다릅니다.`);
}
export function validateCareer(s:GameState){
 let order:1|3|4|6|8=8,path:'undecided'|'leadoff'|'middle'='undecided',role:'middle'|'starter'|'closer'='middle';const completed:string[]=[],seen=new Set<string>();
 for(const h of s.career.history){
  if(seen.has(h.matchId)||!s.records.some(r=>r.match.id===h.matchId))fail('면담 경기 이력이 중복되거나 없습니다.');seen.add(h.matchId);
  const expected=s.role==='batter'?(order===8?'bat_six':order===6?'bat_path':order===3?'bat_cleanup':null):role==='middle'?'pitch_role':null;
  if(h.eventId!==expected)fail('면담 단계가 올바르지 않습니다.');
  if(h.choice==='stay')continue;
  if(h.eventId==='bat_six'&&h.choice==='six')order=6;
  else if(h.eventId==='bat_path'&&h.choice==='leadoff'){order=1;path='leadoff';}
  else if(h.eventId==='bat_path'&&h.choice==='center'){order=3;path='middle';}
  else if(h.eventId==='bat_cleanup'&&h.choice==='cleanup')order=4;
  else if(h.eventId==='pitch_role'&&(h.choice==='starter'||h.choice==='closer'))role=h.choice;
  else fail('면담 선택이 올바르지 않습니다.');completed.push(h.eventId);
 }
 if(order!==s.career.battingOrder||path!==s.career.battingPath||role!==s.career.pitchingRole||!equalData(completed,s.career.completed))fail('타순·보직과 면담 이력이 다릅니다.');
 if(s.phase==='roleEvent'?s.career.pending===null||s.career.pending!==pendingRoleEvent(s):s.career.pending!==null)fail('감독 면담 진행 위치가 다릅니다.');
}
