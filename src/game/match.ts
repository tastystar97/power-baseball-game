import {matchRules} from '../content/match-rules.ts';
import {teamName} from '../content/teams.ts';
import {derivedStats} from './abilities.ts';
import {eligibleSkills,rollSkills,skillActivationChance} from './skill-activation.ts';
import {getSkills} from '../content/skills.ts';
import {identifyDuel,duelEntry} from './rivalry.ts';
import type {GameState,Match,Tactic,SkillId} from './types.ts';
import type {MatchPlayer} from './roster.ts';
import {rosterFor} from './roster.ts';
import {plateDistribution,resolvePlate,outcomeNames as plateNames} from './plate.ts';
import type {PlateContext,PlayEvent} from './plate.ts';
import {createScoreState,applyPlay,advanceHalf,enterPitcher,leavePitcher,stealPlay} from './scoring.ts';
import {random} from './random.ts';
import {previewExpectation} from './tactic-preview.ts';
export const outcomeNames={...plateNames,stolenBase:'도루 성공',caughtStealing:'도루 실패'};
export function createMatch(appearance:Match['appearance']='starter'):Match {
 return {...createScoreState(),appearance,skillChecks:[],duels:[],highlights:0,entered:false,retired:appearance==='reserve',awaiting:false,playerBoundary:false,intervene:false,
  rosters:null,substitutions:[],pitcherIds:['',''],usedPitchers:[[],[]],battingOrder:8,pitchingRole:'middle',feed:[],playbackIndex:0,summary:false,recent:[],last:null};
}
export const loadLimit=(s:GameState)=>matchRules.starterLoadBase+derivedStats(s).stamina*matchRules.starterStaminaWeight;
export function initializeMatch(s:GameState){
 const m=s.match!;if(m.rosters)return;
 m.rosters=[rosterFor(m.opponentId??'haesol',s),rosterFor('cheongram',s,{appearance:m.appearance,battingOrder:m.battingOrder,pitchingRole:m.pitchingRole})];
 for(const team of [0,1] as const){const p=m.rosters[team].pitchers.find(p=>p.duty==='starter')!;m.pitcherIds[team]=p.id;m.usedPitchers[team]=[p.id];enterPitcher(m,team,p.id,true);if(p.id==='player')m.entered=true;}
}
export function currentBatter(s:GameState):MatchPlayer {initializeMatch(s);const m=s.match!;return m.rosters![m.half].batters[m.order[m.half]%9];}
export function currentPitcher(s:GameState):MatchPlayer {initializeMatch(s);const m=s.match!,team=m.half===0?1:0;return m.rosters![team].pitchers.find(p=>p.id===m.pitcherIds[team])!;}
function changePitcher(s:GameState,team:0|1,next:MatchPlayer){
 const m=s.match!,old=m.pitcherIds[team];if(old===next.id||m.usedPitchers[team].includes(next.id))return;
 leavePitcher(m,old);if(old==='player')m.retired=true;
 m.pitcherIds[team]=next.id;m.usedPitchers[team].push(next.id);enterPitcher(m,team,next.id,false);
 if(next.id==='player')m.entered=true;
 note(m,`${m.inning}회 ${next.name} 등판`);
}
function updateLineup(s:GameState){
 const m=s.match!,team=m.half===0?1:0,arms=m.rosters![team].pitchers;
 if(s.role==='batter'&&m.appearance==='substitute'&&m.inning>=7&&!m.entered){
  const original=m.rosters![1].batters.findIndex(p=>p.id==='junseo');
  m.substitutions.push({team:1,slot:original,previous:structuredClone(m.rosters![1].batters[original]),nextId:'player',feedIndex:m.feed.length});
  m.rosters![1].batters[original]=rosterFor('cheongram',s,{battingOrder:m.battingOrder,appearance:'starter'}).batters[m.battingOrder-1];m.entered=true;note(m,`${s.name}, 대타로 들어와 2루 수비까지 맡는다.`);
 }
 let current=arms.find(p=>p.id===m.pitcherIds[team])!,line=m.pitcherLines[current.id];
 const used=m.usedPitchers[team];
 if(team===1&&s.role==='pitcher'){
  const roleArm=arms.find(p=>p.id===(m.appearance==='starter'?'player':'junseo'));
  const playerSub=m.appearance==='substitute'&&!m.entered&&m.inning>=7;
  if(playerSub){
   const p={...rosterFor('cheongram',s,{pitchingRole:'middle'}).pitchers.find(p=>p.id==='player')!,duty:'middle' as const};arms.push(p);changePitcher(s,team,p);
  }else if(roleArm&&!used.includes(roleArm.id)&&(m.pitchingRole==='closer'?m.inning>=9:m.pitchingRole==='middle'&&(m.inning>=6||line.load>=78+current.ratings.stamina*.6))){changePitcher(s,team,roleArm);}
  current=arms.find(p=>p.id===m.pitcherIds[team])!;line=m.pitcherLines[current.id];
  const roleId=m.appearance==='starter'?'player':'junseo';
  const roleActive=current.id===roleId||current.id==='player';
  const inningLimit=current.id==='player'&&m.appearance==='substitute'?9:roleActive&&m.pitchingRole==='closer'?11:8;
  const limit=roleActive&&m.pitchingRole==='middle'?matchRules.middleLoadBase+current.ratings.stamina*matchRules.middleStaminaWeight:roleActive&&m.pitchingRole==='closer'?999:roleActive?matchRules.starterLoadBase+current.ratings.stamina*matchRules.starterStaminaWeight:78+current.ratings.stamina*.6;
  if(line.load>=limit||m.inning>=inningLimit){
   const next=arms.find(p=>!used.includes(p.id)&&!(p.id===roleId&&m.pitchingRole==='closer'&&m.inning<9));
   if(next)changePitcher(s,team,next);
  }
 }else{
  const first=used.length===1;
  if(first&&(line.load>=78+current.ratings.stamina*.6||m.inning>=7&&line.runs>=3||m.inning>=8)||!first&&line.load>=36){const next=arms.find(p=>!used.includes(p.id));if(next)changePitcher(s,team,next);}
 }
}
function playerTurn(s:GameState){const m=s.match!;return m.appearance!=='reserve'&&(s.role==='batter'?m.half===1&&currentBatter(s).id==='player':m.half===0&&!m.retired&&currentPitcher(s).id==='player');}
export function isDecisionPoint(s:GameState):boolean {
 const m=s.match;if(!m||m.over||!playerTurn(s))return false;
 if(s.role==='batter'||m.pitchingRole==='closer'||m.intervene)return true;
 const b=currentBatter(s);
 return !!(m.bases[1]||m.bases[2])||[3,4,5].includes(b.slot)||b.id==='jihwan'||m.inning>=7&&Math.abs(m.score[1]-m.score[0])<=2;
}
export function intervene(s:GameState):boolean{
 const m=s.match;if(!m||m.over||m.appearance==='reserve'||s.role==='pitcher'&&(!m.entered||m.retired)||!m.playerBoundary)return false;
 m.intervene=true;m.awaiting=true;return true;
}
export function plateContext(s:GameState,source:'manual'|'auto'='manual',active:SkillId[]=[]):PlateContext {
 const m=s.match!,p=currentPitcher(s),b=currentBatter(s),isPlayer=playerTurn(s);
 return {batter:b,pitcher:p,fielders:m.rosters![m.half===0?1:0].batters,inning:m.inning,half:m.half,order:m.order[m.half],outs:m.outs,bases:m.bases,score:m.score,energy:isPlayer?s.energy:100,load:m.pitcherLines[p.id]?.load??0,playerBatter:isPlayer&&s.role==='batter',playerPitcher:isPlayer&&s.role==='pitcher',source,
 effects:getSkills(s).filter(k=>active.includes(k.id)).flatMap(k=>k.effects.filter(e=>!e.role||e.role===s.role))};
}
const titles:Record<string,[string,string]>={contact:['정확하게 맞히기','짧은 스윙으로 안타를 노린다.'],power:['장타 노리기','삼진 위험을 감수하고 큰 타구를 노린다.'],patient:['공 골라내기','볼넷을 노리며 실투를 기다린다.'],bunt:['희생번트','아웃 하나를 대가로 주자를 보낸다.'],fastball:['직구로 승부','빠른 공으로 정면 승부한다.'],breaking:['변화구로 유도','타이밍을 빼앗아 땅볼과 헛스윙을 노린다.'],control:['맞혀 잡기','수비를 믿고 투구 부담을 줄인다.'],chase:['유인구 위주','장타를 경계하며 볼넷 위험을 감수한다.']};
export function opponent(s:GameState){
 const p=s.role==='batter'?currentPitcher(s):currentBatter(s),m=s.match!,line=s.role==='batter'?m.pitcherLines[p.id]:m.batterLines[p.id];
 const traits:Record<string,string>={velocity:'강속구',control:'제구형',breaking:'변화구형',stamina:'철완',contact:'컨택형',power:'장타력',eye:'선구안',speed:'빠른 발',field:'수비형',bunt:'번트 장인'};
 const record=!line?'오늘 첫 승부':s.role==='batter'?`${m.pitcherLines[p.id]?.outs??0}아웃 · ${m.pitcherLines[p.id]?.k??0}K · ${m.pitcherLines[p.id]?.runs??0}실점`:`${m.batterLines[p.id]?.ab??0}타수 ${m.batterLines[p.id]?.hits??0}안타`;
 return {name:p.name,trait:p.traits.map(t=>traits[t]).join(' · ')||'균형형',weakness:record,type:p.traits.includes('power')?'power':p.traits.includes('velocity')?'fast':p.traits.includes('eye')?'patient':'wild'};
}
export function tactics(s:GameState):Tactic[]{
 if(!s.match)return [];
 const draft=structuredClone(s);if(!draft.match!.rosters){draft.match!.half=s.role==='batter'?1:0;draft.match!.order[1]=draft.match!.battingOrder-1;draft.match!.pitchingRole='starter';}initializeMatch(draft);
 const ids=s.role==='batter'?['contact','power','patient','bunt']:['fastball','breaking','control','chase'];
 return ids.map(id=>{
  const eligible=eligibleSkills(draft,id),chance=skillActivationChance(s.attributes.intelligence),ctx=plateContext(draft);
  const effects=eligible.map(id=>getSkills(s).find(k=>k.id===id)!.effects.filter(e=>!e.role||e.role===s.role));
  const base=previewExpectation(ctx,id,effects,chance),{probabilities,burden,success}=base;
  const disabled=base.disabled||(s.role==='pitcher'&&s.match!.retired);
  return {id,title:titles[id][0],description:titles[id][1],disabled,burden,probabilities,outlook:disabled?'선택 불가':success>(s.role==='batter'?.35:.70)?'유리':success<(s.role==='batter'?.25:.55)?'불리':'보통',reason:disabled?'진루할 주자가 있고 2아웃 미만이어야 합니다.':`${base.estimated?'스킬 조합 평균 근사 · ':''}${teamName(s.match!.opponentId)} · ${s.energy<45?'피로에 주의':'컨디션 양호'}${eligible.length?` · 발동 후보: ${eligible.map(id=>getSkills(s).find(k=>k.id===id)!.name).join(', ')}`:''}`};
 });
}
function note(m:Match,text:string){m.recent.push(text);m.recent=m.recent.slice(-12);}
function playOne(s:GameState,id:string,source:'manual'|'auto'){
 const m=s.match!,isPlayer=playerTurn(s),active=isPlayer?rollSkills(s,id,source):[];
 const ctx=plateContext(s,source,active),e=resolvePlate(ctx,id,()=>random(s));
 if(!ctx.playerPitcher)e.burden=3.8;
 const duel=identifyDuel(s.role,m,isPlayer);if(duel)m.duels.push(duelEntry(m,duel,id,source,e.outcome as import('./plate.ts').PlateOutcome));
 applyPlay(m,e);m.feed.push(e);
 if(isPlayer&&source==='manual')m.highlights++;
 m.awaiting=false;m.playerBoundary=false;m.intervene=false;
 const text=`${e.inning}회 ${e.half===0?'초':'말'} · ${e.batter.name}: ${outcomeNames[e.outcome]}${e.runs?` · ${e.runs}득점`:''}`;
 m.last={title:outcomeNames[e.outcome],text,reasons:[titles[id]?.[0]??'자동 승부',active.length?`발동 스킬: ${active.map(id=>getSkills(s).find(k=>k.id===id)!.name).join(', ')}`:'이번 승부의 스킬 발동 없음'],runs:e.runs};note(m,text);advanceHalf(m);
}
export function chooseTactic(s:GameState,id:string,source:'manual'|'auto'='manual'):boolean{
 const m=s.match;if(!m||!m.awaiting||m.over)return false;
 const valid=(s.role==='batter'?['contact','power','patient','bunt']:['fastball','breaking','control','chase']).includes(id);
 if(!valid||plateDistribution(plateContext(s),id).disabled)return false;
 playOne(s,id,source);return true;
}
export function advanceMatch(s:GameState){
 const m=s.match!;if(m.over||m.awaiting)return;initializeMatch(s);
 if(m.playerBoundary){playOne(s,s.role==='batter'?'contact':'control','auto');if(m.over)return;}
 for(let safety=0;safety<2500;safety++){
  advanceHalf(m);if(m.over)return;updateLineup(s);
  const ctx=plateContext(s,'auto');
  if(ctx.bases[0]&&!ctx.bases[1]&&ctx.bases[0].speed>=55&&random(s)<.045){const e=stealPlay(ctx,random(s)<.6+ctx.bases[0].speed*.002);applyPlay(m,e);m.feed.push(e);advanceHalf(m);if(m.over)return;if(e.outs&&e.after.outs===3)continue;}
  if(playerTurn(s)){m.playerBoundary=true;m.awaiting=isDecisionPoint(s);return;}
  playOne(s,'contact','auto');
 }
 throw Error('경기 진행이 정상적으로 끝나지 않았습니다.');
}
export function summarizeMatch(m:Match):Match {return {...structuredClone(m),substitutions:[],feed:m.feed.filter(e=>e.playerBatter||e.playerPitcher),playbackIndex:0,summary:true};}
export type {PlayEvent};
