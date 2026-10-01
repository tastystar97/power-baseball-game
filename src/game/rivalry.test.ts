import {derivedStats} from './abilities.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCompetitor,growCompetitor,schoolRivalry,schoolDialogue,selectionDialogue} from './rivalry.ts';
import {candidateScore,decideStarter,compareCandidates} from './competition.ts';
import {createGame} from './engine.ts';
import {createMatch} from './match.ts';
test('rival grows once per weekday with explicit role plan and shared growth',()=>{
 const b=createCompetitor('batter');assert.equal(b.stats.contact,42);assert.equal(b.trust,25);
 const one=growCompetitor(b,'batter',1,null,'v6');assert.equal(one.stats.power,45);assert.equal(one.trust,26);assert.equal(b.stats.power,40);
 const two=growCompetitor(one,'batter',2,null,'v6');assert.equal(two.stats.contact,47);assert.equal(two.stats.field,39);assert.equal(two.trust,27);
 assert.equal(growCompetitor(two,'batter',2,'power','v6'),two);
 assert.throws(()=>growCompetitor(two,'batter',4,null,'v6'));
 const p=growCompetitor(createCompetitor('pitcher'),'pitcher',1,null,'v6');assert.equal(p.stats.velocity,46);
 const p2=growCompetitor(p,'pitcher',2,null,'v6');assert.equal(p2.stats.control,41);assert.equal(p2.stats.stamina,44);
 for(const [value,gain] of [[59,6],[60,4],[79,4],[80,3],[89,3],[90,1],[99,1],[100,0]]){
  const c=createCompetitor('batter');c.stats.power=value;
  assert.equal(growCompetitor(c,'batter',1,'power','v6').stats.power-value,gain);
 }
 assert.throws(()=>growCompetitor(b,'batter',1,'control','v6'));
});
test('competition thresholds and ties let training reclaim a place',()=>{
 for(const [a,b,prev,winner] of [[64,64,null,'other'],[65,64,null,'player'],[65,65,null,'player'],[65,65,'junseo','junseo'],[78,76,'junseo','player'],[72,75,'player','junseo'],[65,65,'other','player']] as const)
  assert.equal(decideStarter(a,b,prev).starter,winner);
 const s=createGame('경쟁','batter');s.proficiency.contact=90;s.proficiency.power=48;
 const m=createMatch();m.batting.pa=5;m.batting.ab=4;m.batting.hits=2;m.batting.walks=1;m.batting.rbi=1;
 s.records=[{month:3,match:m}];const score=candidateScore(s.role,derivedStats(s),s.trust,s.records);
 assert.equal(score.practice,10);assert.ok(score.performance!>10);assert.equal(score.readinessSource,'match');
 s.records.push({month:4,match:createMatch('reserve')});assert.equal(candidateScore(s.role,derivedStats(s),s.trust,s.records).performance,score.performance);
 s.records.push({month:5,match:createMatch()});assert.equal(candidateScore(s.role,derivedStats(s),s.trust,s.records).performance,score.performance);
 assert.equal(candidateScore(s.role,derivedStats(s),s.trust,null).performance,null);
 const comp=createCompetitor('batter');const initial=compareCandidates(s,comp,[],'test');
 assert.deepEqual(compareCandidates(s,comp,[initial],'test'),initial);
});
test('school history grows from actual games and remembers a revenge only after a loss',()=>{
 const rows=(wins:boolean[])=>wins.map((won,i)=>{const m=createMatch();m.over=true;m.opponentId='haesol';m.id=String(i);m.score=won?[2,3]:[3,2];return {month:3,match:m};});
 assert.equal(schoolRivalry([]).stage,'first');assert.equal(schoolRivalry(rows([true])).stage,'rematch');
 assert.equal(schoolRivalry(rows([true,true])).stage,'rival');assert.equal(schoolRivalry(rows([false,true])).revenge,true);
 assert.equal(schoolRivalry(rows([true,true])).revenge,false);assert.equal(schoolRivalry(rows([false,false])).wins,0);
 assert.equal(schoolRivalry(rows([false,true]),'1').games,1);
 assert.match(schoolDialogue(schoolRivalry([]),'before'),/처음/);
 const r=rows([true]);r[0].match.opponentId='bada';assert.equal(schoolRivalry(r).games,0);
 r[0].match.opponentId='haesol';r[0].match.score=[0,3];assert.equal(schoolRivalry(r).closeLast,false);
});
test('selection stories distinguish first chance, holding, losing and reclaiming',()=>{
 const s=createGame('경쟁','batter'),base=compareCandidates(s,createCompetitor('batter'),[],'m4-w4');
 const first={...base,starter:'player' as const,previous:null};assert.match(selectionDialogue(first,[]),/첫 선발/);
 const held={...first,matchId:'m5-w4',previous:'player' as const};assert.match(selectionDialogue(held,[first]),/지켰/);
 const lost={...held,starter:'junseo' as const};assert.match(selectionDialogue(lost,[first]),/되찾아/);
 const back={...first,matchId:'summer-1',previous:'junseo' as const};assert.match(selectionDialogue(back,[first,lost]),/다시 선발/);
 assert.match(selectionDialogue({...back,starter:'other'},[first,lost]),/다른 동료/);
});
