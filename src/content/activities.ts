import type { Activity, GameState, StatKey } from '../game/types.ts';
export function activities(s: Pick<GameState,'role'|'phase'>, target?:StatKey): Activity[] {
  if (s.phase === 'weekend') return [
    {id:'weekend_rest',title:'집에서 푹 쉬기',description:'몸을 회복하고 다음 주를 준비합니다.',gains:{},energy:32,stress:-18},
    {id:'outing',title:'혼자 산책하기',description:'동네를 걸으며 복잡한 머릿속을 비웁니다.',gains:{},energy:12,stress:-24},
    {id:'practice',title:'개인 연습',description:'지금 보완하고 싶은 능력을 골라 짧게 연습합니다.',training:true,gains:target?{[target]:3}:{},energy:-16,stress:7},
    {id:'selfstudy',title:'자습',description:'밀린 과제와 다음 수업을 준비합니다.',gains:{},academics:5,energy:-6,stress:5},
    {id:'catch',title:'동료와 캐치볼',description:'포수와 가볍게 공을 주고받으며 호흡을 맞춥니다.',gains:{field:2},catcher:5,energy:-12,stress:-8},
  ];
  const specific: Activity[] = s.role === 'batter' ? [
    {id:'batting',title:'타격 훈련',description:'정확한 타격과 공을 보는 눈을 기릅니다.',training:true,gains:{contact:7,eye:2},energy:-28,stress:10},
    {id:'weights',title:'웨이트',description:'끝까지 뻗는 타구를 위한 힘을 쌓습니다.',training:true,gains:{power:8},energy:-32,stress:12},
    {id:'fielding',title:'주루·수비 훈련',description:'빠른 첫발과 안정적인 수비를 연습합니다.',training:true,gains:{speed:5,field:4},energy:-24,stress:7},
  ] : [
    {id:'velocity',title:'구속 훈련',description:'하체와 투구 폼을 다져 직구의 힘을 키웁니다.',training:true,gains:{velocity:7},energy:-30,stress:11},
    {id:'control',title:'제구 훈련',description:'포수의 미트 끝을 겨냥해 공을 던집니다.',training:true,gains:{control:7},energy:-24,stress:8},
    {id:'breaking',title:'변화구 훈련',description:'공의 움직임과 손끝의 감각을 익힙니다.',training:true,gains:{breaking:7},energy:-28,stress:10},
    {id:'endurance',title:'지구력·수비 훈련',description:'긴 이닝을 견디고 마운드 앞 타구를 처리합니다.',training:true,gains:{stamina:5,field:3},energy:-24,stress:7},
  ];
  return [...specific,
    {id:'tactics',title:'전술 공부',description:'경기 영상을 보며 다음 승부를 상상합니다.',gains:s.role==='batter'?{eye:4,mental:2}:{control:2,mental:4},energy:-12,stress:4},
    {id:'study',title:'학교 공부',description:'야구만큼 학교 수업도 놓치지 않습니다.',gains:{},academics:9,energy:-10,stress:12},
    {id:'rest',title:'휴식',description:'충분히 자고 쉬면서 좋은 컨디션을 되찾습니다.',gains:{},energy:40,stress:-22},
  ];
}
