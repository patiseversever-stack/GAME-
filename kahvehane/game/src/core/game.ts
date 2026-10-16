// Oyunlardan bağımsız motor sözleşmesi. Pişti, Blöf ve ileride Okey bunu uygular; yerel ev sahibi
// (net/host.ts) ve ileride çevrimiçi sunucu yalnız bu arayüzü tanır. Ayrıntı: docs/ONLINE.md.
//
// Kurallar:
// - create/apply SAF ve DETERMİNİSTİK: aynı ayar + aynı hamle dizisi → aynı durum ve olaylar. Saat ve Math.random yok.
// - Durum düz veridir (JSON'a yazılabilir); sunucu saklar, istemciye asla gitmez.
// - İstemci yalnız viewFor(state, seat) ve redact(event, seat) ile süzülmüş bilgiyi görür.
// - Görünür her değişiklik en az bir olayla duyurulur (ev sahibi boş olay kümesini istemciye göndermez).

export type GameId = 'pisti' | 'blof' | 'okey';

/** Motor adımı: başarılıysa yeni durum + olaylar; değilse hata (girdi durumu değişmez). */
export type Applied<S, E> =
  | {state: S; events: E[]; error?: undefined; code?: undefined}
  | {error: string; code?: string; state?: undefined; events?: undefined};

/** Motorun istediği zamanlı hamle (ör. Blöf penceresi: 5 sn sonra windowClosed). Ev sahibi sayar. */
export interface TimedAction<A> {
  /** Aynı anahtar sürdükçe zamanlayıcı yeniden kurulmaz; anahtar değişince eskisi iptal. */
  key: string;
  /** Tür (istemci halkası/sayacı için): 'window' | 'turn' | … */
  kind: string;
  ms: number;
  action: A;
}

export interface GameEngine<Cfg, State, Action, Event, View, Legal = Action[]> {
  readonly id: GameId;
  create(cfg: Cfg): {state: State; events: Event[]};
  apply(state: State, action: Action): Applied<State, Event>;
  viewFor(state: State, seat: number): View;
  /** Görünüme göre yapılabilecekler (Pişti: hamle listesi; Blöf: özet BlofLegal). */
  legal(view: View): Legal;
  /** Olayın bu koltuğa gidecek hâli; null → gönderilmez. seat −1: seyirci. */
  redact(event: Event, seat: number): Event | null;
  seats(state: State): number;
  isOver(state: State): boolean;
  /** Şu an hamlesi beklenen koltuklar (botlar buna göre uyanır). */
  actors(state: State): number[];
  /** Karar bağlamı sayacı: değişince bekleyen bot kararları ve süre aşımları iptal edilir. */
  epoch(state: State): number;
  /** Hamleyi yapan koltuk; −1 → yalnız yetkili taraf (ev sahibi/sunucu) gönderebilir. */
  actionSeat(action: Action): number;
  /** Şu an kurulması gereken zamanlı hamle (yoksa null). */
  timer(state: State): TimedAction<Action> | null;
  /** Süre aşımında bu koltuk yerine yapılacak hamle (yoksa null: bu evrede süre aşımı yok). */
  timeoutAction(state: State, seat: number): Action | null;
  /**
   * Henüz geçerli olmayan ama birazdan olacak bir hamle (ör. Blöf'te pencere açıkken sıradaki oyuncunun "at"ı)
   * ertelenebilir mi? null → hayır (hata döner). {now} → şimdi uygulanacak hamle (ör. 'decline') ya da null;
   * asıl hamle sıraya alınır ve geçerli olunca uygulanır, imkânsızlaşınca reddedilir.
   */
  defer?(state: State, action: Action): {now: Action | null} | null;
}

/** Botun kararı: hamle + insan gibi bekleme süresi + (isteğe bağlı) arayüz için ipucu. */
export interface BotDecision<A, T = unknown> {
  action: A;
  delayMs: number;
  tell?: T;
}

/** Ev sahibinde koşan bot beyni. Yalnız kendi koltuğuna süzülmüş olayları ve görünümü görür → sunucuda da aynen koşar. */
export interface BotBrain<A, E, V, T = unknown> {
  readonly seat: number;
  observe(event: E): void;
  /** Bu koltuk hamle sırasındayken çağrılır; null → şimdilik bir şey yapma. */
  decide(view: V): BotDecision<A, T> | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEngine = GameEngine<any, any, any, any, any, any>;
export type CfgOf<G> = G extends GameEngine<infer C, any, any, any, any, any> ? C : never;
export type StateOf<G> = G extends GameEngine<any, infer S, any, any, any, any> ? S : never;
export type ActionOf<G> = G extends GameEngine<any, any, infer A, any, any, any> ? A : never;
export type EventOf<G> = G extends GameEngine<any, any, any, infer E, any, any> ? E : never;
export type ViewOf<G> = G extends GameEngine<any, any, any, any, infer V, any> ? V : never;
export type LegalOf<G> = G extends GameEngine<any, any, any, any, any, infer L> ? L : never;
