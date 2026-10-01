import {useEffect,useMemo,useRef} from 'react';
import {SkillChecks} from './SkillChecks.tsx';
import {DuelRecords} from './RivalryPanel.tsx';
import type {Action,GameState} from '../game/types.ts';
import {tactics} from '../game/match.ts';
import {presentationAt} from '../game/playback.ts';
import {matchPlan} from '../game/season.ts';
import {teamName} from '../content/teams.ts';
import {pitchingRoleNames} from '../content/career-events.ts';
import {Records} from './common.tsx';
import {appearanceName} from '../game/competition.ts';
import {usePlayback} from './match/usePlayback.ts';
import {BallField} from './match/BallField.tsx';
import {Scoreboard} from './match/Scoreboard.tsx';
import {MatchupCard} from './match/MatchupCard.tsx';
import {Commentary,caption} from './match/Commentary.tsx';
import {PlaybackControls} from './match/PlaybackControls.tsx';
import {DiceReveal} from './match/DiceReveal.tsx';
import {getSkills} from '../content/skills.ts';
import {pendingRoleEvent} from '../game/career-role.ts';
export function MatchScreen({s,send}:{s:GameState;send:(a:Omit<Action,'revision'>)=>void}){
 const m=s.match!,playback=usePlayback(s,send),view=useMemo(()=>presentationAt(m,playback.index,playback.rolling),[m,playback.index,playback.rolling]);
 const choices=useMemo(()=>playback.ready?tactics(s):[],[s,playback.ready]);
 const focus=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(playback.ready)focus.current?.focus({preventScroll:true});},[playback.ready]);
 const roleLabel=s.role==='batter'?`${m.battingOrder}번 · 2루수`:pitchingRoleNames[m.pitchingRole];
 const visiblePitching=view.pitcher?.id==='player'||playback.index>=m.feed.length&&m.entered&&!m.retired;
 const canIntervene=!playback.finished&&!playback.ready&&m.playerBoundary&&m.appearance!=='reserve'&&(s.role==='batter'||visiblePitching);
 const reason=playback.finished?'경기 종료':m.appearance==='reserve'?'오늘은 출전 대기':s.role==='pitcher'&&!visiblePitching?(m.retired?'교체 후 관전 중':'등판 전 관전 중'):playback.ready?'작전을 고를 차례':'아직 계산하지 않은 다음 본인 승부에 개입';
 const active=view.event?m.skillChecks?.find(c=>c.inning===view.event!.inning&&c.half===view.event!.half&&c.order===view.event!.order)?.active??[]:[];
 const activeNames=active.map(id=>getSkills(s).find(k=>k.id===id)?.name??id);
 const shownEvent=playback.rolling?null:view.event;
 const end=playback.finished,captionEvent=playback.rolling?null:view.event??m.feed[Math.min(playback.index,m.feed.length)-1]??null;
 return <section className="live-match" data-playback-index={playback.index} data-decision={playback.ready?'true':'false'}><div className="match-heading"><div><p className="eyebrow">{matchPlan(s)?.title??'청람고 경기'}</p><h1 tabIndex={-1}>청람고 <span>vs</span> {teamName(m.opponentId)}</h1></div><span className="role-tag">{s.name} · {roleLabel}<small>{appearanceName(s,m.appearance)}</small></span></div>
  <Scoreboard score={view.score} away={teamName(m.opponentId)} ended={end} scoring={!!shownEvent?.runs}/>
  <div className="match-stage"><BallField event={shownEvent} fielders={view.fielders} pitcher={view.pitcher} bases={view.score.bases} outs={view.score.outs} duration={playback.duration} reduced={playback.reduced} paused={playback.paused} decision={playback.ready}/>{view.event?.source==='manual'&&<DiceReveal event={view.event} rolling={playback.rolling} paused={playback.paused} outlook={playback.diceOutlook} skills={activeNames} skip={playback.skipDice}/>}</div>
  <Commentary event={captionEvent} ready={playback.ready} ended={end}/>
  {!end&&<PlaybackControls speed={playback.speed} setSpeed={playback.setSpeed} paused={playback.paused} togglePause={()=>playback.setPaused(v=>!v)} intervene={()=>send({type:'intervene'})} canIntervene={canIntervene} reason={reason} closer={s.role==='pitcher'&&m.pitchingRole==='closer'&&view.score.inning<9} fastUntil={playback.fastUntil} fastToEntry={()=>{playback.setFastUntil(true);playback.setPaused(false);}} reserve={m.appearance==='reserve'}/>}
  {!end&&<MatchupCard view={view} s={s}/>}
  {playback.ready&&<section className="decision-panel"><div className="decision-heading"><h2 ref={focus} tabIndex={-1}>이번 승부, 어떻게 할까?</h2><button onClick={()=>send({type:'delegate'})}>맡기기</button></div><p className="reason">{view.score.outs}아웃 · {view.score.bases.map((r,i)=>r?`${i+1}루 ${r.name}`:'').filter(Boolean).join(' · ')||'주자 없음'}</p><div className="live-tactics">{choices.map(t=><button className="card" key={t.id} disabled={t.disabled} onClick={()=>playback.choose(t.id,t.outlook)}><span className="top"><strong>{t.title}</strong><span className={`outlook ${t.outlook==='유리'?'good':'mid'}`}>{t.outlook}</span></span><span className="desc">{t.description}</span>{t.disabled&&<span className="reason">진루할 주자가 있고 2아웃 미만이어야 합니다.</span>}</button>)}</div></section>}
  {end&&<section className="match-final"><p className="eyebrow">FINAL SCORE</p><h2>{m.score[1]>m.score[0]?'함께 만든 승리':'다음 승부를 향해'}</h2><p className="final-score">청람고 <b>{m.score[1]} : {m.score[0]}</b> {teamName(m.opponentId)}</p><Records s={s}/><div className="actions"><button className="primary" onClick={()=>send({type:'continue'})}>{pendingRoleEvent(s)?'감독 면담으로':'일요일 주말 활동으로'}</button></div></section>}
  <details className="match-history"><summary>지나간 중계 · {Math.min(playback.index+(playback.rolling?0:1),m.feed.length)}개 장면</summary><ol>{m.feed.slice(0,playback.index+(playback.rolling?0:1)).map((e,i)=><li key={i}>{caption(e)}</li>)}</ol></details>
  {end&&<details className="match-history"><summary>라이벌 대결과 발동 스킬</summary><DuelRecords role={s.role} match={m}/><SkillChecks match={m} s={s}/></details>}
 </section>;
}
