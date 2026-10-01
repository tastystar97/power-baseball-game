import type {PlayEvent} from '../game/plate.ts';
export const matchTiming={strikeout:800,out:1000,walk:1000,single:1800,scoring:2600,half:1200};
export function playDuration(e:PlayEvent){return e.runs||['double','triple','homer'].includes(e.outcome)?matchTiming.scoring:['single','infieldSingle','error'].includes(e.outcome)?matchTiming.single:e.outcome==='strikeout'?matchTiming.strikeout:matchTiming.out;}
export function playbackDuration(feed:PlayEvent[]){return feed.reduce((sum,e,i)=>sum+playDuration(e)+(i>0&&(feed[i-1].inning!==e.inning||feed[i-1].half!==e.half)?matchTiming.half:0),0);}
