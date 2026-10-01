import type {PrimaryKey,Role} from '../game/types.ts';
const scenes:Record<Role,Record<PrimaryKey,string>>={
 batter:{power:'웨이트와 프리배팅으로 타구에 힘을 싣는 법을 익혔다.',endurance:'베이스 사이를 달리며 마지막까지 흔들리지 않는 발을 만들었다.',mental:'불리한 볼카운트를 가정하며 한 공을 더 기다렸다.',intelligence:'경기 영상을 되짚으며 수비 위치와 볼 배합을 읽었다.',sense:'티배팅과 펑고로 공의 궤도를 몸에 새겼다.'},
 pitcher:{power:'롱토스로 하체의 힘을 공 끝까지 전달했다.',endurance:'인터벌 러닝으로 긴 이닝을 버틸 호흡을 다졌다.',mental:'주자가 있는 상황을 떠올리며 미트에 집중했다.',intelligence:'타자의 반응과 구종별 궤적을 영상으로 분석했다.',sense:'그립을 바꿔 가며 공의 회전과 손끝 감각을 익혔다.'},
};
export function trainingScene(role:Role,key:PrimaryKey,partners:string[]){return `${partners.length?partners.join(', ')+'와 함께 ':''}${scenes[role][key]}`;}
