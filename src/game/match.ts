import {derivedStats} from './abilities.ts';
import {eligibleSkills,rollSkills,skillActivationChance} from './skill-activation.ts';
import {getSkills} from '../content/skills.ts';
import type {SkillId} from './types.ts';
import {identifyDuel,duelEntry} from './rivalry.ts';
import {namedRivals} from '../content/rivals.ts';
import type { GameState, Match, Outcome, Tactic } from './types.ts';
import { clamp, random } from './random.ts';
import {teams} from '../content/teams.ts';

export const outcomeNames: Record<Outcome,string> = {strikeout:'삼진',out:'범타',walk:'볼넷',single:'안타',double:'2루타',homer:'홈런',sacrifice:'희생번트 성공'};
const outcomes: Outcome[] = ['strikeout','out','walk','single','double','homer','sacrifice'];
export function createMatch(appearance:Match['appearance']='starter'): Match {
  return {skillChecks:[],duels:[],appearance,inning:1,half:0,outs:0,bases:[null,null,null],score:[0,0],lines:[[0],[0]],order:[0,0],highlights:0,
    faced:0,load:0,retired:appearance==='reserve',awaiting:false,over:false,
    batting:{ab:0,hits:0,hr:0,rbi:0,walks:0,k:0},pitching:{outs:0,k:0,walks:0,hits:0,runs:0},recent:[],last:null};
}
export const loadLimit = (s:GameState) => 42 + Math.round(derivedStats(s).stamina * .5);
function genericOpponent(s: GameState) {
  const m = s.match!;
  if(s.role==='batter') return m.inning <= 3
    ? {name:'상대 선발 · 우완',trait:'빠른 공 · 제구 불안',weakness:'선구안으로 볼넷을 노릴 기회',type:'wild'}
    : m.inning <= 6 ? {name:'상대 선발 · 우완',trait:'직구 위주 · 공격적인 승부',weakness:'정확한 타격으로 빠른 공에 대응',type:'fast'}
    : {name:'상대 구원 · 좌완',trait:'변화구 위주 · 누적된 피로',weakness:'실투를 기다렸다가 장타를 노릴 기회',type:'tired'};
  const slot = m.order[0] % 9;
  return slot>=2 && slot<=4 ? {name:`상대 ${slot+1}번 타자`,trait:'장타력 좋음 · 적극적인 스윙',weakness:'변화구와 유인구에 헛스윙 가능',type:'power'}
    : {name:`상대 ${slot+1}번 타자`,trait:'끈질긴 승부 · 좋은 선구안',weakness:'스트라이크를 던져 승부할 필요',type:'patient'};
}
export function opponent(s:GameState) {
 const base=genericOpponent(s),id=s.match?.duels!==null?identifyDuel(s.role,s.match!,true):null;
 return id?{...base,name:`${namedRivals[id].name} · ${namedRivals[id].role}`} :base;
}
function recordDuel(s:GameState,result:Outcome,playerTurn:boolean,tactic:string,source:'manual'|'auto') {
 const m=s.match!;if(m.duels===null)return;
 const id=identifyDuel(s.role,m,playerTurn);if(!id)return;
 if(m.duels.some(e=>e.half===m.half&&e.order===m.order[m.half]))throw Error('맞대결 타석이 중복되었습니다.');
 m.duels.push(duelEntry(m,id,tactic,source,result));
}
function probs(k:number,walk:number,hit:number,hr:number,double:number,sac=0) {
  const p=[k,1-k-walk-hit-sac,walk,hit-hr-double,double,hr,sac];
  const weights=p.map(n=>Math.max(0,n));
  const total=weights.reduce((a,b)=>a+b,0);
  // Preview percentages and sampling must use the same distribution at 0/100 bounds.
  return weights.map(n=>n/total);
}
function resolvedTactics(s:GameState,activeSkills:SkillId[],only?:string):Tactic[] {
  if(!s.match) return [];
  const m=s.match, st=derivedStats(s), opp=opponent(s),team=teams[m.opponentId||'haesol'];
  const effects=getSkills(s).filter(k=>activeSkills.includes(k.id)).flatMap(k=>k.effects.filter(e=>!e.role||e.role===s.role).map(e=>({effect:e,name:k.name})));
  const relief=Math.max(0,...effects.map(({effect:e})=>e.kind==='fatigue'?e.amount:0));
  const fatigue=s.energy<45?.065*(1-relief):0;
  const mental=(st.mental-35)*.0008;
  const baseReason=`체력 ${s.energy} · 멘탈 ${s.attributes.mental} (스트레스 보정 ${(st.mental-s.attributes.mental).toFixed(1)}) · ${team.name} · ${opp.trait}`;
  const raw: Omit<Tactic,'outlook'|'reason'>[] = [];
  if(s.role==='batter') {
    const hit=clamp(.23+(st.contact-35)*.004+mental-fatigue,.09,.48);
    raw.push(
      {id:'contact',title:'정확하게 맞히기',description:'짧은 스윙으로 안타를 노립니다.',disabled:false,burden:0,probabilities:probs(.17,.065,hit+.07,.018,.04)},
      {id:'power',title:'장타 노리기',description:'삼진 위험을 감수하고 큰 타구를 노립니다.',disabled:false,burden:0,probabilities:probs(.32,.055,clamp(hit-.025+(st.power-35)*.001,.1,.52),clamp(.065+(st.power-35)*.002+(opp.type==='tired'?.02:0),.025,.18),.07)},
      {id:'patient',title:'공 골라내기',description:'상대의 제구를 보고 출루를 노립니다.',disabled:false,burden:0,probabilities:probs(.24,clamp(.13+(st.eye-35)*.003+(opp.type==='wild'?.10:-.015)-fatigue,.04,.40),hit-.02,.018,.035)},
      {id:'bunt',title:'희생번트',description:'아웃 하나를 대가로 주자의 진루를 노립니다.',disabled:m.outs>=2||!m.bases.some(Boolean),burden:0,probabilities:probs(.13,0,.05,.0,0,clamp(.48+(st.contact+st.speed-70)*.003-fatigue,.3,.85))},
    );
  } else {
    const wear=m.load/loadLimit(s)*.095;
    const hit=clamp(.29-(st.control-35)*.0025-mental+fatigue+wear,.1,.48);
    raw.push(
      {id:'fastball',title:'직구로 승부',description:'힘 있는 공으로 정면 승부합니다.',disabled:m.retired,burden:8,probabilities:probs(clamp(.27+(st.velocity-35)*.004-wear,.1,.5),.065,hit+(opp.type==='power'?.045:0),.055,.055)},
      {id:'breaking',title:'변화구로 유도',description:'타이밍을 빼앗아 헛스윙을 노립니다.',disabled:m.retired,burden:9,probabilities:probs(clamp(.26+(st.breaking-35)*.004+(opp.type==='power'?.07:0)-wear,.1,.5),clamp(.12-(st.control-35)*.002+wear,.035,.28),hit-.03,.025,.045)},
      {id:'control',title:'맞혀 잡기',description:'수비를 믿고 적은 부담으로 아웃을 노립니다.',disabled:m.retired,burden:5,probabilities:probs(.12,.035,hit+.025-(st.field-35)*.001,.025,.05)},
      {id:'chase',title:'유인구 위주',description:'장타를 경계하며 볼넷의 위험을 감수합니다.',disabled:m.retired,burden:8,probabilities:probs(.26,clamp(.19+(opp.type==='patient'?.10:0)-(st.control-35)*.002+wear,.05,.42),hit-.08,.015,.025)},
    );
  }
  return raw.filter(t=>!only||t.id===only).map(t=>{
    const active:string[]=[];
    const move=(from:number,to:number,amount:number,name?:string)=>{const n=Math.min(t.probabilities[from],amount);t.probabilities[from]-=n;t.probabilities[to]+=n;if(name)active.push(name);};
    let matchup='';
    if(s.role==='batter'&&team.pitching==='power'){
      move(3,0,.025);matchup='상대 구위: 안타 -2.5%p·삼진 +2.5%p';
      if(t.id==='contact'){move(0,3,.015);matchup+=' · 정확한 타격으로 1.5%p 보완';}
    }
    if(s.role==='batter'&&team.pitching==='control'){
      move(2,1,.02);matchup='상대 제구: 볼넷 -2%p';
      if(t.id==='power'){move(1,4,.015);matchup+=' · 적극적 승부로 2루타 +1.5%p';}
    }
    if(s.role==='pitcher'&&team.batting==='power'){
      move(1,5,.02);matchup='상대 장타력: 피홈런 +2%p';
      if(t.id==='breaking'){move(5,1,.015);matchup+=' · 변화구로 1.5%p 보완';}
    }
    if(s.role==='pitcher'&&team.batting==='patient'){
      move(1,2,.02);matchup='상대 선구안: 볼넷 +2%p';
      if(t.id==='control'){move(2,1,.015);matchup+=' · 맞혀 잡기로 1.5%p 보완';}
    }
    for(const {effect:e,name} of effects){
      if(e.kind==='probability')move(outcomes.indexOf(e.from),outcomes.indexOf(e.to),e.amount,name);
      else if(e.kind==='burden'){t.burden=Math.max(1,t.burden-e.amount);active.push(name);}
      else if(s.energy<45)active.push(name);
    }
    const success=s.role==='batter' ? (t.id==='bunt'?t.probabilities[6]:t.probabilities.slice(2,6).reduce((a,b)=>a+b,0)) : t.probabilities[0]+t.probabilities[1];
    const outlook=t.disabled?'선택 불가':success>=(s.role==='batter'?.36:.63)?'유리':success<(s.role==='batter'?.26:.48)?'불리':'보통';
    const reason=t.disabled?'2아웃 미만이며 진루할 주자가 있어야 합니다.':`${baseReason} · ${s.role==='batter'?(t.id==='bunt'?'진루':'출루'):'아웃'} 전망 ${Math.round(success*100)}%`;
    return {...t,outlook,reason:reason+(matchup?` · ${matchup}`:'')+(active.length?` · 적용 스킬: ${active.join(', ')}`:'')};
  });
}
/** Preview integrates every activation subset, including clamped probability transfers. */
export function tactics(s:GameState):Tactic[] {
  if(!s.match)return [];
  const chance=skillActivationChance(s.attributes.intelligence);
  return resolvedTactics(s,[]).map(base=>{
    const eligible=eligibleSkills(s,base.id);
    if(!eligible.length)return base;
    const probabilities=Array<number>(7).fill(0);let burden=0;
    for(let mask=0;mask<2**eligible.length;mask++){
      const active=eligible.filter((_,i)=>mask&(1<<i));
      const weight=chance**active.length*(1-chance)**(eligible.length-active.length);
      const t=resolvedTactics(s,active,base.id)[0];
      t.probabilities.forEach((v,i)=>probabilities[i]+=v*weight);burden+=t.burden*weight;
    }
    const success=s.role==='batter'?(base.id==='bunt'?probabilities[6]:probabilities.slice(2,6).reduce((a,b)=>a+b,0)):probabilities[0]+probabilities[1];
    const outlook=base.disabled?'선택 불가':success>=(s.role==='batter'?.36:.63)?'유리':success<(s.role==='batter'?.26:.48)?'불리':'보통';
    const reason=base.reason.replace(/전망 \d+%/,`평균 전망 ${Math.round(success*100)}%`)+` · 지능 ${s.attributes.intelligence}: 각 스킬 발동 ${(chance*100).toFixed(1).replace('.0','')}% · 발동 후보: ${eligible.map(id=>getSkills(s).find(k=>k.id===id)!.name).join(', ')} · 발동 여부를 반영한 평균 확률`;
    return {...base,probabilities,burden,outlook,reason};
  });
}
function actualTactic(s:GameState,id:string,source:'manual'|'auto'):Tactic|undefined {
  const available=resolvedTactics(s,[]).find(t=>t.id===id);
  if(!available||available.disabled)return;
  const active=rollSkills(s,id,source);
  const tactic=resolvedTactics(s,active,id)[0];
  if(s.match!.skillChecks!==null){
    const names=active.map(id=>getSkills(s).find(k=>k.id===id)!.name);
    tactic.reason+=` · 스킬 판정: ${names.length?names.join(', '):eligibleSkills(s,id).length?'미발동':'발동 조건을 만족한 스킬 없음'}`;
  }
  return tactic;
}
function note(m:Match,text:string) {m.recent.push(text);m.recent=m.recent.slice(-12);}

/** Shared baserunning and scoring rules. Mutates only the supplied match draft. */
export function applyOutcome(m:Match, result:Outcome, playerBatter:boolean, playerPitcher:boolean) {
  const before=m.score[m.half];
  // Away: owner identifies the responsible pitcher. Home: it identifies our batter.
  const runner={owner:playerPitcher||playerBatter?'player' as const:m.half===0?'opponent' as const:'team' as const};
  const scoreRunner=(r:Match['bases'][number])=>{
    if(!r) return;
    // A non-HR walk-off ends scoring as soon as the winning run crosses home.
    if(result!=='homer' && m.half===1 && m.inning>=9 && m.score[1]>m.score[0]) return;
    m.score[m.half]++;
    m.lines[m.half][m.inning-1]=(m.lines[m.half][m.inning-1]||0)+1;
    if(m.half===0 && r.owner==='player') m.pitching.runs++;
  };
  const isHit=['single','double','homer'].includes(result);
  if(playerBatter) {
    if(result==='walk') m.batting.walks++;
    else if(result!=='sacrifice') m.batting.ab++;
    if(isHit)m.batting.hits++;
    if(result==='homer')m.batting.hr++;
    if(result==='strikeout')m.batting.k++;
  }
  if(playerPitcher) {
    m.faced++;
    if(result==='walk')m.pitching.walks++;
    if(isHit)m.pitching.hits++;
    if(result==='strikeout')m.pitching.k++;
  }
  if(result==='walk') {
    if(m.bases[0]) {
      if(m.bases[1]) { if(m.bases[2])scoreRunner(m.bases[2]); m.bases[2]=m.bases[1]; }
      m.bases[1]=m.bases[0];
    }
    m.bases[0]=runner;
  } else if(result==='sacrifice') {
    m.outs++; if(playerPitcher)m.pitching.outs++;
    if(m.outs<3) { scoreRunner(m.bases[2]);m.bases=[null,m.bases[0],m.bases[1]]; }
  } else if(isHit) {
    const advance=result==='homer'?4:result==='double'?2:1;
    for(let i=2;i>=0;i--) {
      const r=m.bases[i];m.bases[i]=null;
      if(r) {if(i+advance>=3)scoreRunner(r);else m.bases[i+advance]=r;}
    }
    if(advance===4)scoreRunner(runner);else m.bases[advance-1]=runner;
  } else {m.outs++;if(playerPitcher)m.pitching.outs++;}
  if(playerBatter)m.batting.rbi+=m.score[m.half]-before;
  m.order[m.half]++;
}
function boundary(m:Match) {
  if(m.half===1 && m.inning>=9 && m.score[1]>m.score[0]) {m.over=true;return;}
  if(m.outs<3)return;
  if(m.inning>=9 && ((m.half===0&&m.score[1]>m.score[0])||(m.half===1&&m.score[0]!==m.score[1]))) {m.over=true;return;}
  m.outs=0;m.bases=[null,null,null];
  if(m.half===0)m.half=1;
  else {m.half=0;m.inning++;m.lines[0].push(0);m.lines[1].push(0);}
  if(m.inning>=10) m.bases[1]={owner:'team'}; // extra-inning runner, never charged to the former starter
}
function sample(s:GameState, probabilities:number[]):Outcome {
  const roll=random(s)*probabilities.reduce((a,b)=>a+b,0);
  let sum=0;
  for(let i=0;i<probabilities.length;i++){sum+=probabilities[i];if(roll<sum)return outcomes[i];}
  return 'out';
}
function pitchLoad(s:GameState, burden:number) {
  const m=s.match!;m.load+=burden;
  if(m.load>=loadLimit(s)&&!m.retired){m.retired=true;note(m,'감독이 투구 부담을 확인하고 교체했다. 남은 경기는 동료들이 이어간다.');}
}
export function chooseTactic(s:GameState,id:string):boolean {
  const m=s.match;
  if(!m||!m.awaiting||m.over)return false;
  const t=actualTactic(s,id,'manual');
  if(!t||t.disabled)return false;
  const before=m.score[m.half];
  const result=sample(s,t.probabilities);
  const half=`${m.inning}회 ${m.half===0?'초':'말'}`;
  recordDuel(s,result,true,t.id,'manual');
  applyOutcome(m,result,s.role==='batter',s.role==='pitcher');
  if(s.role==='pitcher')pitchLoad(s,t.burden);
  m.highlights++;m.awaiting=false;
  const runs=m.score[m.half]-before;
  m.last={title:outcomeNames[result],text:`${half} · ${t.title}. ${runs?`${runs}점 ${s.role==='batter'?'득점':'실점'}. `:''}${m.outs}아웃, ${m.bases.filter(Boolean).length}명의 주자.`,reasons:[t.reason,`선택의 결과는 능력·컨디션·상대 특징과 난수로 결정됩니다.`],runs};
  note(m,`${half} · 나의 승부: ${outcomeNames[result]}${runs?` (${runs}점)`:''}`);
  boundary(m);
  return true;
}
/** Simulate actual plate appearances until the next player choice or game end. */
export function advanceMatch(s:GameState) {
  const m=s.match!;
  if(m.over||m.awaiting)return;
  for(let safety=0;safety<2500;safety++) {
    boundary(m);if(m.over)break;
    const pb=s.role==='batter'&&m.half===1&&(m.appearance==='starter'?m.order[1]%9===4:m.appearance==='substitute'&&m.inning>=7&&m.highlights===0);
    const pp=s.role==='pitcher'&&m.half===0&&!m.retired&&(m.appearance==='starter'||m.inning>=7);
    const highlight=pb||(pp&&[0,3,6].includes(m.faced));
    if(highlight&&m.highlights<3){m.awaiting=true;return;}
    const team=teams[m.opponentId||'haesol'];
    let probabilities=m.half===0?probs(.2,team.batting==='patient'?.095:.075,.265,team.batting==='power'?.048:.028,.05)
      :probs(team.pitching==='power'?.225:.2,team.pitching==='control'?.055:.075,team.pitching==='power'?.25:.265,.028,.05);
    const chosen=pb||pp?actualTactic(s,pb?'contact':'control','auto'):null;
    if(chosen)probabilities=chosen.probabilities;
    const before=m.score[m.half];
    const half=`${m.inning}회 ${m.half===0?'초':'말'}`;
    const result=sample(s,probabilities);
    recordDuel(s,result,pb||pp,pb?'contact':'control','auto');
    applyOutcome(m,result,pb,pp);
    if(pp)pitchLoad(s,chosen!.burden+Math.floor(random(s)*3));
    const runs=m.score[m.half]-before;
    if(runs||pb)note(m,`${half} · ${pb?'나의 타석 (요약)':m.half===1?'우리 팀':'상대 팀'} ${outcomeNames[result]}${runs?` · ${runs}점`:''}`);
  }
  if(!m.over)throw new Error('경기 진행이 정상적으로 끝나지 않았습니다.');
  m.awaiting=false;
}
