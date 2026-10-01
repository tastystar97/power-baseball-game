import type {GameState} from './types.ts';
import {derivedStats} from './abilities.ts';
import {roleChoiceLabels} from '../content/career-events.ts';
export type RoleEventId='bat_six'|'bat_path'|'bat_cleanup'|'pitch_role';
export type RoleChoiceId=keyof typeof roleChoiceLabels;
export const initialCareer=()=>({battingOrder:8 as const,battingPath:'undecided' as const,pitchingRole:'middle' as const,completed:[] as RoleEventId[],history:[] as GameState['career']['history'],pending:null as RoleEventId|null});
export function aptitudes(s:GameState){const st=derivedStats(s);return {leadoff:st.eye*.4+st.speed*.4+st.contact*.2,center:st.power*.6+st.contact*.4,starter:st.stamina*.4+st.control*.3+st.breaking*.3,closer:st.velocity*.5+st.mental*.3+st.breaking*.2};}
function recent(s:GameState){return s.records.slice(-2).map(r=>r.match);}
export function pendingRoleEvent(s:GameState):RoleEventId|null {
 if(!s.matchRecorded||!s.match?.over||!s.match.id||s.career.history.some(h=>h.matchId===s.match!.id))return null;
 const games=recent(s);if(games.length<2)return null;
 const b=games.map(m=>m.batting),reach=b.reduce((n,b)=>n+b.hits+b.walks+b.hbp+b.errors,0),rbi=b.reduce((n,b)=>n+b.rbi,0),apt=aptitudes(s);
 if(s.role==='batter'){
  if(s.career.battingOrder===8&&games.every(m=>m.appearance==='starter'&&m.batting.pa>0)&&s.trust>=30&&(reach>=3||rbi>=2))return 'bat_six';
  if(s.career.battingOrder===6&&games.some(m=>m.battingOrder===6&&m.batting.pa>0)&&s.trust>=45&&(reach>=4&&apt.leadoff>=55||(reach>=4||rbi>=3)&&apt.center>=55))return 'bat_path';
  if(s.career.battingOrder===3&&games.some(m=>m.battingOrder===3&&m.batting.pa>0)&&derivedStats(s).power>=65&&s.trust>=60&&(b.reduce((n,b)=>n+b.doubles+b.triples+b.hr,0)>=2||rbi>=4))return 'bat_cleanup';
 }else if(s.career.pitchingRole==='middle'&&games.every(m=>m.pitchingRole==='middle'&&m.faced>0)&&s.trust>=40&&(apt.starter>=55||apt.closer>=55)){
  const sum=games.reduce((v,m)=>({outs:v.outs+m.pitching.outs,runs:v.runs+m.pitching.runs,traffic:v.traffic+m.pitching.hits+m.pitching.walks+m.pitching.hbp,k:v.k+m.pitching.k}),{outs:0,runs:0,traffic:0,k:0});
  if(sum.outs>=6&&sum.runs/sum.outs<=.3&&sum.traffic/sum.outs<=.65&&sum.k/sum.outs>=.15)return 'pitch_role';
 }
 return null;
}
export function roleChoices(s:GameState){
 const id=s.career.pending,apt=aptitudes(s),games=recent(s),reach=games.reduce((n,m)=>n+m.batting.hits+m.batting.walks+m.batting.hbp+m.batting.errors,0),rbi=games.reduce((n,m)=>n+m.batting.rbi,0);
 const ids:RoleChoiceId[]=id==='bat_six'?['six']:id==='bat_path'?['leadoff','center']:id==='bat_cleanup'?['cleanup']:id==='pitch_role'?['starter','closer']:[];
 return [...ids,'stay' as const].map(id=>{const aptitude=id in apt?apt[id as keyof typeof apt]:null;const disabled=aptitude!==null&&(aptitude<55||id==='leadoff'&&reach<4||id==='center'&&reach<4&&rbi<3);return {id,label:roleChoiceLabels[id],disabled,hint:id==='stay'?'멘탈 +2 · 다음 경기 후 다시 검토':aptitude!==null?`적성 ${aptitude.toFixed(1)} / 55${disabled?' · 제안 조건 미달':''}`:'타순 승격 · 동료 타순은 순서를 유지'};});
}
export function applyRoleChoice(s:GameState,choice:string):boolean {
 const event=s.career.pending;if(!event||pendingRoleEvent(s)!==event)return false;
 const option=roleChoices(s).find(c=>c.id===choice);if(!option||option.disabled)return false;
 if(choice==='stay')s.attributes.mental=Math.min(100,s.attributes.mental+2);
 else{
  if(choice==='six')s.career.battingOrder=6;
  if(choice==='leadoff'){s.career.battingOrder=1;s.career.battingPath='leadoff';}
  if(choice==='center'){s.career.battingOrder=3;s.career.battingPath='middle';}
  if(choice==='cleanup')s.career.battingOrder=4;
  if(choice==='starter'||choice==='closer')s.career.pitchingRole=choice;
  s.career.completed.push(event);
 }
 s.career.history.push({matchId:s.match!.id!,eventId:event,choice:option.id});s.career.pending=null;return true;
}
