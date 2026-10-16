// Geliştirme: Blöf motoru (src/game/blofMatch.ts) hazır olmadan uygulama akışını (ana ekran → giriş → el → ekonomi → sonuç → görevler/istatistik) denemek için
// sahte el. Gerçek BlofMatch ile aynı yüzey: play(setup) → Promise<sonuç | null>, abort(). Yalnız ?blofstub=1 ile (src/main.ts, yalnız geliştirme).
import type {BlofDeps, BlofFactory, BlofRunner} from '../src/game/blofAdapter';
import {MODE_INFO, type MatchSetup} from '../src/game/types';

class StubBlofMatch implements BlofRunner {
  private stop: () => void = () => {};
  private aborted = false;
  constructor(private d: BlofDeps) {}

  abort(): void {
    this.aborted = true;
    this.stop();
  }

  async play(setup: MatchSetup): Promise<unknown> {
    this.aborted = false;
    const n = MODE_INFO[setup.mode].seats;
    // el süresi (otomatik testte kısa)
    await new Promise<void>(res => {
      const t = window.setTimeout(res, this.d.auto ? 900 : 2500);
      this.stop = () => {
        clearTimeout(t);
        res();
      };
    });
    if (this.aborted) return null;
    const r = (setup.seed ?? Math.floor(Math.random() * 1e6)) >>> 0;
    const winner = r % n;
    const seats = Array.from({length: n}, (_, seat) => ({
      seat,
      left: seat === winner ? 0 : 2 + ((r >> (seat + 2)) % 7),
      bluffs: 1 + ((r >> (seat + 1)) % 5),
      timesCaught: (r >> (seat + 3)) % 3,
      caught: (r >> (seat + 5)) % 4,
      wrongChallenges: (r >> (seat + 7)) % 2,
    }));
    return {winner, seats};
  }
}

export const stubFactory: BlofFactory = d => new StubBlofMatch(d);
