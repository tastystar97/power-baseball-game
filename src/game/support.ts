import { activities } from '../content/activities.ts';
import { bond, supportById } from '../content/supports.ts';
import type { GameState, SupportId } from './types.ts';
import { random } from './random.ts';

export function weeklyPlacements(s:Pick<GameState,'role'|'supports'|'trainingSeed'|'month'|'week'>):Record<string,string> {
  const options=activities({role:s.role,phase:'weekday'}).map(a=>a.id);
  return Object.fromEntries(s.supports.map(id=>{
    let hash=s.trainingSeed^(s.month*100+s.week);
    for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619);
    const rng={rng:(hash>>>0)||1};
    const preferred=supportById(id).training[s.role];
    const pool=random(rng)<.75?preferred:options;
    return [id,pool[Math.floor(random(rng)*pool.length)]];
  }));
}
export function participants(s:GameState,activityId:string):SupportId[] {
  return s.phase==='weekday'?s.supports.filter(id=>s.placements[id]===activityId):[];
}
export const isJoint=(s:GameState,id:SupportId)=>bond(s,id)>=40;
// Added to the training's primary ability, alongside each person's existing effects.
export const bondTrainingBonus=(value:number)=>Math.min(5,1+Math.floor(Math.max(0,value)/20));
export function addBond(s:GameState,id:SupportId,amount:number) {
  const next=Math.min(100,bond(s,id)+amount);
  if(id==='rival')s.rival=next;
  else if(id==='catcher')s.catcher=next;
  else s.bonds[id]=next;
}
