import {describeSkill} from '../cards/description.ts';
import {DeckBuilder,CardAvatar} from './DeckBuilder.tsx';
import {primaryLabels} from '../game/types.ts';
import {encounterContent} from '../content/encounters.ts';
import {skillActivationChance} from '../game/skill-activation.ts';
import {CompetitionComparison,RivalryPreview} from './RivalryPanel.tsx';
import {useState} from 'react';
import {activities} from '../content/activities.ts';
import {bond,defaultSupports,supportById,supports} from '../content/supports.ts';
import {availableSkills,skillCost,skills,supportHint,skillRequirements} from '../content/skills.ts';
import {bondTrainingBonus} from '../game/support.ts';
import type {Action,GameState,SupportId} from '../game/types.ts';
import {monthGoal,matchPlan} from '../game/season.ts';
import {DevelopmentPanel,SeasonPanel} from './SeasonPanel.tsx';
import {Background,Meter} from './common.tsx';

export type Send=(action:Omit<Action,'revision'>)=>void;

export function SupportLineup({s,send}:{s:GameState;send:Send}) {
  const [draft,setDraft]=useState<SupportId[]>(s.supports.length?s.supports:defaultSupports(s.role));
  return <><h1 className="screen-title">육성 덱 선택</h1><DeckBuilder content={s.content} role={s.role} selected={draft} onChange={setDraft}/><div className="actions"><button className="primary" disabled={draft.length!==6} onClick={()=>send({type:'lineup',supports:draft})}>이 덱으로 시작</button></div></>;
}

export function SupportPanel({s}:{s:GameState}) {
  const training=activities({...s,phase:'weekday'});
  return <section className="panel"><h3>나의 육성 덱</h3><ul className="support-list">{s.supports.map(id=>{
    const p=supportById(id,s),value=bond(s,id);
    return <li key={id}><div className="support-heading"><CardAvatar card={p} content={s.content}/><strong>{p.name}</strong><span className="sub">{value>=40?'합동 가능':`인연 ${value}`}</span></div><Meter label="인연" value={value}/><p className="reason">{s.phase==='weekday'?`${s.weekdayPart===1?'전반':'후반'} · ${training.find(a=>a.id===s.placements[id])?.title||'휴식 중'}`:p.role}</p></li>;
  })}</ul><p className="reason gap-top">동행 활동마다 인연 +8. 전반·후반 활동 뒤에는 덱 카드의 인카운터가 각각 추첨됩니다. 인물별 전문 1차 능력에 동행 +1, 인연 40부터 합동 +1을 더합니다. 인연 보너스는 0~39에서 +1, 40~79에서 +2, 80부터 +3이며 성장 단계에 따라 줄어듭니다. 휴식과 실패에는 능력 보너스가 없습니다. 인연 40부터 합동 훈련의 추가 성장·스킬 포인트도 얻습니다.</p></section>;
}

export function SkillsPanel({s,send}:{s:GameState;send:Send}) {
  const canLearn=['lineup','weekday','weekend','selection'].includes(s.phase);
  return <><DevelopmentPanel s={s} detail/><div className="skill-balance" role="status"><strong>스킬 포인트 {s.skillPoints} Pt</strong><span>{s.skills.length}개 습득</span></div><p className="notice">지능 {s.attributes.intelligence} · 조건을 만족한 각 스킬의 발동 확률 {Math.round(skillActivationChance(s.attributes.intelligence)*1000)/10}%. 선택 승부와 요약 승부 모두 타석마다 독립 판정합니다.</p><p className="muted">활동과 경기로 포인트를 모으고, 인물의 조언으로 습득 비용을 줄이세요. 상위 스킬은 같은 계열의 일반 스킬을 대체하며, 습득에는 시간이 흐르지 않습니다.</p>{!canLearn&&<p className="reason gap-top">스킬은 활동 선택 화면이나 경기 전 출전 명단 화면에서 배울 수 있습니다.</p>}<div className="skill-grid gap-top">{availableSkills(s).map(k=>{
    const learned=s.skills.includes(k.id),cost=skillCost(s,k.id),hint=s.hints.includes(k.id),requirements=skillRequirements(s,k.id),locked=requirements.some(r=>!r.met);
    return <section className="panel skill-card" key={k.id}>{k.tier==='advanced'&&<span className="chip new">서포트 고유 상위</span>}{k.style&&<span className="chip joint">{k.style} 특화</span>}<h3>{k.name}</h3><p>{k.description}</p><p className="reason">{describeSkill(k,s.role)}</p>{requirements.length>0&&<ul className="skill-requirements" aria-label="습득 조건">{requirements.map(r=><li key={r.label} className={r.met?'met':''}>{r.met?'✓':'○'} {r.label}</li>)}</ul>}{hint&&<span className="chip new">조언 힌트 · 비용 4 Pt 할인</span>}<button disabled={learned||locked||!canLearn||s.skillPoints<cost} onClick={()=>send({type:'learn',id:k.id})} aria-label={`${k.name} ${learned?'습득 완료':locked?'습득 조건 미달':`${cost} Pt로 습득`}`}>{learned?'습득 완료':locked?`${cost} Pt · 습득 조건 미달`:`${cost} Pt · 습득`}</button></section>;
  })}</div></>;
}

export function CompetitionPanel({s,detail=false}:{s:GameState;detail?:boolean}) {return <CompetitionComparison s={s} detail={detail}/>;}

export function SelectionScreen({s,send}:{s:GameState;send:Send}) {
  return <><Background id="ground" banner caption={`${s.month}월 ${s.week}주차 · 경기를 앞둔 아침`}/><h1 className="screen-title" tabIndex={-1}>출전 명단에 적힌 내 이름</h1><p className="lead">감독이 지금까지의 훈련과 최근 경기 성적을 보고 출전 역할을 정했습니다.</p><SeasonPanel s={s}/><RivalryPreview s={s}/><CompetitionPanel s={s} detail/><p className="muted gap-top">경기에 들어가기 전, 상태창에서 모아 둔 포인트로 스킬을 배울 수 있습니다.</p><div className="actions"><button className="primary" onClick={()=>send({type:'continue'})}>{matchPlan(s)?.title||'경기'} 시작</button></div></>;
}
