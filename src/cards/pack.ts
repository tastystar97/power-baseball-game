import {strFromU8,strToU8,zipSync,unzipSync} from 'fflate';
import {packSchema,contentSchema,requirementNames} from './schema.ts';
import {contentSchema as legacyContentSchema} from './legacy-schema.ts';
import {upgradePack} from './upgrade.ts';
import type {CardPack,CardContent} from './schema.ts';

export const PACK_LIMIT=20*1024*1024;
const fail=(message:string):never=>{throw new Error(message);};
export function imageBytes(data:string):Uint8Array {
  try {return Uint8Array.from(atob(data),c=>c.charCodeAt(0));}catch {return fail('이미지의 base64 데이터가 올바르지 않습니다.');}
}
export function base64(bytes:Uint8Array):string {
  let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(str);
}
export function validateContent(input:unknown):CardContent {
  const result=contentSchema.safeParse(input);
  if(!result.success)fail(result.error.issues.map(i=>`${i.path.join('.')} · ${i.message}`).join('\n'));
  const p=result.data!,cardMap=new Map(p.cards.map(c=>[c.id,c])),skillMap=new Map(p.skills.map(s=>[s.id,s])),eventMap=new Map(p.events.map(e=>[e.id,e]));
  for(const list of [p.cards,p.skills,p.events])if(new Set(list.map(x=>x.id)).size!==list.length)fail('카드·스킬·사건 ID가 중복되었습니다.');
  const skill=(id:string)=>skillMap.get(id)||fail(`스킬 참조를 찾을 수 없습니다: ${id}`);
  for(const c of p.cards){
    if(c.portrait&&!p.images[c.portrait])fail(`${c.name}: 초상화 ${c.portrait}가 없습니다.`);
    for(const r of ['batter','pitcher'] as const){
      const normal=c.hints[r],upper=c.ultimates[r];
      if(normal&&(skill(normal).tier!=='normal'||![r,'both'].includes(skill(normal).role)))fail(`${c.name}: ${r} 일반 스킬 역할이 맞지 않습니다.`);
      if(upper){const s=skill(upper);if(s.tier!=='advanced'||s.owner!==c.id||![r,'both'].includes(s.role)||s.prerequisite!==normal)fail(`${c.name}: 상위 스킬과 선행·소유 관계가 맞지 않습니다.`);}
    }
    if(new Set(c.training.batter).size!==c.training.batter.length||new Set(c.training.pitcher).size!==c.training.pitcher.length)fail(`${c.name}: 선호 활동이 중복되었습니다.`);
  }
  for(const s of p.skills){
    for(const role of s.role==='both'?['batter','pitcher'] as const:[s.role]){
      const allowed:readonly string[]=requirementNames;
      if(Object.entries(s.requires).some(([key,value])=>value!>0&&!allowed.includes(key)))fail(`${s.name}: ${role} 역할에서 달성할 수 없는 능력 조건입니다.`);
      const conditions=s.conditions.filter(c=>!c.role||c.role===role);
      let tactics:string[]=role==='batter'?['contact','power','patient','bunt']:['fastball','breaking','control','chase'];
      let opponents:string[]=role==='batter'?['wild','fast','tired']:['power','patient'];
      const ranges=new Map<string,[number,number]>(),fixed=new Map<string,unknown>();
      for(const c of conditions){
        if(c.kind==='tactic')tactics=tactics.filter(v=>c.values.some(k=>k===v));
        else if(c.kind==='opponent')opponents=opponents.filter(v=>c.values.some(k=>k===v));
        else if('min' in c){const prior=ranges.get(c.kind)||[c.min,c.max];const range:[number,number]=[Math.max(prior[0],c.min),Math.min(prior[1],c.max)];if(range[0]>range[1])fail(`${s.name}: 동시에 충족할 수 없는 ${c.kind} 조건입니다.`);ranges.set(c.kind,range);}
        else {const v=c.kind==='runners'?c.present:c.value;if(fixed.has(c.kind)&&fixed.get(c.kind)!==v)fail(`${s.name}: 서로 모순되는 ${c.kind} 조건입니다.`);fixed.set(c.kind,v);}
      }
      if(!tactics.length||!opponents.length)fail(`${s.name}: ${role} 역할에서 충족할 수 없는 작전·상대 조건입니다.`);
      const effects=s.effects.filter(e=>!e.role||e.role===role);
      if(!effects.length||role==='batter'&&effects.some(e=>e.kind==='burden'))fail(`${s.name}: ${role} 역할에 적용할 수 없는 효과입니다.`);
    }
    if(s.conditions.some(c=>'min' in c&&c.min>c.max))fail(`${s.name}: 조건의 최솟값이 최댓값보다 큽니다.`);
    if(s.effects.some(e=>e.kind==='probability'&&e.from===e.to))fail(`${s.name}: 같은 결과로 확률을 옮길 수 없습니다.`);
    if(s.role==='batter'&&s.effects.some(e=>e.kind==='burden'))fail(`${s.name}: 타자에게 투구 부담 효과를 줄 수 없습니다.`);
    if(s.tier==='advanced'){
      if(!s.prerequisite||!s.owner||!cardMap.has(s.owner))fail(`${s.name}: 상위 스킬에는 선행 일반 스킬과 소유 카드가 필요합니다.`);
      const base=skill(s.prerequisite!);
      if(base.tier!=='normal'||base.family!==s.family||!(base.role==='both'||base.role===s.role))fail(`${s.name}: 상위 스킬의 계열·선행 역할이 맞지 않습니다.`);
      if(!p.events.some(e=>e.owner===s.owner&&e.kind==='growth'&&e.choices.every(c=>c.unlocks.includes(s.id))))fail(`${s.name}: 모든 선택에서 도달할 수 있는 고유 개방 사건이 필요합니다.`);
    }else if(s.prerequisite||s.owner)fail(`${s.name}: 일반 스킬에는 상위 전용 참조를 둘 수 없습니다.`);
  }
  for(const e of p.events){
    const owner=cardMap.get(e.owner)||fail(`${e.title}: 인물 참조가 없습니다.`);
    if(e.kind==='daily'&&(e.previous||e.choices.some(c=>c.unlocks.length)))fail(`${e.title}: 일상 사건은 고유 개방 보상을 줄 수 없습니다.`);
    const seen=new Set([e.id]);let cur=e;
    while(cur.previous){
      const before=eventMap.get(cur.previous)||fail(`${e.title}: 선행 사건이 없습니다.`);
      if(seen.has(before.id))fail(`${e.title}: 선행 사건이 순환합니다.`);
      if(before.owner!==e.owner||before.kind!=='growth'||e.kind!=='growth'||before.bond>cur.bond)fail(`${e.title}: 선행 사건의 인물·종류·인연 조건이 맞지 않습니다.`);
      seen.add(before.id);cur=before;
    }
    for(const c of e.choices){
      for(const id of c.hints){if(skill(id).tier!=='normal')fail(`${e.title}: 일반 스킬만 힌트를 줄 수 있습니다.`);if(!Object.values(owner.hints).includes(id))fail(`${e.title}: 카드에 등록된 일반 스킬만 보상으로 줄 수 있습니다.`);}
      for(const id of c.unlocks)if(!Object.values(owner.ultimates).includes(id)||skill(id).tier!=='advanced'||skill(id).owner!==e.owner)fail(`${e.title}: 해당 인물의 상위 스킬만 개방할 수 있습니다.`);
    }
  }
  let total=0;
  if(Object.keys(p.images).length>100)fail('그림은 최대 100개입니다.');
  for(const [name,img] of Object.entries(p.images)){
    if(!/^[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(name))fail(`그림 파일 이름이 올바르지 않습니다: ${name}`);
    const b=imageBytes(img.data);total+=b.length;
    if(b.length>2*1024*1024||b.length<12)fail(`${name}: 그림은 2MB 이하의 유효한 파일이어야 합니다.`);
    const valid=img.mime==='image/png'?b[0]===137&&strFromU8(b.subarray(1,4))==='PNG'
      :img.mime==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255
      :strFromU8(b.subarray(0,4))==='RIFF'&&strFromU8(b.subarray(8,12))==='WEBP';
    if(!valid)fail(`${name}: 이미지 내용과 형식이 다릅니다.`);
  }
  if(total>PACK_LIMIT)fail('이미지 합계가 20MB를 초과합니다.');
  return p;
}
export function validatePack(input:unknown):CardPack {
  const result=packSchema.safeParse(upgradePack(input));
  if(!result.success)fail(result.error.issues.map(i=>`${i.path.join('.')} · ${i.message}`).join('\n'));
  const p=result.data!;
  for(const item of [...p.cards,...p.skills,...p.events])if(item.id.includes('/'))fail('팩 내부 ID에는 /를 사용할 수 없습니다.');
  validateContent({cards:p.cards,skills:p.skills,events:p.events,images:p.images});return p;
}
export function encodePack(input:CardPack):Uint8Array {
  const p=validatePack(input),{cards,skills,events,images,...meta}=p;
  const files:Record<string,Uint8Array>={'manifest.json':strToU8(JSON.stringify({...meta,images:Object.fromEntries(Object.entries(images).map(([n,i])=>[n,i.mime]))})),
    'content.json':strToU8(JSON.stringify({cards,skills,events}))};
  for(const [name,img] of Object.entries(images))files[`assets/${name}`]=imageBytes(img.data);
  const sizes=Object.values(files).map(bytes=>bytes.length);
  if(sizes.some(size=>size>2*1024*1024)||sizes.reduce((sum,size)=>sum+size,0)>25*1024*1024)fail('압축 전 파일은 각각 2MB, 전체는 25MB 이하로 나누어 내보내 주세요.');
  const bytes=zipSync(files,{level:6});if(bytes.length>PACK_LIMIT)fail('카드팩은 20MB 이하로 내보내 주세요.');return bytes;
}
export function decodePack(bytes:Uint8Array):CardPack {
  if(bytes.length>PACK_LIMIT)fail('카드팩 파일은 20MB 이하만 지원합니다.');
  if(bytes[0]!==80||bytes[1]!==75){
    if(bytes.length>2*1024*1024)fail('데이터 JSON은 2MB 이하만 지원합니다.');
    return validatePack(JSON.parse(strFromU8(bytes)));
  }
  let total=0;const names=new Set<string>();
  const files=unzipSync(bytes,{filter:f=>{
    if(names.has(f.name)||!(f.name==='manifest.json'||f.name==='content.json'||/^assets\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(f.name)))fail('중복되거나 지원하지 않는 압축 파일 경로입니다.');
    names.add(f.name);total+=f.originalSize;
    if(names.size>102||total>25*1024*1024||f.originalSize>2*1024*1024)fail('압축 해제 크기 또는 파일 수 제한을 초과합니다.');return true;
  }});
  if(!files['manifest.json']||!files['content.json'])fail('카드팩 설명 또는 콘텐츠가 없습니다.');
  const {images:index,...meta}=JSON.parse(strFromU8(files['manifest.json']));
  if(!index||typeof index!=='object'||Array.isArray(index))fail('이미지 목록이 올바르지 않습니다.');
  const images:CardPack['images']={};
  for(const [name,mime] of Object.entries(index)){
    const data=files[`assets/${name}`]||fail(`이미지 파일이 없습니다: ${name}`);images[name]={mime:mime as CardPack['images'][string]['mime'],data:base64(data)};
  }
  if(Object.keys(files).length!==Object.keys(images).length+2)fail('목록에 없는 이미지 파일이 있습니다.');
  const schema=meta.version===1?legacyContentSchema:contentSchema;
  const content=schema.omit({images:true}).parse(JSON.parse(strFromU8(files['content.json'])));
  return validatePack({...meta,...content,images});
}
export function subsetPack(input:CardPack,ids:string[]):CardPack {
  const p=validatePack(input),cards=p.cards.filter(c=>ids.includes(c.id));
  if(!ids.length||new Set(ids).size!==ids.length||cards.length!==ids.length)fail('내보낼 카드를 선택해 주세요.');
  const events=p.events.filter(e=>ids.includes(e.owner)),skills=new Set<string>();
  for(const c of cards)for(const id of [...Object.values(c.hints),...Object.values(c.ultimates)])if(id)skills.add(id);
  for(const e of events)for(const c of e.choices)for(const id of [...c.hints,...c.unlocks])skills.add(id);
  for(const id of skills){const base=p.skills.find(s=>s.id===id)?.prerequisite;if(base)skills.add(base);}
  const pictures=new Set(cards.flatMap(c=>c.portrait?[c.portrait]:[]));
  return validatePack({...p,cards,skills:p.skills.filter(s=>skills.has(s.id)),events,images:Object.fromEntries(Object.entries(p.images).filter(([n])=>pictures.has(n)))});
}
