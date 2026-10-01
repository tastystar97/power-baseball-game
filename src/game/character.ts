import {backgrounds,creationRules,hiddenTalents,talentRules} from '../content/backgrounds.ts';
import type {HiddenTalentId} from '../content/backgrounds.ts';
import {primaryKeys,roleStats} from './types.ts';
import type {Attributes,Gains,PrimaryGains,Role} from './types.ts';
import type {GameState} from './types.ts';
import {random} from './random.ts';
export {talentRules};
export type TalentGrade=keyof typeof talentRules;
export interface BackgroundChoice {origin:string|null;body:string|null;personality:string|null;specialties:readonly string[];weaknesses:readonly string[];sportFocus:'power'|'endurance'|null;}
export interface TalentRoll {dice:number[];sum:number;grade:TalentGrade;attributes:Attributes;}
export interface FateRoll {die:number;hidden:HiddenTalentId|null;}
export const emptyBackground=():BackgroundChoice=>({origin:null,body:null,personality:null,specialties:[],weaknesses:[],sportFocus:null});
export function recoveryStress(s:Pick<GameState,'character'|'role'>,delta:number){return delta<0&&s.character?Math.round(delta*backgroundEffects(s.character.background,s.role).stressRecovery):delta;}
export const chosenBackgrounds=(c:BackgroundChoice)=>[c.origin,c.body,c.personality,...c.specialties,...c.weaknesses].filter((id):id is string=>id!==null);

export function validateBackground(c:BackgroundChoice,bonus=0){
 const errors:string[]=[];
 for(const group of ['origin','body','personality'] as const)if(!c[group])errors.push('출신·체격·성격을 하나씩 선택해 주세요.');
 const ids=chosenBackgrounds(c);
 if(new Set(ids).size!==ids.length)errors.push('같은 배경은 두 번 선택할 수 없습니다.');
 if(c.weaknesses.length>creationRules.maxWeaknesses)errors.push('약점은 최대 2개까지 선택할 수 있습니다.');
 for(const group of ['origin','body','personality','specialties','weaknesses'] as const){
  const values=group==='specialties'||group==='weaknesses'?c[group]:c[group]?[c[group]]:[];
  for(const id of values){const b=backgrounds.find(b=>b.id===id&&b.group===group);if(!b||b.unavailable)errors.push(b?.unavailable??'선택할 수 없는 배경입니다.');}
 }
 if(c.origin==='other_sport'&&!c.sportFocus)errors.push('다른 운동에서 기른 파워 또는 지구력을 선택해 주세요.');
 if(c.origin!=='other_sport'&&c.sportFocus)errors.push('다른 운동부 출신만 운동 강점을 고를 수 있습니다.');
 const cost=ids.reduce((n,id)=>n+(backgrounds.find(b=>b.id===id)?.cost??0),0),budget=creationRules.budget+(bonus===2?2:0),remaining=budget-cost;
 if(remaining<0)errors.push(`배경 포인트가 ${-remaining} 부족합니다.`);
 return {valid:!errors.length,errors:[...new Set(errors)],cost,budget,remaining};
}
/** Mix separate deterministic streams; consecutive creation seeds must not bias the first die. */
export function creationSeed(seed:number,stream:number,index=0){
 let x=(seed^Math.imul(stream,0x9e3779b9)^Math.imul(index+1,0x85ebca6b))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)||1;
}
export function talentGrade(sum:number):TalentGrade {
 if(!Number.isInteger(sum)||sum<10||sum>60)throw Error('재능 주사위 합은 10~60입니다.');
 return sum>=46?'S':sum>=41?'A':sum>=36?'B':sum>=30?'C':'D';
}
export function rollTalent(seed:number,rerollIndex:number):TalentRoll {
 if(!Number.isInteger(rerollIndex)||rerollIndex<0||rerollIndex>5)throw Error('재능 다시 굴리기 횟수가 올바르지 않습니다.');
 const rng={rng:creationSeed(seed,1,rerollIndex)},dice=Array.from({length:10},()=>1+Math.floor(random(rng)*6)),sum=dice.reduce((a,b)=>a+b,0);
 return {dice,sum,grade:talentGrade(sum),attributes:Object.fromEntries(primaryKeys.map((k,i)=>[k,166+(dice[i*2]+dice[i*2+1])*12])) as Attributes};
}
export function fateRoll(seed:number,role:Role):FateRoll {
 const rng={rng:creationSeed(seed,2)},die=1+Math.floor(random(rng)*20),pool=hiddenTalents.filter(t=>t.roles.includes(role));
 return {die,hidden:die===20?pool[Math.floor(random(rng)*pool.length)].id:null};
}
export function backgroundEffects(c:BackgroundChoice,role:Role){
 const attributes:PrimaryGains={},proficiency:Gains={};let trust=0;
 let proficiencyGrowth=1,intelligenceTraining=1,stressRecovery=1,matchReward=1,lossStress=0,stageStress=0,scoutExtra=0,rerollExtra=0;
 for(const id of chosenBackgrounds(c)){
  const b=backgrounds.find(b=>b.id===id);if(!b||b.unavailable)continue;
  for(const k of primaryKeys)if(b.attributes?.[k])attributes[k]=(attributes[k]??0)+b.attributes[k]!;
  for(const k of roleStats(role).filter(k=>k!=='mental'))proficiency[k]=(proficiency[k]??0)+(b.allProficiency??0)+(b.proficiency?.[role]?.[k]??0);
  trust+=b.trust??0;proficiencyGrowth*=b.proficiencyGrowth??1;intelligenceTraining*=b.intelligenceTraining??1;stressRecovery*=b.stressRecovery??1;
  matchReward*=b.matchReward??1;lossStress+=b.lossStress??0;stageStress+=b.stageStress??0;scoutExtra+=b.scoutExtra??0;rerollExtra+=b.rerollExtra??0;
 }
 if(c.origin==='other_sport'&&c.sportFocus)attributes[c.sportFocus]=(attributes[c.sportFocus]??0)+60;
 return {attributes,proficiency,trust,proficiencyGrowth,intelligenceTraining,stressRecovery,matchReward,lossStress,stageStress,scoutExtra,rerollExtra};
}
