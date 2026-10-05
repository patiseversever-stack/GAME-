// Kullanıcı adı denetimi: biçim kuralları + küfür / hakaret / nefret / cinsel içerik / sahte yetkili engeli.
// Hilelere karşı normalleştirir: Türkçe harfler (ş→s, ı→i…), rakam-harf (s1k, 0rospu, @mk), araya konan boşluk / nokta /
// alt çizgi (s.i.k, o r o s p u), uzatılan harfler (siiiik), tek harflik parçaların birleşmesi (a m k).
// Saf işlev: tarayıcıda ve sunucuda (çevrim içi aşama) aynen kullanılır. checkName(ad) → { ok, reason, name }
export const NAME_MIN = 3;
export const NAME_MAX = 16;

const TR_MAP = { ı: 'i', İ: 'i', ş: 's', ğ: 'g', ç: 'c', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u', é: 'e', ë: 'e', ä: 'a' };
const LEET = { 0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i', '|': 'i', '€': 'e', '£': 'l', '+': 't' };

// harf dizisi: küçük harf, Türkçe ve rakam eşleme; harf dışı her şey ayırıcı (boşluk) olur
function letters(s, leet = true) {
  let out = '';
  for (const ch of String(s).toLocaleLowerCase('tr')) {
    const c = TR_MAP[ch] || ch;
    if (c >= 'a' && c <= 'z') out += c;
    else if (leet && LEET[c]) out += LEET[c];
    else if (c >= '0' && c <= '9') out += c;
    else out += ' ';
  }
  return out;
}
const squeeze = (s) => s.replace(/(.)\1+/g, '$1');

// Uzun kökler: birleştirilmiş metnin herhangi bir yerinde geçerse reddedilir (önce kökler de aynı biçimde normalleşir)
const STRONG = [
  // Türkçe küfür ve cinsel
  'orospu', 'orosbu', 'orspu', 'orspcocu', 'kahpe', 'yarrak', 'yarak', 'yarram', 'dalyarak', 'amcik', 'amcuk', 'amck', 'aminako', 'aminakoy', 'aminakodu', 'aminakoyim', 'aminyarak',
  'amina koyim', 'sikerim', 'sikeyim', 'sikiyim', 'sikicem', 'sikecem', 'siktir', 'siktirgit', 'sikdir', 'hassiktir', 'sikis', 'sikik', 'sikim', 'sikmek', 'sikiyor', 'sikti', 'sikerler',
  'sikicik', 'sokuk', 'ananisik', 'ananisikeyim', 'anaskm', 'anasini', 'anani', 'ananizi', 'bacini', 'bacinisik', 'avradini', 'pezevenk', 'pezeveng', 'gavat', 'ibne', 'ipne', 'puset', 'pust',
  'yavsak', 'serefsiz', 'kaltak', 'fahise', 'surtuk', 'godos', 'kancik', 'tasak', 'tassak', 'gotveren', 'gotlek', 'gotunu', 'gotune', 'gotos', 'dingil', 'kevase', 'kerhane', 'pipi', 'yalaka',
  'gerizekali', 'salak', 'aptal', 'dangalak', 'embesil', 'mongol', 'ahmak', 'hiyar', 'oglanci', 'piclik', 'picler', 'otuzbir', 'mastir',
  // İngilizce
  'fuck', 'fck', 'shit', 'bitch', 'cunt', 'pusy', 'whore', 'slut', 'niger', 'niga', 'fagot', 'retard', 'porn', 'penis', 'vagina', 'ashole', 'bastard', 'dildo', 'boob',
  'motherf', 'jerkoff', 'wank',
  // nefret
  'hitler', 'nazi',
].map((r) => squeeze(letters(r).replace(/ /g, '')));

// Kısa kökler: yalnız tam parça olarak (ya da tek harfler birleşince) reddedilir — Kemal'deki "am", Gotham'daki "got" geçer
const SHORT = ['am', 'amk', 'amq', 'aq', 'mk', 'sg', 'oc', 'oç', 'pic', 'piç', 'sik', 'got', 'göt', 'yarak', 'ibne', 'mal', 'dick', 'sex', 'seks', 'cum', 'tits', 'oe', 'kys', 'siq', 'cock', 'rape', 'fuk'].map((r) =>
  squeeze(letters(r).replace(/ /g, '')),
);

// Sahte yetkili / resmi görünüm
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'yonetici', 'yetkili', 'patisever', 'destek', 'support', 'sistem', 'system', 'official', 'resmi', 'okeyadmin', 'gm', 'staff', 'bot', 'root'].map((r) =>
  squeeze(letters(r).replace(/ /g, '')),
);

// Kuralsız görünen ama zararsız, sık ad içinde geçen parçalar (yanlış alarmı önler)
const SAFE = ['kemal', 'ismail', 'cemal', 'jamal', 'amanda', 'samet', 'hamit', 'hamza', 'osman', 'cansu', 'gotham', 'tamer', 'salaktas'].map((r) => squeeze(letters(r).replace(/ /g, '')));

const SUFFIX = [
  ['sik', ['', 'e', 'er', 'erim', 'im', 'ik', 'is', 'ti', 'tir', 'ici', 'ko', 'ey', 'eyim', 'iyim']],
  ['pic', ['', 'ler', 'lik', 'i', 'in']],
  ['got', ['', 'u', 'un', 'veren', 'lek', 'os']],
  ['amk', ['', 'ya', 'i']],
  ['aq', ['', 'i']],
];

function tokensOf(raw) {
  const parts = letters(raw)
    .split(' ')
    .filter(Boolean);
  // tek harflik ardışık parçaları birleştir: "a m k" → "amk"
  const out = [];
  let run = '';
  for (const p of parts) {
    if (p.length === 1) run += p;
    else {
      if (run) out.push(run);
      run = '';
      out.push(p);
    }
  }
  if (run) out.push(run);
  return out.map(squeeze);
}

// Yalnız küfür / hakaret denetimi (sohbet vb. için de kullanılabilir) → engellenen kök ya da null
export function findBlocked(raw) {
  const joined = squeeze(letters(raw).replace(/ /g, ''));
  const joinedNoLeet = squeeze(letters(raw, false).replace(/[^a-z]/g, ''));
  // v→u (fvck), ph→f gibi görsel benzerlikler de denenir
  for (const cand of [joined, joinedNoLeet, joined.replace(/v/g, 'u'), joined.replace(/ph/g, 'f')]) {
    let probe = cand;
    for (const s of SAFE) probe = probe.split(s).join('_');
    for (const r of STRONG) if (r.length >= 4 && probe.includes(r)) return r;
  }
  const toks = tokensOf(raw);
  for (const t of toks) {
    if (SHORT.includes(t)) return t;
    // kısa kök + rakam/tekrar ekleri: "amk123", "sikkk", "aqqq"
    for (const r of SHORT) if (r.length >= 2 && t.startsWith(r) && /^[0-9]*$/.test(t.slice(r.length))) return r;
    // kısa kök + küfür ekleri: "sikerim", "piçler", "götveren", "amkk"
    for (const [r, ends] of SUFFIX) if (t.startsWith(r) && ends.includes(t.slice(r.length))) return r;
  }
  // bütün metin bir kısa kökse (araya her şey konmuş): "a.m.k", "s_i_k"
  if (SHORT.includes(joined)) return joined;
  // "31" (argo): rakamın kendisi bağımsız geçerse
  if (/(^|[^0-9])31([^0-9]|$)/.test(String(raw))) return '31';
  return null;
}

export function checkName(input) {
  const name = String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length < NAME_MIN) return { ok: false, reason: `En az ${NAME_MIN} karakter olmalı`, name };
  if (name.length > NAME_MAX) return { ok: false, reason: `En fazla ${NAME_MAX} karakter olabilir`, name };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(name)) return { ok: false, reason: 'Harf, rakam, boşluk ve . _ - kullanılabilir', name };
  if (/[ ._-]{2,}/.test(name)) return { ok: false, reason: 'Ayırıcılar arka arkaya gelemez', name };
  if (/^[\p{N} ._-]+$/u.test(name)) return { ok: false, reason: 'Ad yalnız rakamdan oluşamaz', name };
  if ((name.match(/\p{L}/gu) || []).length < 2) return { ok: false, reason: 'En az iki harf içermeli', name };
  if (/(.)\1{3,}/u.test(name)) return { ok: false, reason: 'Aynı karakter çok kez tekrarlanmış', name };
  const joined = squeeze(letters(name).replace(/ /g, ''));
  for (const r of RESERVED) if (joined === r || (r.length >= 5 && joined.includes(r))) return { ok: false, reason: 'Bu ad resmi hesaplar için ayrılmış', name };
  if (findBlocked(name)) return { ok: false, reason: 'Bu ad uygun değil. Lütfen başka bir ad seç', name };
  return { ok: true, reason: '', name };
}
