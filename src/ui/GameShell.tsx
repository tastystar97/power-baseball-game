import {Fragment,useState} from 'react';
import type {GameState} from '../game/types.ts';
import {primaryKeys,primaryLabels,grade} from '../game/types.ts';
import {roleName} from './common.tsx';
import {Silhouette} from './scene/SceneStage.tsx';
import {characterArt} from '../content/scene-assets.ts';
import {primaryMax,primaryGrade,overallOf,strengthTags} from './abilityDisplay.ts';
import {calendarMonth,calendarMonths,nextMatchCountdown} from './calendarView.ts';
import {logLines,filterLines,logFilters} from './logView.ts';
import type {LogFilter} from './logView.ts';
import {ChoicePopup} from './ChoicePopup.tsx';

const slotName=(s:GameState)=>s.phase==='weekday'?(s.weekdayPart===1?'전반':'후반'):s.phase.startsWith('support')?(s.weekdayPart===1?'전반 뒤 만남':'후반 뒤 만남'):s.phase.startsWith('match')||s.phase==='selection'?'토요일 경기':s.phase.startsWith('weekend')?'주말':s.phase==='complete'?'시즌 종료':'';

function Gauge({label,value,kind}:{label:string;value:number;kind:'energy'|'stress'}) {
  const warn=kind==='energy'?value<40:value>60;
  return <div className={`hud-gauge ${kind} ${warn?'warn':''}`}><span>{label}</span><span className="hud-bar" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${value}%`}}/></span><b>{value}</b>{warn&&<small>{kind==='energy'?'지침':'과부하'}</small>}</div>;
}

export function Hud({s,steps,step,onCalendar}:{s:GameState;steps:string[];step:number;onCalendar:()=>void}) {
  const countdown=nextMatchCountdown(s),weeks=calendarMonth(s,s.month),ovr=overallOf(s);
  return <header className="hud" aria-label="현재 상태">
    <div className="hud-date"><small>1학년 · 청람고 야구부</small><strong>{s.month}월 {s.week}주{slotName(s)?` · ${slotName(s)}`:''}</strong>
      {countdown&&<span className="hud-dday">{countdown.weeks===0?`이번 주 토요일 · ${countdown.title}`:`${countdown.title}까지 ${countdown.weeks}주`}</span>}</div>
    <button className="hud-weeks" onClick={onCalendar} aria-label={`${s.month}월 일정 · 달력 열기`}>{weeks.map(w=><span key={w.week} className={`hud-week ${w.state} ${w.match?'match':''}`}><b>{w.week}주</b><span>{w.match?w.match.result??w.match.opponent:w.state==='now'?'지금':w.title}</span></span>)}</button>
    <div className="hud-gauges"><Gauge label="체력" value={s.energy} kind="energy"/><Gauge label="스트레스" value={s.stress} kind="stress"/></div>
    <div className="hud-ovr" title="종합 능력"><small>종합</small><b>{Math.round(ovr)}</b><em>{grade(ovr)}</em></div>
    {steps.length>0&&<ol className="hud-steps" aria-label="이번 주 진행">{steps.map((label,i)=><li key={label} className={step===i?'now':step>i?'done':''} aria-current={step===i?'step':undefined}>{label}</li>)}</ol>}
  </header>;
}

export function PlayerCard({s,onStatus}:{s:GameState;onStatus:()=>void}) {
  return <section className="player-card">
    <div className="player-who"><span className="player-face"><Silhouette art={characterArt[s.role==='batter'?'player_batter':'player_pitcher']}/></span><div><strong>{s.name}</strong><small>청람고 1학년 · {roleName(s)}</small></div></div>
    <h3>1차 능력</h3>
    {primaryKeys.map(k=>{const v=s.attributes[k],g=primaryGrade(v);return <div className="attr-row" key={k}><span>{primaryLabels[k]}</span><span className={`attr-bar ${k}`}><i style={{width:`${Math.min(100,v/primaryMax*100)}%`}}/></span><b>{v}</b><span className={`attr-grade g-${g}`}>{g}</span></div>;})}
    <div className="tag-row">{strengthTags(s).map(t=><span key={t.label} className={`tag ${t.kind}`}>{t.label}</span>)}</div>
    <button className="link-button" onClick={onStatus}>능력과 기록 자세히</button>
  </section>;
}

export function LogPanel({s,since,mobile=false}:{s:GameState;since:number;mobile?:boolean}) {
  const [filter,setFilter]=useState<LogFilter>('all'),[open,setOpen]=useState(false);
  const lines=filterLines(logLines(s),filter);
  const list=<ol className="log-list">{lines.map((l,i)=><Fragment key={l.key}>
    {i>0&&lines[i-1].entry>=since&&l.entry<since&&<li className="log-divider" aria-hidden="true">마지막 행동 이후</li>}
    <li className={`log-line ${l.kind} ${l.entry<since?'old':''}`}><time>{l.time}</time><span><span className={`log-kind ${l.kind}`}>{({act:'행동',talk:'사건',gain:'성장',loss:'손해',game:'경기'})[l.kind]}</span>{l.text}</span></li></Fragment>)}
    {!lines.length&&<li className="log-empty">아직 기록이 없습니다.</li>}</ol>;
  const tabs=<div className="log-tabs" role="group" aria-label="기록 분류">{logFilters.map(f=><button key={f.id} aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}>{f.label}</button>)}</div>;
  if(mobile){const latest=logLines(s)[0];return <><button className="log-strip" onClick={()=>setOpen(true)} aria-label="진행 기록 펼치기"><span>최근</span>{latest?latest.text:'아직 기록이 없습니다.'}<b>기록 ▲</b></button>
    {open&&<ChoicePopup title="진행 기록" onDismiss={()=>setOpen(false)}>{tabs}{list}</ChoicePopup>}</>;}
  return <aside className="log-panel" aria-label="진행 기록"><h2>진행 기록</h2>{tabs}<div aria-live="polite">{list}</div></aside>;
}

export function CalendarDialog({s,onClose}:{s:GameState;onClose:()=>void}) {
  const [month,setMonth]=useState<number>(calendarMonths.includes(s.month as 3)?s.month:3);
  const weeks=calendarMonth(s,month);
  return <ChoicePopup title="1학년 달력" label="달력" onDismiss={onClose} subtitle="칸은 주 단위입니다. 지난 주에는 한 일이, 다가올 토요일에는 경기 상대가 보입니다.">
    <div className="cal-months" role="group" aria-label="달 선택">{calendarMonths.map(m=><button key={m} aria-pressed={month===m} onClick={()=>setMonth(m)}>{m}월</button>)}<span className="cal-later">7월~2월 · 다음 업데이트</span></div>
    <div className="cal-grid" role="table" aria-label={`${month}월 일정`}>
      <div role="row" className="cal-head"><span role="columnheader"/><span role="columnheader">평일 전반</span><span role="columnheader">평일 후반</span><span role="columnheader">토요일</span><span role="columnheader">일요일</span></div>
      {weeks.map(w=><div role="row" key={w.week} className={`cal-row ${w.state}`}>
        <span role="rowheader" className="cal-week"><b>{w.week}주</b><small>{w.title}</small></span>
        <span role="cell">{w.first||(w.state==='now'&&s.phase==='weekday'&&s.weekdayPart===1?'지금':'')}</span>
        <span role="cell">{w.second||(w.state==='now'&&s.phase==='weekday'&&s.weekdayPart===2?'지금':'')}</span>
        <span role="cell" className={w.match?'cal-match':''}>{w.match?<><b>{w.match.result??`vs ${w.match.opponent}`}</b><small>{w.match.title}</small></>:''}</span>
        <span role="cell">{w.weekend}</span>
      </div>)}
    </div>
  </ChoicePopup>;
}

export function BottomMenu({s,openStatus,openCalendar,toMenu}:{s:GameState;openStatus:(tab:string)=>void;openCalendar:()=>void;toMenu:()=>void}) {
  return <nav className="bottom-menu" aria-label="메뉴">
    <button onClick={()=>openStatus('능력')}>상태</button>
    <button onClick={()=>openStatus('스킬')}>스킬 <b>{s.skillPoints} Pt</b></button>
    <button onClick={()=>openStatus('관계')}>덱·인연</button>
    <button onClick={()=>openStatus('기록')}>기록</button>
    <button onClick={openCalendar}>달력</button>
    <button onClick={toMenu}>처음 화면</button>
  </nav>;
}
