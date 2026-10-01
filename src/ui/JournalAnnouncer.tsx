import {useEffect,useRef,useState} from 'react';
import type {GameState} from '../game/types.ts';
import {logLines} from './logView.ts';

/** A single live region for both desktop and mobile. Resuming a save is silent. */
export function JournalAnnouncer({s}:{s:GameState}){
 const lines=logLines(s),seen=useRef(new Set(lines.map(l=>l.key))),[message,setMessage]=useState({serial:0,text:''});
 useEffect(()=>{
  const fresh=lines.filter(l=>!seen.current.has(l.key)&&!s.log.find(e=>e.id===l.entry)?.summary);
  lines.forEach(l=>seen.current.add(l.key));
  if(fresh.length)setMessage(previous=>({serial:previous.serial+1,text:fresh.reverse().map(l=>l.text).join(' ')}));
 },[s]);
 return <div className="journal-announcer" role="status" aria-live="polite" aria-atomic="true"><span key={message.serial}>{message.text}</span></div>;
}
