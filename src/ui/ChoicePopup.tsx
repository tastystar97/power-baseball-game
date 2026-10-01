import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';

/**
 * Modal choice sheet used when it is the player's turn (match decisions, encounters).
 * Keeps keyboard focus inside while open and returns it to the previous element on close.
 * It does not close itself: the caller removes it once a choice has been sent.
 */
export function ChoicePopup({title,subtitle,children,footer,onDismiss,label}:{title:string;subtitle?:ReactNode;children:ReactNode;footer?:ReactNode;onDismiss?:()=>void;label?:string}) {
  const box=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    heading.current?.focus({preventScroll:true});
    return ()=>{if(previous&&document.contains(previous))previous.focus({preventScroll:true});};
  },[]);
  function keydown(e:React.KeyboardEvent) {
    if(e.key==='Escape'&&onDismiss){e.preventDefault();onDismiss();return;}
    if(e.key!=='Tab'||!box.current)return;
    const focusable=[...box.current.querySelectorAll<HTMLElement>('button:not([disabled]),[href],select,input,[tabindex]:not([tabindex="-1"])')];
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===heading.current)){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  return <div className="choice-popup-back" onKeyDown={keydown}>
    <div className="choice-popup" role="dialog" aria-modal="true" aria-label={label??title} ref={box}>
      <div className="choice-popup-head"><h2 ref={heading} tabIndex={-1}>{title}</h2>{onDismiss&&<button className="choice-popup-close" onClick={onDismiss} aria-label="닫기">✕</button>}</div>
      {subtitle&&<div className="choice-popup-sub">{subtitle}</div>}
      <div className="choice-popup-body">{children}</div>
      {footer&&<div className="choice-popup-foot">{footer}</div>}
    </div>
  </div>;
}
