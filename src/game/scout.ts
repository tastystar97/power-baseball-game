import type {SupportCard} from '../cards/schema.ts';
import {creationSeed} from './character.ts';
import {random} from './random.ts';

/** Shared by admission and future promotion: exclusions and eligibility belong to the caller. */
export function drawCards(library:readonly SupportCard[],exclude:readonly string[],count:number,filter:(card:SupportCard)=>boolean,seed:number):string[]{
 if(!Number.isInteger(count)||count<0)throw Error('뽑을 카드 수가 올바르지 않습니다.');
 const seen=new Set(exclude),eligible:string[]=[];
 for(const card of library)if(!seen.has(card.id)&&filter(card)){seen.add(card.id);eligible.push(card.id);}
 eligible.sort();
 const rng={rng:creationSeed(seed,3)};
 for(let i=eligible.length-1;i>0;i--){const j=Math.floor(random(rng)*(i+1));[eligible[i],eligible[j]]=[eligible[j],eligible[i]];}
 return eligible.slice(0,count);
}
