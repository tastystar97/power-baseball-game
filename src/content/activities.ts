import {primaryLabels} from '../game/types.ts';
import type {Activity,GameState,TrainingTarget,PrimaryKey,Gains} from '../game/types.ts';
export const trainingOrder:PrimaryKey[]=['power','endurance','mental','intelligence','sense'];
export const WEEKEND_MULTIPLIERS={practice:.7,partner:1.2};
const primaryGain={power:34,endurance:34,mental:17,intelligence:26,sense:17};
const energy={power:-20,endurance:-18,mental:-10,intelligence:-8,sense:-18};
const stress={power:7,endurance:6,mental:-3,intelligence:3,sense:6};
const proficiency:Record<GameState['role'],Record<PrimaryKey,Gains>>={
 batter:{power:{power:3},endurance:{speed:3},mental:{eye:5},intelligence:{eye:2,field:3},sense:{contact:7,field:3}},
 pitcher:{power:{velocity:3},endurance:{stamina:3},mental:{control:5},intelligence:{breaking:5},sense:{control:4,breaking:4,field:2}},
};
const descriptions={power:'힘을 키워 묵직한 승부를 준비합니다.',endurance:'오래 버티는 몸과 꾸준한 움직임을 기릅니다.',mental:'압박 속에서도 침착하게 판단하는 힘을 기릅니다.',intelligence:'야구를 이해하고 배운 스킬을 활용하는 힘을 기릅니다.',sense:'공에 반응하는 감각과 역할에 맞는 기술을 함께 익힙니다.'};
function training(role:GameState['role'],key:PrimaryKey,multiplier=1):Activity {
 const technical=proficiency[role][key];
 return {id:`train_${key}`,title:`${primaryLabels[key]} 훈련`,description:descriptions[key],gains:{[key]:Math.round(primaryGain[key]*multiplier)},proficiency:Object.fromEntries(Object.entries(technical).map(([k,v])=>[k,v*multiplier])),energy:energy[key],stress:stress[key],training:['power','endurance','sense'].includes(key),rivalTrainingStat:Object.keys(technical)[0] as keyof Gains};
}
export function activities(s:Pick<GameState,'role'|'phase'>,target?:TrainingTarget):Activity[]{
 const key=target?.startsWith('primary_')?target.slice(8) as PrimaryKey:'sense';
 if(s.phase==='weekend')return [
  {id:'weekend_rest',title:'집에서 푹 쉬기',description:'몸을 회복하고 다음 주를 준비합니다.',gains:{},energy:32,stress:-18},
  {id:'outing',title:'혼자 산책하기',description:'스트레스를 크게 풀고 멘탈을 기릅니다.',gains:{mental:17},energy:12,stress:-40},
  {...training(s.role,key,WEEKEND_MULTIPLIERS.practice),id:'practice',title:'개인 연습',description:'기르고 싶은 능력을 골라 짧게 연습합니다.',training:true,energy:-16,stress:7},
  {id:'selfstudy',title:'야구 독서',description:'책을 읽으며 경기 이해력과 마음의 여유를 쌓습니다.',gains:{intelligence:26},energy:-4,stress:-4},
  {id:'catch',title:'동료와 캐치볼',description:'포수와 공을 주고받으며 호흡을 맞춥니다.',gains:{sense:8},proficiency:{field:3},catcher:5,energy:-12,stress:-8},
  {id:'watch',title:'경기 관전',description:'선수의 판단을 관찰하며 지능과 스킬 포인트 8 Pt를 얻습니다.',gains:{intelligence:17},energy:-8,stress:-4},
  {...training(s.role,key,WEEKEND_MULTIPLIERS.partner),id:'partner',title:'파트너 특훈',description:'인연 40 이상인 덱 파트너 한 명과 집중 훈련합니다.',training:true,energy:-24,stress:6},
 ];
 return [...trainingOrder.map(k=>training(s.role,k)),{id:'rest',title:'휴식',description:'충분히 쉬면서 좋은 컨디션을 되찾습니다.',gains:{},energy:28,stress:-14}];
}
