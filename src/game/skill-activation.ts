import {clamp,random} from './random.ts';
import {availableSkills} from '../content/skills.ts';
import type {GameState,SkillId} from './types.ts';
import type {SkillCondition} from '../cards/schema.ts';
export const skillActivationChance=(intelligence:number)=>(500+clamp(intelligence)*4)/1000;
export const opponentType=(s:GameState)=>{
 const m=s.match!;
 if(!m.rosters)return s.role==='batter'?'wild':'patient';
 if(s.role==='batter'){
  const p=m.rosters[0].pitchers.find(p=>p.id===m.pitcherIds[0])!;
  if((m.pitcherLines[p.id]?.load??0)>(78+p.ratings.stamina*.6)*.8)return 'tired';
  return p.traits.includes('velocity')?'fast':'wild';
 }
 const b=m.rosters[0].batters[m.order[0]%9];return b.traits.includes('power')?'power':'patient';
};
export function conditionMet(s:GameState,tactic:string,c:SkillCondition):boolean {
 if(c.role&&c.role!==s.role)return true;
 const m=s.match!;
 switch(c.kind){
 case 'tactic':return c.values.some(v=>v===tactic);
 case 'inning':return m.inning>=c.min&&m.inning<=c.max;
 case 'outs':return m.outs>=c.min&&m.outs<=c.max;
 case 'energy':case 'stress':return s[c.kind]>=c.min&&s[c.kind]<=c.max;
 case 'runners':return m.bases.some(Boolean)===c.present;
 case 'score':return (m.score[1]===m.score[0]?'tied':m.score[1]>m.score[0]?'ahead':'behind')===c.value;
 case 'opponent':return c.values.includes(opponentType(s));
 }
}
/** A learned upper skill replaces its normal family member, even when its own condition is unmet. */
export function eligibleSkills(s:GameState,tactic:string):SkillId[] {
 if(!s.match)return [];
 const learned=availableSkills(s).filter(k=>s.skills.includes(k.id));
 const families=new Map<string,typeof learned[number]>();
 for(const k of learned){const previous=families.get(k.family);if(!previous||k.tier==='advanced'&&previous.tier==='normal')families.set(k.family,k);}
 return [...families.values()].filter(k=>k.conditions.every(c=>conditionMet(s,tactic,c))).map(k=>k.id);
}
export function rollSkills(s:GameState,tactic:string,source:'manual'|'auto'):SkillId[] {
 const m=s.match!,eligible=eligibleSkills(s,tactic),chance=skillActivationChance(s.attributes.intelligence);
 const active=eligible.filter(()=>random(s)<chance);
 m.skillChecks.push({half:m.half,order:m.order[m.half],inning:m.inning,tactic,source,intelligence:s.attributes.intelligence,eligible,active});
 return active;
}
