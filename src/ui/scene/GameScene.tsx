import {useMemo} from 'react';
import type {GameState} from '../../game/types.ts';
import {supportById} from '../../content/supports.ts';
import {characterArt} from '../../content/scene-assets.ts';
import {SceneStage} from './SceneStage.tsx';
import type {ResolvedCharacter,FloatingText} from './SceneStage.tsx';
import {sceneFor} from './director.ts';
import type {SceneInput} from './director.ts';

function lighten(hex:string,amount=.45):string {
  const n=parseInt(hex.slice(1),16),mix=(c:number)=>Math.round(c+(255-c)*amount);
  return `#${[n>>16,(n>>8)&255,n&255].map(mix).map(c=>c.toString(16).padStart(2,'0')).join('')}`;
}
const nonPlayer=/매니저|반 친구|분석|영상|지원|기록/;

/** Characters come from the scene manifest first, then from support cards (color and card-pack portrait). */
export function characterResolver(s:Pick<GameState,'content'>) {
  return (id:string):ResolvedCharacter|undefined=>{
    if(characterArt[id])return characterArt[id];
    const card=supportById(id,s);
    if(!card)return undefined;
    const image=card.portrait?s.content.images[card.portrait]:undefined;
    const fieldPlayer=!nonPlayer.test(card.role);
    return {name:card.name,tint:[lighten(card.color),card.color],cap:fieldPlayer,longHair:!fieldPlayer,head:.13,files:{},
      ...(image?{portrait:`data:${image.mime};base64,${image.data}`}:{})};
  };
}

export function GameScene({s,input,effects,caption}:{s:GameState;input:Omit<SceneInput,'role'|'phase'|'weekdayPart'>;effects?:FloatingText[];caption?:string}) {
  const resolve=useMemo(()=>characterResolver(s),[s.content]);
  const spec=sceneFor({role:s.role,phase:s.phase,weekdayPart:s.weekdayPart,...input});
  return <SceneStage spec={spec} resolve={resolve} effects={effects} caption={caption}/>;
}
