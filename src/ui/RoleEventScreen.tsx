import type {Action,GameState} from '../game/types.ts';
import {roleChoices} from '../game/career-role.ts';
import {careerEvents} from '../content/career-events.ts';
import {Background,Portrait} from './common.tsx';
export function RoleEventScreen({s,send}:{s:GameState;send:(a:Omit<Action,'revision'>)=>void}){const event=careerEvents[s.career.pending!];return <><Background id="ground" banner/><h1 tabIndex={-1} className="screen-title">감독 면담 · {event.title}</h1><section className="scene-card"><div className="event-body"><Portrait id="coach"/><div><p className="speaker">청람고 감독</p><p className="quote">{event.text}</p></div></div><div className="cards one">{roleChoices(s).map(c=><button key={c.id} className="card" disabled={c.disabled} onClick={()=>send({type:'choice',id:c.id})}><strong>{c.label}</strong><span className="desc">{c.hint}</span></button>)}</div><p className="muted gap-top">이번 시즌의 역할을 정합니다. 면담 뒤에는 이번 주말 활동이 이어집니다.</p></section></>;}
