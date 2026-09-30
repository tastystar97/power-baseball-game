import type { GameState } from './types.ts';
export function random(s: Pick<GameState,'rng'>): number {
  let x = s.rng >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  s.rng = (x >>> 0) || 1;
  return s.rng / 4294967296;
}
export const clamp = (n:number, min=0, max=100) => Math.min(max,Math.max(min,n));
