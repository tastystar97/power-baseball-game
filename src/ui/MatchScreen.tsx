import {SkillChecks} from './SkillChecks.tsx';
import {skillActivationChance} from '../game/skill-activation.ts';
import {DuelRecords,DuelContext} from './RivalryPanel.tsx';
import {schoolRivalry,schoolDialogue,selectionDialogue} from '../game/rivalry.ts';
import type { Action, GameState } from '../game/types.ts';
import { loadLimit, opponent, tactics } from '../game/match.ts';
import {matchPlan} from '../game/season.ts';
import {teamName} from '../content/teams.ts';
import { Records } from './common.tsx';
import {appearanceName} from '../game/competition.ts';

export function MatchScreen({s,send}:{s:GameState;send:(a:Omit<Action,'revision'>)=>void}) {
  const m=s.match!,opp=opponent(s),ended=s.phase==='matchEnd',plan=matchPlan(s)!,opponentName=teamName(m.opponentId);
  const bases=m.bases.map((r,i)=>r?`${i+1}루`:null).filter(Boolean).join('·')||'주자 없음';
  const n=Math.max(9,m.inning);
  const playerBase=s.role==='batter'&&m.half===1?m.bases.findIndex(r=>r?.owner==='player'):-1;
  const pitching=s.role==='pitcher'&&m.half===0&&!m.retired&&!m.over;
  const batting=s.role==='batter'&&s.phase==='match';
  const position=m.over?'경기 종료':s.role==='pitcher'?(m.retired?'교체 후 동료의 승부를 지켜보는 중':pitching?'마운드 위에서':'우리 팀 공격 중'):playerBase>=0?`${playerBase+1}루에서 다음 타자를 기다리는 중`:batting?'타석에서':'동료의 승부를 지켜보는 중';
  return <><h1 className="screen-title" tabIndex={-1}>{plan.title} · 청람고 vs {opponentName}</h1><p className="lead">{appearanceName(s,m.appearance)} · 연습한 시간이, 오늘의 한 번의 승부가 됩니다.</p><div className="match"><div>
    <div className="board"><div className="score-scroll"><table><thead><tr><th>TEAM</th>{Array.from({length:n},(_,i)=><th key={i}>{i+1}</th>)}<th>R</th></tr></thead><tbody>{[opponentName,'청람고'].map((name,t)=><tr key={name}><th>{name}</th>{Array.from({length:n},(_,i)=><td key={i} className={!m.over&&i===m.inning-1&&t===m.half?'cur':''}>{i<m.inning?(t===1&&i===m.inning-1&&m.half===0?'–':m.lines[t][i]||0):'–'}</td>)}<td className="r">{m.score[t]}</td></tr>)}</tbody></table></div><div className="sit"><strong>{m.over?'경기 종료':`${m.inning}회 ${m.half===0?'초':'말'}`}</strong><span>{Math.min(m.outs,3)}아웃 <span className="outs" aria-hidden="true">{[0,1,2].map(i=><i key={i} className={i<m.outs?'on':''}/>)}</span></span><span>{bases}</span></div></div>
    <div className="diamond-wrap"><svg className="diamond" viewBox="0 0 400 350" role="img" aria-label={`야구장: ${bases}, ${m.outs}아웃`}>
      <path d="M200 325 L26 150 Q0 8 200 10 Q400 8 374 150 Z" fill="#5a9b53"/>
      <path d="M200 325 L88 213 L200 101 L312 213 Z" fill="#c79a63"/>
      <path d="M200 296 L116 213 L200 130 L284 213 Z" fill="#75a961"/>
      <path d="M26 150L200 325 374 150M200 310L102 213 200 115 298 213Z" stroke="#fffaf0" strokeWidth="3" fill="none"/>
      <circle cx="200" cy="219" r="19" fill="#c79a63"/>
      {[[298,213],[200,115],[102,213]].map(([x,y],i)=><g key={i}><rect x={x-7} y={y-7} width="14" height="14" fill={m.bases[i]?'#f2c14e':'#fffaf0'} transform={`rotate(45 ${x} ${y})`}/>{m.bases[i]&&<><circle cx={x} cy={y-22} r="11" fill={playerBase===i?'#c98a12':'#f2c14e'} stroke="#1f2d4d"/>{playerBase===i&&<text x={x} y={y-18} textAnchor="middle" fill="#fff" fontSize="11">나</text>}</>}</g>)}
      <path d="M193 307h14v8l-7 6-7-6z" fill="#fffaf0"/>
      {(pitching||batting)&&<><circle cx="200" cy={pitching?215:331} r="12" fill="#c98a12" stroke="#fffaf0" strokeWidth="2"/><text x="200" y={pitching?219:335} textAnchor="middle" fill="#fff" fontSize="12">나</text></>}
    </svg><p className="diamond-text">{position} · {bases}</p></div>
    <section className={`panel gap-top${ended?' match-end-records':''}`}><h3>개인 기록</h3><Records s={s}/><DuelRecords role={s.role} match={m}/><SkillChecks match={m} s={s}/></section>
    <details className="panel gap-top"><summary>경기 흐름 보기</summary><ul className="match-log">{m.recent.map((r,i)=><li key={i}>{r}</li>)}</ul></details>
    </div><div>
    {s.phase==='match'&&<><section className="panel"><p className="scene-no">중요 승부 {m.highlights+1}/{s.role==='batter'&&m.appearance==='substitute'?1:3}</p><h2>{opp.name}</h2><DuelContext s={s}/><div className="traits"><span className="trait">{opp.trait}</span></div><p className="reason gap-top">{opp.weakness}</p><p className="gap-top">내 지능 <strong>{s.attributes.intelligence}</strong> · {m.skillChecks===null?<strong>이 경기는 이전 스킬 규칙 유지</strong>:<>스킬 발동 <strong>{Math.round(skillActivationChance(s.attributes.intelligence)*1000)/10}%</strong></>}<br/>내 체력 <strong>{s.energy}</strong> · 스트레스 <strong>{s.stress}</strong></p>{s.role==='pitcher'&&<div className="pitch-load"><label>투구 부담 {m.load} / {loadLimit(s)}</label><progress value={m.load} max={loadLimit(s)}/><p className="muted">한계에 도달하면 교체됩니다. 스태미나와 컨디션이 승부에 영향을 줍니다.</p></div>}</section><div className="tactics">{tactics(s).map(t=><button key={t.id} className="card" disabled={t.disabled} onClick={()=>send({type:'tactic',id:t.id})}><span className="top"><strong>{t.title}</strong><span className={`outlook ${t.outlook==='유리'?'good':t.outlook==='보통'?'mid':'bad'}`}>{t.outlook}</span></span><span className="desc">{t.description}</span><span className="reason">{t.reason}</span>{t.burden>0&&<span className="chip cost">투구 부담 {m.skillChecks!==null?'평균 ':''}+{Math.round(t.burden*10)/10}</span>}</button>)}</div><p className="muted gap-top">작전을 고르면 타자 한 명과의 승부가 진행됩니다.</p></>}
    {s.phase==='matchResult'&&m.last&&<section className="panel result-panel" aria-live="polite"><p className="scene-no">중요 승부 {m.highlights}/{s.role==='batter'&&m.appearance==='substitute'?1:3} · 결과</p><h2 className="result-name">{m.last.title}</h2><p className="quote">{m.last.text}</p><h3>승부의 배경</h3><ul className="factors">{m.last.reasons.map(r=><li key={r}>{r}</li>)}</ul>{m.retired&&s.role==='pitcher'&&<p className="notice warning">투구 부담이 한계에 도달해 교체되었습니다. 남겨둔 주자는 끝까지 기록에 반영됩니다.</p>}<div className="actions"><button className="primary" onClick={()=>send({type:'continue'})}>경기 계속</button></div></section>}
    {ended&&<section className="panel result-panel"><p className="scene-no">오늘 경기의 기록</p><h2 className="result-name">{m.score[1]>m.score[0]?'함께 만든 승리':'다음 승부를 위한 한 걸음'}</h2><p className="lead">청람고 {m.score[1]} : {m.score[0]} {opponentName}</p><p className="quote">{s.log.find(l=>l.month===s.month&&l.week===s.week&&l.title===plan.title)?.text}</p>{m.opponentId==='haesol'&&<p className="quote">{schoolDialogue(schoolRivalry(s.records),'after')}</p>}{s.evaluation?.competition&&<p className="reason gap-top">{selectionDialogue(s.evaluation.competition,s.selectionHistory)}</p>}<p className="gap-top">동료 포수: “{s.role === 'pitcher' ? '오늘 같이 맞춘 호흡, 다음 경기에도 가져가자.' : '오늘 타석에서 본 공, 다음 훈련 때 같이 떠올려 보자.'}”</p><p className="reason gap-top">득점과 이닝은 중요 장면 사이의 동료·상대 플레이까지 반영했습니다. 경기 기록은 상태창에 남습니다.</p><div className="actions"><button className="primary" onClick={()=>send({type:'continue'})}>일요일 주말 활동으로</button></div></section>}
    </div></div></>;
}

