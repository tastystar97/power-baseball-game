// Add licensed images here. Empty paths intentionally use the prototype's fallback shapes.
export const assets:Record<string,{label:string;kind:'background'|'portrait';mood?:string;src?:string;credit:string}>={
  gate:{label:'학교 정문 · 봄',kind:'background',mood:'day',credit:'임시 배경'},
  ground:{label:'학교 운동장 · 평일 오후',kind:'background',mood:'day',credit:'임시 배경'},
  batting:{label:'타격 연습장',kind:'background',mood:'indoor',credit:'임시 배경'},
  bullpen:{label:'불펜',kind:'background',mood:'day',credit:'임시 배경'},
  street:{label:'동네 거리 · 일요일',kind:'background',mood:'dusk',credit:'임시 배경'},
  riverside:{label:'하천 둔치 · 일요일 오후',kind:'background',mood:'dusk',credit:'임시 배경'},
  batter:{label:'주인공 · 타자',kind:'portrait',credit:'임시 실루엣'},
  pitcher:{label:'주인공 · 투수',kind:'portrait',credit:'임시 실루엣'},
  coach:{label:'감독',kind:'portrait',credit:'임시 실루엣'},
  rival:{label:'라이벌',kind:'portrait',credit:'임시 실루엣'},
  catcher:{label:'동료 포수',kind:'portrait',credit:'임시 실루엣'},
  bat_senior:{label:'강민재',kind:'portrait',credit:'임시 실루엣'},
  pitch_senior:{label:'이도윤',kind:'portrait',credit:'임시 실루엣'},
  manager:{label:'한서현',kind:'portrait',credit:'임시 실루엣'},
  classmate:{label:'윤유진',kind:'portrait',credit:'임시 실루엣'},
};
