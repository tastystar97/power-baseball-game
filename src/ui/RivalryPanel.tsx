import type {GameState,Match,Role,Gains} from '../game/types.ts';
import {labels,roleStats} from '../game/types.ts';
import {appearanceName,evaluateSelection} from '../game/competition.ts';
import {duelDialogue,identifyDuel,schoolRivalry,schoolDialogue,selectionDialogue,summarizeDuels} from '../game/rivalry.ts';
import {namedRivals} from '../content/rivals.ts';
import {matchPlan,recordTitle} from '../game/season.ts';

export const growthText=(g:Gains)=>Object.entries(g).filter(([,n])=>n!>0).map(([k,n])=>`${labels[k]} +${n}`).join(' · ')||'능력 상한 · 변화 없음';
export function CompetitionComparison({s,detail=false}:{s:GameState;detail?:boolean}) {
 const e=s.evaluation||evaluateSelection(s),fixed=!!s.evaluation,c=e.competition;
 if(e.basis==='legacy')return <section className="panel competition"><h3>{s.month}월 {s.week}주 출전 평가</h3><div className="evaluation-total"><strong>{e.total}<small>점</small></strong><span>확정 · {appearanceName(s,e.rank)}</span></div><p className="chip">이전 기준으로 확정</p><p className="reason gap-top">능력 {e.ability} · 경기 {e.performance} · 신뢰 {e.trust}</p><p className="gap-top">이번 명단은 유지됩니다. 다음 경기부터 차준서와 능력·준비도·감독 신뢰를 비교합니다.</p></section>;
 const p=c!.player,j=c!.junseo,diff=p.total-j.total;
 const target=Math.max(65,j.total+(c!.previous==='junseo'?1:0));
 return <section className="panel competition"><p className="scene-no">{fixed?`${s.month}월 ${s.week}주 · 명단 확정`:'다음 선발을 향한 경쟁'}</p><h3>같은 유니폼, 하나의 기회</h3>
  <div className="rival-score"><div><span>{s.name}</span><strong>{p.total}<small>점</small></strong><span>{fixed?'확정':'예상'} · {appearanceName(s,e.rank)}</span></div><span className="rival-vs">VS</span><div><span>차준서</span><strong>{j.total}<small>점</small></strong><span>{s.role==='batter'?'동기 타자':'동기 투수'}</span></div></div>
  <table className="rival-comparison"><thead><tr><th>평가 항목</th><th>나</th><th>준서</th></tr></thead><tbody>{[['능력',p.ability,j.ability],['준비도',p.readiness,j.readiness],['감독 신뢰',p.trust,j.trust]].map(([label,a,b])=><tr key={label}><th>{label}</th><td>{a}</td><td>{b}</td></tr>)}</tbody></table>
  <p className="rival-gap">{diff>0?`${diff}점 앞서는 중`:diff<0?`${-diff}점 뒤처진 상태`:'현재 동점'}{p.total<target?` · 선발 경쟁 기준까지 ${target-p.total}점`:''}</p>
  <p className="reason">나의 준비도 · {p.readinessSource==='match'?'최근 출전 경기':'연습 평가'} {p.readiness}점 / 준서 · 연습 평가 {j.readiness}점</p>
  {s.month===3&&<p className="reason gap-top">3월은 신입생 연습경기로 선발 기회를 받습니다. 4월부터 경쟁 평가로 결정합니다.</p>}
  {fixed&&<p className="quote">{selectionDialogue(c!,s.selectionHistory)}</p>}
  {detail&&<><details className="gap-top"><summary>선발 기준과 준비도 자세히 보기</summary><p className="reason">65점 이상인 후보 중 높은 점수가 선발입니다. 동점이면 직전 경쟁 선발을 유지하며, 두 후보 중 이전 선발이 없으면 나에게 기회가 옵니다. 나는 선발이 아니어도 52점 이상이면 대타·구원으로 준비합니다.</p><p className="reason gap-top">{s.role==='batter'?'능력 = 컨택×0.5 + 파워×0.25 + 선구안×0.2 + 수비×0.2. 연습 평가 = (컨택+파워)÷10.':'능력 = 제구×0.5 + 구속×0.25 + 변화구×0.2 + 지구력×0.2. 연습 평가 = (제구+구속)÷10.'} 각 항목은 반올림하며 감독 신뢰×0.2를 더합니다. 총점은 100점 만점이 아닙니다.</p><p className="reason gap-top">나의 준비도는 연습 평가 {p.practice}점과 최근 실제 출전 최대 3경기 평균 {p.performance??'없음'} 중 높은 값입니다. {s.role==='batter'?'경기 점수 = 안타×3 + 볼넷×2 + 타점×2 (최대20).':'경기 점수 = 아웃 수 + 탈삼진×2 − 실점×2 (0~20).'} 벤치 대기는 성적 평균을 깎지 않습니다. 준서는 공식전 개인 기록을 별도로 계산하지 않고 연습 평가로 준비도를 정합니다.</p></details>
  <details className="gap-top"><summary>능력 비교와 준서의 연습 기록</summary><table className="rival-comparison"><thead><tr><th>현재 능력</th><th>나</th><th>준서</th></tr></thead><tbody>{roleStats(s.role).map(k=><tr key={k}><th>{labels[k]}</th><td>{s.stats[k]}</td><td>{s.competitor.stats[k]}</td></tr>)}</tbody></table><p className="reason">준서는 매주 계획대로 성장하며 별도 체력·실패 판정은 없습니다. 함께 성공한 훈련은 추가 성장에 반영합니다.</p><ul className="rival-history">{s.competitor.weeks.map(w=><li key={w.key}>{3+Math.floor((w.key-1)/4)}월 {(w.key-1)%4+1}주 · {growthText(w.gains)} · 신뢰 +{w.trustDelta}{w.sharedPrimary?' · 함께한 훈련':''}{w.source==='migrated'?' · 이전 기간 기본 성장':''}</li>)}</ul></details>
  <details className="gap-top"><summary>지금까지의 경쟁 명단</summary>{s.selectionHistory.length?<ul className="rival-history">{s.selectionHistory.map(h=><li key={h.matchId}>{h.month}월 {h.week}주 · 나 {h.player.total} : 준서 {h.junseo.total} · {h.starter==='player'?'내 선발':h.starter==='junseo'?'준서 선발':'다른 동료 선발'}</li>)}</ul>:<p className="reason">새 경쟁 기준으로 확정한 명단이 아직 없습니다.</p>}</details></>}
  {!detail&&<p className="reason gap-top">상태창 능력 탭에서 점수 계산과 연습 기록을 확인할 수 있습니다.</p>}
 </section>;
}
export function SchoolRivalryPanel({s}:{s:GameState}) {
 const h=schoolRivalry(s.records),rows=s.records.filter(r=>r.match.opponentId==='haesol'),tracked=rows.filter(r=>r.match.duels!==null),totals=summarizeDuels(tracked.flatMap(r=>r.match.duels!));
 const name=namedRivals[s.role==='batter'?'taeo':'jihwan'].name;
 return <section className="panel school-rivalry"><p className="scene-no">승부로 쌓아가는 관계</p><h3>청람고 × 해솔고</h3><div className="school-record"><strong>{h.wins}승 {h.losses}패</strong><span>{h.stage==='first'?'첫 만남을 앞두고':h.stage==='rematch'?'다시 만나고 싶은 상대':'서로를 기억하는 라이벌'}</span></div><p className="quote">{schoolDialogue(h,s.phase==='complete'?'after':'before')}</p>
  <div className="rival-opponent"><strong>{name}와의 개인 맞대결</strong><p>{tracked.length?`${totals.ab}타수 ${totals.hits}${s.role==='pitcher'?'피안타':'안타'} · ${totals.walks}볼넷 · ${totals.k}${s.role==='pitcher'?'탈삼진':'삼진'}`:'아직 추적한 맞대결 기록이 없습니다.'}</p>{rows.length>tracked.length&&<p className="reason">이전 경기 {rows.length-tracked.length}건은 세부 기록 없음. 팀 전적에는 포함됩니다.</p>}</div>
  {!!rows.length&&<details className="gap-top"><summary>해솔고와의 경기별 기록</summary><ul className="rival-history">{rows.map(r=><li key={r.match.id}><strong>{recordTitle(r.month,r.match)}</strong><p>청람고 {r.match.score[1]} : {r.match.score[0]} 해솔고</p><p className="reason">{duelDialogue(s.role,r.match.duels)}</p></li>)}</ul></details>}
 </section>;
}
export function RivalryPreview({s}:{s:GameState}) {
 if(matchPlan(s)?.opponentId!=='haesol')return null;
 const h=schoolRivalry(s.records,matchPlan(s)?.id);
 return <section className="panel school-rivalry"><p className="scene-no">이번 상대 · 해솔고</p><h3>{h.games?`지난 맞대결 ${h.wins}승 ${h.losses}패`:'새로운 상대와 첫 인사'}</h3><p className="quote">{schoolDialogue(h,'before')}</p><p className="reason">{namedRivals[s.role==='batter'?'taeo':'jihwan'].role} · {namedRivals[s.role==='batter'?'taeo':'jihwan'].name}</p></section>;
}
export function DuelRecords({role,match}:{role:Role;match:Match}) {
 if(match.opponentId!=='haesol')return null;
 return <section className="rival-opponent"><strong>개인 맞대결 기록</strong><p>{!match.over&&match.duels?.length===0?'아직 간판 선수와의 맞대결 기록이 없습니다.':duelDialogue(role,match.duels)}</p>{!!match.duels?.length&&<details className="gap-top"><summary>맞대결 타석 보기</summary><ul className="rival-history">{match.duels.map(e=><li key={`${e.half}:${e.order}`}>{e.inning}회 · {e.source==='auto'?'요약 진행':'직접 선택'} · {({contact:'정확하게 맞히기',power:'장타 노리기',patient:'공 골라내기',bunt:'희생번트',fastball:'직구로 승부',breaking:'변화구로 유도',control:'맞혀 잡기',chase:'유인구 위주'} as Record<string,string>)[e.tactic]} → {({strikeout:'삼진',out:'범타',walk:'볼넷',single:'안타',double:'2루타',homer:'홈런',sacrifice:'희생번트'} as Record<string,string>)[e.outcome]}</li>)}</ul></details>}</section>;
}
export function DuelContext({s}:{s:GameState}) {
 const id=s.match?.duels!==null&&s.match?identifyDuel(s.role,s.match,true):null;
 if(!id)return null;
 const prior=s.records.filter(r=>r.match.id!==s.match?.id),entries=prior.flatMap(r=>r.match.duels||[]).filter(e=>e.opponent===id);
 return <p className="rival-opponent">{entries.length?`지난 맞대결 · ${duelDialogue(s.role,entries)}`:prior.some(r=>r.match.opponentId==='haesol'&&r.match.duels===null)?'지난 경기의 개인 세부 기록은 없습니다. 이번 승부부터 남깁니다.':namedRivals[id].intro}</p>;
}
