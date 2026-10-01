import type {PlayEvent} from '../../game/plate.ts';
import {diceFaces,resultFace,resultEffect} from '../../content/match-presentation.ts';
import {RollDice} from '../RollDice.tsx';
export function DiceReveal({event,rolling,paused,outlook,skills,skip}:{event:PlayEvent;rolling:boolean;paused:boolean;outlook:string|null;skills:string[];skip:()=>void}){
 const face=resultFace(event),effect=resultEffect(event);
 return <RollDice face={face} label={effect.label} tone={effect.tone} context="승부" rolling={rolling} paused={paused} skip={skip}>
  {rolling&&outlook&&<span className="dice-outlook">{outlook} <span aria-hidden="true">{diceFaces(outlook).join(' ')}</span></span>}
  {!rolling&&skills.length>0&&<div className="dice-skills">{skills.map(name=><span key={name}>✦ {name} 발동</span>)}</div>}
 </RollDice>;
}
