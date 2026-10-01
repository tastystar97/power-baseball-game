import type {CardContent,CardPack} from './schema.ts';
import {validateContent,validatePack} from './pack.ts';
export const DECK_SIZE=6;
export const coreBasics=['contact_focus','power_drive','patient_eye','fastball_edge','precision','breaking_read','calm','steady'];
export function catalogFromPacks(packs:CardPack[]):CardContent {
  if(new Set(packs.map(p=>p.id)).size!==packs.length)throw Error('같은 팩이 중복 등록되었습니다.');
  const all:CardContent={cards:[],skills:[],events:[],images:{}};
  for(const raw of packs){
    const p=validatePack(raw),id=(s:string)=>p.id==='core'?s:`${p.id}/${s}`,image=(n:string)=>`${p.id.length}_${p.id}_${n}`;
    all.cards.push(...p.cards.map(c=>({...c,id:id(c.id),...(c.portrait?{portrait:image(c.portrait)}:{}),hints:{batter:c.hints.batter?id(c.hints.batter):null,pitcher:c.hints.pitcher?id(c.hints.pitcher):null},ultimates:{batter:c.ultimates.batter?id(c.ultimates.batter):null,pitcher:c.ultimates.pitcher?id(c.ultimates.pitcher):null}})));
    all.skills.push(...p.skills.map(s=>({...s,id:id(s.id),family:id(s.family),...(s.owner?{owner:id(s.owner)}:{}),...(s.prerequisite?{prerequisite:id(s.prerequisite)}:{})})));
    all.events.push(...p.events.map(e=>({...e,id:id(e.id),owner:id(e.owner),...(e.previous?{previous:id(e.previous)}:{}),choices:e.choices.map(c=>({...c,hints:c.hints.map(id),unlocks:c.unlocks.map(id)})) as typeof e.choices})));
    for(const [n,img] of Object.entries(p.images))all.images[image(n)]=img;
  }
  return validateContent(all);
}
export function catalogForDeck(content:CardContent,ids:string[]):CardContent {
  if(ids.length!==DECK_SIZE||new Set(ids).size!==DECK_SIZE||ids.some(id=>!content.cards.some(c=>c.id===id)))throw Error('서로 다른 서포트 카드 6장을 선택해 주세요.');
  return catalogForCards(content,ids);
}
export function catalogForCards(content:CardContent,ids:string[]):CardContent {
  if(new Set(ids).size!==ids.length||ids.some(id=>!content.cards.some(c=>c.id===id)))throw Error('보유 카드가 라이브러리와 다릅니다.');
  const cards=content.cards.filter(c=>ids.includes(c.id)),events=content.events.filter(e=>ids.includes(e.owner)),needed=new Set(coreBasics.filter(id=>content.skills.some(s=>s.id===id)));
  for(const c of cards)for(const id of [...Object.values(c.hints),...Object.values(c.ultimates)])if(id)needed.add(id);
  for(const e of events)for(const c of e.choices)for(const id of [...c.hints,...c.unlocks])needed.add(id);
  for(const id of needed){const base=content.skills.find(s=>s.id===id)?.prerequisite;if(base)needed.add(base);}
  const pictures=new Set(cards.flatMap(c=>c.portrait?[c.portrait]:[]));
  return structuredClone(validateContent({cards,events,skills:content.skills.filter(s=>needed.has(s.id)),images:Object.fromEntries(Object.entries(content.images).filter(([n])=>pictures.has(n)))}));
}
