import type {Match,GameState} from '../game/types.ts';
import {getSkills} from '../content/skills.ts';
import {skillActivationChance} from '../game/skill-activation.ts';
export function SkillChecks({match:m,s}:{match:Match;s:GameState}){
 const name=(id:string)=>getSkills(s).find(k=>k.id===id)?.name||id;
 if(m.skillChecks===null)return <p className="reason gap-top">이전 버전 경기 · 당시 스킬 효과와 기록을 유지합니다.</p>;
 if(!m.skillChecks.length)return null;
 const active=m.skillChecks.reduce((n,e)=>n+e.active.length,0),eligible=m.skillChecks.reduce((n,e)=>n+e.eligible.length,0);
 return <details className="gap-top"><summary>스킬 발동 기록 · {active} / {eligible}회</summary><ul className="match-log">{m.skillChecks.map(e=><li key={`${e.half}-${e.order}`}>{e.inning}회 {e.half?'말':'초'} · {e.source==='manual'?'선택 승부':'요약 승부'} · 지능 {e.intelligence} ({Math.round(skillActivationChance(e.intelligence)*1000)/10}%)<br/>{e.eligible.length?e.eligible.map(id=>`${name(id)} ${e.active.includes(id)?'발동':'미발동'}`).join(' · '):'발동 조건을 만족한 스킬 없음'}</li>)}</ul></details>;
}
