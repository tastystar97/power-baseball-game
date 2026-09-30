import type {TeamId} from '../game/types.ts';
export const teams:Record<TeamId,{name:string;pitching:'balanced'|'power'|'control';batting:'balanced'|'power'|'patient';report:string}>={
  cheongram:{name:'청람고',pitching:'balanced',batting:'balanced',report:'동료와 함께 만들어 가는 우리의 야구.'},
  haesol:{name:'해솔고',pitching:'balanced',batting:'balanced',report:'투타가 고른 팀. 컨디션을 유지하며 자신의 장점을 살리자.'},
  bada:{name:'바다고',pitching:'control',batting:'patient',report:'정교한 제구와 끈질긴 타선. 타자는 적극적인 장타, 투수는 맞혀 잡기가 대응책이다.'},
  hanbit:{name:'한빛고',pitching:'power',batting:'balanced',report:'빠른 공이 강한 팀. 정확하게 맞히기로 대응할 수 있다.'},
  taeyang:{name:'태양고',pitching:'balanced',batting:'power',report:'한 방이 강한 타선. 변화구로 유도하면 장타 위험을 줄일 수 있다.'},
  sanho:{name:'산호고',pitching:'control',batting:'balanced',report:'볼넷을 쉽게 주지 않는 투수진. 장타 노리기로 빈틈을 찾자.'},
  mirim:{name:'미림고',pitching:'power',batting:'power',report:'강한 직구와 장타력. 정확한 타격과 변화구 승부가 대응책이다.'},
  gangsan:{name:'강산고',pitching:'balanced',batting:'patient',report:'공을 오래 보는 타선. 스트라이크를 던져 수비와 함께 아웃을 만들자.'},
};
export const teamName=(id:TeamId='haesol')=>teams[id].name;
