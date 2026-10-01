import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {GameState,Role} from '../../game/types.ts';
import {primaryKeys,primaryLabels} from '../../game/types.ts';
import {creationTransition,createPlayer,newCreation,remainingRerolls,backgroundBudget,canAdvance} from '../../game/creation.ts';
import type {CreationDraft,CreationAction} from '../../game/creation.ts';
import {backgroundEffects} from '../../game/character.ts';
import type {BackgroundChoice} from '../../game/character.ts';
import {creationRules,hiddenTalents,talentRules} from '../../content/backgrounds.ts';
import {database} from '../../persistence/database.ts';
import {catalogForCards} from '../../cards/catalog.ts';
import {DeckBuilder,CardAvatar} from '../DeckBuilder.tsx';
import {Portrait} from '../common.tsx';
import {AbilityPanel} from '../AbilityPanel.tsx';
import {RollDice,useReducedMotion} from '../RollDice.tsx';
import {ChoicePopup} from '../ChoicePopup.tsx';
import {CharacterProfile} from './CharacterProfile.tsx';
import {BackgroundStep} from './BackgroundStep.tsx';
import './creation.css';

const steps=['이름·역할','배경','재능 판정','운명 주사위','스카우트','덱 구성','스카우트 리포트'];
export function CharacterMaker({initial,onDraft,onAdmit,onClose,hasSave}:{initial:CreationDraft;onDraft:(d:CreationDraft)=>void;onAdmit:(s:GameState)=>Promise<void>;onClose:()=>void;hasSave:boolean}){
 const [draft,setDraft]=useState(initial),current=useRef(initial),locked=useRef(false);
 const [busy,setBusy]=useState(false),[warning,setWarning]=useState(''),[error,setError]=useState('');
 const [name,setName]=useState(initial.name),[role,setRole]=useState<Role>(initial.role);
 const [pendingBackground,setPendingBackground]=useState<BackgroundChoice|null>(null),[confirm,setConfirm]=useState<'restart'|'admit'|null>(null);
 const [animation,setAnimation]=useState<'talent'|'fate'|null>(null),reduced=useReducedMotion();
 const heading=useRef<HTMLHeadingElement>(null),finishAnimation=useCallback(()=>setAnimation(null),[]);
 useEffect(()=>{heading.current?.focus();},[draft.step]);
 useEffect(()=>{if(!animation)return;const id=window.setTimeout(finishAnimation,reduced?0:900);return()=>clearTimeout(id);},[animation,reduced,finishAnimation]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};if(busy||warning)window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy,warning]);
 const save=async(next:CreationDraft)=>{
  try{await database().writeCreation(next);setWarning('');}catch{setWarning('지금 진행을 저장하지 못했습니다. 이 창에서는 계속할 수 있지만 새로고침하면 결과를 잃을 수 있습니다.');}
  current.current=next;setDraft(next);onDraft(next);
 };
 async function send(a:Omit<CreationAction,'revision'>,advanceIdentity=false){
  if(locked.current||animation)return;locked.current=true;setBusy(true);setError('');
  try{
   let next=creationTransition(current.current,{...a,revision:draft.revision});
   if(next===current.current)return;
   if(advanceIdentity)next=creationTransition(next,{type:'next',revision:next.revision});
   await save(next);if(!reduced&&['talent','reroll','fate'].includes(a.type))setAnimation(a.type==='fate'?'fate':'talent');
  }catch(e){setError(e instanceof Error?e.message:'선수를 만들지 못했습니다.');}
  finally{locked.current=false;setBusy(false);}
 }
 async function restart(){
  if(locked.current)return;locked.current=true;setBusy(true);setConfirm(null);
  try{const next=newCreation(draft.content,crypto.getRandomValues(new Uint32Array(1))[0]);await save(next);setName('');setRole('batter');setError('');}
  finally{locked.current=false;setBusy(false);}
 }
 async function admit(){
  if(locked.current)return;locked.current=true;setBusy(true);setConfirm(null);
  try{await onAdmit(createPlayer(current.current));}catch(e){setError(e instanceof Error?e.message:'입학하지 못했습니다.');}
  finally{locked.current=false;setBusy(false);}
 }
 const d=draft,effects=backgroundEffects(d.background,d.role),budget=backgroundBudget(d),hidden=hiddenTalents.find(t=>t.id===d.fate?.hidden);
 const pool=useMemo(()=>d.poolIds?catalogForCards(d.content,d.poolIds):null,[d.content,d.poolIds]);
 const report=useMemo(()=>d.step===6?createPlayer(d):null,[d]);
 const disabled=busy||!!animation;
 return <section className="character-maker">
  <div inert={!!pendingBackground||!!confirm}>
  <div className="creation-kicker">청람고 입학 지원서 <span>예상 3~5분</span></div>
  <ol className="creation-steps" aria-label="캐릭터 메이킹 진행"><li className="creation-step-count" aria-hidden="true">{d.step+1} / 7</li>{steps.map((title,i)=><li key={title}><button type="button" aria-current={i===d.step?'step':undefined} disabled={disabled||i>=d.step} onClick={()=>void send({type:'back',step:i})}><span>{i+1}</span>{title}</button></li>)}</ol>
  <h1 className="screen-title" ref={heading} tabIndex={-1}>{steps[d.step]}</h1>
  <p className="creation-intro">{['새 유니폼을 입을 선수는 누구인가요?','무엇을 가지고, 무엇을 넘어설지 골라 보세요.','다섯 능력에 깃든 가능성을 확인합니다.','평범한 시작에 특별한 가능성이 숨어 있을까요?','이번 첫 여름에 만날 동료들입니다.','함께 훈련할 여섯 명을 골라 보세요.','당신만의 첫 여름이 시작됩니다.'][d.step]}</p>
  {warning&&<p className="notice warning" role="alert">{warning}</p>}{error&&<p className="notice warning" role="alert">{error}</p>}
  <p className="creation-save" role="status">{busy?'입학 지원서 저장 중…':warning?'저장되지 않음':'입학 지원서 자동 저장 · 기존 선수는 입학 전까지 보존'}</p>
  {d.step===0&&<form onSubmit={e=>{e.preventDefault();void send({type:'identity',name,role},true);}}><label className="field-label" htmlFor="player-name">선수 이름</label><input id="player-name" value={name} onChange={e=>setName(e.target.value)} maxLength={16} autoComplete="off" placeholder="이름을 입력하세요" aria-describedby="creation-name-hint"/><p className="reason" id="creation-name-hint">이름 1~8자 · 다음 단계로 가면 역할이 확정됩니다.</p><div className="roles" role="group" aria-label="선수 역할">{(['batter','pitcher'] as const).map(r=><button key={r} type="button" className="card role-card" aria-pressed={role===r} disabled={disabled||d.roleLocked&&d.role!==r} onClick={()=>setRole(r)}><Portrait id={r} size="sm"/><span><strong>{r==='batter'?'타자':'투수'}</strong><span className="desc block">{r==='batter'?'한 번의 스윙으로 만드는 승부':'마운드에서 이어 가는 나만의 승부'}</span></span></button>)}</div><div className="actions"><button className="primary" type="submit" disabled={disabled||!name.trim()||[...name.trim()].length>8}>배경 선택으로</button></div></form>}
  {d.step===1&&<BackgroundStep draft={d} busy={disabled} onChange={c=>{if(d.talentIndex!==null)setPendingBackground(c);else void send({type:'background',background:c});}}/>}
  {d.step===2&&<><div className="creation-result panel">
   {!d.talent?<p>다섯 능력의 재능 주사위를 확인하세요.{d.talentIndex!==null&&' 배경 변경 전과 같은 주사위에 새 배경 효과를 적용합니다.'}</p>:<><RollDice face={d.talent.grade==='S'?'★':d.talent.grade==='D'?'✕':'●'} label={`재능 등급 ${d.talent.grade}`} tone={d.talent.grade==='D'?'negative':'positive'} context="재능 판정" rolling={animation==='talent'} skip={finishAnimation} inline/>{!animation&&<><p className="talent-description">{talentRules[d.talent.grade].description}</p><p className="reason">주사위 합 {d.talent.sum} · {d.talent.dice.join(' + ')}</p><div className="rolled-abilities">{primaryKeys.map((k,i)=><div key={k}><span>{primaryLabels[k]}</span><strong>{d.talent!.attributes[k]+(effects.attributes[k]??0)}</strong><small>⚄ {d.talent!.dice[i*2]} + {d.talent!.dice[i*2+1]}{effects.attributes[k]?` · 배경 ${effects.attributes[k]!>0?'+':''}${effects.attributes[k]}`:''}</small></div>)}</div><p>1차 성장 ×{talentRules[d.talent.grade].growth}{talentRules[d.talent.grade].cap?' · 1학년 상한 1050':''}</p>{d.talent.grade==='D'&&<p className="notice">배경 포인트 +2. 배경 단계로 돌아가 사용할 수 있습니다. 다른 등급으로 다시 굴리면 이 보너스는 사라집니다.</p>}</>}</>}
  </div><div className="actions"><button type="button" className="primary" disabled={disabled||!!d.talent} onClick={()=>void send({type:'talent'})}>{d.talentIndex===null?'재능 주사위 굴리기':'재능 결과 확인'}</button>{d.talent&&<button type="button" disabled={disabled||remainingRerolls(d)===0} onClick={()=>void send({type:'reroll'})}>다시 굴리기 · {remainingRerolls(d)}회 남음</button>}</div><p className="reason">다섯 능력을 함께 다시 굴립니다. 이전 결과로 되돌릴 수 없습니다.</p>{!budget.valid&&<p className="notice warning" role="alert">{budget.errors.join(' ')} 배경 단계에서 조정해 주세요.</p>}</>}
  {d.step===3&&<div className="creation-result panel">{d.fate?<><RollDice face={d.fate.hidden?'★':'●'} label={`운명 주사위 ${d.fate.die}`} tone="positive" context="운명" rolling={animation==='fate'} skip={finishAnimation} inline/>{!animation&&<><h2>{hidden?.name??'나의 힘으로 만들어 갈 여름'}</h2><p>{hidden?.description??'숨은 재능은 없지만, 매일의 선택은 그대로 힘이 됩니다.'}</p></>}</>:<><p>20면 주사위가 20에 멈추면 역할에 맞는 숨은 재능을 얻습니다. 한 번만 굴릴 수 있습니다.</p><button className="primary gap-top" disabled={disabled} onClick={()=>void send({type:'fate'})}>운명 주사위 굴리기</button></>}</div>}
  {d.step===4&&<>{!d.poolIds?<div className="panel"><p>라이브러리에서 최대 {creationRules.scoutCount+effects.scoutExtra}명을 중복 없이 만납니다. 외부 카드팩의 동료도 포함됩니다.</p><button className="primary gap-top" disabled={disabled} onClick={()=>void send({type:'scout'})}>스카우트 시작</button></div>:<><div className="scout-heading"><strong>공개 {d.revealed.length} / {d.poolIds.length}</strong><button disabled={disabled||d.revealed.length===d.poolIds.length} onClick={()=>void send({type:'revealAll'})}>모두 뒤집기</button></div><div className="scout-grid">{d.poolIds.map((id,i)=>{const card=d.content.cards.find(c=>c.id===id)!,revealed=d.revealed.includes(id);return <button key={id} className={`scout-card ${revealed?'revealed':''}`} disabled={disabled||revealed} aria-label={revealed?`${card.name} 공개됨`:`스카우트 카드 ${i+1} 뒤집기`} onClick={()=>void send({type:'reveal',id})}><span className="scout-card-meta">{card.grade}학년 · {card.specialty?primaryLabels[card.specialty]:'회복'} 전문</span>{revealed?<><CardAvatar card={card} content={d.content}/><strong>{card.name}</strong><small>{card.title}</small></>:<><span className="scout-seal" aria-hidden="true">청람</span><strong>동료 만나기</strong></>}</button>;})}</div>{d.poolIds.length<6&&<p className="notice warning">덱에 필요한 카드가 부족합니다. 카드 라이브러리에 6장 이상 등록한 뒤 새 입학 지원서를 만들어 주세요.</p>}</>}</>}
  {d.step===5&&pool&&<DeckBuilder content={pool} role={d.role} selected={d.deck} onChange={ids=>{if(!disabled)void send({type:'deck',ids});}}/>}
  {report&&<div className="scout-report"><div className="report-heading"><Portrait id={report.role} size="sm"/><div><p>청람고 1학년 · {report.role==='batter'?'타자':'투수'}</p><h2>{report.name}</h2></div><span className="report-stamp">입학 준비</span></div><CharacterProfile s={report}/><AbilityPanel s={report}/><section className="panel"><h3>첫 여름의 파트너</h3><div className="report-deck">{report.supports.map(id=>{const card=report.content.cards.find(c=>c.id===id)!;return <div key={id}><CardAvatar card={card} content={report.content}/><strong>{card.name}</strong><small>{card.grade}학년</small></div>;})}</div></section><div className="actions"><button className="primary" disabled={disabled} onClick={()=>{if(hasSave)setConfirm('admit');else void admit();}}>입학하기</button><button disabled={disabled} onClick={()=>setConfirm('restart')}>처음부터 다시</button></div></div>}
  <nav className="creation-actions" aria-label="입학 단계 이동"><button disabled={disabled} onClick={()=>{if(d.step>0)void send({type:'back',step:d.step-1});else onClose();}}>{d.step>0?'이전 단계':'처음 화면'}</button>{d.step>0&&d.step<6&&<button className="primary" disabled={disabled||!canAdvance(d)} onClick={()=>void send({type:'next'})}>다음 · {steps[d.step+1]}</button>}{d.step>0&&<button disabled={disabled} onClick={onClose}>나중에 계속하기</button>}</nav>
  </div>
  {pendingBackground&&<ChoicePopup title="배경을 바꿀까요?" onDismiss={()=>setPendingBackground(null)}><p>재능·운명·스카우트 결과와 덱 구성을 비웁니다. 시드와 사용한 다시 굴리기 횟수는 유지하며, 재확인한 주사위는 같습니다.</p><div className="actions"><button className="primary" onClick={()=>{const c=pendingBackground;setPendingBackground(null);void send({type:'background',background:c,confirmed:true});}}>배경 변경</button><button onClick={()=>setPendingBackground(null)}>취소</button></div></ChoicePopup>}
  {confirm&&<ChoicePopup title={confirm==='admit'?'기존 저장을 덮어쓸까요?':'처음부터 다시 만들까요?'} onDismiss={()=>setConfirm(null)}><p>{confirm==='admit'?'새 선수가 입학하면 이전 선수의 진행이 교체됩니다.':'지금 입학 지원서의 배경·재능·동료를 지우고 새롭게 시작합니다. 기존 입학 선수는 보존됩니다.'}</p><div className="actions"><button className="primary" onClick={()=>void (confirm==='admit'?admit():restart())}>{confirm==='admit'?'덮어쓰고 입학':'새로 만들기'}</button><button onClick={()=>setConfirm(null)}>취소</button></div></ChoicePopup>}
 </section>;
}
