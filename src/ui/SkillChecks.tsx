import type {Match,GameState} from '../game/types.ts';
import {getSkills} from '../content/skills.ts';
export function SkillChecks({match:m,s}:{match:Match;s:GameState}){
 const name=(id:string)=>getSkills(s).find(k=>k.id===id)?.name||id;
 if(m.skillChecks===null)return <p className="reason gap-top">이전 버전 경기 · 당시 스킬 효과와 기록을 유지합니다.</p>;
 if(!m.skillChecks.length)return null;
 const activated=m.skillChecks.filter(e=>e.active.length);if(!activated.length)return null;
 return <details className="gap-top"><summary>스킬 발동 기록 · {activated.reduce((n,e)=>n+e.active.length,0)}회</summary><ul className="match-log">{activated.map(e=><li key={`${e.half}-${e.order}`}>{e.inning}회 {e.half?'말':'초'} · {e.source==='manual'?'선택 승부':'요약 승부'}<br/>{e.active.map(id=>`${name(id)} 발동`).join(' · ')}</li>)}</ul></details>;
}
