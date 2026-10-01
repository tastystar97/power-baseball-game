import {derivedStats} from '../game/abilities.ts';
import {labels} from '../game/types.ts';
import {builtinPack} from '../cards/builtin.ts';
import {supportById} from './supports.ts';
import type { GameState, SkillId, SupportId, Gains } from '../game/types.ts';
export const skills=builtinPack.skills;
export const getSkills=(s?:{content?:GameState['content']})=>s?.content?.skills||skills;
export const availableSkills=(s:Pick<GameState,'role'>&{content?:GameState['content']})=>getSkills(s).filter(k=>k.role==='both'||k.role===s.role);
export function skillRequirements(s:GameState,id:SkillId) {
  const skill=getSkills(s).find(k=>k.id===id);
  if(!skill)return [{label:"이 덱에 없는 스킬",met:false}];
  const requirements=Object.entries(skill.requires||{}).map(([key,value])=>({label:`${labels[key]} ${derivedStats(s,false)[key as keyof Gains]} / ${value}`,met:derivedStats(s,false)[key as keyof Gains]>=value!}));
  if(skill.prerequisite)requirements.push({label:`${getSkills(s).find(k=>k.id===skill.prerequisite)!.name} 습득`,met:s.skills.includes(skill.prerequisite)});
  if(skill.tier==='advanced')requirements.push({label:`${supportById(skill.owner!,s)?.name||"서포트"}의 마지막 성장 사건 완료`,met:s.unlockedSkills.includes(id)});
  return requirements;
}
export function developmentStyle(s:GameState) {
  const st=derivedStats(s);
  const paths=s.role==='batter'?[{name:'교타형',score:Math.round(st.contact*.6+st.eye*.4)},{name:'장타형',score:Math.round(st.power*.8+st.contact*.2)}]
    :[{name:'구위형',score:Math.round(st.velocity*.6+st.breaking*.4)},{name:'제구형',score:Math.round(st.control*.6+st.stamina*.4)}];
  const advanced=availableSkills(s).filter(k=>k.style&&s.skills.includes(k.id));
  const name=new Set(advanced.map(k=>k.style)).size>=2?'혼합형':advanced.length===1?advanced[0].style!:Math.abs(paths[0].score-paths[1].score)<8?'균형 성장':paths[0].score>paths[1].score?`${paths[0].name} 성장 중`:`${paths[1].name} 성장 중`;
  return {name,paths};
}
export const skillCost=(s:GameState,id:SkillId)=>Math.max(6,getSkills(s).find(k=>k.id===id)!.cost-(s.hints.includes(id)?4:0));
export const supportHint=(s:GameState,id:SupportId)=>supportById(id,s).hints[s.role];
