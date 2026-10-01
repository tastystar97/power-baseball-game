import {useEffect,useRef} from 'react';
import type {PlayEvent,BaseRunner} from '../../game/plate.ts';
import type {MatchPlayer} from '../../game/roster.ts';
import {resultEffect} from '../../content/match-presentation.ts';
const positions:Record<string,[number,number]>={P:[320,312],C:[320,452],'1B':[421,325],'2B':[377,248],SS:[263,248],'3B':[218,325],LF:[158,187],CF:[320,131],RF:[482,187]};
const bases:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[320,431],[444,315],[320,199],[196,315],[320,431]];
function runnerPath(from:number,to:number|'out'){const end=to==='out'?Math.min(4,from+1):to;return bases.slice(from,end+1).map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join(' ');}
export function BallField({event,fielders,pitcher,bases:occupied,outs,duration,reduced,paused,decision}:{event:PlayEvent|null;fielders:MatchPlayer[];pitcher?:MatchPlayer;bases:(BaseRunner|null)[];outs:number;duration:number;reduced:boolean;paused:boolean;decision:boolean}){
 const svg=useRef<SVGSVGElement>(null);
 useEffect(()=>{if(paused)svg.current?.pauseAnimations();else svg.current?.unpauseAnimations();},[paused,event]);
 const defenders=[...fielders.filter(p=>p.position!=='DH'),...(pitcher?[pitcher]:[])];
 const direction=event?.direction??'center',ground=event?.ball==='ground',homer=event?.outcome==='homer';
 const target:[number,number]=ground?[direction==='left'?245:direction==='right'?405:333,275]:[direction==='left'?145:direction==='right'?495:320,homer?61:165];
 const ballPath=event?.ball==='fly'?`M320,430 Q${(320+target[0])/2},${homer?-75:-5} ${target[0]},${target[1]}`:`M320,430 L${target[0]},${target[1]}`;
 const moving=new Set(event?.moves.map(m=>m.runner.id)??[]);
 const effect=event?resultEffect(event):null;
 return <div className={`ballpark ${decision?'decision':''} ${effect?.tone??''} ${effect?.large?'major-play':'minor-play'} ${paused?'paused':''}`}><svg ref={svg} viewBox="0 0 640 480" role="img" aria-label={`야구장 · ${outs}아웃 · ${occupied.map((r,i)=>r?`${i+1}루 ${r.name}`:'').filter(Boolean).join(', ')||'주자 없음'}`}>
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#f6deae"/><stop offset="1" stopColor="#faeed6"/></linearGradient><pattern id="mown" width="90" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="90" height="90" fill="#497c56"/><rect width="45" height="90" fill="#52885b"/></pattern><filter id="ballShadow"><feGaussianBlur stdDeviation="2"/></filter></defs>
  <rect width="640" height="480" fill="url(#sky)"/><path d="M0 88Q320-34 640 88V202H0Z" fill="#c5b691"/><path d="M0 108Q320-13 640 108M0 122Q320 2 640 122" fill="none" stroke="#e5d7b5" strokeWidth="10"/>
  <path d="M320 456L48 194Q30 89 320 80Q610 89 592 194Z" fill="url(#mown)" stroke="#284c40" strokeWidth="14"/>
  <path d="M48 194Q30 89 320 80Q610 89 592 194" fill="none" stroke="#edca67" strokeWidth="4"/>
  <text x="320" y="99" textAnchor="middle" fill="#ecdfbd" fontSize="11" letterSpacing="5">CHEONGRAM BASEBALL CLUB</text>
  <path d="M320 438L187 315L320 188L453 315Z" fill="#caa271"/><path d="M320 405L223 315L320 221L417 315Z" fill="#6c975f"/>
  <path d="M48 181L320 432L592 181M320 432L196 315L320 199L444 315Z" stroke="#f9f3de" strokeWidth="2" fill="none"/>
  <circle cx="320" cy="312" r="15" fill="#caa271"/><path d="M313 310H327" stroke="#fff9e9" strokeWidth="3"/>
  {bases.slice(1,4).map(([x,y],i)=><rect key={i} x={x-5} y={y-5} width="10" height="10" fill="#fffbed" transform={`rotate(45 ${x} ${y})`}/>)}<path d="M314 427H326V434L320 440L314 434Z" fill="#fffbed"/>
  {defenders.map(p=>{const xy=positions[p.position];if(!xy)return null;return <g key={p.id} transform={`translate(${xy[0]},${xy[1]})`}><ellipse cy="11" rx="11" ry="4" fill="#173c2d" opacity=".25"/><circle r="11" fill={p.id==='player'?'#dfa930':'#fcf6e7'} stroke="#293c50" strokeWidth="2"/><text y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#253f48">{p.id==='player'?'★':p.position==='P'?'P':p.slot}</text><text y="27" textAnchor="middle" fill="#fffdf2" fontSize="11" fontWeight="600" stroke="#365a42" strokeWidth="2" paintOrder="stroke">{p.name}</text></g>;})}
  {occupied.map((r,i)=>r&&(!event||!moving.has(r.id))?<g key={r.id} transform={`translate(${bases[i+1][0]},${bases[i+1][1]-16})`}><circle r="10" fill="#f0b83c" stroke="#533f1e" strokeWidth="2"/><text y="4" textAnchor="middle" fontSize="10">{r.id==='player'?'★':i+1}</text></g>:null)}
  {event?.moves.map((move,i)=>{const end=move.to==='out'?Math.min(4,move.from+1):move.to,xy=bases[end];return <g key={`${event.inning}-${event.half}-${event.order}-${event.kind}-${i}`} transform={reduced?`translate(${xy[0]},${xy[1]})`:undefined} opacity={move.to==='out'?.55:1}><circle r="9" fill="#f3bd40" stroke="#5c4021" strokeWidth="2"/><text y="4" textAnchor="middle" fontSize="10">{move.runner.id==='player'?'★':'●'}</text>{!reduced&&<animateMotion dur={`${Math.max(200,duration*.85)}ms`} fill="freeze" path={runnerPath(move.from,move.to)}/>}</g>;})}
  {event?.ball&&<g key={`ball-${event.inning}-${event.half}-${event.order}`}><path d={ballPath} stroke="#fff1b0" strokeWidth={ground?2:3} strokeDasharray={ground?'4 5':undefined} fill="none" opacity=".55"/>{event.ball==='fly'&&<ellipse cx={target[0]} cy={target[1]} rx="9" ry="3" fill="#203b2c" opacity=".4" filter="url(#ballShadow)"/>}<circle cx={reduced?target[0]:0} cy={reduced?target[1]:0} r="4" fill="white" stroke="#a23e32" strokeWidth="1">{!reduced&&<animateMotion dur={`${Math.max(200,duration*.55)}ms`} fill="freeze" path={ballPath}/>}</circle>{event.fielder&&<circle cx={target[0]} cy={target[1]} r="15" fill="none" stroke="#f9df8a" strokeDasharray="3 4"/>}</g>}
  {effect?.hit&&<g className="hit-burst" key={`hit-${event!.inning}-${event!.half}-${event!.order}`} transform={`translate(${target[0]} ${target[1]})`}><circle r="24" fill="none" stroke="#ffe3a1" strokeWidth="5"/>{Array.from({length:8},(_,i)=><path key={i} d="M0 -31L0 -44" transform={`rotate(${i*45})`} stroke="#ffecb7" strokeWidth="4"/>)}</g>}
  {effect?.catch&&<g className="glove-catch" transform={`translate(${target[0]} ${target[1]})`}><path d="M-15 7Q-24-12-17-16L-8-5Q-14-29-5-26L1-8Q0-31 9-24L10-6Q19-22 23-12L15 12Q0 27-15 7Z" fill="#aa6d37" stroke="#f3d2a0" strokeWidth="3"/><circle r="5" fill="#fff9de"/></g>}
  {event?.outcome==='doublePlay'&&<path className="double-play-line" d="M320 199L444 315" stroke="#ffe6a5" strokeWidth="6" strokeDasharray="9 5" fill="none"/>}
 </svg>{event&&effect&&<div className={`play-banner ${event.outcome==='homer'?'homer-banner':''}`} key={`${event.inning}-${event.half}-${event.order}`}><span>{event.outcome==='doublePlay'?'DP · ':''}{effect.label}</span>{event.runs>0&&<small>+{event.runs} RUN</small>}</div>}{decision&&<div className="decision-ribbon">YOUR TURN · 승부를 선택하세요</div>}</div>;
}
