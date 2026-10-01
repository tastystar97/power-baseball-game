import type {presentationAt} from '../../game/playback.ts';
import {loadLimit} from '../../game/match.ts';
import type {GameState} from '../../game/types.ts';
const traits:Record<string,string>={contact:'컨택형',power:'장타력',eye:'선구안',speed:'빠른 발',field:'수비형',bunt:'번트 장인',velocity:'강속구',control:'제구형',breaking:'변화구형',stamina:'철완'};
export function MatchupCard({view,s}:{view:ReturnType<typeof presentationAt>;s:GameState}){
 const b=view.score.batterLines[view.batter?.id??''],p=view.score.pitcherLines[view.pitcher?.id??''];
 return <div className="live-matchup"><div className={view.batter?.id==='player'?'is-player':''}><small>BATTER · {view.batter?.slot??'–'}번</small><strong>{view.batterName}</strong><span>{b?`${b.ab}타수 ${b.hits}안타 · ${b.rbi}타점`:'오늘 첫 타석'}</span><small>{view.batter?.traits.map(t=>traits[t]).join(' · ')||'나의 육성 능력'}</small></div><b className="versus">VS</b><div className={view.pitcher?.id==='player'?'is-player':''}><small>PITCHER · {view.pitcher?.throws==='L'?'좌완':'우완'}</small><strong>{view.pitcherName}</strong><span>{p?`${Math.floor(p.outs/3)}.${p.outs%3}이닝 · ${p.k}K · ${p.runs}실점`:'첫 타자와의 승부'}</span><small>{view.pitcher?.traits.map(t=>traits[t]).join(' · ')||'나의 육성 능력'}</small>{view.pitcher?.id==='player'&&<label className="live-load">투구 부담<progress aria-label="투구 부담" value={p?.load??0} max={s.match!.pitchingRole==='closer'?100:loadLimit(s)}/></label>}</div></div>;
}
