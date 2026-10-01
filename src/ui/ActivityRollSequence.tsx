import {useEffect,useState} from 'react';
import {activityRolls} from '../game/journal.ts';
import type {GameState} from '../game/types.ts';
import {matchTiming} from '../content/match-presentation.ts';
import {RollDice,useReducedMotion} from './RollDice.tsx';
import {ChoicePopup} from './ChoicePopup.tsx';

export function ActivityRollSequence({s,action,onDone}:{s:GameState;action:number;onDone:()=>void}){
 const results=activityRolls(s,action),[index,setIndex]=useState(0),[rolling,setRolling]=useState(true),reduced=useReducedMotion();
 const result=results[index];
 useEffect(()=>{
  if(reduced||!result){onDone();return;}
  const timer=window.setTimeout(()=>{
   if(rolling)setRolling(false);
   else if(index+1<results.length){setIndex(index+1);setRolling(true);}
   else onDone();
  },rolling?matchTiming.dice:700);
  return()=>window.clearTimeout(timer);
 },[index,rolling,reduced,result?.id,results.length,onDone]);
 if(!result)return null;
 return <ChoicePopup title="오늘의 한 장면" label="활동 결과" subtitle={`${index+1} / ${results.length}`}>
  <RollDice {...result} inline context={result.kind==='training'?'훈련':'만남'} rolling={rolling} skip={()=>setRolling(false)}/>
  <div className="actions"><button onClick={onDone}>결과 바로 보기</button></div>
 </ChoicePopup>;
}

export function ActivityRollResults({s}:{s:GameState}){
 const rolls=activityRolls(s,s.revision);
 return rolls.length>0?<section className="activity-roll-results" aria-label="확정된 활동 결과">{rolls.map(r=><RollDice key={r.id} {...r} inline context={r.kind==='training'?'훈련':'만남'}/>)}</section>:null;
}
