import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import type {DiceFace} from '../content/match-presentation.ts';

export function useReducedMotion(){
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 return reduced;
}

/** Displays an already committed result. This component never rolls or changes game state. */
export function RollDice({face,label,tone,context,rolling=false,paused=false,inline=false,skip,children}:{
 face:DiceFace;label:string;tone:string;context:string;rolling?:boolean;paused?:boolean;inline?:boolean;skip?:()=>void;children?:ReactNode;
}){
 const reduced=useReducedMotion(),moving=rolling&&!reduced;
 return <div className={`dice-reveal ${inline?'inline':''} ${moving?'rolling':`settled ${tone}`} ${paused?'paused':''}`} data-dice={moving?'rolling':'settled'}>
  <button className="dice-skip" disabled={!moving} onClick={skip} aria-label={moving?`${context} 주사위 연출 건너뛰기`:`${context} 결과 ${label}`}>
   <span className="dice-cube" aria-hidden="true">{moving?<span className="dice-strip">★<br/>●<br/>✕<br/>★</span>:face}</span>
   <span>{moving?`${context}을 확인하는 중…`:label}<small>{moving?'눌러서 바로 보기':`확정된 ${context} 결과`}</small></span>
  </button>{children}
 </div>;
}
