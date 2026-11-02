# Harita soru bankası üreticisi: kaynak tablo → src/data/q/harita.js
# Kullanım (oyun kökünden): python3 tools/harita_uret.py · yapı konumları tools/harita_yapilar.json (oyundaki landmarks.sites dökümü)
# Alan türleri: il (il sınırı), gol (göl kıyısı), r (yarıçap km), site (haritadaki maket: alt koordinat), peak (kabartma doruğu)
import json
K, LON0, LAT0 = 6, 35.2, 39.0
import math
COS0 = math.cos(math.radians(LAT0))
sites = {s['k']: s for s in json.load(open('tools/harita_yapilar.json'))}
D = json.load(open('src/data/turkiye.json'))
provs = {p['name']: p for p in D['provinces']}
lakes = {l['name'] for l in D['lakes']}
peaks = {p['name']: p for p in D['peaks']}
def w2ll(x, z): return round(LAT0 - z / K, 3), round(x / (COS0 * K) + LON0, 3)

# (kat, zorluk, soru, lat, lon, tür)
T = [
 # ---------------- coğrafya · iller (ilin içine dokunmak tam isabet)
 ('cografya',1,"İki kıtaya yayılan İstanbul ili nerede?",41.01,28.98,{'il':'İstanbul'}),
 ('cografya',1,"Cumhuriyet'in başkenti Ankara ili nerede?",39.93,32.86,{'il':'Ankara'}),
 ('cografya',1,"Ege'nin incisi İzmir ili nerede?",38.42,27.14,{'il':'İzmir'}),
 ('cografya',1,"Turizmin başkenti Antalya ili nerede?",36.9,30.69,{'il':'Antalya'}),
 ('cografya',1,"Yüzölçümü en büyük il olan Konya nerede?",37.87,32.48,{'il':'Konya'}),
 ('cografya',1,"Baklavasıyla dünyaca ünlü Gaziantep ili nerede?",37.07,37.38,{'il':'Gaziantep'}),
 ('cografya',1,"Kara bazalt surlarıyla ünlü Diyarbakır ili nerede?",37.91,40.24,{'il':'Diyarbakır'}),
 ('cografya',1,"Palandöken'in eteğindeki Erzurum ili nerede?",39.9,41.27,{'il':'Erzurum'}),
 ('cografya',1,"Karadeniz'in liman kenti Trabzon ili nerede?",41.0,39.72,{'il':'Trabzon'}),
 ('cografya',1,"Seyhan'ın böldüğü Adana ili nerede?",37.0,35.32,{'il':'Adana'}),
 ('cografya',2,"Kaşarı ve kaz etiyle ünlü Kars ili nerede?",40.6,43.1,{'il':'Kars'}),
 ('cografya',2,"Bodrum ve Marmaris'in bağlı olduğu Muğla ili nerede?",37.22,28.36,{'il':'Muğla'}),
 ('cografya',2,"Künefesi ve Antakya'sıyla ünlü Hatay ili nerede?",36.2,36.16,{'il':'Hatay'}),
 ('cografya',2,"Kayısının başkenti Malatya ili nerede?",38.35,38.31,{'il':'Malatya'}),
 ('cografya',2,"Taş evleri Mezopotamya ovasına bakan Mardin ili nerede?",37.31,40.74,{'il':'Mardin'}),
 ('cografya',2,"Dövme dondurmasıyla ünlü Kahramanmaraş ili nerede?",37.58,36.94,{'il':'Kahramanmaraş'}),
 ('cografya',2,"Türkiye'nin en kuzey ucu İnceburun'un bulunduğu Sinop ili nerede?",42.03,35.15,{'il':'Sinop'}),
 ('cografya',2,"Çay bahçeleriyle kaplı Rize ili nerede?",41.02,40.52,{'il':'Rize'}),
 ('cografya',2,"Lületaşı ve Porsuk Çayı'yla bilinen Eskişehir ili nerede?",39.78,30.52,{'il':'Eskişehir'}),
 ('cografya',2,"Kaymağı ve kaplıcalarıyla ünlü Afyonkarahisar ili nerede?",38.76,30.54,{'il':'Afyonkarahisar'}),
 ('cografya',2,"Yüzölçümü en küçük il olan Yalova nerede?",40.65,29.27,{'il':'Yalova'}),
 ('cografya',2,"Fındık bahçeleriyle bilinen Ordu ili nerede?",40.98,37.88,{'il':'Ordu'}),
 ('cografya',3,"Ağrı Dağı'nın eteğindeki en doğu illerden Iğdır nerede?",39.92,44.05,{'il':'Iğdır'}),
 ('cografya',3,"Gürcistan sınırındaki Artvin ili nerede?",41.18,41.82,{'il':'Artvin'}),
 ('cografya',3,"Malazgirt Ovası'nın bağlı olduğu Muş ili nerede?",38.75,41.5,{'il':'Muş'}),
 ('cografya',3,"Çıldır Gölü'nün kıyısındaki Ardahan ili nerede?",41.11,42.7,{'il':'Ardahan'}),
 ('cografya',3,"Munzur Vadisi'nin bulunduğu Tunceli ili nerede?",39.11,39.55,{'il':'Tunceli'}),
 ('cografya',3,"Nüfusu en az olan il Bayburt nerede?",40.26,40.22,{'il':'Bayburt'}),
 ('cografya',3,"Suriye sınırındaki küçük Kilis ili nerede?",36.72,37.12,{'il':'Kilis'}),
 ('cografya',3,"Cilo Dağları'nın yükseldiği Hakkari ili nerede?",37.58,43.74,{'il':'Hakkari'}),
 # ---------------- coğrafya · göller (gölün içine dokunmak tam isabet)
 ('cografya',1,"Türkiye'nin en büyük gölü Van Gölü nerede?",38.65,42.95,{'gol':'Van Gölü'}),
 ('cografya',1,"Türkiye'nin tuzunun büyük kısmını veren Tuz Gölü nerede?",38.75,33.4,{'gol':'Tuz Gölü'}),
 ('cografya',2,"En büyük tatlı su gölümüz Beyşehir Gölü nerede?",37.75,31.5,{'gol':'Beyşehir Gölü'}),
 ('cografya',2,"Göller Yöresi'ndeki Eğirdir Gölü nerede?",38.0,30.87,{'gol':'Eğirdir Gölü'}),
 ('cografya',2,"Turkuaz suyu ve beyaz kumsalıyla Salda Gölü nerede?",37.55,29.68,{'gol':'Salda Gölü'}),
 ('cografya',2,"İstanbul–Ankara yolundaki Sapanca Gölü nerede?",40.69,30.27,{'gol':'Sapanca Gölü'}),
 ('cografya',2,"Antik Nikaia'nın kıyısındaki İznik Gölü nerede?",40.43,29.52,{'gol':'İznik Gölü'}),
 ('cografya',3,"Kuş Cenneti Milli Parkı'nın bulunduğu Kuş Gölü nerede?",40.19,27.96,{'gol':'Kuş Gölü'}),
 ('cografya',3,"Kışın üstünde atlı kızaklar kayan Çıldır Gölü nerede?",41.05,43.23,{'gol':'Çıldır Gölü'}),
 ('cografya',3,"Dicle'nin doğduğu Hazar Gölü nerede?",38.48,39.42,{'gol':'Hazar Gölü'}),
 ('cografya',3,"Fırat üzerindeki Atatürk Baraj Gölü nerede?",37.5,38.32,{'gol':'Atatürk Baraj Gölü'}),
 ('cografya',3,"Latmos Dağı'nın eteğindeki Bafa Gölü nerede?",37.5,27.5,{'gol':'Bafa Gölü'}),
 ('cografya',3,"Fırat'ı tutan ilk büyük baraj Keban'ın gölü nerede?",38.82,38.75,{'gol':'Keban Baraj Gölü'}),
 # ---------------- coğrafya · dağlar ve doğa (yarıçap: dağın gerçek boyu)
 ('cografya',1,"Türkiye'nin en yüksek dağı Ağrı Dağı nerede?",39.7,44.3,{'peak':'Ağrı Dağı','r':14}),
 ('cografya',1,"Kayseri'nin sönmüş volkanı Erciyes Dağı nerede?",38.53,35.45,{'peak':'Erciyes','r':10}),
 ('cografya',2,"Van Gölü'nün kuzeyindeki volkan Süphan Dağı nerede?",38.92,42.83,{'peak':'Süphan','r':10}),
 ('cografya',2,"Bursa'nın kayak merkezi Uludağ nerede?",40.07,29.22,{'peak':'Uludağ','r':12}),
 ('cografya',2,"Mitolojideki İda Dağı, yani Kaz Dağları nerede?",39.7,26.85,{'r':22}),
 ('cografya',2,"Peri bacalarıyla ünlü Göreme nerede?",38.64,34.83,{'site':'peri','r':6}),
 ('cografya',2,"Karadeniz yaylalarının gözdesi Uzungöl nerede?",40.62,40.29,{'site':'uzungol','r':4}),
 ('cografya',2,"Beyaz traverten basamaklarıyla Pamukkale nerede?",37.92,29.12,{'site':'pamukkale','r':4}),
 ('cografya',2,"Mavi lagünüyle ünlü Ölüdeniz nerede?",36.55,29.12,{'r':4}),
 ('cografya',2,"Türkiye'nin en batı ucu Gökçeada nerede?",40.17,25.84,{'r':12}),
 ('cografya',3,"Kaçkarların en yüksek doruğu Kaçkar Dağı nerede?",40.84,41.15,{'peak':'Kaçkar Dağı','r':10}),
 ('cografya',3,"Türkiye'nin ikinci yüksek dağı Cilo'nun doruğu Uludoruk nerede?",37.49,44.0,{'peak':'Uludoruk','r':10}),
 ('cografya',3,"Tepesinde krater gölü olan Nemrut Kalderası nerede?",38.65,42.23,{'peak':'Nemrut (Bitlis)','r':8}),
 ('cografya',3,"Kapadokya'nın batısındaki volkan Hasan Dağı nerede?",38.13,34.17,{'peak':'Hasan Dağı','r':8}),
 ('cografya',3,"Ülkenin en büyük şelalelerinden Tortum Şelalesi nerede?",40.67,41.66,{'r':4}),
 ('cografya',3,"Ege'nin ucundaki Datça Yarımadası nerede?",36.75,27.7,{'r':14}),
 # ---------------- tarih · antik kentler ve yapılar (maket de doğru sayılır)
 ('tarih',1,"Celsus Kütüphanesi'yle ünlü Efes Antik Kenti nerede?",37.94,27.34,{'site':'celsus','r':3}),
 ('tarih',1,"Dev taş başlarıyla bilinen Nemrut Dağı nerede?",37.98,38.74,{'site':'nemrut','r':4}),
 ('tarih',1,"Tahta at efsanesiyle bilinen Truva Antik Kenti nerede?",39.957,26.239,{'site':'truva','r':3}),
 ('tarih',2,"Kayalara oyulmuş Sümela Manastırı nerede?",40.69,39.66,{'site':'sumela','r':3}),
 ('tarih',2,"Bilinen en eski tapınak Göbeklitepe nerede?",37.22,38.92,{'site':'gobekli','r':3}),
 ('tarih',2,"Hititlerin başkenti Hattuşa nerede?",40.02,34.61,{'site':'hattusa','r':4}),
 ('tarih',2,"Dik yamaçtaki tiyatrosuyla Bergama Akropolü nerede?",39.13,27.18,{'site':'bergama','r':3}),
 ('tarih',2,"Hâlâ konser verilen Aspendos Antik Tiyatrosu nerede?",36.94,31.17,{'site':'aspendos','r':3}),
 ('tarih',2,"Osmanlı konaklarıyla Safranbolu nerede?",41.25,32.69,{'site':'safranbolu','r':4}),
 ('tarih',2,"Mimar Sinan'ın ustalık eseri Selimiye Camii nerede?",41.68,26.56,{'site':'selimiye','r':3}),
 ('tarih',2,"Mevlâna'nın türbesinin bulunduğu Mevlâna Müzesi nerede?",37.87,32.5,{'site':'mevlana','r':3}),
 ('tarih',2,"Denizin ortasındaki Kızkalesi nerede?",36.46,34.15,{'site':'kizkalesi','r':3}),
 ('tarih',2,"Alanya'yı koruyan Kızıl Kule nerede?",36.54,32.0,{'site':'kizilkule','r':3}),
 ('tarih',2,"Çanakkale Savaşları'nın geçtiği Gelibolu Yarımadası nerede?",40.25,26.38,{'r':22}),
 ('tarih',3,"Bin bir kilise kenti Ani Harabeleri nerede?",40.51,43.57,{'site':'ani','r':3}),
 ('tarih',3,"Dağın yamacındaki İshak Paşa Sarayı nerede?",39.52,44.13,{'site':'ishakpasa','r':3}),
 ('tarih',3,"Van Gölü'ndeki adada kurulan Akdamar Kilisesi nerede?",38.34,43.04,{'site':'akdamar','r':3}),
 ('tarih',3,"Taş işçiliğiyle UNESCO listesindeki Divriği Ulu Camii nerede?",39.37,38.12,{'site':'divrigi','r':3}),
 ('tarih',3,"Konik kubbeli evleriyle Harran nerede?",36.86,39.03,{'site':'harran','r':3}),
 ('tarih',3,"Mozaikleriyle ünlü Zeugma Antik Kenti nerede?",37.06,37.87,{'site':'zeugma','r':3}),
 ('tarih',3,"Kaya mezarlarıyla bilinen Myra Antik Kenti nerede?",36.26,29.98,{'site':'myra','r':3}),
 ('tarih',3,"Dicle kıyısındaki kadim Hasankeyf nerede?",37.71,41.41,{'site':'hasankeyf','r':3}),
 ('tarih',3,"Neolitik yerleşim Çatalhöyük nerede?",37.67,32.83,{'r':3}),
 ('tarih',3,"Lidya'nın başkenti Sardes nerede?",38.49,28.04,{'r':3}),
 ('tarih',3,"Heykeltıraşlar kenti Afrodisias nerede?",37.71,28.72,{'r':3}),
 ('tarih',3,"Zeus Tapınağı'yla ünlü Aizanoi Antik Kenti nerede?",39.2,29.61,{'r':3}),
 ('tarih',3,"Anadolu'nun ilk yazılı belgelerinin bulunduğu Kültepe nerede?",38.85,35.63,{'r':3}),
 # ---------------- tarih · olaylar (ilçe ya da il)
 ('tarih',1,"Atatürk'ün 19 Mayıs 1919'da ayak bastığı Samsun ili nerede?",41.29,36.33,{'il':'Samsun'}),
 ('tarih',2,"Sivas Kongresi'nin toplandığı Sivas ili nerede?",39.75,37.02,{'il':'Sivas'}),
 ('tarih',2,"Amasya Genelgesi'nin yayımlandığı Amasya ili nerede?",40.65,35.83,{'il':'Amasya'}),
 ('tarih',2,"Osmanlı'nın ilk büyük başkenti Bursa ili nerede?",40.19,29.06,{'il':'Bursa'}),
 ('tarih',3,"Alparslan'ın 1071'de zafer kazandığı Malazgirt nerede?",39.14,42.54,{'r':8}),
 ('tarih',3,"Sakarya Meydan Muharebesi'nin yapıldığı Polatlı nerede?",39.58,32.15,{'r':8}),
 ('tarih',3,"Büyük Taarruz'un zaferle bittiği Dumlupınar nerede?",38.85,29.98,{'r':8}),
 ('tarih',3,"Osmanlı Beyliği'nin kurulduğu Söğüt nerede?",40.02,30.18,{'r':6}),
 # ---------------- spor
 ('spor',2,"Kırkpınar yağlı güreşlerinin yapıldığı Edirne ili nerede?",41.68,26.55,{'il':'Edirne'}),
 ('spor',2,"2013 Akdeniz Oyunları'nın ev sahibi Mersin ili nerede?",36.81,34.64,{'il':'Mersin'}),
 ('spor',2,"Rüzgâr sörfünün gözde koyu Alaçatı nerede?",38.28,26.37,{'r':4}),
 ('spor',3,"Tüplü dalışın gözde adresi Kaş nerede?",36.2,29.64,{'r':4}),
 ('spor',3,"Sarıçam ormanları içindeki Sarıkamış Kayak Merkezi nerede?",40.33,42.58,{'r':5}),
 ('spor',3,"Formula 1'in koştuğu İstanbul Park pisti nerede?",40.95,29.41,{'r':4}),
 ('spor',3,"Erciyes'in yamacındaki kayak merkezi nerede?",38.53,35.48,{'peak':'Erciyes','r':10}),
]
out = []
pre = {'cografya':'har-cog','tarih':'har-tar','spor':'har-spo'}
cnt = {}
for cat, diff, q, lat, lon, a in T:
    cnt[cat] = cnt.get(cat,0)+1
    o = {'id': f"{pre[cat]}-{cnt[cat]:02d}", 'cat': cat, 'diff': diff, 'type': 'pin', 'q': q, 'lat': lat, 'lon': lon}
    if 'il' in a:
        assert a['il'] in provs, a['il']; o['il'] = a['il']
    if 'gol' in a:
        assert a['gol'] in lakes, a['gol']; o['gol'] = a['gol']
    if 'r' in a: o['r'] = a['r']
    if 'site' in a:
        s = sites[a['site']]; o['alt'] = list(w2ll(s['x'], s['z']))
    if 'peak' in a:
        p = peaks[a['peak']]['p']; o['alt'] = list(w2ll(p[0], -p[1]))
    out.append(o)
js = "// Harita soruları (v1.6, elle yazıldı; tools/harita_uret.py ile üretildi).\n// il: ilin sınırı içi tam isabet · gol: gölün içi tam isabet · r: yarıçap (km) içi tam isabet\n// alt: haritadaki maket ya da kabartma doruğu (gerçek konumdan kayık olabilir; ikisi de doğru sayılır)\nexport default " + json.dumps(out, ensure_ascii=False, indent='\t') + ";\n"
open('src/data/q/harita.js','w').write(js)
print(len(out), cnt)
