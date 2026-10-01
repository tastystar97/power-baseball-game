import {useState} from 'react';
import type {CardContent,SupportCard} from '../cards/schema.ts';
import type {Role,StatKey} from '../game/types.ts';
import {primaryLabels,primaryKeys,labels} from '../game/types.ts';
import {activities} from '../content/activities.ts';
export const recommendedDeck=(role:Role)=>role==='batter'?['bat_senior','sera','narin','yerin','sumin','manager']:['pitch_senior','chaerin','sua','dohee','rina','manager'];
export function CardAvatar({card,content}:{card:SupportCard;content:Pick<CardContent,'images'>}){
 const image=card.portrait?content.images[card.portrait]:null;
 const [failed,setFailed]=useState('');const src=image?`data:${image.mime};base64,${image.data}`:'';
 return <span className="card-avatar" style={{background:card.color}}>{src&&failed!==src?<img src={src} alt={`${card.name} 일러스트`} onError={()=>setFailed(src)}/>:<span aria-hidden="true">{card.name.slice(0,1)}</span>}</span>;
}
export function DeckBuilder({content,role,selected,onChange}:{content:CardContent;role:Role;selected:string[];onChange:(ids:string[])=>void}){
 const [query,setQuery]=useState(''),[specialty,setSpecialty]=useState('all'),[compatible,setCompatible]=useState(false);
 const training=activities({role,phase:'weekday'});
 const filtered=content.cards.filter(c=>(c.name+c.title+c.role).includes(query)&&(specialty==='all'||(c.specialty||'recovery')===specialty)&&(!compatible||c.hints[role]));
 return <section className="deck-builder"><h2>이번 육성의 파트너</h2><p className="lead">서포트 6장이 여름 대회까지 함께합니다. 덱 전체가 훈련에 동행하고 전반·후반 활동 뒤 사건의 주인공이 됩니다.</p>
 <div className="deck-summary" aria-live="polite"><strong>육성 덱 {selected.length} / 6</strong><div className="deck-slots">{selected.map(id=>{const c=content.cards.find(c=>c.id===id)!;return <button type="button" key={id} onClick={()=>onChange(selected.filter(k=>k!==id))} aria-label={`${c.name} 덱에서 제외`}>{c.name} ×</button>;})}{Array.from({length:Math.max(0,6-selected.length)},(_,i)=><span key={i} className="empty-slot">빈 자리</span>)}</div><p className="reason">{[...primaryKeys,'recovery' as const].map(k=>{const n=selected.filter(id=>(content.cards.find(c=>c.id===id)?.specialty||'recovery')===k).length;return n?`${k==='recovery'?'회복':primaryLabels[k]} ${n}`:'';}).filter(Boolean).join(' · ')}</p></div>
 <div className="card-filters"><label>인물 찾기<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름·역할 검색"/></label><label>전문 능력<select value={specialty} onChange={e=>setSpecialty(e.target.value)}><option value="all">모든 전문</option>{primaryKeys.map(k=><option key={k} value={k}>{primaryLabels[k]}</option>)}<option value="recovery">회복</option></select></label><label className="check-label"><input type="checkbox" checked={compatible} onChange={e=>setCompatible(e.target.checked)}/>내 역할 스킬 보유</label><button type="button" onClick={()=>onChange(recommendedDeck(role))}>균형 덱 추천</button><button type="button" onClick={()=>onChange([])}>모두 비우기</button></div>
 <div className="deck-grid" role="group" aria-label="서포트 카드 선택">{filtered.map(c=>{
 const picked=selected.includes(c.id),hint=content.skills.find(k=>k.id===c.hints[role]),upper=content.skills.find(k=>k.id===c.ultimates[role]);
 const bonds=[...new Set(content.events.filter(e=>e.owner===c.id&&e.kind==='growth').map(e=>e.bond))].sort((a,b)=>a-b);
 const requirements=upper?Object.entries(upper.requires).filter(([,value])=>value).map(([key,value])=>`${labels[key as StatKey]} ${value}`).join(' · '):'';
 return <button type="button" className="card deck-card" key={c.id} aria-pressed={picked} disabled={!picked&&selected.length===6} onClick={()=>onChange(picked?selected.filter(id=>id!==c.id):[...selected,c.id])}><span className="support-heading"><CardAvatar card={c} content={content}/><span><strong>{c.name}</strong><span className="desc block">{c.title}</span><span className="chip">{c.specialty?primaryLabels[c.specialty]:'회복'} 전문</span></span><span className="selection-mark">{picked?'✓':'+'}</span></span><span className="desc">{c.description}</span><span className="reason">동행 · {c.training[role].map(id=>training.find(a=>a.id===id)?.title).join(' / ')}</span><span className="reward-caption">{hint?`${hint.name} → ${upper?.name||'일반 스킬 조언'}`:'현재 역할은 훈련·회복 지원'}</span><span className="reason">{upper?`인연 ${bonds.join(' / ')} 성장 사건 · 고유 상위 개방`:'사건과 인연에 따른 성장 보너스'}</span>{upper&&<span className="reason">습득 · 선행 일반 스킬{requirements?` · ${requirements}`:''} · {upper.cost} Pt (힌트 할인 전)</span>}</button>;
 })}</div>{!filtered.length&&<p className="notice">조건에 맞는 카드가 없습니다.</p>}</section>;
}
