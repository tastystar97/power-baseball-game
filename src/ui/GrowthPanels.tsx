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
  const training=activities({...s,phase:'weekday'});
  return <>
    <Background id="ground" banner caption={`${s.month}월 · 새로운 한 달의 준비`}/>
    <h1 className="screen-title" tabIndex={-1}>이번 달, 누구와 성장할까?</h1>
    <p className="lead">연습 파트너 3명을 고르세요. 함께 훈련하면 인연과 스킬 포인트가 쌓이고, 인연이 높을수록 성장 보너스가 커집니다.</p>
    <div className="lineup-summary"><strong>{draft.length} / 3명 선택</strong><span>{s.month}월 목표 · {monthGoal(s.month)}</span></div>
    <div className="support-grid" role="group" aria-label="이번 달 서포트 편성">{supports.map(p=>{
      const picked=draft.includes(p.id),hint=skills.find(k=>k.id===supportHint(s,p.id))!;
      return <button key={p.id} className="card support-card" aria-pressed={picked} disabled={!picked&&draft.length===3} onClick={()=>setDraft(picked?draft.filter(id=>id!==p.id):[...draft,p.id])}>
        <span className="support-heading"><span className="avatar lg" style={{background:p.color,color:'white'}}>{p.name.slice(1)}</span><span><strong>{p.name}</strong><span className="desc block">{p.role}</span></span><span className="selection-mark" aria-hidden="true">{picked?'✓':'+'}</span></span>
        <span className="desc">{p.description}</span>
        <span className="support-specialty">주요 활동 · {p.training[s.role].map(id=>training.find(a=>a.id===id)?.title).join(' / ')}</span>
        <span className="bond-line">인연 {bond(s,p.id)} / 100 <span>{bond(s,p.id)>=40?'합동 훈련 가능':'40부터 합동 훈련'}</span></span>
        <span className="bond-bonus-label">훈련 동행 시 인연 보너스 +{bondTrainingBonus(bond(s,p.id))}</span>
        <span className="bar bond-bar"><span style={{width:`${bond(s,p.id)}%`}}/></span>
        <span className="desc">조언 · {hint.name}{s.supportCompleted.includes(p.id)?' (만남 완료)':''}</span>
      </button>;
    })}</div>
    <CompetitionComparison s={s}/><div className="panel gap-top"><p>첫 평일 활동을 시작하면 이번 달 편성이 고정됩니다. 다음 달에는 다시 고를 수 있고, 쌓은 인연과 배운 스킬은 유지됩니다.</p><p className="muted gap-top">편성에는 활동이나 포인트가 들지 않습니다. 선택된 인물을 한 번 더 누르면 자리가 비워집니다.</p><div className="actions"><button className="primary" disabled={draft.length!==3} onClick={()=>send({type:'lineup',supports:draft})}>{s.month}월 편성 완료</button></div></div>
  </>;
}

export function SupportPanel({s}:{s:GameState}) {
  const training=activities({...s,phase:'weekday'});
  return <section className="panel"><h3>{s.month}월 연습 파트너</h3><ul className="support-list">{s.supports.map(id=>{
    const p=supportById(id),value=bond(s,id);
    return <li key={id}><div className="support-heading"><span className="avatar" style={{background:p.color,color:'white'}}>{p.name.slice(1)}</span><strong>{p.name}</strong><span className="sub">{value>=40?'합동 가능':`인연 ${value}`}</span></div><Meter label="인연" value={value}/><p className="reason">{s.phase==='weekday'?`이번 주 · ${training.find(a=>a.id===s.placements[id])?.title||'휴식 중'}`:p.role}</p></li>;
  })}</ul><p className="reason gap-top">동행 활동마다 인연 +15. 주력 능력 보너스는 +1부터, 인연 20마다 +1씩 늘어 최대 +5입니다. 인연 40부터 합동 훈련의 추가 성장·스킬 포인트도 얻습니다.</p></section>;
}

export function SkillsPanel({s,send}:{s:GameState;send:Send}) {
  const canLearn=['lineup','weekday','weekend','selection'].includes(s.phase);
  return <><DevelopmentPanel s={s} detail/><div className="skill-balance" role="status"><strong>스킬 포인트 {s.skillPoints} Pt</strong><span>{s.skills.length}개 습득</span></div><p className="muted">활동과 경기로 포인트를 모으고, 인물의 조언으로 습득 비용을 줄이세요. 습득에는 시간이 흐르지 않습니다.</p>{!canLearn&&<p className="reason gap-top">스킬은 활동 선택 화면이나 경기 전 출전 명단 화면에서 배울 수 있습니다.</p>}<div className="skill-grid gap-top">{availableSkills(s).map(k=>{
    const learned=s.skills.includes(k.id),cost=skillCost(s,k.id),hint=s.hints.includes(k.id),requirements=skillRequirements(s,k.id),locked=requirements.some(r=>!r.met);
    return <section className="panel skill-card" key={k.id}>{k.style&&<span className="chip joint">{k.style} 특화</span>}<h3>{k.name}</h3><p>{k.description}</p>{requirements.length>0&&<ul className="skill-requirements" aria-label="습득 조건">{requirements.map(r=><li key={r.label} className={r.met?'met':''}>{r.met?'✓':'○'} {r.label}</li>)}</ul>}{hint&&<span className="chip new">조언 힌트 · 비용 4 Pt 할인</span>}<button disabled={learned||locked||!canLearn||s.skillPoints<cost} onClick={()=>send({type:'learn',id:k.id})} aria-label={`${k.name} ${learned?'습득 완료':locked?'훈련 조건 미달':`${cost} Pt로 습득`}`}>{learned?'습득 완료':locked?`${cost} Pt · 훈련 조건 미달`:`${cost} Pt · 습득`}</button></section>;
  })}</div></>;
}

export function CompetitionPanel({s,detail=false}:{s:GameState;detail?:boolean}) {return <CompetitionComparison s={s} detail={detail}/>;}

export function SelectionScreen({s,send}:{s:GameState;send:Send}) {
  return <><Background id="ground" banner caption={`${s.month}월 ${s.week}주차 · 경기를 앞둔 아침`}/><h1 className="screen-title" tabIndex={-1}>출전 명단에 적힌 내 이름</h1><p className="lead">감독이 지금까지의 훈련과 최근 경기 성적을 보고 출전 역할을 정했습니다.</p><SeasonPanel s={s}/><RivalryPreview s={s}/><CompetitionPanel s={s} detail/><p className="muted gap-top">경기에 들어가기 전, 상태창에서 모아 둔 포인트로 스킬을 배울 수 있습니다.</p><div className="actions"><button className="primary" onClick={()=>send({type:'continue'})}>{matchPlan(s)?.title||'경기'} 시작</button></div></>;
}
