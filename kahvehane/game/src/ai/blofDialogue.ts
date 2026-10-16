// Blöf replikleri (yalnız konuşma balonu; seslendirme sonra). Karakter başına an → replik listesi + seçim (tekrar etmez)
// + sıklık sınırı (blöf anları her zaman, laf atmalar seyrek). Pişti replikleri src/ai/dialogue.ts'te; ses aracı bu dosyayı okumaz.
import type {HudPose} from '../ui/types';

export type BlofMoment =
  | 'start' // el başladı
  | 'callOut' // bot "Blöf!" diyor (bağırış)
  | 'catchGloat' // bot yalanı yakaladı (kime olursa olsun)
  | 'catchPlayer' // bot, OYUNCUNUN yalanını yakaladı
  | 'caught' // botun yalanı yakalandı
  | 'caughtByPlayer' // botun yalanını OYUNCU yakaladı
  | 'wrongCall' // bot boşa blöf dedi (yığını kendisi aldı)
  | 'survived' // bota blöf dendi ama doğruydu (diyen yığını aldı)
  | 'survivedPlayer' // OYUNCU bota boşa blöf dedi
  | 'pass' // bot pas dedi
  | 'bigPile' // biri koca yığını aldı (izleyen bot)
  | 'nearWin' // bot bitirmeye yakın (1–2 kart)
  | 'playerNearWin' // oyuncu bitirmeye yakın
  | 'idle' // oyuncu uzun düşünüyor
  | 'botWin'
  | 'playerWin'
  | 'mateCheer'; // eşli: ortak güzel iş yaptı

type Lines = Partial<Record<BlofMoment, string[]>>;

const RIZA: Lines = {
  start: ['Blöf mü? Kırk yıldır yüzüme kimse yalan söyleyemedi evlat.', 'Bak gözümün içine. Yalanı buradan okurum.', 'Çaylar demlendi. Hadi bakalım, kim kandıracak kimi?'],
  callOut: ['BLÖF! Aç bakalım!', 'Yalan! Aç şunları!', 'Hop! Orada dur evlat!', 'Blöf! Bıyığım titredi!'],
  catchGloat: ['Hah! Yakaladım!', 'Kırk yıllık Rıza\'yı mı kandıracaksın?', 'Yalanın mumu yatsıya kadar yanar!', 'Gözlüğümü boşuna takmadım evlat.'],
  catchPlayer: ['Bana mı blöf evlat? Al yığını!', 'Hah! Yüzün kızardı, gördüm!', 'Yalancının mumu yatsıya kadar evlat!', 'Bu numaraları ben icat ettim!'],
  caught: ['Eh be… bir kere de yakalandık.', 'Tövbe tövbe… gözüm kaydı.', 'Hay aksi! Yaşlandık galiba.'],
  caughtByPlayer: ['Vay vay… beni yakaladın ha?', 'Aferin evlat, gözün keskin.', 'Hıh! Acemi şansı bu.', 'Peki peki… bu sefer sen kazandın.'],
  wrongCall: ['Hay aksi… doğruymuş.', 'Tüh! Yaşlılık işte.', 'Eh, kartlar da yalan söylemiyor artık.'],
  survived: ['Ben yalan söylemem evlat!', 'Doğruydu! Al bakalım yığını.', 'Rıza Amca\'ya güvenilir evlat.'],
  survivedPlayer: ['Doğruydu evlat! Al yığını, afiyet olsun.', 'Hah! Bana güvenmedin, al bakalım!', 'Rıza Amca yalan söyler mi hiç?'],
  pass: ['Pas.', 'Pas evlat.', 'Bu sefer pas.', 'Geçiyorum.'],
  bigPile: ['Vay, koca yığın gitti!', 'Bu yük ağır evlat.'],
  nearWin: ['Az kaldı evlat, az!', 'Son kartlar… dikkat et.'],
  playerNearWin: ['Dur bakalım evlat, acele etme!', 'Gözüm üstünde evlat.'],
  idle: ['Hadi evlat, çayım soğudu.', 'Kart atıyoruz, kız istemiyoruz!', 'Düşündükçe yalan belli olur evlat.'],
  botWin: ['Bitti! Ders bir: Rıza\'ya blöf yapılmaz.', 'Kırk yıllık tecrübe evlat!', 'Çaylar senden!'],
  playerWin: ['Helal olsun evlat, iyi oynadın.', 'Eh… bu sefer seninki tuttu.', 'Aferin! Ama rövanş var.'],
  mateCheer: ['Aferin ortak!', 'İşte benim ortağım!'],
};

const CEM: Lines = {
  start: ['Kanka olasılıklar benden yana.', 'Herkesin kartını sayıyorum, haberin olsun.', 'Blöf oranın kaç? Göreceğiz.'],
  callOut: ['Blöf! İhtimal düşük kanka!', 'Yok artık! Blöf!', 'Hesap tutmuyor, blöf!', 'Aç bakalım kanka!'],
  catchGloat: ['Hesapladığım gibi!', 'Data yalan söylemez kanka.', 'Yakalandın! Tahmin %92 idi.', 'Algoritma çalışıyor!'],
  catchPlayer: ['Kanka çok belliydi!', 'Yakaladım! Pattern çok net.', 'Bu blöfü uzaydan gördüm.'],
  caught: ['Kanka şans faktörü…', 'Bug var bende.', 'Olasılık bana kazık attı.'],
  caughtByPlayer: ['Nasıl anladın kanka?', 'Okay, iyi okudun.', 'Bunu loglara yazıyorum.'],
  wrongCall: ['Ne? Doğru muymuş?', 'Varyans kanka, varyans…', 'Model yanıldı.'],
  survived: ['Kanka ben dürüstüm!', 'Doğruydu, kusura bakma.', 'Hesap tamam, yığın senin.'],
  survivedPlayer: ['Doğruydu kanka! Yığın senin.', 'Bana güvenmedin, al bakalım!', 'Sürpriz! Hepsi doğru.'],
  pass: ['Pas.', 'Pas kanka.', 'Bu turu geçiyorum.', 'Pas, şimdilik.'],
  bigPile: ['Kanka o yığın çok büyük.', 'RIP el.'],
  nearWin: ['Son kartlar, kanka!', 'Bitiriyorum ha!'],
  playerNearWin: ['Dikkat, bitirmek üzere!', 'Kanka yavaş!'],
  idle: ['Kanka lag mı var?', 'Timeout yiyeceksin!', 'Hesap mı yapıyorsun?'],
  botWin: ['GG kanka!', 'Hesap tuttu!', 'Kazandım, istatistik konuştu.'],
  playerWin: ['GG, iyi oynadın kanka.', 'Bu sefer sen kazandın.', 'Rövanş istiyorum!'],
  mateCheer: ['Takım çalışması!', 'Efsane ortak!'],
};

const DURSUN: Lines = {
  start: ['Çaylar benden, yalanlar sizden!', 'Hoş geldin! Kartlar kapalı, yüzler açık.', 'Bu masada blöf yapanın çayı acı olur!'],
  callOut: ['Blöf! Kokusu buraya geldi!', 'Hop hop! Aç şunları!', 'Yalan bunlar, yalan!', 'Blöf! Çay ocağından gördüm!'],
  catchGloat: ['Hah! Çay ocağından gördüm!', 'Yakalandın, çaylar senden!', 'Maşallah bana, gözüm kartal!'],
  catchPlayer: ['Hah! Yakaladım seni!', 'Bana blöf olmaz, çay ocağı her şeyi görür!', 'Yüzünden okudum!'],
  caught: ['Hay aksi! Yakalandık!', 'Eh… çaylar benden o zaman.', 'Olsun, olsun!'],
  caughtByPlayer: ['Vay! Nasıl anladın?', 'Tamam tamam, yakaladın.', 'Ah, çay bardağına yansıdı herhalde!'],
  wrongCall: ['Hay Allah! Doğruymuş!', 'Eyvah, yığın bana kaldı.', 'Tüh, demlenmeden döktüm.'],
  survived: ['Doğruydu! Afiyet olsun yığın.', 'Ben dürüst adamım!', 'Al bakalım, çay da benden!'],
  survivedPlayer: ['Doğruydu! Afiyet olsun!', 'Bana güvenmedin ha? Al yığını!', 'Dürüst kahveci, dürüst kart!'],
  pass: ['Pas.', 'Pas geçiyorum.', 'Bu bana göre değil, pas.', 'Pas, çayımı içeyim.'],
  bigPile: ['Vay, bu yığın taşınmaz!', 'Hamal lazım buraya!'],
  nearWin: ['Az kaldı! Çaylar hazır olsun!', 'Bitiriyorum ha, dikkat!'],
  playerNearWin: ['Dur bakalım, o kadar hızlı değil!', 'Bitirecek, tutun onu!'],
  idle: ['Çay soğuyor, at hadi!', 'Düşünme o kadar, çay demlenir!', 'Hadi hadi!'],
  botWin: ['Bitti! Çaylar benden, gönülden!', 'Hah! Kazandım!', 'Kahvecinin şansı bugün açık!'],
  playerWin: ['Helal olsun! Çay benden!', 'Maşallah, iyi oynadın!', 'Bir el daha, hadi!'],
  mateCheer: ['Oh be! Helal ortak!', 'Maşallah ortak!'],
};

const DEFNE: Lines = {
  start: ['Kartlar konuşmaz. İnsanlar konuşur.', 'Sakin ol. Yüzün seni ele verir.', 'Başlayalım.'],
  callOut: ['Blöf.', 'Aç.', 'Hayır. Blöf.', 'Göster bakalım.'],
  catchGloat: ['Tahmin ettiğim gibi.', 'Gözlerin söyledi.', 'Kolaydı.'],
  catchPlayer: ['Çok belliydi.', 'Ellerin titriyordu.', 'Bir dahakine sakin ol.'],
  caught: ['Hmm.', 'İyi yakaladın.', 'Not aldım.'],
  caughtByPlayer: ['İyi okudun.', 'Bu sefer senin.', 'Hmm. Etkileyici.'],
  wrongCall: ['Yanıldım.', 'Hmm. Doğruymuş.', 'Bu bir kereydi.'],
  survived: ['Doğruydu.', 'Bana güvenmeliydin.', 'Yığın senin.'],
  survivedPlayer: ['Doğruydu. Yığın senin.', 'Güvenmedin. Kaybettin.', 'Acele ettin.'],
  pass: ['Pas.', 'Pas.', 'Geçiyorum.'],
  bigPile: ['Ağır yük.', 'Bu el zorlaştı.'],
  nearWin: ['Az kaldı.', 'Son kartlar.'],
  playerNearWin: ['Dikkat.', 'Bitirmek üzere.'],
  idle: ['Bekliyorum.', '…', 'Acele etme. Ama bekletme de.'],
  botWin: ['Bitti.', 'Beklediğim gibi.', 'İyi oyundu.'],
  playerWin: ['Tebrikler.', 'İyi oynadın.', 'Bir daha.'],
  mateCheer: ['Güzel.', 'İyi hamle, ortak.'],
};

const LINES: Record<string, Lines> = {riza: RIZA, cem: CEM, dursun: DURSUN, defne: DEFNE};

/** Anın varsayılan yüz ifadesi. */
export const BLOF_MOOD: Record<BlofMoment, HudPose | null> = {
  start: 'gulumseme',
  callOut: 'kizgin',
  catchGloat: 'kahkaha',
  catchPlayer: 'kahkaha',
  caught: 'uzgun',
  caughtByPlayer: 'saskin',
  wrongCall: 'saskin',
  survived: 'zafer',
  survivedPlayer: 'kahkaha',
  pass: null,
  bigPile: 'saskin',
  nearWin: 'gulumseme',
  playerNearWin: 'saskin',
  idle: 'dusunceli',
  botWin: 'zafer',
  playerWin: 'uzgun',
  mateCheer: 'kahkaha',
};

/** Laf atma anları seyrek (son konuşmadan en az GAP ms sonra, olasılıkla); diğerleri her zaman. */
const CHATTER: Partial<Record<BlofMoment, number>> = {pass: 0.45, bigPile: 0.5, nearWin: 0.7, playerNearWin: 0.6, idle: 1, mateCheer: 0.7};
const GAP = 2600;

export class BlofTalk {
  private recent = new Map<string, string[]>();
  private lastAt = -1e9;

  reset(): void {
    this.recent.clear();
    this.lastAt = -1e9;
  }

  /** Repliği seç (yoksa null). force: sıklık sınırını atla. */
  pick(charId: string, m: BlofMoment, force = false, now = performance.now()): string | null {
    const pool = LINES[charId]?.[m];
    if (!pool?.length) return null;
    const chance = CHATTER[m];
    if (!force && chance !== undefined) {
      if (now - this.lastAt < GAP || Math.random() >= chance) return null;
    }
    const key = charId + ':' + m;
    const hist = this.recent.get(key) ?? [];
    const cand = pool.filter(l => !hist.includes(l));
    const list = cand.length ? cand : pool;
    const line = list[Math.floor(Math.random() * list.length)];
    hist.push(line);
    while (hist.length > Math.max(1, pool.length - 1)) hist.shift();
    this.recent.set(key, hist);
    this.lastAt = now;
    return line;
  }
}

/** Rıza Amca'nın öğretici metinleri (ilk Blöf eli). */
export const TUTORIAL = {
  open: 'Turu sen açıyorsun evlat! Önce hangi değeri söyleyeceğini seç.',
  select: 'Kartına dokun: o değerden bir kart kalkar, basılı tutarsan hepsi. O değerden olmasa da olur… kimse görmüyor!',
  selectSpread: 'Atmak istediğin kartlara dokun (1–4 kart). O değerden olmasa da olur… kimse görmüyor!',
  play: 'Kartların kalktı! İstersen başka kart da ekle — yalan serbest. Sonra AT\'a bas.',
  blof: 'Kartları kapalı attım. İnanmıyorsan BLÖF de — ya da yığına dokun!',
  blofOther: 'Bu atışa inanıyor musun? İnanmıyorsan BLÖF de — ya da yığına dokun!',
  pass: 'O değerden varsa yeşil düğmeye dokun, hepsi kalksın. Yoksa PAS de — herkes pas derse son atan yeni turu açar.',
  done: 'İşte bu kadar evlat! Gerisi senin elinde. Önce kartlarını bitiren kazanır.',
};
