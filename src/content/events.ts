import type {GameState} from '../game/types.ts';
import {encounterContent} from './encounters.ts';
export function currentEvent(s:GameState) {
  if(s.activeEncounter)return encounterContent(s,s.activeEncounter);
  throw Error('진행 중인 인카운터가 없습니다.');
}
