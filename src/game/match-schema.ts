import {z} from 'zod';
import {outcomes} from './plate.ts';
const count=z.number().int().nonnegative(),rating=count.max(100),half=z.union([z.literal(0),z.literal(1)]);
const ratings=z.object({contact:rating,power:rating,eye:rating,speed:rating,field:rating,mental:z.number().min(0).max(100),velocity:rating,control:rating,breaking:rating,stamina:rating});
export const battingSchema=z.object({pa:count,ab:count,hits:count,doubles:count,triples:count,hr:count,rbi:count,walks:count,hbp:count,k:count,sf:count,sh:count,errors:count,rbiChances:count,sb:count,cs:count}).strict();
export const pitchingSchema=z.object({outs:count,k:count,walks:count,hbp:count,hits:count,hr:count,runs:count,sv:count.max(1),hold:count.max(1),bs:count.max(1)}).strict();
export const runnerSchema=z.object({id:z.string(),name:z.string(),owner:z.enum(['player','team','opponent']),speed:rating,responsible:z.string().nullable()}).strict();
const bases=z.tuple([runnerSchema.nullable(),runnerSchema.nullable(),runnerSchema.nullable()]);
const frame=z.object({outs:count.max(3),bases,score:z.tuple([count,count])}).strict();
const identity=z.object({id:z.string(),name:z.string()}).strict();
export const playSchema=z.object({
 kind:z.enum(['plate','steal']),outcome:z.enum([...outcomes,'stolenBase','caughtStealing']),inning:count.min(1).max(99),half,order:count,
 batter:identity,pitcher:identity,playerBatter:z.boolean(),playerPitcher:z.boolean(),tactic:z.string(),source:z.enum(['manual','auto']),burden:z.number().nonnegative().max(20),
 ball:z.enum(['ground','line','fly']).nullable(),direction:z.enum(['left','center','right']).nullable(),fielder:identity.extend({position:z.string()}).nullable(),
 moves:z.array(z.object({runner:runnerSchema,from:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]),to:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal('out')])}).strict()).max(4),
 outs:count.max(3),runs:count.max(4),rbi:count.max(4),before:frame,after:frame,
}).strict();
const player=z.object({id:z.string(),name:z.string(),grade:z.union([z.literal(1),z.literal(2),z.literal(3)]),position:z.enum(['P','C','1B','2B','3B','SS','LF','CF','RF','DH']),throws:z.enum(['R','L']),bats:z.enum(['R','L']),traits:z.array(z.enum(['contact','power','eye','speed','field','velocity','control','breaking','stamina','bunt'])).max(2),slot:count.max(9),ace:z.boolean().optional(),ratings,duty:z.enum(['starter','middle','closer']).optional()}).strict();
const roster=z.object({teamId:z.enum(['cheongram','haesol','bada','hanbit','taeyang','sanho','mirim','gangsan']),batters:z.array(player).length(9),pitchers:z.array(player).min(2).max(5)}).strict();
export const matchSchema=z.object({
 id:z.string().optional(),opponentId:z.enum(['cheongram','haesol','bada','hanbit','taeyang','sanho','mirim','gangsan']).optional(),appearance:z.enum(['starter','substitute','reserve']),
 inning:count.min(1).max(99),half,outs:count.max(3),bases,score:z.tuple([count,count]),lines:z.tuple([z.array(count).max(99),z.array(count).max(99)]),order:z.tuple([count,count]),
 highlights:count,faced:count,load:z.number().nonnegative(),retired:z.boolean(),entered:z.boolean(),awaiting:z.boolean(),playerBoundary:z.boolean(),intervene:z.boolean(),over:z.boolean(),
 batting:battingSchema,pitching:pitchingSchema,batterLines:z.record(z.string(),battingSchema),pitcherLines:z.record(z.string(),pitchingSchema.extend({team:half,started:z.boolean(),entryLead:z.number().int(),saveOpportunity:z.boolean(),exited:z.boolean(),load:z.number().nonnegative(),faced:count})),
 totals:z.tuple([z.object({hits:count,errors:count}),z.object({hits:count,errors:count})]),
 rosters:z.tuple([roster,roster]).nullable(),pitcherIds:z.tuple([z.string(),z.string()]),usedPitchers:z.tuple([z.array(z.string()),z.array(z.string())]),
 substitutions:z.array(z.object({team:half,slot:count.max(8),previous:player,nextId:z.string(),feedIndex:count.max(4000)}).strict()).max(1),
 battingOrder:z.union([z.literal(1),z.literal(3),z.literal(4),z.literal(6),z.literal(8)]),pitchingRole:z.enum(['starter','middle','closer']),
 feed:z.array(playSchema).max(4000),playbackIndex:count.max(4000),summary:z.boolean(),
 skillChecks:z.array(z.object({half,order:count,inning:count.min(1).max(99),tactic:z.string(),source:z.enum(['manual','auto']),intelligence:rating,eligible:z.array(z.string()).max(32),active:z.array(z.string()).max(32)})).max(1000),
 duels:z.array(z.object({half,order:count,inning:count.min(1).max(99),opponent:z.enum(['taeo','jihwan']),tactic:z.string(),source:z.enum(['manual','auto']),outcome:z.enum(outcomes)})).max(1000),
 recent:z.array(z.string().max(250)).max(12),last:z.object({title:z.string(),text:z.string(),reasons:z.array(z.string()),runs:count}).nullable(),
}).strict();
