import {activities} from '../content/activities.ts';
import {weeklyPlacements} from './support.ts';
import type {GameState,StatKey} from './types.ts';
/** Reconstruct shared training from committed slots, not the current preview. */
export function sharedTraining(s:GameState,index:number,part:1|2):StatKey|null {
  const w=s.schedule[index],lineup=s.supports;
  const title=part===1?w.weekday:w.weekday2;
  const activity=activities({role:s.role,phase:'weekday'}).find(a=>a.title===title);
  if(!activity||!lineup.includes('rival'))return null;
  const placements=weeklyPlacements({content:s.content,role:s.role,supports:lineup,trainingSeed:s.trainingSeed,month:w.month,week:w.week,weekdayPart:part});
  const failed=s.log.some(l=>l.month===w.month&&l.week===w.week&&l.slot===(part===1?'first':'second')&&l.training?.outcome==='failure');
  return placements.rival===activity.id&&!failed?activity.rivalTrainingStat||null:null;
}
