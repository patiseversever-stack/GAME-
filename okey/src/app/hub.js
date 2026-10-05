// Profil merkezi: Profil / Görevler / Başarımlar / İstatistik / Kurallar tek tam ekran panelde (yaşayan
// gradyan zemin, süzülen taşlar, bento kartlar, hareketli halkalar ve sayaçlar, kayan sekme seçici).
// Veriyi ana menü verir (setHubData); oyun içinde yalnız Kurallar açılır.
import { icon } from '../ui/icons.js';
import { FRAMES, EFFECTS, TILESETS, TITLES, nextReward, KIND_NAME } from '../meta/progression.js';
import { levelFromXp, xpForNext } from '../meta/profile.js';
import { rewardArt, hydrateArt } from './reward-art.js';
import { framedAvatar } from '../ui/frame-ui.js';
import { Celebration } from '../ui/effects.js';
import { openBazaar } from './bazaar.js';
import { openOnboarding } from './onboard.js';

let hubData = null;
// d: { e: profile, h: progress, u: günlük görevler, p: oyuncu adı, Ra: başarım listesi, av: avatar svg }
export function setHubData(d) {
  hubData = d;
}

var TABS = [
  ['prof', 'Profil', 'user'],
  ['rew', 'Ödüller', 'gift'],
  ['goals', 'Görevler', 'target'],
  ['ach', 'Başarımlar', 'trophy'],
  ['stats', 'İstatistik', 'chart'],
  ['how', 'Kurallar', 'book'],
];
var BADGE = {
  first_hand: ['hand', 38],
  first_101: ['flag', 152],
  okey_finish: ['star', 45],
  pairs_finish: ['layers', 205],
  kafa: ['bolt', 12],
  streak3: ['chart', 265],
  clean_101: ['check', 165],
  expert_win: ['trophy', 32],
  hands_25: ['refresh', 190],
  indicator: ['eye', 330],
  mono: ['palette', 285],
  level5: ['user', 22],
};
var CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
var CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function ic(n) {
  return icon(n);
}
function num(v) {
  v = +v || 0;
  return '<span data-count="' + v + '">' + v + '</span>';
}
function rank(l) {
  return l >= 11 ? 'Masanın efsanesi' : l >= 8 ? 'Üstat' : l >= 5 ? 'Usta' : l >= 3 ? 'Kahvehane müdavimi' : 'Çaylak';
}
function stats(D) {
  return (D.e && D.e.d && D.e.d.stats) || {};
}
function achMap(D) {
  return (D.e && D.e.d && D.e.d.achievements) || {};
}
function rate(s) {
  return s.rounds ? Math.round(((s.wins || 0) / s.rounds) * 100) : 0;
}
function pct(a, b) {
  return b ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0;
}
function cd() {
  var n = new Date(),
    m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1),
    s = Math.max(0, Math.floor((m - n) / 1000));
  var p = function (v) {
    return (v < 10 ? '0' : '') + v;
  };
  return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60);
}
function lastAch(D) {
  var m = achMap(D),
    best = null,
    bt = -1;
  D.Ra.forEach(function (a) {
    var v = m[a.id];
    if (!v) return;
    var t = typeof v === 'number' ? v : 0;
    if (t >= bt) {
      bt = t;
      best = a.name;
    }
  });
  return best;
}
function ring(p, grad, w) {
  var C = 2 * Math.PI * 52,
    off = (C * (1 - Math.max(0, Math.min(100, p)) / 100)).toFixed(1);
  return (
    '<svg class="h7ring' +
    (p > 0 ? '' : ' is-empty') +
    '" viewBox="0 0 120 120" aria-hidden="true">' +
    '<circle cx="60" cy="60" r="52" class="h7ring__trk" style="stroke-width:' +
    w +
    '"/>' +
    '<circle cx="60" cy="60" r="52" class="h7ring__val" stroke="url(#h7g-' +
    grad +
    ')" style="stroke-width:' +
    w +
    ';stroke-dasharray:' +
    C.toFixed(1) +
    ';stroke-dashoffset:' +
    off +
    ';--c:' +
    C.toFixed(1) +
    '"/></svg>'
  );
}
function meter(p, tone) {
  return '<div class="h7meter' + (tone ? ' h7meter--' + tone : '') + '"><i style="width:' + p + '%"></i></div>';
}
function tile(go, icon, tone, big, label, foot, extra, i) {
  return (
    '<button type="button" class="h7card h7tile" data-go="' +
    go +
    '" style="--i:' +
    i +
    '"><span class="h7sq h7sq--' +
    tone +
    '">' +
    ic(icon) +
    '</span>' +
    '<span class="h7tile__chev">' +
    CHEV +
    '</span><b class="h7big">' +
    big +
    '</b><span class="h7tile__lbl">' +
    label +
    '</span>' +
    (extra || '') +
    '<span class="h7tile__foot">' +
    foot +
    '</span></button>'
  );
}
function head(eyebrow, title, right, i) {
  return '<header class="h7vh" style="--i:' + (i || 0) + '"><div><span class="h7eyebrow">' + eyebrow + '</span><h2>' + title + '</h2></div>' + (right || '') + '</header>';
}

// ---------- backdrop: living mesh gradient, depth-of-field tiles, night skyline, grain ----------
var FT = [
  ['7', 'r', '6%', '64%', -16, 1.05, 5, 0.3, 0],
  ['12', 'b', '86%', '10%', 12, 0.9, 3, 0.28, -4],
  ['★', 'y', '72%', '72%', -8, 1.25, 8, 0.22, -9],
  ['3', 'k', '30%', '-6%', 20, 0.8, 7, 0.2, -2],
  ['9', 'y', '50%', '84%', 8, 0.7, 2.5, 0.24, -6],
];
var BG =
  '<div class="h7__bg" aria-hidden="true"><i class="h7b h7b--1"></i><i class="h7b h7b--2"></i><i class="h7b h7b--3"></i>' +
  FT.map(function (t) {
    return '<span class="h7ft h7ft--' + t[1] + '" style="left:' + t[2] + ';top:' + t[3] + ';--r:' + t[4] + 'deg;--s:' + t[5] + ';--bl:' + t[6] + 'px;--o:' + t[7] + ';animation-delay:' + t[8] + 's">' + t[0] + '</span>';
  }).join('') +
  '<svg class="h7__sky" viewBox="0 0 800 134" preserveAspectRatio="xMidYMax slice"><defs><linearGradient id="h7skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020604" stop-opacity="0"/><stop offset=".55" stop-color="#020604" stop-opacity=".55"/><stop offset="1" stop-color="#020604" stop-opacity=".85"/></linearGradient></defs>' +
  '<path transform="translate(0 -266)" fill="url(#h7skyg)" d="M0 400V366H38V352Q58 326 78 352V366H96V318L99 298L102 318V366H140V356Q170 330 200 356V366H236V346Q252 330 268 346V366H330V300L333 274L336 300V366H360V340Q410 288 460 340V366H476V300L479 276L482 300V366H520V352Q540 334 560 352V366H610V330Q640 304 670 330V366H700V312L703 290L706 312V366H760V356Q780 344 800 356V400Z"/></svg>' +
  '<div class="h7__grain"></div></div>';
var DEFS =
  '<svg class="h7defs" width="0" height="0" aria-hidden="true"><defs>' +
  [
    ['amber', '#ffe7a3', '#f59e0b'],
    ['emerald', '#a7f3d0', '#10b981'],
    ['sky', '#bfdbfe', '#3b82f6'],
    ['rose', '#fecdd3', '#f43f5e'],
    ['violet', '#ddd6fe', '#8b5cf6'],
  ]
    .map(function (g) {
      return '<linearGradient id="h7g-' + g[0] + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + g[1] + '"/><stop offset="1" stop-color="' + g[2] + '"/></linearGradient>';
    })
    .join('') +
  '</defs></svg>';
var HERO_ART =
  '<svg class="h7hero__art" viewBox="0 0 160 200" aria-hidden="true"><defs><linearGradient id="h7ha" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></linearGradient></defs>' +
  '<g transform="rotate(14 80 100)" fill="none" stroke="url(#h7ha)"><rect x="20" y="20" width="120" height="160" rx="22" stroke-width="2"/><rect x="31" y="31" width="98" height="138" rx="15"/>' +
  '<path d="M80 60l9.4 19 21 3-15.2 14.8 3.6 20.9L80 107.8l-18.8 9.9 3.6-20.9L49.6 82l21-3z" fill="url(#h7ha)" stroke="none"/><path d="M58 140h44" stroke-width="2" stroke-linecap="round"/></g></svg>';

// ---------- views ----------
function viewProf(D) {
  var e = D.e,
    pr = e.progress ? e.progress() : D.h,
    s = stats(D),
    g = D.u || [];
  var done = g.filter(function (x) {
      return x.done;
    }).length,
    got = Object.keys(achMap(D)).length,
    xp = pct(pr.into, pr.need),
    r = rate(s),
    last = lastAch(D);
  var dots =
    '<div class="h7dots">' +
    D.Ra.map(function (_, i) {
      return '<i' + (i < got ? ' class="on"' : '') + '></i>';
    }).join('') +
    '</div>';
  return (
    '<div class="h7v h7v--prof">' +
    '<section class="h7card h7hero" style="--i:0">' +
    HERO_ART +
    '<div class="h7hero__top"><div class="h7hero__ring">' +
    ring(xp, 'amber', 7) +
    '<div class="h7hero__av has-frame">' +
    framedAvatar(D.av, e.equipped ? e.equipped('frame') : 'sade') +
    '</div><button type="button" class="h7hero__edit" data-edit aria-label="Profili düzenle">' +
    ic('edit') +
    '</button></div>' +
    '<div class="h7hero__lv"><small>Seviye</small><b>' +
    pr.level +
    '</b></div></div>' +
    '<div class="h7hero__txt"><span class="h7eyebrow">' +
    esc(e.equipped ? e.equipped('title').name : rank(pr.level)) +
    '</span><h2 class="h7hero__name">' +
    esc(D.p) +
    '</h2>' +
    '<div class="h7hero__xp"><span><b>' +
    num(pr.into) +
    '</b> / ' +
    pr.need +
    ' XP</span><span>' +
    (pr.need - pr.into) +
    ' XP kaldı</span></div>' +
    meter(xp, 'amber') +
    '</div></section>' +
    tile('goals', 'target', 'emerald', num(done) + '<small>/' + g.length + '</small>', 'Günlük görev', CLOCK + '<time data-cd>' + cd() + '</time>', meter(pct(done, g.length), 'emerald'), 1) +
    tile('ach', 'trophy', 'amber', num(got) + '<small>/' + D.Ra.length + '</small>', 'Başarım', last ? 'Son: ' + esc(last) : 'İlk madalyanı kazan', dots, 2) +
    tile('stats', 'bolt', 'rose', num(s.streak || 0), 'Galibiyet serisi', 'En iyi ' + (s.bestStreak || 0), '', 3) +
    tile('stats', 'chart', 'sky', '<small>%</small>' + num(r), 'Kazanma oranı', (s.rounds || 0) + ' el oynandı', meter(r, 'sky'), 4) +
    '</div>'
  );
}

// ---------- Ödüller: koleksiyon, kuşanma, sıradaki ödül ----------
var RSUB = [
  ['frame', 'Çerçeveler', FRAMES],
  ['title', 'Unvanlar', TITLES],
  ['effect', 'Kutlamalar', EFFECTS],
  ['tiles', 'Taşlar', TILESETS],
];
function settingsRef() {
  return window.__okey && window.__okey.settings;
}
function equippedOf(e, kind) {
  if (kind === 'tiles') return (settingsRef() && settingsRef().get('tiles')) || 'ivory';
  if (kind === 'title') return e.d.equip.title || null;
  return e.equipped(kind);
}
function rewCard(e, sub, it, i, eq, lv, avatar) {
  var own = e.owns(sub, it.id),
    on = eq === it.id,
    foot;
  if (on) foot = '<span class="h7rw-st is-on">' + ic('check') + 'Kuşanıldı</span>';
  else if (own) foot = '<button type="button" class="h7rw-btn" data-eq="' + sub + ':' + it.id + '">Kuşan</button>';
  else if (it.ads && (!it.level || it.level > lv)) foot = '<button type="button" class="h7rw-btn h7rw-btn--shop" data-shop="' + sub + ':' + it.id + '">' + ic('bazaar') + 'Çarşı’da aç</button>';
  else foot = '<span class="h7rw-st">' + ic('lock') + 'Seviye ' + it.level + '</span>';
  return (
    '<article class="h7card h7rw' + (own ? '' : ' is-locked') + (on ? ' is-on' : '') + '" style="--i:' + (i + 2) + '">' +
    '<div class="h7rw__art"' + (sub === 'effect' ? ' data-pv="' + it.id + '"' : '') + '>' + rewardArt(sub, it, avatar) +
    (sub === 'effect' ? '<span class="h7rw__pv">' + ic('play') + '</span>' : '') + '</div>' +
    '<b>' + esc(it.name) + '</b><small>' + esc(sub === 'frame' ? it.series : it.desc || '') + '</small>' + foot + '</article>'
  );
}
function titleRow(e, it, i, eq) {
  var own = e.owns('title', it.id),
    on = eq === it.id;
  return (
    '<button type="button" class="h7card h7rw-tt' + (own ? '' : ' is-locked') + (on ? ' is-on' : '') + '" ' +
    (own ? 'data-eq="title:' + it.id + '"' : 'disabled') + ' style="--i:' + (i + 3) + '"><b>' + esc(it.name) + '</b><small>' +
    (own ? 'Seviye ' + it.level + ' unvanı' : 'Seviye ' + it.level + '’de açılır') + '</small>' +
    (on ? '<em>' + ic('check') + '</em>' : own ? '' : '<em>' + ic('lock') + '</em>') + '</button>'
  );
}
function viewRew(D, sub) {
  var e = D.e,
    lv = e.level,
    S = settingsRef(),
    avatar = (S && S.get('playerAvatar')) || 'mert';
  if (!RSUB.some(function (x) { return x[0] === sub; })) sub = 'frame';
  var all = 0,
    got = 0;
  RSUB.forEach(function (x) {
    x[2].forEach(function (it) {
      all++;
      if (e.owns(x[0], it.id)) got++;
    });
  });
  var nx = nextReward(lv),
    nextHtml = '';
  if (nx) {
    var target = 0;
    for (var l = 1; l < nx.level; l++) target += xpForNext(l);
    var p = levelFromXp(e.d.xp),
      base = e.d.xp - p.into,
      pc = pct(e.d.xp - base, target - base);
    nextHtml =
      '<section class="h7card h7rw-next" style="--i:1"><span class="h7rw-next__art">' + rewardArt(nx.items[0].kind, nx.items[0], avatar) + '</span>' +
      '<div class="h7rw-next__txt"><span class="h7eyebrow">Sıradaki ödül · Seviye ' + nx.level + '</span><b>' +
      nx.items.map(function (x) { return esc(x.name) + ' <small>' + KIND_NAME[x.kind].toLowerCase() + '</small>'; }).join(' · ') +
      '</b>' + meter(pc, 'amber') + '<span class="h7rw-next__xp">' + Math.max(0, target - e.d.xp) + ' XP kaldı</span></div></section>';
  }
  var seg =
    '<div class="h7sub" role="tablist">' +
    RSUB.map(function (x) {
      return '<button type="button" role="tab" data-rs="' + x[0] + '" aria-selected="' + (x[0] === sub) + '"' + (x[0] === sub ? ' class="is-on"' : '') + '>' + x[1] + '</button>';
    }).join('') +
    '</div>';
  var list = RSUB.find(function (x) { return x[0] === sub; })[2];
  var eq = equippedOf(e, sub);
  var body =
    sub === 'title'
      ? '<div class="h7rw-titles"><button type="button" class="h7card h7rw-tt' + (eq ? '' : ' is-on') + '" data-eq="title:" style="--i:2"><b>Otomatik</b><small>Her zaman en yüksek unvan</small>' + (eq ? '' : '<em>' + ic('check') + '</em>') + '</button>' +
        list.map(function (it, i) { return titleRow(e, it, i, eq); }).join('') + '</div>'
      : '<div class="h7rw-grid">' + list.map(function (it, i) { return rewCard(e, sub, it, i, eq, lv, avatar); }).join('') + '</div>';
  return '<div class="h7v h7v--rew">' + head('Koleksiyon · ' + got + '/' + all, 'Ödüller', seg) + nextHtml + body + '<canvas class="h7rw-fx" aria-hidden="true"></canvas></div>';
}

function viewGoals(D) {
  var g = D.u || [],
    icons = ['target', 'bolt', 'star', 'trophy', 'hand'],
    done = g.filter(function (x) {
      return x.done;
    }).length;
  return (
    '<div class="h7v h7v--goals">' +
    head('Bugün · ' + done + '/' + g.length + ' tamam', 'Günlük görevler', '<span class="h7pill">' + CLOCK + '<span>Yenilenme</span><time data-cd>' + cd() + '</time></span>') +
    '<div class="h7goals">' +
    g
      .map(function (s, i) {
        var p = pct(s.progress, s.target);
        return (
          '<article class="h7card h7goal' +
          (s.done ? ' is-done' : '') +
          '" style="--i:' +
          (i + 1) +
          '"><div class="h7goal__ring">' +
          ring(p, s.done ? 'emerald' : 'amber', 9) +
          '<span class="h7goal__ic">' +
          ic(s.done ? 'check' : icons[i % icons.length]) +
          '</span></div>' +
          '<b class="h7goal__t">' +
          esc(s.text) +
          '</b><span class="h7goal__p"><b>' +
          num(s.progress) +
          '</b> / ' +
          s.target +
          '</span>' +
          (s.done ? '<span class="h7tag h7tag--done">Tamamlandı</span>' : '<span class="h7tag">+50 XP</span>') +
          '</article>'
        );
      })
      .join('') +
    '</div><p class="h7foot" style="--i:' +
    (g.length + 1) +
    '">Görevler her gün gece yarısı yenilenir. Tamamladığın her görev 50 XP kazandırır.</p></div>'
  );
}

function viewAch(D) {
  var m = achMap(D),
    list = D.Ra.map(function (a, i) {
      return { a: a, i: i, g: !!m[a.id] };
    }).sort(function (x, y) {
      return y.g - x.g || x.i - y.i;
    });
  var n = list.filter(function (x) {
    return x.g;
  }).length;
  var bar =
    '<div class="h7prog"><b>' +
    num(n) +
    '</b><span>/ ' +
    list.length +
    '</span><div class="h7segbar">' +
    list
      .map(function (_, i) {
        return '<i' + (i < n ? ' class="on"' : '') + '></i>';
      })
      .join('') +
    '</div></div>';
  return (
    '<div class="h7v h7v--ach">' +
    head('Koleksiyon', 'Başarımlar', bar) +
    '<div class="h7badges">' +
    list
      .map(function (o, k) {
        var b = BADGE[o.a.id] || ['star', 45];
        return (
          '<div class="h7badge' +
          (o.g ? ' is-got' : '') +
          '" style="--h:' +
          b[1] +
          ';--i:' +
          (k + 1) +
          '"><div class="h7badge__art"><span class="h7badge__disc">' +
          ic(b[0]) +
          '</span>' +
          (o.g ? '' : '<span class="h7badge__lock">' + ic('lock') + '</span>') +
          '</div><b>' +
          esc(o.a.name) +
          '</b><small>' +
          esc(o.a.desc) +
          '</small></div>'
        );
      })
      .join('') +
    '</div></div>'
  );
}

function viewStats(D) {
  var s = stats(D),
    m = s.matches || {},
    mo = m.okey || { won: 0, played: 0 },
    m1 = m.okey101 || { won: 0, played: 0 },
    r = rate(s);
  function stat(icon, tone, big, label, foot, i) {
    return (
      '<div class="h7card h7tile h7tile--static" style="--i:' +
      i +
      '"><span class="h7sq h7sq--' +
      tone +
      '">' +
      ic(icon) +
      '</span><b class="h7big">' +
      big +
      '</b><span class="h7tile__lbl">' +
      label +
      '</span><span class="h7tile__foot">' +
      foot +
      '</span></div>'
    );
  }
  function match(title, icon, tone, x, foot, i) {
    return (
      '<div class="h7card h7tile h7tile--static" style="--i:' +
      i +
      '"><span class="h7sq h7sq--' +
      tone +
      '">' +
      ic(icon) +
      '</span><b class="h7big">' +
      num(x.won) +
      '<small>/' +
      x.played +
      '</small></b>' +
      '<span class="h7tile__lbl">' +
      title +
      ' · galibiyet</span>' +
      meter(pct(x.won, x.played), tone) +
      '<span class="h7tile__foot">' +
      (foot || (x.played ? x.played - x.won + ' mağlubiyet' : 'Henüz maç yok')) +
      '</span></div>'
    );
  }
  return (
    '<div class="h7v h7v--stats">' +
    '<section class="h7card h7win" style="--i:0"><span class="h7eyebrow">Genel performans</span><div class="h7win__ring">' +
    ring(r, 'sky', 9) +
    '<div class="h7win__c"><b><small>%</small>' +
    num(r) +
    '</b><span>kazanma</span></div></div>' +
    '<p class="h7win__sub"><b>' +
    (s.wins || 0) +
    '</b> el kazandın · <b>' +
    (s.rounds || 0) +
    '</b> el oynadın</p></section>' +
    stat('layers', 'violet', num(s.rounds || 0), 'Oynanan el', (s.wins || 0) + ' el kazanıldı', 1) +
    stat('bolt', 'rose', num(s.streak || 0), 'Galibiyet serisi', 'En iyi ' + (s.bestStreak || 0), 2) +
    match('Klasik Okey', 'star', 'amber', mo, '', 3) +
    match('101 Okey', 'target', 'emerald', m1, '101’de ' + (s.open101 || 0) + ' kez el açtın', 4) +
    '</div>'
  );
}

function t(v, c, x) {
  return '<span class="mt mt--' + (c || 'k') + (x ? ' ' + x : '') + '">' + v + '</span>';
}
function op(s) {
  return '<i class="mt-op">' + s + '</i>';
}
function chip(s, x) {
  return '<span class="mt-chip' + (x ? ' ' + x : '') + '">' + s + '</span>';
}
var RULES = {
  steps: [
    'Nasıl oynanır',
    [
      ['Taş al', 'Sıra sende: ortadaki desteden ya da solundakinin attığı taştan (yandan) bir taş al.', t('', '', 'is-back') + op('veya') + t(7, 'r')],
      ['Diz', 'Taşları ıstakada sürükle. “Diz” elin hangisine yakınsa onu dizer: per ya da çift. Tekrar bas, diğerine geçer.', t(5, 'b') + t(3, 'b') + t(4, 'b') + op('→') + t(3, 'b') + t(4, 'b') + t(5, 'b')],
      ['At', 'Bir taşı sağdaki atık alanına sürükle ya da seçip ikinci kez dokun.', t(9, 'k', 'is-lift') + op('↘') + '<span class="mt-pile"></span>'],
      ['Per kur', 'Aynı renk ardışık (3-4-5) seri ya da aynı sayı farklı renk (7-7-7) grup.', t(3, 'y') + t(4, 'y') + t(5, 'y') + op('·') + t(7, 'r') + t(7, 'b') + t(7, 'k')],
      ['Okey', 'Göstergenin aynı renkte bir üstü okeydir; her taşın yerine geçer.', t(5, 'r', 'is-ind') + op('→') + t(6, 'r', 'is-okey')],
      ['Bitir', '14 taşı perlere ayırıp son taşı at. Yedi çift dizerek de bitirebilirsin.', t(8, 'y') + t(8, 'y') + op('') + t(2, 'b') + t(2, 'b') + op('…')],
    ],
  ],
  klasik: [
    'Klasik Okey',
    [
      ['106 taş', 'Dört renk, 1’den 13’e ikişer taş ve 2 sahte okey.', t(1, 'r') + t(13, 'b') + t(7, 'y') + t('', '', 'is-fake')],
      ['Gösterge ve okey', 'Açılan göstergenin aynı renkte bir üstü okeydir. 13’ün üstü 1’dir.', t(13, 'y', 'is-ind') + op('→') + t(1, 'y', 'is-okey')],
      ['Sahte okey', 'Joker değildir; okey taşının yerini, yani o renk ve sayıyı tutar.', t('', '', 'is-fake') + op('=') + t(1, 'y')],
      ['Seri', 'Aynı renkte en az 3 ardışık taş.', t(4, 'b') + t(5, 'b') + t(6, 'b') + t(7, 'b')],
      ['Grup', 'Aynı sayı, farklı renkler: 3 ya da 4 taş.', t(9, 'r') + t(9, 'b') + t(9, 'k') + t(9, 'y')],
      ['Çiftten bitiş', 'Yedi çift dizerek de el bitirilir.', t(3, 'r') + t(3, 'r') + op('') + t(11, 'k') + t(11, 'k')],
      ['Puan', 'El bitince diğer oyuncular 2 puan kaybeder. Okey atarak ya da çiftten bitişte 4, çiftten okeyle 8.', chip('−2') + chip('−4') + chip('−8', 'is-hot')],
      ['Gösterge göster', 'Gösterge taşının eşi elindeyse ilk turunda masaya gösterebilirsin.', t(5, 'r', 'is-lift') + op('=') + t(5, 'r', 'is-ind')],
    ],
  ],
  o101: [
    '101 Okey',
    [
      ['Açılış', 'Perlerinin toplamı en az 101 olmalı ya da 5 çift açmalısın.', chip('≥ 101') + op('veya') + chip('5 çift')],
      ['İşleme', 'Açtıktan sonra masadaki perlere taş ekleyebilirsin.', t(4, 'b') + t(5, 'b') + t(6, 'b') + op('+') + t(7, 'b', 'is-lift')],
      [
        'Yandan alma',
        'Yandan aldığın taşı o turda kullanmak zorundasın. Açarken kullanırsan atana taşın değerinin 10 katı ceza yazılır (çiftte 20 katı); masaya işlersen ceza yok.',
        t(9, 'k', 'is-lift') + op('→') + t(9, 'r') + t(9, 'b') + t(9, 'k'),
      ],
      ['Bitiren', 'Bitiren −101 yazar. Okeyle, çiftten ya da kafadan bitişte katlanır.', chip('−101', 'is-good') + chip('×2', 'is-good')],
      ['Açamayan', 'El sonunda açamamış oyuncu 202 ceza yazar (bitiş katsayısıyla).', chip('+202', 'is-hot')],
      ['Eldeki taşlar', 'Açan oyuncu elinde kalan taşların toplamını yazar; çiftten açtıysa iki katı. Elde kalan her okey +101.', t(8, 'r') + t(12, 'k') + op('=') + chip('+20', 'is-hot')],
      ['Cezalar', 'Okey atmak, işlenebilir taşı atmak ve yandan alıp kullanmamak ceza getirir.', t(6, 'r', 'is-okey') + op('↘') + chip('ceza', 'is-hot')],
      ['Kazanan', 'Maç sonunda en düşük toplam puan kazanır.', chip('en düşük', 'is-good') + op('=') + '<span class="mt-crown">♛</span>'],
    ],
  ],
};
function viewHow(sub) {
  sub = RULES[sub] ? sub : 'steps';
  var seg =
    '<div class="h7sub" role="tablist">' +
    Object.keys(RULES)
      .map(function (k) {
        return '<button type="button" role="tab" data-r="' + k + '" aria-selected="' + (k === sub) + '"' + (k === sub ? ' class="is-on"' : '') + '>' + RULES[k][0] + '</button>';
      })
      .join('') +
    '</div>';
  return (
    '<div class="h7v h7v--how">' +
    head('Masa adabı', 'Kurallar', seg) +
    '<div class="h7rules">' +
    RULES[sub][1]
      .map(function (c, i) {
        return (
          '<article class="h7card h7rule" style="--i:' +
          (i + 1) +
          '"><div class="h7rule__stage">' +
          c[2] +
          '</div><div class="h7rule__body"><span class="h7rule__n">' +
          (i < 9 ? '0' : '') +
          (i + 1) +
          '</span><b>' +
          c[0] +
          '</b><p>' +
          c[1] +
          '</p></div></article>'
        );
      })
      .join('') +
    '</div></div>'
  );
}

function countUp(root) {
  root.querySelectorAll('[data-count]').forEach(function (n) {
    var v = +n.dataset.count;
    if (!v || v < 0) return;
    var t0 = performance.now(),
      dur = 750;
    n.textContent = '0';
    (function f(now) {
      var k = Math.min(1, (now - t0) / dur),
        e = 1 - Math.pow(1 - k, 3);
      n.textContent = String(Math.round(v * e));
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  });
}

// ---------- shell ----------
// Menüde tam panel (5 sekme); oyun içinde (ana menü yokken) yalnız Kurallar açılır.
export function openHub(tab, host) {
  var D = hubData,
    home = document.querySelector('.home3'),
    menu = !!(home && D);
  if (!menu) tab = 'how';
  tab = tab || 'prof';
  var old = document.querySelector('.h7');
  if (old) old.remove();
  var pending = menu
    ? (D.u || []).filter(function (g) {
        return !g.done;
      }).length
    : 0;
  var el = document.createElement('div');
  el.className = 'h7' + (menu ? '' : ' is-solo');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', menu ? 'Profil' : 'Kurallar');
  var seg =
    '<nav class="h7seg" role="tablist"><span class="h7seg__pill"></span>' +
    TABS.map(function (x) {
      return '<button type="button" role="tab" data-t="' + x[0] + '" aria-label="' + x[1] + '">' + ic(x[2]) + '<span>' + x[1] + '</span>' + (x[0] === 'goals' && pending ? '<em>' + pending + '</em>' : '') + '</button>';
    }).join('') +
    '</nav>';
  el.innerHTML =
    '<div class="h7__veil" data-close></div><div class="h7__panel" data-tab="' +
    tab +
    '">' +
    BG +
    DEFS +
    '<header class="h7__head">' +
    (menu ? seg : '<span></span>') +
    '<button type="button" class="h7__x" data-close aria-label="Kapat">' +
    ic('close') +
    '</button></header>' +
    '<div class="h7__body"></div></div>';
  (home || host || document.body).appendChild(el);
  var fx = null;
  var panel = el.querySelector('.h7__panel'),
    body = el.querySelector('.h7__body'),
    pill = el.querySelector('.h7seg__pill');

  function movePill() {
    var b = el.querySelector('.h7seg [aria-selected="true"]');
    if (!b || !pill) return;
    pill.style.width = b.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + b.offsetLeft + 'px)';
  }
  function show(tb, sub) {
    panel.dataset.tab = tb;
    el.querySelectorAll('.h7seg [data-t]').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.t === tb));
    });
    if (fx) fx.stop();
    fx = null;
    body.innerHTML = tb === 'prof' ? viewProf(D) : tb === 'rew' ? viewRew(D, sub) : tb === 'goals' ? viewGoals(D) : tb === 'ach' ? viewAch(D) : tb === 'stats' ? viewStats(D) : viewHow(sub);
    hydrateArt(body);
    body.scrollTop = 0;
    movePill();
    countUp(body);
  }
  var tick = setInterval(function () {
    var v = cd();
    el.querySelectorAll('[data-cd]').forEach(function (n) {
      n.textContent = v;
    });
  }, 1000);
  function close() {
    clearInterval(tick);
    if (fx) fx.stop();
    document.removeEventListener('keydown', key);
    window.removeEventListener('resize', movePill);
    el.classList.add('is-out');
    setTimeout(function () {
      el.remove();
    }, 260);
  }
  function key(ev) {
    if (ev.key === 'Escape') close();
  }
  document.addEventListener('keydown', key);
  window.addEventListener('resize', movePill);
  el.addEventListener('click', function (ev) {
    var b;
    if (ev.target.closest('[data-close]')) return close();
    if ((b = ev.target.closest('[data-t]'))) return show(b.dataset.t);
    if ((b = ev.target.closest('[data-go]'))) return show(b.dataset.go);
    if ((b = ev.target.closest('[data-r]'))) return show('how', b.dataset.r);
    if ((b = ev.target.closest('[data-rs]'))) return show('rew', b.dataset.rs);
    if (ev.target.closest('[data-edit]') && settingsRef()) {
      openOnboarding({ host: document.body, settings: settingsRef(), profile: D.e, audio: window.__okey && window.__okey.audio, mode: 'edit' }).then(function (r) {
        if (!r) return;
        D = hubData;
        show('prof');
      });
      return;
    }
    if ((b = ev.target.closest('[data-eq]'))) {
      var kv = b.dataset.eq.split(':');
      if (kv[0] === 'tiles') settingsRef() && settingsRef().set('tiles', kv[1]);
      else D.e.equip(kv[0], kv[1] || null);
      var st = body.scrollTop;
      show('rew', kv[0]);
      body.scrollTop = st;
      return;
    }
    if ((b = ev.target.closest('[data-shop]'))) {
      var sk = b.dataset.shop.split(':');
      if (settingsRef())
        openBazaar({
          host: document.querySelector('.home3') || document.body,
          profile: D.e,
          settings: settingsRef(),
          audio: window.__okey && window.__okey.audio,
          tab: sk[0],
          focus: b.dataset.shop,
          onClose: function () {
            show('rew', sk[0]);
          },
        });
      return;
    }
    if ((b = ev.target.closest('[data-pv]'))) {
      var cv = body.querySelector('.h7rw-fx');
      if (!cv) return;
      if (!fx) fx = new Celebration(cv);
      fx.play(b.dataset.pv);
    }
  });
  show(tab);
  requestAnimationFrame(function () {
    pill && pill.classList.add('is-ready');
    movePill();
  });
}
