import {labels} from '../game/types.ts';
import type { GameState, Role, SkillId, SupportId, Gains } from '../game/types.ts';
export const skills:{id:SkillId;name:string;role:Role|'both';cost:number;description:string;requires?:Gains;prerequisite?:SkillId;style?:string}[]=[
  {id:'contact_focus',name:'짧고 정확한 스윙',role:'batter',cost:14,description:'정확하게 맞히기의 안타 확률 +3.5%p.'},
  {id:'power_drive',name:'끝까지 밀어내기',role:'batter',cost:18,description:'장타 노리기의 홈런 확률 +2.5%p.'},
  {id:'patient_eye',name:'한 공 더 보기',role:'batter',cost:14,description:'공 골라내기의 볼넷 확률 +3.5%p.'},
  {id:'fastball_edge',name:'살아 있는 직구',role:'pitcher',cost:14,description:'직구로 승부에서 범타 확률 4%p를 삼진으로 바꿉니다.'},
  {id:'precision',name:'미트 끝을 향해',role:'pitcher',cost:14,description:'모든 투구 작전의 볼넷 확률 -2.5%p.'},
  {id:'breaking_read',name:'타이밍 빼앗기',role:'pitcher',cost:18,description:'변화구로 유도에서 피안타 확률 -2.5%p.'},
  {id:'calm',name:'흔들리지 않는 마음',role:'both',cost:16,description:'타자는 2아웃에서 안타 확률 +2.5%p, 투수는 주자가 있을 때 피안타 확률 -2.5%p.'},
  {id:'steady',name:'마지막까지 같은 자세',role:'both',cost:12,description:'체력 45 미만일 때 경기 확률의 체력 불이익을 절반으로 줄입니다.'},
  {id:'contact_master',name:'정교한 배트',role:'batter',cost:24,style:'교타형',requires:{contact:60,eye:50},prerequisite:'contact_focus',description:'정확하게 맞히기·공 골라내기의 범타 4%p를 안타로 바꿉니다.'},
  {id:'slugger',name:'담장을 향한 스윙',role:'batter',cost:24,style:'장타형',requires:{power:60,contact:45},prerequisite:'power_drive',description:'장타 노리기의 범타 4%p를 홈런으로 바꿉니다.'},
  {id:'power_finish',name:'결정구의 위력',role:'pitcher',cost:24,style:'구위형',requires:{velocity:60,breaking:45},prerequisite:'fastball_edge',description:'직구로 승부·변화구로 유도의 범타 5%p를 삼진으로 바꿉니다.'},
  {id:'efficient_pitch',name:'효율적인 투구',role:'pitcher',cost:24,style:'제구형',requires:{control:60,stamina:50},prerequisite:'precision',description:'맞혀 잡기의 볼넷 1%p를 범타로 바꾸고 투구 부담을 2 줄입니다. 요약 투구에도 적용됩니다.'},
];
export const availableSkills=(s:Pick<GameState,'role'>)=>skills.filter(k=>k.role==='both'||k.role===s.role);
export function skillRequirements(s:GameState,id:SkillId) {
  const skill=skills.find(k=>k.id===id)!;
  const requirements=Object.entries(skill.requires||{}).map(([key,value])=>({label:`${labels[key]} ${s.stats[key as keyof Gains]} / ${value}`,met:s.stats[key as keyof Gains]>=value!}));
  if(skill.prerequisite)requirements.push({label:`${skills.find(k=>k.id===skill.prerequisite)!.name} 습득`,met:s.skills.includes(skill.prerequisite)});
  return requirements;
}
export function developmentStyle(s:GameState) {
  const st=s.stats;
  const paths=s.role==='batter'?[{name:'교타형',score:Math.round(st.contact*.6+st.eye*.4)},{name:'장타형',score:Math.round(st.power*.8+st.contact*.2)}]
    :[{name:'구위형',score:Math.round(st.velocity*.6+st.breaking*.4)},{name:'제구형',score:Math.round(st.control*.6+st.stamina*.4)}];
  const advanced=availableSkills(s).filter(k=>k.style&&s.skills.includes(k.id));
  const name=advanced.length===2?'혼합형':advanced.length===1?advanced[0].style!:Math.abs(paths[0].score-paths[1].score)<8?'균형 성장':paths[0].score>paths[1].score?`${paths[0].name} 성장 중`:`${paths[1].name} 성장 중`;
  return {name,paths};
}
export const skillCost=(s:GameState,id:SkillId)=>Math.max(6,skills.find(k=>k.id===id)!.cost-(s.hints.includes(id)?4:0));
export function supportHint(s:GameState,id:SupportId):SkillId {
  const hints:Record<SupportId,SkillId>={bat_senior:s.role==='batter'?'contact_focus':'calm',pitch_senior:s.role==='pitcher'?'breaking_read':'patient_eye',rival:s.role==='batter'?'power_drive':'fastball_edge',catcher:s.role==='pitcher'?'precision':'calm',manager:s.role==='batter'?'patient_eye':'steady',classmate:'steady'};
  return hints[id];
}
