import type {PlayEvent} from '../../game/plate.ts';
import {outcomeNames} from '../../game/match.ts';
export function caption(e:PlayEvent){const direction=e.direction?{left:'좌측',center:'중앙',right:'우측'}[e.direction]+' ':'';return `${e.inning}회 ${e.half===0?'초':'말'} · ${e.batter.name}, ${direction}${outcomeNames[e.outcome]}${e.runs?`! ${e.runs}명 홈인`:''}${e.fielder&&e.outs?` · ${e.fielder.name} 처리`:''}`;}
export function Commentary({event,ready,ended}:{event:PlayEvent|null;ready:boolean;ended:boolean}){
 const message=ready?'감독이 당신의 선택을 기다립니다.':ended?'오늘의 승부가 끝났습니다.':event?caption(event):'다음 승부를 준비합니다.';
 return <div className="live-commentary"><span aria-hidden="true">● LIVE</span><p>{message}</p><span className="visually-hidden" role="status">{ready||ended||event&&(event.runs||event.after.outs===3)?message:''}</span></div>;
}
