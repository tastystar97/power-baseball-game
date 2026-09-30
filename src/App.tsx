import {SchoolRivalryPanel,growthText} from './ui/RivalryPanel.tsx';
import { useEffect, useRef, useState } from 'react';
import { activities } from './content/activities.ts';
import { currentEvent } from './content/events.ts';
import { createGame, effectChips, previewActivity, transition } from './game/engine.ts';
import { labels, practiceStats, roleStats } from './game/types.ts';
import type { Action, GameState, Role, StatKey } from './game/types.ts';
import { loadGame, saveGame } from './persistence/save.ts';
import { Background, Meter, Portrait, roleName } from './ui/common.tsx';
import { MatchScreen } from './ui/MatchScreen.tsx';
import { StatusDialog } from './ui/StatusDialog.tsx';
import {CompetitionPanel,SelectionScreen,SupportLineup,SupportPanel} from './ui/GrowthPanels.tsx';
import {bond,supportById} from './content/supports.ts';
import {matchPlan,weekTitle,tournamentResult} from './game/season.ts';
import {DevelopmentPanel,SeasonPanel,TournamentBoard,SeasonRecords} from './ui/SeasonPanel.tsx';
import {skills,supportHint} from './content/skills.ts';

// Accessing localStorage itself can throw when the browser blocks persistence.
function readSave() { try { return loadGame(window.localStorage); } catch { return {kind:'unavailable' as const}; } }
function persist(s:GameState) { try { return saveGame(s,window.localStorage); } catch { return false; } }
type Send=(a:Omit<Action,'revision'>)=>void;

function Changes({changes}:{changes:Record<string,number>}) {
  return <div className="chips">{Object.entries(changes).map(([k,v])=><span key={k} className={`chip ${(k==='stress'?v>0:v<0)?'cost':''}`}>{labels[k]} {v>0?'+':''}{v}</span>)}</div>;
}

function latestTrainingEntry(s:GameState) {
  const last=s.log.at(-1);
  const entry=last?.training?last:last?.title==='함께 쌓은 연습'?s.log.at(-2):undefined;
  return entry?.training?entry:null;
}

function TrainingFeedback({s}:{s:GameState}) {
  const entry=latestTrainingEntry(s);
  if(!entry?.training)return null;
  const result=entry.training,failed=result.outcome==='failure';
  const last=s.log.at(-1)!;
  const changes={...entry.changes,...(last===entry?{}:Object.fromEntries(Object.entries(last.changes).filter(([k])=>k!=='skillPoints')))};
  return <section className={`training-feedback ${failed?'failed':'succeeded'}`} role="status">
    <p className="reason">{entry.month}월 {entry.week}주 · 방금 마친 훈련</p>
    <strong>{entry.title}</strong>
    <Changes changes={changes}/>
    <p className="reason">시작 체력 {result.energyBefore} · 실패 확률 {result.failureChance}% · 스킬 +{result.points} Pt</p>
    {last!==entry&&last.title==='함께 쌓은 연습'&&<p className="reason">{last.text}</p>}
    {s.competitor.weeks.find(w=>w.key===(entry.month-3)*4+entry.week)&&<p className="reason">차준서 · {growthText(s.competitor.weeks.find(w=>w.key===(entry.month-3)*4+entry.week)!.gains)}</p>}{failed&&<p className="reason">능력 성장 없이 체력·스트레스·멘탈 손해를 받았습니다. 함께한 인연은 유지됩니다.</p>}
  </section>;
}

function BondBonusPreview({bonus}:{bonus:NonNullable<NonNullable<ReturnType<typeof previewActivity>>['bondBonus']>}) {
  return <div className="bond-bonus-preview">
    <strong>인연 보너스 · {labels[bonus.stat]} +{bonus.amount} 포함</strong>
    <p className="reason">{bonus.partners.map(p=>`${supportById(p.id).name} 인연 ${p.bond} → +${p.amount}`).join(' · ')}</p>
    <p className="reason">{bonus.amount<bonus.potential?`기본 합계 +${bonus.potential}에서 성장 단계·스트레스·능력 상한을 반영한 실제 추가 성장입니다.`:'위 성장량에 이미 포함된 수치입니다.'} 훈련 전 인연 기준이며, 실패하면 받지 못합니다.</p>
  </div>;
}

function ActivityScreen({s,send}:{s:GameState;send:Send}) {
  const weekend=s.phase==='weekend';
  const [selected,setSelected]=useState('');
  const [target,setTarget]=useState<StatKey>(practiceStats(s.role)[0]);
  const options=activities(s,target),preview=previewActivity(s,selected,target);
  return <><Background id={weekend?'riverside':s.role==='pitcher'?'bullpen':'batting'} banner caption={weekend?'일요일 · 나를 돌보는 시간':'방과 후 · 청람고 야구부'}/>
    <h1 className="screen-title" tabIndex={-1}>{weekend?'이번 주말은 어떻게 보낼까?':'이번 주, 무엇을 연습할까?'}</h1>
    <p className="lead">{weekend?'쉬어 가는 선택도 다음 승부를 위한 준비입니다.':'한 주의 주력 활동을 고르세요. 작은 선택이 나의 야구를 만듭니다.'}</p>
    <div className="mobile-condition"><Meter label="체력" value={s.energy}/><Meter label="스트레스" value={s.stress} bad/></div>
    <div className="cards" role="group" aria-label={weekend?'주말 활동':'평일 활동'}>{options.map(a=>{
      const p=previewActivity(s,a.id,target)!;
      return <button className="card" key={a.id} aria-pressed={selected===a.id} onClick={()=>setSelected(a.id)}><span className="top"><span className="name">{a.title}</span><span className={`chip risk ${p.failureChance>=25?'cost':''}`}>{p.training?`실패 ${p.failureChance}%`:'안전 활동'}</span></span><span className="desc">{a.description}</span><span className="chips">{p.present.map(id=><span key={id} className={`chip ${p.joint.includes(id)?'joint':''}`}>{p.joint.includes(id)?'★ ':''}{supportById(id).name} · 인연 {bond(s,id)}{p.joint.includes(id)?' · 합동':''}</span>)}</span><span className="reward-caption">{p.training?'성공 시 성장·소모':'예상 변화'}</span>{p.bondBonus&&<span className="bond-bonus-label">인연 보너스 · {labels[p.bondBonus.stat]} +{p.bondBonus.amount} 포함</span>}<span className="chips">{p.points>0&&<span className="chip points">스킬 +{p.points} Pt</span>}{effectChips(p).map(c=><span key={c.key} className={`chip ${(c.key==='stress'?c.value>0:c.value<0)?'cost':''}`}>{c.label}</span>)}</span></button>;
    })}</div>
    {selected==='practice'&&<div className="practice-target"><label className="field-label" htmlFor="practice-target">개인 연습할 능력</label><select id="practice-target" value={target} onChange={e=>setTarget(e.target.value as StatKey)}>{practiceStats(s.role).map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></div>}
    <div className="activity-confirm panel gap-top" aria-live="polite">{preview?<><strong>{preview.title}{selected==='practice'?` · ${labels[target]}`:''}</strong>{preview.training&&<p className={`training-odds ${preview.failureChance>=25?'warning':''}`}>시작 체력 {s.energy} · 성공 {100-preview.failureChance}% / 실패 {preview.failureChance}%</p>}<p className="reason">{preview.training?'성공 시':'활동 후'} 체력 {s.energy+preview.energy} · 스트레스 {s.stress+preview.stress} · 스킬 +{preview.points} Pt</p>{preview.failureChance>0&&preview.failure&&<div className="failure-preview"><strong>실패 시 · 능력 성장 없음 / 스킬 +0 Pt</strong><div className="chips">{effectChips(preview.failure).map(c=><span key={c.key} className="chip cost">{c.label}</span>)}</div><p className="reason">체력 {s.energy+preview.failure.energy} · 스트레스 {s.stress+preview.failure.stress}가 됩니다. 훈련 시간은 그대로 소비됩니다.</p></div>}{preview.present.length>0&&<p className="reason">{preview.present.map(id=>`${supportById(id).name} 인연 +${Math.min(15,100-bond(s,id))}`).join(' · ')}{preview.joint.length>0&&' · 성공 시 합동 훈련 보너스 포함'}</p>}{preview.bondBonus&&<BondBonusPreview bonus={preview.bondBonus}/>}{Object.entries(preview.gains).some(([key,value])=>value!>0&&s.stats[key as StatKey]>=60)&&<p className="reason gap-top">능력 60부터 성장 속도가 완만해집니다. 성장 단계와 스트레스를 반영한 실제 수치입니다.</p>}{preview.competitorGrowth&&<div className="rival-opponent"><strong>준서의 이번 주 성장</strong><p className="reason">{preview.competitorGrowth.sharedPrimary?'함께 성공하면':'기본 계획'} · {growthText(preview.competitorGrowth.success)} · 신뢰 +1</p>{preview.competitorGrowth.sharedPrimary&&preview.failureChance>0&&<p className="reason">내 훈련 실패 시 · {growthText(preview.competitorGrowth.failure)} · 함께한 추가 성장 없음</p>}<p className="reason">준서는 편성 여부와 관계없이 매주 계획대로 성장합니다.</p></div>}{preview.warning&&<p className="warning gap-top">{preview.warning}</p>}</>:<p className="muted">활동을 고르면 성공·실패 확률과 예상 변화를 확인할 수 있습니다.</p>}
    <div className="actions"><button className="primary" disabled={!preview} onClick={()=>send({type:'activity',id:selected,...(selected==='practice'?{target}:{})})}>{weekend?'주말 보내기':'이번 주 시작'}</button></div></div>
  </>;
}

function EventScreen({s,send}:{s:GameState;send:Send}) {
  const ev=currentEvent(s),result=s.phase.endsWith('Result'),weekend=s.phase.startsWith('weekend');
  const person=s.activeSupport||(ev.speaker.includes('감독')?'coach':ev.speaker.includes('라이벌')?'rival':'catcher');
  const changes=result?Object.assign({},...(s.phase==='supportResult'?s.log.slice(-2):s.log.slice(-1)).map(l=>l.changes)):{};
  const hint=s.activeSupport?skills.find(k=>k.id===supportHint(s,s.activeSupport!)):null;
  return <><h1 className="screen-title" tabIndex={-1}>{ev.title}</h1><p className="lead">{weekend?'일요일, 캐치볼을 마치고':'훈련을 마친 운동장'}</p>
    {weekend?<div className="stage"><Background id="ground" fill/><Portrait id={person}/><span className="place">청람고 운동장</span></div>:<Background id="ground" banner/>}
    <section className="scene-card"><div className="event-body">{!weekend&&<Portrait id={person} size="sm"/>}<div><p className="speaker"><strong>{ev.speaker}</strong></p><p className="quote">{result?s.eventReply:ev.text}</p></div></div>
    {result?<><Changes changes={changes}/>{hint&&<p className="notice">스킬 힌트 · {hint.name}<br/><span className="reason">습득 비용이 4 Pt 줄었습니다. 다음 활동 선택 화면에서 배울 수 있습니다.</span></p>}<div className="actions"><button className="primary" onClick={()=>send({type:'continue'})}>{s.phase==='supportResult'?'훈련 이후의 이야기':weekend?(s.week===4?(s.month<6?`${s.month+1}월 준비하기`:'여름 시즌 마무리'):'다음 주로'):'주말 활동으로'}</button></div></>:<div className="cards one gap-top">{ev.choices.map((c,i)=><button className="card" key={c.label} onClick={()=>send({type:'choice',index:i})}><strong>{c.label}</strong><span className="desc">{c.hint}</span><Changes changes={{...c.gains,...Object.fromEntries((['energy','stress','academics','trust','rival','catcher'] as const).filter(k=>c[k]).map(k=>[k,c[k]!]))}}/></button>)}</div>}</section>
  </>;
}

export default function App() {
  const [loaded]=useState(readSave);
  const [game,setGame]=useState<GameState|null>(loaded.kind==='ok'?loaded.state:null);
  const gameRef=useRef(game);
  const [mode,setMode]=useState<'menu'|'create'|'play'>('menu');
  const [role,setRole]=useState<Role>('batter'),[name,setName]=useState('');
  const [statusOpen,setStatusOpen]=useState(false),[statusTab,setStatusTab]=useState('능력'),[confirmNew,setConfirmNew]=useState(false);
  const [saveOk,setSaveOk]=useState(loaded.kind!=='unavailable');
  const [error,setError]=useState('');
  const main=useRef<HTMLElement>(null);
  useEffect(()=>{main.current?.querySelector<HTMLElement>('h1')?.focus();},[mode,game?.phase,game?.week,game?.month]);
  const send:Send=a=>{
    if(!game)return;
    // Capture the rendered revision, so a second click from an old screen is ignored.
    const previous=gameRef.current!;
    const next=transition(previous,{...a,revision:game.revision});
    if(next===previous)return;
    gameRef.current=next;setGame(next);setSaveOk(persist(next));
  };
  function start() {
    try {
      const seed=crypto.getRandomValues(new Uint32Array(1))[0];
      const next=createGame(name,role,seed);
      gameRef.current=next;setGame(next);setSaveOk(persist(next));setError('');setMode('play');
    } catch(e) { setError(e instanceof Error?e.message:'선수를 만들지 못했습니다.'); }
  }
  function requestNew() {
    setError('');
    if(game||loaded.kind==='invalid')setConfirmNew(true);
    else {setMode('create');setName('');}
  }
  const playing=mode==='play'&&game!==null;
  const trainingEntry=playing?latestTrainingEntry(game):null;
  const match=playing&&game.phase.startsWith('match');
  const scene=playing&&game.phase.startsWith('weekend')&&game.phase!=='weekend';
  const completed=playing&&game.phase==='complete';
  const layout=!playing||completed||game.phase==='lineup'||game.phase==='selection'?'full':match?'match':scene?'scene':'three';
  const weekend=playing&&(game.phase.startsWith('weekend')||completed);
  const step=game?.phase==='weekday'?0:game?.phase==='event'||game?.phase==='eventResult'||game?.phase.startsWith('support')||game?.phase==='selection'||match?1:2;
  return <div className="app" data-layout={layout} data-mood={weekend?'weekend':'weekday'} data-phase={playing?game.phase:mode}>
    <header className="topbar"><span className="brand">마지막 여름</span>{playing&&<><span className="date">1학년 {game.month}월 {game.week}주차</span><span className="who">{game.name} · {roleName(game)}</span></>}<div className="right">{playing&&<><span className={`save-state ${saveOk?'':'warning'}`}>{saveOk?'자동 저장됨':'저장되지 않음'}</span><button onClick={()=>{setStatusTab('능력');setStatusOpen(true);}}>상태창</button><button className="menu-button" onClick={()=>{setConfirmNew(false);setMode('menu');}}>처음 화면</button></>}</div></header>
    {!saveOk&&<p className="notice warning" role="status">브라우저에 저장할 수 없습니다. 지금은 플레이할 수 있지만, 새로고침하거나 창을 닫으면 이번 진행을 잃을 수 있습니다.</p>}
    <div className="body">
    {playing&&layout==='three'&&<aside className="side"><section className="panel player-panel"><Portrait id={game.role}/><h2>{game.name}</h2><p className="muted">청람고 1학년 · {roleName(game)}</p><div className="gap-top"><Meter label="체력" value={game.energy}/><Meter label="스트레스" value={game.stress} bad/><Meter label="학업" value={game.academics}/></div><button className="full-button gap-top" onClick={()=>{setStatusTab('능력');setStatusOpen(true);}}>능력과 기록 보기</button></section></aside>}
    <main className="center" ref={main}>
    {playing&&<TrainingFeedback s={game}/>}
    {mode==='menu'&&<><div className="hero"><Background id="gate"/><div className="title-block"><h1 className="logo" tabIndex={-1}>마지막 여름</h1><p className="tag">교문에서 시작된, 나만의 야구 이야기</p></div></div><p className="lead">스윙 한 번, 공 하나. 오늘의 선택이 내일의 선수를 만듭니다.</p><section className="panel"><p>청람고 야구부의 신입생이 되어 3월부터 6월 여름 대회까지 뛰어보세요. 훈련과 스킬로 나만의 스타일을 만들고, 동료와 함께 대회에 도전합니다.</p><div className="actions">{game&&<button className="primary" onClick={()=>{setConfirmNew(false);setMode('play');}}>이어서 하기</button>}<button className={game?'':'primary'} onClick={requestNew}>새 선수 만들기</button></div>{game&&<p className="muted gap-top">{game.name} · {roleName(game)} · {game.month}월 {game.week}주차 {game.phase==='complete'?'여름 시즌 완료':''}</p>}{loaded.kind==='invalid'&&!game&&<p className="notice warning" role="alert">저장 데이터의 형식이나 진행 상태를 읽을 수 없습니다. 기존 데이터는 그대로 보관되어 있습니다. 새 선수를 만들면 입학할 때 덮어씁니다.</p>}</section><p className="muted gap-top">3~6월 · 첫 여름 대회 버전 · 이 브라우저에 자동 저장됩니다.</p></>}
    {mode==='create'&&<><h1 className="screen-title" tabIndex={-1}>새 유니폼의 주인공</h1><p className="lead">어떤 선수로 첫걸음을 내딛을까요?</p><form onSubmit={e=>{e.preventDefault();start();}}><label className="field-label" htmlFor="player-name">선수 이름</label><input id="player-name" type="text" value={name} onChange={e=>setName(e.target.value)} autoComplete="off" placeholder="이름을 입력하세요" aria-describedby="name-hint"/><p className="muted gap-top" id="name-hint">이름은 1~8자. 역할은 입학 후에 바꿀 수 없습니다.</p><p className="field-label section-label">나의 포지션</p><div className="roles" role="group" aria-label="선수 역할">{(['batter','pitcher'] as const).map(r=><button type="button" className="card role-card" aria-pressed={role===r} key={r} onClick={()=>setRole(r)}><Portrait id={r} size="sm"/><span><strong>{r==='batter'?'타자':'투수'}</strong><span className="role-description">{r==='batter'?'팀의 흐름을 바꾸는 한 번의 스윙':'마운드 위에서 만드는 나만의 승부'}</span><span className="desc">{roleStats(r).map(k=>labels[k]).join(' · ')}</span></span></button>)}</div>{error&&<p className="notice warning" role="alert">{error}</p>}<div className="actions"><button className="primary" type="submit" disabled={!name.trim()||[...name.trim()].length>8}>입학하기</button><button type="button" onClick={()=>setMode('menu')}>돌아가기</button></div></form></>}
    {playing&&!completed&&<>{game.phase!=='lineup'&&<ol className="steps" aria-label="이번 주 진행">{['평일 활동',matchPlan(game)?(game.month===3?'토요일 연습경기':'출전 평가 · 경기'):'야구부 사건','주말 활동'].map((label,i)=><li key={label} className={step===i?'now':step>i?'done':''} aria-current={step===i?'step':undefined}>{i+1}. {label}</li>)}</ol>}{!match&&(!trainingEntry||!game.notice.startsWith(trainingEntry.title))&&<p className="recap" role="status">{game.notice}</p>}{['weekday','weekend','selection','lineup'].includes(game.phase)&&<div className="growth-toolbar"><button onClick={()=>{setStatusTab('시즌');setStatusOpen(true);}}>시즌 일정·대진</button><button onClick={()=>{setStatusTab('스킬');setStatusOpen(true);}}>스킬 배우기 · {game.skillPoints} Pt</button>{game.phase==='weekday'&&game.week===1&&<button onClick={()=>send({type:'editLineup'})}>이번 달 편성 수정</button>}</div>}{game.phase==='weekday'&&<div className="mobile-goal"><SeasonPanel s={game}/><CompetitionPanel s={game}/></div>}{game.phase==='lineup'?<SupportLineup key={game.month} s={game} send={send}/>:game.phase==='selection'?<SelectionScreen s={game} send={send}/>:game.phase==='weekday'||game.phase==='weekend'?<ActivityScreen key={`${game.month}-${game.week}-${game.phase}`} s={game} send={send}/>:match?<MatchScreen s={game} send={send}/>:<EventScreen s={game} send={send}/>}</>}
    {completed&&<><Background id="ground" banner caption="1학년 6월의 끝 · 함께 만든 첫 여름"/><h1 className="screen-title" tabIndex={-1}>나의 첫 여름 · {tournamentResult(game)}</h1><p className="lead">{game.name}의 첫 시즌, 훈련으로 만든 야구가 기록으로 남았습니다.</p><DevelopmentPanel s={game} detail/><TournamentBoard s={game}/><SeasonRecords s={game}/><SchoolRivalryPanel s={game}/><section className="panel"><p>3월의 첫 연습부터 6월의 마지막 주말까지 마쳤습니다. 함께한 파트너와 배운 스킬, 경기 기록을 돌아보세요.</p><p className="muted gap-top">현재 버전은 첫 여름 대회까지입니다. 7월 이후의 이야기는 앞으로 이어집니다.</p><div className="actions"><button className="primary" onClick={()=>{setStatusTab('기록');setStatusOpen(true);}}>시즌 기록 돌아보기</button><button onClick={requestNew}>다른 선수로 시작</button></div></section></>}
    {confirmNew&&<section className="confirm-box" role="alert" aria-label="새 선수 확인"><strong>새 선수로 시작할까요?</strong><p>새 선수의 ‘입학하기’를 누르면 기존 저장을 덮어씁니다. 그전까지는 돌아갈 수 있습니다.</p><div className="actions"><button onClick={()=>{setConfirmNew(false);setName('');setMode('create');}}>새 선수 만들러 가기</button><button onClick={()=>setConfirmNew(false)}>취소</button></div></section>}
    </main>
    {playing&&layout==='three'&&<aside className="side"><SeasonPanel s={game}/><DevelopmentPanel s={game}/><CompetitionPanel s={game}/><SupportPanel s={game}/><section className="panel"><h3>{game.month}월의 일정</h3><ul className="cal">{[1,2,3,4].map(w=>weekTitle(game,w)).map((t,i)=><li key={t} className={game.week===i+1?'now':''}><span className="wk">{i+1}주차</span><span>{t}{i+1<game.week?' ✓':''}</span></li>)}</ul><p className="reason gap-top">경기 주간에도 일요일 활동은 남습니다. 대회 일정과 상대는 상태창의 시즌 탭에서 확인하세요.</p></section></aside>}
    </div>{statusOpen&&game&&<StatusDialog s={game} send={send} initialTab={statusTab} onClose={()=>setStatusOpen(false)}/>}<footer>마지막 여름 · FIRST SUMMER</footer>
  </div>;
}


