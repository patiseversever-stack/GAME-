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
 # ---------------- coğrafya · ek göller (2026-11: gölün içi tam isabet; koordinat göl halkasının iç noktası)
 ('cografya',2,"Göller Yöresi'nin tuzlu gölü Burdur Gölü nerede?",37.74,30.179,{'gol':'Burdur Gölü'}),
 ('cografya',3,"Sultan Dağları'nın eteğindeki Akşehir Gölü nerede?",38.513,31.412,{'gol':'Akşehir Gölü'}),
 ('cografya',3,"Gölyazı'nın kıyısındaki Uluabat Gölü nerede?",40.168,28.614,{'gol':'Uluabat Gölü'}),
 ('cografya',2,"Dalyan kanalıyla denize bağlanan Köyceğiz Gölü nerede?",36.935,28.672,{'gol':'Köyceğiz Gölü'}),
 ('cografya',3,"Sodalı suyuyla bilinen Erçek Gölü nerede?",38.694,43.583,{'gol':'Erçek Gölü'}),
 ('cografya',3,"Gölmarmara ilçesine adını veren Marmara Gölü nerede?",38.631,28.042,{'gol':'Marmara Gölü'}),
 ('cografya',2,"İstanbul'a su veren Terkos (Durusu) Gölü nerede?",41.351,28.572,{'gol':'Durusu Gölü'}),
 ('cografya',3,"Fırat üzerindeki Karakaya Baraj Gölü nerede?",38.436,38.812,{'gol':'Karakaya Baraj Gölü'}),
 ('cografya',2,"Adana kentinin kuzeyindeki Seyhan Baraj Gölü nerede?",37.09,35.303,{'gol':'Seyhan Baraj Gölü'}),
 ('cografya',3,"Göçmen kuşların durağı Seyfe Gölü nerede?",39.225,34.389,{'gol':'Seyfe Gölü'}),
 ('cografya',2,"Yürüyüş parkuruyla ünlü Abant Gölü nerede?",40.606,31.28,{'r':2}),
 # ---------------- coğrafya · ek dağlar (kabartma doruğu da doğru sayılır)
 ('cografya',2,"Ağrı Dağı'nın yanı başındaki Küçük Ağrı nerede?",39.651,44.413,{'peak':'Küçük Ağrı','r':5}),
 ('cografya',3,"Doğubayazıt'ın güneyindeki Tendürek Dağı nerede?",39.366,43.875,{'peak':'Tendürek','r':8}),
 ('cografya',3,"Binbir Kilise'nin bulunduğu Karadağ nerede?",37.4,33.15,{'peak':'Karadağ','r':8}),
 ('cografya',3,"Siverek yakınındaki Karacadağ nerede?",37.67,39.83,{'peak':'Karacadağ','r':15}),
 ('cografya',3,"Denizli'nin güneyindeki Honaz Dağı nerede?",37.68,29.28,{'peak':'Honaz','r':6}),
 ('cografya',3,"Ağlayan Kaya'nın bulunduğu Spil Dağı nerede?",38.55,27.43,{'peak':'Spil','r':6}),
 ('cografya',3,"Bolkar Dağları'nın en yüksek doruğu Medetsiz nerede?",37.4,34.62,{'peak':'Medetsiz','r':8}),
 ('cografya',3,"Beyşehir Gölü'nün batısındaki Dedegöl Dağı nerede?",37.65,31.28,{'peak':'Dedegöl','r':8}),
 ('cografya',3,"Beydağları'nın en yüksek doruğu Kızlar Sivrisi nerede?",36.61,30.15,{'peak':'Kızlar Sivrisi','r':8}),
 # ---------------- coğrafya · vadi, kanyon, şelale, yayla
 ('cografya',2,"Kayaya oyulmuş kiliseleriyle Ihlara Vadisi nerede?",38.245,34.3,{'r':6}),
 ('cografya',2,"Buz gibi suyuyla Saklıkent Kanyonu nerede?",36.47,29.405,{'r':3}),
 ('cografya',2,"Denize dökülen Aşağı Düden Şelalesi nerede?",36.852,30.783,{'r':3}),
 ('cografya',2,"Manavgat Çayı üzerindeki Manavgat Şelalesi nerede?",36.8,31.45,{'r':3}),
 ('cografya',2,"Kaplıcasıyla ünlü Ayder Yaylası nerede?",40.953,41.105,{'r':3}),
 # ---------------- coğrafya · burun, ada, yarımada
 ('cografya',3,"Tunç Çağı batığıyla bilinen Gelidonya Burnu nerede?",36.2,30.42,{'r':4}),
 ('cografya',2,"Bağlarıyla ünlü Bozcaada nerede?",39.82,26.04,{'r':6}),
 ('cografya',2,"Mermeriyle ünlü Marmara Adası nerede?",40.62,27.6,{'r':8}),
 ('cografya',2,"Marmara'nın tatil adası Avşa nerede?",40.51,27.51,{'r':4}),
 ('cografya',2,"Adalar'ın en büyüğü Büyükada nerede?",40.86,29.12,{'r':3}),
 ('cografya',2,"Batık kentiyle ünlü Kekova nerede?",36.17,29.85,{'r':4}),
 ('cografya',3,"Erdek'in bulunduğu Kapıdağ Yarımadası nerede?",40.45,27.85,{'r':12}),
 ('cografya',3,"İzmir'in kuzeybatısındaki Karaburun Yarımadası nerede?",38.55,26.5,{'r':15}),
 # ---------------- coğrafya · ova ve delta
 ('cografya',2,"Kızılırmak'ın denize ulaştığı Bafra Ovası nerede?",41.62,35.92,{'r':15}),
 ('cografya',2,"Yeşilırmak'ın denize ulaştığı Çarşamba Ovası nerede?",41.25,36.7,{'r':15}),
 ('cografya',3,"Asi Nehri'nin geçtiği verimli Amik Ovası nerede?",36.35,36.38,{'r':12}),
 ('cografya',3,"Silifke'deki kuş cenneti Göksu Deltası nerede?",36.3,33.98,{'r':8}),
 # ---------------- coğrafya · ünlü ilçe ve kasabalar
 ('cografya',3,"Türkiye'nin ilk sakin şehri Seferihisar nerede?",38.197,26.838,{'r':3}),
 ('cografya',3,"Taş Yol'uyla ünlü Kemaliye nerede?",39.262,38.495,{'r':3}),
 ('cografya',3,"Ödemiş'teki tarihi kasaba Birgi nerede?",38.255,28.065,{'r':3}),
 ('cografya',2,"Havucu ve tarihi evleriyle Beypazarı nerede?",40.167,31.92,{'r':3}),
 ('cografya',3,"Ahşap konaklarıyla sakin şehir Taraklı nerede?",40.397,30.495,{'r':3}),
 ('cografya',2,"Tarihi kalesi ve limanıyla Amasra nerede?",41.746,32.386,{'r':3}),
 ('cografya',2,"Zeytinlikleriyle ünlü Ayvalık nerede?",39.318,26.693,{'r':3}),
 ('cografya',2,"Akdeniz foklarıyla bilinen Foça nerede?",38.67,26.755,{'r':3}),
 ('cografya',2,"Pamuklu beziyle ünlü Şile nerede?",41.175,29.61,{'r':3}),
 ('cografya',3,"Bolu'nun tarihi ilçesi Mudurnu nerede?",40.463,31.21,{'r':3}),
 ('cografya',2,"Bursa'nın sahil ilçesi Mudanya nerede?",40.375,28.883,{'r':3}),
 # ---------------- coğrafya · körfezler
 ('cografya',3,"Marmara'nın doğu ucundaki İzmit Körfezi nerede?",40.72,29.65,{'r':10}),
 ('cografya',3,"Gelibolu Yarımadası'nın kuzeyindeki Saroz Körfezi nerede?",40.55,26.45,{'r':15}),
 ('cografya',3,"Kaz Dağları'nın eteğindeki Edremit Körfezi nerede?",39.5,26.7,{'r':15}),
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
 # ---------------- tarih · ek antik kentler ve höyükler (2026-11)
 ('tarih',2,"Likya'nın liman kenti Patara nerede?",36.26,29.315,{'r':3}),
 ('tarih',3,"Likya'nın başkenti Ksanthos nerede?",36.356,29.318,{'r':3}),
 ('tarih',2,"Yanartaş'ın yanındaki Olimpos Antik Kenti nerede?",36.397,30.473,{'r':3}),
 ('tarih',3,"Üç limanlı antik kent Phaselis nerede?",36.524,30.552,{'r':3}),
 ('tarih',3,"Büyük İskender'in alamadığı Termessos nerede?",36.983,30.467,{'r':3}),
 ('tarih',2,"Aksu ilçesindeki antik kent Perge nerede?",36.961,30.854,{'r':3}),
 ('tarih',2,"Antik tiyatrosu ve limanıyla Side nerede?",36.767,31.39,{'r':3}),
 ('tarih',3,"Toroslardaki antik kent Sagalassos nerede?",37.677,30.517,{'r':3}),
 ('tarih',2,"Thales'in kenti Milet nerede?",37.53,27.278,{'r':3}),
 ('tarih',2,"Didim'deki dev Apollon Tapınağı nerede?",37.385,27.256,{'r':3}),
 ('tarih',3,"Izgara planlı antik kent Priene nerede?",37.66,27.298,{'r':3}),
 ('tarih',3,"Datça'nın ucundaki Knidos nerede?",36.686,27.374,{'r':3}),
 ('tarih',2,"Dalyan'daki antik kent Kaunos nerede?",36.826,28.623,{'r':3}),
 ('tarih',3,"Yatağan yakınındaki antik kent Stratonikeia nerede?",37.314,28.068,{'r':3}),
 ('tarih',3,"Aristoteles'in yaşadığı Assos nerede?",39.49,26.337,{'r':3}),
 ('tarih',2,"Kral Midas'ın başkenti Gordion nerede?",39.65,31.98,{'r':3}),
 ('tarih',3,"Güneş kursularıyla ünlü Alacahöyük nerede?",40.235,34.695,{'r':3}),
 ('tarih',3,"UNESCO listesindeki Arslantepe Höyüğü nerede?",38.382,38.361,{'r':3}),
 ('tarih',3,"Ergani yakınındaki Çayönü Höyüğü nerede?",38.216,39.726,{'r':4}),
 ('tarih',3,"Paleolitik çağdan kalma Karain Mağarası nerede?",37.08,30.57,{'r':3}),
 # ---------------- tarih · kaleler, saraylar, anıtlar (maket de doğru sayılır)
 ('tarih',2,"Boğaz'daki Rumeli Hisarı nerede?",41.085,29.056,{'r':2}),
 ('tarih',2,"Surların zindan kalesi Yedikule nerede?",40.993,28.923,{'r':2}),
 ('tarih',1,"Boğaz kıyısındaki Dolmabahçe Sarayı nerede?",41.039,29.0,{'site':'dolmabahce','r':2}),
 ('tarih',1,"Cenevizlilerin yaptığı Galata Kulesi nerede?",41.026,28.974,{'site':'galata','r':2}),
 ('tarih',1,"Atatürk'ün anıt mezarı Anıtkabir nerede?",39.925,32.837,{'site':'anitkabir','r':2}),
 ('tarih',2,"Başkentin tarihi kalesi Ankara Kalesi nerede?",39.941,32.865,{'site':'ankarakalesi','r':2}),
 ('tarih',2,"Sualtı müzesine ev sahipliği yapan Bodrum Kalesi nerede?",37.032,27.429,{'site':'bodrum','r':2}),
 ('tarih',2,"Urartuların yaptığı Van Kalesi nerede?",38.502,43.343,{'site':'vankalesi','r':3}),
 ('tarih',3,"Kalesiyle bilinen tarihi Harput nerede?",38.706,39.255,{'r':3}),
 ('tarih',3,"Anamur'daki deniz kalesi Mamure nerede?",36.082,32.895,{'r':3}),
 # ---------------- tarih · savaş, kongre ve antlaşma yerleri
 ('tarih',2,"İnönü Muharebelerine adını veren İnönü nerede?",39.817,30.143,{'r':6}),
 ('tarih',3,"Yavuz'un Safevileri yendiği Çaldıran nerede?",39.14,43.91,{'r':10}),
 ('tarih',3,"Kuva-yi Milliye'nin kongre yaptığı Alaşehir nerede?",38.35,28.517,{'r':3}),
 ('tarih',3,"Milli Mücadele'de kongre toplanan Pozantı nerede?",37.43,34.873,{'r':3}),
 ('tarih',3,"Ayastefanos Antlaşması'nın imzalandığı Yeşilköy nerede?",40.963,28.825,{'r':3}),
 ('tarih',2,"Sezar'ın \"Geldim, gördüm, yendim\" dediği Zile nerede?",40.303,35.886,{'r':3}),
 ('tarih',3,"Kütahya Antlaşması'na adını veren Kütahya ili nerede?",39.42,29.98,{'il':'Kütahya'}),
 ('tarih',2,"Osman Bey'in fethettiği Bilecik ili nerede?",40.14,29.98,{'il':'Bilecik'}),
 ('tarih',2,"Balıkesir Kongresi'nin toplandığı Balıkesir ili nerede?",39.65,27.88,{'il':'Balıkesir'}),
 # ---------------- spor
 ('spor',2,"Kırkpınar yağlı güreşlerinin yapıldığı Edirne ili nerede?",41.68,26.55,{'il':'Edirne'}),
 ('spor',2,"2013 Akdeniz Oyunları'nın ev sahibi Mersin ili nerede?",36.81,34.64,{'il':'Mersin'}),
 ('spor',2,"Rüzgâr sörfünün gözde koyu Alaçatı nerede?",38.28,26.37,{'r':4}),
 ('spor',3,"Tüplü dalışın gözde adresi Kaş nerede?",36.2,29.64,{'r':4}),
 ('spor',3,"Sarıçam ormanları içindeki Sarıkamış Kayak Merkezi nerede?",40.33,42.58,{'r':5}),
 ('spor',3,"Formula 1'in koştuğu İstanbul Park pisti nerede?",40.95,29.41,{'r':4}),
 ('spor',3,"Erciyes'in yamacındaki kayak merkezi nerede?",38.53,35.48,{'peak':'Erciyes','r':10}),
 # ---------------- spor · ek (2026-11): stat, kayak, doğa sporları
 ('spor',2,"Kıtalararası İstanbul Maratonu'nun başladığı köprü nerede?",41.045,29.034,{'site':'kopru','r':2}),
 ('spor',2,"2005 Şampiyonlar Ligi finalinin oynandığı stat nerede?",41.074,28.766,{'r':3}),
 ('spor',1,"Fenerbahçe'nin stadı Şükrü Saracoğlu nerede?",40.988,29.037,{'r':2}),
 ('spor',2,"Galatasaray'ın Seyrantepe'deki stadı nerede?",41.103,28.991,{'r':2}),
 ('spor',2,"Yamaç paraşütçülerinin gözdesi Babadağ nerede?",36.53,29.18,{'peak':'Babadağ','r':5}),
 ('spor',2,"Isparta'nın kayak merkezi Davraz nerede?",37.75,30.75,{'peak':'Davraz','r':6}),
 ('spor',2,"Raftingin gözde adresi Köprülü Kanyon nerede?",37.19,31.17,{'r':5}),
 ('spor',3,"Uçurtma sörfünün gözde koyu Akyaka nerede?",37.055,28.325,{'r':3}),
 ('spor',3,"Türkiye Rallisi'ne ev sahipliği yapan Marmaris nerede?",36.855,28.27,{'r':4}),
 ('spor',2,"Golf sahalarıyla ünlü Belek nerede?",36.862,31.055,{'r':4}),
 ('spor',3,"Dağcıların gözdesi Aladağlar'daki Demirkazık nerede?",37.82,35.15,{'peak':'Demirkazık','r':8}),
 ('spor',2,"Kayak merkeziyle bilinen Ilgaz Dağı nerede?",41.07,33.73,{'peak':'Ilgaz','r':10}),
 # ---------------- sanat (2026-11): camiler, yapılar, sanatçıların memleketleri, festival kentleri
 ('sanat',1,"Justinianus'un yaptırdığı Ayasofya nerede?",41.009,28.98,{'site':'ayasofya','r':2}),
 ('sanat',1,"Boğaz'ın girişindeki Kız Kulesi nerede?",41.021,29.004,{'site':'kizkulesi','r':2}),
 ('sanat',2,"Yıldırım Bayezid'in yaptırdığı Bursa Ulu Camii nerede?",40.184,29.062,{'site':'bursaulu','r':2}),
 ('sanat',2,"Erzurum'daki Çifte Minareli Medrese nerede?",39.904,41.276,{'site':'ciftemin','r':2}),
 ('sanat',2,"Konak Meydanı'ndaki İzmir Saat Kulesi nerede?",38.419,27.129,{'site':'saatkulesi','r':2}),
 ('sanat',3,"Selçuklu kervansarayı Sultanhanı nerede?",38.248,33.546,{'r':3}),
 ('sanat',2,"Telkari ve taş evleriyle Midyat nerede?",37.418,41.37,{'r':3}),
 ('sanat',2,"Müslüm Gürses'in doğduğu Halfeti nerede?",37.245,37.87,{'r':3}),
 ('sanat',3,"Ömer Seyfettin'in doğduğu Gönen nerede?",40.105,27.653,{'r':4}),
 ('sanat',2,"Neşet Ertaş'ın memleketi Kırşehir ili nerede?",39.146,34.16,{'il':'Kırşehir'}),
 ('sanat',3,"Yaşar Kemal'in doğduğu Osmaniye ili nerede?",37.07,36.25,{'il':'Osmaniye'}),
 ('sanat',3,"Sait Faik'in doğduğu Sakarya ili nerede?",40.78,30.4,{'il':'Sakarya'}),
 ('sanat',2,"Namık Kemal'in doğduğu Tekirdağ ili nerede?",41.05,27.45,{'il':'Tekirdağ'}),
 ('sanat',2,"Mesir Macunu Festivali'nin yapıldığı Manisa ili nerede?",38.61,27.43,{'il':'Manisa'}),
]
out = []
pre = {'cografya':'har-cog','tarih':'har-tar','spor':'har-spo','sanat':'har-san'}
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
