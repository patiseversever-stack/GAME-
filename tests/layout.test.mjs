import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, regionsOf } from '../src/ui/layout.js';

const portraitSizes = [[320, 568], [360, 640], [375, 667], [390, 844], [393, 852], [412, 915], [430, 932], [768, 1024], [820, 1180]];
// Yatay: gerçek cihaz boyutları (CSS px). Üçüncü öğe: { l, r } çentik/kesim güvenli alanı (varsa).
const landscapeSizes = [
  [568, 320], [640, 360], [667, 375], [740, 360], [780, 360], [812, 375, { l: 44, r: 44 }], [844, 390, { l: 47, r: 47 }], [852, 393, { l: 59, r: 59 }],
  [896, 414, { l: 44, r: 44 }], [915, 412, { l: 0, r: 0 }], [932, 430, { l: 59, r: 59 }], [1024, 768], [1180, 820], [1280, 800], [1366, 1024], [1440, 900], [1920, 1080],
];
// Tarayıcı çubuklarıyla kısalmış görünür alanlar (oynanabilir kalmalı)
const shortLandscape = [[667, 325], [844, 340], [740, 320], [812, 343]];
const safeFor = (w, h, extra) => {
  const none = { t: 0, r: 0, b: 0, l: 0 };
  if (w > h) {
    const s = extra ? [{ t: 0, r: extra.r, b: 21, l: extra.l }] : [];
    return [none, ...s, { t: 0, r: 47, b: 21, l: 47 }].filter((x, i, a) => a.findIndex((y) => JSON.stringify(y) === JSON.stringify(x)) === i);
  }
  if (h < 700) return [none, { t: 24, r: 0, b: 0, l: 0 }]; // eski/kısa cihazlar: durum çubuğu
  return [none, { t: 47, r: 0, b: 34, l: 0 }]; // çentikli uzun telefonlar
};

function overlap(a, b, tol = 0.5) {
  return a.x < b.x + b.w - tol && b.x < a.x + a.w - tol && a.y < b.y + b.h - tol && b.y < a.y + a.h - tol;
}
const inside = (r, w, h, safe, name) => {
  assert.ok(r.x >= safe.l - 0.5 && r.x + r.w <= w - safe.r + 0.5, `${name} yatayda taşıyor: ${JSON.stringify(r)} (w=${w}, safe=${safe.l}/${safe.r})`);
  assert.ok(r.y >= safe.t - 0.5 && r.y + r.h <= h - safe.b + 0.5 + (name === 'rack' ? Math.round(safe.b * 0.6) : 0), `${name} dikeyde taşıyor: ${JSON.stringify(r)} (h=${h}, safe.b=${safe.b})`);
};

function checkCommon(L, w, h, safe, mode, tag, { strictInside = true } = {}) {
  const reg = regionsOf(L);
  if (strictInside) for (const [name, r] of Object.entries(reg)) inside(r, w, h, safe, name);
  // ikili çakışma yok
  const names = Object.keys(reg);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      // yatay: isim plakası ıstakanın ön yüzüne asılı olduğundan (rackN ↔ seatN) çakışma tasarım gereği
      const pair = [names[i], names[j]].sort().join('|');
      if (/^rack(\d)\|seat\1$/.test(pair)) continue;
      assert.ok(!overlap(reg[names[i]], reg[names[j]]), `${names[i]} ↔ ${names[j]} çakışıyor ${tag}: ${JSON.stringify(reg[names[i]])} ${JSON.stringify(reg[names[j]])}`);
    }
  }
  // per alanı pozitif ve diğerlerine binmiyor
  assert.ok(L.meldArea.w > 40 && L.meldArea.h >= 20, `meld alanı çok küçük: ${JSON.stringify(L.meldArea)} ${tag}`);
  // klasik modda per alanı yalnızca merkez referansı (deste kümesi içinde olabilir); 101'de hiçbir şeyle çakışmaz
  if (mode === 'okey101' || L.profile === 'portrait') for (const n of names) assert.ok(!overlap(L.meldArea, reg[n]), `meldArea ↔ ${n} çakışıyor ${tag}`);
  // gösterge/okey taşları plakanın içinde
  for (const k of ['indicator', 'okeyMini']) {
    const t = L.fromCenter(L[k]);
    assert.ok(t.x >= L.plate.x - 0.5 && t.x + t.w <= L.plate.x + L.plate.w + 0.5 && t.y >= L.plate.y - 0.5 && t.y + t.h <= L.plate.y + L.plate.h + 0.5, `${k} plaka dışında ${tag}`);
  }
  // atma bölgesi ekran içinde ve çöplüğü kapsıyor
  const p0 = L.fromCenter(L.piles[0]);
  assert.ok(L.drop.x <= p0.x && L.drop.y <= p0.y && L.drop.x + L.drop.w >= p0.x + p0.w && L.drop.y + L.drop.h >= p0.y + p0.h, `atma bölgesi çöplüğü kapsamıyor ${tag}`);
  assert.ok(L.drop.x >= 0 && L.drop.y >= 0 && L.drop.x + L.drop.w <= w && L.drop.y + L.drop.h <= h, `atma bölgesi ekran dışı ${tag}`);
  // ıstaka yeterli slot ve okunaklı taş
  assert.ok(L.rack.slots >= (mode === 'okey' ? 15 + 2 : 22 + 3), `slot yetersiz ${L.rack.slots} ${tag}`);
  assert.ok(L.rack.tw >= (w < 360 || h < 360 ? 20 : 24), `taş çok küçük tw=${L.rack.tw} ${tag}`);
  assert.ok(L.rack.th === Math.round(L.rack.tw * 1.36));
  // her çöplüğün ölçeği var ve sonlu
  for (const p of L.piles) assert.ok(Number.isFinite(p.sc) && p.sc > 0.3 && p.sc <= 1.2, `çöplük ölçeği ${p.sc} ${tag}`);
  for (const v of Object.values(L.scale)) assert.ok(Number.isFinite(v) && v > 0);
}

for (const mode of ['okey', 'okey101']) {
  for (const [w, h] of portraitSizes) {
    for (const safe of safeFor(w, h)) {
      test(`dikey yerleşim ${mode} ${w}×${h} safe=${safe.t}/${safe.b}`, () => {
        const L = computeLayout({ w, h, safe, rem: 16, mode });
        assert.equal(L.profile, 'portrait');
        checkCommon(L, w, h, safe, mode, `@${w}×${h} ${mode}`);
      });
    }
  }
  for (const [w, h, extra] of landscapeSizes) {
    for (const safe of safeFor(w, h, extra)) {
      test(`yatay yerleşim ${mode} ${w}×${h} safe=${safe.l}/${safe.r}/${safe.b}`, () => {
        const L = computeLayout({ w, h, safe, rem: 16, mode });
        assert.equal(L.profile, 'landscape');
        checkCommon(L, w, h, safe, mode, `@${w}×${h} ${mode} safe=${safe.l}/${safe.r}`);
      });
    }
  }
}

// ───── Yatay telefon: sıkı ölçüt (kusursuz yerleşim şartları) ─────
const phoneLandscape = landscapeSizes.filter(([w, h]) => h <= 440);
for (const mode of ['okey', 'okey101']) {
  for (const [w, h, extra] of phoneLandscape) {
    // yalnızca gerçekçi güvenli alan: yok ya da cihaza özgü çentik (genel 47px her boyutta gerçekçi değil)
    const realistic = [{ t: 0, r: 0, b: 0, l: 0 }, ...(extra ? [{ t: 0, r: extra.r, b: 21, l: extra.l }] : [])];
    for (const safe of realistic) {
      test(`yatay telefon ölçütleri ${mode} ${w}×${h} safe=${safe.l}`, () => {
        const L = computeLayout({ w, h, safe, rem: 16, mode });
        const tag = `@${w}×${h} ${mode}`;
        // taş boyutu: yüksekliğin ~%9'u — ıstaka ekranın ~%35'inde kalır, masa ferah (klasik ve 101 aynı)
        const minTw = Math.floor(h * 0.088);
        assert.ok(L.rack.tw >= minTw, `ıstaka taşı küçük: ${L.rack.tw} < ${minTw} ${tag}`);
        assert.equal(L.rack.rows, 2, `yatay telefonda ıstaka 2 satır olmalı ${tag}`);
        // dokunma hedefleri
        assert.ok(L.action.h >= 30, `eylem şeridi alçak ${L.action.h} ${tag}`);
        assert.ok(L.hud.h >= 30, `HUD alçak ${tag}`);
        for (const s of [0, 3]) assert.ok(L.piles[s].w >= 32 && L.piles[s].h >= 40, `etkileşimli çöplük küçük ${JSON.stringify(L.piles[s])} ${tag}`);
        assert.ok(L.stock.w >= 28, `deste dar ${tag}`);
        // koltuk panelleri: içerik sığacak kadar
        for (const s of [1, 3]) {
          assert.ok(L.seats[s].panel.w >= 54 && L.seats[s].panel.h >= 48, `yan plaka küçük ${JSON.stringify(L.seats[s].panel)} ${tag}`);
          assert.ok(L.seats[s].rack.h >= 70 && L.seats[s].rack.w >= 24, `yan ıstaka küçük ${JSON.stringify(L.seats[s].rack)} ${tag}`);
        }
        assert.ok(L.seats[2].panel.h >= 26 && L.seats[2].panel.w >= 90, `üst plaka küçük ${tag}`);
        assert.ok(L.seats[2].rack.w >= 118 && L.seats[2].rack.h >= 28, `üst ıstaka küçük ${tag}`);
        // per alanı kullanılabilir büyüklükte
        if (mode === 'okey101') assert.ok(L.meldArea.w >= Math.min(w * 0.3, 260) && L.meldArea.h >= (w < 700 ? 20 : w < 900 ? 36 : 44), `per alanı küçük ${JSON.stringify(L.meldArea)} ${tag}`);
        // ıstaka, eylem şeridinin altında ve HUD'un altında; masa bandı pozitif
        assert.ok(L.rack.rect.y >= L.action.y + L.action.h, `ıstaka şeridin altında değil ${tag}`);
        assert.ok(L.action.y > L.hud.y + L.hud.h, `şerit HUD altında değil ${tag}`);
        // ıstaka yatayda ortalı (güvenli alan simetrisine göre)
        const mid = (safe.l + (w - safe.r)) / 2;
        assert.ok(Math.abs(L.rack.rect.x + L.rack.rect.w / 2 - mid) <= 1.5, `ıstaka ortalı değil ${tag}`);
      });
    }
  }
}

// Kısa görünür alan (tarayıcı çubukları): çakışma yok, oynanabilir
for (const mode of ['okey', 'okey101']) {
  for (const [w, h] of shortLandscape) {
    test(`kısa yatay alan ${mode} ${w}×${h}`, () => {
      const safe = { t: 0, r: 0, b: 0, l: 0 };
      const L = computeLayout({ w, h, safe, rem: 16, mode });
      checkCommon(L, w, h, safe, mode, `@${w}×${h} ${mode}`);
      assert.ok(L.rack.tw >= 26, `taş çok küçük ${L.rack.tw}`);
    });
  }
}

test('ıstaka ızgarası: slotAt ve slotRect tutarlı (dikey ve yatay)', () => {
  for (const [w, h, safe] of [[390, 844, { t: 47, r: 0, b: 34, l: 0 }], [844, 390, { t: 0, r: 47, b: 21, l: 47 }]]) {
    const L = computeLayout({ w, h, safe, mode: 'okey101' });
    for (let i = 0; i < L.rack.slots; i++) {
      const c = L.rack.slotCenter(i);
      assert.equal(L.rack.slotAt(c.x, c.y), i);
    }
  }
});

test('metin ölçekleme: kök yazı %150 iken yerleşim bozulmaz', () => {
  for (const [w, h] of [[360, 640], [390, 844], [844, 390], [667, 375], [568, 320]]) {
    for (const mode of ['okey', 'okey101']) {
      const safe = { t: 0, r: 0, b: 0, l: 0 };
      const L = computeLayout({ w, h, safe, rem: 24, mode });
      assert.ok(L.rack.rect.y > L.hud.y + L.hud.h, 'ıstaka HUD altında');
      assert.ok(L.table.h > 60 || w > h, `masa alanı kaldı mı ${L.table.h} @${w}x${h}`);
      if (!(w < 640 && mode === 'okey101')) checkCommon(L, w, h, safe, mode, `@${w}×${h} ${mode} rem=24`);
    }
  }
});

test('yatay: atma bölgesi ıstakanın üstünde olduğundan parmak ofsetiyle erişilir', () => {
  for (const [w, h] of [[568, 320], [667, 375], [844, 390], [932, 430]]) {
    const L = computeLayout({ w, h, safe: { t: 0, r: 0, b: 21, l: 0 }, mode: 'okey' });
    const offset = L.rack.th * 0.62 + 10; // dokunmatik sürüklemede taş parmağın bu kadar üstünde
    const p0 = L.piles[0];
    // taşın merkezi çöplük merkezinde iken parmağın ekran içinde kalması gerekir
    assert.ok(p0.cy + offset <= h - 4, `parmak ekran dışına çıkıyor @${w}×${h}: ${p0.cy + offset} > ${h}`);
  }
});
