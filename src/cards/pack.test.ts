import {zipSync,unzipSync,strFromU8,strToU8} from 'fflate';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePack,encodePack,decodePack,subsetPack} from './pack.ts';

export function samplePack():any {
  return {format:'last-summer-cardpack',version:1,ruleset:'summer-7',id:'sample',revision:1,name:'테스트 카드팩',author:'제작자',description:'왕복용 카드',
    cards:[{id:'sera',name:'정세라',title:'단정한 풀스윙',role:'타격 선배',description:'한 구를 고르는 선수',color:'#b47532',specialty:'power',
      training:{batter:['freebatting'],pitcher:['weights']},bonus:{energy:0,stress:0,jointEnergy:0,gains:{}},hints:{batter:'pull',pitcher:null},ultimates:{batter:'moonshot',pitcher:null},portrait:'sera.png'}],
    skills:[{id:'pull',name:'당겨치기',description:'장타를 노린다.',role:'batter',cost:16,family:'pull',tier:'normal',requires:{},conditions:[{kind:'tactic',values:['power']}],effects:[{kind:'probability',from:'out',to:'homer',amount:.03}]},
      {id:'moonshot',name:'담장을 깨우는 한 방',description:'강한 스윙.',role:'batter',cost:26,family:'pull',tier:'advanced',prerequisite:'pull',owner:'sera',requires:{power:55},conditions:[{kind:'tactic',values:['power']}],effects:[{kind:'probability',from:'out',to:'homer',amount:.055}]}],
    events:[{id:'begin',owner:'sera',kind:'growth',bond:20,title:'한 구의 시작',text:'같이 연습해 볼까?',choices:[{label:'함께한다',reply:'첫 연습을 했다.',gains:{power:2},energy:-4,stress:0,points:0,trust:0,bond:4,hints:['pull'],unlocks:[]},{label:'동작을 살핀다',reply:'차이를 찾았다.',gains:{sense:1},energy:0,stress:-4,points:0,trust:0,bond:4,hints:['pull'],unlocks:[]}]},
      {id:'finish',owner:'sera',kind:'growth',bond:60,previous:'begin',title:'내가 고른 한 구',text:'이제 네 스윙이야.',choices:[{label:'스윙한다',reply:'주무기를 찾았다.',gains:{power:2},energy:0,stress:0,points:0,trust:0,bond:4,hints:[],unlocks:['moonshot']},{label:'감각을 기억한다',reply:'내 것으로 남겼다.',gains:{mental:2},energy:0,stress:0,points:0,trust:0,bond:4,hints:[],unlocks:['moonshot']}]}],
    images:{'sera.png':{mime:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='}}};
}

test('이미지 포함 카드팩은 ZIP 왕복에서 사건·스킬 연결과 픽셀 파일을 보존한다',()=>{
  const pack=validatePack(samplePack()),bytes=encodePack(pack);
  assert.deepEqual([...bytes.slice(0,2)],[80,75]);
  assert.deepEqual(decodePack(bytes),pack);
});
test('누락 참조와 잘못된 역할·순환은 게임 가져오기 전에 거절한다',()=>{
  for(const mutate of [(p:any)=>p.cards[0].hints.batter='missing',(p:any)=>p.events[0].previous='finish',
    (p:any)=>p.skills[1].prerequisite='moonshot',(p:any)=>p.cards[0].portrait='gone.webp',
    (p:any)=>p.cards[0].hints.pitcher='pull',(p:any)=>p.events[1].choices[0].unlocks=['pull']]){
    const p=samplePack();mutate(p);assert.throws(()=>validatePack(p));
  }
});
test('중복 ID·임의 효과·경로 이탈·과대 수치는 거절한다',()=>{
  for(const mutate of [(p:any)=>p.cards.push(p.cards[0]),(p:any)=>p.skills[0].effects[0].kind='eval',
    (p:any)=>p.skills[0].effects[0].amount=5,(p:any)=>p.images['../image.png']=p.images['sera.png'],
    (p:any)=>p.version=99,(p:any)=>p.images['sera.png'].data='PGh0bWw+']){
    const p=samplePack();mutate(p);assert.throws(()=>validatePack(p));
  }
});
test('선택 카드 내보내기는 선행 스킬과 사건·그림을 함께 보존한다',()=>{
  const p=samplePack();p.cards.push({...structuredClone(p.cards[0]),id:'unused',name:'다른 사람',hints:{batter:null,pitcher:null},ultimates:{batter:null,pitcher:null},portrait:undefined});
  const one=subsetPack(validatePack(p),['sera']);
  assert.equal(one.cards.length,1);assert.equal(one.skills.length,2);assert.equal(one.events.length,2);
  assert.ok(one.images['sera.png']);assert.deepEqual(decodePack(encodePack(one)),one);
  assert.throws(()=>subsetPack(validatePack(p),['missing']));
});

test('사건은 자기 카드의 등록된 역할 보상만 줄 수 있다',()=>{
 const p=samplePack();p.skills.push({...p.skills[0],id:'unrelated',family:'unrelated'});p.events[0].choices[0].hints=['unrelated'];assert.throws(()=>validatePack(p),/등록된/);
});

test('콘텐츠 JSON이 팩 메타데이터를 덮어쓰거나 압축 파일 크기를 초과하면 거부한다',()=>{
 const files=unzipSync(encodePack(samplePack()));const content=JSON.parse(strFromU8(files['content.json']));content.revision=999;files['content.json']=strToU8(JSON.stringify(content));assert.throws(()=>decodePack(zipSync(files)));
 const large={'manifest.json':new Uint8Array(2*1024*1024+1)};assert.throws(()=>decodePack(zipSync(large)),/크기/);
});

test('역할상 달성 불가능한 능력·작전·조건은 배포 전에 거절한다',()=>{
 for(const mutate of [(p:any)=>p.skills[0].requires={control:1},(p:any)=>p.skills[0].conditions=[{kind:'tactic',values:['fastball']}],(p:any)=>p.skills[0].conditions=[{kind:'outs',min:0,max:0},{kind:'outs',min:2,max:2}]]){
 const p=samplePack();mutate(p);assert.throws(()=>validatePack(p),/역할|조건/);
 }
});
test('내보내기도 가져오기와 같은 JSON 압축 해제 제한을 지킨다',()=>{
 const p=samplePack(),template={...p.events[0],kind:'daily'};
 p.events.push(...Array.from({length:330},(_,i)=>({...structuredClone(template),id:`large_event_${i}`,text:'가'.repeat(2400)})));
 assert.throws(()=>encodePack(p),/크기|2MB/);
});
