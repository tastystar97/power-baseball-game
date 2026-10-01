import {derivedStats,effectiveMental,secondaryKeys} from '../game/abilities.ts';
import {primaryMax,primaryGrade,overallOf,strengthTags} from './abilityDisplay.ts';
const convertedMental=(s:GameState)=>effectiveMental(s.attributes.mental,0);
import {grade,labels,primaryKeys,primaryLabels} from '../game/types.ts';
import type {GameState} from '../game/types.ts';
import type {previewActivity} from '../game/engine.ts';

export function AbilityPanel({s}:{s:GameState}){
 const stats=derivedStats(s),mental=effectiveMental(s.attributes.mental,s.stress),ovr=overallOf(s);
 const order=[...secondaryKeys(s.role)].sort((a,b)=>stats[b]-stats[a]);
 return <><section className="panel"><h3>1차 능력 · 몸과 머리</h3>
 {primaryKeys.map(k=><div className="attr-row" key={k}><span>{primaryLabels[k]}</span><span className={`attr-bar ${k}`}><i style={{width:`${Math.min(100,s.attributes[k]/primaryMax*100)}%`}}/></span><b>{s.attributes[k]}</b><span className={`attr-grade g-${primaryGrade(s.attributes[k])}`}>{primaryGrade(s.attributes[k])}</span></div>)}
 {mental<convertedMental(s)&&<p className="reason">스트레스가 높아 멘탈이 제 힘을 내지 못하고 있습니다. 쉬면 회복됩니다.</p>}
 </section><section className="panel"><h3>야구 능력 · 종합 {Math.round(ovr)} ({grade(ovr)})</h3>
 <div className="tag-row">{strengthTags(s).map(t=><span key={t.label} className={`tag ${t.kind}`}>{t.label}</span>)}</div>
 <p className="reason gap-top">강한 순서 · {order.map(k=>labels[k]).join(' > ')}</p>
 <p className="reason">세부 야구 능력은 숫자로 보여 주지 않습니다. 1차 능력과 기술 훈련이 함께 쌓여 종합 능력과 경기의 유불리가 달라집니다.</p>
 {s.role==='pitcher'&&<p className="reason gap-top">지구력은 몸의 기반, 스태미나는 투구 기술을 포함한 야구 능력입니다. 현재 체력·경기 중 투구 부담과 별개입니다.</p>}</section></>;
}
export function AbilityPreview({preview}:{preview:NonNullable<ReturnType<typeof previewActivity>>}){
 const rising=preview.abilityChanges.filter(c=>c.growth>0);
 const delta=preview.abilityChanges.reduce((n,c)=>n+c.growth,0)/Math.max(1,preview.abilityChanges.length);
 return <div className="gap-top"><strong>{preview.training?'성공 시':'활동 후'} 야구 능력 예상</strong>
 {rising.length?<p className="reason">{rising.map(c=>`${labels[c.stat]} ▲`).join(' · ')} · 종합 +{delta.toFixed(1)} 예상</p>:<p className="reason">종합 능력은 아직 그대로여도 몸과 기술의 성장은 쌓입니다.</p>}</div>;
}
