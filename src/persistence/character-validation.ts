import type {GameState} from '../game/types.ts';
import {backgroundEffects,rollTalent,fateRoll,talentRules,validateBackground} from '../game/character.ts';
import {creationRules} from '../content/backgrounds.ts';
import {initialProficiency,secondaryKeys} from '../game/abilities.ts';
import {primaryKeys} from '../game/types.ts';
import {catalogForDeck,catalogForCards} from '../cards/catalog.ts';
import {validateContent} from '../cards/pack.ts';
import {equalData} from './rivalry-validation.ts';
import {clamp} from '../game/random.ts';

export function validateCharacter(s:GameState){
 const c=s.character;if(!c)return; // Internal rule fixtures/editor previews may use the fixed baseline.
 if(!equalData(c.talent,rollTalent(c.seed,c.talentIndex))||!equalData(c.fate,fateRoll(c.seed,s.role)))throw Error('선수의 재능 판정이 일치하지 않습니다.');
 if(!validateBackground(c.background,talentRules[c.talent.grade].points).valid)throw Error('선수 배경의 예산/선택이 올바르지 않습니다.');
 const effects=backgroundEffects(c.background,s.role),remaining=Math.max(0,creationRules.rerolls+effects.rerollExtra-c.talentIndex);
 if(c.rerollsRemaining!==remaining)throw Error('남은 재능 굴림 횟수가 일치하지 않습니다.');
 validateContent(c.pool);
 if(c.poolIds.length>creationRules.scoutCount+effects.scoutExtra||new Set(c.poolIds).size!==c.poolIds.length||!equalData(c.pool,catalogForCards(c.pool,c.poolIds))||!equalData(s.content,catalogForDeck(c.pool,s.supports)))throw Error('시작 보유 풀과 덱이 일치하지 않습니다.');
 for(const k of primaryKeys)if(s.initial[`primary_${k}`]!==clamp(c.talent.attributes[k]+(effects.attributes[k]??0),0,1500))throw Error('입학 능력과 재능·배경이 다릅니다.');
 const proficiency=initialProficiency(s.role);
 for(const k of secondaryKeys(s.role))if(s.initial[`proficiency_${k}`]!==clamp((proficiency[k]??0)+(effects.proficiency[k]??0)*10,0,1000))throw Error('입학 기술과 배경이 다릅니다.');
 if(s.initial.trust!==clamp(20+effects.trust))throw Error('입학 신뢰와 배경이 다릅니다.');
}
