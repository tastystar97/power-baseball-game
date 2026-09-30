import type {Role,Gains} from '../game/types.ts';
export const competitorInitial:Record<Role,Gains>={batter:{contact:42,power:40,eye:35,speed:35,field:38,mental:40},pitcher:{velocity:42,control:38,breaking:35,stamina:42,field:35,mental:40}};
export const rivalTraining=(role:Role,key:number):Gains=>role==='batter'?(key%2?{power:4}:{contact:4,field:1}):(key%2?{velocity:4}:{control:3,stamina:2});
export const namedRivals={taeo:{name:'정태오',role:'해솔고 · 우완 에이스',intro:'첫 공부터 네 스윙을 기억해 둘게.'},jihwan:{name:'서지환',role:'해솔고 · 4번 타자',intro:'네 공, 타석에서 직접 보고 싶었어.'}} as const;
export const rivalryLines={first:'처음 만나는 해솔고. 오늘의 공과 스윙이 서로의 첫인상이 된다.',rematch:'한 번 부딪힌 상대를 다시 만난다. 지난 경기의 감각이 떠오른다.',lead:'우리가 앞서 있지만 해솔고는 다음 승부를 준비하고 있다.',trail:'아직 넘어야 할 상대. 지난 경기에서 찾은 과제를 이번 승부에 가져간다.',even:'승리를 한 번씩 주고받았다. 이번에는 누가 앞서갈까.',revenge:'지난 패배를 딛고 이번에는 우리가 웃었다. 다시 만날 이유가 하나 더 생겼다.',won:'오늘은 청람고의 승리. 해솔고와 나눈 승부를 기록에 남겼다.',lost:'오늘은 해솔고가 웃었다. 다음에 보여 줄 야구를 기억해 둔다.'};
