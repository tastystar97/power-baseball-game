import type {SkillDefinition,SkillCondition,SkillEffect} from './schema.ts';
import {upgradeRequirements} from './upgrade.ts';
const tactic=(...values:('contact'|'power'|'patient'|'bunt'|'fastball'|'breaking'|'control'|'chase')[]):SkillCondition=>({kind:'tactic',values});
const move=(from:'out'|'walk'|'single'|'homer',to:'out'|'walk'|'single'|'homer'|'strikeout',amount:number,role?:'batter'|'pitcher'):SkillEffect=>({kind:'probability',from,to,amount,...(role?{role}:{})});
const success=(n:number):SkillEffect[]=>[move('out','single',n,'batter'),move('single','out',n,'pitcher')];
const normal=(id:string,name:string,role:SkillDefinition['role'],conditions:SkillCondition[],effects:SkillEffect[],cost=14):SkillDefinition=>({id,name,role,cost,description:'조건을 만족한 승부에서 발동합니다.',family:id,tier:'normal',requires:{},conditions,effects});
const base:SkillDefinition[]=[
  normal('contact_focus','짧고 정확한 스윙','batter',[tactic('contact')],[move('out','single',.05)]),
  normal('power_drive','끝까지 밀어내기','batter',[tactic('power')],[move('out','homer',.035)],18),
  normal('patient_eye','한 공 더 보기','batter',[tactic('patient')],[move('out','walk',.05)]),
  normal('fastball_edge','살아 있는 직구','pitcher',[tactic('fastball')],[move('out','strikeout',.055)]),
  normal('precision','미트 끝을 향해','pitcher',[],[move('walk','out',.035)]),
  normal('breaking_read','타이밍 빼앗기','pitcher',[tactic('breaking')],[move('single','out',.035)],18),
  normal('calm','흔들리지 않는 마음','both',[{kind:'outs',min:2,max:2,role:'batter'},{kind:'runners',present:true,role:'pitcher'}],success(.035),16),
  normal('steady','마지막까지 같은 자세','both',[{kind:'energy',min:0,max:44}],[{kind:'fatigue',amount:.7}],12),
  normal('slider','슬라이더','pitcher',[tactic('breaking')],[move('out','strikeout',.03)],16),
  normal('focus_plan','승부 계획','both',[{kind:'score',value:'behind'}],success(.02),14),
  normal('pull','당겨치기','batter',[tactic('power'),{kind:'opponent',values:['fast']}],[move('out','homer',.035)],16),
  normal('heavy_fastball','묵직한 직구','pitcher',[tactic('fastball'),{kind:'runners',present:false}],[move('out','strikeout',.03)],16),
  normal('sprint','전력 질주','batter',[tactic('contact')],[move('out','single',.025)],14),
  normal('pace','페이스 조절','pitcher',[tactic('control')],[{kind:'burden',amount:1}],16),
  normal('late_focus','후반 집중','both',[{kind:'inning',min:7,max:99}],success(.025),14),
  normal('crisis_breath','위기 호흡','pitcher',[{kind:'runners',present:true},{kind:'inning',min:6,max:99}],[move('single','out',.035)],14),
  normal('comeback','승부 집중','both',[{kind:'score',value:'behind'}],success(.025),16),
  normal('analysis','상대 분석','both',[{kind:'opponent',values:['power','wild']}],success(.025),16),
  normal('persistent','끈질긴 승부','batter',[tactic('patient'),{kind:'outs',min:1,max:2}],[move('out','walk',.03)],14),
  normal('curve','커브','pitcher',[tactic('breaking')],[move('homer','out',.015)],16),
  normal('routine','준비 루틴','both',[{kind:'energy',min:0,max:44}],[{kind:'fatigue',amount:.4}],14),
  normal('reset_mind','마음 정리','both',[{kind:'stress',min:70,max:100}],success(.005),14),
];
const advanced=(id:string,name:string,parent:string,owner:string,effects:SkillEffect[],requires:Record<string,number>={},style?:string):SkillDefinition=>{
  const b=base.find(k=>k.id===parent)!;return {...b,id,name,tier:'advanced',owner,prerequisite:parent,cost:24,effects,requires:upgradeRequirements(requires),...(style?{style}:{}),description:'서포트 고유 사건으로 개방하는 상위 스킬. 같은 계열 일반 스킬을 대체합니다.'};
};
export const builtinSkills:SkillDefinition[]=[...base,
  advanced('contact_master','정교한 배트','contact_focus','bat_senior',[move('out','single',.075)],{contact:60,eye:50},'교타형'),
  advanced('batter_read','타자의 마음을 읽다','calm','bat_senior',success(.055),{control:50}),
  advanced('eye_master','기다리던 한 구','patient_eye','pitch_senior',[move('out','walk',.07)],{eye:55}),
  advanced('sharp_slider','예리한 슬라이더','slider','pitch_senior',[move('out','strikeout',.055)],{breaking:55,control:45}),
  advanced('slugger','담장을 향한 스윙','power_drive','rival',[move('out','homer',.065)],{power:60,contact:45},'장타형'),
  advanced('power_finish','결정구의 위력','fastball_edge','rival',[move('out','strikeout',.08)],{velocity:60,breaking:45},'구위형'),
  advanced('clutch_signal','둘만의 승부 신호','calm','catcher',success(.06),{contact:50}),
  advanced('efficient_pitch','효율적인 투구','precision','catcher',[move('walk','out',.045),{kind:'burden',amount:3}],{control:60,stamina:50},'제구형'),
  advanced('steady_master','끝까지 같은 리듬','steady','manager',[{kind:'fatigue',amount:1}]),
  advanced('clear_plan','흐름을 되찾는 계획','focus_plan','classmate',success(.04)),
  advanced('moonshot','담장을 깨우는 한 방','pull','sera',[move('out','homer',.06)],{power:55,contact:45}),
  advanced('fireball','불꽃 직구','heavy_fastball','chaerin',[move('out','strikeout',.06)],{velocity:55}),
  advanced('live_legs','끝까지 살아 있는 발','sprint','narin',[move('out','single',.045)],{speed:55}),
  advanced('inning_design','긴 이닝의 설계자','pace','sua',[{kind:'burden',amount:3}],{stamina:55,control:45}),
  advanced('last_inning','마지막 이닝의 저력','late_focus','yeoreum',success(.045)),
  advanced('closer','흔들리지 않는 마무리','crisis_breath','rina',[move('single','out',.06)],{control:50}),
  advanced('rally_core','역전의 중심','comeback','seoa',success(.045)),
  advanced('read_gap','빈틈을 읽는 눈','analysis','sumin',success(.045)),
  advanced('endless_atbat','끝나지 않는 타석','persistent','yerin',[move('out','walk',.055)],{eye:55}),
  advanced('deep_curve','낙차 큰 커브','curve','dohee',[move('homer','out',.025)],{breaking:55}),
  advanced('body_rhythm','몸이 기억하는 리듬','routine','jiwoo',[{kind:'fatigue',amount:.85}]),
  advanced('next_space','다음 승부의 여백','reset_mind','jian',success(.01)),
];
// Shared lower skills can have role-specific upper branches without granting the other role's rewards.
for(const [id,role] of [['batter_read','pitcher'],['clutch_signal','batter']] as const)builtinSkills.find(s=>s.id===id)!.role=role;
builtinSkills.find(s=>s.id==='efficient_pitch')!.conditions=[tactic('control')];

builtinSkills.find(s=>s.id==='contact_master')!.conditions=[tactic('contact','patient')];
builtinSkills.find(s=>s.id==='power_finish')!.conditions=[tactic('fastball','breaking')];
