import type {CardPack,SupportCard} from './schema.ts';
import {builtinSkills} from './builtin-skills.ts';
import {cardEvents} from './stories.ts';
import {upgradeTraining} from './upgrade.ts';
import {REWARD_SCALE} from '../content/development-rules.ts';
type Pair=[string|null,string|null];
function card(id:string,name:string,title:string,role:string,description:string,specialty:SupportCard['specialty'],batter:string[],pitcher:string[],hints:Pair,uppers:Pair,color:string):SupportCard {
  return {id,name,title,role,description,specialty,color,grade:['bat_senior','sua','seoa'].includes(id)?3:['rival','catcher','manager','classmate','narin','dohee','jian'].includes(id)?1:2,training:{batter:upgradeTraining(batter) as SupportCard['training']['batter'],pitcher:upgradeTraining(pitcher) as SupportCard['training']['pitcher']},hints:{batter:hints[0],pitcher:hints[1]},ultimates:{batter:uppers[0],pitcher:uppers[1]},bonus:{energy:0,stress:0,jointEnergy:0,gains:{}}};
}
const cards:SupportCard[]=[
  card('bat_senior','강민재','반복 끝의 감각','타격 전문 선배','스윙을 잘게 나눠 설명하는 차분한 선배. 기본기를 끝까지 함께 다듬습니다.','sense',['batting','freebatting'],['endurance','tactics'],['contact_focus','calm'],['contact_master','batter_read'],'#b47532'),
  card('pitch_senior','이도윤','공 하나의 의도','투수 전문 선배','공 하나의 이유를 묻는 연구파. 상대의 시선으로 승부를 준비합니다.','intelligence',['tactics','fielding'],['velocity','breaking'],['patient_eye','slider'],['eye_master','sharp_slider'],'#4d739a'),
  card('rival','차준서','한 세트 더','동기 라이벌','지기 싫은 마음을 꾸준한 훈련으로 바꾸는 동기. 경쟁이 연습의 힘이 됩니다.','power',['weights','freebatting','fielding'],['velocity','endurance'],['power_drive','fastball_edge'],['slugger','power_finish'],'#a95950'),
  card('catcher','박하람','같은 승부를 보는 눈','동료 포수','작은 흔들림도 알아채는 포수. 위기에서의 호흡을 맞춥니다.','mental',['batting','fielding'],['control','endurance'],['calm','precision'],['clutch_signal','efficient_pitch'],'#578d73'),
  card('manager','한서현','기록 밖의 성장','학생 매니저','관찰과 기록에 강한 동급생. 함께하는 활동의 체력 부담을 줄입니다.',null,['tactics','rest'],['tactics','rest'],['steady','steady'],['steady_master','steady_master'],'#826c9c'),
  card('classmate','윤유진','다음 하나부터','반 친구','작은 계획을 실천하는 친구. 지능과 멘탈을 챙기며 생활의 균형을 돕습니다.','intelligence',['study','tactics'],['study','tactics'],['focus_plan','focus_plan'],['clear_plan','clear_plan'],'#987e41'),
  card('sera','정세라','단정한 풀스윙','2학년 · 1루수','우아한 말투와 대담한 스윙. 남몰래 반복하는 기본기가 한 방을 만듭니다.','power',['freebatting','weights'],['weights','velocity'],['pull',null],['moonshot',null],'#ac627b'),
  card('chaerin','백채린','직구 예고','2학년 · 강속구 투수','승부를 먼저 선언하는 자신감. 가장 믿는 공에 정확성을 더하려 합니다.','power',['weights','freebatting'],['velocity','weights'],[null,'heavy_fastball'],[null,'fireball'],'#c35e48'),
  card('narin','강나린','한 발 먼저','1학년 · 중견수','육상부 출신의 행동파. 빠른 발에 상황을 보는 눈을 더해 갑니다.','endurance',['running','fielding'],['running','endurance'],['sprint',null],['live_legs',null],'#b39a35'),
  card('sua','임수아','아홉 칸의 계획','3학년 · 선발투수','이닝별 계획을 세우는 완벽주의자. 동료를 믿는 빈칸을 배워 갑니다.','endurance',['running','tactics'],['endurance','control'],[null,'pace'],[null,'inning_design'],'#468985'),
  card('yeoreum','최여름','마지막 회의 여유','2학년 · 유틸리티','느긋해 보여도 후반에 강한 실속파. 남겨 둔 힘의 쓰임을 압니다.','endurance',['running','fielding'],['endurance','running'],['late_focus','late_focus'],['last_inning','last_inning'],'#bd945d'),
  card('rina','유리나','작은 목소리의 마무리','2학년 · 구원투수','평소에는 소심하지만 위기에서 승부에 집중합니다. 작은 목소리로 의도를 전합니다.','mental',['batting','tactics'],['control','breaking'],[null,'crisis_breath'],[null,'closer'],'#8271a8'),
  card('seoa','남서아','주장 완장의 무게','3학년 · 주장·포수','말수가 적고 책임감이 강한 주장. 중요한 순간을 동료에게 맡기는 법을 배웁니다.','mental',['batting','fielding'],['control','tactics'],['comeback','comeback'],['rally_core','rally_core'],'#5f7298'),
  card('sumin','배수민','확률 밖의 한 수','2학년 · 전력분석원','통계를 좋아하는 집요한 분석가. 예상 밖의 결과에서도 배울 이유를 찾습니다.','intelligence',['tactics','study'],['tactics','study'],['analysis','analysis'],['read_gap','read_gap'],'#668ca5'),
  card('yerin','홍예린','박수보다 정확하게','2학년 · 교타 외야수','관중 앞에서는 밝고 능청스럽지만 슬럼프는 감추는 편. 끈질긴 승부의 가치를 찾습니다.','sense',['batting','tactics'],['control','tactics'],['persistent',null],['endless_atbat',null],'#c17594'),
  card('dohee','백도희','공 끝의 장난','1학년 · 기교파 투수','구종마다 별명을 붙이는 실험가. 우연히 나온 좋은 공을 자신의 기술로 만듭니다.','sense',['fielding','tactics'],['breaking','control'],[null,'curve'],[null,'deep_curve'],'#739467'),
  card('jiwoo','송지우','오늘도 같은 준비','2학년 · 훈련 지원','준비 루틴을 수집하는 꼼꼼한 부원. 각자에게 맞는 좋은 시작을 찾습니다.',null,['rest','running'],['rest','running'],['routine','routine'],['body_rhythm','body_rhythm'],'#ad8d75'),
  card('jian','이지안','좋은 장면부터','1학년 · 영상 담당','말보다 영상으로 응원하는 기록 담당. 실수 앞뒤에 남은 성장을 찾아냅니다.',null,['rest','study'],['rest','study'],['reset_mind','reset_mind'],['next_space','next_space'],'#818eac'),
];
cards.find(c=>c.id==='manager')!.bonus={energy:5,stress:-2,jointEnergy:6,gains:{}};

cards.find(c=>c.id==='jiwoo')!.bonus={energy:4,stress:-2,jointEnergy:4,gains:{}};
cards.find(c=>c.id==='jian')!.bonus={energy:2,stress:-4,jointEnergy:3,gains:{}};
export const builtinPack:CardPack={format:'last-summer-cardpack',version:2,ruleset:'first-year-1',id:'core',revision:2,name:'청람고 · 첫 여름',author:'마지막 여름',description:'기본 서포트 18명과 첫 여름의 동행 이야기',cards,skills:builtinSkills,events:cards.flatMap(cardEvents).map(e=>({...e,choices:e.choices.map(c=>({...c,gains:Object.fromEntries(Object.entries(c.gains).map(([k,v])=>[k,Math.round(v!*REWARD_SCALE)]))})) as typeof e.choices})),images:{}};
