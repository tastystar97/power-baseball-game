import {z} from 'zod';

export const primaryNames=['power','endurance','mental','intelligence','sense'] as const;
export const roleAbilityNames={batter:['contact','power','eye','speed','field','mental'],pitcher:['velocity','control','breaking','stamina','field','mental']} as const;
export const skillAbilityNames=(role:'batter'|'pitcher'|'both'):readonly string[]=>role==='both'?['field','mental']:roleAbilityNames[role];
export const abilityNames=['contact','power','eye','speed','field','mental','velocity','control','breaking','stamina'] as const;
export const outcomeIds=['strikeout','out','walk','single','double','homer','sacrifice'] as const;
export const tacticIds=['contact','power','patient','bunt','fastball','breaking','control','chase'] as const;
export const weekdayActivities={batter:['batting','weights','running','fielding','freebatting','tactics','study','rest'],pitcher:['velocity','weights','running','control','breaking','endurance','tactics','study','rest']} as const;
export const idSchema=z.string().min(1).max(150).regex(/^[a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?$/);
const text=(max:number)=>z.string().trim().min(1).max(max);
const integer=(min:number,max:number)=>z.number().int().min(min).max(max);
const role=z.enum(['batter','pitcher','both']);
const gains=z.partialRecord(z.enum(primaryNames),integer(-10,10));
const roleRef=z.object({batter:idSchema.nullable(),pitcher:idSchema.nullable()}).strict();
const when=<T extends z.ZodRawShape>(shape:T)=>z.object({...shape,role:z.enum(['batter','pitcher']).optional()}).strict();

export const conditionSchema=z.discriminatedUnion('kind',[
  when({kind:z.literal('tactic'),values:z.array(z.enum(tacticIds)).min(1).max(4)}),
  when({kind:z.literal('inning'),min:integer(1,99),max:integer(1,99)}),
  when({kind:z.literal('outs'),min:integer(0,2),max:integer(0,2)}),
  when({kind:z.literal('energy'),min:integer(0,100),max:integer(0,100)}),
  when({kind:z.literal('stress'),min:integer(0,100),max:integer(0,100)}),
  when({kind:z.literal('runners'),present:z.boolean()}),
  when({kind:z.literal('score'),value:z.enum(['behind','tied','ahead'])}),
  when({kind:z.literal('opponent'),values:z.array(z.enum(['wild','fast','tired','power','patient'])).min(1).max(5)}),
]);
export const effectSchema=z.discriminatedUnion('kind',[
  when({kind:z.literal('probability'),from:z.enum(outcomeIds),to:z.enum(outcomeIds),amount:z.number().min(.001).max(.08)}),
  when({kind:z.literal('burden'),amount:integer(1,3)}),
  when({kind:z.literal('fatigue'),amount:z.number().min(.1).max(1)}),
]);
export const skillSchema=z.object({
  id:idSchema,name:text(50),description:text(300),role,cost:integer(6,60),family:idSchema,
  tier:z.enum(['normal','advanced']),prerequisite:idSchema.optional(),owner:idSchema.optional(),
  requires:z.partialRecord(z.enum(abilityNames),integer(0,95)),
  conditions:z.array(conditionSchema).max(5),effects:z.array(effectSchema).min(1).max(2),style:z.string().max(30).optional(),
}).strict();
export const cardSchema=z.object({
  id:idSchema,name:text(30),title:text(60),role:text(60),description:text(600),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),
  specialty:z.enum(primaryNames).nullable(),
  training:z.object({batter:z.array(z.enum(weekdayActivities.batter)).min(1).max(3),pitcher:z.array(z.enum(weekdayActivities.pitcher)).min(1).max(3)}).strict(),
  bonus:z.object({energy:integer(0,6),stress:integer(-4,0),jointEnergy:integer(0,6),gains:z.partialRecord(z.enum(primaryNames),integer(0,2))}).strict(),
  hints:roleRef,ultimates:roleRef,portrait:z.string().max(200).optional(),
}).strict();
export const eventChoiceSchema=z.object({
  label:text(100),reply:text(1200),gains,energy:integer(-15,16),stress:integer(-16,10),
  points:integer(0,8),trust:integer(-3,3),bond:integer(0,8),hints:z.array(idSchema).max(2),unlocks:z.array(idSchema).max(2),
}).strict();
export const eventSchema=z.object({id:idSchema,owner:idSchema,kind:z.enum(['daily','growth']),bond:integer(0,100),previous:idSchema.optional(),
  title:text(100),text:text(2400),choices:z.tuple([eventChoiceSchema,eventChoiceSchema])}).strict();
export const imageSchema=z.object({mime:z.enum(['image/png','image/jpeg','image/webp']),data:z.string().max(2800000).regex(/^[A-Za-z0-9+/]+={0,2}$/)}).strict();
export const contentSchema=z.object({cards:z.array(cardSchema).min(1).max(100),skills:z.array(skillSchema).max(240),events:z.array(eventSchema).max(1000),images:z.record(z.string(),imageSchema)}).strict();
export const packSchema=contentSchema.extend({
  format:z.literal('last-summer-cardpack'),version:z.literal(1),ruleset:z.literal('summer-7'),
  id:z.string().min(3).max(64).regex(/^[a-z][a-z0-9_-]*$/),revision:integer(1,1000000),name:text(100),author:z.string().max(100),description:z.string().max(1000),
}).strict();
export type SupportCard=z.infer<typeof cardSchema>;
export type SkillDefinition=z.infer<typeof skillSchema>;
export type SkillCondition=z.infer<typeof conditionSchema>;
export type SkillEffect=z.infer<typeof effectSchema>;
export type EncounterDefinition=z.infer<typeof eventSchema>;
export type CardContent=z.infer<typeof contentSchema>;
export type CardPack=z.infer<typeof packSchema>;
