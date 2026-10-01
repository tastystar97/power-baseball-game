import {roleStats, statKeys} from './types.ts';
import type {GameState, Stats, StatKey, PrimaryKey, PrimaryGains, Gains, Attributes, Role, TrainingTarget} from './types.ts';
import {clamp} from './random.ts';
import {INITIAL_ATTRIBUTES,PRIMARY_MAX,PRIMARY_EXPONENT,PROFICIENCY_UNIT,PRIMARY_CURVE,PROFICIENCY_CURVE,YEAR_CAPS,curve} from '../content/development-rules.ts';

export const initialAttributes=():Attributes=>({...INITIAL_ATTRIBUTES});
export const initialProficiency=(role:Role):Gains=>role==='batter'
 ?{contact:420,power:280,eye:240,speed:430,field:300}
 :{velocity:380,control:420,breaking:160,stamina:450,field:300};
export const secondaryKeys=(role:Role)=>roleStats(role).filter(k=>k!=='mental');
export const convertPrimary=(value:number)=>100*Math.pow(clamp(value,0,PRIMARY_MAX)/PRIMARY_MAX,PRIMARY_EXPONENT);
export const effectiveMental=(mental:number,stress:number)=>Math.max(0,convertPrimary(mental)-Math.max(0,stress-50)*.3);
export function baseStats(a:Attributes,stress=0):Stats {
 const p=convertPrimary(a.power),e=convertPrimary(a.endurance),i=convertPrimary(a.intelligence),s=convertPrimary(a.sense),m=effectiveMental(a.mental,stress);
 return {contact:s*.5+m*.3+i*.2,power:p*.7+s*.3,eye:i*.5+m*.5,speed:e*.4+p*.3+s*.3,
 field:s*.4+i*.3+e*.3,mental:m,velocity:p*.6+s*.2+e*.2,control:s*.4+m*.4+i*.2,breaking:s*.4+i*.4+p*.2,stamina:e*.7+m*.3};
}
export type AbilityState=Pick<GameState,'role'|'attributes'|'proficiency'|'stress'>;
export function derivedStats(s:AbilityState,effective=true):Stats {
 const base=baseStats(s.attributes,effective?s.stress:0),out=Object.fromEntries(statKeys.map(k=>[k,0])) as Stats;
 for(const k of secondaryKeys(s.role))out[k]=clamp(Math.round(base[k]*.6+(s.proficiency[k]??0)/PROFICIENCY_UNIT*.4));
 out.mental=base.mental;
 return out;
}
export function overall(s:AbilityState,effective=true):number {const stats=derivedStats(s,effective);return secondaryKeys(s.role).reduce((n,k)=>n+stats[k],0)/5;}
export function proficiencyMultiplier(value:number,base:number){return value>base+20?.25:value>base+10?.5:1;}
export function resolveGrowth(s:AbilityState,gains:PrimaryGains={},proficiency:Gains={}) {
 const primary:PrimaryGains={},technical:Gains={},base=baseStats(s.attributes);
 for(const [key,raw] of Object.entries(gains)) {const k=key as PrimaryKey,value=s.attributes[k];primary[k]=raw>0?Math.max(0,Math.min(YEAR_CAPS[0]-value,Math.round(raw*curve(value,PRIMARY_CURVE)))):Math.max(-value,Math.round(raw));}
 for(const [key,raw] of Object.entries(proficiency)) {const k=key as StatKey;if(k!=='mental'&&secondaryKeys(s.role).includes(k)){const stored=s.proficiency[k]??0,value=stored/PROFICIENCY_UNIT;technical[k]=raw>0?Math.min(1000-stored,Math.round(raw*PROFICIENCY_UNIT*curve(value,PROFICIENCY_CURVE)*proficiencyMultiplier(value,base[k]))):Math.max(-stored,Math.round(raw*PROFICIENCY_UNIT));}}
 return {gains:primary,proficiency:technical};
}
export function trainingTargets(_role:Role,_partner=false):TrainingTarget[]{return ['power','endurance','mental','intelligence','sense'].map(k=>`primary_${k}` as TrainingTarget);}
export function growthChanges(gains:PrimaryGains={},proficiency:Gains={}):Record<string,number>{
 return Object.fromEntries([...Object.entries(gains).map(([k,v])=>[`primary_${k}`,v]),...Object.entries(proficiency).map(([k,v])=>[`proficiency_${k}`,v])]);
}
