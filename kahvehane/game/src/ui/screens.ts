// Kahvehane Pişti — tüm ekranların giriş noktası (çerçevesiz DOM + Web Animations API, söz tabanlı).
// Kullanım: const screens = new Screens(document.body, {tap, whoosh, coin, reward, ...});
//   screens.onCosmeticsChanged = (kind, id) => …   // markette/koleksiyonda kuşanınca (deste/masa/efekt/çerçeve/karakter)
//   await screens.onboarding(profile)               // ilk açılış hikâyesi + hediye karakter + ad
//   const a = await screens.home(profile)           // ana ekran (market, koleksiyon, günlük ödül, sandık içeride çözülür)
//   await screens.versus(setup, stake); … const r = await screens.results(data)
// Birleşik ağırlık dosyaları (latin + latin-ext ayrı unicode-range ile; yalnız kullanılan alt küme iner)
import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './theme.css';
import './ui.css';
import './meta.css';
import '../themes/frames.css';

import type {CosmeticsListener, GameHud, HomeAction, ResultsData, Settings, Sounds} from './types';
import type {Profile as GameProfile} from '../game/profile';
import type {MatchSetup, Mode} from '../game/types';
import {ANIM, enableActiveStates, enableSpringPress, h, q} from './dom';
import {Fx} from './fx';
import {HudView} from './hud';
import {HomeView, type HomeMemo} from './lobby';
import {splash, versus} from './intro';
import {results} from './results';
import {onboarding} from './onboarding';
import {daily, pause, rules, settings} from './modals';
import {suitWipe, type Ctx} from './parts';

export type {CosmeticsListener, GameHud, HomeAction, HudLayout, HudPlayer, Mood, ResultsData, Settings, Sounds} from './types';
export {STAKES, BOT_LEVEL, payout} from './lobby';

export class Screens {
  readonly hud: GameHud;
  private hudView: HudView;
  /** Ayarlar penceresinde görünen sürüm */
  version = '0.2.0';
  /** Kuşanma bildirimi: uygulama desteyi (atlas) / masayı (tema) yeniden kurar. */
  onCosmeticsChanged: CosmeticsListener = () => {};
  private ctx: Ctx;
  private homeView: HomeView | null = null;
  private memo: HomeMemo = {};
  /** Perde kapalı bekliyor: bir sonraki ekran kurulunca açılır. */
  private curtain: {reveal(): Promise<void>} | null = null;

  constructor(root: HTMLElement, sounds: Sounds) {
    enableActiveStates();
    enableSpringPress();
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

  /** İlk açılış hikâyesi: karşılama, hediye kutusu, karakter galerisi, ad. Sonunda perde kapanır; home() açar. */
  async onboarding(profile: GameProfile): Promise<void> {
    const dispose = await onboarding(this.ctx, profile);
    const w = suitWipe(this.ctx);
    await w.cover();
    dispose();
    this.curtain = w;
  }

  /** Ana ekran. Ayarlar/kurallar dönüşünde aynı ekran yeniden kurulmadan tazelenir. auto: test için kendiliğinden OYNA. */
  async home(profile: GameProfile, auto?: {mode: Mode}): Promise<HomeAction> {
    if (this.homeView) this.homeView.refresh();
    else this.homeView = new HomeView(this.ctx, profile, (k, id) => this.onCosmeticsChanged(k, id), this.memo);
    this.openCurtain();
    const v = this.homeView;
    if (auto) v.autoPlay(auto.mode);
    const a = await v.wait();
    if (a.type === 'play') {
      this.homeView = null;
      // karşılaşma girişi ana ekranın üstünden süpürür; ana ekran arkada kapanır
      window.setTimeout(() => v.leave(), ANIM ? 380 : 0);
    }
    return a;
  }

  /** Sinematik giriş (1'e 1 / 4 kişi / eşli); bitince çözülür. */
  versus(setup: MatchSetup, stake: number): Promise<void> {
    return versus(this.ctx, setup, stake);
  }

  pause(): Promise<'resume' | 'settings' | 'rules' | 'leave'> {
    return pause(this.ctx);
  }

  /** El sonu. "Ana Sayfa" seçilirse dört renk perde kapanır (home() açar). */
  async results(d: ResultsData, frame = 'standart'): Promise<'again' | 'home'> {
    const dim = (this.hudView as unknown as {dim?: (on: boolean) => void}).dim;
    dim?.call(this.hudView, true);
    const r = await results(this.ctx, d, frame);
    dim?.call(this.hudView, false);
    if (r === 'home') {
      const w = suitWipe(this.ctx);
      await w.cover();
      this.curtain = w;
    }
    return r;
  }

  /** Perde kapalıysa aç (ör. maç yarıda bırakıldığında ana ekrana dönerken). */
  private openCurtain(): void {
    const c = this.curtain;
    this.curtain = null;
    if (c) window.setTimeout(() => c.reveal(), ANIM ? 60 : 0);
  }

  /** Ekran geçişi perdesi (uygulama ara geçişlerde kullanabilir): kapatır, sonraki home() açar. */
  async cover(): Promise<void> {
    if (this.curtain) return;
    const w = suitWipe(this.ctx);
    await w.cover();
    this.curtain = w;
  }

  /** Her değişiklikte onChange çağrılır; pencere kapanınca çözülür. */
  settings(s: Settings, onChange: (s: Settings) => void): Promise<void> {
    return settings(this.ctx, s, onChange, this.version);
  }

  rules(): Promise<void> {
    return rules(this.ctx);
  }

  /** day: 1..7, rewards: 7 gün. Toplanan miktarla çözülür (kapatılırsa 0). (Ana ekran kendi içinde kullanır; galeri için.) */
  daily(day: number, rewards: number[]): Promise<number> {
    const hv = this.homeView;
    return daily(this.ctx, day, rewards, hv ? {at: () => hv.coins.target(), add: n => hv.coins.add(n)} : undefined);
  }
}
