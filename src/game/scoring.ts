import type {PlateContext,PlayEvent,BaseRunner} from './plate.ts';
export const emptyBatting=()=>({pa:0,ab:0,hits:0,doubles:0,triples:0,hr:0,rbi:0,walks:0,hbp:0,k:0,sf:0,sh:0,errors:0,rbiChances:0,sb:0,cs:0});
export const emptyPitching=()=>({outs:0,k:0,walks:0,hbp:0,hits:0,hr:0,runs:0,sv:0,hold:0,bs:0});
export interface PitcherLine extends ReturnType<typeof emptyPitching> {team:0|1;started:boolean;entryLead:number;saveOpportunity:boolean;exited:boolean;load:number;faced:number;}
export interface ScoreState {
 inning:number;half:0|1;outs:number;bases:[BaseRunner|null,BaseRunner|null,BaseRunner|null];score:[number,number];lines:[number[],number[]];order:[number,number];over:boolean;
 batting:ReturnType<typeof emptyBatting>;pitching:ReturnType<typeof emptyPitching>;faced:number;load:number;
 batterLines:Record<string,ReturnType<typeof emptyBatting>>;pitcherLines:Record<string,PitcherLine>;totals:[{hits:number;errors:number},{hits:number;errors:number}];
}
export function createScoreState():ScoreState {return {inning:1,half:0,outs:0,bases:[null,null,null],score:[0,0],lines:[[0],[0]],order:[0,0],over:false,batting:emptyBatting(),pitching:emptyPitching(),faced:0,load:0,batterLines:{},pitcherLines:{},totals:[{hits:0,errors:0},{hits:0,errors:0}]};}
const other=(half:0|1):0|1=>half===0?1:0;
function copyPlayerLine(m:ScoreState){const line=m.pitcherLines.player;if(line){for(const key of Object.keys(m.pitching) as (keyof typeof m.pitching)[])m.pitching[key]=line[key];m.load=line.load;m.faced=line.faced;}}
export function enterPitcher(m:ScoreState,team:0|1,id:string,started:boolean){
 if(m.pitcherLines[id])return;
 const lead=m.score[team]-m.score[other(team)];
 m.pitcherLines[id]={...emptyPitching(),team,started,entryLead:lead,saveOpportunity:!started&&lead>0&&(lead<=3||lead<=m.bases.filter(Boolean).length+2),exited:false,load:0,faced:0};
}
export function leavePitcher(m:ScoreState,id:string){
 const p=m.pitcherLines[id];if(!p||p.exited)return;
 if(p.saveOpportunity&&!p.bs&&p.outs>0&&m.score[p.team]>m.score[other(p.team)])p.hold=1;
 p.exited=true;copyPlayerLine(m);
}
export function finishPitching(m:ScoreState){
 for(const p of Object.values(m.pitcherLines))if(!p.exited&&!p.started&&!p.bs&&p.outs>0&&m.score[p.team]>m.score[other(p.team)]&&(p.saveOpportunity||p.outs>=9))p.sv=1;
 copyPlayerLine(m);
}
/** One event owns both the scoreboard and every personal record; replay is read-only. */
export function applyPlay(m:ScoreState,e:PlayEvent){
 if(m.over||m.inning!==e.inning||m.half!==e.half||m.order[m.half]!==e.order||m.outs!==e.before.outs||JSON.stringify(m.bases)!==JSON.stringify(e.before.bases)||JSON.stringify(m.score)!==JSON.stringify(e.before.score))throw Error('현재 경기와 맞지 않거나 이미 적용한 플레이입니다.');
 const fielding=other(e.half);enterPitcher(m,fielding,e.pitcher.id,e.inning===1&&e.order===0);
 const pitcher=m.pitcherLines[e.pitcher.id];
 const line=m.batterLines[e.batter.id]??=emptyBatting();
 const hit=['single','infieldSingle','double','triple','homer'].includes(e.outcome);
 if(e.kind==='plate'){
  line.pa++;line.rbiChances+=e.before.bases.filter(Boolean).length;
  if(!['walk','hitByPitch','sacrificeFly','sacrificeBunt'].includes(e.outcome))line.ab++;
  if(hit){line.hits++;pitcher.hits++;m.totals[e.half].hits++;}
  if(e.outcome==='double')line.doubles++;
  if(e.outcome==='triple')line.triples++;
  if(e.outcome==='homer'){line.hr++;pitcher.hr++;}
  if(e.outcome==='walk'){line.walks++;pitcher.walks++;}
  if(e.outcome==='hitByPitch'){line.hbp++;pitcher.hbp++;}
  if(e.outcome==='strikeout'){line.k++;pitcher.k++;}
  if(e.outcome==='sacrificeFly')line.sf++;
  if(e.outcome==='sacrificeBunt')line.sh++;
  if(e.outcome==='error'){line.errors++;m.totals[fielding].errors++;}
  line.rbi+=e.rbi;pitcher.faced++;pitcher.load+=e.burden;m.order[e.half]++;
 }else{
  const r=e.moves[0]?.runner;
  if(r){const running=m.batterLines[r.id]??=emptyBatting();if(e.outcome==='stolenBase')running.sb++;else running.cs++;}
 }
 pitcher.outs+=e.outs;
 for(const move of e.moves)if(move.to===4&&move.runner.responsible){
  const id=move.runner.responsible;
  // A replaced pitcher's runners retain responsibility across subsequent plates.
  if(!m.pitcherLines[id])enterPitcher(m,fielding,id,true);
  m.pitcherLines[id].runs++;
 }
 m.bases=structuredClone(e.after.bases);m.outs=e.after.outs;m.score=[...e.after.score];
 m.lines[e.half][e.inning-1]=(m.lines[e.half][e.inning-1]??0)+e.runs;
 if(pitcher.saveOpportunity&&!pitcher.bs&&m.score[fielding]<=m.score[e.half]){pitcher.bs=1;pitcher.hold=0;}
 if(m.batterLines.player)m.batting={...m.batterLines.player};copyPlayerLine(m);
 return {runs:e.runs,outs:e.outs};
}
export function advanceHalf(m:ScoreState){
 if(m.over)return;
 if(m.half===1&&m.inning>=9&&m.score[1]>m.score[0]){m.over=true;finishPitching(m);return;}
 if(m.outs<3)return;
 if(m.inning>=9&&(m.half===0&&m.score[1]>m.score[0]||m.half===1&&m.score[0]!==m.score[1])){m.over=true;finishPitching(m);return;}
 m.outs=0;m.bases=[null,null,null];
 if(m.half===0)m.half=1;else{m.half=0;m.inning++;m.lines[0].push(0);m.lines[1].push(0);}
 if(m.inning>=10)m.bases[1]={id:`tiebreak_${m.inning}_${m.half}`,name:'승부치기 주자',owner:'team',speed:50,responsible:null};
}
export function stealPlay(ctx:PlateContext,safe:boolean):PlayEvent {
 const r=ctx.bases[0];if(!r||ctx.bases[1])throw Error('도루할 수 있는 주자가 없습니다.');
 const before={outs:ctx.outs,bases:structuredClone(ctx.bases),score:[...ctx.score] as [number,number]},after=structuredClone(before);
 after.bases[0]=null;if(safe)after.bases[1]=r;else after.outs++;
 return {kind:'steal',outcome:safe?'stolenBase':'caughtStealing',inning:ctx.inning,half:ctx.half,order:ctx.order,batter:{id:ctx.batter.id,name:ctx.batter.name},pitcher:{id:ctx.pitcher.id,name:ctx.pitcher.name},playerBatter:false,playerPitcher:ctx.playerPitcher,tactic:'steal',source:'auto',burden:0,ball:null,direction:null,fielder:null,moves:[{runner:r,from:1,to:safe?2:'out'}],outs:safe?0:1,runs:0,rbi:0,before,after};
}
