import type {GameState} from '../game/types.ts';
import type {previewActivity} from '../game/engine.ts';
import {effectChips} from '../game/engine.ts';
import {supportById,bond} from '../content/supports.ts';
import {CardAvatar} from './DeckBuilder.tsx';
import {trainingRiskLabel} from '../game/training.ts';

type Preview=NonNullable<ReturnType<typeof previewActivity>>;
type Kind='power'|'endurance'|'mental'|'intelligence'|'sense'|'rest';
// Old and first-year menu ids map onto the five primary colors (and rest).
const kinds:Record<string,Kind>={power:'power',weights:'power',freebatting:'power',velocity:'power',endurance:'endurance',running:'endurance',fielding:'endurance',mental:'mental',tactics:'mental',outing:'mental',intelligence:'intelligence',study:'intelligence',selfstudy:'intelligence',watch:'intelligence',sense:'sense',batting:'sense',control:'sense',breaking:'sense',catch:'sense',practice:'sense',partner:'sense',rest:'rest',weekend_rest:'rest'};
const marks:Record<Kind,string>={power:'PWR',endurance:'END',mental:'MNT',intelligence:'INT',sense:'SNS',rest:'REST'};
export const activityKind=(id:string):Kind=>kinds[id]??kinds[id.replace(/^train_/,'')]??'sense';

export function ActivityTile({s,id,title,description,preview,selected,onSelect}:{s:GameState;id:string;title:string;description:string;preview:Preview;selected:boolean;onSelect:()=>void}) {
  const kind=activityKind(id),chips=effectChips(preview);
  // Proficiency is hidden: it shows as one technique marker, never as a number.
  const visible=chips.filter(c=>c.key!=='energy'&&c.key!=='stress'&&c.value>0&&!c.key.startsWith('proficiency_'));
  const technique=chips.some(c=>c.key.startsWith('proficiency_')&&c.value>0);
  const gains=[...visible.slice(0,technique?1:2).map(c=>c.label),...(technique?['기술 ▲']:[])];
  const energy=chips.find(c=>c.key==='energy');
  return <button className={`card activity-tile ${kind}`} disabled={!!preview.disabledReason} aria-pressed={selected} onClick={onSelect} title={description}>
    {preview.present.length>0&&<span className="tile-faces" aria-label={`함께: ${preview.present.map(p=>supportById(p,s).name).join(', ')}`}>{preview.present.map(p=><span key={p} className={`tile-face ${preview.joint.includes(p)?'joint':''}`} title={`${supportById(p,s).name} · 인연 ${bond(s,p)}`}><CardAvatar card={supportById(p,s)} content={s.content}/></span>)}</span>}
    <span className={`tile-icon ${kind}`} aria-hidden="true">{marks[kind]}</span>
    <strong className="tile-name">{title}</strong>
    <span className="tile-gain">{gains.length?gains.join(' · '):preview.points>0?`스킬 +${preview.points} Pt`:'컨디션 회복'}</span>
    <span className="tile-meta">{energy&&<span className={`chip ${energy.value<0?'cost':''}`}>{energy.label}</span>}<span className={`chip ${preview.failureChance>=25?'cost':'safe'}`}>{preview.training?trainingRiskLabel(preview.failureChance):'실패 없음'}</span></span>
    {preview.disabledReason&&<span className="reason warning">{preview.disabledReason}</span>}
  </button>;
}
