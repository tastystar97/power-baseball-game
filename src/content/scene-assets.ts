// Scene assets are layered: background (L0) → characters (L1) → emotion bubbles (L2).
// Add licensed files under public/assets and fill `src`. Missing or failing files fall back
// to drawn placeholders, so the scene stays complete while art is produced.

export const places={ground:'운동장',bullpen:'불펜',batting:'타격 연습장',classroom:'교실',clubroom:'야구부 부실',gate:'교문',riverside:'강변',home:'집',stadium:'경기장'} as const;
export const times={morning:'아침',day:'낮',dusk:'노을',night:'밤',indoor:'실내'} as const;
export type Place=keyof typeof places;
export type TimeOfDay=keyof typeof times;

export const expressions={normal:'기본',smile:'웃음',determined:'결의',tired:'지침',surprised:'놀람',sad:'풀 죽음'} as const;
export type Expression=keyof typeof expressions;

export const bubbles={
  joy:{label:'기쁨',glyph:'♪',color:'#e09a12'},
  surprise:{label:'놀람',glyph:'!',color:'#d9573b'},
  question:{label:'물음',glyph:'?',color:'#2e6fd1'},
  sweat:{label:'땀',glyph:'💧',color:'#2f8fbf'},
  fire:{label:'의욕',glyph:'🔥',color:'#d9573b'},
  idea:{label:'번뜩',glyph:'💡',color:'#c98a12'},
  sigh:{label:'한숨',glyph:'…',color:'#4a5775'},
  sleep:{label:'졸림',glyph:'Z',color:'#8a5cc7'},
  sparkle:{label:'반짝',glyph:'✨',color:'#c98a12'},
} as const;
export type Bubble=keyof typeof bubbles;

/** Background files by `place.time` (16:9, 1920×1080 recommended, WebP). */
export const backgroundFiles:Partial<Record<`${Place}.${TimeOfDay}`,string>>={};
/** Bubble files (1:1, 256×256 recommended, transparent PNG/WebP). */
export const bubbleFiles:Partial<Record<Bubble,string>>={};

export interface CharacterArt {
  name:string;
  /** Silhouette gradient used until art exists. */
  tint:[string,string];
  cap?:boolean;
  longHair?:boolean;
  /** Head top as a ratio of the sprite height, used to place emotion bubbles. */
  head:number;
  /** Waist-up 3:4 sprites (1200×1600 recommended, transparent), anchored at the bottom edge. */
  files:Partial<Record<Expression,string>>;
}
export const characterArt:Record<string,CharacterArt>={
  player_batter:{name:'주인공',tint:['#ffd29a','#e09a12'],cap:true,head:.13,files:{}},
  player_pitcher:{name:'주인공',tint:['#ffd29a','#e09a12'],cap:true,head:.13,files:{}},
  coach:{name:'감독',tint:['#c9d0dc','#4a5775'],cap:true,head:.13,files:{}},
};

/** Exact file → same place in daylight → placeholder. */
export function backgroundFile(place:Place,time:TimeOfDay):string|undefined {
  return backgroundFiles[`${place}.${time}`]??backgroundFiles[`${place}.day`];
}
/** Exact expression → normal → undefined (caller falls back to the card portrait, then the silhouette). */
export function characterFile(art:CharacterArt|undefined,expression:Expression):string|undefined {
  return art?.files[expression]??art?.files.normal;
}
