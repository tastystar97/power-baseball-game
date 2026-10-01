import type {z} from 'zod';
import type {CardContent} from '../cards/schema.ts';
import type {GameState,Role} from './types.ts';
import type {BackgroundChoice} from './character.ts';
import {creationDraftSchema} from './character-schema.ts';
import {backgroundEffects,emptyBackground,validateBackground,rollTalent,fateRoll,talentRules,creationSeed} from './character.ts';
import {creationRules,backgroundMemories} from '../content/backgrounds.ts';
import {validateContent} from '../cards/pack.ts';
import {catalogForCards} from '../cards/catalog.ts';
import {drawCards} from './scout.ts';
import {createGame,snapshot} from './engine.ts';
import {clamp} from './random.ts';
import {primaryKeys} from './types.ts';
import {secondaryKeys} from './abilities.ts';
import {equalData} from '../persistence/rivalry-validation.ts';
export type CreationDraft=z.infer<typeof creationDraftSchema>;
export interface CreationAction {revision:number;type:'identity'|'background'|'next'|'back'|'talent'|'reroll'|'fate'|'scout'|'reveal'|'revealAll'|'deck';name?:string;role?:Role;background?:BackgroundChoice;confirmed?:boolean;step?:number;id?:string;ids?:string[];}
export function newCreation(content:CardContent,seed:number):CreationDraft {
 return {version:1,seed:(seed>>>0)||1,revision:0,step:0,name:'',role:'batter',roleLocked:false,background:{...emptyBackground(),specialties:[],weaknesses:[]},talentIndex:null,talent:null,fate:null,content:structuredClone(validateContent(content)),poolIds:null,revealed:[],deck:[]};
}
export const remainingRerolls=(d:CreationDraft)=>Math.max(0,creationRules.rerolls+backgroundEffects(d.background,d.role).rerollExtra-(d.talentIndex??0));
export const backgroundBudget=(d:CreationDraft)=>validateBackground(d.background,d.talentIndex===null?0:talentRules[rollTalent(d.seed,d.talentIndex).grade].points);
const validName=(name:string)=>name.trim().length>0&&[...name.trim()].length<=8;
export function canAdvance(d:CreationDraft):boolean {
 switch(d.step){
  case 0:return validName(d.name);
  case 1:return backgroundBudget(d).valid;
  case 2:return !!d.talent&&backgroundBudget(d).valid;
  case 3:return !!d.fate;
  case 4:return !!d.poolIds&&d.poolIds.length>=6&&d.revealed.length===d.poolIds.length;
  case 5:return d.deck.length===6;
  default:return false;
 }
}
export function creationTransition(previous:CreationDraft,a:CreationAction):CreationDraft {
 if(a.revision!==previous.revision)return previous;
 const d=structuredClone(previous);
 if(a.type==='identity'&&d.step===0){
  if(a.role&&d.roleLocked&&a.role!==d.role)return previous;
  if(a.name!==undefined)d.name=a.name.slice(0,64);if(a.role)d.role=a.role;
 }else if(a.type==='background'&&d.step===1&&a.background){
  if(equalData(d.background,a.background))return previous;
  if(d.talentIndex!==null&&!a.confirmed)return previous;
  d.background={...a.background,specialties:[...a.background.specialties],weaknesses:[...a.background.weaknesses]};
  d.talent=null;d.fate=null;d.poolIds=null;d.revealed=[];d.deck=[];
 }else if(a.type==='next'&&canAdvance(d)){if(d.step===0){d.name=d.name.trim();d.roleLocked=true;}d.step++;
 }else if(a.type==='back'&&a.step!==undefined&&Number.isInteger(a.step)&&a.step>=0&&a.step<d.step){d.step=a.step;
 }else if(a.type==='talent'&&d.step===2&&!d.talent&&backgroundBudget(d).valid){d.talentIndex??=0;d.talent=rollTalent(d.seed,d.talentIndex);
 }else if(a.type==='reroll'&&d.step===2&&d.talent&&remainingRerolls(d)>0){
  d.talentIndex=(d.talentIndex??0)+1;d.talent=rollTalent(d.seed,d.talentIndex);d.fate=null;d.poolIds=null;d.revealed=[];d.deck=[];
 }else if(a.type==='fate'&&d.step===3&&!d.fate&&d.talent&&backgroundBudget(d).valid){d.fate=fateRoll(d.seed,d.role);
 }else if(a.type==='scout'&&d.step===4&&!d.poolIds&&d.fate){d.poolIds=drawCards(d.content.cards,[],creationRules.scoutCount+backgroundEffects(d.background,d.role).scoutExtra,()=>true,d.seed);
 }else if(a.type==='reveal'&&d.step===4&&a.id&&d.poolIds?.includes(a.id)&&!d.revealed.includes(a.id)){d.revealed.push(a.id);
 }else if(a.type==='revealAll'&&d.step===4&&d.poolIds&&d.revealed.length<d.poolIds.length){d.revealed=[...d.poolIds];
 }else if(a.type==='deck'&&d.step===5&&a.ids&&a.ids.length<=6&&new Set(a.ids).size===a.ids.length&&a.ids.every(id=>d.poolIds?.includes(id))){d.deck=[...a.ids];
 }else return previous;
 d.revision++;return d;
}
export function parseCreation(raw:string):CreationDraft {
 const d=creationDraftSchema.parse(JSON.parse(raw));validateContent(d.content);
 if(d.step>0&&(!validName(d.name)||!d.roleLocked))throw Error('선수 이름과 역할이 확정되지 않았습니다.');
 if(d.talent&&!equalData(d.talent,rollTalent(d.seed,d.talentIndex??-1)))throw Error('재능 굴림이 일치하지 않습니다.');
 if(d.fate&&(!d.talent||!equalData(d.fate,fateRoll(d.seed,d.role))))throw Error('운명 결과가 일치하지 않습니다.');
 if(d.poolIds&&(!d.fate||!equalData(d.poolIds,drawCards(d.content.cards,[],creationRules.scoutCount+backgroundEffects(d.background,d.role).scoutExtra,()=>true,d.seed))))throw Error('스카우트 결과가 일치하지 않습니다.');
 if(new Set(d.revealed).size!==d.revealed.length||d.revealed.some(id=>!d.poolIds?.includes(id))||new Set(d.deck).size!==d.deck.length||d.deck.some(id=>!d.poolIds?.includes(id)))throw Error('공개/편성 카드가 보유 풀과 다릅니다.');
 if(d.step>=3&&(!d.talent||!backgroundBudget(d).valid)||d.step>=4&&!d.fate||d.step>=5&&(!d.poolIds||d.revealed.length!==d.poolIds.length)||d.step===6&&d.deck.length!==6)throw Error('캐릭터 메이킹 단계가 맞지 않습니다.');
 return d;
}
export function createPlayer(input:CreationDraft):GameState {
 const d=parseCreation(JSON.stringify(input));
 if(d.step!==6||!d.talent||!d.fate||!d.poolIds||!backgroundBudget(d).valid)throw Error('입학 전 모든 단계를 완료해 주세요.');
 const s=createGame(d.name,d.role,creationSeed(d.seed,4),d.content,d.deck),effects=backgroundEffects(d.background,d.role);
 s.character={seed:d.seed,background:structuredClone(d.background),talentIndex:d.talentIndex!,talent:structuredClone(d.talent),fate:{...d.fate},rerollsRemaining:remainingRerolls(d),poolIds:[...d.poolIds],pool:catalogForCards(d.content,d.poolIds)};
 for(const k of primaryKeys)s.attributes[k]=clamp(d.talent.attributes[k]+(effects.attributes[k]??0),0,1500);
 for(const k of secondaryKeys(s.role))s.proficiency[k]=clamp((s.proficiency[k]??0)+(effects.proficiency[k]??0)*10,0,1000);
 s.trust=clamp(s.trust+effects.trust);
 s.initial=snapshot(s);s.weekStart=snapshot(s);s.monthStart=snapshot(s);
 s.notice=backgroundMemories[d.background.origin??'']??'나만의 재능과 파트너를 만나 첫 여름을 시작했다.';
 return s;
}
