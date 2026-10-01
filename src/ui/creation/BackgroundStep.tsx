import {backgrounds} from '../../content/backgrounds.ts';
import type {BackgroundGroup} from '../../content/backgrounds.ts';
import type {BackgroundChoice} from '../../game/character.ts';
import {chosenBackgrounds} from '../../game/character.ts';
import {backgroundBudget} from '../../game/creation.ts';
import type {CreationDraft} from '../../game/creation.ts';
const groups:{id:BackgroundGroup;label:string;hint:string}[]=[
 {id:'origin',label:'어디에서 왔을까',hint:'출신 · 하나 선택'},
 {id:'body',label:'그라운드 위의 몸',hint:'체격 · 하나 선택'},
 {id:'personality',label:'승부를 대하는 마음',hint:'성격 · 하나 선택'},
 {id:'specialties',label:'나만의 장점',hint:'특기 · 여러 개 선택 가능'},
 {id:'weaknesses',label:'넘어야 할 과제',hint:'약점 · 최대 2개, 포인트를 돌려받음'},
];
export function BackgroundStep({draft:d,busy,onChange}:{draft:CreationDraft;busy:boolean;onChange:(choice:BackgroundChoice)=>void}){
 const budget=backgroundBudget(d),picked=chosenBackgrounds(d.background);
 function choose(id:string,group:BackgroundGroup){
  const c=structuredClone(d.background);
  if(group==='specialties'||group==='weaknesses')c[group]=c[group].includes(id)?c[group].filter(k=>k!==id):[...c[group],id];
  else {c[group]=id;if(group==='origin'&&id!=='other_sport')c.sportFocus=null;}
  onChange(c);
 }
 return <><div className="creation-budget" aria-live="polite"><strong>남은 포인트 <b>{budget.remaining}</b></strong><span>기본 10{budget.budget===12?' + D등급 보너스 2':''} · 약점 {d.background.weaknesses.length}/2</span></div>
 {groups.map(g=><fieldset className="background-group" key={g.id} disabled={busy}><legend>{g.label} <small>{g.hint}</small></legend><div className="background-grid">{backgrounds.filter(b=>b.group===g.id).map(b=><button type="button" key={b.id} className="background-option" aria-pressed={picked.includes(b.id)} disabled={!!b.unavailable||g.id==='weaknesses'&&!picked.includes(b.id)&&d.background.weaknesses.length===2} onClick={()=>choose(b.id,g.id)}><span className="background-option-head"><strong>{b.name}</strong><b>{b.cost<0?`+${-b.cost}`:b.cost===0?'무료':`${b.cost} Pt`}</b></span><span>{b.description}</span>{b.unavailable&&<small>{b.unavailable}</small>}</button>)}</div>
 {g.id==='origin'&&d.background.origin==='other_sport'&&<div className="actions" role="group" aria-label="다른 운동의 강점">{(['power','endurance'] as const).map(k=><button key={k} type="button" aria-pressed={d.background.sportFocus===k} onClick={()=>onChange({...d.background,sportFocus:k})}>{k==='power'?'파워':'지구력'} +60</button>)}</div>}
 </fieldset>)}
 {!budget.valid&&<p className="notice" role="status">{budget.errors.join(' ')}</p>}
 </>;
}
