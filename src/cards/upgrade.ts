import {packSchema as legacySchema,roleAbilityNames as legacyAbilities} from './legacy-schema.ts';
import {PRIMARY_MAX,PRIMARY_EXPONENT,REWARD_SCALE} from '../content/development-rules.ts';
export const legacyTraining:Record<string,string>={batting:'train_sense',weights:'train_power',running:'train_endurance',fielding:'train_sense',freebatting:'train_power',tactics:'train_mental',study:'train_intelligence',rest:'rest',velocity:'train_power',control:'train_sense',breaking:'train_sense',endurance:'train_endurance'};
const requirementKey:Record<string,string>={contact:'sense',power:'power',eye:'intelligence',speed:'endurance',field:'sense',mental:'mental',velocity:'power',control:'sense',breaking:'intelligence',stamina:'endurance'};
export function upgradeRequirements(old:Record<string,number>){
 const out:Record<string,number>={};
 for(const [key,value] of Object.entries(old)){
  const target=requirementKey[key];if(!target||!Number.isInteger(value)||value<0||value>95)throw Error('옛 스킬 능력 조건을 변환할 수 없습니다.');
  out[target]=Math.max(out[target]??0,Math.round(PRIMARY_MAX*Math.pow(value/100,1/PRIMARY_EXPONENT)));
  if(key!=='mental')out.overall=Math.max(out.overall??0,Math.round(value*.9));
 }
 return out;
}
export const upgradeTraining=(ids:readonly string[])=>[...new Set(ids.map(id=>legacyTraining[id]??id))];
export function upgradePack(input:unknown):unknown {
 if(!input||typeof input!=='object'||!('version' in input)||input.version!==1)return input;
 const p=legacySchema.parse(input);
 for(const skill of p.skills)for(const role of skill.role==='both'?['batter','pitcher'] as const:[skill.role]){
  if(Object.entries(skill.requires).some(([k,v])=>v!>0&&!(legacyAbilities[role] as readonly string[]).includes(k)))throw Error('옛 스킬의 역할별 능력 조건이 올바르지 않습니다.');
 }
 return {...p,version:2,ruleset:'first-year-1',cards:p.cards.map(c=>({...c,grade:2,training:{batter:upgradeTraining(c.training.batter),pitcher:upgradeTraining(c.training.pitcher)},bonus:{...c.bonus,gains:{}}})),skills:p.skills.map(s=>({...s,requires:upgradeRequirements(s.requires)})),events:p.events.map(e=>({...e,choices:e.choices.map(c=>({...c,gains:Object.fromEntries(Object.entries(c.gains).map(([k,v])=>[k,Math.round(v!*REWARD_SCALE)]))}))}))};
}
