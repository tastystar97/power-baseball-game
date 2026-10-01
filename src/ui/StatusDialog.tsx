import {CharacterProfile} from './creation/CharacterProfile.tsx';
import {journalSpeaker} from './logView.ts';
import {visibleJournal} from '../game/journal.ts';
import {PRIMARY_MAX} from '../content/development-rules.ts';
import {CardAvatar} from './DeckBuilder.tsx';
import {AbilityPanel} from './AbilityPanel.tsx';
import {SkillChecks} from './SkillChecks.tsx';
import {skillActivationChance} from '../game/skill-activation.ts';
import {SchoolRivalryPanel,DuelRecords} from './RivalryPanel.tsx';
import { useEffect, useRef, useState } from 'react';
import { grade, labels, roleStats } from '../game/types.ts';
import type { GameState } from '../game/types.ts';
import {recordTitle} from '../game/season.ts';
import {DevelopmentPanel,SeasonPanel,TournamentBoard,SeasonRecords} from './SeasonPanel.tsx';
import { snapshot } from '../game/engine.ts';
import { Meter, Portrait, Records, roleName } from './common.tsx';
import {CompetitionPanel,SkillsPanel} from './GrowthPanels.tsx';
import type {Send} from './GrowthPanels.tsx';
import {getSupports,bond,changeLabel} from '../content/supports.ts';
import {appearanceName} from '../game/competition.ts';

export function StatusDialog({s,onClose,send,initialTab="능력"}:{s:GameState;onClose:()=>void;send:Send;initialTab?:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  const [tab,setTab]=useState(initialTab);const [range,setRange]=useState('month');
  useEffect(()=>{
    const opener=document.activeElement as HTMLElement|null;
    const dialog=ref.current;
    dialog?.showModal();document.body.classList.add('modal-open');
    return ()=>{dialog?.close();document.body.classList.remove('modal-open');opener?.focus();};
  },[]);
  const current=snapshot(s),start=range==='week'?s.weekStart:range==='month'?s.monthStart:s.initial;
  const logs=visibleJournal(s).filter(l=>range==='all'||(l.month===s.month&&(range==='month'||l.week===s.week)));
  const records=[...s.records];if(s.match&&!s.matchRecorded)records.push({month:s.month,match:s.match});
  return <dialog ref={ref} className="status" aria-labelledby="status-title" onCancel={onClose}>
    <div className="status-head"><h2 id="status-title">선수 상태창</h2><span className="muted">1학년 {s.month}월 {s.week}주차</span><button className="close" onClick={onClose} autoFocus>닫기</button></div>
    <div className="status-body"><aside className="profile"><Portrait id={s.role}/><p className="name">{s.name}</p><p className="muted">청람고 · 1학년 {roleName(s)}</p><Meter label="체력" value={s.energy}/><Meter label="스트레스" value={s.stress} bad/></aside>
    <div className="status-content"><div className="status-tabs" role="group" aria-label="상태창 항목">{['능력','스킬','변화','기록','시즌','관계','일지'].map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</div>
    {tab==='능력'&&<><CharacterProfile s={s}/><DevelopmentPanel s={s} detail/><AbilityPanel s={s}/><section className="panel"><h3>경기 이해력과 신뢰</h3><Meter label="지능" value={s.attributes.intelligence} max={PRIMARY_MAX}/><p className="reason">지능이 높을수록 조건을 만족한 스킬 발동에 유리합니다.</p><Meter label="감독 신뢰" value={s.trust}/></section><CompetitionPanel s={s} detail/></>}
    {tab==='스킬'&&<SkillsPanel s={s} send={send}/>}
    {tab==='변화'&&<><div className="seg" role="group" aria-label="변화 기간"><button aria-pressed={range==='week'} onClick={()=>setRange('week')}>이번 주</button><button aria-pressed={range==='month'} onClick={()=>setRange('month')}>이번 달</button><button aria-pressed={range==='all'} onClick={()=>setRange('all')}>입학 이후</button></div><table className="comparison"><thead><tr><th>항목</th><th>시작 → 현재</th><th>변화</th></tr></thead><tbody>{Object.keys(current).filter(k=>!k.startsWith('proficiency_')).map(k=><tr key={k}><td>{changeLabel(s,k,labels[k])}</td><td>{start[k]} → {current[k]}</td><td>{current[k]-start[k]>0?'+':''}{current[k]-start[k]}<div className="cause">{logs.filter(l=>l.changes[k]).map(l=>`${l.title} ${l.changes[k]>0?'+':''}${l.changes[k]}`).join(' · ')||'변화 없음'}</div></td></tr>)}</tbody></table></>}
    {tab==='시즌'&&<><SchoolRivalryPanel s={s}/><SeasonPanel s={s}/><TournamentBoard s={s}/><SeasonRecords s={s}/></>}
    {tab==='기록'&&<><SeasonRecords s={s}/>{records.length?records.map(r=><section className="panel" key={r.match.id||r.month}><h3>{recordTitle(r.month,r.match)} · {appearanceName(s,r.match.appearance)}</h3><Records s={s} match={r.match}/><DuelRecords role={s.role} match={r.match}/><SkillChecks match={r.match} s={s}/><details className="gap-top"><summary>경기 흐름</summary><ul className="match-log">{r.match.recent.map((text,i)=><li key={i}>{text}</li>)}</ul></details>{s.log.filter(l=>l.month===r.month&&l.title===recordTitle(r.month,r.match)).map((l,i)=><p className="quote" key={i}>{l.text}</p>)}</section>):<Records s={s}/>}</>}
    {tab==='관계'&&<><p className="lead">육성 시작에 고른 덱과 함께 성장합니다. 인연 40 이상인 파트너와 같은 활동을 하면 합동 훈련이 발동합니다.</p><div className="people-grid"><section className="panel person"><Portrait id="coach"/><div><h3>감독</h3><p>신뢰 {s.trust}</p><p className="muted">출전 평가에 반영됩니다.</p></div></section>{getSupports(s).map(p=><section className="panel person" key={p.id}><CardAvatar card={p} content={s.content}/><div><h3>{p.name}</h3><p className="muted">{p.role}{s.supports.includes(p.id)?' · 육성 파트너':''}</p><p>인연 {bond(s,p.id)}{bond(s,p.id)>=40?' · 합동 가능':''}</p><p className="reason">{`성장 사건 ${s.content.events.filter(e=>e.owner===p.id&&e.kind==='growth'&&s.supportCompleted.includes(e.id)).length} / ${s.content.events.filter(e=>e.owner===p.id&&e.kind==='growth').length} 완료`}</p></div></section>)}</div></>}
    {tab==='일지'&&<><section className="panel"><h3>3~6월 활동 기록</h3>{s.schedule.map(w=><div className="diary-week" key={`${w.month}-${w.week}`}><strong>{w.month}월 {w.week}주</strong><span>전반 · {w.weekday||'아직 선택하지 않음'}<br/><>후반 · {w.weekday2||'아직 선택하지 않음'}<br/></>주말 · {w.weekend||'아직 선택하지 않음'}</span></div>)}</section><section className="panel"><h3>그라운드의 기억</h3>{[...visibleJournal(s)].reverse().map((l,i)=><article className="diary-entry" key={l.id}><strong>{l.month}월 {l.summary?'월 요약':`${l.week}주`} · {l.title}</strong><p style={{color:journalSpeaker(s,l.speaker)?.color}}>{l.speaker?`${journalSpeaker(s,l.speaker)!.name}: “${l.text}”`:l.text}</p><p className="muted">{Object.entries(l.changes).filter(([k])=>!k.startsWith('proficiency_')).map(([k,v])=>`${changeLabel(s,k,labels[k])} ${v>0?'+':''}${v}`).join(' · ')}</p></article>)}</section></>}
    </div></div>
  </dialog>;
}

