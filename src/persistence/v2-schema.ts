// Frozen v2 format for validating existing saves before migration.
import { z } from 'zod';

export const statKeys = ['contact', 'power', 'eye', 'speed', 'field', 'mental', 'velocity', 'control', 'breaking', 'stamina'] as const;
export type StatKey = typeof statKeys[number];
export type Role = 'batter' | 'pitcher';
export const labels: Record<string, string> = {
  contact:'컨택', power:'파워', eye:'선구안', speed:'주루', field:'수비', mental:'멘탈',
  velocity:'구속 능력', control:'제구', breaking:'변화구', stamina:'지구력',
  energy:'체력', stress:'스트레스', academics:'학업', trust:'감독 신뢰', rival:'라이벌 친밀도', catcher:'동료 친밀도',
  skillPoints:'스킬 Pt',bond_bat_senior:'타격 선배 인연',bond_pitch_senior:'투수 선배 인연',bond_manager:'매니저 인연',bond_classmate:'반 친구 인연',
};
export const roleStats = (role: Role): StatKey[] => role === 'batter'
  ? ['contact','power','eye','speed','field','mental'] : ['velocity','control','breaking','stamina','field','mental'];
export const practiceStats = (role: Role): StatKey[] => role === 'batter'
  ? ['contact','power','speed','field'] : ['velocity','control','breaking','stamina','field'];
export const grade = (n: number) => n >= 90 ? 'S' : n >= 80 ? 'A' : n >= 70 ? 'B' : n >= 60 ? 'C' : n >= 50 ? 'D' : n >= 40 ? 'E' : n >= 25 ? 'F' : 'G';
const value = z.number().int().min(0).max(100);
const count = z.number().int().nonnegative();
export const statsSchema = z.object({ contact:value, power:value, eye:value, speed:value, field:value, mental:value, velocity:value, control:value, breaking:value, stamina:value });
export type Stats = z.infer<typeof statsSchema>;
export type Gains = Partial<Record<StatKey, number>>;
const runnerSchema = z.object({owner:z.enum(['player','team','opponent'])});
export type Runner = z.infer<typeof runnerSchema>;
export type Outcome = 'strikeout' | 'out' | 'walk' | 'single' | 'double' | 'homer' | 'sacrifice';
export const matchSchema = z.object({
  appearance:z.enum(['starter','substitute','reserve']),
  inning:z.number().int().min(1).max(99), half:z.union([z.literal(0),z.literal(1)]), outs:z.number().int().min(0).max(3),
  bases:z.tuple([runnerSchema.nullable(),runnerSchema.nullable(),runnerSchema.nullable()]),
  score:z.tuple([count,count]), lines:z.tuple([z.array(count).max(99),z.array(count).max(99)]),
  order:z.tuple([count,count]), highlights:z.number().int().min(0).max(3),
  faced:count, load:count, retired:z.boolean(), awaiting:z.boolean(), over:z.boolean(),
  batting:z.object({ab:count,hits:count,hr:count,rbi:count,walks:count,k:count}),
  pitching:z.object({outs:count,k:count,walks:count,hits:count,runs:count}),
  recent:z.array(z.string().max(250)).max(12),
  last:z.object({title:z.string(),text:z.string(),reasons:z.array(z.string()),runs:count}).nullable(),
});
export type Match = z.infer<typeof matchSchema>;
export const supportIds=['bat_senior','pitch_senior','rival','catcher','manager','classmate'] as const;
export type SupportId=typeof supportIds[number];
export const supportIdSchema=z.enum(supportIds);
export const skillIds=['contact_focus','power_drive','patient_eye','fastball_edge','precision','breaking_read','calm','steady'] as const;
export type SkillId=typeof skillIds[number];
export const phases = ['lineup','weekday','supportEvent','supportResult','event','eventResult','weekend','weekendEvent','weekendResult','selection','match','matchResult','matchEnd','complete'] as const;
const changesSchema = z.record(z.string(), z.number().int().min(-1000).max(1000));
const trainingResultSchema=z.object({outcome:z.enum(['success','failure']),energyBefore:value,failureChance:count.max(95),points:count.max(100)});
export const evaluationSchema=z.object({ability:z.number(),performance:z.number(),trust:z.number(),total:z.number(),rank:z.enum(['starter','substitute','reserve'])});
export const stateSchema = z.object({
  version:z.literal(2), name:z.string().trim().min(1).refine(s => [...s].length <= 8), role:z.enum(['batter','pitcher']),month:z.union([z.literal(3),z.literal(4)]),
  week:z.number().int().min(1).max(4), phase:z.enum(phases), revision:count,
  rng:z.number().int().min(1).max(4294967295), stats:statsSchema,
  energy:value, stress:value, academics:value, trust:value, rival:value, catcher:value,
  completedEvents:z.array(z.number().int().min(1).max(6)).max(6),
  log:z.array(z.object({month:z.union([z.literal(3),z.literal(4)]),week:z.number().int().min(1).max(4), title:z.string(),text:z.string(),changes:changesSchema,training:trainingResultSchema.optional()})).max(250),
  schedule:z.array(z.object({month:z.union([z.literal(3),z.literal(4)]),week:z.number().int().min(1).max(4),weekday:z.string(),weekend:z.string()})).max(8),
  initial:z.record(z.string(),count), weekStart:z.record(z.string(),count),monthStart:z.record(z.string(),count),
  notice:z.string(), eventReply:z.string(), match:matchSchema.nullable(), matchRecorded:z.boolean(),
  supports:z.array(supportIdSchema).max(3),
  bonds:z.object({bat_senior:value,pitch_senior:value,manager:value,classmate:value}),
  placements:z.record(z.string(),z.string()),trainingSeed:z.number().int().min(1).max(4294967295),
  supportCompleted:z.array(supportIdSchema).max(6),activeSupport:supportIdSchema.nullable(),
  skillPoints:count.max(1000),skills:z.array(z.enum(skillIds)).max(8),hints:z.array(z.enum(skillIds)).max(8),
  lineupHistory:z.array(z.object({month:z.union([z.literal(3),z.literal(4)]),supports:z.array(supportIdSchema).length(3)})).max(2),
  records:z.array(z.object({month:z.union([z.literal(3),z.literal(4)]),match:matchSchema})).max(2),
  evaluation:evaluationSchema.nullable(),
});
export type GameState = z.infer<typeof stateSchema>;
// The revision is captured when a UI action is offered, not when it is applied.
export type Action = {revision:number; type:'lineup'|'editLineup'|'learn'|'activity'|'choice'|'continue'|'tactic'; id?:string; target?:StatKey; index?:number; supports?:SupportId[]};
export interface Activity { id:string; title:string; description:string; gains:Gains; energy:number; stress:number; academics?:number; catcher?:number; training?:boolean; }
export interface Choice { label:string; hint:string; reply:string; gains?:Gains; energy?:number; stress?:number; trust?:number; rival?:number; catcher?:number; academics?:number; }
export interface Tactic {id:string; title:string; description:string; outlook:string; reason:string; disabled:boolean; burden:number; probabilities:number[];}
