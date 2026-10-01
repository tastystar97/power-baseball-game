import {derivedStats,secondaryKeys} from '../game/abilities.ts';
import type {AbilityState} from '../game/abilities.ts';
import type {StatKey} from '../game/types.ts';

// Merge note: the first-year data work moves primaries to 0-1500 with PRIMARY_MAX in
// content/development-rules.ts and adds abilities.overall(). Point these two at them then.
export const primaryMax=100;
export function overallOf(s:AbilityState):number {
  const stats=derivedStats(s);
  return secondaryKeys(s.role).reduce((n,k)=>n+stats[k],0)/secondaryKeys(s.role).length;
}

const primaryGrades:[number,string][]=[[.867,'S'],[.733,'A'],[.6,'B'],[.467,'C'],[.333,'D'],[.2,'E'],[.1,'F'],[0,'G']];
/** Letter grade of a primary attribute relative to its scale. */
export function primaryGrade(value:number,max=primaryMax):string {
  const ratio=value/max;
  return primaryGrades.find(([t])=>ratio>=t)![1];
}

const strong:Partial<Record<StatKey,string>>={contact:'컨택이 강점',power:'장타력이 강점',eye:'선구안이 좋음',speed:'발이 빠름',field:'수비가 안정적',velocity:'공이 빠름',control:'제구가 정교함',breaking:'변화구가 강점',stamina:'오래 던질 수 있음'};
const weak:Partial<Record<StatKey,string>>={contact:'정확도가 과제',power:'장타력이 부족',eye:'공을 보는 눈이 과제',speed:'주루가 과제',field:'수비가 과제',velocity:'구위가 부족',control:'제구가 흔들림',breaking:'변화구가 과제',stamina:'체력 안배가 과제'};

/**
 * Strength and weakness tags from the hidden baseball abilities. Only the relative order is used,
 * so no hidden number reaches the screen.
 */
export function strengthTags(s:AbilityState):{label:string;kind:'strength'|'weakness'}[] {
  const stats=derivedStats(s);
  const ranked=[...secondaryKeys(s.role)].sort((a,b)=>stats[b]-stats[a]);
  const tags:{label:string;kind:'strength'|'weakness'}[]=ranked.slice(0,2).map(k=>({label:strong[k]!,kind:'strength'}));
  const last=ranked.at(-1)!;
  if(stats[ranked[0]]-stats[last]>=3)tags.push({label:weak[last]!,kind:'weakness'});
  return tags;
}
