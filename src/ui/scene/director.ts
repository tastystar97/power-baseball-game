import type {Place,TimeOfDay,Expression,Bubble} from '../../content/scene-assets.ts';

export type CastPosition='left'|'center'|'right';
export interface CastMember {id:string;kind:'player'|'support'|'npc';pos:CastPosition;expression:Expression;bubble?:Bubble;dim?:boolean}
export interface SceneSpec {place:Place;time:TimeOfDay;cast:CastMember[]}

interface Staging {place:Place;expression:Expression;bubble:Bubble}
// Old (v0.8) and first-year menu ids share one table so the scene keeps working while the menu changes.
const staging:Record<string,Staging>={
  batting:{place:'batting',expression:'smile',bubble:'joy'},
  freebatting:{place:'batting',expression:'determined',bubble:'fire'},
  fielding:{place:'ground',expression:'determined',bubble:'sweat'},
  velocity:{place:'bullpen',expression:'determined',bubble:'fire'},
  control:{place:'bullpen',expression:'normal',bubble:'idea'},
  breaking:{place:'bullpen',expression:'surprised',bubble:'idea'},
  endurance:{place:'ground',expression:'tired',bubble:'sweat'},
  weights:{place:'clubroom',expression:'determined',bubble:'fire'},
  running:{place:'ground',expression:'tired',bubble:'sweat'},
  tactics:{place:'clubroom',expression:'normal',bubble:'idea'},
  study:{place:'classroom',expression:'normal',bubble:'idea'},
  rest:{place:'home',expression:'tired',bubble:'sleep'},
  power:{place:'clubroom',expression:'determined',bubble:'fire'},
  mental:{place:'clubroom',expression:'normal',bubble:'sigh'},
  intelligence:{place:'classroom',expression:'surprised',bubble:'idea'},
  sense:{place:'batting',expression:'smile',bubble:'joy'},
  weekend_rest:{place:'home',expression:'tired',bubble:'sleep'},
  outing:{place:'riverside',expression:'smile',bubble:'sparkle'},
  practice:{place:'ground',expression:'determined',bubble:'fire'},
  selfstudy:{place:'home',expression:'normal',bubble:'idea'},
  catch:{place:'ground',expression:'smile',bubble:'joy'},
  watch:{place:'stadium',expression:'surprised',bubble:'surprise'},
  partner:{place:'batting',expression:'determined',bubble:'fire'},
};
const indoor=new Set<Place>(['classroom','clubroom','home']);

export interface SceneInput {
  role:'batter'|'pitcher';
  phase:string;
  weekdayPart:1|2;
  /** Activity the player is looking at, or the one that just finished. */
  activity?:string;
  /** Supports placed on that activity. Only the first two appear on stage. */
  present?:string[];
  /** Result of the activity that just finished; undefined while choosing. */
  outcome?:'success'|'failure';
  /** Support speaking in an encounter. */
  speaker?:string;
  /** True once the encounter choice has been made. */
  answered?:boolean;
}

export function stagingFor(activity:string|undefined):Staging|undefined {
  // First-year trainings are `train_<primary>`; the staging table is keyed by the primary.
  return activity?staging[activity]??staging[activity.replace(/^train_/,'')]:undefined;
}

function timeFor(place:Place,input:SceneInput):TimeOfDay {
  if(indoor.has(place))return 'indoor';
  if(input.phase.startsWith('weekend'))return place==='riverside'?'dusk':'day';
  return input.weekdayPart===1?'day':'dusk';
}

/** Decides what the layered scene shows. Pure: the same input always gives the same scene. */
export function sceneFor(input:SceneInput):SceneSpec {
  const player=input.role==='batter'?'player_batter':'player_pitcher';
  if(input.speaker){
    const place:Place=input.phase.startsWith('weekend')?'riverside':'ground';
    return {place,time:timeFor(place,input),cast:[
      {id:player,kind:'player',pos:'left',expression:input.answered?'smile':'normal',bubble:input.answered?'joy':undefined,dim:!input.answered},
      {id:input.speaker,kind:'support',pos:'right',expression:input.answered?'smile':'normal',bubble:input.answered?'sparkle':'idea'},
    ]};
  }
  const s=stagingFor(input.activity);
  const place:Place=s?.place??(input.phase.startsWith('weekend')?'riverside':'ground');
  const companions=(input.present??[]).slice(0,2);
  const expression:Expression=input.outcome==='failure'?'sad':input.outcome==='success'?s?.expression??'smile':'normal';
  const bubble:Bubble|undefined=input.outcome==='failure'?'sigh':input.outcome==='success'?s?.bubble:input.activity?'question':undefined;
  const cast:CastMember[]=[{id:player,kind:'player',pos:companions.length?'left':'center',expression,bubble}];
  companions.forEach((id,i)=>cast.push({id,kind:'support',pos:i===0?'right':'center',expression:input.outcome==='failure'?'normal':'smile',bubble:i===0&&input.outcome==='success'?'joy':undefined}));
  return {place,time:timeFor(place,input),cast};
}
