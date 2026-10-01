import type {GameState,Role,SupportId} from '../game/types.ts';
import {builtinPack} from '../cards/builtin.ts';
export const supports=builtinPack.cards;
export const getSupports=(s?:Pick<GameState,'content'>)=>s?.content.cards||supports;
export const supportById=(id:SupportId,s?:Pick<GameState,'content'>)=>getSupports(s).find(p=>p.id===id)!;
export const defaultSupports=(_role:Role):SupportId[]=>['bat_senior','pitch_senior','rival','catcher','manager','classmate'];
export const bond=(s:GameState,id:SupportId):number=>id==='rival'?s.rival:id==='catcher'?s.catcher:s.bonds[id]??0;
export const bondKey=(id:SupportId)=>id==='rival'||id==='catcher'?id:`bond_${id}`;
export const changeLabel=(s:GameState,key:string,fallback:string)=>key.startsWith('bond_')?`${supportById(key.slice(5),s)?.name||key.slice(5)} 인연`:fallback||key;
