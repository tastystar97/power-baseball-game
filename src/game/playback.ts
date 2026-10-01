import type {Match} from './types.ts';
import {createScoreState,applyPlay,advanceHalf} from './scoring.ts';
/** Projection of already-resolved events. No random calls, progression, or rewards. */
export function presentationAt(m:Match,index:number,before=false){
 const visible=m.feed.slice(0,Math.min(index+(before?0:1),m.feed.length)),score=createScoreState();
 for(const event of visible){applyPlay(score,event);if(event!==visible.at(-1))advanceHalf(score);}
 const event=index<m.feed.length?m.feed[index]:null;
 if(event&&before){score.inning=event.inning;score.half=event.half;score.outs=event.before.outs;score.bases=structuredClone(event.before.bases);score.score=[...event.before.score];}
 if(!event){score.inning=m.inning;score.half=m.half;score.outs=m.outs;score.bases=structuredClone(m.bases);score.over=m.over;}
 const fielding=score.half===0?1:0;
 const rosters=m.rosters!.map(r=>({...r,batters:[...r.batters]}));
 for(const change of m.substitutions)if(index<change.feedIndex)rosters[change.team].batters[change.slot]=change.previous;
 const batterId=event?.batter.id??rosters[score.half].batters[m.order[score.half]%9].id;
 const pitcherId=event?.pitcher.id??m.pitcherIds[fielding];
 const batter=rosters[score.half].batters.find(p=>p.id===batterId),pitcher=rosters[fielding].pitchers.find(p=>p.id===pitcherId);
 return {score,event,batter,pitcher,batterName:event?.batter.name??batter?.name??'',pitcherName:event?.pitcher.name??pitcher?.name??'',fielders:rosters[fielding].batters,fielding};
}
