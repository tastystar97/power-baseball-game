import {baseStats,derivedStats,effectiveMental,secondaryKeys} from '../game/abilities.ts';
import {grade,labels,primaryKeys,primaryLabels} from '../game/types.ts';
import type {GameState} from '../game/types.ts';
import type {previewActivity} from '../game/engine.ts';
import {Meter} from './common.tsx';

export function AbilityPanel({s}:{s:GameState}){
 const stats=derivedStats(s),base=baseStats(s.attributes,s.stress),mental=effectiveMental(s.attributes.mental,s.stress);
 return <><section className="panel"><h3>1차 능력 · 몸과 머리</h3>
 {primaryKeys.map(k=><Meter key={k} label={primaryLabels[k]} value={s.attributes[k]}/>)}
 <p className="reason">멘탈 {s.attributes.mental} · 스트레스 보정 {(mental-s.attributes.mental).toFixed(1)} → 유효 멘탈 {mental.toFixed(1)}. 스트레스가 내려가면 회복됩니다.</p>
 </section><section className="panel"><h3>2차 야구 능력</h3><div className="ability-list">{secondaryKeys(s.role).map(k=><div className="ability-row" key={k}><span>{labels[k]}</span><span className="grade">{grade(stats[k])}</span><span className="bar"><span style={{width:`${stats[k]}%`}}/></span><span className="num">{stats[k]}</span></div>)}</div>
 <details className="gap-top"><summary>기반과 숙련은 어떻게 연결될까?</summary><p className="reason">야구 능력 = 기반 60% + 숙련 40% (반올림). 기반은 여러 1차 능력의 가중 평균이며, 현재 스트레스의 멘탈 보정을 포함합니다.</p>
 <table className="comparison"><thead><tr><th>능력</th><th>기반</th><th>숙련</th><th>결과</th></tr></thead><tbody>{secondaryKeys(s.role).map(k=><tr key={k}><td>{labels[k]}</td><td>{base[k].toFixed(1)}</td><td>{s.proficiency[k]}</td><td>{stats[k]}</td></tr>)}</tbody></table>
 <p className="reason">숙련이 평소 기반보다 10 넘게 높으면 숙련 성장 ×0.5, 20 넘으면 ×0.25. 몸과 머리를 기르면 기술 훈련의 성장 여지도 커집니다.</p></details>
 {s.role==='pitcher'&&<p className="reason gap-top">지구력은 몸의 기반, 스태미나는 투구 기술을 포함한 야구 능력입니다. 현재 체력·경기 중 투구 부담과 별개입니다. 구속 점수는 실제 km/h가 아닙니다.</p>}</section></>;
}
export function AbilityPreview({preview}:{preview:NonNullable<ReturnType<typeof previewActivity>>}){
 const changes=preview.abilityChanges.filter(c=>c.growth||c.condition);
 return <div className="gap-top"><strong>{preview.training?'성공 시':'활동 후'} 야구 능력 예상</strong>
 {changes.length?<ul className="reason">{changes.map(c=><li key={c.stat}>{labels[c.stat]} {c.before} → {c.after} · 성장 {c.growth>=0?'+':''}{c.growth}{c.condition!==0?` · 컨디션 ${c.condition>0?'회복 +':'변화 '}${c.condition}`:''}</li>)}</ul>:<p className="reason">반올림된 야구 능력은 아직 같아도 1차 능력과 숙련의 성장은 누적됩니다.</p>}
 <p className="reason">표시된 보상에는 능력별 성장 단계·숙련 격차·100 상한을 반영했습니다. 컨디션 변화는 영구 성장과 구분합니다.</p></div>;
}
