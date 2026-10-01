import type {PlayEvent} from '../game/plate.ts';
export const matchTiming={strikeout:800,out:1000,walk:1000,single:1800,scoring:2600,half:1200,dice:1200};
export function playDuration(e:PlayEvent){return e.runs||['double','triple','homer'].includes(e.outcome)?matchTiming.scoring:['single','infieldSingle','error'].includes(e.outcome)?matchTiming.single:e.outcome==='strikeout'?matchTiming.strikeout:matchTiming.out;}
export function playbackDuration(feed:PlayEvent[]){return feed.reduce((sum,e,i)=>sum+playDuration(e)+(e.source==='manual'?matchTiming.dice:0)+(i>0&&(feed[i-1].inning!==e.inning||feed[i-1].half!==e.half)?matchTiming.half:0),0);}
export type DiceFace='★'|'●'|'✕';
export function diceFaces(outlook:string):DiceFace[]{const good=outlook==='유리'?4:outlook==='불리'?2:3;return [...Array<DiceFace>(good).fill('★'),'●',...Array<DiceFace>(5-good).fill('✕')];}
/** Presentation only: the play is already resolved, and no roll is performed here. */
export function resultFace(e:PlayEvent):DiceFace{
 if(e.playerPitcher){if(e.runs)return '✕';if(['walk','hitByPitch','error'].includes(e.outcome))return '●';return e.outs>0?'★':'✕';}
 if(e.runs||['single','infieldSingle','double','triple','homer','walk','hitByPitch'].includes(e.outcome))return '★';
 return ['error','sacrificeBunt','sacrificeFly'].includes(e.outcome)?'●':'✕';
}
export function resultEffect(e:PlayEvent){
 const labels:Record<PlayEvent['outcome'],string>={strikeout:'삼진 K',walk:'볼넷',hitByPitch:'사구',groundOut:'아웃',flyOut:'아웃',lineOut:'아웃',doublePlay:'병살!',sacrificeFly:'희생플라이',sacrificeBunt:'희생번트',infieldSingle:'내야안타!',single:'안타!',double:'2루타!',triple:'3루타!',homer:'홈런!',error:'실책 출루',stolenBase:'도루 성공',caughtStealing:'도루 아웃'};
 const player=e.playerBatter||e.playerPitcher,face=resultFace(e);
 return {label:labels[e.outcome],tone:player?(face==='★'?'good':face==='✕'?'bad':'neutral'):'neutral',large:player||e.runs>0,hit:['single','infieldSingle','double','triple','homer'].includes(e.outcome),catch:['groundOut','flyOut','lineOut','doublePlay'].includes(e.outcome)};
}
