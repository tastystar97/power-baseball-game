import type {GameState,Role,Match,StatKey,Outcome,Stats,Gains} from './types.ts';
import {statKeys,roleStats} from './types.ts';
import type {RivalProgress,NamedRivalId,DuelEntry,DuelSummary,SchoolRivalry,CompetitionSnapshot} from './rival-types.ts';
import {competitorInitial,rivalTraining,rivalryLines,rivalGrowthScale} from '../content/rivals.ts';
import {trainingGrowth} from './training.ts';

export function createCompetitor(role:Role):RivalProgress {
 return {stats:{...Object.fromEntries(statKeys.map(k=>[k,0])),...competitorInitial[role]} as Stats,trust:25,weeks:[]};
}
export function growCompetitor(current:RivalProgress,role:Role,key:number,sharedPrimary:StatKey|null,source:'v6',sharedSecondary:StatKey|null=null):RivalProgress {
 if(current.weeks.some(w=>w.key===key))return current;
 if(key!==current.weeks.length+1||key>16)throw Error('라이벌 훈련 주차가 올바르지 않습니다.');
 if(sharedPrimary&&(!roleStats(role).includes(sharedPrimary)))throw Error('함께한 훈련 기록이 올바르지 않습니다.');
 const next=structuredClone(current),raw=rivalTraining(role,key),gains:Gains={};
 if(source==='v6')for(const k of Object.keys(raw) as StatKey[])raw[k]=Math.round(raw[k]!*rivalGrowthScale[role]);
 if(sharedSecondary)raw[sharedSecondary]=(raw[sharedSecondary]||0)+1;
 if(sharedPrimary)raw[sharedPrimary]=(raw[sharedPrimary]||0)+1;
 for(const [k,n] of Object.entries(raw)){const stat=k as StatKey;gains[stat]=trainingGrowth(current.stats[stat],n,0);next.stats[stat]+=gains[stat]!;}
 const trustDelta=Math.min(1,100-current.trust);next.trust+=trustDelta;
 next.weeks.push({key,gains,trustDelta,sharedPrimary,source,...(source==='v6'?{sharedSecondary}:{})});return next;
}
export function competitorTrainingFeedback(s:GameState,entry:GameState['log'][number]) {
 const weekday=s.schedule.find(w=>w.month===entry.month&&w.week===entry.week)?.weekday2;
 if(entry.slot!=='second')return null;
 if(!entry.training||!weekday||!(entry.title===weekday||entry.title.startsWith(weekday+' · ')))return null;
 return s.competitor.weeks.find(w=>w.key===(entry.month-3)*4+entry.week&&w.source==='v6')??null;
}
export function identifyDuel(role:Role,m:Match,playerTurn:boolean):NamedRivalId|null {
 if(!playerTurn||m.opponentId!=='haesol'||m.appearance==='reserve'||m.over||(m.appearance==='substitute'&&m.inning<7))return null;
 if(role==='batter')return m.half===1&&m.pitcherIds[0]==='taeo'?'taeo':null;
 return m.half===0&&!m.retired&&m.rosters?.[0].batters[m.order[0]%9].id==='jihwan'?'jihwan':null;
}
export function duelEntry(m:Match,opponent:NamedRivalId,tactic:string,source:'manual'|'auto',outcome:Outcome):DuelEntry {
 return {half:m.half,order:m.order[m.half],inning:m.inning,opponent,tactic,source,outcome};
}
export function summarizeDuels(entries:DuelEntry[]):DuelSummary {
 const r:DuelSummary={ab:0,hits:0,hr:0,walks:0,k:0,sacrifices:0};
 for(const e of entries){if(['walk','hitByPitch'].includes(e.outcome))r.walks++;else if(['sacrificeBunt','sacrificeFly'].includes(e.outcome))r.sacrifices++;else r.ab++;
  if(['infieldSingle','single','double','triple','homer'].includes(e.outcome))r.hits++;if(e.outcome==='homer')r.hr++;if(e.outcome==='strikeout')r.k++;}
 return r;
}
export function schoolRivalry(records:GameState['records'],excludeMatchId?:string):SchoolRivalry {
 const games=records.filter(r=>r.match.over&&r.match.opponentId==='haesol'&&(!excludeMatchId||r.match.id!==excludeMatchId));
 const won=games.map(r=>r.match.score[1]>r.match.score[0]),last=games.at(-1)?.match;
 return {games:games.length,wins:won.filter(Boolean).length,losses:won.filter(v=>!v).length,stage:games.length===0?'first':games.length===1?'rematch':'rival',lastWon:won.at(-1)??null,closeLast:!!last&&Math.abs(last.score[0]-last.score[1])<=2,revenge:won.length>=2&&won.at(-2)===false&&won.at(-1)===true};
}
export function schoolDialogue(h:SchoolRivalry,when:'before'|'after'):string {
 if(!h.games)return rivalryLines.first;
 if(when==='after')return (h.revenge?rivalryLines.revenge:h.lastWon?rivalryLines.won:rivalryLines.lost)+(h.closeLast?' 마지막까지 점수 차가 두 점 이내였던 승부였다.':'');
 return (h.stage==='rematch'?rivalryLines.rematch+' ':'이제 서로의 이름을 아는 라이벌. ')+(h.wins>h.losses?rivalryLines.lead:h.wins<h.losses?rivalryLines.trail:rivalryLines.even);
}
export function duelDialogue(role:Role,entries:DuelEntry[]|null):string {
 if(entries===null)return '세부 기록 없음 · 이전 버전의 경기는 개인 맞대결을 추적하지 않았습니다.';
 if(!entries.length)return '대결 없음 · 이번 경기에서는 간판 선수와 직접 만나지 않았습니다.';
 return `${role==='batter'?'정태오':'서지환'} 상대 ${duelSummaryText(role,summarizeDuels(entries))}`;
}
export function duelSummaryText(role:Role,r:DuelSummary):string {
 return `${r.ab}타수 ${r.hits}${role==='batter'?'안타':'피안타'} · ${r.hr}${role==='batter'?'홈런':'피홈런'} · ${r.walks}볼넷 · ${r.k}${role==='batter'?'삼진':'탈삼진'} · ${r.sacrifices}희생번트`;
}
export function selectionDialogue(c:CompetitionSnapshot,history:CompetitionSnapshot[]):string {
 const prior=history.filter(h=>h.matchId!==c.matchId),had=prior.some(h=>h.starter==='player');
 if(c.starter==='other')return '이번에는 다른 동료가 먼저 나갑니다. 훈련 평가로 다음 기회를 준비할 수 있습니다.';
 if(c.starter==='player')return c.previous==='player'?'준서보다 앞선 준비로 선발 자리를 지켰습니다.':had?'다시 선발 명단에 이름을 올렸습니다. 연습한 시간이 기회로 돌아왔습니다.':'차준서와의 경쟁에서 첫 선발 기회를 잡았습니다.';
 return c.previous==='player'?'이번 선발은 차준서입니다. 부족한 항목을 보완해 자리를 되찾아 봅시다.':'차준서가 먼저 나갑니다. 훈련 평가와 교체 출전으로 다시 도전할 수 있습니다.';
}
