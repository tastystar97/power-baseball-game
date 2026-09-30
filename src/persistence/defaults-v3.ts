// 구형 저장 변환용 기본값. 현재 런타임의 생성 규칙과 분리한다.
import {roleStats,statKeys} from './v3-schema.ts';
import type {GameState,Role,Stats} from './v3-schema.ts';
export function snapshot(s:Pick<GameState,'stats'|'energy'|'stress'|'academics'|'trust'|'rival'|'catcher'|'skillPoints'|'bonds'>):Record<string,number> {
  return {...s.stats,energy:s.energy,stress:s.stress,academics:s.academics,trust:s.trust,rival:s.rival,catcher:s.catcher,
    skillPoints:s.skillPoints,...Object.fromEntries(Object.entries(s.bonds).map(([k,v])=>[`bond_${k}`,v]))};
}
export const scheduleIndex=(s:GameState)=>(s.month-3)*4+s.week-1;
export function createGame(rawName:string,role:Role,seed=42):GameState {
  const name=rawName.trim();
  if(!name||[...name].length>8||!['batter','pitcher'].includes(role))throw new Error('이름은 1~8자로 입력하고 타자 또는 투수를 선택해 주세요.');
  const stats=Object.fromEntries(statKeys.map(k=>[k,0])) as Stats;
  for(const key of roleStats(role))stats[key]=35;
  stats.mental=40;
  if(role==='batter'){stats.contact=40;stats.power=32;stats.speed=38;}
  else {stats.control=40;stats.velocity=36;stats.breaking=30;stats.stamina=40;}
  const state:GameState={version:3,name,role,month:3,week:1,phase:'lineup',revision:0,rng:(seed>>>0)||1,stats,
    energy:80,stress:15,academics:45,trust:20,rival:10,catcher:10,
    completedEvents:[],log:[],schedule:[{month:3,week:1,weekday:'',weekend:''}],initial:{},weekStart:{},monthStart:{},
    notice:'함께 성장할 연습 파트너를 골라 보자.',eventReply:'',match:null,matchRecorded:false,
    supports:[],bonds:{bat_senior:10,pitch_senior:10,manager:10,classmate:10},placements:{},trainingSeed:(seed>>>0)||1,
    supportCompleted:[],activeSupport:null,skillPoints:8,skills:[],hints:[],lineupHistory:[],records:[],evaluation:null,tournament:{rounds:[]}};
  state.initial=snapshot(state);state.weekStart=snapshot(state);state.monthStart=snapshot(state);
  return state;
}
