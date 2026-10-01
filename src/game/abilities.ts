import {roleStats, statKeys} from './types.ts';
import type {GameState, Stats, StatKey, PrimaryKey, PrimaryGains, Gains, Attributes, Role, TrainingTarget} from './types.ts';
import {clamp} from './random.ts';
import {growthMultiplier} from './training.ts';

export const initialAttributes=():Attributes=>({power:35,endurance:35,mental:40,intelligence:45,sense:35});
export const initialProficiency=(role:Role):Gains=>role==='batter'
 ?{contact:42,power:28,eye:24,speed:43,field:30}
 :{velocity:38,control:42,breaking:16,stamina:45,field:30};
export const secondaryKeys=(role:Role)=>roleStats(role).filter(k=>k!=='mental');
export const effectiveMental=(mental:number,stress:number)=>Math.max(0,mental*10-Math.max(0,stress-50)*3)/10;
export function baseStats(a:Attributes,stress=0):Stats {
 // Integer tenths retain the stress-adjusted mental; weighted bases have at most two decimals.
 const p=a.power*10,e=a.endurance*10,i=a.intelligence*10,s=a.sense*10,m=Math.round(effectiveMental(a.mental,stress)*10);
 return {contact:(s*5+m*3+i*2)/100,power:(p*7+s*3)/100,eye:(i*5+m*5)/100,speed:(e*4+p*3+s*3)/100,
 field:(s*4+i*3+e*3)/100,mental:m/10,velocity:(p*6+s*2+e*2)/100,control:(s*4+m*4+i*2)/100,breaking:(s*4+i*4+p*2)/100,stamina:(e*7+m*3)/100};
}
export type AbilityState=Pick<GameState,'role'|'attributes'|'proficiency'|'stress'>;
export function derivedStats(s:AbilityState,effective=true):Stats {
 const base=baseStats(s.attributes,effective?s.stress:0),out=Object.fromEntries(statKeys.map(k=>[k,0])) as Stats;
 for(const k of secondaryKeys(s.role))out[k]=clamp(Math.round((Math.round(base[k]*100)*6+(s.proficiency[k]??0)*400)/1000));
 out.mental=base.mental;
 return out;
}
export function proficiencyMultiplier(value:number,base:number){const gap=value*100-Math.round(base*100);return gap>2000?.25:gap>1000?.5:1;}
export function resolveGrowth(s:AbilityState,gains:PrimaryGains={},proficiency:Gains={}) {
 const primary:PrimaryGains={},technical:Gains={},base=baseStats(s.attributes);
 const growth=(value:number,raw:number,multiplier=1)=>raw>0?Math.min(100-value,Math.max(1,Math.floor(raw*growthMultiplier(value)*multiplier))):Math.max(-value,raw);
 for(const [key,raw] of Object.entries(gains)) {const k=key as PrimaryKey;primary[k]=growth(s.attributes[k],raw);}
 for(const [key,raw] of Object.entries(proficiency)) {const k=key as StatKey;if(k!=='mental'&&secondaryKeys(s.role).includes(k)){const value=s.proficiency[k]??0;technical[k]=growth(value,raw,proficiencyMultiplier(value,base[k]));}}
 return {gains:primary,proficiency:technical};
}
export function trainingTargets(role:Role,partner=false):TrainingTarget[]{return [...secondaryKeys(role),...(partner?['power','endurance','mental','intelligence','sense']:['power','endurance']).map(k=>`primary_${k}` as TrainingTarget)];}
export function targetGrowth(target:TrainingTarget|undefined,technical:number,primary:number):{gains:PrimaryGains;proficiency:Gains} {
 if(!target)return {gains:{},proficiency:{}};
 return target.startsWith('primary_')?{gains:{[target.slice(8)]:primary},proficiency:{}}:{gains:{},proficiency:{[target]:technical}};
}
export function growthChanges(gains:PrimaryGains={},proficiency:Gains={}):Record<string,number>{
 return Object.fromEntries([...Object.entries(gains).map(([k,v])=>[`primary_${k}`,v]),...Object.entries(proficiency).map(([k,v])=>[`proficiency_${k}`,v])]);
}
