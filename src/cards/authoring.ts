import {builtinPack} from './builtin.ts';
import {subsetPack,validatePack} from './pack.ts';
import {catalogFromPacks} from './catalog.ts';
import type {CardPack} from './schema.ts';
import type {Role} from '../game/types.ts';
import {createGame,previewActivity} from '../game/engine.ts';
import {createMatch,tactics} from '../game/match.ts';

export function duplicateCard(input:CardPack,id:string,newId:string):CardPack {
  if(input.cards.some(c=>c.id===newId))throw Error('이미 같은 카드 ID가 있습니다.');
  const part=subsetPack(input,[id]),p=structuredClone(input);
  const skillIds=new Map(part.skills.map((s,i)=>[s.id,`${newId}_skill_${i}`]));
  const families=new Map([...new Set(part.skills.map(s=>s.family))].map((id,i)=>[id,`${newId}_family_${i}`]));
  const eventIds=new Map(part.events.map((e,i)=>[e.id,`${newId}_event_${i}`]));
  const refs=(r:Record<Role,string|null>)=>({batter:r.batter?skillIds.get(r.batter)!:null,pitcher:r.pitcher?skillIds.get(r.pitcher)!:null});
  const card=part.cards[0];p.cards.push({...card,id:newId,name:`${card.name} 복사`,hints:refs(card.hints),ultimates:refs(card.ultimates)});
  p.skills.push(...part.skills.map(s=>({...s,id:skillIds.get(s.id)!,family:families.get(s.family)!,...(s.owner?{owner:newId}:{}),...(s.prerequisite?{prerequisite:skillIds.get(s.prerequisite)!}:{})})));
  p.events.push(...part.events.map(e=>({...e,id:eventIds.get(e.id)!,owner:newId,...(e.previous?{previous:eventIds.get(e.previous)!}:{}),choices:e.choices.map(c=>({...c,hints:c.hints.map(id=>skillIds.get(id)!),unlocks:c.unlocks.map(id=>skillIds.get(id)!)})) as typeof e.choices})));
  return validatePack(p);
}
function pruneDraft(p:CardPack):CardPack {
  const needed=new Set(p.cards.flatMap(c=>[...Object.values(c.hints),...Object.values(c.ultimates)]));
  for(const e of p.events)for(const c of e.choices)for(const id of [...c.hints,...c.unlocks])needed.add(id);
  for(const id of needed){const parent=p.skills.find(s=>s.id===id)?.prerequisite;if(parent)needed.add(parent);}
  p.skills=p.skills.filter(s=>needed.has(s.id));
  const images=new Set(p.cards.map(c=>c.portrait));p.images=Object.fromEntries(Object.entries(p.images).filter(([id])=>images.has(id)));
  return p;
}
export function deleteCard(input:CardPack,id:string):CardPack {
  const p=structuredClone(input);p.cards=p.cards.filter(c=>c.id!==id);p.events=p.events.filter(e=>e.owner!==id);
  return pruneDraft(p);
}
export function setCardSkill(input:CardPack,cardId:string,role:Role,kind:'hints'|'ultimates',id:string|null):CardPack {
  const p=structuredClone(input),card=p.cards.find(c=>c.id===cardId)!;
  card[kind][role]=id;
  if(kind==='hints'&&card.ultimates[role]&&p.skills.find(k=>k.id===card.ultimates[role])?.prerequisite!==id)card.ultimates[role]=null;
  if(kind==='ultimates'&&id)card.hints[role]=p.skills.find(k=>k.id===id)?.prerequisite||null;
  for(const e of p.events.filter(e=>e.owner===cardId))for(const choice of e.choices){
    choice.hints=choice.hints.filter(id=>Object.values(card.hints).includes(id));
    choice.unlocks=choice.unlocks.filter(id=>Object.values(card.ultimates).includes(id));
  }
  return pruneDraft(p);
}
export function setCardImage(input:CardPack,cardId:string,image:CardPack['images'][string],assetId:string):CardPack {
  const p=structuredClone(input),card=p.cards.find(c=>c.id===cardId)!;
  const ext=image.mime==='image/png'?'png':image.mime==='image/webp'?'webp':'jpg',name=`${assetId}.${ext}`;
  if(p.images[name])throw Error('그림 파일 식별자가 중복되었습니다.');
  card.portrait=name;p.images[name]=structuredClone(image);
  const used=new Set(p.cards.map(c=>c.portrait));p.images=Object.fromEntries(Object.entries(p.images).filter(([id])=>used.has(id)));
  return p;
}
export function newDraft():CardPack {
  return {...subsetPack(builtinPack,['classmate']),id:'my-team',name:'나의 서포트 팩',author:'',description:'나만의 야구 파트너와 성장 이야기를 만들어 보세요.'};
}
export function addTemplate(p:CardPack,id:string):CardPack {
  const template=newDraft();const copied=duplicateCard(template,template.cards[0].id,id),part=subsetPack(copied,[id]);
  return {...p,cards:[...p.cards,...part.cards],skills:[...p.skills,...part.skills],events:[...p.events,...part.events]};
}
export function addSkillPair(input:CardPack,cardId:string,role:Role,family:string):CardPack {
  const p=structuredClone(input),card=p.cards.find(c=>c.id===cardId);
  if(!card)throw Error('카드를 찾을 수 없습니다.');
  const normal=`${family}_normal`,upper=`${family}_upper`;
  if(p.skills.some(k=>[normal,upper].includes(k.id)))throw Error('이미 같은 스킬 ID가 있습니다.');
  const oldNormal=card.hints[role],oldUpper=card.ultimates[role];
  card.hints[role]=normal;card.ultimates[role]=upper;
  const conditions=[{kind:'tactic' as const,values:[role==='batter'?'contact' as const:'fastball' as const]}];
  const effects=[{kind:'probability' as const,from:'out' as const,to:role==='batter'?'single' as const:'strikeout' as const,amount:.03}];
  p.skills.push({id:normal,family,tier:'normal',role,name:role==='batter'?'새 타격 기술':'새 구종',description:'나만의 승부 기술입니다.',cost:14,requires:{},conditions,effects},
    {id:upper,family,tier:'advanced',role,name:role==='batter'?'완성된 타격 기술':'완성된 결정구',description:'고유 사건으로 개방되는 상위 기술입니다.',cost:24,requires:{},conditions:structuredClone(conditions),effects:[{...effects[0],amount:.06}],prerequisite:normal,owner:card.id});
  const growth=p.events.filter(e=>e.owner===card.id&&e.kind==='growth');
  if(!growth.length)throw Error('먼저 이 카드의 성장 사건을 추가해 주세요.');
  const final=growth.find(e=>!growth.some(other=>other.previous===e.id))!;
  for(const e of p.events.filter(e=>e.owner===card.id))for(const choice of e.choices){
    if(oldNormal&&!Object.values(card.hints).includes(oldNormal))choice.hints=choice.hints.filter(id=>id!==oldNormal);
    if(oldUpper&&!Object.values(card.ultimates).includes(oldUpper))choice.unlocks=choice.unlocks.filter(id=>id!==oldUpper);
    if(e.id===growth[0].id)choice.hints=[...new Set([...choice.hints,normal])];
    if(e.id===final.id)choice.unlocks=[...new Set([...choice.unlocks,upper])];
  }
  const needed=new Set(p.cards.flatMap(c=>[...Object.values(c.hints),...Object.values(c.ultimates)]));
  for(const e of p.events)for(const c of e.choices)for(const id of [...c.hints,...c.unlocks])needed.add(id);
  for(const id of needed){const parent=p.skills.find(s=>s.id===id)?.prerequisite;if(parent)needed.add(parent);}
  p.skills=p.skills.filter(s=>needed.has(s.id));
  return p;
}
export function previewCard(input:CardPack,id:string,role:Role,bond:number,learned:'none'|'normal'|'upper',context={inning:7,outs:2,energy:40,stress:30,runners:true,behind:true}) {
  const pack={...validatePack(input),id:'editor_preview'},content=catalogFromPacks([builtinPack,pack]);
  const cardId=`editor_preview/${id}`,card=content.cards.find(c=>c.id===cardId)!;
  const s=createGame('미리 보기',role,71,content,['bat_senior','pitch_senior','rival','catcher','manager',cardId]);
  s.bonds[cardId]=bond;s.energy=context.energy;s.stress=context.stress;
  s.placements={[cardId]:card.training[role][0]};
  const activity=previewActivity(s,card.training[role][0])!;
  s.match=createMatch();s.match.inning=context.inning;s.match.outs=context.outs;s.match.score=context.behind?[2,0]:[0,2];s.match.bases[0]=context.runners?{owner:'team'}:null;
  const base=tactics(s);s.skills=learned==='upper'?[card.hints[role],card.ultimates[role]].filter((id):id is string=>Boolean(id)):learned==='normal'&&card.hints[role]?[card.hints[role]!]:[];
  return {activity,tactics:tactics(s),base};
}
