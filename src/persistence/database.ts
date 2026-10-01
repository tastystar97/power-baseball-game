import {validatePack} from '../cards/pack.ts';
import {catalogFromPacks} from '../cards/catalog.ts';
import {builtinPack} from '../cards/builtin.ts';
import {equalData} from './rivalry-validation.ts';
import {parseSave} from './save.ts';
import type {LoadResult} from './save.ts';
import type {CardPack} from '../cards/schema.ts';
import type {GameState} from '../game/types.ts';
import {parseCreation} from '../game/creation.ts';
import type {CreationDraft} from '../game/creation.ts';

export function createDatabase(factory:IDBFactory|undefined,name='last-summer-v7') {
  let opened:Promise<IDBDatabase>|undefined;
  function open():Promise<IDBDatabase> {
    if(!factory)return Promise.reject(Error('브라우저 저장소를 사용할 수 없습니다.'));
    return opened??=new Promise((resolve,reject)=>{
      const request=factory.open(name,1);
      request.onupgradeneeded=()=>{for(const key of ['packs','session','draft'])request.result.createObjectStore(key);};
      request.onerror=()=>{opened=undefined;reject(request.error);};
      request.onblocked=()=>{opened=undefined;reject(Error('다른 창에서 저장소를 사용 중입니다. 창을 닫은 뒤 다시 시도해 주세요.'));};
      request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opened=undefined;};resolve(request.result);};
    });
  }
  async function read<T>(store:string,key?:string):Promise<T> {
    const db=await open();return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly'),req=key===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(key);
      tx.oncomplete=()=>resolve(req.result as T);tx.onabort=()=>reject(tx.error||Error('저장소 읽기에 실패했습니다.'));
    });
  }
  async function write(store:string,key:string,value:unknown,remove=false) {
    const db=await open();return new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');if(remove)tx.objectStore(store).delete(key);else tx.objectStore(store).put(value,key);
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('저장할 수 없습니다. 기존 데이터는 보존됩니다.'));
    });
  }
  return {
    open,
    async listPacks():Promise<CardPack[]>{return (await read<unknown[]>('packs')).map(validatePack);},
    async importPack(input:CardPack,replaceRevision?:number):Promise<'added'|'duplicate'|'updated'> {
      const pack=validatePack(input);if(pack.id==='core')throw Error('기본 팩은 교체할 수 없습니다. 제작기에서 새 팩 ID를 지정해 주세요.');
      const db=await open();return new Promise((resolve,reject)=>{
        const tx=db.transaction('packs','readwrite'),store=tx.objectStore('packs'),req=store.getAll();
        let result:'added'|'duplicate'|'updated'='added',error:unknown;
        tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('카드팩을 저장하지 못했습니다.'));
        req.onsuccess=()=>{try{
          const all=(req.result as unknown[]).map(validatePack),old=all.find(p=>p.id===pack.id);
          if(old){
            if(equalData(old,pack)){result='duplicate';return;}
            if(pack.revision===old.revision)throw Error('같은 ID·개정의 내용이 충돌합니다. 제작기에서 개정을 올려 주세요.');
            if(pack.revision<old.revision)throw Error('더 낮은 개정으로 되돌릴 수 없습니다.');
            if(replaceRevision!==old.revision)throw Error('기존 카드팩 갱신 확인이 필요합니다.');
            result='updated';
          }
          catalogFromPacks([builtinPack,...all.filter(p=>p.id!==pack.id),pack]);
          store.put(pack,pack.id);
        }catch(e){error=e;tx.abort();}};
      });
    },
    async removePack(id:string){if(id==='core')throw Error('기본 팩은 삭제할 수 없습니다.');await write('packs',id,null,true);},
    async saveSession(state:GameState){const valid=parseSave(JSON.stringify(state));await write('session','current',valid);},
    async readCreation():Promise<CreationDraft|undefined>{const raw=await read<string|undefined>('draft','character');return raw===undefined?undefined:parseCreation(raw);},
    async writeCreation(draft:CreationDraft){const valid=parseCreation(JSON.stringify(draft));await write('draft','character',JSON.stringify(valid));},
    async admitPlayer(state:GameState){
      const valid=parseSave(JSON.stringify(state)),db=await open();
      return new Promise<void>((resolve,reject)=>{
        const tx=db.transaction(['session','draft'],'readwrite');
        tx.objectStore('session').put(valid,'current');tx.objectStore('draft').delete('character');
        tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('입학 정보를 저장하지 못했습니다.'));
      });
    },
    async loadSession(legacyRaw?:string|null):Promise<LoadResult>{
      let saved:unknown;try{saved=await read('session','current');}catch{return {kind:'unavailable',message:'저장소를 읽을 수 없습니다. 지금 플레이는 저장되지 않을 수 있습니다.'};}
      if(saved===undefined&&legacyRaw==null)return {kind:'empty'};
      try{return {kind:'ok',state:parseSave(saved===undefined?legacyRaw!:JSON.stringify(saved))};}
      catch{return {kind:'invalid',message:'이전 버전이거나 손상된 저장입니다. 새 선수를 확정하기 전까지 원본을 보존합니다.'};}
    },
    readDraft:()=>read<string|undefined>('draft','current'),
    writeDraft:(text:string)=>write('draft','current',text),
    close(){void opened?.then(db=>db.close());opened=undefined;},
  };
}
let shared:ReturnType<typeof createDatabase>|undefined;
export function database(){if(!shared){let factory:IDBFactory|undefined;try{factory=globalThis.indexedDB;}catch{}shared=createDatabase(factory);}return shared;}
