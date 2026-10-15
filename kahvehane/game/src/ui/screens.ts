// Kahvehane Pişti — tüm ekranların giriş noktası (çerçevesiz DOM + Web Animations API, söz tabanlı).
// Kullanım: const screens = new Screens(document.body, {tap, whoosh, coin, reward});
// Birleşik ağırlık dosyaları (latin + latin-ext ayrı unicode-range ile; yalnız kullanılan alt küme iner)
import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './theme.css';
import './ui.css';

import type {GameHud, LobbyAction, Opponent, Profile, ResultsData, Settings, Sounds} from './types';
import {ANIM, enableActiveStates, h, q} from './dom';
import {Fx} from './fx';
import {HudView} from './hud';
import {LobbyView} from './lobby';
import {splash, versus} from './intro';
import {results} from './results';
import {daily, pause, rules, settings} from './modals';
import type {Ctx} from './parts';

export type {GameHud, HudLayout, HudPlayer, LobbyAction, Mood, Opponent, Profile, ResultsData, Settings, Sounds} from './types';
export {STAKES} from './lobby';

export class Screens {
  readonly hud: GameHud;
  private hudView: HudView;
  /** Ayarlar penceresinde görünen sürüm */
  version = '0.1.0';
  private ctx: Ctx;
  private lobbyView: LobbyView | null = null;
  private lastStake = 100;

  constructor(root: HTMLElement, sounds: Sounds) {
    enableActiveStates();
    if (!ANIM) document.documentElement.classList.add('no-anim');
    const layer = h('div', 'kh-ui');
    root.append(layer);
    const fx = new Fx(layer);
    this.ctx = {layer, sounds, fx};
    this.hudView = new HudView(layer, fx);
    this.hud = this.hudView;
    const rot = h('div', 'kh-rotate', `<div><div class="kh-rotate__phone"></div><div class="kh-rotate__t">Telefonu dik tut</div>
      <div class="kh-rotate__s">Kahvehane dikey oynanır</div><button class="kh-btn kh-btn--2">Yine de devam et</button></div>`);
    q(rot, 'button').addEventListener('click', () => rot.classList.add('is-dismissed'));
    layer.append(rot);
  }

  /** Açılış: logo, ilerleme çubuğu, dönen ipuçları. */
  splash(): {progress(p: number): void; done(): Promise<void>} {
    return splash(this.ctx);
  }

  /** Ana menü. Ayarlar/Kurallar/Günlük dönüşünde aynı lobi yeniden kurulmadan güncellenir. */
  async lobby(p: Profile, opponents: Opponent[], dailyReady: boolean): Promise<LobbyAction> {
    if (this.lobbyView) this.lobbyView.update(p, opponents, dailyReady);
    else this.lobbyView = new LobbyView(this.ctx, p, opponents, dailyReady, this.lastStake);
    const v = this.lobbyView;
    const a = await v.wait();
    this.lastStake = v.selectedStake;
    if (a.type === 'play') {
      this.lobbyView = null;
      // Karşılaşma girişi lobinin üstünden süpürür; lobi arkada kapanır.
      window.setTimeout(() => v.leave(), ANIM ? 380 : 0);
    }
    return a;
  }

  /** 1.6 sn sinematik giriş; bitince çözülür. */
  versus(p: Profile, o: Opponent, stake: number): Promise<void> {
    return versus(this.ctx, p, o, stake);
  }

  pause(): Promise<'resume' | 'settings' | 'rules' | 'leave'> {
    return pause(this.ctx);
  }

  results(d: ResultsData): Promise<'again' | 'lobby'> {
    this.hudView.dim(true);
    return results(this.ctx, d).then(r => {
      this.hudView.dim(false);
      return r;
    });
  }

  /** Her değişiklikte onChange çağrılır; pencere kapanınca çözülür. */
  settings(s: Settings, onChange: (s: Settings) => void): Promise<void> {
    return settings(this.ctx, s, onChange, this.version);
  }

  rules(): Promise<void> {
    return rules(this.ctx);
  }

  /** day: 1..7, rewards: 7 gün. Toplanan miktarla çözülür (kapatılırsa 0). */
  daily(day: number, rewards: number[]): Promise<number> {
    const lv = this.lobbyView;
    const target = lv ? {at: () => lv.coinTarget(), add: (n: number) => lv.bumpBy(n)} : undefined;
    return daily(this.ctx, day, rewards, target);
  }
}
