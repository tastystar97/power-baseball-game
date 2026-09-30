import { stateSchema, statKeys, supportIds } from './v3-schema.ts';
import type { GameState, Match } from './v3-schema.ts';
import { parseSave as parseV2 } from './v2.ts';
import {matchPlan,pairings,weekKey} from '../game/season.ts';
import { snapshot } from './defaults-v3.ts';
import { availableSkills } from '../content/skills.ts';
import { weeklyPlacements } from '../game/support.ts';

const selectionThresholds={starter:65,substitute:52};
export function evaluateSelection(s:Pick<GameState,'role'|'stats'|'trust'|'records'|'month'|'match'>) {
  const st=s.stats;
  const ability=Math.round(s.role==='batter'
    ?st.contact*.5+st.power*.25+st.eye*.2+st.field*.2
    :st.control*.5+st.velocity*.25+st.breaking*.2+st.stamina*.2);
  const history=s.month<=4?s.records.filter(r=>r.month===3):s.records.filter(r=>r.match.id!==s.match?.id).slice(-3);
  const performances=history.map(({match:prior})=>s.role==='batter'?Math.min(20,prior.batting.hits*3+prior.batting.walks*2+prior.batting.rbi*2):Math.max(0,Math.min(20,prior.pitching.outs+prior.pitching.k*2-prior.pitching.runs*2)));
  const performance=performances.length?Math.round(performances.reduce((sum,n)=>sum+n,0)/performances.length):0;
  const trust=Math.round(s.trust*.2);
  const total=ability+performance+trust;
  const rank=total>=selectionThresholds.starter?'starter':total>=selectionThresholds.substitute?'substitute':'reserve';
  return {ability,performance,trust,total,rank} as const;
}


// Keep the existing origin/key so existing players can continue their careers.
export const SAVE_KEY='last-summer.save.v1';
export const BACKUP_KEY='last-summer.backup.v1';
export const V2_BACKUP_KEY='last-summer.backup.v2';
export type LoadResult={kind:'ok';state:GameState;migrated?:boolean}|{kind:'empty'}|{kind:'invalid';message:string}|{kind:'unavailable';message:string};
function migrate(raw:string):GameState {
  const old=parseV2(raw);
  const matchMeta=(month:number,m:typeof old.match)=>m?{...m,id:`m${month}-w4`,opponentId:'haesol' as const}:null;
  const converted:GameState={...old,version:3,tournament:{rounds:[]},completedEvents:old.completedEvents.map(id=>id<=3?id:id+1),
    match:matchMeta(old.month,old.match),records:old.records.map(r=>({month:r.month,match:matchMeta(r.month,r.match)!}))};
  if(old.phase==='complete'){
    converted.month=5;converted.week=1;converted.phase='lineup';converted.match=null;converted.matchRecorded=false;converted.evaluation=null;converted.placements={};
    converted.weekStart=snapshot(converted);converted.monthStart=snapshot(converted);
    converted.schedule.push({month:5,week:1,weekday:'',weekend:''});
    converted.notice='봄의 기록을 이어받았다. 5월의 파트너를 고르고 여름 대회를 준비하자.';
  }
  return converted;
}
const unique=(items:unknown[])=>new Set(items).size===items.length;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function checkMatch(m:Match){
  if(m.lines[0].length!==m.inning||m.lines[1].length!==m.inning)throw Error('이닝 기록이 올바르지 않습니다.');
  for(const team of [0,1])if(m.lines[team].reduce((a,b)=>a+b,0)!==m.score[team])throw Error('점수가 일치하지 않습니다.');
  if(m.batting.hits>m.batting.ab||m.batting.hr>m.batting.hits||m.batting.k>m.batting.ab)throw Error('타격 기록이 올바르지 않습니다.');
  if(m.pitching.k>m.pitching.outs)throw Error('투구 기록이 올바르지 않습니다.');
  if(m.appearance==='reserve'&&(Object.values(m.batting).some(Boolean)||Object.values(m.pitching).some(Boolean)||m.highlights||m.load||!m.retired))throw Error('대기 선수의 출전 기록이 있습니다.');
}
export function parseV3(raw:string):GameState {
  const json=JSON.parse(raw);
  const s=stateSchema.parse([1,2].includes(json?.version)?migrate(raw):json);
  const count=(s.month-3)*4+s.week;
  if(s.schedule.length!==count||s.schedule.some((w,i)=>w.month!==3+Math.floor(i/4)||w.week!==i%4+1))throw Error('활동 기록이 올바르지 않습니다.');
  const weekdayEmpty=['lineup','weekday'].includes(s.phase);
  const weekendDone=['weekendEvent','weekendResult','complete'].includes(s.phase);
  for(const [i,w] of s.schedule.entries()){
    if(i<count-1&&(!w.weekday||!w.weekend))throw Error('이전 주 활동이 완료되지 않았습니다.');
    if(i===count-1&&(Boolean(w.weekday)===weekdayEmpty||Boolean(w.weekend)!==weekendDone))throw Error('활동 슬롯과 진행 단계가 맞지 않습니다.');
  }
  if(s.phase==='lineup'&&s.week!==1)throw Error('월초에만 편성할 수 있습니다.');
  if(s.phase==='complete'&&(s.month!==6||s.week!==4))throw Error('완료 시점이 아닙니다.');
  const plan=matchPlan(s);
  if(['event','eventResult'].includes(s.phase)&&plan)throw Error('경기 주차에 일반 사건을 진행할 수 없습니다.');
  const eventDone=!plan&&['eventResult','weekend','weekendEvent','weekendResult','complete'].includes(s.phase);
  const expectedEvents=s.schedule.filter(w=>weekKey(w.month,w.week)<count&&!matchPlan({...s,month:w.month,week:w.week})).map(w=>weekKey(w.month,w.week));
  if(eventDone)expectedEvents.push(count);
  if(!same(s.completedEvents,expectedEvents))throw Error('사건 이력과 진행 단계가 맞지 않습니다.');
  if(['weekendEvent','weekendResult'].includes(s.phase)&&s.schedule[count-1].weekend!=='동료와 캐치볼')throw Error('주말 사건의 선행 활동이 없습니다.');
  if(!unique(s.supports)||(s.phase!=='lineup'&&s.supports.length!==3))throw Error('서포트 편성이 올바르지 않습니다.');
  if(!unique(s.supportCompleted)||!unique(s.skills)||!unique(s.hints))throw Error('중복된 성장 이력이 있습니다.');
  const validSkills=availableSkills(s).map(k=>k.id);
  if([...s.skills,...s.hints].some(id=>!validSkills.includes(id)))throw Error('역할에 맞지 않는 스킬입니다.');
  const isSupport=['supportEvent','supportResult'].includes(s.phase);
  if(Boolean(s.activeSupport)!==isSupport)throw Error('서포트 사건 처리 위치가 올바르지 않습니다.');
  if(s.activeSupport&&(!s.supports.includes(s.activeSupport)||(s.phase==='supportEvent'&&s.supportCompleted.includes(s.activeSupport))||(s.phase==='supportResult'&&!s.supportCompleted.includes(s.activeSupport))))throw Error('서포트 사건 이력이 맞지 않습니다.');
  const expectedPlacements=s.phase==='lineup'?{}:weeklyPlacements(s);
  if(!same(s.placements,expectedPlacements))throw Error('주간 훈련 배치가 맞지 않습니다.');
  const currentLocked=s.schedule[(s.month-3)*4].weekday!=='';
  if(s.lineupHistory.length!==s.month-3+(currentLocked?1:0))throw Error('월별 편성 이력이 없습니다.');
  for(const [i,h] of s.lineupHistory.entries())if(h.month!==i+3||!unique(h.supports)||h.supports.some(id=>!supportIds.includes(id))||(h.month===s.month&&!same(h.supports,s.supports)))throw Error('편성 이력이 올바르지 않습니다.');
  const matchPhases=['match','matchResult','matchEnd','weekend','weekendEvent','weekendResult','complete'];
  const matchExists=Boolean(plan)&&matchPhases.includes(s.phase);
  const recorded=matchExists&&['matchEnd','weekend','weekendEvent','weekendResult','complete'].includes(s.phase);
  if(Boolean(s.match)!==matchExists||s.matchRecorded!==recorded)throw Error('경기 이력과 진행 단계가 맞지 않습니다.');
  if(s.phase==='selection'&&(!plan||s.month===3))throw Error('출전 평가 시점이 아닙니다.');
  const evaluated=s.month>=4&&(s.phase==='selection'||matchExists);
  if(Boolean(s.evaluation)!==evaluated)throw Error('출전 평가가 없습니다.');
  // Before the match, no later trust award has changed the selection inputs.
  if(s.phase==='selection'&&!same(s.evaluation,evaluateSelection(s)))throw Error('출전 평가 점수가 맞지 않습니다.');
  if(s.match){
    const m=s.match;checkMatch(m);
    if(m.id!==plan?.id||m.opponentId!==plan?.opponentId)throw Error('경기 상대와 일정이 다릅니다.');
    if(m.awaiting!==(s.phase==='match')||(recorded&&!m.over))throw Error('경기 처리 위치가 올바르지 않습니다.');
    if(m.appearance!==(s.month===3?'starter':s.evaluation!.rank))throw Error('출전 역할이 맞지 않습니다.');
    if(s.phase==='match'&&(m.over||m.outs>=3||m.highlights>=3||m.appearance==='reserve'||(s.role==='pitcher'?(m.retired||m.half!==0||m.faced!==m.highlights*3):(m.half!==1||(m.appearance==='starter'&&m.order[1]%9!==4)))))throw Error('선수가 선택할 수 없는 경기 상태입니다.');
    if(s.phase==='match'&&m.appearance==='substitute'&&(m.inning<7||(s.role==='batter'&&m.highlights!==0)))throw Error('교체 출전 시점이 아닙니다.');
    if(s.phase==='matchResult'&&(!m.last||m.awaiting))throw Error('승부 결과가 없습니다.');
  }
  const expectedMatches=s.schedule.filter(w=>weekKey(w.month,w.week)<count).map(w=>matchPlan({...s,month:w.month,week:w.week})).filter(p=>p!==null);
  if(recorded)expectedMatches.push(plan!);
  if(s.records.length!==expectedMatches.length)throw Error('누적 경기 기록이 맞지 않습니다.');
  for(const [i,r] of s.records.entries()){
    const expected=expectedMatches[i];checkMatch(r.match);
    if(r.month!==expected.month||r.match.id!==expected.id||r.match.opponentId!==expected.opponentId||!r.match.over||r.match.awaiting||r.match.score[0]===r.match.score[1])throw Error('완료 경기 이력이 올바르지 않습니다.');
    if(r.match.id===plan?.id&&!same(r.match,s.match))throw Error('현재 경기와 누적 기록이 다릅니다.');
  }
  const roundDone=plan?recorded:!['lineup','weekday','supportEvent','supportResult'].includes(s.phase);
  const expectedRounds=s.month===6?Math.max(0,s.week-2)+(s.week>=2&&roundDone?1:0):0;
  if(s.tournament.rounds.length!==expectedRounds)throw Error('대회 라운드 진행이 맞지 않습니다.');
  for(const [i,round] of s.tournament.rounds.entries()){
    const pairs=pairings(s,i+1);
    if(round.round!==i+1||round.games.length!==pairs.length)throw Error('대진표의 라운드가 맞지 않습니다.');
    for(const [j,g] of round.games.entries()){
      if(g.home!==pairs[j][0]||g.away!==pairs[j][1]||g.homeScore===g.awayScore)throw Error('대진표의 진출 팀이나 점수가 잘못됐습니다.');
      if(g.home==='cheongram'||g.away==='cheongram'){
        const record=s.records.find(r=>r.match.id===`summer-${i+1}`);
        const scores=g.home==='cheongram'?[g.awayScore,g.homeScore]:[g.homeScore,g.awayScore];
        if(!record||!same(scores,record.match.score))throw Error('대회 결과와 개인 경기 기록이 다릅니다.');
      }
    }
  }
  const keys=[...statKeys,'energy','stress','academics','trust','rival','catcher','skillPoints','bond_bat_senior','bond_pitch_senior','bond_manager','bond_classmate'];
  for(const base of [s.initial,s.weekStart,s.monthStart])for(const k of keys)if(!(k in base)||base[k]>(k==='skillPoints'?1000:100))throw Error('성장 비교 기준이 없습니다.');
  return s;
}
