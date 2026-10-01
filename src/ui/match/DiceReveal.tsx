import type {PlayEvent} from '../../game/plate.ts';
import {diceFaces,resultFace,resultEffect} from '../../content/match-presentation.ts';
export function DiceReveal({event,rolling,paused,outlook,skills,skip}:{event:PlayEvent;rolling:boolean;paused:boolean;outlook:string|null;skills:string[];skip:()=>void}){
 const face=resultFace(event),effect=resultEffect(event);
 return <div className={`dice-reveal ${rolling?'rolling':`settled ${effect.tone}`} ${paused?'paused':''}`} data-dice={rolling?'rolling':'settled'}>
  <button className="dice-skip" disabled={!rolling} onClick={skip} aria-label={rolling?'승부 주사위 연출 건너뛰기':`승부 결과 ${effect.label}`}>
   <span className="dice-cube" aria-hidden="true">{rolling?<span className="dice-strip">★<br/>●<br/>✕<br/>★</span>:face}</span>
   <span>{rolling?'승부를 확인하는 중…':effect.label}<small>{rolling?'눌러서 바로 보기':'확정된 승부 결과'}</small></span>
  </button>
  {rolling&&outlook&&<span className="dice-outlook">{outlook} <span aria-hidden="true">{diceFaces(outlook).join(' ')}</span></span>}
  {!rolling&&skills.length>0&&<div className="dice-skills">{skills.map(name=><span key={name}>✦ {name} 발동</span>)}</div>}
 </div>;
}
