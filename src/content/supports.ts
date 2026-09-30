import type { GameState, Role, SupportId } from '../game/types.ts';

export interface Support {
  id:SupportId; name:string; role:string; description:string; color:string;
  training:Record<Role,string[]>; eventTitle:string; eventText:string; reply:string;
}
export const supports:Support[]=[
  {id:'bat_senior',name:'강민재',role:'타격 전문 선배',color:'#b47532',description:'스윙을 잘게 나눠 설명하는 차분한 선배. 기본기를 끝까지 함께 다듬습니다.',training:{batter:['batting','weights'],pitcher:['endurance','tactics']},eventTitle:'한 번 더, 같은 스윙',eventText:'“잘 맞은 공보다, 왜 잘 맞았는지가 중요해.” 민재가 연습 노트의 빈칸을 가리킨다.',reply:'내 감각을 말로 정리하자 다음 연습의 목표가 또렷해졌다.'},
  {id:'pitch_senior',name:'이도윤',role:'투수 전문 선배',color:'#4d739a',description:'공 하나의 의도를 묻는 연구파. 구속과 변화구, 경기 준비를 돕습니다.',training:{batter:['tactics','fielding'],pitcher:['velocity','breaking']},eventTitle:'공 하나에도 이유가 있다',eventText:'“빠르기만 해서는 안 돼. 상대가 무슨 공을 기다리는지 봐.” 도윤이 경기 영상을 멈췄다.',reply:'상대의 시선으로 승부를 다시 보았다. 내 장점을 언제 써야 하는지 조금 알 것 같다.'},
  {id:'rival',name:'차준서',role:'동기 라이벌',color:'#a95950',description:'승부욕 넘치는 동기. 지기 싫은 마음을 꾸준한 훈련으로 바꿔 줍니다.',training:{batter:['weights','fielding'],pitcher:['velocity','endurance']},eventTitle:'먼저 끝내는 사람이 기다리기',eventText:'“오늘은 누가 끝까지 자세를 유지하나 볼까?” 준서가 먼저 준비 자세를 잡았다.',reply:'경쟁이 끝난 뒤 둘 다 웃었다. 이겨야 할 상대가 좋은 연습 파트너이기도 했다.'},
  {id:'catcher',name:'박하람',role:'동료 포수',color:'#578d73',description:'작은 흔들림도 알아채는 포수. 제구와 수비, 위기에서의 호흡을 맞춥니다.',training:{batter:['batting','fielding'],pitcher:['control','endurance']},eventTitle:'말하지 않아도 통하는 신호',eventText:'“힘이 들어갈 때 네 어깨가 먼저 올라가.” 하람이 글러브를 내려놓고 자세를 보여준다.',reply:'내가 놓치던 습관을 동료가 기억하고 있었다. 짧은 신호 하나를 새로 정했다.'},
  {id:'manager',name:'한서현',role:'학생 매니저',color:'#826c9c',description:'관찰과 기록에 강한 동급생. 함께하는 활동의 체력 부담과 스트레스를 줄입니다.',training:{batter:['tactics','rest'],pitcher:['tactics','rest']},eventTitle:'기록에 남지 않는 노력',eventText:'“지난주보다 마지막까지 자세가 안정적이야.” 서현이 연습 기록을 펼친다.',reply:'점수에 드러나지 않는 변화도 누군가는 보고 있었다. 다음 목표를 함께 적었다.'},
  {id:'classmate',name:'윤유진',role:'반 친구',color:'#987e41',description:'작은 계획을 실천하는 친구. 학업과 멘탈을 챙기며 학교생활의 균형을 돕습니다.',training:{batter:['study','tactics'],pitcher:['study','tactics']},eventTitle:'오늘 할 일은 세 줄이면 돼',eventText:'“한꺼번에 다 하려니까 더 막막한 거 아닐까?” 유진이 작은 메모지를 내민다.',reply:'해야 할 일을 나누니 마음이 가벼워졌다. 운동장 밖에도 내 편이 있었다.'},
];
export const supportById=(id:SupportId)=>supports.find(p=>p.id===id)!;
export const defaultSupports=(role:Role):SupportId[]=>[role==='batter'?'bat_senior':'pitch_senior','catcher','manager'];
export const bond=(s:GameState,id:SupportId):number=>id==='rival'?s.rival:id==='catcher'?s.catcher:s.bonds[id];
export const bondKey=(id:SupportId)=>id==='rival'||id==='catcher'?id:`bond_${id}`;
