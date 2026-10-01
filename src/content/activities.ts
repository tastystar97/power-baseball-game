import type { Activity, GameState, TrainingTarget } from '../game/types.ts';
import {targetGrowth} from '../game/abilities.ts';
export function activities(s: Pick<GameState,'role'|'phase'>, target?:TrainingTarget): Activity[] {
  if (s.phase === 'weekend') return [
    {id:'weekend_rest',title:'집에서 푹 쉬기',description:'몸을 회복하고 다음 주를 준비합니다.',gains:{},energy:32,stress:-18},
    {id:'outing',title:'혼자 산책하기',description:'스트레스를 크게 풀고 멘탈을 기릅니다. 지친 마음을 회복하는 데 좋습니다.',gains:{mental:2},energy:12,stress:-40},
    {id:'practice',title:'개인 연습',description:'지금 보완하고 싶은 능력을 골라 짧게 연습합니다.',training:true,...targetGrowth(target,6,3),energy:-16,stress:7},
    {id:'selfstudy',title:'야구 독서',description:'조용히 책을 읽으며 경기 이해력과 마음의 여유를 쌓습니다.',gains:{intelligence:3},energy:-4,stress:-4},
    {id:'catch',title:'동료와 캐치볼',description:'포수와 가볍게 공을 주고받으며 호흡을 맞춥니다.',gains:{sense:1},proficiency:{field:3},catcher:5,energy:-12,stress:-8},
    {id:'watch',title:'경기 관전',description:'선수들의 판단을 관찰합니다. 지능과 스킬 포인트 8 Pt를 얻습니다.',gains:{intelligence:2},energy:-8,stress:-4},
    {id:'partner',title:'파트너 특훈',description:'육성 덱 파트너 중 인연 40 이상인 한 명과 집중 훈련합니다. 인연 보너스가 적용됩니다.',training:true,...targetGrowth(target,12,6),energy:-24,stress:6},
  ];
  const specific: Activity[] = s.role === 'batter' ? [
    {id:'batting',title:'타격 훈련',description:'정확한 타격과 공을 보는 눈을 기릅니다.',training:true,gains:{sense:1},proficiency:{contact:10,eye:2},rivalTrainingStat:'contact',energy:-18,stress:6},
    {id:'freebatting',title:'프리배팅',description:'힘을 타구에 싣는 기술을 연습합니다.',training:true,gains:{power:1},proficiency:{power:10},rivalTrainingStat:'power',energy:-20,stress:7},
    {id:'fielding',title:'주루·수비 훈련',description:'빠른 첫발과 안정적인 수비를 연습합니다.',training:true,gains:{sense:1},proficiency:{speed:6,field:6},rivalTrainingStat:'speed',energy:-16,stress:5},
  ] : [
    {id:'velocity',title:'구속 훈련',description:'하체와 투구 폼을 다져 직구의 힘을 키웁니다.',training:true,gains:{power:1},proficiency:{velocity:10},rivalTrainingStat:'velocity',energy:-20,stress:7},
    {id:'control',title:'제구 훈련',description:'포수의 미트 끝을 겨냥해 공을 던집니다.',training:true,gains:{sense:1},proficiency:{control:10},rivalTrainingStat:'control',energy:-16,stress:5},
    {id:'breaking',title:'변화구 훈련',description:'공의 움직임과 손끝의 감각을 익힙니다.',training:true,gains:{sense:1},proficiency:{breaking:10},rivalTrainingStat:'breaking',energy:-18,stress:6},
    {id:'endurance',title:'투구 체력·수비 훈련',description:'긴 이닝을 견디고 마운드 앞 타구를 처리합니다.',training:true,gains:{endurance:1},proficiency:{stamina:6,field:6},rivalTrainingStat:'stamina',energy:-16,stress:5},
  ];
  return [...specific,
    {id:'weights',title:'웨이트',description:'여러 야구 기술의 바탕이 되는 파워를 기릅니다.',training:true,gains:{power:5},rivalTrainingStat:s.role==='batter'?'power':'velocity',energy:-21,stress:7},
    {id:'running',title:'러닝',description:'오래 버티는 몸을 만듭니다. 기술 숙련의 성장 기반이 됩니다.',training:true,gains:{endurance:5},rivalTrainingStat:s.role==='batter'?'speed':'stamina',energy:-18,stress:6},
    {id:'tactics',title:'전술 공부',description:'경기 영상을 보며 다음 승부를 상상합니다.',gains:{intelligence:1,mental:1},proficiency:s.role==='batter'?{eye:4}:{control:4},rivalTrainingStat:s.role==='batter'?'eye':'control',energy:-8,stress:3},
    {id:'study',title:'이론 공부',description:'지능을 높여 배운 스킬을 경기에서 발동할 확률을 올립니다.',gains:{intelligence:4},energy:-8,stress:4},
    {id:'rest',title:'휴식',description:'충분히 자고 쉬면서 좋은 컨디션을 되찾습니다.',gains:{},energy:28,stress:-14},
  ];
}
