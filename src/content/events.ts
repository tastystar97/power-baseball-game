import {evaluateSelection} from '../game/competition.ts';
import type { Choice, GameState } from '../game/types.ts';
import { supportById } from './supports.ts';
export function currentEvent(s: GameState): {title:string; speaker:string; text:string; choices:Choice[]} {
  if(s.activeSupport&&['supportEvent','supportResult'].includes(s.phase)){
    const p=supportById(s.activeSupport);
    return {title:p.eventTitle,speaker:`${p.name} · ${p.role}`,text:p.eventText,choices:[
      {label:'배운 것을 내 연습에 적용한다',hint:'멘탈 +1 · 감독 신뢰 +1 · 인연 +10 · 스킬 힌트',reply:p.reply,gains:{mental:1},trust:1},
      {label:'내 고민도 이야기하며 함께 정리한다',hint:'스트레스 -5 · 인연 +10 · 스킬 힌트',reply:'이야기를 나누니 고민이 조금 작아졌다. 서로의 다음 목표를 기억하기로 했다.',stress:-5},
    ]};
  }
  if (s.phase === 'weekendEvent' || s.phase === 'weekendResult') return {
    title:'공 하나에 맞춰지는 호흡',speaker:'동료 포수',text:'“오늘 공 느낌 괜찮은데? 내일은 뭘 연습할 거야?” 글러브에 공이 꽂히는 소리가 운동장에 울린다.',
    choices:[
      {label:'오늘 배운 걸 같이 정리한다',hint:'호흡을 맞춘다',reply:'“다음 경기에도 그 감각, 잊지 말자.” 짧은 캐치볼이 끝나고도 한참 야구 이야기를 나눴다.',catcher:1},
      {label:'오늘은 가볍게 마무리한다',hint:'몸을 아낀다',reply:'“그래. 쉬는 것도 훈련이지.” 서로 손을 흔들고 집으로 향했다.',stress:-2},
    ],
  };
  const growth = s.role === 'batter' ? {contact:1} : {control:1};
  if(s.month===5)return [
    {title:'나만의 장점을 찾는 연습',speaker:'감독',text:'“같은 훈련을 해도 모두 같은 선수가 되지는 않아. 이번 달에는 네가 믿을 수 있는 무기를 만들어 보자.”',choices:[
      {label:'힘으로 승부할 기본기를 다진다',hint:s.role==='batter'?'파워 +2':'구속 능력 +2',reply:'몸의 움직임을 하나씩 맞추며 힘을 전달하는 감각을 익혔다.',gains:s.role==='batter'?{power:2}:{velocity:2}},
      {label:'정확하게 반복하는 감각을 익힌다',hint:s.role==='batter'?'컨택 +2':'제구 +2',reply:'같은 동작을 반복하니 원하는 곳으로 공을 보내는 감각이 선명해졌다.',gains:s.role==='batter'?{contact:2}:{control:2}},
    ]},
    {title:'상대 팀을 읽는 시간',speaker:'동료 포수',text:'“바다고는 볼넷을 쉽게 내주지 않아. 타자들도 공을 오래 봐.” 하람과 준비 경기 영상을 함께 봤다.',choices:[
      {label:'상대의 습관을 기록한다',hint:s.role==='batter'?'선구안 +3 · 감독 신뢰 +2':'멘탈 +3 · 감독 신뢰 +2',reply:'상대가 편하게 하는 야구와 어려워하는 승부를 구분해 두었다.',gains:s.role==='batter'?{eye:3}:{mental:3},trust:2},
      {label:'내 컨디션부터 정비한다',hint:'체력 +8 · 스트레스 -5',reply:'분석한 것을 실전에서 쓰려면 몸도 준비되어 있어야 한다.',energy:8,stress:-5},
    ]},
    {title:'실전에서 꺼낼 무기',speaker:'차준서 · 동기 라이벌',text:'“연습 때 잘되던 걸 경기에서도 해 보자.” 서로 가장 자신 있는 플레이를 하나씩 말해 봤다.',choices:[
      {label:'정확한 판단을 마지막으로 점검한다',hint:s.role==='batter'?'선구안 +2 · 라이벌 친밀도 +3':'변화구 +2 · 라이벌 친밀도 +3',reply:'공 하나를 더 보고, 움직임 하나를 더 기억했다.',gains:s.role==='batter'?{eye:2}:{breaking:2},rival:3},
      {label:'끝까지 버틸 준비를 한다',hint:s.role==='batter'?'멘탈 +2 · 체력 +6':'지구력 +2 · 체력 +6',reply:'승부가 길어져도 준비한 자세를 잃지 않기로 했다.',gains:s.role==='batter'?{mental:2}:{stamina:2},energy:6},
    ]},
  ][Math.min(s.week,3)-1];
  if(s.month===6){
    const opening=s.week===1;
    return {title:opening?'책상 위에 펼친 여름 대진표':s.week===4?'나의 첫 여름을 남기다':'끝난 경기에서 찾은 다음 과제',speaker:opening?'감독':'동료 포수',
      text:opening?'“8강에서 해솔고를 만난다. 그다음에는 누가 기다릴지 몰라. 한 경기씩, 우리가 준비한 야구를 하자.”':s.week===4?'대회의 마지막 날. 남은 팀들의 승부를 보며, 이번 여름의 내 공과 스윙을 돌아봤다.':'우리의 대회는 끝났지만 운동장은 그대로다. 다음 승부에 가져갈 것을 찾아 함께 공을 주웠다.',choices:[
        {label:opening?'내가 맡을 역할을 정리한다':'이번 경기에서 얻은 과제를 정리한다',hint:'멘탈 +2 · 감독 신뢰 +2',reply:'잘한 것과 부족한 것을 적었다. 다음 훈련의 목표가 생겼다.',gains:{mental:2},trust:2},
        {label:opening?'동료와 호흡을 맞추며 몸을 아낀다':'동료와 가볍게 몸을 풀며 마무리한다',hint:'체력 +10 · 스트레스 -6 · 동료 친밀도 +3',reply:'함께 연습한 시간은 남아 있다. 다시 공을 건네며 웃었다.',energy:10,stress:-6,catcher:3},
      ]};
  }
  if(s.month===4)return [
    {title:'이름이 불릴 준비',speaker:'감독',text:'“이번 달 공식전에는 준비가 된 선수를 내보낸다. 네 강점을 보여 줘.” 명단 옆 빈칸에 시선이 갔다.',choices:[
      {label:'부족한 기본기를 보완한다',hint:'주력 능력 +1 · 감독 신뢰 +3',reply:'감독이 오늘의 연습 목표를 고개를 끄덕이며 확인했다.',gains:growth,trust:3},
      {label:'수업과 훈련 계획을 함께 정리한다',hint:'학업 +3 · 스트레스 -3',reply:'하루의 순서를 정하니 운동장에서도 집중하기 쉬워졌다.',academics:3,stress:-3},
    ]},
    {title:'같은 자리를 바라보며',speaker:'차준서 · 동기 라이벌',text:`“이번에는 명단에서 만나자.” 현재 예상은 나 ${evaluateSelection(s).total}점, 준서 ${evaluateSelection(s).competition.junseo.total}점. 같은 자리를 바라보며 서로의 연습을 지켜본다.`,choices:[
      {label:'서로의 약점을 짚어 준다',hint:'주력 능력 +1 · 라이벌 친밀도 +4',reply:'상대를 돕는 일이 내 연습을 돌아보는 시간이 됐다.',gains:growth,rival:4},
      {label:'나의 장점을 감독에게 보여 준다',hint:'감독 신뢰 +4 · 스트레스 +2',reply:'불러 주기를 기다리는 대신, 먼저 한 번 더 시도했다.',trust:4,stress:2},
    ]},
    {title:'첫 공식전을 앞두고',speaker:'동료 포수',text:'“누가 먼저 나가든, 준비한 건 다 보여 주자.” 하람이 글러브를 두드렸다.',choices:[
      {label:'위기 상황의 움직임을 맞춘다',hint:'수비 +2 · 동료 친밀도 +3',reply:'짧은 신호를 다시 맞췄다. 이제 우리에게는 함께 연습한 시간이 있다.',gains:{field:2},catcher:3},
      {label:'컨디션을 확인하고 마음을 가라앉힌다',hint:'체력 +8 · 스트레스 -4',reply:'마지막까지 무리하지 않기로 했다. 좋은 상태로 기회를 기다리자.',energy:8,stress:-4},
    ]},
  ][Math.min(s.week,3)-1];
  return [
    {title:'그라운드의 첫 인사',speaker:'감독',text:'“재능은 출발점일 뿐이다. 한 달 뒤 연습경기에서 네 야구를 보여 줘.” 흙 묻은 스파이크를 고쳐 신었다.',choices:[
      {label:'기본기부터 차근차근 배우겠습니다',hint:'훈련에 집중한다',reply:'“좋아. 매일 쌓인 기본기가 위기에서 널 지켜 줄 거다.”',gains:growth,trust:2},
      {label:'동료들에게 먼저 인사한다',hint:'팀에 적응한다',reply:'“같이 잘해 보자!” 포수가 먼저 공을 건넸다.',catcher:3,stress:-3},
    ]},
    {title:'같은 유니폼, 다른 목표',speaker:'차준서 · 동기 라이벌',text:'“이번 연습경기, 먼저 이름 불리는 건 나일걸?” 옆에서 훈련하던 동기가 장난스럽게 웃는다.',choices:[
      {label:'서로의 자세를 봐 주자고 한다',hint:'경쟁 속에서 배운다',reply:'이상하게 혼자 할 때보다 집중이 잘됐다. 서로 고칠 점을 하나씩 찾았다.',gains:growth,rival:3},
      {label:'내 페이스를 지키며 집중한다',hint:'마음을 다잡는다',reply:'남의 속도를 쫓지 않기로 했다. 내 공, 내 스윙에 집중했다.',gains:{mental:2},stress:-2},
    ]},
    {title:'혼자서는 못 하는 야구',speaker:'동료 포수',text:'“다음 주 토요일 경기, 긴장돼? 난 좀 그래.” 공을 정리하던 포수가 말을 건넨다. 둘 다 같은 마음이었다.',choices:[
      {label:'서로의 신호와 움직임을 맞춘다',hint:'팀워크를 쌓는다',reply:'짧은 눈빛만으로도 무엇을 할지 알아차렸다. 이제 그라운드가 조금 덜 낯설다.',gains:{field:1},catcher:3},
      {label:'경기에서는 내가 도와줄게',hint:'책임감을 갖는다',reply:s.role==='pitcher'?'“그럼 나도 네 공은 절대 놓치지 않을게.” 작은 약속이 자신감이 됐다.':'“그럼 네가 타석에 설 때 제일 크게 응원할게.” 작은 약속이 자신감이 됐다.',gains:{mental:1},trust:2},
    ]},
  ][Math.min(s.week,3)-1];
}
