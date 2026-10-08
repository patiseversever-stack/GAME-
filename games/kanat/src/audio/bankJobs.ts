// Job list of the sound bank (pure; shared by bank.ts and the generator worker).
import { synthIR } from './dsp.ts';
import type { Pcm } from './dsp.ts';
import { Rng } from './rng.ts';
import { SFX_IDS, generateNoiseLoop, generateSfx } from './sfxLib.ts';
import type { NoiseLoopId } from './sfxLib.ts';
import { DRUM_IDS, PCM_INSTS, PCM_REFS, renderDrum, renderInstrument } from './music/pcm.ts';

export const NOISE_LOOPS: readonly NoiseLoopId[] = ['pinkLoop', 'brownLoop', 'whiteLoop'];

export function instKey(inst: string, ref: number): string {
  return `inst:${inst}:${ref}`;
}

export function drumKey(id: string): string {
  return `drum:${id}`;
}

export const IR_KEY = 'ir:music';

export type Job = [string, () => Pcm];

/** Every clip the game needs, wind/noise first. Shared with the generator worker. */
export function bankJobs(): Job[] {
  const out: Job[] = [];
  // Wind & instrument noise first: the wind bed must be ready before anything else.
  for (const id of NOISE_LOOPS) out.push([id, () => generateNoiseLoop(id)]);
  out.push([IR_KEY, () => synthIR(2.6, 2.2, new Rng(0x6b616e61))]);
  for (const id of SFX_IDS) out.push([id, () => generateSfx(id)]);
  for (const inst of PCM_INSTS) for (const ref of PCM_REFS[inst]) out.push([instKey(inst, ref), () => renderInstrument(inst, ref)]);
  for (const d of DRUM_IDS) out.push([drumKey(d), () => renderDrum(d)]);
  return out;
}
