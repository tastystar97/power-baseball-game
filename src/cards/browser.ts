import {decodePack,encodePack,PACK_LIMIT} from './pack.ts';
import type {CardPack} from './schema.ts';
export const errorText=(e:unknown)=>e instanceof Error?e.message:'처리하지 못했습니다. 다시 시도해 주세요.';
export async function readPackFile(file:File){if(file.size>PACK_LIMIT)throw Error('카드팩은 20MB 이하만 지원합니다.');return decodePack(new Uint8Array(await file.arrayBuffer()));}
export function downloadPack(pack:CardPack){
 const bytes=encodePack(pack),url=URL.createObjectURL(new Blob([bytes.slice().buffer],{type:'application/zip'}));
 const a=document.createElement('a');a.href=url;a.download=`${pack.id}-r${pack.revision}.cardpack`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
