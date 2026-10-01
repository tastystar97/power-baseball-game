import {upgradePack} from './upgrade.ts';
import {packSchema} from './schema.ts';
import type {CardPack} from './schema.ts';
/** Drafts may violate content bounds, but must retain the editor's typed structure. */
export function readDraftPack(raw:string):CardPack {
 const envelope=JSON.parse(raw);if(envelope?.format!=='editor-draft-1')throw Error('초안 형식을 읽을 수 없습니다.');
 const p=upgradePack(envelope.unfinished||envelope.pack),result=packSchema.safeParse(p);
 if(!result.success&&result.error.issues.some(i=>!['too_small','too_big','invalid_format','custom'].includes(i.code)))throw Error('초안 구조가 손상되었거나 지원하지 않는 형식입니다.');
 return result.success?result.data:p as CardPack;
}
