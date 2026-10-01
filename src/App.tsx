import {ActivityRollSequence,ActivityRollResults} from './ui/ActivityRollSequence.tsx';
import {CharacterMaker} from './ui/creation/CharacterMaker.tsx';
import {newCreation} from './game/creation.ts';
import type {CreationDraft} from './game/creation.ts';
import {JournalAnnouncer} from './ui/JournalAnnouncer.tsx';
import {activityRolls} from './game/journal.ts';
import {useReducedMotion} from './ui/RollDice.tsx';
import {RoleEventScreen} from './ui/RoleEventScreen.tsx';
import {CardAvatar} from './ui/DeckBuilder.tsx';
import {CardLibrary} from './ui/CardLibrary.tsx';
import {database} from './persistence/database.ts';
import {SAVE_KEY} from './persistence/save.ts';
import type {LoadResult} from './persistence/save.ts';
import type {CardPack} from './cards/schema.ts';
import {builtinPack} from './cards/builtin.ts';
import {catalogFromPacks} from './cards/catalog.ts';
import {errorText} from './cards/browser.ts';
import {trainingRiskLabel} from './game/training.ts';
import {PRIMARY_MAX} from './content/development-rules.ts';
import {trainingTargets,growthChanges} from './game/abilities.ts';
import {AbilityPreview} from './ui/AbilityPanel.tsx';
import {skillActivationChance} from './game/skill-activation.ts';
import {SchoolRivalryPanel,growthText} from './ui/RivalryPanel.tsx';
import {competitorTrainingFeedback} from './game/rivalry.ts';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { activities } from './content/activities.ts';
import { currentEvent } from './content/events.ts';
import { effectChips, previewActivity, transition } from './game/engine.ts';
import { labels } from './game/types.ts';
import type { Action, GameState, TrainingTarget, SupportId } from './game/types.ts';
import { Background, Meter, roleName } from './ui/common.tsx';
import { MatchScreen } from './ui/MatchScreen.tsx';
import { StatusDialog } from './ui/StatusDialog.tsx';
import {CompetitionPanel,SelectionScreen,SupportLineup,SupportPanel} from './ui/GrowthPanels.tsx';
import {bond,supportById,changeLabel} from './content/supports.ts';
import {matchPlan,weekTitle,tournamentResult} from './game/season.ts';
import {DevelopmentPanel,SeasonPanel,TournamentBoard,SeasonRecords} from './ui/SeasonPanel.tsx';
import {getSkills} from './content/skills.ts';
import {Hud,PlayerCard,LogPanel,CalendarDialog,BottomMenu} from './ui/GameShell.tsx';
import {GameScene} from './ui/scene/GameScene.tsx';
import {ActivityTile} from './ui/ActivityTile.tsx';
import type {FloatingText} from './ui/scene/SceneStage.tsx';
import {primaryLabels} from './game/types.ts';
import type {PrimaryKey} from './game/types.ts';

type Send=(a:Omit<Action,'revision'>)=>void;

function Changes({changes,s}:{changes:Record<string,number>;s:GameState}) {
  // Proficiency is hidden: one technique marker instead of numbers.
  const entries=Object.entries(changes).filter(([k])=>!k.startsWith('proficiency_'));
  const technique=Object.entries(changes).some(([k,v])=>k.startsWith('proficiency_')&&v>0);
  const label=(k:string)=>k.startsWith('primary_')?primaryLabels[k.slice(8) as PrimaryKey]:changeLabel(s,k,labels[k]);
  return <div className="chips">{entries.map(([k,v])=><span key={k} className={`chip ${(k==='stress'?v>0:v<0)?'cost':''}`}>{label(k)} {v>0?'+':''}{v}</span>)}{technique&&<span className="chip">기술 ▲</span>}</div>;
}

function latestTrainingEntry(s:GameState) {
  return s.log.slice().reverse().find(e=>e.action===s.revision&&e.training)??null;
}

const primaryColors:Record<string,string>={power:'#d9573b',endurance:'#2f8fbf',mental:'#8a5cc7',intelligence:'#2e6fd1',sense:'#c98a12'};
/** The activity that produced the newest journal entry, so the scene can replay its outcome. */
function lastActivityScene(s:GameState):{activity?:string;present?:string[];outcome?:'success'|'failure';effects:FloatingText[]} {
  const all=[...activities({role:s.role,phase:'weekday'}),...activities({role:s.role,phase:'weekend'})];
  // The newest activity entry within the last few lines (a partner bonus line may follow it).
  const named=(title:string)=>all.find(a=>title===a.title||title.startsWith(`${a.title} · `));
  const entry=s.log.slice(-3).reverse().find(l=>l.slot&&named(l.title));
  if(!entry)return {effects:[]};
  const activity=named(entry.title)?.id;
  const actionChanges=Object.assign({},...s.log.filter(l=>l.action===entry.action).map(l=>l.changes)) as Record<string,number>;
  const present=Object.entries(actionChanges).filter(([k,v])=>v>0&&(k.startsWith('bond_')||k==='rival'||k==='catcher')).map(([k])=>k.startsWith('bond_')?k.slice(5):k);
  const outcome=entry.training?.outcome;
  const effects:FloatingText[]=Object.entries(entry.changes).filter(([k,v])=>k.startsWith('primary_')&&v>0).slice(0,3).map(([k,v],i)=>({key:`${entry.id}-${k}`,text:`${primaryLabels[k.slice(8) as PrimaryKey]} +${v}`,color:primaryColors[k.slice(8)]??'#1f2d4d',x:36+i*16,y:34+i*6}));
  if(Object.entries(entry.changes).some(([k,v])=>k.startsWith('proficiency_')&&v>0))effects.push({key:`${entry.id}-tech`,text:'기술 ▲',color:'#3a6f37',x:60,y:22});
  if(outcome==='failure')effects.push({key:`${entry.id}-fail`,text:'실패…',color:'#b4441f',x:50,y:30});
  return {activity,present,outcome:outcome==='failure'?'failure':outcome==='success'||!entry.training?'success':undefined,effects};
}

function TrainingFeedback({s}:{s:GameState}) {
  const entry=latestTrainingEntry(s);
  if(!entry?.training)return null;
  const result=entry.training,failed=result.outcome==='failure';
  const rivalGrowth=competitorTrainingFeedback(s,entry);
  const last=s.log.slice().reverse().find(e=>e.action===entry.action&&e.title==='함께 쌓은 연습')??entry;
  const changes={...entry.changes,...(last===entry?{}:Object.fromEntries(Object.entries(last.changes).filter(([k])=>k!=='skillPoints')))};
  return <section className={`training-feedback ${failed?'failed':'succeeded'}`}>
    <p className="reason">{entry.month}월 {entry.week}주 · 방금 마친 훈련</p>
    <strong>{entry.title}</strong>
    <Changes s={s} changes={changes}/>
    <p className="reason">시작 체력 {result.energyBefore} · {trainingRiskLabel(result.failureChance)} · 스킬 +{result.points} Pt</p>
    {last!==entry&&last.title==='함께 쌓은 연습'&&<p className="reason">{last.text}</p>}
    {rivalGrowth&&<p className="reason">차준서 · {growthText(rivalGrowth.gains)}</p>}{failed&&<p className="reason">능력 성장 없이 체력·스트레스·멘탈 손해를 받았습니다. 함께한 인연은 유지됩니다.</p>}
  </section>;
}

function BondBonusPreview({bonus,s}:{s:GameState;bonus:NonNullable<NonNullable<ReturnType<typeof previewActivity>>['bondBonuses'][number]>}) {
  return <div className="bond-bonus-preview">
    <strong>인연 보너스 · {labels[bonus.stat]} +{bonus.amount} 포함</strong>
    <p className="reason">{bonus.partners.map(p=>`${supportById(p.id,s).name} 인연 ${p.bond} → +${p.amount}`).join(' · ')}</p>
    <p className="reason">{bonus.amount<bonus.potential?`기본 합계 +${bonus.potential}에서 성장 단계·능력 상한을 반영한 실제 추가 성장입니다.`:'위 성장량에 이미 포함된 수치입니다.'} 훈련 전 인연 기준이며, 실패하면 받지 못합니다.</p>
  </div>;
}

function ActivityScreen({s,send}:{s:GameState;send:Send}) {
  const weekend=s.phase==='weekend';
  const [selected,setSelected]=useState('');
  const [target,setTarget]=useState<TrainingTarget>(trainingTargets(s.role)[0]);
  const [partner,setPartner]=useState<SupportId>([...s.supports].sort((a,b)=>bond(s,b)-bond(s,a))[0]);
  const options=activities(s,target),preview=previewActivity(s,selected,target,partner);
  const last=selected?null:lastActivityScene(s);
  return <><GameScene s={s} input={selected?{activity:selected,present:preview?.present??[]}:{activity:last?.activity,present:last?.present,outcome:last?.outcome}} effects={last?.effects} caption={weekend?'일요일 · 나를 돌보는 시간':undefined}/>
    <h1 className="screen-title" tabIndex={-1}>{weekend?'이번 주말은 어떻게 보낼까?':`이번 주 ${s.weekdayPart===1?'전반':'후반'}, 무엇을 할까?`}</h1>
    <p className="lead">{weekend?'쉬어 가는 선택도 다음 승부를 위한 준비입니다.':s.weekdayPart===1?'전반 활동 뒤에는 편성한 파트너와 뜻밖의 만남이 있을 수 있습니다. 후반 활동도 남아 있습니다.':'후반 활동 뒤에도 카드 사건이 찾아옵니다. 경기와 주말까지 생각해 컨디션을 조절하세요.'}</p>
    <div className="mobile-condition"><Meter label="체력" value={s.energy}/><Meter label="스트레스" value={s.stress} bad/></div>
    <div className="cards activity-tiles" role="group" aria-label={weekend?'주말 활동':'평일 활동'}>{options.map(a=>{
      const cardTarget=trainingTargets(s.role,a.id==='partner').includes(target)?target:trainingTargets(s.role)[0];
      const p=previewActivity(s,a.id,cardTarget,partner)!;
      return <ActivityTile key={a.id} s={s} id={a.id} title={a.title} description={a.description} preview={p} selected={selected===a.id} onSelect={()=>{setSelected(a.id);setTarget(cardTarget);}}/>;
    })}</div>
    {['practice','partner'].includes(selected)&&<div className="practice-target"><label className="field-label" htmlFor="practice-target">연습할 능력</label><select id="practice-target" value={target} onChange={e=>setTarget(e.target.value as TrainingTarget)}>{trainingTargets(s.role,selected==='partner').map(k=><option key={k} value={k}>{labels[k]}{k.startsWith('primary_')?'':' 숙련'}</option>)}</select></div>}
    {selected==='partner'&&<div className="practice-target"><label className="field-label" htmlFor="partner-target">함께 특훈할 파트너</label><select id="partner-target" value={partner} onChange={e=>setPartner(e.target.value as SupportId)}>{s.supports.map(id=><option key={id} value={id} disabled={bond(s,id)<40}>{supportById(id,s).name} · 인연 {bond(s,id)}{bond(s,id)<40?' (40 필요)':''}</option>)}</select></div>}
    <div className="activity-confirm panel gap-top" aria-live="polite">{preview?<><strong>{preview.title}{['practice','partner'].includes(selected)?` · ${labels[target]}`:''}</strong><p className="reason">{options.find(o=>o.id===selected)?.description}</p>{preview.training&&<p className={`training-odds ${preview.failureChance>=25?'warning':''}`}>시작 체력 {s.energy} · {trainingRiskLabel(preview.failureChance)}</p>}<p className="reason">{preview.training?'성공 시':'활동 후'} 체력 {s.energy+preview.energy} · 스트레스 {s.stress+preview.stress} · 스킬 +{preview.points} Pt</p>{preview.failureChance>0&&preview.failure&&<div className="failure-preview"><strong>실패 시 · 능력 성장 없음 / 스킬 +0 Pt</strong><div className="chips">{effectChips(preview.failure).map(c=><span key={c.key} className="chip cost">{c.label}</span>)}</div><p className="reason">체력 {s.energy+preview.failure.energy} · 스트레스 {s.stress+preview.failure.stress}가 됩니다. 훈련 시간은 그대로 소비됩니다.</p></div>}{preview.present.length>0&&<p className="reason">{preview.present.map(id=>`${supportById(id,s).name} 인연 +${Math.min(8,100-bond(s,id))}`).join(' · ')}{preview.joint.length>0&&' · 성공 시 합동 훈련 보너스 포함'}</p>}{preview.bondBonuses.map(b=><BondBonusPreview key={b.stat} bonus={b} s={s}/>)}<AbilityPreview preview={preview}/>{preview.competitorGrowth&&<div className="rival-opponent"><strong>준서의 주간 성장 예상</strong><p className="reason">{preview.competitorGrowth.sharedPrimary?'함께 성공하면':'기본 계획'} · {growthText(preview.competitorGrowth.success)} · 신뢰 +1</p>{preview.competitorGrowth.sharedPrimary&&preview.failureChance>0&&<p className="reason">내 훈련 실패 시 · {growthText(preview.competitorGrowth.failure)} · 함께한 추가 성장 없음</p>}<p className="reason">후반 활동 완료 후 주 1회 반영됩니다. 함께한 전반·후반 훈련이 모두 보너스에 반영됩니다.</p></div>}{preview.disabledReason&&<p className="warning">{preview.disabledReason}</p>}{preview.warning&&<p className="warning gap-top">{preview.warning}</p>}</>:<p className="muted">활동을 고르면 실패 위험과 예상 변화를 확인할 수 있습니다.</p>}
    <div className="actions"><button className="primary" disabled={!preview||!!preview.disabledReason} onClick={()=>send({type:'activity',id:selected,...(['practice','partner'].includes(selected)?{target}:{}),...(selected==='partner'?{partner}:{})})}>{weekend?'주말 보내기':`${s.weekdayPart===1?'전반':'후반'} 활동 시작`}</button></div></div>
  </>;
}

function EventScreen({s,send}:{s:GameState;send:Send}) {
  const ev=currentEvent(s),result=s.phase.endsWith('Result'),weekend=s.phase.startsWith('weekend');
  const person=s.activeSupport||(ev.speaker.includes('감독')?'coach':ev.speaker.includes('라이벌')?'rival':'catcher');
  const eventIndex=s.log.map(l=>l.title).lastIndexOf(ev.title);
  const changes:Record<string,number>={};
  if(result)for(const l of s.log.slice(eventIndex))for(const [k,v] of Object.entries(l.changes))changes[k]=(changes[k]||0)+v;
  const chosen=ev.choices[s.encounterHistory.at(-1)?.choice??0];
  const owner=supportById(person,s);
  const hints=result?getSkills(s).filter(k=>chosen.hints.includes(k.id)&&owner.hints[s.role]===k.id):[];
  const unlocked=result?getSkills(s).filter(k=>chosen.unlocks.includes(k.id)&&owner.ultimates[s.role]===k.id):[];
  return <><h1 className="screen-title" tabIndex={-1}>{ev.title}</h1><p className="lead">{s.weekdayPart===1?'전반 활동 후 · 파트너 인카운터':'후반 활동 후 · 파트너 인카운터'}</p>
    <GameScene s={s} input={{speaker:person,answered:result}}/>
    <section className="scene-card"><div className="event-body">{!weekend&&<CardAvatar card={owner} content={s.content}/>}<div><p className="speaker"><strong>{ev.speaker}</strong></p><p className="quote">{result?s.eventReply:ev.text}</p></div></div>
    {result?<><Changes s={s} changes={changes}/>{hints.length>0&&<p className="notice">스킬 힌트 · {hints.map(k=>k.name).join(', ')}<br/><span className="reason">습득 비용이 4 Pt 줄었습니다. 다음 활동 선택 화면에서 배울 수 있습니다.</span></p>}{unlocked.length>0&&<p className="notice">상위 스킬 개방 · {unlocked.map(k=>k.name).join(', ')}<br/><span className="reason">일반 스킬과 능력 조건, 스킬 포인트를 갖춰 상태창에서 배울 수 있습니다.</span></p>}<div className="actions"><button className="primary" onClick={()=>send({type:'continue'})}>{s.weekdayPart===1?'후반 활동으로':matchPlan(s)?'경기 준비로':'주말 활동으로'}</button></div></>:<div className="cards one gap-top">{ev.choices.map((c,i)=><button className="card" key={c.label} onClick={()=>send({type:'choice',index:i})}><strong>{c.label}</strong><span className="desc">{c.hint}</span><Changes s={s} changes={{...growthChanges(c.gains,c.proficiency),...(c.points?{skillPoints:c.points}:{}),...Object.fromEntries((['energy','stress','trust'] as const).filter(k=>c[k]).map(k=>[k,c[k]!]))}}/></button>)}</div>}</section>
  </>;
}

export default function App() {
  const [loaded,setLoaded]=useState<LoadResult>({kind:'empty'});
  const [booting,setBooting]=useState(true);
  const [packs,setPacks]=useState<CardPack[]>([]);
  const content=useMemo(()=>catalogFromPacks([builtinPack,...packs]),[packs]);
  const [creation,setCreation]=useState<CreationDraft|null>(null),[creationProblem,setCreationProblem]=useState('');
  const [game,setGame]=useState<GameState|null>(null);
  const gameRef=useRef(game);
  const [rollAction,setRollAction]=useState<number|null>(null),rollLock=useRef(false),reducedMotion=useReducedMotion();
  const finishRoll=useCallback(()=>{rollLock.current=false;setRollAction(null);},[]);
  const [mode,setMode]=useState<'menu'|'create'|'play'|'library'>('menu');
  const [statusOpen,setStatusOpen]=useState(false),[statusTab,setStatusTab]=useState('능력'),[confirmNew,setConfirmNew]=useState(false);
  const [saveOk,setSaveOk]=useState(true),[saving,setSaving]=useState(false);
  const [calendarOpen,setCalendarOpen]=useState(false),[logSince,setLogSince]=useState(Number.MAX_SAFE_INTEGER);
  const saveQueue=useRef(Promise.resolve()),saveTicket=useRef(0);
  function persist(state:GameState){const ticket=++saveTicket.current;setSaving(true);saveQueue.current=saveQueue.current.catch(()=>{}).then(async()=>{try{await database().saveSession(state);if(ticket===saveTicket.current)setSaveOk(true);}catch{if(ticket===saveTicket.current)setSaveOk(false);}finally{if(ticket===saveTicket.current)setSaving(false);}});}
  const [error,setError]=useState('');
  const main=useRef<HTMLElement>(null);
  useEffect(()=>{let cancelled=false;void (async()=>{
    let legacy:string|null=null;try{legacy=localStorage.getItem(SAVE_KEY);}catch{}
    const saved=await database().loadSession(legacy);let library:CardPack[]=[];
    try{library=await database().listPacks();catalogFromPacks([builtinPack,...library]);}catch(e){library=[];if(!cancelled)setError(errorText(e));}
    let draft:CreationDraft|undefined;try{draft=await database().readCreation();}catch{if(!cancelled)setCreationProblem('만들던 선수 정보를 읽을 수 없습니다. 새 입학 지원서를 확정하기 전까지 원본을 보존합니다.');}
    if(cancelled)return;
    setCreation(draft??null);
    setPacks(library);setLoaded(saved);setSaveOk(saved.kind!=='unavailable');if(saved.kind==='ok'){gameRef.current=saved.state;setGame(saved.state);}setBooting(false);
  })();return ()=>{cancelled=true;};},[]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};if(saving||!saveOk)window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[saving,saveOk]);
  useEffect(()=>{if(rollAction===null)main.current?.querySelector<HTMLElement>('h1')?.focus();},[mode,game?.phase,game?.week,game?.month,game?.weekdayPart,rollAction]);
  const send:Send=a=>{
    if(!game||rollLock.current)return;
    // Capture the rendered revision, so a second click from an old screen is ignored.
    const previous=gameRef.current!;
    const next=transition(previous,{...a,revision:game.revision});
    if(next===previous)return;
    if(a.type!=='playback'&&next.logSequence>previous.logSequence)setLogSince(previous.logSequence+1);
    if(a.type==='activity'&&!reducedMotion&&activityRolls(next,next.revision).length){rollLock.current=true;setRollAction(next.revision);}
    gameRef.current=next;setGame(next);persist(next);
  };
  async function start(next:GameState) {
    await saveQueue.current.catch(()=>{});setSaving(true);
    try{await database().admitPlayer(next);setSaveOk(true);}catch{setSaveOk(false);}finally{setSaving(false);}
    gameRef.current=next;setGame(next);setLoaded({kind:'ok',state:next});setCreation(null);setCreationProblem('');setError('');setMode('play');
  }
  function beginNew(){setCreation(newCreation(content,crypto.getRandomValues(new Uint32Array(1))[0]));setConfirmNew(false);setCreationProblem('');setMode('create');}
  function requestNew() {
    setError('');
    if(creation||creationProblem)setConfirmNew(true);
    else beginNew();
  }
  const playing=mode==='play'&&game!==null;
  const trainingEntry=playing?latestTrainingEntry(game):null;
  const match=playing&&game.phase.startsWith('match');
  const scene=playing&&game.phase.startsWith('weekend')&&game.phase!=='weekend';
  const completed=playing&&game.phase==='complete';
  const layout=!playing||completed||game.phase==='lineup'||game.phase==='selection'?'full':match?'match':scene?'scene':'three';
  const weekend=playing&&(game.phase.startsWith('weekend')||completed);
  const step=game?.phase==='weekday'?(game.weekdayPart===1?0:2):game?.phase.startsWith('support')?(game.weekdayPart===1?1:3):game?.phase==='selection'||match?4:5;
  const steps=['전반 활동','전반 인카운터','후반 활동','후반 인카운터',...(game&&matchPlan(game)?['출전 · 경기']:[]),'주말 활동'];
  const visibleStep=step===5?steps.length-1:step;
  return <div className="app" data-layout={layout} data-has-log={playing&&game.phase!=='lineup'} data-mood={weekend?'weekend':'weekday'} data-phase={playing?game.phase:mode}>
    <div className="game-content" inert={rollAction!==null}>
    <header className="topbar"><span className="brand">마지막 여름</span>{playing&&<><span className="date">1학년 {game.month}월 {game.week}주차{game.phase==='weekday'?` · ${game.weekdayPart===1?'전반':'후반'}`:''}</span><span className="who">{game.name} · {roleName(game)}</span></>}<div className="right">{playing&&<><span className={`save-state ${saveOk?'':'warning'}`}>{saving?'저장 중…':saveOk?'자동 저장됨':'저장되지 않음'}</span>{(completed||layout!=='three'&&!match)&&<><button onClick={()=>{setStatusTab('능력');setStatusOpen(true);}}>상태창</button><button className="menu-button" onClick={()=>{setConfirmNew(false);setMode('menu');}}>처음 화면</button></>}</>}</div></header>
    {!saveOk&&<p className="notice warning" role="status">브라우저에 저장할 수 없습니다. 지금은 플레이할 수 있지만, 새로고침하거나 창을 닫으면 이번 진행을 잃을 수 있습니다.</p>}
    {playing&&!completed&&game.phase!=='lineup'&&<Hud s={game} steps={steps} step={visibleStep} onCalendar={match&&!game.match?.over?undefined:()=>setCalendarOpen(true)}/>}
    <div className="body">
    {playing&&layout==='three'&&<aside className="side game-side"><PlayerCard s={game} onStatus={()=>{setStatusTab('능력');setStatusOpen(true);}}/><CompetitionPanel s={game}/><SupportPanel s={game}/></aside>}
    <main className="center" ref={main}>
    {playing&&rollAction===null&&<><ActivityRollResults s={game}/><TrainingFeedback s={game}/></>}
    {mode==='menu'&&<><div className="hero"><Background id="gate"/><div className="title-block"><h1 className="logo" tabIndex={-1}>마지막 여름</h1><p className="tag">교문에서 시작된, 나만의 야구 이야기</p></div></div><p className="lead">스윙 한 번, 공 하나. 오늘의 선택이 내일의 선수를 만듭니다.</p><section className="panel"><p>청람고 야구부의 신입생이 되어 3월부터 6월 여름 대회까지 뛰어보세요. 훈련과 스킬로 나만의 스타일을 만들고, 동료와 함께 대회에 도전합니다.</p><div className="actions">{booting&&<p role="status">저장과 카드 라이브러리를 읽고 있습니다…</p>}{game&&<button className="primary" onClick={()=>{setConfirmNew(false);setMode('play');}}>이어서 하기</button>}{creation&&<button disabled={booting} onClick={()=>{setConfirmNew(false);setMode('create');}}>만들던 선수 계속</button>}<button className={game?'':'primary'} disabled={booting} onClick={requestNew}>새 선수 만들기</button><button disabled={booting} onClick={()=>setMode('library')}>카드 라이브러리</button></div>{game&&<p className="muted gap-top">{game.name} · {roleName(game)} · {game.month}월 {game.week}주차 {game.phase==='complete'?'여름 시즌 완료':''}</p>}{loaded.kind==='invalid'&&!game&&<p className="notice warning" role="alert">{loaded.message}</p>}</section><p className="muted gap-top">3~6월 · 첫 여름 대회 버전 · 이 브라우저에 자동 저장됩니다.</p></>}
    {mode==='library'&&<CardLibrary packs={packs} onChange={setPacks} onClose={()=>setMode('menu')}/>}
    {mode==='menu'&&creationProblem&&<p className="notice warning" role="alert">{creationProblem}</p>}{mode==='menu'&&error&&<p className="notice warning" role="alert">{error}</p>}
    {mode==='create'&&creation&&<CharacterMaker initial={creation} onDraft={setCreation} onAdmit={start} onClose={()=>setMode('menu')} hasSave={!!game||loaded.kind==='invalid'||loaded.kind==='unavailable'}/> }
    {playing&&!completed&&<>{!match&&(!trainingEntry||!game.notice.startsWith(trainingEntry.title))&&<p className="recap">{game.notice}</p>}{game.phase==='weekday'&&<div className="mobile-goal"><SeasonPanel s={game}/><CompetitionPanel s={game}/></div>}{game.phase==='lineup'?<SupportLineup key={game.month} s={game} send={send}/>:game.phase==='roleEvent'?<RoleEventScreen s={game} send={send}/>:game.phase==='selection'?<SelectionScreen s={game} send={send}/>:game.phase==='weekday'||game.phase==='weekend'?<ActivityScreen key={`${game.month}-${game.week}-${game.phase}-${game.weekdayPart}`} s={game} send={send}/>:match?(rollAction===null?<MatchScreen key={game.match!.id} s={game} send={send}/>:null):<EventScreen s={game} send={send}/>}</>}
    {completed&&<><Background id="ground" banner caption="1학년 6월의 끝 · 함께 만든 첫 여름"/><h1 className="screen-title" tabIndex={-1}>나의 첫 여름 · {tournamentResult(game)}</h1><p className="lead">{game.name}의 첫 시즌, 훈련으로 만든 야구가 기록으로 남았습니다.</p><DevelopmentPanel s={game} detail/><TournamentBoard s={game}/><SeasonRecords s={game}/><SchoolRivalryPanel s={game}/><section className="panel"><p>3월의 첫 연습부터 6월의 마지막 주말까지 마쳤습니다. 함께한 파트너와 배운 스킬, 경기 기록을 돌아보세요.</p><p className="muted gap-top">현재 버전은 첫 여름 대회까지입니다. 7월 이후의 이야기는 앞으로 이어집니다.</p><div className="actions"><button className="primary" onClick={()=>{setStatusTab('기록');setStatusOpen(true);}}>시즌 기록 돌아보기</button><button onClick={requestNew}>다른 선수로 시작</button></div></section></>}
    {confirmNew&&<section className="confirm-box" role="alert" aria-label="새 입학 지원서 확인"><strong>만들던 선수 대신 새로 시작할까요?</strong><p>입학 전 배경·재능·동료 선택을 새로 시작합니다. 기존 입학 선수의 저장은 새 선수가 입학할 때까지 보존합니다.</p><div className="actions"><button onClick={beginNew}>새 입학 지원서 만들기</button><button onClick={()=>setConfirmNew(false)}>취소</button></div></section>}
    </main>
    {playing&&game.phase!=='lineup'&&<LogPanel s={game} since={logSince}/>}
    </div>
    {playing&&game.phase!=='lineup'&&<div className="mobile-log"><LogPanel s={game} since={logSince} mobile/></div>}
    {playing&&!completed&&!(match&&!game.match?.over)&&<BottomMenu s={game} openStatus={t=>{setStatusTab(t);setStatusOpen(true);}} openCalendar={()=>setCalendarOpen(true)} toMenu={()=>{setConfirmNew(false);setMode('menu');}}/>}
    {calendarOpen&&game&&<CalendarDialog s={game} onClose={()=>setCalendarOpen(false)}/>}
    {statusOpen&&game&&<StatusDialog s={game} send={send} initialTab={statusTab} onClose={()=>setStatusOpen(false)}/>}<footer>마지막 여름 · FIRST SUMMER</footer>
    </div>
    {playing&&<JournalAnnouncer s={game}/>}
    {playing&&rollAction!==null&&<ActivityRollSequence key={rollAction} s={game} action={rollAction} onDone={finishRoll}/>}
  </div>;
}


