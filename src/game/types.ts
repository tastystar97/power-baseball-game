import { z } from 'zod';
import {matchSchema,runnerSchema} from './match-schema.ts';
export {matchSchema} from './match-schema.ts';
import {contentSchema,idSchema,roleAbilityNames} from '../cards/schema.ts';

export const statKeys = ['contact', 'power', 'eye', 'speed', 'field', 'mental', 'velocity', 'control', 'breaking', 'stamina'] as const;
export type StatKey = typeof statKeys[number];
export type Role = 'batter' | 'pitcher';
export const labels: Record<string, string> = {
  contact:'컨택', power:'장타', eye:'선구안', speed:'주루', field:'수비', mental:'멘탈',
  velocity:'구속 능력', control:'제구', breaking:'변화구', stamina:'스태미나',
  energy:'체력', stress:'스트레스', intelligence:'지능', trust:'감독 신뢰', rival:'라이벌 친밀도', catcher:'동료 친밀도',
  skillPoints:'스킬 Pt',bond_bat_senior:'타격 선배 인연',bond_pitch_senior:'투수 선배 인연',bond_manager:'매니저 인연',bond_classmate:'반 친구 인연',
};
export const primaryKeys=['power','endurance','mental','intelligence','sense'] as const;
export type PrimaryKey=typeof primaryKeys[number];
export type Attributes=Record<PrimaryKey,number>;
export type PrimaryGains=Partial<Attributes>;
export type TrainingTarget=StatKey | `primary_${PrimaryKey}`;
export const primaryLabels:Record<PrimaryKey,string>={power:'파워',endurance:'지구력',mental:'멘탈',intelligence:'지능',sense:'센스'};
for(const k of primaryKeys)labels[`primary_${k}`]=primaryLabels[k];
for(const k of statKeys)labels[`proficiency_${k}`]=`${labels[k]} 숙련`;
export const roleStats = (role: Role): StatKey[] => [...roleAbilityNames[role]];
export const practiceStats = (role: Role): StatKey[] => role === 'batter'
  ? ['contact','power','speed','field'] : ['velocity','control','breaking','stamina','field'];
export const grade = (n: number) => n >= 90 ? 'S' : n >= 80 ? 'A' : n >= 70 ? 'B' : n >= 60 ? 'C' : n >= 50 ? 'D' : n >= 40 ? 'E' : n >= 25 ? 'F' : 'G';
const value = z.number().int().min(0).max(100);
const count = z.number().int().nonnegative();
const monthSchema=z.number().int().min(3).max(6);
export const teamIds=['cheongram','haesol','bada','hanbit','taeyang','sanho','mirim','gangsan'] as const;
export type TeamId=typeof teamIds[number];
const teamSchema=z.enum(teamIds);
export const statsSchema = z.object({ contact:value, power:value, eye:value, speed:value, field:value, mental:value, velocity:value, control:value, breaking:value, stamina:value });
export type Stats = z.infer<typeof statsSchema>;
export type Gains = Partial<Record<StatKey, number>>;
export type Runner = z.infer<typeof runnerSchema>;
export type Outcome = import('./plate.ts').PlateOutcome;
const starterSchema=z.enum(['player','junseo','other']);
const candidateSchema=z.object({ability:count.max(115),practice:count.max(20),performance:count.max(20).nullable(),readiness:count.max(20),readinessSource:z.enum(['practice','match']),trust:count.max(20),total:count.max(155)});
export const competitionSchema=z.object({matchId:z.string(),month:z.number().int().min(4).max(6),week:z.number().int().min(1).max(4),player:candidateSchema,junseo:candidateSchema,starter:starterSchema,previous:starterSchema.nullable(),reason:z.enum(['lead','incumbent','first_chance','below_threshold'])});
const duelSchema=z.object({half:z.union([z.literal(0),z.literal(1)]),order:count,inning:z.number().int().min(1).max(99),opponent:z.enum(['taeo','jihwan']),tactic:z.string(),source:z.enum(['manual','auto']),outcome:z.enum(['strikeout','out','walk','single','double','homer','sacrifice'])});
const competitorSchema=z.object({stats:statsSchema,trust:value,weeks:z.array(z.object({key:z.number().int().min(1).max(16),gains:z.partialRecord(z.enum(statKeys),count.max(100)),trustDelta:count.max(1),sharedPrimary:z.enum(statKeys).nullable(),source:z.literal('v6'),sharedSecondary:z.enum(statKeys).nullable().optional()})).max(16)});
const skillCheckSchema=z.object({half:z.union([z.literal(0),z.literal(1)]),order:count,inning:z.number().int().min(1).max(99),tactic:z.string(),source:z.enum(['manual','auto']),intelligence:value,eligible:z.array(idSchema).max(32),active:z.array(idSchema).max(32)});
export type Match = z.infer<typeof matchSchema>;
export const supportIds=['bat_senior','pitch_senior','rival','catcher','manager','classmate'] as const;
export type SupportId=string;
export const supportIdSchema=idSchema;
export const skillIds=['contact_focus','power_drive','patient_eye','fastball_edge','precision','breaking_read','calm','steady','contact_master','slugger','power_finish','efficient_pitch'] as const;
export type SkillId=string;
export const phases = ['lineup','weekday','supportEvent','supportResult','weekend','selection','match','matchResult','matchEnd','roleEvent','complete'] as const;
const changesSchema = z.record(z.string(), z.number().int().min(-1000).max(1000));
const trainingResultSchema=z.object({outcome:z.enum(['success','failure']),energyBefore:value,failureChance:count.max(95),points:count.max(100)});
export const evaluationSchema=z.object({ability:z.number(),performance:z.number(),trust:z.number(),total:z.number(),rank:z.enum(['starter','substitute','reserve']),basis:z.literal('rival'),competition:competitionSchema.nullable()});
export const stateSchema = z.object({
  career:z.object({battingOrder:z.union([z.literal(1),z.literal(3),z.literal(4),z.literal(6),z.literal(8)]),battingPath:z.enum(['undecided','leadoff','middle']),pitchingRole:z.enum(['starter','middle','closer']),completed:z.array(z.enum(['bat_six','bat_path','bat_cleanup','pitch_role'])).max(3),pending:z.enum(['bat_six','bat_path','bat_cleanup','pitch_role']).nullable(),history:z.array(z.object({matchId:z.string(),eventId:z.enum(['bat_six','bat_path','bat_cleanup','pitch_role']),choice:z.enum(['six','leadoff','center','cleanup','starter','closer','stay'])})).max(6)}).strict(),
  version:z.literal(8),content:contentSchema,weekdayPart:z.union([z.literal(1),z.literal(2)]),activeEncounter:z.string().nullable(),encounterHistory:z.array(z.object({key:z.number().int().min(1).max(16),part:z.union([z.literal(1),z.literal(2)]),eventId:z.string().nullable(),support:supportIdSchema.nullable(),choice:z.number().int().min(0).max(1).nullable()})).max(32), name:z.string().trim().min(1).refine(s => [...s].length <= 8), role:z.enum(['batter','pitcher']),month:monthSchema,
  week:z.number().int().min(1).max(4), phase:z.enum(phases), revision:count,
  rng:z.number().int().min(1).max(4294967295), attributes:z.object({power:value,endurance:value,mental:value,intelligence:value,sense:value}).strict(), proficiency:z.partialRecord(z.enum(statKeys),value),
  energy:value, stress:value, trust:value, rival:value, catcher:value,
  log:z.array(z.object({month:monthSchema,week:z.number().int().min(1).max(4), title:z.string(),text:z.string(),slot:z.enum(['first','second','weekend']).optional(),changes:changesSchema,training:trainingResultSchema.optional()})).max(500),
  schedule:z.array(z.object({month:monthSchema,week:z.number().int().min(1).max(4),weekday:z.string(),weekday2:z.string(),weekend:z.string()})).max(16),
  initial:z.record(z.string(),count), weekStart:z.record(z.string(),count),monthStart:z.record(z.string(),count),
  notice:z.string(), eventReply:z.string(), match:matchSchema.nullable(), matchRecorded:z.boolean(),
  supports:z.array(supportIdSchema).max(6),
  bonds:z.record(idSchema,value),
  placements:z.record(z.string(),z.string()),trainingSeed:z.number().int().min(1).max(4294967295),
  supportCompleted:z.array(idSchema).max(1000),activeSupport:supportIdSchema.nullable(),
  skillPoints:count.max(1000),skills:z.array(idSchema).max(32),hints:z.array(idSchema).max(32),unlockedSkills:z.array(idSchema).max(12),
  records:z.array(z.object({month:monthSchema,match:matchSchema})).max(6),
  competitor:competitorSchema,selectionHistory:z.array(competitionSchema).max(5),
  evaluation:evaluationSchema.nullable(),
  tournament:z.object({rounds:z.array(z.object({round:z.number().int().min(1).max(3),games:z.array(z.object({home:teamSchema,away:teamSchema,homeScore:count.max(999),awayScore:count.max(999)})).min(1).max(4)})).max(3)}),
}).strict();
export type GameState = z.infer<typeof stateSchema>;
// The revision is captured when a UI action is offered, not when it is applied.
export type Action = {revision:number; type:'lineup'|'editLineup'|'learn'|'activity'|'choice'|'continue'|'tactic'|'delegate'|'intervene'|'playback'; id?:string; target?:TrainingTarget; index?:number; supports?:SupportId[];partner?:SupportId};
export interface Activity { id:string; title:string; description:string; gains:PrimaryGains; proficiency?:Gains; rivalTrainingStat?:StatKey; energy:number; stress:number; catcher?:number; training?:boolean; }
export interface Choice { points?:number; label:string; hint:string; reply:string; gains?:PrimaryGains; proficiency?:Gains; energy?:number; stress?:number; trust?:number; rival?:number; catcher?:number; }
export interface Tactic {id:string; title:string; description:string; outlook:string; reason:string; disabled:boolean; burden:number; probabilities:number[];}
