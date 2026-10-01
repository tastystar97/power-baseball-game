import {overall} from '../game/abilities.ts';
import {grade,primaryKeys,primaryLabels} from '../game/types.ts';
import {PRIMARY_MAX} from '../content/development-rules.ts';
import type {GameState} from '../game/types.ts';
import type {previewActivity} from '../game/engine.ts';
import {Meter} from './common.tsx';
export function AbilityPanel({s}:{s:GameState}){
 const value=overall(s);
 return <section className="panel"><h3>1차 능력 · 몸과 머리</h3>{primaryKeys.map(k=><Meter key={k} label={primaryLabels[k]} value={s.attributes[k]} max={PRIMARY_MAX}/>)}<h3>종합 능력 {value.toFixed(1)} · {grade(value)}</h3><p className="reason">몸과 머리의 성장에 역할별 기술을 더해 종합 능력을 계산합니다. 스트레스가 높으면 집중력이 떨어지며 회복하면 돌아옵니다. 1학년 성장 상한은 각 1차 능력 1000입니다.</p></section>;
}
export function AbilityPreview({preview}:{preview:NonNullable<ReturnType<typeof previewActivity>>}){
 const growth=preview.abilityChanges.reduce((n,c)=>n+c.growth,0)/5,condition=preview.abilityChanges.reduce((n,c)=>n+c.condition,0)/5;
 return <div className="gap-top"><strong>종합 {growth>=0?'+':''}{growth.toFixed(1)} 예상</strong>{condition!==0&&<p className="reason">컨디션 변화 {condition>0?'+':''}{condition.toFixed(1)}</p>}<p className="reason">작은 기술 성장도 누적됩니다. 미리 보기는 성장 둔화와 1학년 상한을 반영합니다.</p></div>;
}
