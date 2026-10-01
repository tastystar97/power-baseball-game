import {validateMatch,validateCareer} from './match-validation.ts';
import {summarizeMatch,isDecisionPoint} from '../game/match.ts';
import {validateContent} from '../cards/pack.ts';
import {catalogForDeck} from '../cards/catalog.ts';
import {secondaryKeys} from '../game/abilities.ts';
import {snapshot} from '../game/engine.ts';
import { stateSchema } from '../game/types.ts';
import type { GameState, Match } from '../game/types.ts';
import {validateLoop,validateSkillChecks} from './loop-validation.ts';
import {validateRivalryState,equalData} from './rivalry-validation.ts';
import {matchPlan,pairings,weekKey} from '../game/season.ts';
import { availableSkills } from '../content/skills.ts';
import { weeklyPlacements } from '../game/support.ts';
import { evaluateSelection } from '../game/competition.ts';

// Keep the key to detect unsupported saves and require an explicit new game.
export const SAVE_KEY='last-summer.save.v1';
export type LoadResult={kind:'ok';state:GameState;migrated?:boolean}|{kind:'empty'}|{kind:'invalid';message:string}|{kind:'unavailable';message:string};
const unique=(items:unknown[])=>new Set(items).size===items.length;
const same=equalData;
export function parseSave(raw:string):GameState {
  const json=JSON.parse(raw);
  if(json?.version!==8)throw Error('이전 버전 저장은 지원하지 않습니다. 새 게임을 시작해 주세요.');
  const s=stateSchema.parse(json);
  validateContent(s.content);
  if(s.phase!=='lineup'&&!same(s.content,catalogForDeck(s.content,s.supports)))throw Error('육성 덱과 콘텐츠가 다릅니다.');
  const bondIds=s.content.cards.map(c=>c.id).filter(id=>!['rival','catcher'].includes(id));
  if(!same(Object.keys(s.bonds).sort(),bondIds.sort()))throw Error('카드의 인연 정보가 누락되었습니다.');
  const required=secondaryKeys(s.role);
  if(Object.keys(s.proficiency).length!==required.length||required.some(k=>s.proficiency[k]===undefined))throw Error('역할별 숙련이 올바르지 않습니다.');
  const count=(s.month-3)*4+s.week;
  if(s.schedule.length!==count||s.schedule.some((w,i)=>w.month!==3+Math.floor(i/4)||w.week!==i%4+1))throw Error('활동 기록이 올바르지 않습니다.');
  const weekendDone=s.phase==='complete';
  for(const [i,w] of s.schedule.entries()){
    if(i<count-1&&(!w.weekday||!w.weekday2||!w.weekend))throw Error('이전 주 활동이 완료되지 않았습니다.');
    if(i===count-1&&Boolean(w.weekend)!==weekendDone)throw Error('활동 슬롯과 진행 단계가 맞지 않습니다.');
  }
  if(s.phase==='lineup'&&(s.month!==3||s.week!==1||s.supports.length>0))throw Error('육성 시작에만 덱을 고를 수 있습니다.');
  if(s.phase==='complete'&&(s.month!==6||s.week!==4))throw Error('완료 시점이 아닙니다.');
  const plan=matchPlan(s);
  validateLoop(s);
  if(!unique(s.supports)||(s.phase!=='lineup'&&s.supports.length!==6))throw Error('서포트 편성이 올바르지 않습니다.');
  if(!unique(s.supportCompleted)||!unique(s.skills)||!unique(s.hints)||!unique(s.unlockedSkills))throw Error('중복된 성장 이력이 있습니다.');
  const validSkills=availableSkills(s).map(k=>k.id);
  if([...s.skills,...s.hints,...s.unlockedSkills].some(id=>!validSkills.includes(id)))throw Error('역할에 맞지 않는 스킬입니다.');
  const isSupport=['supportEvent','supportResult'].includes(s.phase);
  if(Boolean(s.activeSupport)!==isSupport)throw Error('서포트 사건 처리 위치가 올바르지 않습니다.');
  if(s.activeSupport&&!s.supports.includes(s.activeSupport))throw Error('편성하지 않은 서포트의 사건입니다.');
  const expectedPlacements=s.phase==='lineup'?{}:weeklyPlacements(s);
  if(!same(s.placements,expectedPlacements))throw Error('주간 훈련 배치가 맞지 않습니다.');
  for(const id of s.skills){const skill=s.content.skills.find(k=>k.id===id)!;if(skill.tier==='advanced'&&(!s.unlockedSkills.includes(id)||!s.skills.includes(skill.prerequisite!)))throw Error('상위 스킬 습득 이력이 없습니다.');}
  if(s.hints.some(id=>s.content.skills.find(k=>k.id===id)!.tier!=='normal'))throw Error('일반 스킬만 힌트를 받을 수 있습니다.');
  const matchPhases=['match','matchResult','matchEnd','roleEvent','weekend','complete'];
  const matchExists=Boolean(plan)&&matchPhases.includes(s.phase);
  const recorded=matchExists&&['matchEnd','roleEvent','weekend','complete'].includes(s.phase);
  if(Boolean(s.match)!==matchExists||s.matchRecorded!==recorded)throw Error('경기 이력과 진행 단계가 맞지 않습니다.');
  if(s.phase==='selection'&&(!plan||s.month===3))throw Error('출전 평가 시점이 아닙니다.');
  const evaluated=s.month>=4&&(s.phase==='selection'||matchExists);
  if(Boolean(s.evaluation)!==evaluated)throw Error('출전 평가가 없습니다.');
  // Before the match, no later trust award has changed the selection inputs.
  if(s.phase==='selection'&&s.evaluation?.basis==='rival'&&!same(s.evaluation,evaluateSelection(s)))throw Error('출전 평가 점수가 맞지 않습니다.');
  if(s.match){
    const m=s.match;validateMatch(m,s.role);validateSkillChecks(s,m);
    if(m.id!==plan?.id||m.opponentId!==plan?.opponentId)throw Error('경기 상대와 일정이 다릅니다.');
    if(m.awaiting&&s.phase!=='match'||(recorded&&!m.over))throw Error('경기 처리 위치가 올바르지 않습니다.');
    if(m.appearance!==(s.month===3?'starter':s.evaluation!.rank))throw Error('출전 역할이 맞지 않습니다.');
    if(s.phase==='match'&&(m.over||m.outs>=3||!m.playerBoundary||m.appearance==='reserve'||(s.role==='pitcher'?(m.retired||m.half!==0):(m.half!==1))||m.awaiting!==isDecisionPoint(s)))throw Error('선수가 선택할 수 없는 경기 상태입니다.');
    if(s.phase==='match'&&m.appearance==='substitute'&&m.inning<7)throw Error('교체 출전 시점이 아닙니다.');
    if(s.phase==='matchResult'&&(!m.last||m.awaiting))throw Error('승부 결과가 없습니다.');
  }
  const expectedMatches=s.schedule.filter(w=>weekKey(w.month,w.week)<count).map(w=>matchPlan({...s,month:w.month,week:w.week})).filter(p=>p!==null);
  if(recorded)expectedMatches.push(plan!);
  if(s.records.length!==expectedMatches.length)throw Error('누적 경기 기록이 맞지 않습니다.');
  for(const [i,r] of s.records.entries()){
    const expected=expectedMatches[i];validateMatch(r.match,s.role);validateSkillChecks(s,r.match);
    if(r.month!==expected.month||r.match.id!==expected.id||r.match.opponentId!==expected.opponentId||!r.match.over||r.match.awaiting||r.match.score[0]===r.match.score[1])throw Error('완료 경기 이력이 올바르지 않습니다.');
    if(r.match.id===plan?.id&&!same(r.match,summarizeMatch(s.match!)))throw Error('현재 경기와 누적 기록이 다릅니다.');
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
  const keys=Object.keys(snapshot(s));
  for(const base of [s.initial,s.weekStart,s.monthStart])for(const k of keys)if(!(k in base)||base[k]>(k==='skillPoints'?1000:100))throw Error('성장 비교 기준이 없습니다.');
  validateRivalryState(s);validateCareer(s);
  return s;
}
export function loadGame(storage:Pick<Storage,'getItem'>):LoadResult {
  let raw:string|null;
  try {raw=storage.getItem(SAVE_KEY);}catch{return {kind:'unavailable',message:'브라우저 저장소를 사용할 수 없습니다. 이번 플레이는 저장되지 않습니다.'};}
  if(raw===null)return {kind:'empty'};
  try{return {kind:'ok',state:parseSave(raw)};}catch{
    let old=false;try{old=[1,2,3,4,5,6,7].includes(JSON.parse(raw)?.version);}catch{}
    return {kind:'invalid',message:old?'이전 테스트 버전의 저장입니다. 경기 개편 버전은 새 선수로 시작해 주세요. 기존 저장은 새 게임을 확정하기 전까지 보관됩니다.':'저장 데이터가 손상되었거나 지원하지 않는 형식입니다. 기존 데이터는 그대로 보존했습니다.'};
  }
}
export function saveGame(state:GameState,storage:Pick<Storage,'setItem'>&Partial<Pick<Storage,'getItem'>>) {
  try{
    storage.setItem(SAVE_KEY,JSON.stringify(state));return true;
  }catch{return false;}
}
