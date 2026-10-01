import type {SkillDefinition} from './schema.ts';
import type {Role} from '../game/types.ts';
const tactics:Record<string,string>={contact:'정확하게 맞히기',power:'장타 노리기',patient:'공 골라내기',bunt:'희생번트',fastball:'직구로 승부',breaking:'변화구로 유도',control:'맞혀 잡기',chase:'유인구 위주'};
export const resultLabels:Record<string,string>={strikeout:'삼진',out:'범타',walk:'볼넷',single:'안타',double:'2루타',homer:'홈런',sacrifice:'희생번트 성공'};
export function describeSkill(k:SkillDefinition,role?:Role){
 const conditions=k.conditions.filter(c=>!role||!c.role||c.role===role).map(c=>{
 const prefix=!role&&c.role?(c.role==='batter'?'타자 ':'투수 '):'';
 const text=c.kind==='tactic'?c.values.map(v=>tactics[v]).join('/'):
 c.kind==='inning'?`${c.min}~${c.max}회`:c.kind==='outs'?`${c.min}~${c.max}아웃`:
 c.kind==='energy'?`체력 ${c.min}~${c.max}`:c.kind==='stress'?`스트레스 ${c.min}~${c.max}`:
 c.kind==='runners'?(c.present?'주자 있음':'주자 없음'):c.kind==='score'?({behind:'팀이 지는 중',tied:'동점',ahead:'팀이 이기는 중'}[c.value]):`상대 유형 ${c.values.map(v=>({wild:'제구 불안',fast:'직구 위주',tired:'피로 누적',power:'장타형',patient:'선구형'}[v])).join('/')}`;
 return prefix+text;
 });
 const effects=k.effects.filter(e=>!role||!e.role||e.role===role).map(e=>(!role&&e.role?(e.role==='batter'?'타자 ':'투수 '):'')+(e.kind==='probability'?`${resultLabels[e.from]} → ${resultLabels[e.to]} 최대 ${+(e.amount*100).toFixed(2)}%p`:e.kind==='burden'?`투구 부담 -${e.amount} (최소 1)`:`체력 45 미만 불이익 ${Math.round(e.amount*100)}% 완화`));
 return `${conditions.length?conditions.join(' · '):'모든 승부'} → 발동 시 ${effects.join(' · ')}`;
}
