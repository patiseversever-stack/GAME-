// Kahvehane — hızlı sohbetin ikinci katmanı: VERİ (seslendirilen ek replikler). Seçim mantığı src/ai/quickTalk.ts'te.
// Bu dosya da seslendirme aracında (tools/voice/generate.mjs) tip ayıklamayla DOĞRUDAN import edilir: çalışma zamanında hiçbir
// modül import edilmez (yalnız `import type`). Satırlar dialogue.ts → registerLines ile kaydedilir (oyunda quickTalk.ts,
// araçta generate.mjs); kimlik biçimleri dialogue.ts ile aynıdır, ses üretildikten sonra numara DEĞİŞTİRMEYİN.
//
//  1) Hedefli söyleyiş (qc_<gönderen>_<mesaj>_<hedef>_1): oyuncu mesajı bir BOTA yöneltince onun kişiliğine uygun söz —
//     Rıza'nın yaşına saygılı takılma, Cem'in telefonu / yayını, Dursun'un çayı / tepsisi / defteri, Defne'ye kibar ve
//     zarif (asla cinsiyetçi değil). Hedef insansa (çevrimiçi "Mustafa") ya da bilinmiyorsa nötr söyleyiş çalar.
//  2) Eşli takım mesajları (qc_<kar>_team_*_<no>): ortağa; cevabı ortak bot verir (mevcut 'mate' cevapları).
//  3) Nötr ek: Rıza'nın "Dursun, çaylar benden!" sözünün Dursun masada İNSANKEN kullanılacak adsız karşılığı.
//  4) İnce havuzlara ek (an kimliği, 31+): Blöf'te her elde birkaç kez gelen açılış tepkileri ve Pişti'nin şanslı alışı.
import type {CharId, ExtraLine, LineOpt, QuickReplyCat, VoiceMoment} from './dialogue';
import type {Pose} from '../game/roster';

type Say = [tts: string, opt?: LineOpt];
type MSpec = [n: number, tts: string, mood?: Pose | null, opt?: LineOpt];
const T = (text: string, o?: LineOpt): LineOpt => ({...o, text});
const _ = undefined;

// ───────────────────────── eşli takım mesajları ─────────────────────────

export interface TeamMsg {
  id: string;
  icon: string;
  /** Ortak botun cevap kategorisi (yalnız 'mate' satırları). */
  reply: QuickReplyCat;
  /** Menü sözü (gönderenin karakterine göre, 3–4 kelime). */
  labels: Readonly<Record<CharId, string>>;
}

/** Yalnız eşlide görünür, ortağa gider (menüde QUICK_CHAT'in sonuna eklenir). */
export const TEAM_CHAT: readonly TeamMsg[] = [
  {id: 'team_ours', icon: 'team', reply: 'taunt', labels: {riza: 'Bu el bizim, ortak', dursun: 'Ortak, masa bizim!', cem: 'Kanka, bu el bizim', defne: 'Ortak, bu el bizim'}},
  {id: 'team_sorry', icon: 'sorry', reply: 'oops', labels: {riza: 'Kusura bakma, ortak', dursun: 'Pardon ortak, kaydı', cem: 'Sorry ortak, benden', defne: 'Pardon ortak, telafi ederim'}},
];

const TEAM_SAY: Record<CharId, Record<string, Say[]>> = {
  riza: {
    team_ours: [['[proudly] Bu el bizim, ortak!'], ['[chuckles] Sen tut, ben bitiririm ortak.']],
    team_sorry: [['[sighs] Kusura bakma ortak, gözüm kaydı.'], ['[groans] Hay aksi… telafi ederim ortak.']],
  },
  dursun: {
    team_ours: [['[excited] Ortak, masa bizim!'], ['[laughs] Ortak, bu el bizim! Çaylar hazır!']],
    team_sorry: [['[groans] Pardon ortak, elim kaydı!'], ['[chuckles] Kusura bakma ortak, çaylar benden!']],
  },
  cem: {
    team_ours: [['[excited] Kanka, bu el bizim!'], ['[chuckles] Ortak, kombo bizde!']],
    team_sorry: [['[sighs] Sori ortak, benden kaynaklı.', T('Sorry ortak, benden kaynaklı.')], ['[groans] Kanka pardon, telafi edicem!']],
  },
  defne: {
    team_ours: [['[playfully] Ortak, bu el bizim.'], ['[sweetly] Sen ve ben, ortak… zor durdurulur.']],
    team_sorry: [['[sighs] Pardon ortak, telafi ederim.'], ['[softly] Benim hatam, canım. Toparlarım.']],
  },
};

// ───────────────────────── hedefli söyleyişler ─────────────────────────

/** Hedefli söyleyişi olan mesajlar (diğerleri hep nötr). */
export const TARGET_MSGS: readonly string[] = ['hello', 'gg', 'nice', 'lucky', 'hurry', 'bluffing'];

/** gönderen → mesaj → hedef bot → söz. */
const TARGET_SAY: Record<CharId, Record<string, Partial<Record<CharId, Say>>>> = {
  riza: {
    hello: {
      dursun: ['[chuckles] Selam Dursun! Çay demde mi?'],
      cem: ['[chuckles] Gel bakalım Cem, telefonu bırak.'],
      defne: ['Hoş geldin Defne kızım, şeref verdin.'],
    },
    gg: {
      dursun: ['[chuckles] Eline sağlık Dursun, yaz deftere.'],
      cem: ['[proudly] Çaylak değilmişsin Cem, eline sağlık.'],
      defne: ['Eline sağlık Defne kızım, ince oyundu.'],
    },
    nice: {
      dursun: ['[proudly] Aferin Dursun, demli hamle!'],
      cem: ['[proudly] Aferin Cem! Bu, tecrübe kokuyor.'],
      defne: ['[chuckles] Maşallah Defne kızım, usta işi!'],
    },
    lucky: {
      dursun: ['[scoffs] Dursun, bu şans veresiye, ödersin!'],
      cem: ['[scoffs] Şans bu Cem, algoritma değil!'],
      defne: ['[chuckles] Defne kızım, şans da sana hayran.'],
    },
    hurry: {
      dursun: ['[grumbling] Dursun, çay da kart da soğudu!'],
      cem: ['[grumbling] Cem, telefona değil masaya bak!'],
      defne: ['[clears throat] Defne kızım, çayım soğuyor ama.'],
    },
    bluffing: {
      dursun: ['[chuckles] Dursun, bu blöf demsiz çay gibi!'],
      cem: ['[scoffs] Cem, bu blöfü internette mi gördün?'],
      defne: ['[chuckles] Defne kızım, güzel yalan ama yalan.'],
    },
  },
  dursun: {
    hello: {
      riza: ['[chuckles] Hoş geldin Rıza Amca! Çayın hazır!'],
      cem: ['[laughs] Cem geldi! Şarj aleti prizde!'],
      defne: ['[excited] Hoş geldiniz Defne Hanım, köşe masa sizin!'],
    },
    gg: {
      riza: ['[laughs] Helal Rıza Amca! Bu çay benden!'],
      cem: ['[laughs] Helal Cem! Bunu yayına koy!'],
      defne: ['Helal Defne Hanım, masaya renk kattınız!'],
    },
    nice: {
      riza: ['[excited] Vay Rıza Amca! Eski toprak, sağlam toprak!'],
      cem: ['[laughs] Cem! Bu hamleye bedava çay!'],
      defne: ['[excited] Defne Hanım, bu hamleye kahve ikram!'],
    },
    lucky: {
      riza: ['[laughs] Rıza Amca, kırk yılda bir şans!'],
      cem: ['[chuckles] Cem, şansı internetten mi indirdin?'],
      defne: ['[chuckles] Defne Hanım, şansınıza nazar değmesin!'],
    },
    hurry: {
      riza: ['[chuckles] Rıza Amca, uyudun mu yoksa?'],
      cem: ['[excited] Cem, şarjın bitmeden at şu kartı!'],
      defne: ['[chuckles] Defne Hanım, kahveniz soğuyor ama!'],
    },
    bluffing: {
      riza: ['[chuckles] Rıza Amca, bıyığın titriyor, blöf bu!'],
      cem: ['[laughs] Cem, bu blöf çette bile tutmaz!', T("Cem, bu blöf chat'te bile tutmaz!")],
      defne: ['[chuckles] Defne Hanım, gülüşünüz blöfü ele verdi!'],
    },
  },
  cem: {
    hello: {
      riza: ['[excited] Selam Rıza Amca! Bugün ders var mı?'],
      dursun: ['[excited] Dursun Abi selam! Bir çay, demli olsun!'],
      defne: ['[chuckles] Selam Defne Abla, aura yine ful!', T('Selam Defne Abla, aura yine full!')],
    },
    gg: {
      riza: ['[chuckles] Ci ci Rıza Amca, efsanesin.', T('GG Rıza Amca, efsanesin.')],
      dursun: ['[excited] Ci ci Dursun Abi, çaylar senden!', T('GG Dursun Abi, çaylar senden!')],
      defne: ['[chuckles] Ci ci Defne Abla, ful klas.', T('GG Defne Abla, full klas.')],
    },
    nice: {
      riza: ['[excited] Rıza Amca, vintıc ama çalışıyor!', T('Rıza Amca, vintage ama çalışıyor!')],
      dursun: ['[laughs] Dursun Abi, servis kusursuz!'],
      defne: ['[excited] Defne Abla, bu hamle ful estetik!', T('Defne Abla, bu hamle full estetik!')],
    },
    lucky: {
      riza: ['[teasing] Rıza Amca, bu şans seksenlerden kalma!'],
      dursun: ['[laughs] Dursun Abi, şans da self servis mi?'],
      defne: ['[chuckles] Defne Abla, şans bile senin fanın!'],
    },
    hurry: {
      riza: ['[sighs] Rıza Amca, sen düşünürken yaşlandım!'],
      dursun: ['[excited] Dursun Abi hadi! Çaylar soğuyor!'],
      defne: ['[chuckles] Defne Abla, sahne senin, hadi!'],
    },
    bluffing: {
      riza: ['[laughs] Rıza Amca, bu blöf analog kalmış!'],
      dursun: ['[laughs] Dursun Abi, bu blöf demlenmemiş!'],
      defne: ['[chuckles] Defne Abla, şık blöf ama blöf!'],
    },
  },
  defne: {
    hello: {
      riza: ['[sweetly] Rıza Amcacım, elinizi öpeyim.'],
      dursun: ['[playfully] Dursun Bey, kahvem orta şekerli.'],
      cem: ['[teasing] Cem, yayını kapat da gel bakalım.'],
    },
    gg: {
      riza: ['[sweetly] Ellerinize sağlık Rıza Amcacım.'],
      dursun: ['[playfully] Güzel oyundu Dursun Bey, çaylar sizden.'],
      cem: ['[giggles] İyi oyundu Cem, storilik.', T("İyi oyundu Cem, story'lik.")],
    },
    nice: {
      riza: ['[sweetly] Rıza Amcacım, ustalık konuştu.'],
      dursun: ['[giggles] Dursun Bey, bu hamle köpüklü oldu.'],
      cem: ['[teasing] Cem, bunu kesin stori yaparsın.', T('Cem, bunu kesin story yaparsın.')],
    },
    lucky: {
      riza: ['[teasing] Rıza Amcacım, şans da emekli olmamış.'],
      dursun: ['[teasing] Dursun Bey, şansı da mı ikram ettiniz?'],
      cem: ['[teasing] Cem, bu şansı çet mi bağışladı?', T('Cem, bu şansı chat mi bağışladı?')],
    },
    hurry: {
      riza: ['[sweetly] Rıza Amcacım, kartlar sizi bekliyor.'],
      dursun: ['[playfully] Dursun Bey, sipariş verseydim gelirdi!'],
      cem: ['[teasing] Cem, bağlantın mı koptu, canım?'],
    },
    bluffing: {
      riza: ['[teasing] Rıza Amcacım, bıyığınız ele verdi.'],
      dursun: ['[giggles] Dursun Bey, bu blöf veresiye mi?'],
      cem: ['[teasing] Cem, bu blöf filtresiz bile belli.'],
    },
  },
};

/** Hedefli söyleyişin kimliği (her gönderen × mesaj × hedef için tek söz). */
export const targetSayId = (sender: string, msg: string, target: string): string => `qc_${sender}_${msg}_${target}_1`;

// ───────────────────────── nötr ekler ─────────────────────────

/** Nötr söyleyiş havuzuna ek (kimlik qc_<kar>_<mesaj>_<no>; 31+ ki eski 1–4 numaralarla karışmasın). */
const NEUTRAL_SAY_MORE: Partial<Record<CharId, Record<string, [n: number, ...s: Say][]>>> = {
  // "Dursun, çaylar benden!" Dursun masada insanken söylenmez → adsız karşılığı
  riza: {tea: [[31, '[chuckles] Çaylar benden, evlat!'], [32, '[proudly] Herkese çay! Hesap benden.']]},
};

/** Menü sözü bir insan koltuğun avatarını anıyorsa (Rıza: "Dursun, çaylar benden!") bunun yerine gösterilir. */
export const NEUTRAL_LABELS: Partial<Record<CharId, Record<string, string>>> = {
  riza: {tea: 'Çaylar benden, evlat!'},
};

// ───────────────────────── ince havuzlara ek (oyun anları) ─────────────────────────
// Blöf 1'e 1'de açılış tepkileri (oyuncu boşa blöf dedi / botu yakaladı, bot boşa dedi) her elde birkaç kez gelir ve
// havuzlar 2–3 replikti; el başı repliği her elde. Pişti'de botun "şanslı alışı" elde ~1 kez, havuz 2 idi.

const MOMENT_MORE: Record<CharId, Partial<Record<VoiceMoment, MSpec[]>>> = {
  riza: {
    blofStart: [[31, '[chuckles] Yalan da sanattır evlat, ama ustasına yapılmaz.']],
    blofSurvivedPlayer: [[31, "[chuckles] Rıza'ya güvenmeyen yığını taşır evlat!"], [32, '[laughs] Şüphe iyidir evlat, ama bu sefer pahalı oldu!']],
    blofWrongCall: [[31, '[grumbling] Bu gözlük de artık eskidi.']],
    blofCaughtByPlayer: [[31, '[laughs] Vay evlat! Ustayı ustalıkla yakaladın.']],
    botLuckyCapture: [[31, '[chuckles] Kısmet evlat, kısmet.'], [32, '[proudly] Şans, hazır olana gelir.']],
    // "Dursun, gel bak!" Dursun masada insanken düşer; havuz tek replikte kalmasın
    botLeading: [[31, '[proudly] Usta önde, çırak arkada evlat.']],
  },
  dursun: {
    blofStart: [[31, '[laughs] Kartlar kapalı, yüzler açık! Başlayalım!']],
    blofSurvivedPlayer: [[31, '[laughs] Şüphe bedava değil kardeşim, yığın senin!'], [32, '[chuckles] Deftere yazdım: bir yığın borçlusun!']],
    blofWrongCall: [[31, '[groans] Burnum bu sefer nezle!']],
    blofCaughtByPlayer: [[31, '[laughs] Yakalandım! Deftere yazma ama!']],
    botLuckyCapture: [[31, '[laughs] Bunu da tepsiye koydum!'], [32, '[chuckles] Nazar boncuğu işe yaradı!']],
  },
  cem: {
    blofStart: [[31, '[excited] Kanka yalan makinesi açık, hazır mısın?']],
    blofSurvivedPlayer: [[31, '[laughs] Kanka yanlış alarm! Yığın senin, afiyet olsun!'], [32, '[laughs] Kanka trast işu sende, yığın da sende!', _, T('Kanka trust issue sende, yığın da sende!')]],
    blofWrongCall: [[31, '[groans] Kanka algoritmam yanlış öğrenmiş!']],
    blofCaughtByPlayer: [[31, '[gasps] Kanka sen hile mi açtın?!']],
    botLuckyCapture: [[31, '[laughs] Kanka lut düştü!', _, T('Kanka loot düştü!')], [32, '[chuckles] Bu el bana kıyak geçti.']],
  },
  defne: {
    blofStart: [[31, '[playfully] Herkes dürüst görünür… ilk yalana kadar.']],
    blofSurvivedPlayer: [[31, '[sweetly] Bu sefer doğruydu. Şaşırdın mı canım?'], [32, '[playfully] Güvensizlik çok çirkin. Yığın da öyle.']],
    blofWrongCall: [[31, '[sighs] Sezgim mola vermiş. Duymamış ol.']],
    blofCaughtByPlayer: [[31, '[giggles] Yakalandım… ama ne güzel yalandı, değil mi?']],
    botLuckyCapture: [[31, '[giggles] Kartlar da beni seviyor.'], [32, '[playfully] Tesadüf mü? Ben öyle demem.']],
  },
};

// ───────────────────────── derleme (saf) ─────────────────────────

const CHARS: readonly CharId[] = ['riza', 'cem', 'dursun', 'defne'];

/** Bu dosyanın bütün replikleri (registerLines'a verilir). Sıra kararlı. */
export function extraLines(): ExtraLine[] {
  const out: ExtraLine[] = [];
  for (const c of CHARS) {
    for (const [msg, says] of Object.entries(TEAM_SAY[c]))
      says.forEach(([tts, opt], i) => out.push({id: `qc_${c}_${msg}_${i + 1}`, char: c, moment: 'quickSay', tts, opt, pool: `${c}:${msg}`}));
    for (const [msg, byTarget] of Object.entries(TARGET_SAY[c]))
      for (const t of CHARS) {
        const s = byTarget[t];
        if (s) out.push({id: targetSayId(c, msg, t), char: c, moment: 'quickSay', tts: s[0], opt: s[1]});
      }
    for (const [msg, list] of Object.entries(NEUTRAL_SAY_MORE[c] ?? {}))
      for (const [n, tts, opt] of list) out.push({id: `qc_${c}_${msg}_${n}`, char: c, moment: 'quickSay', tts, opt, pool: `${c}:${msg}`});
    for (const [m, list] of Object.entries(MOMENT_MORE[c]) as [VoiceMoment, MSpec[]][])
      for (const [n, tts, mood, opt] of list) out.push({id: `${c}_${m}_${n}`, char: c, moment: m, tts, mood, opt});
  }
  return out;
}

/** Hedefli söyleyişi olan (gönderen, mesaj, hedef) üçlüsü var mı. */
export function hasTargetSay(sender: string, msg: string, target: string): boolean {
  return !!(TARGET_SAY as Record<string, Record<string, Partial<Record<string, Say>>> | undefined>)[sender]?.[msg]?.[target];
}
