import {builtinPack} from '../cards/builtin.ts';
import {catalogFromPacks,catalogForDeck,DECK_SIZE} from '../cards/catalog.ts';
import type {CardContent} from '../cards/schema.ts';
import {initialAttributes,initialProficiency,derivedStats,resolveGrowth,trainingTargets,growthChanges,secondaryKeys} from './abilities.ts';
import {drawEncounter} from '../content/encounters.ts';
import {sharedTraining} from './shared-training.ts';
import { activities } from '../content/activities.ts';
import { currentEvent } from '../content/events.ts';
import { bond, supportById, changeLabel } from '../content/supports.ts';
import { availableSkills, skillCost, skillRequirements } from '../content/skills.ts';
import { primaryKeys, labels } from './types.ts';
import type { Action, Activity, GameState, Role, TrainingTarget, PrimaryKey, Choice, SupportId } from './types.ts';
import { clamp, random } from './random.ts';
import {failurePenalty,trainingFailureChance,trainingGrowth} from './training.ts';
import { advanceMatch, chooseTactic, createMatch } from './match.ts';
import { addBond, bondTrainingBonus, isJoint, participants, weeklyPlacements } from './support.ts';
import { evaluateSelection } from './competition.ts';
import {matchPlan,finishRound,weekKey,monthGoal} from './season.ts';
import {createCompetitor,growCompetitor} from './rivalry.ts';
import {teamName} from '../content/teams.ts';

export function snapshot(s:Pick<GameState,'attributes'|'proficiency'|'energy'|'stress'|'trust'|'rival'|'catcher'|'skillPoints'|'bonds'>):Record<string,number> {
  return {...growthChanges(s.attributes,s.proficiency),energy:s.energy,stress:s.stress,trust:s.trust,rival:s.rival,catcher:s.catcher,
    skillPoints:s.skillPoints,...Object.fromEntries(Object.entries(s.bonds).map(([k,v])=>[`bond_${k}`,v]))};
}
export const eventId=(s:GameState)=>weekKey(s.month,s.week);
export const scheduleIndex=(s:GameState)=>(s.month-3)*4+s.week-1;
export function createGame(rawName:string,role:Role,seed=42,content:CardContent=catalogFromPacks([builtinPack]),deck?:string[]):GameState {
  const name=rawName.trim();
  if(!name||[...name].length>8||!['batter','pitcher'].includes(role))throw new Error('이름은 1~8자로 입력하고 타자 또는 투수를 선택해 주세요.');
  const frozen=deck?catalogForDeck(content,deck):structuredClone(content);
  const state:GameState={version:7,content:frozen,weekdayPart:1,activeEncounter:null,encounterHistory:[],competitor:createCompetitor(role),selectionHistory:[],name,role,month:3,week:1,phase:deck?'weekday':'lineup',revision:0,rng:(seed>>>0)||1,attributes:initialAttributes(),proficiency:initialProficiency(role),
    energy:80,stress:15,trust:20,rival:10,catcher:10,
    log:[],schedule:[{month:3,week:1,weekday:'',weekday2:'',weekend:''}],initial:{},weekStart:{},monthStart:{},
    notice:'함께 성장할 연습 파트너를 골라 보자.',eventReply:'',match:null,matchRecorded:false,
    supports:deck?[...deck]:[],bonds:Object.fromEntries(frozen.cards.filter(c=>!['rival','catcher'].includes(c.id)).map(c=>[c.id,10])),placements:{},trainingSeed:(seed>>>0)||1,
    supportCompleted:[],activeSupport:null,skillPoints:8,skills:[],hints:[],unlockedSkills:[],records:[],evaluation:null,tournament:{rounds:[]}};
  if(deck){state.placements=weeklyPlacements(state);state.notice="육성 덱과 함께 첫 여름을 향해 출발하자.";}
  state.initial=snapshot(state);state.weekStart=snapshot(state);state.monthStart=snapshot(state);
  return state;
}
export function previewActivity(s:GameState,id:string,target?:TrainingTarget,partner?:SupportId) {
  if(!['weekday','weekend'].includes(s.phase))return null;
  if(id==='partner'&&!target)target=s.role==='batter'?'contact':'control';
  if(['practice','partner'].includes(id)&&(!target||!trainingTargets(s.role,id==='partner').includes(target)))return null;
  const a=activities(s,target).find(a=>a.id===id);if(!a)return null;
  const selected=partner||[...s.supports].sort((a,b)=>bond(s,b)-bond(s,a))[0];
  const disabledReason=id==='partner'&&(!selected||!s.supports.includes(selected)||bond(s,selected)<40)?'육성 덱 중 인연 40 이상인 파트너가 필요합니다.':'';
  const gains={...a.gains},present=id==='partner'&&selected&&!disabledReason?[selected]:participants(s,id),joint=present.filter(p=>isJoint(s,p));
  let energy=a.energy,stress=a.stress;
  let points=s.phase==='weekday'?(id==='rest'?0:3):id==='watch'?8:['practice','partner','catch'].includes(id)?3:id==='selfstudy'?2:0;
  const resting=['rest','weekend_rest'].includes(id);
  const bondPartners: {id:SupportId;stat:PrimaryKey;bond:number;amount:number}[]=[];
  for(const p of present){
    const card=supportById(p,s);
    energy+=card.bonus.energy+(joint.includes(p)?card.bonus.jointEnergy:0);stress+=card.bonus.stress;
    if(!resting)for(const key of primaryKeys)if(card.bonus.gains[key])gains[key]=(gains[key]||0)+card.bonus.gains[key]!;
    const stat=card.specialty;
    if(!resting&&stat){
      gains[stat]=(gains[stat]||0)+1+(joint.includes(p)?1:0);
      bondPartners.push({id:p,stat,bond:bond(s,p),amount:bondTrainingBonus(bond(s,p))});
    }
    if(!resting)points+=1+(joint.includes(p)?2:0);
  }
  const withoutBond=resolveGrowth(s,gains,a.proficiency);
  for(const p of bondPartners)gains[p.stat]=(gains[p.stat]||0)+p.amount;
  const resolved=resolveGrowth(s,gains,a.proficiency);
  const bondBonuses=primaryKeys.flatMap(stat=>{
    const partners=bondPartners.filter(p=>p.stat===stat);if(!partners.length)return [];
    return [{stat:`primary_${stat}`,partners,potential:partners.reduce((sum,p)=>sum+p.amount,0),amount:(resolved.gains[stat]||0)-(withoutBond.gains[stat]||0)}];
  });
  const failureChance=a.training?trainingFailureChance(s.energy):0;
  const failure:(Activity&{points:number})|null=a.training?{...a,gains:{mental:clamp(s.attributes.mental-failurePenalty.mental)-s.attributes.mental},proficiency:{},
    energy:clamp(s.energy+energy-failurePenalty.energy)-s.energy,stress:clamp(s.stress+stress+failurePenalty.stress)-s.stress,points:0}:null;
  const warning=failureChance>=40?'무리하면 훈련을 마치지 못할 수 있습니다. 회복으로 실패 위험을 낮출 수 있습니다.':s.energy+energy<45?'활동 후 체력이 45 미만입니다. 경기 전에 회복을 고려하세요.':'';
  const sharedPrimary=s.phase==='weekday'&&present.includes('rival')?a.rivalTrainingStat||null:null;
  const key=weekKey(s.month,s.week),first=s.weekdayPart===2?sharedTraining(s,scheduleIndex(s),1):sharedPrimary;
  const competitorGrowth=s.phase==='weekday'?{sharedPrimary,
    success:growCompetitor(s.competitor,s.role,key,first,'v6',s.weekdayPart===2?sharedPrimary:null).weeks.at(-1)!.gains,
    failure:growCompetitor(s.competitor,s.role,key,s.weekdayPart===2?first:null,'v6').weeks.at(-1)!.gains}:null;
  const after={...s,attributes:{...s.attributes},proficiency:{...s.proficiency},stress:clamp(s.stress+stress)};
  for(const k of primaryKeys)after.attributes[k]+=resolved.gains[k]||0;
  for(const k of secondaryKeys(s.role))after.proficiency[k]=(after.proficiency[k]||0)+(resolved.proficiency[k]||0);
  const beforeNormal=derivedStats(s,false),afterNormal=derivedStats(after,false),beforeEffective=derivedStats(s),afterEffective=derivedStats(after);
  const abilityChanges=secondaryKeys(s.role).map(stat=>({stat,before:beforeEffective[stat],after:afterEffective[stat],growth:afterNormal[stat]-beforeNormal[stat],condition:(afterEffective[stat]-afterNormal[stat])-(beforeEffective[stat]-beforeNormal[stat])}));
  return {...a,...resolved,disabledReason,partner:selected,competitorGrowth,energy:clamp(s.energy+energy)-s.energy,stress:clamp(s.stress+stress)-s.stress,
    warning,present,joint,points:Math.min(points,1000-s.skillPoints),failureChance,failure,bondBonuses,abilityChanges};
}

function logChange(s:GameState,before:Record<string,number>,title:string,text:string){
  const now=snapshot(s),changes:Record<string,number>={};
  for(const key of Object.keys(now))if(now[key]!==before[key])changes[key]=now[key]-before[key];
  s.log.push({month:s.month,week:s.week,title,text,changes,...(s.phase==='weekday'?{slot:s.weekdayPart===1?'first' as const:'second' as const}:s.phase==='weekend'?{slot:'weekend' as const}:{})});
  s.notice=`${title} · ${Object.entries(changes).map(([k,v])=>`${changeLabel(s,k,labels[k])} ${v>0?'+':''}${v}`).join(' · ')||text}`;
}
function apply(s:GameState,effect:Partial<Choice>,title:string,text:string){
  const before=snapshot(s);
  for(const [key,value] of Object.entries(effect.gains||{})){
    const k=key as PrimaryKey;s.attributes[k]=clamp(s.attributes[k]+value);
  }
  for(const k of secondaryKeys(s.role))s.proficiency[k]=clamp((s.proficiency[k]||0)+(effect.proficiency?.[k]||0));
  for(const key of ['energy','stress','trust','rival','catcher'] as const)s[key]=clamp(s[key]+(effect[key]||0));
  logChange(s,before,title,text);
}
function beginSecond(s:GameState){s.weekdayPart=2;s.phase='weekday';s.activeEncounter=null;s.activeSupport=null;s.placements=weeklyPlacements(s);}
function nextWeek(s:GameState){
  if(s.month===6&&s.week===4){s.phase='complete';return;}
  s.weekdayPart=1;s.activeEncounter=null;s.activeSupport=null;
  if(s.week===4){
    if(s.month===6){s.phase='complete';return;}
    s.month++;s.week=1;s.phase='weekday';s.monthStart=snapshot(s);s.match=null;s.matchRecorded=false;s.evaluation=null;s.placements=weeklyPlacements(s);
    s.notice=`${s.month}월 · ${monthGoal(s.month)}. 육성 덱과 다음 목표를 준비하자.`;
  }else {s.week++;s.phase='weekday';s.placements=weeklyPlacements(s);s.match=null;s.matchRecorded=false;s.evaluation=null;}
  s.weekStart=snapshot(s);s.schedule.push({month:s.month,week:s.week,weekday:'',weekday2:'',weekend:''});
}
function recordMatch(s:GameState){
  if(s.matchRecorded||!s.match?.over)return;
  const m=s.match,won=m.score[1]>m.score[0],played=s.role==='pitcher'?m.faced>0:m.skillChecks.length>0;
  const achievement=s.role==='batter'?m.batting.hits*2+m.batting.rbi:m.pitching.k+Math.max(0,3-m.pitching.runs);
  apply(s,{...resolveGrowth(s,played?{sense:m.appearance==='starter'?2:1}:{}),energy:played?(s.role==='pitcher'?-Math.ceil(m.load/4):-8):0,stress:won?-5:5,trust:played?clamp(2+achievement-(won?0:1),1,10):1},matchPlan(s)!.title,
    `청람고 ${m.score[1]} : ${m.score[0]} ${teamName(m.opponentId)} · ${won?'승리':'패배'}. 감독: “${!played?'오늘은 동료들의 승부를 배워 두자. 다음 기회를 향해 준비해.':achievement>=4?'연습한 것이 보이는구나. 오늘의 감각을 기억해.':'오늘 찾은 과제를 다음 훈련에 가져가자.'}”`);
  const before=snapshot(s);s.skillPoints=Math.min(1000,s.skillPoints+(played?8:2));
  logChange(s,before,'경기에서 배운 것',played?'승부를 돌아보며 스킬 포인트를 얻었다.':'동료의 플레이를 관찰하며 스킬 포인트를 얻었다.');
  s.matchRecorded=true;s.records.push({month:s.month,match:structuredClone(m)});finishRound(s);
}
function startMatch(s:GameState){
  const plan=matchPlan(s)!;
  s.match={...createMatch(s.month===3?'starter':s.evaluation!.rank),id:plan.id,opponentId:plan.opponentId,duels:[]};
  advanceMatch(s);s.phase=s.match.over?'matchEnd':'match';if(s.match.over)recordMatch(s);
}
function finishWeekday(s:GameState){
  const plan=matchPlan(s);
  if(plan){
    if(s.month===3)startMatch(s);
    else {s.evaluation=evaluateSelection(s);s.selectionHistory.push(structuredClone(s.evaluation.competition!));s.phase='selection';}
  }else {finishRound(s);s.phase='weekend';}
}
export function transition(previous:GameState,action:Action):GameState {
  if(action.revision!==previous.revision||previous.phase==='complete')return previous;
  const s=structuredClone(previous);
  if(action.type==='lineup'&&s.phase==='lineup'){
    const ids=action.supports;
    if(s.month!==3||s.week!==1||!ids||ids.length!==DECK_SIZE||new Set(ids).size!==DECK_SIZE||ids.some(id=>!s.content.cards.some(c=>c.id===id)))return previous;
    s.content=catalogForDeck(s.content,ids);
    s.bonds=Object.fromEntries(ids.filter(id=>!['rival','catcher'].includes(id)).map(id=>[id,s.bonds[id]||10]));
    s.initial=snapshot(s);s.weekStart=snapshot(s);s.monthStart=snapshot(s);
    s.supports=[...ids];s.placements=weeklyPlacements(s);s.phase='weekday';
    s.notice=`육성 덱 · ${ids.map(id=>supportById(id,s).name).join(' · ')}. 여름 대회까지 함께 성장한다.`;
  }else if(action.type==='learn'&&['lineup','weekday','weekend','selection'].includes(s.phase)){
    const skill=availableSkills(s).find(k=>k.id===action.id);
    if(!skill||skillRequirements(s,skill.id).some(r=>!r.met)||s.skills.includes(skill.id)||s.skillPoints<skillCost(s,skill.id))return previous;
    const before=snapshot(s);s.skillPoints-=skillCost(s,skill.id);s.skills.push(skill.id);
    logChange(s,before,`스킬 습득 · ${skill.name}`,skill.description);
  }else if(action.type==='activity'&&(s.phase==='weekday'||s.phase==='weekend')){
    const effect=previewActivity(s,action.id||'',action.target,action.partner);if(!effect||effect.disabledReason)return previous;
    const activityBefore=snapshot(s);
    const weekday=s.phase==='weekday';
    if(weekday&&s.supports.length!==DECK_SIZE)return previous;
    const failed=effect.failureChance>0&&random(s)<effect.failureChance/100;
    const resolved=failed?effect.failure!:effect;
    const title=effect.title+(action.target?` · ${labels[action.target]}`:'')+(effect.training?(failed?' · 훈련 실패':' · 훈련 성공'):'')+(!failed&&effect.joint.length?' · 합동 훈련':'');
    apply(s,resolved,title,effect.training?`시작 체력 ${activityBefore.energy} · 실패 확률 ${effect.failureChance}%. ${failed?'몸이 따라주지 않아 연습을 끝내지 못했다. 능력 성장과 스킬 포인트를 얻지 못하고 컨디션이 나빠졌다.':'끝까지 연습을 마쳐 준비한 성장을 얻었다.'}`:effect.description);
    if(effect.training)s.log.at(-1)!.training={outcome:failed?'failure':'success',energyBefore:activityBefore.energy,failureChance:effect.failureChance,points:resolved.points};
    const before=snapshot(s);s.skillPoints+=resolved.points;
    for(const id of effect.present)addBond(s,id,8);
    const bonusText=effect.bondBonuses.length?(failed?' 훈련 실패로 인연 보너스 없음.':` 인연 보너스 · ${effect.bondBonuses.map(b=>`${labels[b.stat]} +${b.amount}`).join(', ')} 포함.`):'';
    if(resolved.points||effect.present.length)logChange(s,before,'함께 쌓은 연습',effect.present.length?`함께한 파트너: ${effect.present.map(id=>supportById(id,s).name).join(', ')}.${failed?' 결과는 아쉬워도 함께한 인연은 남았다.':''}${bonusText}`:'오늘의 경험이 스킬 포인트로 쌓였다.');
    s.notice=`${title} · ${Object.entries(snapshot(s)).filter(([k,v])=>v!==activityBefore[k]).map(([k,v])=>`${changeLabel(s,k,labels[k])} ${v>activityBefore[k]?'+':''}${v-activityBefore[k]}`).join(' · ')}`;
    s.schedule[scheduleIndex(s)][weekday?(s.weekdayPart===1?'weekday':'weekday2'):'weekend']=effect.title+(action.target?` · ${labels[action.target]}`:'');
    if(weekday){
      if(s.weekdayPart===1){drawEncounter(s);if(!s.activeEncounter)beginSecond(s);}
      else {s.competitor=growCompetitor(s.competitor,s.role,weekKey(s.month,s.week),sharedTraining(s,scheduleIndex(s),1),'v6',sharedTraining(s,scheduleIndex(s),2));drawEncounter(s);if(!s.activeEncounter)finishWeekday(s);}
    }else nextWeek(s);
  }else if(action.type==='choice'&&s.phase==='supportEvent'){
    const ev=currentEvent(s),choice=ev.choices[action.index??-1];if(!choice)return previous;
    if(!s.activeSupport)return previous;
    const encounter=s.activeEncounter?s.encounterHistory.at(-1):null;
    if(encounter?.choice!==null&&encounter)return previous;
    apply(s,choice,ev.title,choice.reply);s.eventReply=choice.reply;
    if(choice.points){const before=snapshot(s);s.skillPoints=Math.min(1000,s.skillPoints+choice.points);logChange(s,before,'승부의 실마리','이야기에서 스킬 포인트를 얻었다.');}
    {
      const id=s.activeSupport!,before=snapshot(s);
      addBond(s,id,choice.bond);
      if(ev.kind==='growth'&&!s.supportCompleted.includes(ev.id))s.supportCompleted.push(ev.id);
      const card=supportById(id,s),valid=[card.hints[s.role],card.ultimates[s.role]].filter((id):id is string=>Boolean(id));
      for(const hint of choice.hints)if(valid.includes(hint)&&!s.hints.includes(hint))s.hints.push(hint);
      const newly=choice.unlocks.filter(k=>valid.includes(k)&&!s.unlockedSkills.includes(k));
      s.unlockedSkills.push(...newly);
      if(encounter)encounter.choice=action.index as 0|1;
      logChange(s,before,newly.length?'상위 스킬 개방':choice.hints.length?'스킬 힌트':'함께한 시간',`${supportById(id,s).name}와 인연이 깊어졌다.${newly.length?' '+newly.map(id=>s.content.skills.find(k=>k.id===id)!.name).join(', ')+'의 습득 조건이 개방되었다.':choice.hints.some(id=>valid.includes(id))?' 일반 스킬 비용이 4 Pt 줄었다.':''}`);
      s.phase='supportResult';
    }
  }else if(action.type==='tactic'&&s.phase==='match'){
    if(!chooseTactic(s,action.id||''))return previous;s.phase='matchResult';
  }else if(action.type==='continue'){
    if(s.phase==='supportResult'){if(s.weekdayPart===1)beginSecond(s);else{s.activeEncounter=null;s.activeSupport=null;finishWeekday(s);}}
    else if(s.phase==='selection')startMatch(s);
    else if(s.phase==='matchResult'){advanceMatch(s);s.phase=s.match!.over?'matchEnd':'match';if(s.match!.over)recordMatch(s);}
    else if(s.phase==='matchEnd')s.phase='weekend';
    else return previous;
  }else return previous;
  s.revision++;return s;
}
export function effectChips(a:Activity){
  return [...Object.entries(growthChanges(a.gains,a.proficiency)),['catcher',a.catcher||0],['energy',a.energy],['stress',a.stress]]
    .filter(([,v])=>v!==0).map(([key,v])=>({key:String(key),value:Number(v),label:`${labels[String(key)]} ${Number(v)>0?'+':''}${v}`}));
}

