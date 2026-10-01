import {useId,useState} from 'react';
import type {ReactNode} from 'react';
import {places,times,bubbles,backgroundFile,characterArt,characterFile,expressions} from '../../content/scene-assets.ts';
import type {CharacterArt} from '../../content/scene-assets.ts';
import type {SceneSpec,CastMember} from './director.ts';

export interface ResolvedCharacter extends CharacterArt {portrait?:string}
export type CharacterResolver=(id:string)=>ResolvedCharacter|undefined;
export interface FloatingText {key:string;text:string;color:string;x?:number;y?:number}

const positions={left:26,center:50,right:74};
const fallbackArt:CharacterArt={name:'인물',tint:['#d8dde6','#7c8597'],head:.13,files:{}};

function Img({src,className}:{src?:string;className?:string}) {
  const [failed,setFailed]=useState('');
  return src&&failed!==src?<img className={className} src={src} alt="" onError={()=>setFailed(src)}/>:null;
}

export function Silhouette({art}:{art:Pick<CharacterArt,'tint'|'cap'|'longHair'>}) {
  const id=useId().replace(/:/g,'');
  const [top,bottom]=art.tint;
  return <svg className="scene-silhouette" viewBox="0 0 300 400" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top}/><stop offset="1" stopColor={bottom}/></linearGradient>
      <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".55"/><stop offset=".35" stopColor="#fff" stopOpacity="0"/></linearGradient>
    </defs>
    {art.longHair&&<path d="M86 124 C78 56 222 56 214 124 L224 236 C204 256 96 256 76 236Z" fill={`url(#${id}f)`} opacity=".95"/>}
    <path d="M30 400 C30 300 82 252 150 248 C218 252 270 300 270 400Z" fill={`url(#${id}f)`}/>
    <path d="M126 222 L174 222 L172 258 C160 266 140 266 128 258Z" fill={`url(#${id}f)`}/>
    <ellipse cx="150" cy="152" rx="58" ry="68" fill={`url(#${id}f)`}/>
    {art.cap&&<><path d="M92 108 C94 48 206 48 208 108 Z" fill={bottom}/><path d="M196 100 C232 102 254 110 260 118 C236 118 214 114 200 112Z" fill={bottom}/></>}
    <path d="M30 400 C30 300 82 252 150 248 C218 252 270 300 270 400Z" fill={`url(#${id}r)`}/>
    <ellipse cx="150" cy="152" rx="58" ry="68" fill={`url(#${id}r)`}/>
  </svg>;
}

function Character({member,art}:{member:CastMember;art:ResolvedCharacter}) {
  const file=characterFile(art,member.expression)??art.portrait;
  return <div className={`scene-char ${member.dim?'dim':''}`} style={{left:`${positions[member.pos]}%`}} data-slot={`L1 ${member.id}/${member.expression} · 3:4`}>
    <Silhouette art={art}/>
    <Img className="scene-sprite" src={file}/>
  </div>;
}

function EmotionBubble({member,art}:{member:CastMember;art:ResolvedCharacter}) {
  if(!member.bubble)return null;
  const b=bubbles[member.bubble];
  // Characters are 92% of the stage height and anchored to the bottom edge.
  const top=8+art.head*92;
  return <div className="scene-bubble" style={{left:`${positions[member.pos]+9}%`,top:`${top}%`}} data-slot={`L2 ${member.bubble} · 1:1`}>
    <span className="scene-bubble-fallback" style={{color:b.color}}>{b.glyph}</span>
  </div>;
}

/** Layered stage: background (L0) → characters (L1) → emotion bubbles (L2) → floating effects (L3). Decorative only. */
export function SceneStage({spec,resolve,effects=[],caption,children}:{spec:SceneSpec;resolve:CharacterResolver;effects?:FloatingText[];caption?:string;children?:ReactNode}) {
  const arts=spec.cast.map(m=>resolve(m.id)??characterArt[m.id]??fallbackArt);
  const who=spec.cast.map((m,i)=>`${arts[i].name}(${expressions[m.expression]})`).join(', ');
  return <section className="scene-stage" data-place={spec.place} data-time={spec.time} aria-label={`장면 · ${places[spec.place]} · ${times[spec.time]} · ${who}`}>
    <div className="scene-layer scene-bg" aria-hidden="true" data-slot={`L0 ${spec.place}.${spec.time} · 16:9`}>
      <div className="scene-sky"/><div className="scene-glow a"/><div className="scene-glow b"/><div className="scene-floor"/><div className="scene-grain"/><div className="scene-vignette"/>
      <Img className="scene-bg-img" src={backgroundFile(spec.place,spec.time)}/>
    </div>
    <div className="scene-layer scene-chars" aria-hidden="true">{spec.cast.map((m,i)=><Character key={m.id} member={m} art={arts[i]}/>)}</div>
    <div className="scene-layer scene-bubbles" aria-hidden="true">{spec.cast.map((m,i)=><EmotionBubble key={`${m.id}-${m.bubble}`} member={m} art={arts[i]}/>)}</div>
    <div className="scene-layer scene-fx" aria-hidden="true">{effects.map(e=><span key={e.key} className="scene-float" style={{color:e.color,left:`${e.x??50}%`,top:`${e.y??40}%`}}>{e.text}</span>)}</div>
    <span className="scene-place">{caption??`${places[spec.place]} · ${times[spec.time]}`}</span>
    {children}
  </section>;
}
