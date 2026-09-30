import {clamp} from './random.ts';

// Interpolate between anchors so a single point of energy never causes a large jump.
const riskCurve=[[0,95],[10,80],[20,60],[30,40],[40,25],[50,15],[60,5],[70,0],[100,0]] as const;
export const failurePenalty={energy:8,stress:10,mental:2};

export function trainingFailureChance(energy:number):number {
  const value=clamp(energy);
  for(let i=1;i<riskCurve.length;i++){
    const [upper,chance]=riskCurve[i], [lower,previous]=riskCurve[i-1];
    if(value<=upper)return Math.round(previous+(chance-previous)*(value-lower)/(upper-lower));
  }
  return 0;
}
export const growthMultiplier=(ability:number)=>ability>=90?.25:ability>=80?.5:ability>=60?.75:1;
export function trainingGrowth(ability:number,raw:number,stress:number):number {
  if(raw<=0)return 0;
  return Math.min(100-ability,Math.max(1,Math.floor(raw*growthMultiplier(ability)*(stress>=75?.5:1))));
}
