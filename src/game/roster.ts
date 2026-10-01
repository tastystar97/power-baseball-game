import {battingSlotBonus,gradeBonus,rosterEntries,teamBases} from '../content/rosters.ts';
import type {RosterEntry,PitchingRole} from '../content/rosters.ts';
import {derivedStats} from './abilities.ts';
import type {GameState,Stats,TeamId} from './types.ts';
import {statKeys} from './types.ts';
export interface MatchPlayer extends RosterEntry {ratings:Stats;duty?:PitchingRole;}
export interface TeamRoster {teamId:TeamId;batters:MatchPlayer[];pitchers:MatchPlayer[];}
export interface RosterOptions {battingOrder?:1|3|4|6|8;pitchingRole?:PitchingRole;appearance?:'starter'|'substitute'|'reserve';}
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
function ratings(entry:RosterEntry,base:number,bonus:number):Stats {
  const result=Object.fromEntries(statKeys.map(k=>[k,clamp(base+bonus+gradeBonus[entry.grade])])) as Stats;
  entry.traits.forEach((trait,i)=>{const key=trait==='bunt'?'contact':trait;result[key]=clamp(result[key]+(trait==='bunt'?4:i===0?12:8));});
  return result;
}
export const batterRatings=(entry:RosterEntry,base:number)=>ratings(entry,base,battingSlotBonus[entry.slot-1]??0);
export const pitcherRatings=(entry:RosterEntry,base:number)=>ratings(entry,base,entry.ace?8:0);
export function rosterFor(teamId:TeamId,s:GameState,options:RosterOptions={}):TeamRoster {
  const entries=rosterEntries[teamId],base=teamBases[teamId];
  const batters=entries.batters.map(p=>({...structuredClone(p),ratings:batterRatings(p,base.batting)}));
  const pitchers:MatchPlayer[]=entries.pitchers.map((p,i)=>({...structuredClone(p),ratings:pitcherRatings(p,base.pitching),duty:i===0?'starter':i===1?'middle':'closer'}));
  if(teamId==='cheongram'){
    const starter=(options.appearance??'starter')==='starter';
    const player:MatchPlayer={id:starter?'player':'junseo',name:starter?s.name:'차준서',grade:1,position:s.role==='batter'?'2B':'P',throws:'R',bats:'R',traits:[],slot:options.battingOrder??8,ratings:starter?derivedStats(s):structuredClone(s.competitor.stats)};
    if(s.role==='batter'){
      batters.splice(batters.findIndex(p=>p.id==='dojun'),1);batters.splice(player.slot-1,0,player);
    }else{
      player.duty=options.pitchingRole??'middle';
      if(player.duty==='starter'){pitchers[0].duty='middle';pitchers[1].duty='closer';pitchers.unshift(player);}
      else {pitchers[1].duty=player.duty==='middle'?'closer':'middle';pitchers.splice(player.duty==='middle'?1:2,0,player);}
      // A fourth arm remains available after both the role pitcher and regular relief.
      pitchers[pitchers.length-1].duty='middle';
    }
  }
  return {teamId,batters:batters.map((p,i)=>({...p,slot:i+1})),pitchers};
}
