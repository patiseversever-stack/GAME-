// Blog yazıları. Her yazı yayına alınmadan önce Kemal Aksoy (ya da bir uzman) tarafından kontrol edilmelidir.
// draft: true olan yazı "Taslak · uzman kontrolü bekliyor" rozetiyle gösterilir ve arama motorlarına kapatılır (noindex).
// Kontrol bitince draft: false yapmak yeterli; rozet ve noindex kendiliğinden kalkar.
import type { Drawing, InsertShape } from './types';

export interface PostSection {
  /** Bağlantı kimliği (#id). Türkçe karakter yok, tire ile. */
  id: string;
  /** İçindekiler ve h2 başlığı */
  title: string;
  /** Bölüm gövdesi (HTML). Başlık eklenmez; h3 kullanılabilir. */
  html: string;
}

export interface PostLink { href: string; label: string; note: string }

export interface Post {
  slug: string;
  title: string;
  /** Liste kartı ve meta açıklaması */
  description: string;
  /** Yayın tarihi, YYYY-AA-GG */
  date: string;
  updated?: string;
  /** Tahmini okuma süresi (dakika). Verilmezse metinden hesaplanır. */
  readingMinutes: number;
  tags: string[];
  /** true: uzman kontrolü bekliyor → rozet + noindex */
  draft: boolean;
  /** Kapak çizimi: ürün çizimlerinden biri ya da 'vc' (kesme hızı şeması) */
  art: { drawing: Drawing | 'vc'; shape?: InsertShape; label: string };
  /** Giriş paragrafı (HTML) */
  intro: string;
  sections: PostSection[];
  /** Yazı sonundaki ilgili sayfalar */
  related: PostLink[];
  /** WhatsApp çağrısındaki hazır mesaj */
  waText: string;
}

/* ---------- Küçük HTML yardımcıları (yazı gövdeleri tutarlı görünsün diye) ---------- */

/** Kaydırılabilir tablo. İlk sütun satır başlığıdır. 4+ sütunlu tablolar mobilde yatay kaydırılır. */
function table(head: string[], rows: string[][], caption?: string) {
  const wide = head.length >= 4 ? ' class="t-wide"' : '';
  return `<div class="table-wrap" role="region" aria-label="${caption ?? head.join(', ')}" tabindex="0"><table${wide}>${
    caption ? `<caption>${caption}</caption>` : ''
  }<thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

/** Formül kutusu */
function formula(expr: string, unit: string, label?: string) {
  return `<div class="formula">${label ? `<span class="formula__label">${label}</span>` : ''}<code class="formula__expr">${expr}</code><span class="formula__unit">${unit}</span></div>`;
}

/** Adım adım çözülmüş örnek */
function example(title: string, given: string, steps: string[], result: string) {
  return `<div class="worked"><p class="worked__title">${title}</p><p class="worked__given">${given}</p><ol class="worked__steps">${steps
    .map((s) => `<li>${s}</li>`)
    .join('')}</ol><p class="worked__result">${result}</p></div>`;
}

/* ==========================================================================
   1) CNMG 120408 kod okuma
   ========================================================================== */
const cnmg: Omit<Post, 'readingMinutes'> = {
  slug: 'cnmg-120408-ne-demek',
  title: 'CNMG 120408 ne demek? Torna elmas uç kodunu harf harf okuma',
  description:
    'CNMG 120408 kodundaki her harf ve rakam bir ölçüyü anlatır. ISO 1832’ye göre şekil, boşluk açısı, tolerans, talaş kırıcı tipi, kenar uzunluğu, kalınlık ve köşe radyüsü tabloyla.',
  date: '2026-10-05',
  tags: ['Tornalama', 'ISO 1832', 'Elmas uç'],
  draft: true,
  art: { drawing: 'insert', shape: 'C', label: 'CNMG 120408' },
  intro: `<p>Tezgâh başında “bir kutu CNMG 12’lik, 08 radyüs” dendiğinde herkes ne istendiğini anlar. Ama kutunun üzerindeki <code>CNMG 120408</code> yazısı rastgele bir ürün numarası değildir. Ucun şeklini, açısını, toleransını, bağlama tipini ve ölçülerini tek satırda anlatan uluslararası bir koddur. Bu yazıda kodu harf harf okuyacağız. Sonunda DNMG, WNMG ya da CCMT gibi diğer kodları da aynı mantıkla kendiniz çözebileceksiniz.</p>`,
  sections: [
    {
      id: 'kodun-yapisi',
      title: 'Kodun yapısı: yedi zorunlu konum',
      html: `<p>Torna ve freze elmas uçlarının adlandırması <strong>ISO 1832</strong> standardına göre yapılır. Standart 13 sembole kadar tanım yapar, ama bunların yalnızca ilk yedisi zorunludur. Katalogda ve kutuda gördüğünüz kodun büyük bölümü bu yedi konumdan oluşur:</p>
${table(
  ['Konum', 'Sembol', 'Ne anlatır?', 'CNMG 120408’de'],
  [
    ['1', '<code>C</code>', 'Uç şekli (köşe açısı)', '80° eşkenar dörtgen'],
    ['2', '<code>N</code>', 'Serbest yüzey (boşluk) açısı', '0°, yani negatif uç'],
    ['3', '<code>M</code>', 'Tolerans sınıfı', 'M: preslenmiş, çevresi taşlanmamış'],
    ['4', '<code>G</code>', 'Delik ve talaş kırıcı tipi', 'Silindirik delik, iki yüzde talaş kırıcı'],
    ['5', '<code>12</code>', 'Kesme kenarı uzunluğu', '≈ 12,9 mm (iç teğet daire Ø12,7 mm)'],
    ['6', '<code>04</code>', 'Kalınlık', '4,76 mm'],
    ['7', '<code>08</code>', 'Köşe radyüsü', '0,8 mm'],
  ],
  'CNMG 120408 kodunun ISO 1832’ye göre okunuşu',
)}
<p>Bazı kodlarda bunların ardından kesme kenarı durumu (8. konum: F keskin, E honlanmış, T pahlı, S pahlı ve honlanmış) ve kesme yönü (9. konum: R sağ, L sol, N nötr) gelir. Negatif torna uçlarında bu iki konum çoğu zaman yazılmaz. Tireden sonraki harfler ise standardın değil, üreticinin talaş kırıcı kodudur. Ona aşağıda ayrıca değineceğiz.</p>`,
    },
    {
      id: 'uc-sekli',
      title: '1. harf, C: uç şekli',
      html: `<p>İlk harf ucun geometrik şeklini ve kesme köşesinin açısını verir. En sık karşılaşılanlar:</p>
<ul>
<li><strong>C</strong>: 80° eşkenar dörtgen. Hem boyuna hem alın tornalama yapabilen, en çok kullanılan genel amaçlı şekil.</li>
<li><strong>D</strong>: 55° eşkenar dörtgen. Profil ve kopya tornalamada daha iyi erişim sağlar.</li>
<li><strong>V</strong>: 35° eşkenar dörtgen. Derin profiller ve ince detaylar için. Köşesi en hassas olanıdır.</li>
<li><strong>W</strong>: 80° trigon (üç köşeli). C’ye benzer işler için, her yüzünde üç köşesiyle daha ekonomik.</li>
<li><strong>T</strong>: 60° üçgen, <strong>S</strong>: 90° kare, <strong>R</strong>: yuvarlak.</li>
</ul>
<p>Kural basit. Köşe açısı büyüdükçe kesme köşesi güçlenir ve kaba talaşa dayanır. Açı küçüldükçe uç dar yerlere girer ama köşe zayıflar. C ucu bu ikisinin dengesidir. Atölyede “standart uç” denince çoğunlukla akla CNMG gelmesinin sebebi de budur.</p>`,
    },
    {
      id: 'bosluk-acisi',
      title: '2. harf, N: negatif ve pozitif uç',
      html: `<p>İkinci harf ucun serbest yüzeyinin, yani yan yüzeyinin açısıdır. <strong>N = 0°</strong> demektir: ucun yan yüzeyleri üst yüzeye diktir. Böyle bir uç iş parçasına sürtmesin diye katere eğik olarak bağlanır. Boşluğu uç değil, kater sağlar. Buna <strong>negatif uç</strong> denir.</p>
<p>Negatif ucun en büyük avantajı iki yüzünün de kullanılabilmesidir. CNMG’nin her yüzünde iki adet 80° köşe vardır. Uç ters çevrildiğinde iki köşe daha kazanılır, toplam dört kesme köşesi olur. Kalın ve sağlam yapısıyla kaba ve orta talaş için idealdir.</p>
<p>İkinci harf N dışında bir şeyse (örneğin B = 5°, C = 7°, P = 11°) uç <strong>pozitiftir</strong>. Boşluk açısı ucun kendisindedir ve tek yüzü kullanılır. CCMT veya DCMT gibi pozitif uçlar daha düşük kesme kuvvetiyle çalışır. Küçük çaplarda, ince cidarlı parçalarda ve iç çap baralarında tercih edilir.</p>
<blockquote>Dikkat: CCMT’deki ilk C şekli (80°), ikinci C ise boşluk açısını (7°) anlatır. Aynı harf, konumuna göre farklı anlam taşır.</blockquote>`,
    },
    {
      id: 'tolerans',
      title: '3. harf, M: tolerans sınıfı',
      html: `<p>Üçüncü harf ucun ne kadar hassas üretildiğini gösterir. Tolerans üç ölçü için verilir: köşenin konumu (m), iç teğet daire çapı (d) ve kalınlık (s).</p>
${table(
  ['Sınıf', 'Köşe konumu (m)', 'İç teğet daire (d)', 'Kalınlık (s)'],
  [
    ['G', '±0,025 mm', '±0,025 mm', '±0,13 mm'],
    ['M', '±0,08 – 0,18 mm*', '±0,05 – 0,15 mm*', '±0,13 mm'],
  ],
  '* Ölçüye bağlıdır. Ø12,7 mm iç teğet dairede yaklaşık m ±0,13 mm, d ±0,08 mm.',
)}
<p><strong>M</strong>, torna uçlarında en yaygın sınıftır. Uç preslenip sinterlenir, çevresi taşlanmaz. Bu, seri üretimde fiyatı makul tutar. Pratikteki anlamı şudur: M sınıfı uçta köşe konumu toleransı G sınıfına göre birkaç kat geniştir. Hassas toleranslı çaplarda uç değiştirdikten ya da köşe çevirdikten sonra ilk parçayı ölçüp ofseti kontrol etmek iyi bir alışkanlıktır. Çevresi taşlanmış uçlar (CCGT, DCGT gibi) genellikle <strong>G</strong> sınıfındadır.</p>`,
    },
    {
      id: 'delik-tipi',
      title: '4. harf, G: delik ve talaş kırıcı',
      html: `<p>Dördüncü harf iki şeyi birden söyler: ucun ortasında bağlama deliği olup olmadığını ve talaş kırıcının kaç yüzde bulunduğunu.</p>
${table(
  ['Harf', 'Delik', 'Talaş kırıcı', 'Örnek'],
  [
    ['A', 'Silindirik delik', 'Yok', 'SNMA'],
    ['G', 'Silindirik delik', 'İki yüzde', 'CNMG, DNMG, WNMG'],
    ['M', 'Silindirik delik', 'Tek yüzde', 'CNMM'],
    ['N', 'Delik yok', 'Yok', 'SNGN'],
    ['R', 'Delik yok', 'Tek yüzde', '–'],
    ['T', 'Havşalı delik (40–60°)', 'Tek yüzde', 'CCMT, DCMT'],
    ['W', 'Havşalı delik (40–60°)', 'Yok', 'CCMW'],
  ],
  'ISO 1832, 4. konum: en sık görülen harfler',
)}
<p>CNMG’deki <strong>G</strong>, ucun ortasında silindirik bir delik olduğunu ve iki yüzünde de talaş kırıcı bulunduğunu gösterir. Çift taraflı kullanılabilmesinin sebebi budur. Bu uçlar katerde kolla ya da üstten pabuçla sıkılır. PCLNR, DCLNR veya MCLNR gibi negatif uç katerleri bu tipe göredir. CCMT’deki <strong>T</strong> ise havşalı delik demektir: uç ortasından vidayla, SCLCR gibi vidalı katerlere bağlanır. Yani dördüncü harf, hangi katere uyacağının da ilk ipucudur.</p>`,
    },
    {
      id: 'olculer',
      title: 'Rakamlar: 12, 04 ve 08',
      html: `<h3>12: kesme kenarı uzunluğu</h3>
<p>İlk iki rakam, kesme kenarının milimetre cinsinden uzunluğudur (ondalık kısmı atılır). C ucunda bu değer yaklaşık 12,9 mm’dir. Uç, Ø12,7 mm’lik (1/2 inç) bir iç teğet daireye göre üretilir. İç teğet daire aynı kalsa da kenar uzunluğu şekle göre değişir, rakam da onunla birlikte değişir:</p>
${table(
  ['Şekil', 'Ø12,7 mm için kod', 'Örnek kod'],
  [
    ['C (80°)', '12', 'CNMG 120408'],
    ['D (55°)', '15', 'DNMG 150608'],
    ['T (60°)', '22', 'TNMG 220408'],
    ['W (80° trigon)', '08', 'WNMG 080408'],
  ],
  'Aynı iç teğet daire, farklı şekil: boy kodu değişir',
)}
<p>Yani CNMG 120408 ile DNMG 150608’in iç teğet dairesi aynıdır. Rakamların farklı olmasının sebebi şekildir; kalınlık ise ayrıca 6. konumda yazar.</p>
<h3>04: kalınlık</h3>
<p>Üçüncü rakam çifti ucun kalınlığıdır, ama doğrudan milimetre değildir; kodlar inç kesirlerinden gelir. En sık görülenler: <code>02</code> = 2,38 mm, <code>03</code> = 3,18 mm, <code>T3</code> = 3,97 mm, <code>04</code> = 4,76 mm, <code>06</code> = 6,35 mm. CNMG 120408 4,76 mm kalınlığındadır. CCMT 09T304’teki <code>T3</code> de bu listeden okunur.</p>
<h3>08: köşe radyüsü</h3>
<p>Son iki rakam köşe radyüsünün on katıdır: <code>04</code> = 0,4 mm, <code>08</code> = 0,8 mm, <code>12</code> = 1,2 mm. Radyüs seçimi, yüzey kalitesi ile köşe dayanımı arasında bir tercihtir:</p>
<ul>
<li><strong>0,4 mm:</strong> finiş, ince ve narin parçalar, düşük kesme kuvveti. Titreşim eğilimi azdır.</li>
<li><strong>0,8 mm:</strong> genel amaçlı. Atölyede en çok tüketilen radyüs budur.</li>
<li><strong>1,2 mm ve üstü:</strong> kaba talaş, yüksek ilerleme, kesintili kesme. Köşe daha dayanıklıdır.</li>
</ul>
<p>Aynı ilerlemede radyüsü büyütmek teorik yüzey pürüzlülüğünü düşürür: radyüs iki katına çıkınca teorik pürüz kabaca yarıya iner. Ancak büyük radyüs radyal kuvveti artırır ve ince uzun parçalarda tırlamaya yol açabilir. İyi bir başlangıç kuralı, ilerlemeyi köşe radyüsünün yarısının altında tutmaktır.</p>`,
    },
    {
      id: 'talas-kirici',
      title: 'Tireden sonrası: talaş kırıcı ve kalite',
      html: `<p>Kutuda çoğu zaman kodun devamını da görürsünüz: <code>CNMG 120408-MA</code>, <code>-PM</code>, <code>-MP</code>, <code>-GS</code> gibi. Tireden sonraki bu harfler ISO 1832’nin parçası değildir. Her üretici kendi talaş kırıcı geometrisine kendi adını verir, bu yüzden aynı harfler farklı markalarda farklı bir geometriyi anlatabilir.</p>
<p>Talaş kırıcı, talaşın nasıl kıvrılıp kırılacağını belirler. Genellikle finiş, orta ve kaba işlem için ayrı geometriler bulunur, bazen de malzeme grubuna (çelik, paslanmaz, döküm) göre ayrı seriler olur. Doğru talaş kırıcıyı seçmek için markanın seçim tablosuna, özellikle önerilen ilerleme ve kesme derinliği aralığına bakmak gerekir.</p>
<p>Etikette ayrıca bir <strong>kalite</strong> (grade) kodu bulunur. Bu kod karbürün cinsini ve kaplamasını anlatır ve yine markaya özeldir. Teklif isterken talaş kırıcı ve kalite bilgisi en az ISO kodu kadar önemlidir.</p>`,
    },
    {
      id: 'teklif-isterken',
      title: 'Teklif isterken neleri yazmalı?',
      html: `<p>Doğru ucu ilk seferde bulmak için şu bilgileri birlikte göndermeniz yeterli:</p>
<ol>
<li>ISO kodu, örneğin <code>CNMG 120408</code></li>
<li>Varsa talaş kırıcı ve kalite kodu (kutu etiketinin fotoğrafı da olur)</li>
<li>İşlenen malzeme: 42CrMo4, AISI 304, GG25 dökme demir gibi</li>
<li>İşlem: kaba, orta ya da finiş; dış çap mı, alın mı?</li>
<li>Kullandığınız kater kodu, örneğin PCLNR 2525 M12</li>
</ol>
<p>Kodları ezberlemeye gerek yok. Mantığı bir kez oturdu mu, WNMG 080408’in 80° trigon, negatif, M toleranslı, çift taraflı, Ø12,7 mm iç teğet daireli, 4,76 mm kalınlığında ve 0,8 mm radyüslü bir uç olduğunu kendiniz okursunuz. Teknik araçlar sayfasındaki kod çözücü de aynı işi saniyeler içinde yapar.</p>`,
    },
  ],
  related: [
    { href: '/teknik-araclar', label: 'ISO kod çözücü', note: 'Uç kodunu yazın, her konumun anlamını görün.' },
    { href: '/kategori/tornalama', label: 'Torna elmas uçları', note: 'CNMG, DNMG, WNMG ve pozitif uçlar.' },
    { href: '/urunler', label: 'Tüm katalog', note: 'Kodla arayın, teklif sepetine ekleyin.' },
  ],
  waText: 'Merhaba Aksoy Kesici Takımlar, CNMG 120408 torna elmas ucu için teklif almak istiyorum. Malzeme: … Adet: …',
};

/* ==========================================================================
   2) Kesme hızı ve devir hesabı
   ========================================================================== */
const vc: Omit<Post, 'readingMinutes'> = {
  slug: 'kesme-hizi-ve-devir-hesaplama',
  title: 'Kesme hızı ve devir nasıl hesaplanır? (Vc, n, f formülleri)',
  description:
    'Kataloğun verdiği kesme hızını tezgâhın istediği devir ve ilerlemeye çevirin: tornalama, frezeleme, delme ve kılavuz için formüller, birimler, çözülmüş örnekler ve başlangıç değerleri.',
  date: '2026-10-05',
  tags: ['Hesaplama', 'Tornalama', 'Frezeleme'],
  draft: true,
  art: { drawing: 'vc', label: 'n = 1000·Vc / π·D' },
  intro: `<p>Uç kutusu ya da katalog size bir <strong>kesme hızı</strong> verir: örneğin 200 m/dk. Tezgâh ise sizden <strong>devir</strong> (S) ve <strong>ilerleme</strong> (F) ister. Bu ikisi arasındaki köprü birkaç basit formülden ibarettir. Bu yazıda formülleri birimleriyle veriyor, her birini atölyeden bir örnekle adım adım hesaplıyoruz.</p>`,
  sections: [
    {
      id: 'kavramlar',
      title: 'Önce kavramlar ve birimler',
      html: `${table(
        ['Sembol', 'Anlamı', 'Birim'],
        [
          ['Vc', 'Kesme hızı: kesici kenarın malzeme yüzeyine göre hızı', 'm/dk'],
          ['n', 'Devir sayısı (fener mili ya da takım)', 'dev/dk'],
          ['D', 'Çap: tornada iş parçasının, frezede ve delmede takımın çapı', 'mm'],
          ['fn', 'Devir başına ilerleme', 'mm/dev'],
          ['fz', 'Diş başına ilerleme (frezeleme)', 'mm/diş'],
          ['z', 'Takımın ağız (diş) sayısı', '–'],
          ['Vf', 'İlerleme hızı (tabla ilerlemesi)', 'mm/dk'],
          ['ap', 'Kesme derinliği', 'mm'],
        ],
        'Bu yazıda kullanılan semboller',
      )}
<p>En sık yapılan hata çapı karıştırmaktır. Tornada D, kesilen noktadaki <strong>iş parçası çapıdır</strong>. Frezede ve delmede ise <strong>takımın çapıdır</strong>.</p>`,
    },
    {
      id: 'devir-formulu',
      title: 'Devir formülü',
      html: `<p>Kesme hızı metre/dakika, çap ise milimetre cinsinden olduğu için formüldeki 1000 sadece birim çevirisidir. π × D, bir turda kesici kenarın aldığı yoldur.</p>
${formula('n = (Vc × 1000) / (π × D)', 'dev/dk', 'Devir')}
${formula('Vc = (π × D × n) / 1000', 'm/dk', 'Kesme hızı (ters yönde)')}
${example('Örnek 1 · Tornalama', 'Ø60 mm C45 mil, kaplamalı karbür uç, Vc = 200 m/dk', ['π × D = 3,1416 × 60 = 188,5', 'n = 200 × 1000 / 188,5'], 'n ≈ 1061 dev/dk')}
${example('Örnek 2 · Frezeleme', 'Ø10 mm, 4 ağızlı karbür parmak freze, çelik, Vc = 120 m/dk', ['π × D = 3,1416 × 10 = 31,42', 'n = 120 × 1000 / 31,42'], 'n ≈ 3820 dev/dk')}
<p>Hesapladığınız devir tezgâhın üst sınırını aşıyorsa, tezgâhın verebildiği en yüksek devri kullanın ve ilerleme hızını bu devre göre yeniden hesaplayın. Gerçek kesme hızınız katalog değerinin altında kalır. Bu genellikle bir sorun değildir, sadece verim düşer.</p>`,
    },
    {
      id: 'g96-devir-siniri',
      title: 'Tornada sabit kesme hızı (G96) ve devir sınırı',
      html: `<p>CNC tornada çoğu zaman devri değil, doğrudan kesme hızını programlarsınız. <code>G96 S200</code>, “kesme hızını 200 m/dk’da sabit tut” demektir. Çap küçüldükçe kontrol ünitesi devri kendiliğinden artırır. Ø60’ta 1061 dev/dk olan devir Ø10’da 6366 dev/dk’ya çıkar. Alın tornalamada merkeze yaklaştıkça teorik olarak sonsuza gider.</p>
<p>Bu yüzden G96 kullanırken mutlaka bir devir sınırı verin. Fanuc tipi kontrollerde bu genellikle <code>G50 S…</code> ile yapılır; bazı kontrollerde G92 ya da ayrı bir parametre kullanılır. Sınırı belirlerken yalnızca tezgâhı değil, aynanın ve bağlanan parçanın güvenli devrini de düşünün.</p>
<p>Merkezde çalışan delme ve kılavuz çekme işlemlerinde <code>G97</code> ile sabit devre geçilir.</p>`,
    },
    {
      id: 'ilerleme',
      title: 'İlerleme: fn, fz ve Vf',
      html: `<h3>Tornalama ve delme</h3>
${formula('Vf = fn × n', 'mm/dk', 'İlerleme hızı')}
<p>Tornada ilerleme çoğunlukla devir başına (mm/dev) programlanır. F0.25 yazdığınızda dakikadaki ilerleme devirle birlikte kendiliğinden değişir. Örnek 1’deki mil için fn = 0,25 mm/dev seçersek: Vf = 0,25 × 1061 ≈ 265 mm/dk.</p>
${example('Örnek 3 · Delme', 'Ø8,5 mm karbür matkap (M10 kılavuz ön deliği), çelik, Vc = 80 m/dk, fn = 0,15 mm/dev', ['n = 80 × 1000 / (3,1416 × 8,5) ≈ 2996 dev/dk', 'Vf = 0,15 × 2996'], 'Vf ≈ 449 mm/dk')}
<h3>Frezeleme</h3>
${formula('Vf = fz × z × n', 'mm/dk', 'Tabla ilerlemesi')}
<p>Frezede katalog diş başına ilerleme (fz) verir, çünkü her ağız ayrı bir talaş kaldırır. Örnek 2’deki parmak freze için fz = 0,04 mm/diş seçersek: Vf = 0,04 × 4 × 3820 ≈ 611 mm/dk.</p>
<p>Diş başına ilerlemeyi çok düşük tutmak tasarruf değildir. Ağız malzemeyi kesmek yerine ezer ve sürter, takım çabuk ısınır. Paslanmazda bu, yüzeyin pekleşmesine ve takımın erken körelmesine yol açar.</p>
<h3>Kılavuz çekme</h3>
${formula('Vf = P × n', 'mm/dk', 'P: hatve')}
<p>Kılavuzda ilerleme seçilmez, hatveye eşittir. M10 × 1,5 kılavuzu 300 dev/dk’da çekiyorsanız: Vf = 1,5 × 300 = 450 mm/dk. Rijit kılavuz çekmede, devir başına ilerleme modunda F değeri doğrudan hatvedir (F1.5).</p>`,
    },
    {
      id: 'talas-kaldirma',
      title: 'Talaş kaldırma oranı (Q)',
      html: `${formula('Q = Vc × ap × fn', 'cm³/dk', 'Tornalama')}
<p>Bir dakikada kaldırdığınız talaş hacmi, farklı kesme değerlerini karşılaştırmanın en kolay yoludur. Örnek 1’deki milde ap = 2 mm ve fn = 0,25 mm/dev ile: Q = 200 × 2 × 0,25 = 100 cm³/dk.</p>
<p>Verimi artırmak istediğinizde genel kural şudur: önce kesme derinliğini, sonra ilerlemeyi, en son kesme hızını artırın. Takım ömrünü en çok etkileyen değer kesme hızıdır.</p>`,
    },
    {
      id: 'baslangic-degerleri',
      title: 'Tipik başlangıç değerleri',
      html: `<p class="note"><strong>Yalnızca başlangıç noktası.</strong> Aşağıdaki aralıklar kaba bir yol haritasıdır. Kullandığınız ucun kutusunda veya markanın kataloğunda yazan değer her zaman önceliklidir. Tezgâhın rijitliği, bağlama, soğutma ve uç kalitesi doğru değeri ciddi biçimde değiştirir.</p>
${table(
  ['Malzeme grubu', 'Tornalama (kaplamalı karbür uç)', 'Frezeleme (karbür parmak freze)', 'Delme (karbür matkap)'],
  [
    ['P · Çelik', '150–300', '80–180', '70–120'],
    ['M · Paslanmaz', '100–200', '60–100', '40–70'],
    ['K · Dökme demir', '150–300', '100–180', '70–120'],
    ['N · Alüminyum', '300–1000', '300–600', '150–300'],
    ['S · Süper alaşım, titanyum', '30–80', '30–60', '20–40'],
    ['H · Sertleştirilmiş çelik', '80–200 (CBN uç)', '60–100 (45–55 HRC)', '30–60'],
  ],
  'Kesme hızı Vc için başlangıç aralıkları (m/dk). Katalog değeri esastır.',
)}
<p>Tornada devir başına ilerleme için kaba bir yol haritası: finişte 0,05–0,15 mm/dev, orta işlemede 0,15–0,35 mm/dev, kabada 0,3–0,6 mm/dev. Seçtiğiniz değer talaş kırıcının katalogdaki çalışma aralığının içinde kalmalıdır. Karbür matkapta çelik için devir başına ilerleme genellikle çapın yüzde 1–2’si kadardır; Ø10 matkapta 0,10–0,20 mm/dev gibi. HSS matkaplarda kesme hızı çok daha düşüktür: çelikte yaklaşık 20–30 m/dk.</p>`,
    },
    {
      id: 'sahada-ince-ayar',
      title: 'Sahada ince ayar: talaş ne söylüyor?',
      html: `<p>Hesap sizi doğru bölgeye getirir; son ayarı talaş ve uç yapar.</p>
<ul>
<li><strong>Serbest yüzeyde hızlı aşınma:</strong> kesme hızı yüksek. Vc’yi yüzde 10–20 düşürün.</li>
<li><strong>Kenarda ufalanma, kırılma:</strong> ilerleme fazla ya da bağlama zayıf olabilir. İlerlemeyi azaltın, daha tok bir kalite deneyin.</li>
<li><strong>Uca yapışan malzeme (yığıntı talaş):</strong> özellikle alüminyumda ve düşük karbonlu çelikte görülür. Kesme hızını artırın; keskin, pozitif uç ve bol soğutma kullanın.</li>
<li><strong>Uzun, kırılmayan talaş:</strong> ilerleme ya da kesme derinliği talaş kırıcının aralığının altında kalmış olabilir. Değerleri artırın ya da talaş kırıcıyı değiştirin.</li>
<li><strong>Titreşim (tırlama):</strong> devri biraz değiştirin, taşma boyunu kısaltın, gerekirse daha küçük köşe radyüsüne geçin.</li>
</ul>
<p>Hesap makinesiyle uğraşmak istemiyorsanız <a href="/teknik-araclar">teknik araçlar</a> sayfasındaki hesaplayıcıya çapı ve kesme hızını girin; devri ve ilerleme hızını anında verir.</p>`,
    },
  ],
  related: [
    { href: '/teknik-araclar', label: 'Devir ve ilerleme hesaplayıcı', note: 'Tornalama, frezeleme, delme ve kılavuz.' },
    { href: '/kategori/frezeleme', label: 'Karbür parmak frezeler', note: 'Çelik, paslanmaz ve alüminyum için.' },
    { href: '/urunler', label: 'Tüm katalog', note: 'Kodla arayın, teklif sepetine ekleyin.' },
  ],
  waText: 'Merhaba Aksoy Kesici Takımlar, işimiz için uygun kesici takım ve kesme değerleri hakkında bilgi ve teklif almak istiyorum. Malzeme: … İşlem: …',
};

/* ==========================================================================
   3) U-matkap
   ========================================================================== */
const udrill: Omit<Post, 'readingMinutes'> = {
  slug: 'u-matkap-nedir',
  title: 'U-matkap (uçlu matkap) nedir, ne zaman tercih edilir?',
  description:
    'Uçlu U-matkap nasıl çalışır? Merkez ve çevre uçları, 2xD–5xD boy seçimi, içten soğutma, karbür matkapla karşılaştırma ve tornada ya da işleme merkezinde verimli kullanım için ipuçları.',
  date: '2026-10-05',
  tags: ['Delik delme', 'U-matkap'],
  draft: true,
  art: { drawing: 'drill-u', label: 'U-DRILL · 4×D' },
  intro: `<p>Atölyede kimi “U-drill”, kimi “uçlu matkap”, kimi “takma uçlu matkap” der; hepsi aynı takımı anlatır. Gövdesi çeliktir, kesici kenarları ise vidayla bağlanan, değiştirilebilir karbür uçlardır. Ø20 mm ve üzeri deliklerde, özellikle CNC tornada, karbür matkaba göre çok daha ekonomik olabilir. Ama her deliğe uygun değildir. Bu yazıda U-matkabın nasıl çalıştığını, nerede öne çıktığını ve nerede karbür matkaba yol vermesi gerektiğini anlatıyoruz.</p>`,
  sections: [
    {
      id: 'nasil-calisir',
      title: 'Nasıl çalışır? Merkez ve çevre ucu',
      html: `<p>U-matkabın başında genellikle iki takma uç bulunur:</p>
<ul>
<li><strong>Merkez ucu</strong>, deliğin ortasından başlayarak iç bölgeyi keser. Merkeze yakın bölgede kesme hızı neredeyse sıfıra düşer; bu uç düşük hızda ve yüksek baskı altında çalışır, bu yüzden tok bir kalite ister.</li>
<li><strong>Çevre ucu</strong>, deliğin dış bölgesini keser ve çapı belirler. Tam kesme hızında çalıştığı için aşınmaya dayanıklı bir kalite ister.</li>
</ul>
<p>İki ucun kesme bölgeleri birbirinin üzerine biner ve deliği dolu malzemeden tek seferde açar. Punta ya da ön delik gerekmez. Bazı serilerde iki cebe aynı uç takılır, bazılarında merkez ve çevre için ayrı geometri veya kalite önerilir. Uç tipi markaya göre değişir; kare (SPMG gibi), trigon (WCMX gibi) ya da markaya özel şekiller yaygındır.</p>
<p>Kesme kuvvetleri iki uç arasında tam olarak dengelenmez. Bu yüzden U-matkap rijit bir bağlama ve iyi hizalanmış bir tezgâh ister. Aynı özellik tornada bir avantaja dönüşür: matkabı X ekseninde biraz kaydırarak deliği belirli bir aralıkta büyütebilirsiniz. İzin verilen kaydırma miktarı için üreticinin tablosuna bakın.</p>`,
    },
    {
      id: 'boy-secimi',
      title: '2xD, 3xD, 4xD, 5xD: boy seçimi',
      html: `<p>U-matkaplar delebildikleri derinliğe göre sınıflanır. <strong>2xD</strong> gövde, matkap çapının iki katı derinliğe kadar deler. Ø25 mm’lik 4xD bir matkap yaklaşık 100 mm derinliğe kadar delik açar. Yaygın boylar 2xD’den 5xD’ye kadardır.</p>
<p>Kural: işi yapan en kısa boyu seçin. Kısa gövde daha rijittir; daha yüksek ilerlemeyle çalışır, daha düzgün delik açar ve uç ömrü uzar. 4xD ve 5xD gövdelerde talaş tahliyesi ve soğutma çok daha kritik hale gelir. Bu boylarda giriş ve çıkışta ilerlemeyi azaltmak ve soğutma basıncını kontrol etmek gerekir.</p>
<p>U-matkaplar genellikle Ø12–14 mm civarından başlar; daha küçük çaplarda karbür matkap tek gerçek seçenektir. Saplar çoğunlukla Weldon tipidir: sapın yan yüzeyi düzdür ve tutucuda vidayla sıkılır.</p>`,
    },
    {
      id: 'sogutma',
      title: 'Soğutma: içten ve bol',
      html: `<p>Gövdenin içinden geçen kanallar soğutma sıvısını doğrudan uçlara taşır. Bu sıvının görevi yalnızca soğutmak değildir; asıl görevi <strong>talaşı oluktan dışarı itmektir</strong>. Talaş oluğa sıkışırsa önce yüzey bozulur, sonra uç kırılır.</p>
<ul>
<li>U-matkap içten soğutmayla çalışacak şekilde tasarlanır. Dıştan soğutma ancak çok kısa deliklerde ve düşük değerlerle idare eder.</li>
<li>Uzun boylarda ve işleme merkezinde dikey delmede gereken basınç artar. Minimum basınç ve debi değerleri katalogda verilir.</li>
<li>Tornada taretten içten soğutma yoksa, soğutma girişi olan bir matkap tutucu (adaptör) kullanılabilir.</li>
<li>Bor yağı (emülsiyon) oranını düzenli kontrol edin. Çok sulu emülsiyon hem yağlamayı hem uç ömrünü düşürür.</li>
</ul>`,
    },
    {
      id: 'karbur-matkapla-karsilastirma',
      title: 'U-matkap mı, karbür matkap mı?',
      html: `${table(
        ['', 'U-matkap (uçlu)', 'Karbür matkap (yekpare)'],
        [
          ['Çap aralığı', 'Genellikle Ø12–14 mm ve üzeri', 'Küçük çaplardan Ø20 mm civarına kadar yaygın'],
          ['Derinlik', '2xD – 5xD', '3xD, 5xD, 8xD ve çok daha uzun seçenekler'],
          ['Delik toleransı ve yüzey', 'Daha geniş tolerans; hassas delikte sonradan bara veya rayba gerekir', 'Daha dar tolerans, daha iyi yüzey'],
          ['Kenar körelince', 'Uç çevrilir veya değiştirilir, gövde tezgâhta kalır', 'Bilemeye gönderilir ya da yenisi alınır'],
          ['Delik başı maliyet', 'Büyük çaplarda genellikle daha düşük', 'Küçük ve orta çaplarda avantajlı'],
          ['Tezgâh gereksinimi', 'Yüksek güç ve rijitlik, içten soğutma', 'Daha az güç; içten soğutma tercih edilir'],
          ['Esneklik', 'Tornada X kaydırmayla çap ayarı; eğik yüzeyden giriş mümkün', 'Çap sabit'],
        ],
        'U-matkap ile yekpare karbür matkabın karşılaştırması',
      )}
<p>Kısacası: delik Ø20 mm civarı ve üzerindeyse, derinlik 5xD’yi geçmiyorsa ve tolerans çok dar değilse U-matkap genellikle daha ekonomiktir. Daha küçük çaplarda ve derin deliklerde karbür matkap, H7 gibi hassas toleranslarda ise delme sonrası rayba ya da bara daha doğru seçimdir.</p>`,
    },
    {
      id: 'sahadan-ipuclari',
      title: 'Sahadan ipuçları',
      html: `<ol>
<li><strong>Hizayı kontrol edin.</strong> Tornada matkap ekseni ile fener mili ekseni aynı hizada olmalıdır. Kaçıklık, çapın büyümesine ve merkez ucunun kırılmasına yol açar.</li>
<li><strong>Uç vidasını doğru torkla sıkın.</strong> Cebi temizleyin, vidayı tork anahtarıyla sıkın. Fazla sıkılan vida da gevşek vida kadar sorun çıkarır; aşınan vidaları yenileyin.</li>
<li><strong>Giriş ve çıkışta ilerlemeyi azaltın.</strong> Eğik, düzgün olmayan ya da döküm kabuğu olan yüzeylerden girerken ve boydan boya deliklerin çıkışında ilerlemeyi geçici olarak düşürün.</li>
<li><strong>Çıkışta oluşan pula dikkat edin.</strong> Tornada boydan boya delerken delik çıkışında ortadan bir disk (pul) kopabilir ve hızla fırlayabilir. Kapı kapalı çalışın.</li>
<li><strong>Uçları okuyun.</strong> Çevre ucu hızlı aşınıyorsa kesme hızı yüksek olabilir. Merkez ucu ufalanıyor ya da kırılıyorsa ilerleme fazla, hiza bozuk veya soğutma yetersiz olabilir.</li>
<li><strong>Talaşa bakın.</strong> Kısa ve kıvrık (C şeklinde) talaş iyidir. Uzun, sarılan talaş oluğu tıkar; ilerlemeyi ya da uç geometrisini değiştirin.</li>
<li><strong>Doğru değerle başlayın.</strong> Çoğu katalog U-matkap için karbür matkaba göre daha yüksek kesme hızı, ama daha düşük devir başı ilerleme verir. Başlangıç değerini uç kutusundan veya katalogdan alın.</li>
</ol>`,
    },
    {
      id: 'ne-zaman',
      title: 'En verimli olduğu işler',
      html: `<p>Flanş delikleri, kalıp ve bağlama plakaları, tornada mil ve burç gövdelerinde büyük çaplı ön delikler U-matkabın en verimli olduğu işlerdir. Tek gövdeyle farklı malzemeler için farklı kalite uçlar kullanabilmek de stok açısından avantajdır.</p>
<p>Delik çapınızı, derinliğini, malzemenizi ve tezgâhınızı yazın; uygun gövde ve uç kombinasyonunu birlikte seçelim.</p>`,
    },
  ],
  related: [
    { href: '/kategori/delik-delme', label: 'Uçlu U-matkaplar', note: '2xD–5xD gövdeler ve uçları.' },
    { href: '/teknik-araclar', label: 'Delme hesaplayıcı', note: 'Devir ve ilerleme hızını hesaplayın.' },
    { href: '/urunler', label: 'Tüm katalog', note: 'Kodla arayın, teklif sepetine ekleyin.' },
  ],
  waText: 'Merhaba Aksoy Kesici Takımlar, U-matkap (uçlu matkap) için teklif almak istiyorum. Çap: … Derinlik: … Malzeme: …',
};

/* ---------- Okuma süresi: düz metin kelime sayısı / dakikada ~180 kelime ---------- */
function plainText(p: Omit<Post, 'readingMinutes'>) {
  return [p.intro, ...p.sections.map((s) => `${s.title} ${s.html}`)].join(' ').replace(/<[^>]+>/g, ' ');
}
export function wordCount(p: Omit<Post, 'readingMinutes'>) {
  return plainText(p).split(/\s+/).filter(Boolean).length;
}

export const posts: Post[] = [cnmg, vc, udrill]
  .map((p) => ({ ...p, readingMinutes: Math.max(1, Math.round(wordCount(p) / 180)) }))
  .sort((a, b) => b.date.localeCompare(a.date));

export const postBySlug = Object.fromEntries(posts.map((p) => [p.slug, p]));

/** Arama motorlarına kapalı yazıların yolları (site haritasından çıkarmak için). */
export const draftPostPaths = posts.filter((p) => p.draft).map((p) => `/blog/${p.slug}`);
