// Results view-model + share helpers shared by the flight modes (integrator).
import type { ResultRowVM, ResultsProps, GameMode } from '../ui/types.ts';
import type { ProxTier } from '../ui/theme.ts';
import type { SessionResult } from './FlightSession.ts';
import type { WorldId } from '../sim/types.ts';
import type { Game } from './Game.ts';
import { UI } from '../ui/UI.ts';
import { t } from '../ui/i18n.ts';
import { toDisplayCode } from '../sim/replay/ghostCode.ts';

export function resultRows(r: SessionResult, mode: GameMode, gatesTotal: number, penaltySec: number): ResultRowVM[] {
  const b = r.breakdown;
  const s = r.stats;
  const rows: ResultRowVM[] = [];
  if (mode === 'daily' || (mode === 'duel' && penaltySec > 0)) {
    rows.push({ kind: 'flight', value: r.timeSec });
    rows.push({ kind: 'gates', value: 0, a: s.gatesPassed, b: gatesTotal });
    if (r.gatesMissed > 0) rows.push({ kind: 'missed', value: r.gatesMissed * penaltySec, n: r.gatesMissed });
    return rows;
  }
  rows.push({ kind: 'proximity', value: Math.round(b.proximity) });
  if (s.grazes > 0) rows.push({ kind: 'grazes', value: Math.round(b.graze), n: s.grazes });
  rows.push({ kind: 'gates', value: Math.round(b.gates), a: s.gatesPassed, b: gatesTotal });
  if (s.balloonThreads > 0) rows.push({ kind: 'balloon', value: Math.round(b.threads), n: s.balloonThreads });
  if (s.thermalsEntered > 0) rows.push({ kind: 'thermal', value: Math.round(b.thermals), n: s.thermalsEntered });
  if (r.kind === 'landed') rows.push({ kind: 'landing', value: Math.round(b.landing), m: Math.round(Math.min(999, r.distToTarget) * 10) / 10 });
  if (b.soft > 0) rows.push({ kind: 'soft', value: Math.round(b.soft) });
  if (b.brave > 0) rows.push({ kind: 'bold', value: Math.round(b.brave) });
  return rows;
}

export function stripProps(r: SessionResult): ProxTier[] {
  return r.strip.map((v) => (v === 5 ? 5 : v === 3 ? 3 : v === 2 ? 2 : v === 1 ? 1 : 0) as ProxTier);
}

/** Digits 0..4 (⬜🟩🟨🟧🟥) as stored in the save. */
export function stripDigits(r: SessionResult): string {
  return r.strip.map((v) => (v === 5 ? 4 : v)).join('');
}

export function baseResultsProps(mode: GameMode, world: WorldId, r: SessionResult, gatesTotal: number, penaltySec: number): ResultsProps {
  return {
    mode,
    half: r.kind === 'half',
    world,
    score: r.score,
    timeSec: mode === 'daily' ? r.resultTimeMs / 1000 : r.timeSec,
    stars: r.kind === 'half' ? 0 : r.stars,
    rows: resultRows(r, mode, gatesTotal, penaltySec),
    strip: stripProps(r),
    hasNext: false,
  };
}

/** Share text (+ optional share card image) through the bridge; toast on clipboard / download fallbacks. */
export async function shareText(game: Game, text: string, imageDataUrl?: string): Promise<void> {
  game.audio.event({ type: 'uiConfirm' });
  const res = await game.app.bridge.share({ text, imageDataUrl });
  if (res.method === 'clipboard') UI.toast(t('toast.copied'), { icon: 'check' });
  else if (res.method === 'download' && res.downloadUrl) {
    const a = document.createElement('a');
    a.href = res.downloadUrl;
    a.download = 'kanat.png';
    a.click();
  }
  game.app.bridge.analytics('share', { method: res.method });
}

export function duelCodeText(code: string, lang: 'tr' | 'en'): string {
  const disp = toDisplayCode(code);
  return lang === 'en' ? `KANAT · Duel: ${disp}` : `KANAT · Düello: ${disp}`;
}
