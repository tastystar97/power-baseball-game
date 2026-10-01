import type {Role,PrimaryGains,Gains} from '../game/types.ts';

export type BackgroundGroup='origin'|'body'|'personality'|'specialties'|'weaknesses';
export interface BackgroundOption {
 id:string;group:BackgroundGroup;name:string;cost:number;description:string;unavailable?:string;
 attributes?:PrimaryGains;allProficiency?:number;proficiency?:Partial<Record<Role,Gains>>;trust?:number;
 proficiencyGrowth?:number;intelligenceTraining?:number;stressRecovery?:number;matchReward?:number;lossStress?:number;stageStress?:number;
 scoutExtra?:number;rerollExtra?:number;
}
const injuryUnavailable='부상과 회복을 다루는 배경은 현재 선택할 수 없습니다.';
export const backgrounds:BackgroundOption[]=[
 {id:'elite',group:'origin',name:'명문 중학 야구부',cost:4,description:'다져진 기본 기술 · 감독 신뢰 +10',allProficiency:5,trust:10},
 {id:'regular',group:'origin',name:'평범한 야구부',cost:2,description:'익숙한 기본 기술 · 감독 신뢰 +5',allProficiency:2,trust:5},
 {id:'other_sport',group:'origin',name:'다른 운동부 출신',cost:2,description:'파워 또는 지구력 +60 · 야구 기술은 조금 부족',allProficiency:-3},
 {id:'beginner',group:'origin',name:'야구는 고교부터',cost:0,description:'기본 기술은 부족하지만 1학년 동안 기술을 더 빠르게 습득',allProficiency:-5,proficiencyGrowth:1.15},
 {id:'tall',group:'body',name:'장신',cost:2,description:'파워 +40 · 장타/구속 기술에 강점 · 하체 부상에 주의',unavailable:injuryUnavailable},
 {id:'muscular',group:'body',name:'근육형',cost:2,description:'파워 +60 · 센스 −20',attributes:{power:60,sense:-20}},
 {id:'agile',group:'body',name:'날렵',cost:2,description:'센스 +30 · 지구력 +20 · 파워 −20',attributes:{sense:30,endurance:20,power:-20}},
 {id:'ordinary',group:'body',name:'보통',cost:0,description:'균형 잡힌 출발'},
 {id:'competitive',group:'personality',name:'승부욕',cost:1,description:'경기에서 얻는 성장이 더 큼 · 패배 스트레스 +2',matchReward:1.2,lossStress:2},
 {id:'calm',group:'personality',name:'침착',cost:1,description:'멘탈 +40',attributes:{mental:40}},
 {id:'optimistic',group:'personality',name:'낙천',cost:1,description:'스트레스 회복량 +20%',stressRecovery:1.2},
 {id:'analyst',group:'personality',name:'분석가',cost:1,description:'지능 +50',attributes:{intelligence:50}},
 {id:'arm',group:'specialties',name:'강한 어깨',cost:3,description:'수비 기술에 강점 · 투수는 구속 기술도 향상',proficiency:{batter:{field:5},pitcher:{field:5,velocity:4}}},
 {id:'eye',group:'specialties',name:'타고난 눈',cost:3,description:'타자는 선구안, 투수는 제구 기술에 강점',proficiency:{batter:{eye:5},pitcher:{control:5}}},
 {id:'network',group:'specialties',name:'넓은 인맥',cost:2,description:'스카우트 +2장',scoutExtra:2},
 {id:'confidence',group:'specialties',name:'재능의 확신',cost:2,description:'재능 다시 굴리기 +2회',rerollExtra:2},
 {id:'fast_recovery',group:'specialties',name:'회복이 빠른 몸',cost:2,description:'부상 회복 기간 단축',unavailable:injuryUnavailable},
 {id:'fragile',group:'weaknesses',name:'유리 몸',cost:-3,description:'부상 위험 증가',unavailable:injuryUnavailable},
 {id:'poor_study',group:'weaknesses',name:'공부와 담쌓음',cost:-2,description:'지능 −60 · 지능 훈련 성장 −20%',attributes:{intelligence:-60},intelligenceTraining:.8},
 {id:'stage_fright',group:'weaknesses',name:'무대 공포',cost:-2,description:'공식전 출전 시 스트레스 +5',stageStress:5},
 {id:'stubborn',group:'weaknesses',name:'고집',cost:-2,description:'시작 감독 신뢰 −10',trust:-10},
];
export type HiddenTalentId='batting_sense'|'iron_heart'|'rubber_arm';
export const hiddenTalents:{id:HiddenTalentId;name:string;description:string;roles:Role[]}[]=[
 {id:'batting_sense',name:'천부적 타격 감각',description:'센스 성장 +10%',roles:['batter']},
 {id:'iron_heart',name:'강철 심장',description:'스트레스가 경기 중 멘탈에 주는 불이익 절반',roles:['batter','pitcher']},
 {id:'rubber_arm',name:'고무 어깨',description:'투구 부담 한계 +10%',roles:['pitcher']},
];
export const creationRules={budget:10,maxWeaknesses:2,rerolls:3,scoutCount:10,deckSize:6};
export const talentRules={
 D:{growth:.92,cap:0,points:2,description:'지금은 부족하지만 근성이 보인다'},
 C:{growth:1,cap:0,points:0,description:'노력에 따라 달라질 선수'},
 B:{growth:1.04,cap:0,points:0,description:'기대할 만한 소질'},
 A:{growth:1.08,cap:0,points:0,description:'처음부터 눈에 띄는 유망주'},
 S:{growth:1.15,cap:50,points:0,description:'몇 년에 한 번 나올까 말까 한 재능'},
};
export const backgroundMemories:Record<string,string>={
 other_sport:'다른 운동장에서 쌓은 감각도 야구에 가져올 수 있을까. 새 유니폼의 소매를 당기며 첫 연습을 기다렸다.',
 beginner:'야구는 이제 시작이다. 서툰 만큼 매일 하나씩 배우기로 했다.',
};
