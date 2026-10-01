import {useEffect,useRef,useState} from 'react';
import type {Action,GameState} from '../../game/types.ts';
import {playDuration,matchTiming} from '../../content/match-presentation.ts';
import {validPlaybackIndex} from '../../persistence/match-validation.ts';
type Speed='normal'|'double'|'next';
const KEY='last-summer.match-speed';
function readSpeed():Speed{try{const value=localStorage.getItem(KEY);return value==='double'||value==='next'?value:'normal';}catch{return 'normal';}}
export function usePlayback(s:GameState,send:(a:Omit<Action,'revision'>)=>void){
 const m=s.match!,[index,setIndex]=useState(m.playbackIndex),[speed,setValue]=useState<Speed>(readSpeed),[paused,setPaused]=useState(false),[fastUntil,setFastUntil]=useState(false),[reduced,setReduced]=useState(false);
 const sendRef=useRef(send);sendRef.current=send;
 const [dice,setDice]=useState<{index:number;outlook:string;rolling:boolean}|null>(null);
 const rolling=!!dice&&dice.index===index&&dice.rolling;
 function skipDice(){setDice(d=>d?{...d,rolling:false}:null);}
 function choose(id:string,outlook:string){setDice({index:m.feed.length,outlook,rolling:!reduced});sendRef.current({type:'tactic',id});}
 const viewInning=m.feed[index]?.inning??m.inning;
 const fast=fastUntil&&viewInning<9||speed==='next';
 const ready=index>=m.feed.length&&m.awaiting;
 function setSpeed(value:Speed){setValue(value);try{localStorage.setItem(KEY,value);}catch{/* Session setting remains usable. */}}
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches);change();query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 useEffect(()=>{if(fastUntil&&viewInning>=9){setFastUntil(false);setSpeed('normal');}},[fastUntil,viewInning]);
 useEffect(()=>{if(!rolling||paused)return;if(reduced){skipDice();return;}const timer=setTimeout(skipDice,matchTiming.dice);return()=>clearTimeout(timer);},[rolling,paused,reduced]);
 useEffect(()=>{
  if(paused||rolling)return;
  if(index<m.feed.length){
   const e=m.feed[index],previous=m.feed[index-1],changed=previous&&(previous.inning!==e.inning||previous.half!==e.half);
   const delay=fast?0:(playDuration(e)+(changed?matchTiming.half:0))/(speed==='double'?2:1);
   const timer=setTimeout(()=>{
    const next=index+1;setIndex(next);
    if(validPlaybackIndex(m,next)&&next>m.playbackIndex)sendRef.current({type:'playback',index:next});
   },delay);return()=>clearTimeout(timer);
  }
  if(!m.awaiting&&s.phase!=='matchEnd'){
   const timer=setTimeout(()=>sendRef.current({type:'continue'}),0);return()=>clearTimeout(timer);
  }
 },[index,m.feed.length,m.awaiting,m.playbackIndex,s.phase,s.revision,paused,speed,fast,rolling]);
 return {index,speed,setSpeed,paused,setPaused,ready,reduced,fastUntil,setFastUntil,choose,rolling,skipDice,diceOutlook:dice?.index===index?dice.outlook:null,duration:m.feed[index]?playDuration(m.feed[index])/(speed==='double'?2:1):0,finished:index>=m.feed.length&&s.phase==='matchEnd'};
}
