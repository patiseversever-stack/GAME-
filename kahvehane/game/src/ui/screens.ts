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
import './perf.css';
import '../themes/frames.css';

import type {ChatOption, ChatSamplePort, CosmeticsListener, GameHud, HandOption, HomeAction, InterimData, MenuTalk, QuickChatSheetPort, ResultsData, ResultsTalk, ResumeOffer, Settings, Sounds} from './types';
import type {ChatLevel} from '../ai/dialogue';
import type {Profile as GameProfile} from '../game/profile';
import type {Difficulty, Game, HandLayout, MatchSetup, Mode} from '../game/types';
import {ANIM, enableActiveStates, enableSpringPress, h, q} from './dom';
import {Fx} from './fx';
import {HudView} from './hud';
import {HomeView, type HomeMemo} from './lobby';
import {splash, versus} from './intro';
import {prepareResults, results} from './results';
import {onboarding} from './onboarding';
import {daily, pause, rules, settings} from './modals';
import {handChooser} from './handchooser';
import {chatChooser} from './chatchooser';
import {QuickChatSheet} from './quickchat';
import {suitWipe, toast, type Ctx} from './parts';
import {I} from './icons';
import {interim, lengthSheet, resumePrompt, type InterimHandle} from './scoreboard';

export type {ChatOption, ChatSamplePort, CosmeticsListener, GameHud, HomeAction, HudLayout, HudPlayer, InterimData, MenuTalk, Mood, QuickChatItem, QuickChatSheetPort, ResultsData, ResultsTalk, ResumeOffer, Settings, Sounds, TalkStage, Talker} from './types';
export type {InterimHandle} from './scoreboard';
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
  /** Kuşanılmış deste (kurallar sayfasındaki kapalı kartlar masadakiyle aynı arka yüzü gösterir) */
  private deckId = 'yildizli';
  /** Perde kapalı bekliyor: bir sonraki ekran kurulunca açılır. */
  private curtain: {reveal(): Promise<void>} | null = null;
  private qc: QuickChatSheet | null = null;

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

  /** Menü konuşmaları (galeri / market) — uygulama konuşma yöneticisine bağlar. */
  set talk(t: MenuTalk | undefined) {
    this.ctx.talk = t;
  }

  /** Hızlı sohbet penceresi: ilk istekte kurulur (DOM ilk açılışta), sonra hep aynı örnek. */
  quickChat(): QuickChatSheetPort {
    return (this.qc ??= new QuickChatSheet(this.ctx));
  }

  /** Açılış: logo, ilerleme çubuğu, dönen ipuçları. */
  splash(): {progress(p: number): void; done(ready?: Promise<unknown>): Promise<void>} {
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

  /**
   * Ana ekran. Ayarlar/kurallar dönüşünde aynı ekran yeniden kurulmadan tazelenir. auto: test için kendiliğinden OYNA.
   * offer: yarım kalan maç — ana ekran açılınca "devam et?" sorulur; Devam → {type:'resume'}, Bırak → offer.onDecline() (ana ekran kalır).
   */
  async home(profile: GameProfile, auto?: {game: Game; mode: Mode; difficulty?: Difficulty}, offer?: ResumeOffer): Promise<HomeAction> {
    this.deckId = profile.data.equipped.deck;
    if (this.homeView) this.homeView.refresh();
    else this.homeView = new HomeView(this.ctx, profile, (k, id) => {
      if (k === 'deck') this.deckId = id;
      this.onCosmeticsChanged(k, id);
    }, this.memo);
    this.openCurtain();
    const v = this.homeView;
    if (offer) {
      // ana ekran yerleşince sor (otomatik testte hemen kabul; OYNA'dan önce)
      window.setTimeout(async () => {
        const r = await resumePrompt(this.ctx, offer);
        if (this.homeView !== v) return;
        if (r === 'resume') v.finish({type: 'resume'});
        else {
          offer.onDecline();
          toast(this.ctx, 'Maçı bıraktın, bahsi kaybettin', I.exit);
        }
      }, ANIM && !offer.auto ? 650 : 0);
    } else if (auto) v.autoPlay(auto.game, auto.mode, auto.difficulty);
    let a = await v.wait();
    // OYNA → "Kaça oynuyoruz?" (otomatik testte yok: uzunluk ?len= ile). Seçim maçı başlatır; kapatmak ana ekrana döner.
    while (a.type === 'play' && !auto && !a.len) {
      const len = await lengthSheet(this.ctx, {game: a.game, mode: a.mode, stake: a.stake, current: profile.data.lastLength[a.game]});
      if (len) {
        a = {...a, len};
        break;
      }
      a = await v.wait();
    }
    if (a.type === 'play' || a.type === 'resume') {
      this.homeView = null;
      // karşılaşma girişi ana ekranın üstünden süpürür; ana ekran arkada kapanır
      window.setTimeout(() => v.leave(), ANIM ? 380 : 0);
    }
    return a;
  }

  /** İlk Blöf'te el düzeni seçici (ekran ikiye bölünür: Gruplu | Klasik). Seçimle çözülür; kaydetmek çağıranın işi. */
  handChooser(): Promise<HandLayout> {
    return handChooser(this.ctx, this.deckId);
  }

  /**
   * İlk açılışta sohbet seviyesi seçici (Sakin · Normal · Geveze; kartta canlı önizleme + örnek dinletme). Seçimle çözülür;
   * kaydetmek çağıranın işi. Perde kapalıysa (hikâyeden sonra) önce açılır.
   */
  chatChooser(port?: ChatSamplePort, current?: ChatLevel): Promise<ChatLevel> {
    this.openCurtain();
    return chatChooser(this.ctx, port, current, this.deckId);
  }

  /** Sinematik giriş (1'e 1 / 3 kişi / 4 kişi / eşli; oyun adıyla); bitince çözülür. */
  versus(setup: MatchSetup, stake: number): Promise<void> {
    return versus(this.ctx, setup, stake);
  }

  /** Mola. leave: "Masadan Kalk" onay metni (bahis yanar). */
  pause(leave?: {sub: string; btn?: string}): Promise<'resume' | 'settings' | 'rules' | 'leave'> {
    return pause(this.ctx, leave);
  }

  /** Eller arası Ara Skor (HUD solar). done: 'next' (dokunma / süre) ya da 'leave' (onaylı). */
  interim(d: InterimData): InterimHandle {
    this.hud.dim(true);
    const ia = interim(this.ctx, d);
    void ia.done.then(() => this.hud.dim(false));
    return ia;
  }

  /** Sonuç ekranı gelmeden (el sonu beklemesinde) portreleri önceden çöz. */
  prepareResults(d: ResultsData): void {
    prepareResults(d);
  }

  /** El sonu. "Ana Sayfa" seçilirse dört renk perde kapanır (home() açar). talk: karşılıklı konuşma kancası (uygulama). */
  async results(d: ResultsData, frame = 'standart', talk?: ResultsTalk): Promise<'again' | 'home'> {
    const dim = (this.hudView as unknown as {dim?: (on: boolean) => void}).dim;
    dim?.call(this.hudView, true);
    const r = await results(this.ctx, d, frame, talk);
    dim?.call(this.hudView, false);
    this.memo.last = {outcome: d.outcome, streak: d.streak, levelUp: d.after.level > d.before.level};
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
  async settings(s: Settings, onChange: (s: Settings) => void, hand?: HandOption, chat?: ChatOption): Promise<void> {
    if ((await settings(this.ctx, s, onChange, this.version, hand, this.deckId, chat)) === 'rules') await rules(this.ctx, this.memo.game, this.deckId);
  }

  /** Nasıl Oynanır (sekmeler: Pişti | Blöf). game: açılacak sekme (verilmezse son oynanan). */
  rules(game?: Game): Promise<void> {
    return rules(this.ctx, game ?? this.memo.game, this.deckId);
  }

  /** day: 1..7, rewards: 7 gün. Toplanan miktarla çözülür (kapatılırsa 0). (Ana ekran kendi içinde kullanır; galeri için.) */
  daily(day: number, rewards: number[]): Promise<number> {
    const hv = this.homeView;
    return daily(this.ctx, day, rewards, hv ? {at: () => hv.coins.target(), add: n => hv.coins.add(n)} : undefined);
  }
}
