// Açılış (logo + ilerleme + ipucu) ve karşılaşma girişi (sinematik "VS"): 1'e 1 (iki yarım), eşli (mavi takım – kırmızı takım),
// 4 kişi (dört eğik şerit sırayla çarparak gelir). Portreler roster'dan; insan oyuncu kendi karakteri ve çerçevesiyle.
import {matchTitle, type MatchSetup, type SeatPlayer} from '../game/types';
import {LENGTH_INFO, isLong} from '../game/series';
import {GAME_ICON} from './gameicons';
import {ANIM, EASE, Scope, countUp, esc, fmt, h, play, q} from './dom';
import {ASSETS} from './assets';
import {arenaHtml, gemHtml, hideUnder, wordmarkHtml, type Ctx} from './parts';
import {g3, paintFlash} from './fx';
import {suitSvg, type SuitKey} from './icons';
import {haptic} from '../platform/bridge';
import {ctx2d, radial} from '../platform/tex';
import {cssLinear, suitPath, suitTile} from './suittex';

const TIPS = [
  'Vale ortadaki tüm kartları alır.',
  'Ortada tek kart varken aynısını atarsan pişti: 10 puan.',
  'Vale üstüne vale atarsan vale pişti: 20 puan!',
  'Karo 10 tam 3 puan eder, gözünü dört aç.',
  'Sinek 2, 2 puan getirir.',
  'En çok kartı toplayan 3 puan kapar.',
  'Kartına bir kez dokun ya da yukarı kaydır: masaya gider.',
  'Rakibin hangi kartları attığını aklında tut.',
  'Valeyi erken harcama; büyük yığına sakla.',
];

export function splash(ctx: Ctx): {progress(p: number): void; done(ready?: Promise<unknown>): Promise<void>} {
  const scope = new Scope();
  const el = h('div', 'kh-screen kh-splash');
  el.innerHTML = `${arenaHtml()}<div class="kh-splash__glow"></div>${wordmarkHtml('kh-splash__logo')}
    <div class="kh-progress"><i class="kh-progress__fill"></i></div>
    <div class="kh-splash__tip"><p><b>İpucu:</b> <span></span></p></div>`;
  ctx.layer.append(el);
  const fill = q(el, '.kh-progress__fill');
  const tipEl = q(el, '.kh-splash__tip');
  const tipTxt = q(tipEl, 'span');
  let tip = Math.floor(Math.random() * TIPS.length);
  tipTxt.textContent = TIPS[tip];
  const logo = q(el, '.kh-splash__logo');
  play(q(el, '.kh-splash__glow'), [{transform: 'scale(.6)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 1200, easing: EASE.out, fill: 'backwards'});
  // Logo SVG yazısı Lilita One ister: soğuk açılışta yedek yazı tipiyle görünmesin diye yazı tipini bekler (en çok 0.8 sn).
  const showLogo = () => {
    if (!scope.alive) return;
    logo.style.opacity = '';
    play(logo, [{transform: 'scale(.6) rotate(-4deg)', opacity: 0}, {transform: 'scale(1.06) rotate(1deg)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 720, easing: EASE.out, fill: 'backwards'});
  };
  const fonts = (document as Document & {fonts?: FontFaceSet}).fonts;
  if (ANIM && fonts?.check && !fonts.check("40px 'Lilita One'", 'PİŞTİ')) {
    logo.style.opacity = '0';
    Promise.race([fonts.load("40px 'Lilita One'", 'PİŞTİ KAHVEHANE').catch(() => undefined), scope.wait(800)]).then(showLogo);
  } else showLogo();
  play(tipEl, [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 400, delay: 300, easing: EASE.out, fill: 'backwards'});
  const rotate = () => {
    scope.timeout(() => {
      const a = tipEl.animate([{opacity: 1}, {opacity: 0}], {duration: 220, fill: 'forwards'});
      a.onfinish = () => {
        tip = (tip + 1) % TIPS.length;
        tipTxt.textContent = TIPS[tip];
        a.cancel();
        play(tipEl, [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}], {duration: 260, easing: EASE.out});
      };
      rotate();
    }, 3200);
  };
  if (ANIM) rotate();
  // Yükleme çubuğu: gerçek hazırlık genelde çok kısa sürer; yine de en az ~3 sn "oyun açılıyor" hissi verilir.
  // Çubuk organik dolar (hızlı başlar, aşamalarda yavaşlar, sona doğru bekler); iş bitince tam dolar. Hepsi transform → bileşimci iş parçacığında.
  const MIN_MS = 2300; // + kapanış ≈ 0,8 sn → toplam ≈ 3 sn
  const t0 = performance.now();
  let cur = 0;
  const progress = (p: number) => {
    cur = Math.max(cur, Math.min(1, p));
    if (!ANIM) fill.style.transform = `scaleX(${cur.toFixed(3)})`;
  };
  if (ANIM) {
    fill.style.transform = 'scaleX(.03)';
    play(fill, [
      {transform: 'scaleX(.03)'},
      {transform: 'scaleX(.30)', offset: 0.14},
      {transform: 'scaleX(.47)', offset: 0.32},
      {transform: 'scaleX(.72)', offset: 0.6},
      {transform: 'scaleX(.85)', offset: 0.82},
      {transform: 'scaleX(.94)'},
    ], {duration: 2100, easing: 'ease-in-out', fill: 'forwards'});
  }
  return {
    progress,
    /** ready: gerçek hazırlık (deste, ses). En az MIN_MS geçmeden ve ready bitmeden (en çok 4,5 sn) ekran kalkmaz. */
    async done(ready?: Promise<unknown>) {
      progress(1);
      if (ANIM) {
        await Promise.all([
          scope.wait(Math.max(0, MIN_MS - (performance.now() - t0))),
          ready ? Promise.race([ready.catch(() => undefined), scope.wait(4500)]) : undefined,
        ]);
        await fill.animate([{transform: 'scaleX(.94)'}, {transform: 'scaleX(1)'}], {duration: 260, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'forwards'}).finished.catch(() => undefined);
        await scope.wait(240);
        await el.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(1.03)'}], {duration: 380, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      } else await scope.wait(120);
      scope.dispose();
      el.remove();
    },
  };
}

/** Oyuncu plakası (ad + alt yazı + seviye taşı). */
const plateHtml = (p: SeatPlayer, cls = ''): string =>
  `<div class="kh-vs__plate ${cls}">${gemHtml(p.level, p.human)}<div><div class="kh-vs__name">${esc(p.human ? p.name : p.char.name)}</div>
    <div class="kh-vs__sub">${p.human ? `${esc(p.char.name)}` : esc(p.char.title)}</div></div></div>`;

/** Büst: tuval (doku katmanı; görsel doğal boyutunda bir kez çizilir, alt solması işlenir). Bkz. paintBust. */
const bustHtml = (p: SeatPlayer, cls = ''): string =>
  `<canvas class="kh-vs__bust ${cls}" data-seat="${p.seat}" data-src="${p.char.poses[p.human ? 'gulumseme' : 'notr']}" width="${BUST_PX}" height="${BUST_PX}"></canvas>`;

/** Işın deseni (20 dilim) + merkezden sönme: küçük tuvale bir kez çizilir, GPU büyütür (dev maskeli katman yok). */
function paintRays(cv: HTMLCanvasElement): void {
  const g = cv.getContext('2d');
  if (!g) return;
  const S = cv.width, c = S / 2;
  g.fillStyle = 'rgba(255,255,255,.24)';
  for (let i = 0; i < 20; i++) {
    const a0 = (i * 18 * Math.PI) / 180;
    g.beginPath();
    g.moveTo(c, c);
    g.arc(c, c, S, a0, a0 + (6 * Math.PI) / 180);
    g.closePath();
    g.fill();
  }
  g.globalCompositeOperation = 'destination-in';
  const rad = g.createRadialGradient(c, c, 0, c, c, c);
  rad.addColorStop(0, 'rgba(0,0,0,1)');
  rad.addColorStop(0.36, 'rgba(0,0,0,.7)');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rad;
  g.fillRect(0, 0, S, S);
}

/** VS yıldızı: lacivert kontur + altın gövde + beyaz ince kenar (tek SVG; clip-path yok). */
const STAR = '50,0 59.3,15.2 75,6.7 75.5,24.5 93.3,25 84.8,40.7 100,50 84.8,59.3 93.3,75 75.5,75.5 75,93.3 59.3,84.8 50,100 40.7,84.8 25,93.3 24.5,75.5 6.7,75 15.2,59.3 0,50 15.2,40.7 6.7,25 24.5,24.5 25,6.7 40.7,15.2';
const STAR_SVG = `<svg class="kh-vs__star" viewBox="-8 -8 116 116" aria-hidden="true"><defs><linearGradient id="kh-vs-gold" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffe14a"/><stop offset=".7" stop-color="#ffb21a"/><stop offset="1" stop-color="#ff8a0a"/></linearGradient></defs>
  <g transform="rotate(7 50 50)"><polygon points="${STAR}" fill="#0a1033" stroke="#0a1033" stroke-width="8" stroke-linejoin="round" transform="translate(50 50) scale(1.03) translate(-50 -50)"/>
  <polygon points="${STAR}" fill="url(#kh-vs-gold)" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" transform="translate(50 50) scale(.92) translate(-50 -50)"/></g></svg>`;

/** Poz görsellerinin doğal boyutu (karakter görselleri 576²): tuval baştan bu boyutta → yerleşim görsel gelmeden doğru. */
const BUST_PX = 576;
/**
 * Büstler <canvas>: görsel ÇÖZÜLMÜŞ olarak (decode) bir kez tuvale çizilir, alt kenar solması (%78 → %99) aynı tuvale işlenir.
 * <img> + CSS maskesi yerine: maske her karede ayrı çizim geçişi; <img> ise ekran çözünürlüğünde karolara taranır (dpr 2,6'da
 * büst başına ≈ 4 MB, poz değişince yeniden tarama + Android'de büyük görselin "sonra çözülmesi" = bir an boş büst). Tuval
 * doğal boyutunda (576² ≈ 1,3 MB) bir doku: bileşimci büyütür, poz değişimi yalnız tuvale yeni çizim.
 */
const bustCache = new Map<string, Promise<HTMLImageElement | null>>();
const bustReady = new Map<string, HTMLImageElement>();
function bustImage(url: string): Promise<HTMLImageElement | null> {
  let p = bustCache.get(url);
  if (!p) {
    const im = new Image();
    im.decoding = 'async';
    im.src = url;
    p = im.decode().then(() => im, () => (im.complete && im.naturalWidth ? im : null)).then(r => {
      if (r) bustReady.set(url, r);
      else bustCache.delete(url); // sonra yeniden denenebilsin
      return r;
    });
    bustCache.set(url, p);
  }
  return p;
}
function paintBust(cv: HTMLCanvasElement, im: HTMLImageElement): void {
  const w = im.naturalWidth || BUST_PX, hh = im.naturalHeight || BUST_PX;
  if (cv.width !== w || cv.height !== hh) {
    cv.width = w;
    cv.height = hh;
  }
  const g = ctx2d(cv);
  if (!g) return;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, w, hh);
  g.imageSmoothingQuality = 'high';
  g.drawImage(im, 0, 0, w, hh);
  g.globalCompositeOperation = 'destination-in';
  const lin = g.createLinearGradient(0, 0, 0, hh);
  lin.addColorStop(0, '#000');
  lin.addColorStop(0.78, '#000');
  lin.addColorStop(0.99, 'rgba(0,0,0,0)');
  g.fillStyle = lin;
  g.fillRect(0, 0, w, hh);
  g.globalCompositeOperation = 'source-over';
}
/** Karşılaşma girişinin pozlarını boşta önceden çöz (giriş anında çözme işi binmesin). */
export function warmVersus(urls: readonly string[]): void {
  for (const u of urls) void bustImage(u);
}

/** Şok halkaları ve yarım ışıkları: küçük tuval dokuları (CSS radial-gradient(circle, …) ile aynı duraklar). */
const RING_A: ReadonlyArray<readonly [number, string]> = [[0.55, 'rgba(255,255,255,0)'], [0.61, 'rgba(255,255,255,.95)'], [0.66, 'rgba(255,236,150,.55)'], [0.71, 'rgba(255,220,90,0)']];
const RING_B: ReadonlyArray<readonly [number, string]> = [[0.56, 'rgba(255,210,60,0)'], [0.62, 'rgba(255,200,40,.85)'], [0.67, 'rgba(255,140,20,.35)'], [0.71, 'rgba(255,120,0,0)']];
const SIDE_GLOW: ReadonlyArray<readonly [number, string]> = [[0, 'rgba(255,255,255,.4)'], [0.4, 'rgba(255,255,255,.1)'], [0.68, 'rgba(255,255,255,0)']];
/** Parıltı şeridi (soldan sağa yatay gradyan): ince tuval, yükseklik boyunca gerilir. */
function paintGlint(cv: HTMLCanvasElement): void {
  const g = ctx2d(cv);
  if (!g) return;
  const w = cv.width;
  const lin = g.createLinearGradient(0, 0, w, 0);
  lin.addColorStop(0, 'rgba(255,255,255,0)');
  lin.addColorStop(0.42, 'rgba(255,255,255,.2)');
  lin.addColorStop(0.5, 'rgba(255,246,200,.34)');
  lin.addColorStop(0.58, 'rgba(255,255,255,.2)');
  lin.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lin;
  g.fillRect(0, 0, w, cv.height);
}

/**
 * VS yarımı / şeridi tuvale: CSS gradyanı (`bg`) + dağınık takım deseni (`tile` CSS px döşeme, `tileA` saydamlık); şeritte
 * ayrıca üstte lacivert kenar (`edge.px` CSS px, kutunun ÜSTÜNE taşan box-shadow'un yerine), beyaz ışık çizgisi + gölgesi ve büyük
 * soluk takım simgesi. Çözünürlük en çok 2× (yumuşak gradyan ve %9–14 saydam desen 2,6×'te farksız). Öğe = tuval, canlandırılan
 * da odur (eğim/kayma bileşimcide): katman taranmaz, karo belleği tutmaz.
 */
function paintStripe(cv: HTMLCanvasElement, bg: string, tile: number, tileA: number, edge?: {px: number; navy: string; seam: string}, glyph?: {k: SuitKey; left: boolean}): void {
  const w = cv.offsetWidth, hh = cv.offsetHeight;
  if (!w || !hh) return;
  const K = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.min(2048, Math.round(w * K)), H = Math.min(2048, Math.round(hh * K));
  cv.width = W;
  cv.height = H;
  const g = ctx2d(cv);
  if (!g) return;
  const sx = W / w, sy = H / hh;
  const top = edge ? edge.px : 0, bh = hh - top;
  if (edge) {
    g.fillStyle = edge.navy;
    g.fillRect(0, 0, W, Math.round(top * sy));
  }
  g.setTransform(sx, 0, 0, sy, 0, top * sy); // CSS px, şerit içeriğinin sol üstü
  g.fillStyle = cssLinear(g, bg, w, bh) ?? '#1f4fd6';
  g.fillRect(0, 0, w, bh);
  const t = suitTile(tile * sx);
  if (t) {
    // desen tuval pikselinde (döşeme tile·sx px), CSS'teki gibi kutunun sol üstünden
    g.setTransform(1, 0, 0, 1, 0, top * sy);
    const pat = g.createPattern(t, 'repeat');
    if (pat) {
      g.globalAlpha = tileA;
      g.fillStyle = pat;
      g.fillRect(0, 0, W, bh * sy);
      g.globalAlpha = 1;
    }
    g.setTransform(sx, 0, 0, sy, 0, top * sy);
  }
  const p = glyph ? suitPath(glyph.k) : null;
  if (glyph && p) {
    // .kh-vs__bsuit: genişliğin %30'u kare, üstten %18, soldan/sağdan %22; içindeki simge skewY(9°) (şeridin eğimini dengeler)
    const side = w * 0.3, x = glyph.left ? w * 0.22 : w - w * 0.22 - side, y = bh * 0.18;
    g.save();
    g.translate(x + side / 2, y + side / 2);
    g.transform(1, Math.tan((9 * Math.PI) / 180), 0, 1, 0, 0);
    g.translate(-side / 2, -side / 2);
    g.scale(side / 24, side / 24);
    g.globalAlpha = 0.14;
    g.fillStyle = '#fff';
    g.fill(p);
    g.restore();
  }
  if (edge) {
    // ::before: 5 px ışık çizgisi + altında 2 px gölge (box-shadow 0 2px 0: kutunun altında kalan kısım görünmez → yalnız 5..7)
    g.fillStyle = 'rgba(10,16,51,.45)';
    g.fillRect(0, 5, w, 2);
    g.fillStyle = cssLinear(g, edge.seam, w, 5) ?? '#fff';
    g.fillRect(0, 0, w, 5);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}

/** Hız çizgileri: [üstten %, genişlik %] — iki yöne sırayla. */
const STREAKS: [number, number][] = [[12, 58], [24, 44], [37, 66], [63, 60], [76, 46], [88, 64]];

/**
 * Karşılaşma girişi (~3,2 sn). 1'e 1: rakip üst yarıda (kırmızı), sen alt yarıda (mavi); eşli: takımlar yarımlarda yan yana;
 * 4 kişi: dört eğik şerit (♥ ♦ ♣ ♠), 3 kişi (Blöf): üç şerit (♥ ♦ ♠) sırayla iki yandan çarpar. Üstte oyun adı kurdelesi ("Blöf · 3 Kişi"). Ortada "VS" damgası: şok halkası, kıvılcımlar, parıltı, sarsıntı.
 * Bekleme anında karakterler hafifçe yaklaşır (Ken Burns), VS nabız atar, alt şeritte "Masa kuruluyor → Hazır!".
 * Sonunda perde ikiye ayrılır (yarımlar yukarı/aşağı ya da şeritler iki yana) ve masa açılır. 1,4 sn'den sonra dokunuş geçer.
 * Hepsi transform/opacity (bileşimci iş parçacığı); ışınlar küçük tuvalden büyütülür, yıldız tek SVG. Düşük cihazda
 * kıvılcım, ışın dönüşü ve kayma yok.
 */
export function versus(ctx: Ctx, setup: MatchSetup, stake: number): Promise<void> {
  const scope = new Scope();
  const mode = setup.mode;
  const by = (seat: number) => setup.players.find(p => p.seat === seat)!;
  const me = by(0);
  const low = document.documentElement.classList.contains('kh-low');
  const el = h('div', `kh-screen kh-vs is-${mode}`);
  const sk = 'skewY(-9deg)';
  let body = '';
  if (mode === '4' || mode === '3') {
    // yukarıdan aşağı: 4 kişide karşı (2), sol (3), sağ (1), sen (0); 3 kişide sol-üst (2), sağ-üst (1), sen (0)
    const order = mode === '4' ? [2, 3, 1, 0] : [2, 1, 0];
    const suits: SuitKey[] = mode === '4' ? ['h', 'd', 'c', 's'] : ['h', 'd', 's'];
    body = order.map((seat, k) => `<canvas class="kh-vs__band is-${suits[k]}" style="--k:${k}" data-s="${suits[k]}"></canvas>`).join('') +
      order.map((seat, k) => {
        const p = by(seat);
        // büst kendi şeridinin alt kenarında kesilir (alttaki şeridin arkasına girer), başı üstteki şeride taşabilir;
        // şerit sınırındaki beyaz çizgi şeridin kendisinde (::before) → çizgi tam sınırda ve hep büstlerin arkasında
        const last = k === order.length - 1;
        return `<div class="kh-vs__slot is-k${k} ${k % 2 ? 'is-l' : 'is-r'}${p.human ? ' is-me' : ''}" style="--k:${k}"><div class="kh-vs__clip${last ? '' : ' is-cut'}">${bustHtml(p)}</div>${plateHtml(p)}</div>`;
      }).join('');
  } else {
    const top = mode === '1v1' ? [by(1)] : [by(1), by(3)];
    const bot = mode === '1v1' ? [me] : [me, by(2)];
    const side = (list: SeatPlayer[], cls: string, team: string) => `<div class="kh-vs__side ${cls}${list.length > 1 ? ' is-duo' : ''}"><canvas class="kh-vs__glow" width="128" height="128"></canvas>
        ${list.map((p, i) => `<div class="kh-vs__who" style="--i:${i}">${bustHtml(p)}${list.length > 1 ? plateHtml(p, 'is-sm') : ''}</div>`).join('')}
        ${list.length > 1 ? `<div class="kh-vs__team">${team}</div>` : plateHtml(list[0])}
      </div>`;
    body = `<canvas class="kh-vs__half is-t"></canvas><canvas class="kh-vs__half is-b"></canvas><div class="kh-vs__seam"></div>
      ${side(top, 'is-opp', 'Kırmızı Takım')}${side(bot, 'is-me', 'Mavi Takım')}`;
  }
  const sparkN = low ? 0 : 12;
  el.innerHTML = `<canvas class="kh-vs__rays" width="512" height="512"></canvas>${body}
    <div class="kh-vs__streaks">${STREAKS.map(([y, w]) => `<i style="top:${y}%;width:${w}%"></i>`).join('')}</div>
    <div class="kh-vs__mode">${GAME_ICON[setup.game]}<span>${esc(matchTitle(setup.game, mode))}${isLong(setup.len) ? ` · ${esc(LENGTH_INFO[setup.len!].label)}${setup.game === 'blof' ? '' : "'lik"}` : ''}</span></div>
    <canvas class="kh-vs__glint" width="64" height="2"></canvas>
    <canvas class="kh-vs__ring is-a" width="384" height="384"></canvas><canvas class="kh-vs__ring is-b" width="384" height="384"></canvas>
    <div class="kh-vs__emblem">${STAR_SVG}<div class="kh-title">${g3('VS', 'is-white')}</div></div>
    <div class="kh-vs__sparks">${'<i></i>'.repeat(sparkN)}</div>
    <div class="kh-vs__stake"><span>Masa</span><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(stake)}</b></div>
    <div class="kh-vs__load"><span class="kh-vs__suits">${(['h', 'd', 'c', 's'] as SuitKey[]).map(k => `<i class="is-${k}">${suitSvg(k)}</i>`).join('')}</span>
      <span class="kh-vs__lt"><b class="is-a">Masa kuruluyor</b><b class="is-b">Hazır!</b></span><i class="kh-vs__bar"><b></b></i></div>
    <canvas class="kh-vs__flash"></canvas>`;
  ctx.layer.append(el);
  paintRays(q(el, '.kh-vs__rays') as HTMLCanvasElement);
  const cvs = (s: string) => Array.from(el.querySelectorAll<HTMLCanvasElement>(s));
  cvs('.kh-vs__ring.is-a').forEach(c => radial(c, RING_A, false, true));
  cvs('.kh-vs__ring.is-b').forEach(c => radial(c, RING_B, false, true));
  cvs('.kh-vs__glow').forEach(c => radial(c, SIDE_GLOW, false, true));
  cvs('.kh-vs__glint').forEach(paintGlint);
  cvs('.kh-vs__flash').forEach(paintFlash);
  {
    // yarımlar / şeritler: CSS değişkenlerindeki gradyanlar, desen boyu --u'dan (ölçü için tek bir yerleşim okuması)
    const cs = getComputedStyle(el);
    const probe = h('i');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:calc(var(--u) * 100);height:0';
    el.append(probe);
    const u = probe.offsetWidth / 100 || 16;
    probe.remove();
    const v = (n: string, def: string) => cs.getPropertyValue(n).trim() || def;
    cvs('.kh-vs__half').forEach(c => paintStripe(c, v(c.classList.contains('is-t') ? '--vs-top' : '--vs-bottom', ''), u * 13, 0.09));
    const edge = {px: 4, navy: v('--navy', '#0a1033'), seam: v('--vs-seam', '')};
    cvs('.kh-vs__band').forEach((c, k) => paintStripe(c, getComputedStyle(c).getPropertyValue('--bg').trim(), u * 11, 0.1, edge, {k: (c.dataset.s ?? 'h') as SuitKey, left: k % 2 === 0}));
  }
  // VS ilk karesinden itibaren opak: altta kalan (çıkmakta olan) ana ekran artık çizilmesin (karo belleği + dönen ışınlar)
  const unhide = {fn: (): void => undefined};
  requestAnimationFrame(() => {
    if (scope.alive) unhide.fn = hideUnder(el);
  });
  const g = (s: string) => q(el, s);
  const all = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
  const s = ctx.sounds;
  const slam = () => (s.slam ? s.slam() : s.tap());
  const four = mode === '4' || mode === '3'; // şeritli giriş (4 ya da 3 şerit)
  // zaman çizelgesi (ms)
  const tSlam = four ? 640 : 460;
  const tLoad = tSlam + 520; // alt şerit görünür
  const tEnd = four ? 3100 : 2800; // perde açılır
  const tReady = tEnd - 480; // "Hazır!"
  const t0 = performance.now();

  if (ANIM) {
    s.whoosh();
    scope.timeout(() => s.whoosh(), 150);
    if (four) scope.timeout(() => s.whoosh(), 330);
    scope.timeout(() => {
      slam();
      haptic('medium');
    }, tSlam + 10);
    scope.timeout(() => s.coin(1), tSlam + 220);
    scope.timeout(() => {
      s.tap();
      haptic('light');
    }, tReady + 40);
  }

  // ---- giriş ----
  if (four) {
    all('.kh-vs__band').forEach((b, k) => {
      const from = k % 2 ? -120 : 120;
      play(b, [{transform: `translateX(${from}%) ${sk}`}, {transform: `translateX(${-from * 0.04}%) ${sk}`, offset: 0.75}, {transform: `translateX(0) ${sk}`}], {duration: 360, delay: k * 110, easing: EASE.out, fill: 'backwards'});
    });
    all('.kh-vs__slot').forEach((sl, k) => {
      const from = k % 2 ? -70 : 70;
      play(sl, [{transform: `translateX(${from}%)`, opacity: 0}, {transform: `translateX(${-from * 0.05}%)`, opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 420, delay: 80 + k * 110, easing: EASE.out, fill: 'backwards'});
    });
  } else {
    play(g('.kh-vs__half.is-t'), [{transform: `translateY(-115%) ${sk}`}, {transform: `translateY(0) ${sk}`}], {duration: 320, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-vs__half.is-b'), [{transform: `translateY(115%) ${sk}`}, {transform: `translateY(0) ${sk}`}], {duration: 320, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-vs__seam'), [{opacity: 0, transform: `${sk} scaleX(0)`}, {opacity: 1, transform: `${sk} scaleX(1)`}], {duration: 260, delay: 260, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-vs__side.is-opp'), [{transform: 'translateY(-60%)', opacity: 0}, {transform: 'translateY(3%)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 440, delay: 110, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-vs__side.is-me'), [{transform: 'translateY(60%)', opacity: 0}, {transform: 'translateY(-3%)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 440, delay: 160, easing: EASE.out, fill: 'backwards'});
    // eşlide ikinci büst biraz geriden gelir
    all('.kh-vs__side.is-duo .kh-vs__who').forEach(w => {
      const i = Number(w.style.getPropertyValue('--i'));
      play(w, [{transform: `translateX(${i ? 40 : -40}%) scale(.85)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 200 + i * 120, easing: EASE.spring, fill: 'backwards'});
    });
  }
  // hız çizgileri: yarımlar/şeritler gelirken ekranı yalayan ince ışıklar
  all('.kh-vs__streaks i').forEach((n, i) => {
    const ltr = i % 2 === 1;
    const a = ltr ? '-130%' : '112vw', b = ltr ? '112vw' : '-130%';
    play(n, [{transform: `translate3d(${a},0,0) skewX(-32deg)`, opacity: 0}, {opacity: 0.85, offset: 0.2}, {opacity: 0.85, offset: 0.7}, {transform: `translate3d(${b},0,0) skewX(-32deg)`, opacity: 0}],
      {duration: 380 + (i % 3) * 60, delay: 20 + i * 50, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards'});
  });

  // ---- VS darbesi ----
  play(g('.kh-vs__emblem'), [{transform: 'scale(2.6) rotate(-24deg)', opacity: 0}, {transform: 'scale(.92) rotate(3deg)', opacity: 1, offset: 0.62}, {transform: 'scale(1) rotate(0)', opacity: 1}], {duration: 320, delay: tSlam, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'backwards'});
  // ardından kalp atışı gibi nabız
  play(g('.kh-vs__emblem'), [{transform: 'scale(1)'}, {transform: 'scale(1.07)', offset: 0.45}, {transform: 'scale(1)'}], {duration: 780, delay: tSlam + 360, iterations: 3, easing: 'ease-in-out'});
  play(g('.kh-vs__flash'), [{opacity: 0}, {opacity: 0.65, offset: 0.15}, {opacity: 0}], {duration: 360, delay: tSlam + 180, easing: 'ease-out', fill: 'backwards'}, 0);
  all('.kh-vs__ring').forEach((r, i) =>
    play(r, [{transform: 'scale(.35)', opacity: 0.95}, {transform: 'scale(3.4)', opacity: 0}], {duration: 680 + i * 140, delay: tSlam + 30 + i * 130, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards'}));
  all('.kh-vs__sparks i').forEach((n, i, arr) => {
    const a = (i / arr.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const d = 22 + Math.random() * 16; // vmin
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.9;
    play(n, [
      {transform: 'translate3d(0,0,0) scale(.3) rotate(0deg)', opacity: 1},
      {transform: `translate3d(${(dx * 0.7).toFixed(1)}vmin,${(dy * 0.7).toFixed(1)}vmin,0) scale(1.1) rotate(90deg)`, opacity: 1, offset: 0.5},
      {transform: `translate3d(${dx.toFixed(1)}vmin,${dy.toFixed(1)}vmin,0) scale(.2) rotate(180deg)`, opacity: 0},
    ], {duration: 560 + Math.random() * 260, delay: tSlam + 20, easing: 'cubic-bezier(.15,.75,.35,1)', fill: 'forwards'});
  });
  play(g('.kh-vs__glint'), [{transform: 'translate3d(0,0,0) skewX(-18deg)', opacity: 0}, {opacity: 1, offset: 0.2}, {opacity: 1, offset: 0.8}, {transform: 'translate3d(560%,0,0) skewX(-18deg)', opacity: 0}],
    {duration: 760, delay: tSlam + 60, easing: 'ease-in-out', fill: 'forwards'});
  // ekran sarsıntısı (sönümlü)
  const shake: Keyframe[] = [];
  for (let i = 0; i <= 7; i++) {
    const f = 1 - i / 7;
    shake.push({transform: i === 7 ? 'none' : `translate3d(${(Math.sin(i * 2.3) * 6 * f).toFixed(1)}px,${(Math.cos(i * 1.7) * 5 * f).toFixed(1)}px,0)`});
  }
  play(el, shake, {duration: 340, delay: tSlam + 180, easing: 'linear'}, 1);
  // ışınlar: darbeyle açılır, bekleme boyunca yavaşça döner
  play(g('.kh-vs__rays'), [{transform: 'rotate(-10deg) scale(.6)', opacity: 0}, {transform: 'rotate(4deg) scale(1)', opacity: 1, offset: 0.12}, {transform: `rotate(${low ? 4 : 40}deg) scale(1.05)`, opacity: 1}],
    {duration: tEnd - tSlam + 600, delay: tSlam - 80, easing: 'linear', fill: 'both'});
  // adlar darbede "gümler", seviye taşları zıplar
  all('.kh-vs__name').forEach((n, i) => play(n, [{transform: 'scale(1.3)'}, {transform: 'scale(.94)', offset: 0.5}, {transform: 'scale(1)'}], {duration: 360, delay: tSlam + 60 + i * 60, easing: EASE.out, fill: 'backwards'}));
  all('.kh-vs__plate .kh-gem').forEach((n, i) => play(n, [{transform: 'scale(.4) rotate(-30deg)'}, {transform: 'scale(1.18) rotate(6deg)', offset: 0.6}, {transform: 'none'}], {duration: 420, delay: tSlam + 120 + i * 70, easing: EASE.out, fill: 'backwards'}));
  // masa bahsi: kayarak gelir, jeton döner, sayı sayar
  play(g('.kh-vs__stake'), [{transform: 'translateX(30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: tSlam + 300, easing: EASE.spring, fill: 'backwards'});
  play(g('.kh-vs__stake img'), [{transform: 'scaleX(1)'}, {transform: 'scaleX(.12)', offset: 0.25}, {transform: 'scaleX(1)', offset: 0.5}, {transform: 'scaleX(.12)', offset: 0.75}, {transform: 'scaleX(1)'}],
    {duration: 900, delay: tSlam + 420, easing: 'ease-in-out', fill: 'backwards'});
  if (ANIM) {
    const num = g('.kh-vs__stake b');
    num.textContent = fmt(0);
    scope.timeout(() => void countUp(scope, num, 0, stake, 520), tSlam + 340);
  }
  play(g('.kh-vs__mode'), [{transform: 'translateY(-20px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: tSlam + 120, easing: EASE.spring, fill: 'backwards'});

  // ---- bekleme: karakterler hafifçe yaklaşır (Ken Burns), alt şerit masayı kurar ----
  if (!low) {
    all('.kh-vs__bust').forEach((b, i) => {
      const slot = !!b.closest('.kh-vs__slot');
      const base = slot ? '' : 'translateX(-50%) ';
      const dir = slot ? (i % 2 ? 1 : -1) : b.closest('.kh-vs__side.is-opp') ? -1 : 1;
      play(b, [{transform: `${base}translate3d(0,0,0) scale(1)`}, {transform: `${base}translate3d(${(dir * 0.9).toFixed(1)}%,${(dir * -1.2).toFixed(1)}%,0) scale(1.045)`}],
        {duration: tEnd + 460, delay: 220, easing: 'ease-in-out', fill: 'both'});
    });
  }
  // eşlide alt şerit "Mavi Takım" kurdelesinin yerini alır
  if (mode === 'esli') play(g('.kh-vs__side.is-me .kh-vs__team'), [{opacity: 1}, {opacity: 0}], {duration: 200, delay: tLoad - 160, easing: 'ease-in', fill: 'forwards'});
  play(g('.kh-vs__load'), [{transform: 'translateY(140%)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: tLoad, easing: EASE.spring, fill: 'backwards'});
  all('.kh-vs__suits i').forEach((n, i) =>
    play(n, [{transform: 'translateY(0) scale(1)'}, {transform: 'translateY(-38%) scale(1.22)', offset: 0.5}, {transform: 'translateY(0) scale(1)'}], {duration: 620, delay: tLoad + 260 + i * 110, iterations: 3, easing: 'ease-in-out'}, 0.1));
  play(g('.kh-vs__bar b'), [{transform: 'scaleX(0)'}, {transform: 'scaleX(1)'}], {duration: tReady - tLoad - 100, delay: tLoad + 100, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'both'}, 0.62);
  play(g('.kh-vs__lt .is-a'), [{opacity: 1}, {opacity: 0}], {duration: 140, delay: tReady, fill: 'forwards'}, 0);
  play(g('.kh-vs__lt .is-b'), [{opacity: 0, transform: 'scale(.6)'}, {opacity: 1, transform: 'scale(1.12)', offset: 0.6}, {opacity: 1, transform: 'scale(1)'}], {duration: 280, delay: tReady + 60, easing: EASE.out, fill: 'both'}, 0);

  // büstler: çözülen poz tuvale çizilir (solma işli); damga anında rakipler oyun yüzüne geçer, takım arkadaşı sana gülümser
  const busts = cvs('.kh-vs__bust');
  const show = (cv: HTMLCanvasElement, url: string): void => {
    cv.dataset.want = url;
    const ready = bustReady.get(url);
    if (ready) return paintBust(cv, ready);
    void bustImage(url).then(im => {
      if (im && scope.alive && cv.dataset.want === url) paintBust(cv, im);
    });
  };
  busts.forEach(cv => show(cv, cv.dataset.src ?? ''));
  if (ANIM) {
    const swaps: Array<[HTMLCanvasElement, string]> = [];
    for (const cv of busts) {
      const p = by(Number(cv.dataset.seat));
      if (!p || p.human) continue;
      const u = p.char.poses[p.team === me.team ? 'kahkaha' : 'kizgin'];
      void bustImage(u);
      swaps.push([cv, u]);
    }
    scope.timeout(() => swaps.forEach(([cv, u]) => show(cv, u)), tSlam + 40);
  }

  return new Promise(res => {
    let ended = false;
    const end = async (): Promise<void> => {
      if (ended) return;
      ended = true;
      if (!ANIM) {
        unhide.fn();
        scope.dispose();
        el.remove();
        res();
        return;
      }
      // perde açılışı: yarımlar/şeritler geldikleri yöne çekilir, arkadan masa görünür
      s.whoosh();
      el.style.pointerEvents = 'none';
      el.style.background = 'transparent';
      const anims: Animation[] = [];
      const go = (n: Element | null, kf: Keyframe[], ms = 440, delay = 0, easing: string = EASE.in) => {
        if (n) anims.push(n.animate(kf, {duration: ms, delay, easing, fill: 'forwards'}));
      };
      const fade = (n: Element | null, ms = 200) => go(n, [{opacity: 1}, {opacity: 0}], ms, 0, 'ease-out');
      if (four) {
        all('.kh-vs__band').forEach((b, k) => go(b, [{transform: `translateX(0) ${sk}`}, {transform: `translateX(${k % 2 ? -125 : 125}%) ${sk}`}], 420, (3 - k) * 50));
        all('.kh-vs__slot').forEach((sl, k) => go(sl, [{transform: 'none'}, {transform: `translateX(${k % 2 ? -130 : 130}%)`}], 420, (3 - k) * 50));
      } else {
        go(g('.kh-vs__half.is-t'), [{transform: `translateY(0) ${sk}`}, {transform: `translateY(-125%) ${sk}`}]);
        go(g('.kh-vs__half.is-b'), [{transform: `translateY(0) ${sk}`}, {transform: `translateY(125%) ${sk}`}]);
        go(g('.kh-vs__side.is-opp'), [{transform: 'none'}, {transform: 'translateY(-105%)'}]);
        go(g('.kh-vs__side.is-me'), [{transform: 'none'}, {transform: 'translateY(105%)'}]);
        fade(g('.kh-vs__seam'), 160);
      }
      go(g('.kh-vs__emblem'), [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(1.8) rotate(16deg)', opacity: 0}], 260, 0, 'ease-in');
      fade(g('.kh-vs__rays'), 220);
      fade(g('.kh-vs__stake'), 180);
      fade(g('.kh-vs__mode'), 180);
      go(g('.kh-vs__load'), [{transform: 'none', opacity: 1}, {transform: 'translateY(60%)', opacity: 0}], 200, 0, 'ease-in');
      await Promise.all(anims.map(a => a.finished.catch(() => undefined)));
      unhide.fn();
      scope.dispose();
      el.remove();
      res();
    };
    // 1,4 sn'den sonra dokunuş beklemeyi kısaltır
    if (ANIM) scope.on(el, 'pointerdown', () => void (performance.now() - t0 > 1400 && end()));
    // Dondurulmuş modda (ekran görüntüsü) daha uzun kalır
    window.setTimeout(() => void end(), ANIM ? tEnd : 4000);
  });
}
