import {random} from './random.ts';
import {teams,teamName} from '../content/teams.ts';
import type {GameState,TeamId} from './types.ts';

export const roundNames=['8강','4강','결승'] as const;
export const tournamentSeeds:TeamId[]=['cheongram','haesol','bada','hanbit','taeyang','sanho','mirim','gangsan'];
export type MatchPlan={id:string;month:number;week:number;title:string;opponentId:TeamId};
export const weekKey=(month:number,week:number)=>(month-3)*4+week;
export const winner=(g:GameState['tournament']['rounds'][number]['games'][number])=>g.homeScore>g.awayScore?g.home:g.away;
export function pairings(s:Pick<GameState,'tournament'>,round:number):[TeamId,TeamId][] {
  if(round<1||round>3)return [];
  const entrants=round===1?tournamentSeeds:s.tournament.rounds.find(r=>r.round===round-1)?.games.map(winner)||[];
  const pairs:[TeamId,TeamId][]=[];
  for(let i=0;i<entrants.length;i+=2)pairs.push([entrants[i],entrants[i+1]]);
  return pairs;
}
export function matchPlan(s:Pick<GameState,'month'|'week'|'tournament'>):MatchPlan|null {
  const {month,week}=s;
  if(month<=5&&week===4)return {id:`m${month}-w4`,month,week,title:month===3?'첫 연습경기':month===4?'4월 교류 리그 · 첫 공식전':'5월 여름 대회 준비 경기',opponentId:month===5?'bada':'haesol'};
  if(month===6&&week>=2){
    const pair=pairings(s,week-1).find(p=>p.includes('cheongram'));
    if(pair)return {id:`summer-${week-1}`,month,week,title:`청람 지역 여름 대회 · ${roundNames[week-2]}`,opponentId:pair.find(id=>id!=='cheongram')!};
  }
  return null;
}
// Called once at the end of the round's weekday; non-player matches use their own RNG.
export function finishRound(s:GameState) {
  if(s.month!==6||s.week<2)return;
  const round=s.week-1;
  if(s.tournament.rounds.some(r=>r.round===round))return;
  const pairs=pairings(s,round);
  if(pairs.length!==2**(3-round))throw Error('대진의 이전 라운드가 없습니다.');
  const record=s.records.find(r=>r.match.id===`summer-${round}`);
  if(pairs.some(p=>p.includes('cheongram'))&&!record)throw Error('청람고 경기 결과가 없습니다.');
  const rng={rng:((s.trainingSeed^Math.imul(round,7919))>>>0)||1};
  const games=pairs.map(([home,away])=>{
    if(home==='cheongram'||away==='cheongram'){
      const score=record!.match.score;
      return {home,away,homeScore:home==='cheongram'?score[1]:score[0],awayScore:away==='cheongram'?score[1]:score[0]};
    }
    const homeScore=Math.floor(random(rng)*7),awayScore=Math.floor(random(rng)*7);
    return {home,away,homeScore:homeScore===awayScore?homeScore+1:homeScore,awayScore};
  });
  s.tournament.rounds.push({round,games});
}
export function tournamentResult(s:Pick<GameState,'tournament'>) {
  for(const round of s.tournament.rounds){
    const g=round.games.find(g=>g.home==='cheongram'||g.away==='cheongram');
    if(g&&winner(g)!=='cheongram')return round.round===3?'준우승':`${roundNames[round.round-1]} 탈락`;
  }
  const final=s.tournament.rounds.find(r=>r.round===3)?.games[0];
  return final&&winner(final)==='cheongram'?'우승':s.tournament.rounds.length?'다음 라운드 준비':'대회 준비';
}
export function monthGoal(month:number) {
  return month===3?'첫 연습경기에서 가능성 보여 주기':month===4?'첫 공식전 출전 기회 잡기':month===5?'특화 스킬을 익히고 여름 대회 준비하기':'여름 대회에서 나의 야구 보여 주기';
}
export function nextMatch(s:GameState):MatchPlan|null {
  for(let month=s.month;month<=6;month++)for(let week=month===s.month?s.week:1;week<=4;week++){
    const plan=matchPlan({...s,month,week});
    if(plan&&!s.records.some(r=>r.match.id===plan.id))return plan;
  }
  return null;
}
export function weekTitle(s:GameState,week:number) {
  const plan=matchPlan({...s,week});
  if(plan)return plan.title.replace('청람 지역 여름 대회 · ','여름 대회 ');
  if(s.month===6&&week>=2){
    const eliminated=s.tournament.rounds.some(r=>r.games.some(g=>(g.home==='cheongram'||g.away==='cheongram')&&winner(g)!=='cheongram'));
    return eliminated?`탈락 후 훈련 · 대회 ${roundNames[week-2]}`:`여름 대회 ${roundNames[week-2]} · 진출 시`;
  }
  const titles:Record<number,string[]>={3:['입부와 첫 훈련','동기와 함께','경기를 준비하며'],4:['새로운 연습 파트너','선발을 향한 경쟁','공식전을 준비하며'],5:['나의 장점 찾기','상대 팀 분석','실전에서 꺼낼 무기'],6:['여름 대회 출전 준비']};
  return titles[s.month]?.[week-1]||'다음 승부를 위한 훈련';
}
export const matchOpponent=(s:GameState)=>teams[s.match?.opponentId||matchPlan(s)?.opponentId||'haesol'];
export const recordTitle=(month:number,match:GameState['match'])=>match?.id?.startsWith('summer-')?`청람 지역 여름 대회 · ${roundNames[Number(match.id.slice(-1))-1]}`:month===3?'첫 연습경기':month===4?'4월 교류 리그 · 첫 공식전':'5월 여름 대회 준비 경기';
export const championName=(s:GameState)=>{const g=s.tournament.rounds.find(r=>r.round===3)?.games[0];return g?teamName(winner(g)):'미정';};
