import type {GameState} from '../../game/types.ts';
import {backgrounds,hiddenTalents,talentRules} from '../../content/backgrounds.ts';
import {chosenBackgrounds} from '../../game/character.ts';

export function CharacterProfile({s}:{s:GameState}){
 const c=s.character;if(!c)return null;
 const hidden=hiddenTalents.find(t=>t.id===c.fate.hidden);
 return <section className="panel creation-profile"><div className="talent-heading"><span className={`talent-grade talent-${c.talent.grade}`}>{c.talent.grade}</span><div><h3>재능 등급 {c.talent.grade}</h3><p>{talentRules[c.talent.grade].description}</p></div></div>
  {hidden&&<p className="hidden-talent">✦ {hidden.name} · {hidden.description}</p>}
  <h3 className="gap-top">선수의 배경</h3><div className="chips">{chosenBackgrounds(c.background).map(id=><span className="chip" key={id}>{backgrounds.find(b=>b.id===id)?.name}</span>)}</div>
  {c.background.sportFocus&&<p className="reason">다른 운동에서 기른 강점 · {c.background.sportFocus==='power'?'파워':'지구력'}</p>}
 </section>;
}
