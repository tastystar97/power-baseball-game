import type {GameState} from '../game/types.ts';
export function validateJournal(s:GameState){
 let lastId=0;const groups=new Set<string>(),failed=new Set<string>();
 for(const e of s.log){
  if(e.id<=lastId||e.id>s.logSequence||e.action>s.revision||e.month>s.month||e.month===s.month&&e.week>s.week)throw Error('기록 순서가 올바르지 않습니다.');
  lastId=e.id;
  if(e.summary){
   const key=`${e.month}:${e.category}`;
   if(e.month>=s.month||groups.has(key)||e.kind!=='system'||e.roll||e.training||e.slot||e.matchRef||e.speaker)throw Error('월 요약 기록이 올바르지 않습니다.');
   groups.add(key);
   if(e.summary.failures<e.summary.failedSlots.length||e.summary.failures>e.summary.count||e.summary.failures>0&&e.category!=='training')throw Error('월 요약 실패 집계가 올바르지 않습니다.');
  }
  const failures=e.summary?.failedSlots??(e.training?.outcome==='failure'&&(e.slot==='first'||e.slot==='second')?[{week:e.week,part:e.slot==='first'?1:2}]:[]);
  for(const f of failures){
   const key=`${e.month}:${f.week}:${f.part}`,w=s.schedule[(e.month-3)*4+f.week-1];
   if(e.category!=='training'||failed.has(key)||!w?.[f.part===1?'weekday':'weekday2'])throw Error('훈련 실패 기록이 올바르지 않습니다.');
   failed.add(key);
  }
  if(e.roll?.kind==='training'&&(!e.training||e.roll.outcome!==e.training.outcome))throw Error('훈련 주사위 기록이 올바르지 않습니다.');
  if(e.roll?.kind==='encounter'){
   const h=s.encounterHistory.find(h=>h.key===(e.month-3)*4+e.week&&h.part===(e.slot==='first'?1:2));
   if(!h||!['first','second'].includes(e.slot??'')||(e.roll.outcome==='appeared')!==Boolean(h.eventId))throw Error('만남 주사위 기록이 올바르지 않습니다.');
  }
  if(e.matchRef){
   const m=s.match?.id===e.matchRef.id?s.match:s.records.find(r=>r.match.id===e.matchRef!.id)?.match;
   if(!m||e.category!=='match'||(!m.summary&&e.matchRef.index>m.feed.length))throw Error('경기 기록이 올바르지 않습니다.');
  }
 }
 if(lastId!==s.logSequence)throw Error('마지막 기록 번호가 올바르지 않습니다.');
}
