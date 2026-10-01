// Primary attributes are whole points; proficiency is stored in integer tenths.
export const PRIMARY_MAX=1500;
export const PRIMARY_EXPONENT=.46;
export const YEAR_CAPS=[1000,1300,1500] as const;
export const PROFICIENCY_UNIT=10;
export const INITIAL_ATTRIBUTES={power:230,endurance:230,mental:260,intelligence:290,sense:230};
export const PRIMARY_CURVE=[[1250,.3],[1000,.6],[800,.85]] as const;
export const PROFICIENCY_CURVE=[[90,.06],[80,.12],[70,.22],[60,.4]] as const;
export const SUPPORT_BONUS={attendance:5,specialty:5,bond:5,threshold:60,max:15,placement:.85};
export const REWARD_SCALE=8.5;
export const APPEARANCE_SENSE={starter:8,substitute:4,reserve:0};
export const curve=(value:number,rows:readonly (readonly [number,number])[])=>rows.find(([threshold])=>value>=threshold)?.[1]??1;
