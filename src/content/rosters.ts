import type {TeamId,StatKey} from '../game/types.ts';
export type Position='P'|'C'|'1B'|'2B'|'3B'|'SS'|'LF'|'CF'|'RF'|'DH';
export type Trait=Exclude<StatKey,'mental'>|'bunt';
export type PitchingRole='starter'|'middle'|'closer';
export interface RosterEntry {id:string;name:string;grade:1|2|3;position:Position;throws:'R'|'L';bats:'R'|'L';traits:Trait[];slot:number;ace?:boolean;}
export const teamBases:Record<TeamId,{batting:number;pitching:number}>={
  cheongram:{batting:48,pitching:50},haesol:{batting:54,pitching:56},mirim:{batting:56,pitching:58},taeyang:{batting:56,pitching:46},hanbit:{batting:49,pitching:57},bada:{batting:51,pitching:54},sanho:{batting:49,pitching:54},gangsan:{batting:46,pitching:46},
};
export const battingSlotBonus=[0,-1,6,6,4,0,-2,-5,-6];
export const gradeBonus={1:-5,2:0,3:3};
type Row=[string,1|2|3,Position,string,string?,string?];
function batters(team:TeamId,rows:Row[]):RosterEntry[]{return rows.map(([name,grade,position,hands,traits='',id],slot)=>({id:id??`${team}_b${slot+1}`,name,grade,position,throws:hands[0] as 'R'|'L',bats:hands[1] as 'R'|'L',traits:traits.split(',').filter(Boolean) as Trait[],slot:slot+1}));}
type Arm=[string,1|2|3,'R'|'L',string,string?];
function pitchers(team:TeamId,rows:Arm[]):RosterEntry[]{return rows.map(([name,grade,hand,traits,id],i)=>({id:id??`${team}_p${i+1}`,name,grade,position:'P',throws:hand,bats:hand,traits:traits.split(',').filter(Boolean) as Trait[],slot:0,ace:i===0}));}
export const rosterEntries:Record<TeamId,{batters:RosterEntry[];pitchers:RosterEntry[]}>= {
  cheongram:{batters:batters('cheongram',[
    ['오세찬',2,'CF','LL','speed,contact'],['장건우',3,'SS','RR','field,bunt'],['강민재',3,'1B','LL','contact,eye','minjae'],['주도현',3,'RF','RR','power'],['하태수',2,'LF','RR','power'],['박하람',1,'C','RR','field,eye','haram'],['염규찬',2,'3B','RR'],['나도준',1,'2B','RR','field','dojun'],['표동민',2,'DH','LL','power'],
  ]),pitchers:pitchers('cheongram',[['이도윤',3,'R','breaking','doyun'],['국태민',2,'R','velocity','taemin'],['신우람',1,'L','control','wooram']])},
  haesol:{batters:batters('haesol',[
    ['하윤재',2,'CF','RL','speed,eye'],['곽태율',3,'2B','RR','contact,bunt'],['문시헌',3,'SS','RR','contact,field'],['서지환',3,'1B','RR','power','jihwan'],['변재혁',3,'LF','RR','power'],['염도경',2,'C','RR','field'],['심규원',2,'RF','LL','eye'],['피승호',1,'3B','RR','field'],['엄태경',2,'DH','RR','power'],
  ]),pitchers:pitchers('haesol',[['정태오',3,'R','velocity,control','taeo'],['봉준익',3,'L','breaking'],['왕재선',2,'R','velocity']])},
  mirim:{batters:batters('mirim',[
    ['도한결',3,'SS','RR','speed,contact'],['노을찬',2,'CF','LL','speed'],['진경호',3,'RF','LL','contact,power'],['우태산',3,'1B','RR','power'],['반석규',3,'DH','RR','power'],['금재윤',2,'3B','RR','power'],['석주환',2,'LF','RL','eye'],['맹동하',2,'C','RR','field'],['옥찬비',1,'2B','RR','field'],
  ]),pitchers:pitchers('mirim',[['길도겸',3,'R','velocity,stamina'],['설민규',2,'R','velocity'],['함지오',3,'L','breaking']])},
  taeyang:{batters:batters('taeyang',[
    ['연하빈',2,'SS','RR','speed'],['채윤겸',3,'CF','LL','contact'],['간도형',3,'3B','RR','contact,power'],['당성우',3,'1B','LL','power'],['국현일',3,'RF','RR','power'],['범재모',2,'DH','RR','power'],['견수혁',2,'LF','RR','power'],['마경택',2,'C','RR','field'],['하도빈',1,'2B','RR','field'],
  ]),pitchers:pitchers('taeyang',[['방태준',3,'R','stamina'],['시우진',2,'R','breaking']])},
  hanbit:{batters:batters('hanbit',[
    ['류시온',2,'CF','LL','speed'],['표건율',3,'2B','RR','bunt'],['위상민',3,'SS','RR','contact'],['육재범',3,'LF','RR','power'],['은태곤',2,'1B','LL','power'],['소정빈',2,'RF','RR','eye'],['어진혁',2,'C','RR','field'],['경민찬',1,'3B','RR'],['구본담',2,'DH','RL','contact'],
  ]),pitchers:pitchers('hanbit',[['지한솔',3,'R','velocity'],['탄우겸',2,'R','velocity'],['명시후',2,'L','control']])},
  bada:{batters:batters('bada',[
    ['양서준',2,'CF','LL','eye,speed'],['나윤호',3,'SS','RR','eye,bunt'],['임도하',3,'2B','LL','contact,eye'],['전규혁',3,'1B','RR','power'],['남윤결',2,'C','RR','eye'],['공민서',2,'LF','LL','contact'],['진하율',2,'RF','RR','eye'],['모재건',1,'3B','RR','field'],['성태빈',2,'DH','RR','power'],
  ]),pitchers:pitchers('bada',[['조은결',3,'R','control,breaking'],['신재호',2,'L','control']])},
  sanho:{batters:batters('sanho',[
    ['허준결',2,'CF','LL','speed'],['원다율',2,'2B','RR','contact'],['제승훈',3,'SS','RR','contact,field'],['윤태강',3,'RF','RR','power'],['갈민혁',3,'1B','LL','power'],['탁지성',2,'3B','RR'],['구하진',2,'C','RR','field'],['류재온',1,'LF','LL','eye'],['서태헌',2,'DH','RR','power'],
  ]),pitchers:pitchers('sanho',[['권도율',3,'R','control'],['안재율',2,'R','breaking']])},
  gangsan:{batters:batters('gangsan',[
    ['송다온',2,'CF','LL','eye'],['기태환',2,'SS','RR','bunt'],['계성민',3,'1B','LL','contact,eye'],['옹재석',3,'LF','RR','power'],['편하랑',2,'RF','RR','eye'],['두민결',2,'C','RR','field'],['인준성',2,'3B','RR'],['추도연',1,'DH','LL','power'],['고은재',1,'2B','RR','field'],
  ]),pitchers:pitchers('gangsan',[['현도균',3,'R','stamina'],['임하겸',2,'L','breaking']])},
};
