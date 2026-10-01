import {developmentStyle,availableSkills,skillRequirements} from '../content/skills.ts';
import {teams,teamName} from '../content/teams.ts';
import {championName,monthGoal,nextMatch,pairings,roundNames,tournamentResult,winner} from '../game/season.ts';
import type {GameState} from '../game/types.ts';
import {grade} from '../game/types.ts';
import {Meter} from './common.tsx';

export function DevelopmentPanel({s,detail=false}:{s:GameState;detail?:boolean}) {
  const style=developmentStyle(s);
  return <section className="panel development"><p className="eyebrow">훈련으로 만드는 나의 야구</p><h3>{style.name}</h3>
    {(()=>{const [a,b]=style.paths,lean=Math.round(50+Math.max(-40,Math.min(40,(a.score-b.score)*2.5)));
      // Only the direction of the lean is shown; the hidden ability scores never reach the screen.
      return <div className="style-balance gap-top" role="img" aria-label={`${a.name} ${grade(a.score)} · ${b.name} ${grade(b.score)} · ${lean>55?`${a.name} 쪽`:lean<45?`${b.name} 쪽`:'균형'}`}>
        <span className="style-side"><b>{a.name}</b><small>{grade(a.score)}</small></span>
        <span className="style-track" aria-hidden="true"><i style={{left:`${100-lean}%`}}/></span>
        <span className="style-side right"><b>{b.name}</b><small>{grade(b.score)}</small></span>
      </div>;})()}
    <p className="reason gap-top">현재 능력으로 본 성장 방향입니다. 두 방향의 스킬을 모두 배워 혼합형으로 키울 수 있습니다.</p>
    {detail&&<><p className="reason gap-top">1차 능력이 800에 이르면 성장이 완만해지며 1학년 상한은 1000입니다. 같은 훈련만 반복하기보다 몸과 기술을 함께 키워 보세요. 실제 성장량은 활동 카드에 반영합니다.</p><div className="development-goals">{availableSkills(s).filter(k=>k.style).map(k=><div key={k.id}><strong>{k.style} · {k.name}</strong><p className="reason">{s.skills.includes(k.id)?'특화 스킬 습득 완료':skillRequirements(s,k.id).map(r=>`${r.met?'✓':'○'} ${r.label}`).join(' · ')}</p></div>)}</div></>}
  </section>;
}
export function SeasonPanel({s}:{s:GameState}) {
  const next=nextMatch(s);
  return <section className="panel season-goal"><p className="eyebrow">1학년 · 첫 여름을 향해</p><h3>{monthGoal(s.month)}</h3>
    {next?<><p className="gap-top"><strong>{next.month}월 {next.week}주 · {next.title}</strong></p><p className="opponent-name">청람고 vs {teamName(next.opponentId)}</p><p className="reason">{teams[next.opponentId].report}</p></>:<p className="gap-top">여름 대회 · {tournamentResult(s)}<br/><span className="reason">남은 훈련과 주말을 마치며 이번 시즌을 돌아보세요.</span></p>}
    <p className="reason gap-top">3~6월 16주 · 지금까지 {s.records.length}경기</p>
  </section>;
}
export function TournamentBoard({s}:{s:GameState}) {
  return <section className="panel tournament"><div className="tournament-heading"><div><p className="eyebrow">6월 · 청람 지역</p><h3>첫 여름 대회</h3></div><span className="chip joint">청람고 · {tournamentResult(s)}</span></div>
    <p className="reason gap-top">2주차 8강 → 3주차 4강 → 4주차 결승. 한 번 지면 탈락하며, 이후에도 훈련과 주말은 이어집니다.</p>
    <div className="bracket">{roundNames.map((name,i)=>{
      const round=s.tournament.rounds.find(r=>r.round===i+1),pairs=pairings(s,i+1);
      return <div className="bracket-round" key={name}><h4>{name} <span>6월 {i+2}주</span></h4>{Array.from({length:2**(2-i)},(_,j)=>{
        const g=round?.games[j],pair=pairs[j];
        return <div key={j} className={`bracket-game ${pair?.includes('cheongram')?'ours':''}`}>
          {[0,1].map(side=>{const id=side===0?g?.home||pair?.[0]:g?.away||pair?.[1];return <div key={side} className={g&&id===winner(g)?'winner':''}><span>{id?teamName(id):`${roundNames[i-1]} 승자 ${j*2+side+1}`}</span><b>{g?(side===0?g.homeScore:g.awayScore):'–'}</b></div>;})}
        </div>;
      })}</div>;
    })}</div>{s.tournament.rounds.length===3&&<p className="champion">이번 여름 우승 · {championName(s)}</p>}
  </section>;
}
export function SeasonRecords({s}:{s:GameState}) {
  const totals=s.records.reduce((a,r)=>({games:a.games+(r.match.appearance==='reserve'?0:1),wins:a.wins+(r.match.score[1]>r.match.score[0]?1:0),ab:a.ab+r.match.batting.ab,hits:a.hits+r.match.batting.hits,hr:a.hr+r.match.batting.hr,rbi:a.rbi+r.match.batting.rbi,outs:a.outs+r.match.pitching.outs,k:a.k+r.match.pitching.k,walks:a.walks+(s.role==='batter'?r.match.batting.walks:r.match.pitching.walks),runs:a.runs+r.match.pitching.runs}),{games:0,wins:0,ab:0,hits:0,hr:0,rbi:0,outs:0,k:0,walks:0,runs:0});
  return <section className="panel"><h3>시즌 누적 기록</h3><p className="reason gap-top">팀 {s.records.length}경기 · {totals.wins}승 {s.records.length-totals.wins}패 · 개인 {totals.games}경기 출전</p>
    <p className="season-totals">{s.role==='batter'?`${totals.ab}타수 ${totals.hits}안타 · ${totals.hr}홈런 · ${totals.rbi}타점 · ${totals.walks}볼넷`:`${Math.floor(totals.outs/3)}${totals.outs%3?` ${totals.outs%3}/3`:''}이닝 · ${totals.k}탈삼진 · ${totals.walks}볼넷 · ${totals.runs}실점`}</p>
  </section>;
}
