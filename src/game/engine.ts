import { activities } from '../content/activities.ts';
import { currentEvent } from '../content/events.ts';
import { bond, supportById } from '../content/supports.ts';
import { availableSkills, skillCost, skillRequirements, supportHint } from '../content/skills.ts';
import { roleStats, practiceStats, statKeys, labels, supportIds } from './types.ts';
import type { Action, Activity, GameState, Role, StatKey, Stats, Choice } from './types.ts';
import { clamp, random } from './random.ts';
import {failurePenalty,trainingFailureChance,trainingGrowth} from './training.ts';
import { advanceMatch, chooseTactic, createMatch } from './match.ts';
import { addBond, bondTrainingBonus, isJoint, participants, weeklyPlacements } from './support.ts';
import { evaluateSelection } from './competition.ts';
import {matchPlan,finishRound,weekKey,monthGoal} from './season.ts';
import {createCompetitor,growCompetitor} from './rivalry.ts';
import {teamName} from '../content/teams.ts';

export function snapshot(s:Pick<GameState,'stats'|'energy'|'stress'|'academics'|'trust'|'rival'|'catcher'|'skillPoints'|'bonds'>):Record<string,number> {
  return {...s.stats,energy:s.energy,stress:s.stress,academics:s.academics,trust:s.trust,rival:s.rival,catcher:s.catcher,
    skillPoints:s.skillPoints,...Object.fromEntries(Object.entries(s.bonds).map(([k,v])=>[`bond_${k}`,v]))};
}
export const eventId=(s:GameState)=>weekKey(s.month,s.week);
export const scheduleIndex=(s:GameState)=>(s.month-3)*4+s.week-1;
export function createGame(rawName:string,role:Role,seed=42):GameState {
  const name=rawName.trim();
  if(!name||[...name].length>8||!['batter','pitcher'].includes(role))throw new Error('이름은 1~8자로 입력하고 타자 또는 투수를 선택해 주세요.');
  const stats=Object.fromEntries(statKeys.map(k=>[k,0])) as Stats;
  for(const key of roleStats(role))stats[key]=35;
  stats.mental=40;
  if(role==='batter'){stats.contact=40;stats.power=32;stats.speed=38;}
  else {stats.control=40;stats.velocity=36;stats.breaking=30;stats.stamina=40;}
  const state:GameState={version:4,competitor:createCompetitor(role),selectionHistory:[],name,role,month:3,week:1,phase:'lineup',revision:0,rng:(seed>>>0)||1,stats,
    energy:80,stress:15,academics:45,trust:20,rival:10,catcher:10,
    completedEvents:[],log:[],schedule:[{month:3,week:1,weekday:'',weekend:''}],initial:{},weekStart:{},monthStart:{},
    notice:'함께 성장할 연습 파트너를 골라 보자.',eventReply:'',match:null,matchRecorded:false,
    supports:[],bonds:{bat_senior:10,pitch_senior:10,manager:10,classmate:10},placements:{},trainingSeed:(seed>>>0)||1,
    supportCompleted:[],activeSupport:null,skillPoints:8,skills:[],hints:[],lineupHistory:[],records:[],evaluation:null,tournament:{rounds:[]}};
  state.initial=snapshot(state);state.weekStart=snapshot(state);state.monthStart=snapshot(state);
  return state;
}
export function previewActivity(s:GameState,id:string,target?:StatKey) {
  if(!['weekday','weekend'].includes(s.phase))return null;
  if(id==='practice'&&(!target||!practiceStats(s.role).includes(target)))return null;
  const a=activities(s,target).find(a=>a.id===id);
  if(!a)return null;
  const gains={...a.gains},present=participants(s,id),joint=present.filter(p=>isJoint(s,p));
  let energy=a.energy,stress=a.stress,academics=a.academics||0;
  let points=s.phase==='weekday'?(id==='rest'?0:6):['practice','catch'].includes(id)?3:id==='selfstudy'?2:0;
  const primary=Object.keys(a.gains)[0] as StatKey|undefined;
  for(const p of present){
    if(p==='manager'){energy+=8;stress-=3;}
    else if(p==='classmate'){academics+=3;gains.mental=(gains.mental||0)+2;}
    else if(primary)gains[primary]=(gains[primary]||0)+2;
    if(joint.includes(p)){
      if(primary)gains[primary]=(gains[primary]||0)+3;
      else if(p==='classmate')academics+=3;
      else energy+=6;
    }
    points+=1+(joint.includes(p)?2:0);
  }
  // Low energy affects the chance to finish training, not its successful reward twice.
  const tired=s.stress>=75;
  const actualGrowth=(key:StatKey,value:number)=>trainingGrowth(s.stats[key],value,s.stress);
  const bondPartners=primary?present.map(id=>({id,bond:bond(s,id),amount:bondTrainingBonus(bond(s,id))})):[];
  const potential=bondPartners.reduce((total,p)=>total+p.amount,0);
  const withoutBond=primary?actualGrowth(primary,gains[primary]!):0;
  if(primary)gains[primary]=(gains[primary]||0)+potential;
  for(const k of Object.keys(gains) as StatKey[]){
    gains[k]=actualGrowth(k,gains[k]!);
  }
  // Show only the extra growth actually available after stress and the ability cap.
  const bondBonus=primary&&bondPartners.length?{stat:primary,partners:bondPartners,potential,amount:gains[primary]!-withoutBond}:null;
  const failureChance=a.training?trainingFailureChance(s.energy):0;
  const failure: (Activity&{points:number})|null=a.training?{...a,gains:{mental:clamp(s.stats.mental-failurePenalty.mental)-s.stats.mental},academics:0,
    energy:clamp(s.energy+energy-failurePenalty.energy)-s.energy,stress:clamp(s.stress+stress+failurePenalty.stress)-s.stress,points:0}:null;
  const warning=tired?'스트레스가 높아 성공 시 성장량도 줄어듭니다.':failureChance>=40?'무리하면 훈련을 마치지 못할 수 있습니다. 회복으로 실패 위험을 낮출 수 있습니다.':s.energy+energy<45?'활동 후 체력이 45 미만입니다. 경기 전에 회복을 고려하세요.':'';
  const sharedPrimary=s.phase==='weekday'&&primary&&present.includes('rival')?primary:null;
  const key=weekKey(s.month,s.week);
  const competitorGrowth=s.phase==='weekday'?{sharedPrimary,
    success:growCompetitor(s.competitor,s.role,key,sharedPrimary,'played').weeks.at(-1)!.gains,
    failure:growCompetitor(s.competitor,s.role,key,null,'played').weeks.at(-1)!.gains}:null;
  return {...a,competitorGrowth,gains,energy:clamp(s.energy+energy)-s.energy,stress:clamp(s.stress+stress)-s.stress,
    academics:clamp(s.academics+academics)-s.academics,warning,present,joint,points,failureChance,failure,bondBonus};
}
function logChange(s:GameState,before:Record<string,number>,title:string,text:string){
  const now=snapshot(s),changes:Record<string,number>={};
  for(const key of Object.keys(now))if(now[key]!==before[key])changes[key]=now[key]-before[key];
  s.log.push({month:s.month,week:s.week,title,text,changes});
  s.notice=`${title} · ${Object.entries(changes).map(([k,v])=>`${labels[k]} ${v>0?'+':''}${v}`).join(' · ')||text}`;
}
function apply(s:GameState,effect:Partial<Choice>,title:string,text:string){
  const before=snapshot(s);
  for(const [key,value] of Object.entries(effect.gains||{})){
    const k=key as StatKey;if(roleStats(s.role).includes(k))s.stats[k]=clamp(s.stats[k]+value);
  }
  for(const key of ['energy','stress','academics','trust','rival','catcher'] as const)s[key]=clamp(s[key]+(effect[key]||0));
  logChange(s,before,title,text);
}
function nextWeek(s:GameState){
  if(s.week===4){
    if(s.month===6){s.phase='complete';return;}
    s.month++;s.week=1;s.phase='lineup';s.monthStart=snapshot(s);s.match=null;s.matchRecorded=false;s.evaluation=null;s.placements={};
    s.notice=`${s.month}월 · ${monthGoal(s.month)}. 이번 달 파트너를 정하자.`;
  }else {s.week++;s.phase='weekday';s.placements=weeklyPlacements(s);s.match=null;s.matchRecorded=false;s.evaluation=null;}
  s.weekStart=snapshot(s);s.schedule.push({month:s.month,week:s.week,weekday:'',weekend:''});
}
function recordMatch(s:GameState){
  if(s.matchRecorded||!s.match?.over)return;
  const m=s.match,won=m.score[1]>m.score[0],played=m.appearance!=='reserve';
  const achievement=s.role==='batter'?m.batting.hits*2+m.batting.rbi:m.pitching.k+Math.max(0,3-m.pitching.runs);
  apply(s,{energy:played?(s.role==='pitcher'?-Math.ceil(m.load/4):-8):0,stress:won?-5:5,trust:played?clamp(2+achievement-(won?0:1),1,10):1},matchPlan(s)!.title,
    `청람고 ${m.score[1]} : ${m.score[0]} ${teamName(m.opponentId)} · ${won?'승리':'패배'}. 감독: “${!played?'오늘은 동료들의 승부를 배워 두자. 다음 기회를 향해 준비해.':achievement>=4?'연습한 것이 보이는구나. 오늘의 감각을 기억해.':'오늘 찾은 과제를 다음 훈련에 가져가자.'}”`);
  const before=snapshot(s);s.skillPoints+=played?8:2;
  logChange(s,before,'경기에서 배운 것',played?'승부를 돌아보며 스킬 포인트를 얻었다.':'동료의 플레이를 관찰하며 스킬 포인트를 얻었다.');
  s.matchRecorded=true;s.records.push({month:s.month,match:structuredClone(m)});finishRound(s);
}
function startMatch(s:GameState){
  const plan=matchPlan(s)!;
  s.match={...createMatch(s.month===3?'starter':s.evaluation!.rank),id:plan.id,opponentId:plan.opponentId,duels:s.evaluation?.basis==='legacy'?null:[]};
  advanceMatch(s);s.phase=s.match.over?'matchEnd':'match';if(s.match.over)recordMatch(s);
}
function finishWeekday(s:GameState){
  const plan=matchPlan(s);
  if(plan){
    if(s.month===3)startMatch(s);
    else {s.evaluation=evaluateSelection(s);s.selectionHistory.push(structuredClone(s.evaluation.competition!));s.phase='selection';}
  }else {finishRound(s);s.phase='event';}
}
export function transition(previous:GameState,action:Action):GameState {
  if(action.revision!==previous.revision||previous.phase==='complete')return previous;
  const s=structuredClone(previous);
  if(action.type==='lineup'&&s.phase==='lineup'){
    const ids=action.supports;
    if(!ids||ids.length!==3||new Set(ids).size!==3||ids.some(id=>!supportIds.includes(id)))return previous;
    s.supports=[...ids];s.placements=weeklyPlacements(s);s.phase='weekday';
    s.notice=`${s.month}월 파트너 · ${ids.map(id=>supportById(id).name).join(' · ')}. 첫 활동 전까지 편성을 수정할 수 있다.`;
  }else if(action.type==='editLineup'&&s.phase==='weekday'&&s.week===1&&!s.schedule[scheduleIndex(s)].weekday){
    s.phase='lineup';s.placements={};
  }else if(action.type==='learn'&&['lineup','weekday','weekend','selection'].includes(s.phase)){
    const skill=availableSkills(s).find(k=>k.id===action.id);
    if(!skill||skillRequirements(s,skill.id).some(r=>!r.met)||s.skills.includes(skill.id)||s.skillPoints<skillCost(s,skill.id))return previous;
    const before=snapshot(s);s.skillPoints-=skillCost(s,skill.id);s.skills.push(skill.id);
    logChange(s,before,`스킬 습득 · ${skill.name}`,skill.description);
  }else if(action.type==='activity'&&(s.phase==='weekday'||s.phase==='weekend')){
    const effect=previewActivity(s,action.id||'',action.target);if(!effect)return previous;
    const activityBefore=snapshot(s);
    const weekday=s.phase==='weekday';
    if(weekday&&s.supports.length!==3)return previous;
    if(weekday&&s.week===1)s.lineupHistory.push({month:s.month,supports:[...s.supports]});
    const failed=effect.failureChance>0&&random(s)<effect.failureChance/100;
    const resolved=failed?effect.failure!:effect;
    if(weekday)s.competitor=growCompetitor(s.competitor,s.role,weekKey(s.month,s.week),failed?null:effect.competitorGrowth!.sharedPrimary,'played');
    const title=effect.title+(action.target?` · ${labels[action.target]}`:'')+(effect.training?(failed?' · 훈련 실패':' · 훈련 성공'):'')+(!failed&&effect.joint.length?' · 합동 훈련':'');
    apply(s,resolved,title,effect.training?`시작 체력 ${activityBefore.energy} · 실패 확률 ${effect.failureChance}%. ${failed?'몸이 따라주지 않아 연습을 끝내지 못했다. 능력 성장과 스킬 포인트를 얻지 못하고 컨디션이 나빠졌다.':'끝까지 연습을 마쳐 준비한 성장을 얻었다.'}`:effect.description);
    if(effect.training)s.log.at(-1)!.training={outcome:failed?'failure':'success',energyBefore:activityBefore.energy,failureChance:effect.failureChance,points:resolved.points};
    const before=snapshot(s);s.skillPoints+=resolved.points;
    for(const id of effect.present)addBond(s,id,15);
    const bonus=effect.bondBonus;
    const bonusText=bonus?(failed?' 훈련 실패로 인연 보너스 없음.':` 인연 보너스 · ${labels[bonus.stat]} +${bonus.amount} 포함 (${bonus.partners.map(p=>`${supportById(p.id).name} 인연 ${p.bond}`).join(', ')}).`):'';
    if(resolved.points||effect.present.length)logChange(s,before,'함께 쌓은 연습',effect.present.length?`함께한 파트너: ${effect.present.map(id=>supportById(id).name).join(', ')}.${failed?' 결과는 아쉬워도 함께한 인연은 남았다.':''}${bonusText}`:'오늘의 경험이 스킬 포인트로 쌓였다.');
    s.notice=`${title} · ${Object.entries(snapshot(s)).filter(([k,v])=>v!==activityBefore[k]).map(([k,v])=>`${labels[k]} ${v>activityBefore[k]?'+':''}${v-activityBefore[k]}`).join(' · ')}`;
    s.schedule[scheduleIndex(s)][weekday?'weekday':'weekend']=effect.title+(action.target?` · ${labels[action.target]}`:'');
    if(weekday){
      const person=effect.present.find(id=>bond(s,id)>=35&&!s.supportCompleted.includes(id));
      if(person){s.activeSupport=person;s.phase='supportEvent';}else finishWeekday(s);
    }else if(effect.id==='catch')s.phase='weekendEvent';
    else nextWeek(s);
  }else if(action.type==='choice'&&['event','weekendEvent','supportEvent'].includes(s.phase)){
    const ev=currentEvent(s),choice=ev.choices[action.index??-1];if(!choice)return previous;
    const weekday=s.phase==='event',support=s.phase==='supportEvent';
    if(weekday&&s.completedEvents.includes(eventId(s)))return previous;
    if(support&&(!s.activeSupport||s.supportCompleted.includes(s.activeSupport)))return previous;
    apply(s,choice,ev.title,choice.reply);s.eventReply=choice.reply;
    if(support){
      const id=s.activeSupport!,before=snapshot(s),hint=supportHint(s,id);
      addBond(s,id,10);s.supportCompleted.push(id);if(!s.hints.includes(hint))s.hints.push(hint);
      logChange(s,before,'스킬 힌트',`${supportById(id).name}의 조언으로 스킬 비용이 4 Pt 줄었다.`);
      s.phase='supportResult';
    }else {if(weekday)s.completedEvents.push(eventId(s));s.phase=weekday?'eventResult':'weekendResult';}
  }else if(action.type==='tactic'&&s.phase==='match'){
    if(!chooseTactic(s,action.id||''))return previous;s.phase='matchResult';
  }else if(action.type==='continue'){
    if(s.phase==='supportResult'){
      const activity=s.placements[s.activeSupport!];
      const next=s.supports.find(id=>s.placements[id]===activity&&bond(s,id)>=35&&!s.supportCompleted.includes(id));
      if(next){s.activeSupport=next;s.phase='supportEvent';}
      else {s.activeSupport=null;finishWeekday(s);}
    }
    else if(s.phase==='eventResult')s.phase='weekend';
    else if(s.phase==='weekendResult')nextWeek(s);
    else if(s.phase==='selection')startMatch(s);
    else if(s.phase==='matchResult'){advanceMatch(s);s.phase=s.match!.over?'matchEnd':'match';if(s.match!.over)recordMatch(s);}
    else if(s.phase==='matchEnd')s.phase='weekend';
    else return previous;
  }else return previous;
  s.revision++;return s;
}
export function effectChips(a:Activity){
  return [...Object.entries(a.gains),['academics',a.academics||0],['catcher',a.catcher||0],['energy',a.energy],['stress',a.stress]]
    .filter(([,v])=>v!==0).map(([key,v])=>({key:String(key),value:Number(v),label:`${labels[String(key)]} ${Number(v)>0?'+':''}${v}`}));
}

