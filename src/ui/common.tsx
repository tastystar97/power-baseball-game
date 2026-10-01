import { useState } from 'react';
import {teamName} from '../content/teams.ts';
import { assets } from '../content/assets.ts';
import type { GameState, Match } from '../game/types.ts';
export const roleName=(s:Pick<GameState,'role'>)=>s.role==='batter'?'타자':'투수';
export function Background({id,banner=false,fill=false,caption=''}:{id:string;banner?:boolean;fill?:boolean;caption?:string}) {
  const a=assets[id]||assets.ground;const [failed,setFailed]=useState(false);const src=failed?undefined:a.src;
  return <div className={`bg-slot ${banner?'banner':''} ${fill?'fill':''} ${src?'':'ph'}`} data-mood={a.mood} aria-hidden="true">
    {src?<img src={src} alt="" onError={()=>setFailed(true)}/>:<span className="ph-label">배경 · {a.label} · 16:9</span>}
    {caption&&<span className="banner-caption">{caption}</span>}
  </div>;
}
export function Portrait({id,size=''}:{id:string;size?:string}) {
  const a=assets[id]||assets.batter;const [failed,setFailed]=useState(false);const src=failed?undefined:a.src;
  return <div className={`portrait ${size} ${src?'':'ph'}`} aria-hidden="true">
    {src?<img src={src} alt="" onError={()=>setFailed(true)}/>:<><svg viewBox="0 0 120 150"><circle cx="60" cy="43" r="22" fill="#bbc2bf"/><path d="M17 146v-33c0-31 86-31 86 0v33" fill="#cdd2cb"/><path d="M40 92l20 16 20-16" fill="none" stroke="#f7f1e1" strokeWidth="5"/></svg><span className="ph-label">{a.label} · 기본</span></>}
  </div>;
}
export function Meter({label,value,bad=false}:{label:string;value:number;bad?:boolean}) {
  return <div className="meter"><span>{label}</span><span className={`bar ${bad?'bad':''}`}><span style={{width:`${value}%`}}/></span><span className="num">{value}</span></div>;
}
export function Records({s,match=s.match}:{s:GameState;match?:Match|null}) {
  if(!match)return <p className="muted">아직 출전 기록이 없습니다. 3월 4주차 토요일에 첫 연습경기가 열립니다.</p>;
  const m=match;
  const rows=s.role==='batter'
    ? [['타수',m.batting.ab],['안타',m.batting.hits],['홈런',m.batting.hr],['타점',m.batting.rbi],['볼넷',m.batting.walks],['사구',m.batting.hbp],['2루타',m.batting.doubles],['3루타',m.batting.triples],['희생플라이',m.batting.sf],['삼진',m.batting.k]]
    : [['이닝',`${Math.floor(m.pitching.outs/3)}${m.pitching.outs%3?` ${m.pitching.outs%3}/3`:''}`],['탈삼진',m.pitching.k],['피안타',m.pitching.hits],['볼넷',m.pitching.walks],['실점',m.pitching.runs],['피홈런',m.pitching.hr],['사구',m.pitching.hbp],['세이브',m.pitching.sv],['홀드',m.pitching.hold],['블론',m.pitching.bs],['투구 부담',Math.round(m.load*10)/10]];
  return <><p className="record-score">{teamName(m.opponentId)} {m.score[0]} : {m.score[1]} 청람고 <span className="muted">{m.over?'경기 종료':'진행 중'}</span></p>{m.appearance==='reserve'&&<p className="muted gap-top">벤치 대기 · 이번 경기에는 출전하지 않았습니다.</p>}<div className="record-grid">{rows.map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div></>;
}
