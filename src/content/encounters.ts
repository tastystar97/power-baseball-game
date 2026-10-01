import type {GameState} from '../game/types.ts';
import {bond,supportById} from './supports.ts';
import {random,clamp} from '../game/random.ts';
import {resolveGrowth} from '../game/abilities.ts';
import {weekKey} from '../game/season.ts';
import {builtinPack} from '../cards/builtin.ts';
import {recoveryStress} from '../game/character.ts';
export const encounterIds=builtinPack.events.map(e=>e.id);
export const encounterOwner=(id:string,s?:GameState)=>(s?.content.events||builtinPack.events).find(e=>e.id===id)!.owner;
export function encounterContent(s:GameState,id:string){
 const e=s.content.events.find(e=>e.id===id);if(!e)throw Error('알 수 없는 카드 사건입니다.');
 const p=supportById(e.owner,s);
 return {...e,speaker:`${p.name} · ${p.role}`,choices:e.choices.map(c=>({...c,energy:clamp(s.energy+c.energy)-s.energy,stress:clamp(s.stress+recoveryStress(s,c.stress))-s.stress,trust:clamp(s.trust+c.trust)-s.trust,bond:Math.min(c.bond,100-bond(s,e.owner)),points:Math.min(c.points,1000-s.skillPoints),...resolveGrowth(s,c.gains),hint:[`인연 +${Math.min(c.bond,100-bond(s,e.owner))}`,c.hints.some(id=>s.content.skills.some(k=>k.id===id&&(k.role==='both'||k.role===s.role)))?'일반 스킬 힌트':'',c.unlocks.some(id=>s.content.skills.some(k=>k.id===id&&(k.role==='both'||k.role===s.role)))?'상위 스킬 개방':''].filter(Boolean).join(' · ')}))};
}
export function drawEncounter(s:GameState):void {
 const key=weekKey(s.month,s.week),part=s.weekdayPart;
 if(s.encounterHistory.some(e=>e.key===key&&e.part===part))return;
 const last=s.encounterHistory.at(-1),dry=s.encounterHistory.length>=2&&s.encounterHistory.slice(-2).every(e=>e.eventId===null);
 const happens=random(s)<.75||dry;
 const candidates=s.content.events.filter(e=>s.supports.includes(e.owner)&&e.id!==last?.eventId&&bond(s,e.owner)>=e.bond&&(!e.previous||s.supportCompleted.includes(e.previous))&&(e.kind!=='growth'||!s.supportCompleted.includes(e.id)));
 const growth=candidates.filter(e=>e.kind==='growth'),pool=growth.length?growth:candidates;
 const owners=[...new Set(pool.map(e=>e.owner))];
 let picked:typeof pool[number]|undefined;
 if(happens&&owners.length){const owner=owners[Math.floor(random(s)*owners.length)],events=pool.filter(e=>e.owner===owner);picked=events[Math.floor(random(s)*events.length)];}
 s.encounterHistory.push({key,part,eventId:picked?.id||null,support:picked?.owner||null,choice:null});
 s.activeEncounter=picked?.id||null;s.activeSupport=picked?.owner||null;
 if(picked)s.phase='supportEvent';
}
