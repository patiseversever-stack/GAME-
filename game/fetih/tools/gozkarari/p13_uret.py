# P13: Bilim insanları (GK-1311–1350), kullanıcı isteği (16 Kasım): "Bilim insanları resmi de olsa çok bilinen eski ve yeni"
SON = '4:3 landscape, no text, no letters, no numbers, no watermark, no logo'
def tablo(eser, d):
    return (f'A faithful full reproduction of {eser}, entire composition exactly as the original, accurate colors and details, '
            f'public domain artwork, no frame, centered on a plain dark museum wall to fill the 4:3 frame. {d}, {SON}')
def foto(kaynak, d, renk='black-and-white archival photograph with fine film grain'):
    return f'{kaynak}, accurate likeness of this real historical person, {d}, plain studio background, {renk}, {SON}'
T, F = 'Tablo (aslına sadık)', 'Arşiv fotoğrafı (aslına sadık)'
M = [
 (T,1,'bulanık', tablo('the portrait painting of Sir Isaac Newton by Godfrey Kneller (1689)', 'A man in his mid-forties shown half-length and turned slightly to one side, long wavy shoulder-length grey-brown hair parted in the middle, a long straight nose, thin lips and intense dark eyes, wearing a dark brown gown over a white shirt with a plain open white collar, warm dark brown background'),
  "1689'da Godfrey Kneller'ın resmettiği bu İngiliz bilginin adı ne?", ['Isaac Newton','Robert Boyle','Edmond Halley','Gottfried Leibniz'],
  "Newton, 1687'de yayımlanan Principia'da hareket yasalarını ve evrensel çekim yasasını açıkladı."),
 (T,1,'bulanık', tablo('the portrait painting of Galileo Galilei by Justus Sustermans (1636)', 'An elderly man shown half-length, a short white beard and moustache, a high balding forehead with grey hair at the sides, eyes raised slightly upward, dressed in black with a broad flat white linen collar, dark background'),
  "Floransa saray ressamı Sustermans'ın 1636'da resmettiği yaşlı gökbilimci kimdir?", ['Galileo Galilei','Johannes Kepler','Tycho Brahe','Giordano Bruno'],
  "Galileo 1633'te Engizisyon önünde yargılandı; hayatının son yıllarını Floransa yakınında ev hapsinde geçirdi."),
 (T,1,'bulanık', tablo('the red chalk drawing "Portrait of a Man in Red Chalk" (c. 1512), widely accepted as the self-portrait of Leonardo da Vinci', 'An old man seen in three-quarter view with long flowing wavy hair and a long wavy beard, bushy eyebrows, deep-set eyes and a furrowed brow, drawn in red chalk with fine hatching on pale aged paper'),
  "Otoportresi olduğu kabul edilen bu kırmızı tebeşir çizim hangi Rönesans dehasının?", ['Leonardo da Vinci','Michelangelo','Rafael','Tiziano'],
  "Bu çizim Torino'daki Kraliyet Kütüphanesi'nde saklanır; ışıktan korunmak için nadiren sergilenir."),
 (T,1,'bulanık', tablo('the portrait painting of Charles Darwin by John Collier (1881)', 'An elderly man standing, a long full white beard and a bald domed head, bushy white eyebrows, wearing a long black cloak over a dark coat, gazing slightly aside, dark brown background'),
  "John Collier'ın 1881'de resmettiği bu ak sakallı doğa bilimci kim?", ['Charles Darwin','Alfred Russel Wallace','Thomas Huxley','Gregor Mendel'],
  'Darwin, 1859\'da yayımlanan "Türlerin Kökeni"nde doğal seçilim yoluyla evrimi anlattı.'),
 (T,2,'bulanık', tablo('the Toruń portrait of Nicolaus Copernicus (anonymous, c. 1580)', 'A young man shown half-length with shoulder-length dark brown hair, a pale clean-shaven face and dark eyes, wearing a red garment, his hands joined in prayer, a small crucifix at one side, dark background'),
  "Doğduğu kent Toruń'da saklanan bu eski portredeki gökbilimci hangisi?", ['Nicolaus Copernicus','Tycho Brahe','Johannes Kepler','Galileo Galilei'],
  "Kopernik'in Güneş merkezli sistemi anlatan kitabı, öldüğü yıl olan 1543'te yayımlandı."),
 (T,3,'bulanık', tablo('the portrait of Johannes Kepler (unknown artist, 1610)', 'A man in his late thirties shown half-length, short dark hair, a neat pointed dark beard and moustache, dark eyes, wearing a black doublet and a white pleated ruff collar, dark background'),
  "1610 tarihli bu portredeki kırmalı yakalı Alman gökbilimci kimdir?", ['Johannes Kepler','Tycho Brahe','Christiaan Huygens','Galileo Galilei'],
  "Kepler, gezegenlerin Güneş çevresinde elips yörüngelerde dolandığını gösterdi."),
 (T,2,'bulanık', tablo('the well-known 17th century portrait painting of Blaise Pascal (anonymous)', 'A young man with long wavy brown hair falling to the shoulders, a thin pale face, a long nose and dark eyes, a plain white square collar over dark clothing, dark background'),
  "Görseldeki 17. yüzyıl Fransız bilgininin adı hangi birime verilmiştir?", ['pascal','amper','kulon','bekerel'],
  "Pascal, babasının vergi hesaplarına yardım için Pascaline adlı bir hesap makinesi yaptı."),
 (T,3,'ayrıntı', tablo('the painting "Portrait of Antoine-Laurent Lavoisier and His Wife" by Jacques-Louis David (1788)', 'Marie-Anne Lavoisier stands leaning on her seated husband\'s shoulder in a white dress with a blue sash and voluminous powdered curly hair; Antoine Lavoisier sits at a table covered with red velvet, writing with a quill, wearing a black suit; glass laboratory apparatus on the table and floor: a large glass bell jar, flasks and a gasometer; a portfolio of drawings on a chair at left; classical pilasters behind'),
  "Jacques-Louis David'in eşiyle birlikte resmettiği bu kimyager kimdir?", ['Antoine Lavoisier','Joseph Priestley','Robert Boyle','John Dalton'],
  "Lavoisier, Fransız Devrimi sırasında 1794'te giyotinle idam edildi."),
 (T,3,'bulanık', tablo('the portrait painting of Michael Faraday by Thomas Phillips (1841–1842)', 'A middle-aged man shown half-length, thick wavy grey-brown hair, side whiskers, a calm thoughtful face, wearing a black coat, a high white collar and a black neckcloth, dark background'),
  "Thomas Phillips'in resmettiği bu İngiliz bilim insanının adı hangi birime verilmiştir?", ['farad','kelvin','joule','watt'],
  "Faraday, elektromanyetik indüksiyonu 1831'de buldu; elektrik jeneratörleri bu ilkeyle çalışır."),
 (T,1,'bulanık', tablo('the portrait painting of Benjamin Franklin by Joseph-Siffred Duplessis (1778)', 'An elderly man shown bust-length, long thinning grey hair falling to the shoulders with no wig, a broad face with a faint smile, wearing a reddish-brown coat with a fur collar over a white shirt, plain dark background'),
  "Portresi 100 dolarlık banknotta da yer alan bu Amerikalı devlet adamı ve bilgin kim?", ['Benjamin Franklin','George Washington','Thomas Jefferson','John Adams'],
  "Franklin, yıldırımın elektrik olduğunu gösterdi ve paratoneri icat etti."),
 (F,2,'bulanık', foto('A realistic 19th century portrait photograph of the Augustinian friar and scientist Gregor Mendel', 'a stout middle-aged man with a round clean-shaven face, small round metal-rimmed spectacles, short combed hair, wearing a black clerical frock coat, holding a small flowering stem'),
  "Brno'daki manastırda yaşamış bu keşiş ve bilim insanının adı ne?", ['Gregor Mendel','Charles Darwin','Louis Pasteur','Carl Linnaeus'],
  "Mendel'in bezelye deneyleri yaşarken fark edilmedi; ancak 1900'de yeniden keşfedildi."),
 (T,2,'ayrıntı', tablo('the painting "Louis Pasteur" by Albert Edelfelt (1885)', 'Pasteur, a man in his sixties with grey hair and a short grey beard, wearing a black jacket, sits at a laboratory table examining a glass jar he holds up, an open notebook before him; shelves and tables with laboratory glassware around him'),
  "Albert Edelfelt'in 1885'te laboratuvarında resmettiği bilim insanı hangisi?", ['Louis Pasteur','Robert Koch','Joseph Lister','Claude Bernard'],
  "Sütü ısıyla mikroplardan arındıran pastörizasyon yöntemi adını Louis Pasteur'den alır."),
 (T,2,'bulanık', tablo('the portrait painting of Dmitri Mendeleev by Ilya Repin (1885), showing him in the doctoral robe of the University of Edinburgh', 'An elderly man with long untidy grey hair falling to the shoulders and a long flowing grey beard, a serious gaze, wearing a richly coloured academic doctoral robe, dark background'),
  "İlya Repin'in akademik cüppeyle resmettiği bu Rus kimyager kimdir?", ['Dmitri Mendeleyev','Mihail Lomonosov','Ivan Pavlov','Aleksandr Butlerov'],
  "Mendeleyev periyodik tabloda henüz bulunmamış elementlere boş yer bıraktı; galyum ve germanyum sonradan bulundu."),
 (T,3,'bulanık', tablo('the portrait painting of Carl Friedrich Gauss by Christian Albrecht Jensen (1840)', 'An elderly man shown bust-length, a clean-shaven face with white hair at the sides, a calm piercing gaze, wearing a black velvet skullcap and a dark coat with a high collar, plain light background'),
  "Eski 10 Alman markında da portresi bulunan, takkeli bu matematikçi kim?", ['Carl Friedrich Gauss','Leonhard Euler','Gottfried Leibniz','Bernhard Riemann'],
  "Gauss'un çocukken 1'den 100'e kadar sayıları bir anda topladığı anlatılır; toplam 5050'dir."),
 (F,1,'bulanık', foto('A faithful recreation of the well-known public-domain portrait photograph of Marie Curie from around 1920', 'a middle-aged woman seen from the chest up, grey-streaked hair loosely pulled back, a calm serious face, wearing a plain black high-necked dress, soft light'),
  "Paris'te çalışmış Polonya doğumlu bu bilim insanı kimdir?", ['Marie Curie','Lise Meitner','Rosalind Franklin','Dorothy Hodgkin'],
  "Curie, fizik (1903) ve kimya (1911) olmak üzere iki ayrı dalda Nobel kazanan ilk kişidir."),
 (F,1,'bulanık', foto('A faithful recreation of a well-known public-domain portrait photograph of Thomas Edison from around 1922', 'an elderly man seen from the chest up, short white hair combed back, a broad face, bushy eyebrows, wearing a dark suit, a white shirt and a bow tie'),
  "Menlo Park'taki laboratuvarıyla ünlü bu Amerikalı mucidin adı ne?", ['Thomas Edison','Nikola Tesla','Alexander Graham Bell','Henry Ford'],
  "Edison'un adına ABD'de 1000'den fazla patent alındı."),
 (F,1,'bulanık', foto('A faithful recreation of the public-domain portrait photograph of Albert Einstein taken by Ferdinand Schmutzer in Vienna in 1921', 'a man in his early forties seen from the chest up, thick wavy dark hair with a little grey, a dark bushy moustache, gentle eyes looking at the camera, wearing a dark suit, a white shirt and a dark tie'),
  "Ferdinand Schmutzer'in 1921'de Viyana'da çektiği fotoğraftaki fizikçi kim?", ['Albert Einstein','Max Planck','Niels Bohr','Erwin Schrödinger'],
  "Einstein, 1921 Nobel Fizik Ödülü'nü görelilik için değil, fotoelektrik olayını açıklaması için aldı."),
 (F,1,'bulanık', foto('A faithful recreation of the public-domain portrait photograph of Nikola Tesla taken by Napoleon Sarony around 1890', 'a man in his thirties in three-quarter profile, dark hair parted in the middle and slicked back, a neat dark moustache, a thin face, a high white collar and a dark suit, dark background', 'sepia-toned archival photograph with fine film grain'),
  "Napoleon Sarony'nin 1890'da fotoğrafını çektiği Sırp asıllı mucit hangisi?", ['Nikola Tesla','Thomas Edison','Guglielmo Marconi','George Westinghouse'],
  "Manyetik akı yoğunluğunun birimi tesla, adını Nikola Tesla'dan alır."),
 (F,1,'bulanık', foto('A faithful recreation of the public-domain portrait photograph of Sigmund Freud taken by Max Halberstadt around 1921', 'an older man seen from the chest up, short grey hair, a short trimmed grey beard and moustache, a serious gaze, holding a cigar in one hand, wearing a dark three-piece suit and tie'),
  "Elinde purosuyla görülen bu Viyanalı hekim ve düşünürün adı ne?", ['Sigmund Freud','Carl Gustav Jung','Alfred Adler','Ivan Pavlov'],
  "Freud, Nazilerden kaçarak 1938'de Londra'ya yerleşti ve ertesi yıl orada öldü."),
 (F,1,'bulanık', foto('A realistic color portrait photograph of the British physicist Stephen Hawking (1942–2018) as he appeared in the 1990s', 'a thin man seated in his motorised wheelchair, head tilted slightly to one side, short brown hair, large glasses, a small computer screen mounted on the wheelchair arm, a dark jacket and a light shirt', 'natural color photograph'),
  "Cambridge'de bir zamanlar Newton'un da tuttuğu kürsüde çalışan bu fizikçi kim?", ['Stephen Hawking','Roger Penrose','Richard Feynman','Carl Sagan'],
  "Hawking, kara deliklerin de ışıma yayabileceğini gösterdi; bu ışımaya Hawking ışıması denir."),
 (F,2,'bulanık', foto('A realistic portrait photograph of the British mathematician Alan Turing (1912–1954) as in his well-known photographs from around 1951', 'a man in his late thirties seen from the chest up, dark hair combed back with a side parting, a slight smile, deep-set eyes, wearing a dark jacket, a white shirt and a patterned tie'),
  "Portresi 50 sterlinlik İngiliz banknotunda yer alan bu matematikçi hangisi?", ['Alan Turing','John von Neumann','Charles Babbage','Claude Shannon'],
  "Turing, İkinci Dünya Savaşı'nda Enigma şifrelerinin çözülmesinde önemli rol oynadı."),
 (F,2,'bulanık', foto('A realistic archival photograph of the American physicist J. Robert Oppenheimer (1904–1967)', 'a very thin man with a narrow face and short cropped grey hair, wearing his characteristic wide-brimmed porkpie hat, a dark suit and tie, holding a tobacco pipe'),
  "Geniş kenarlı şapkası ve piposuyla bilinen bu Amerikalı fizikçi kimdir?", ['Robert Oppenheimer','Enrico Fermi','Richard Feynman','Edward Teller'],
  "Oppenheimer, atom bombasının geliştirildiği Los Alamos Laboratuvarı'nın ilk müdürüydü."),
 (F,2,'bulanık', foto('A realistic archival portrait photograph of the Turkish mathematician Cahit Arf (1910–1997) in his later years, as on the reverse of the Turkish 10 lira banknote', 'an elderly man seen from the chest up, white hair combed back, a high forehead, a kind and thoughtful face, wearing a dark suit, a white shirt and a tie'),
  "Portresi 10 liralık banknotumuzda yer alan bu matematikçinin adı ne?", ['Cahit Arf','Feza Gürsey','Oktay Sinanoğlu','Kerim Erim'],
  'Matematikteki "Arf değişmezi" ve "Arf halkaları" kavramları onun adını taşır.'),
 (F,2,'bulanık', foto('A realistic color portrait photograph of the Turkish Sumerologist Muazzez İlmiye Çığ (1914–2024) in her old age', 'an elderly woman seen from the chest up, short white hair, glasses, a warm gentle smile, wearing a simple cardigan', 'natural color photograph'),
  "Sümer uygarlığı üzerine çalışmalarıyla tanınan bu Türk bilim insanı kim?", ['Muazzez İlmiye Çığ','Halet Çambel','Afet İnan','Jale İnan'],
  "Muazzez İlmiye Çığ, 2024'te 110 yaşında hayatını kaybetti."),
 (F,2,'bulanık', foto('A realistic archival photograph of the Scottish bacteriologist Alexander Fleming (1881–1955) in his laboratory', 'an older man with combed-back grey hair and a long face, wearing a bow tie and a dark suit, holding a glass petri dish up to the light, shelves of laboratory glassware behind'),
  "Laboratuvarında bir petri kabını ışığa tutan bu bakteriyolog hangisi?", ['Alexander Fleming','Louis Pasteur','Robert Koch','Joseph Lister'],
  "Fleming, penisilini 1928'de, unuttuğu bir kültür kabında üreyen küfü fark edince buldu."),
 (T,2,'bulanık', tablo('the posthumous portrait painting of Alfred Nobel by Emil Österman (1915)', 'A middle-aged man shown half-length, dark hair, a full dark beard and moustache, a calm gaze, wearing a dark suit with a white shirt collar, dark background'),
  "Emil Österman'ın tablosundaki bu sakallı İsveçli mucit kimdir?", ['Alfred Nobel','Anders Celsius','Jöns Jacob Berzelius','Svante Arrhenius'],
  "Alfred Nobel dinamiti icat etti; servetini Nobel Ödülleri'nin kurulması için bıraktı."),
 (F,2,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the German physicist Wilhelm Conrad Röntgen (1845–1923)', 'an older man seen from the chest up, short dark-grey hair, a full grey beard, a long face and dark eyes, wearing a dark suit'),
  "İlk Nobel Fizik Ödülü'nü 1901'de alan bu Alman fizikçinin adı ne?", ['Wilhelm Röntgen','Max Planck','Heinrich Hertz','Hendrik Lorentz'],
  "Röntgen, X ışınlarını 1895'te buldu ve buluşu için patent almayı reddetti."),
 (F,2,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the German physicist Max Planck from around 1930', 'an elderly man seen from the chest up, a bald head, a bushy grey moustache, a lean serious face, wearing a dark suit and a high white collar'),
  "Adı bir doğa sabitine verilmiş, kel ve bıyıklı bu Alman fizikçi kim?", ['Max Planck','Albert Einstein','Werner Heisenberg','Heinrich Hertz'],
  "Planck, enerjinin paketler hâlinde yayıldığını öne sürerek kuantum kuramını başlattı."),
 (F,2,'bulanık', foto('A realistic color portrait photograph of the American astronomer Carl Sagan (1934–1996) from around 1980', 'a man in his mid-forties with thick dark hair and a friendly smile, wearing a beige turtleneck sweater under a brown corduroy jacket', 'natural color photograph'),
  '"Kozmos" belgeseliyle milyonlara ulaşan bu Amerikalı gökbilimci hangisi?', ['Carl Sagan','Edwin Hubble','Stephen Hawking','Neil deGrasse Tyson'],
  "Sagan, Voyager uzay araçlarına konan Altın Plak'ın hazırlanmasına önderlik etti."),
 (F,1,'bulanık', foto('A faithful recreation of a public-domain archival photograph of Alexander Graham Bell from the early 1900s', 'an elderly man seen from the chest up, white hair and a full white beard, a kindly gaze, wearing a dark suit'),
  "Bu fotoğraftaki ak sakallı, İskoç asıllı mucit kimdir?", ['Alexander Graham Bell','Thomas Edison','Guglielmo Marconi','Samuel Morse'],
  "Bell, telefonun patentini 1876'da aldı; ilk telefon konuşmasını yardımcısı Watson'la yaptı."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the Danish physicist Niels Bohr from around 1922', 'a man in his late thirties seen from the chest up, dark hair combed back, heavy dark eyebrows, a broad face, wearing a dark suit and tie'),
  "Kopenhag'daki enstitüsüyle bilinen bu Danimarkalı fizikçi kim?", ['Niels Bohr','Ernest Rutherford','Werner Heisenberg','Erwin Schrödinger'],
  "Niels Bohr 1922'de, oğlu Aage Bohr 1975'te Nobel Fizik Ödülü aldı."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the New Zealand-born physicist Ernest Rutherford from the 1920s', 'a large man seen from the chest up, grey hair combed back, a big bushy grey moustache, wearing a dark suit, a waistcoat and a tie'),
  "Bu Yeni Zelanda doğumlu fizikçi Nobel'i hangi dalda aldı?", ['Kimya','Fizik','Tıp','Barış'],
  "Rutherford, Nobel'i 1908'de kimyada, elementlerin radyoaktif bozunması üzerine çalışmalarıyla aldı."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the Austrian physicist Erwin Schrödinger from around 1933', 'a man in his mid-forties seen from the chest up, round wire-rimmed glasses, dark hair combed back, a slight smile, wearing a dark suit with a bow tie'),
  "Yuvarlak gözlüklü, papyonlu bu Avusturyalı fizikçi hangisi?", ['Erwin Schrödinger','Werner Heisenberg','Wolfgang Pauli','Max Born'],
  "Schrödinger, 1933 Nobel Fizik Ödülü'nü Paul Dirac ile paylaştı."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the German physicist Werner Heisenberg from around 1933', 'a young man in his early thirties seen from the chest up, light brown wavy hair combed back, a boyish face, wearing a dark suit and tie'),
  "Kuantum mekaniğinin kurucularından bu genç Alman fizikçinin adı ne?", ['Werner Heisenberg','Erwin Schrödinger','Wolfgang Pauli','Max Born'],
  "Heisenberg, bir parçacığın konumu ile momentumunun aynı anda kesin ölçülemeyeceğini gösterdi."),
 (F,3,'bulanık', foto('A realistic archival photograph of the American physicist Richard Feynman (1918–1988) from the 1960s', 'a man with thick wavy grey-brown hair and a broad grin, wearing a white shirt, playing a pair of bongo drums'),
  "Bongo çalmayı çok seven, Nobel ödüllü bu Amerikalı fizikçi kimdir?", ['Richard Feynman','Robert Oppenheimer','Murray Gell-Mann','Enrico Fermi'],
  "Feynman, 1986'daki Challenger kazasının nedenini bir bardak buzlu suyla gösterdi."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the Italian physicist Enrico Fermi from the 1940s', 'a balding man with dark receding hair and a gentle smile, wearing a dark suit, standing in front of a completely blank blackboard'),
  "Boş bir kara tahtanın önünde görülen bu İtalyan fizikçi kim?", ['Enrico Fermi','Guglielmo Marconi','Alessandro Volta','Amedeo Avogadro'],
  "Fermi'nin ekibi ilk kontrollü nükleer zincirleme tepkimeyi 1942'de Chicago'da gerçekleştirdi."),
 (F,3,'bulanık', foto('A realistic archival photograph of the British chemist Rosalind Franklin (1920–1958) from the mid-1950s', 'a young woman with short dark wavy hair and a calm face, wearing a dark cardigan, looking into a laboratory microscope'),
  "DNA üzerine çalışmış, mikroskop başındaki bu İngiliz kimyager hangisi?", ['Rosalind Franklin','Dorothy Hodgkin','Marie Curie','Lise Meitner'],
  "Franklin'in X ışını fotoğrafları, DNA'nın çift sarmal yapısının anlaşılmasında belirleyici oldu."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain archival photograph of Guglielmo Marconi from the early 1900s', 'a young man with dark hair combed back and a moustache, wearing a dark suit, seated beside early wireless telegraph apparatus with coils, brass terminals and wires'),
  "Kablosuz telgraf aygıtlarının yanında görülen bu İtalyan mucidin adı ne?", ['Guglielmo Marconi','Alessandro Volta','Enrico Fermi','Antonio Meucci'],
  "Marconi, 1901'de Atlantik'i aşan ilk radyo sinyalini aldı."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the German physician Robert Koch from around 1900', 'an older man seen from the chest up, a bald head, rimless glasses, a full grey beard, wearing a dark suit'),
  "Gözlüklü ve ak sakallı bu Alman hekim ve mikrobiyolog kimdir?", ['Robert Koch','Rudolf Virchow','Paul Ehrlich','Emil von Behring'],
  "Koch, verem basilini 24 Mart 1882'de duyurdu; bu gün Dünya Tüberküloz Günü'dür."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain archival photograph of the American astronomer Edwin Hubble from the 1930s', 'a man with short combed hair smoking a pipe, wearing a dark suit, seated at the eyepiece of a large observatory telescope'),
  "Dev bir teleskobun başında piposuyla görülen bu Amerikalı gökbilimci kim?", ['Edwin Hubble','Carl Sagan','George Hale','Percival Lowell'],
  "Uzay teleskobuna adını veren Hubble, evrenin genişlediğini gösteren gözlemleri yaptı."),
]
# Kullanıcı (16 Kasım): her alandan ünlü portre, telif/kişilik hakkı sorunu olmasın. Kural: kişi en geç 1955'te ölmüş;
# 1955'ten sonra ölenler çıkarıldı.
SIL = {'Stephen Hawking','Robert Oppenheimer','Cahit Arf','Muazzez İlmiye Çığ','Carl Sagan','Niels Bohr','Erwin Schrödinger','Werner Heisenberg','Richard Feynman','Rosalind Franklin'}
M = [m for m in M if m[5][0] not in SIL and not (m[4].startswith('Bu Yeni Zelanda') and False)]
YENI = [
 (T,3,'bulanık', tablo('the pastel portrait of Leonhard Euler by Jakob Emanuel Handmann (1753)', 'A man in his mid-forties shown bust-length, a broad face with a slightly squinting right eye, wearing a soft wrapped cloth cap like a small turban, a dark coat and a white cravat, plain dark background'),
  "Jakob Handmann'ın 1753'te resmettiği, sarık benzeri başlıklı bu matematikçi kim?", ['Leonhard Euler','Carl Friedrich Gauss','Daniel Bernoulli','Joseph-Louis Lagrange'],
  "Euler, hayatının son yıllarında neredeyse tamamen kör olmasına rağmen çalışmalarını sürdürdü."),
 (T,3,'bulanık', tablo('the portrait painting of Christiaan Huygens by Caspar Netscher (1671)', 'A man in his early forties shown half-length, long curly dark brown hair falling past the shoulders, a thin moustache, a calm face, wearing a dark cloak over a white lace cravat, dark background'),
  "Caspar Netscher'in 1671'de resmettiği bu Hollandalı bilgin kimdir?", ['Christiaan Huygens','Antonie van Leeuwenhoek','Baruch Spinoza','René Descartes'],
  "Huygens sarkaçlı saati icat etti ve Satürn'ün en büyük uydusu Titan'ı keşfetti."),
 (T,3,'bulanık', tablo('the portrait painting of Edward Jenner by James Northcote (1803)', 'A middle-aged man shown half-length, grey hair brushed back, a round calm face, wearing a dark coat with a high collar and a white cravat, dark background'),
  "James Northcote'un 1803'te resmettiği bu İngiliz hekim hangisi?", ['Edward Jenner','Joseph Lister','William Harvey','John Snow'],
  "Jenner, 1796'da çiçek hastalığına karşı ilk aşıyı inek çiçeği kullanarak geliştirdi."),
 (F,2,'bulanık', foto('A faithful recreation of a public-domain portrait photograph of Florence Nightingale from the 1850s', 'a young woman seen from the chest up, dark hair parted in the middle and smoothly drawn back, a calm gentle face, wearing a dark dress with a small white collar'),
  "Viktorya dönemi İngiltere'sinden bu hemşire ve istatistikçinin adı ne?", ['Florence Nightingale','Mary Seacole','Clara Barton','Elizabeth Fry'],
  "Nightingale, Kırım Savaşı'nda Üsküdar'daki Selimiye Kışlası'nda yaralılara baktı."),
 (F,1,'bulanık', foto('A faithful recreation of a public-domain photograph of the brothers Wilbur and Orville Wright from 1909', 'two men standing side by side in dark suits, the taller one bald and clean-shaven, the other with a neat moustache, both with serious faces'),
  "1909 tarihli bu fotoğraftaki havacılık öncüsü kardeşler kimdir?", ['Wright kardeşler','Montgolfier kardeşler','Lumière kardeşler','Grimm kardeşler'],
  "Wright kardeşler ilk motorlu ve denetimli uçuşu 1903'te Kitty Hawk'ta yaptı."),
 (F,2,'bulanık', foto('A faithful recreation of a public-domain portrait photograph of Henry Ford from around 1919', 'a slim man in his fifties seen from the chest up, grey hair parted at the side, a lean face, wearing a dark suit, a white shirt and a tie'),
  "1919'da fotoğraflanan bu Amerikalı otomobil sanayicisinin adı ne?", ['Henry Ford','Walter Chrysler','William Durant','Ransom Olds'],
  "Ford'un Model T otomobili 1908–1927 arasında 15 milyondan fazla üretildi."),
 (F,2,'bulanık', foto('A faithful recreation of a public-domain portrait photograph of the Russian physiologist Ivan Pavlov from around 1904', 'an elderly man seen from the chest up, a full white beard and white hair, a stern gaze, wearing a dark suit'),
  "1904 Nobel Tıp Ödülü'nü alan bu ak sakallı Rus fizyolog kim?", ['Ivan Pavlov','Ilya Mechnikov','Ivan Sechenov','Dmitri Mendeleyev'],
  "Pavlov, köpeklerle yaptığı deneylerle koşullu refleksi açıkladı."),
 (F,3,'bulanık', foto('A faithful recreation of a public-domain portrait photograph of Samuel Morse taken by Mathew Brady around 1857', 'an elderly man seen from the chest up, a long white beard and white hair, a serious gaze, wearing a dark coat'),
  "Mathew Brady'nin fotoğrafını çektiği bu Amerikalı ressam ve mucit kimdir?", ['Samuel Morse','Alexander Graham Bell','Thomas Edison','Cyrus Field'],
  "Morse, telgrafın yanı sıra kendi adını taşıyan noktalı-çizgili alfabenin geliştirilmesinde de rol aldı."),
 (T,3,'bulanık', tablo('the portrait painting of Alexander von Humboldt by Joseph Karl Stieler (1843)', 'An elderly man shown half-length, white hair, a thoughtful face, wearing a dark coat and a white cravat, holding a book, dark background'),
  "Joseph Stieler'in 1843'te resmettiği bu Alman doğa bilimci ve gezgin kim?", ['Alexander von Humboldt','Charles Darwin','Carl Ritter','Johann Wolfgang von Goethe'],
  "Humboldt, 1799–1804 arasında Güney ve Orta Amerika'yı keşif amacıyla dolaştı."),
 (T,2,'bulanık', tablo('the portrait painting of James Watt by Carl Frederik von Breda (1792)', 'A man in his fifties shown half-length, grey powdered hair, a long thoughtful face, wearing a dark coat with a white cravat, seated beside a table with drawings and a pair of dividers, dark background'),
  "Görseldeki İskoç mühendisin adı hangi birime verilmiştir?", ['watt','joule','amper','newton'],
  "Watt'ın geliştirdiği ayrı yoğuşturuculu buhar makinesi Sanayi Devrimi'ne güç verdi."),
]
M = M + YENI
assert len(M) == 40, len(M)
out = ['# Göz Kararı · P13 · GK-1311–GK-1350', '', '## Bilim insanları (GK-1311–GK-1350)', '']
for i, (us, z, g, cmd, q, a, b) in enumerate(M):
    gid = f'GK-{1311 + i}'
    out += [f'### {gid} · Bilim insanları · {us} · Zorluk {z} · Gösterim: {g}', '```', cmd, '```',
            f'- **Soru:** {q}', f'- **Şıklar:** ✅ {a[0]} · ' + ' · '.join(a[1:]), f'- **Bilgi:** {b}', '']
open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'P13.md'), 'w').write('\n'.join(out).rstrip() + '\n')
# denetim
import re, collections
hata = []
for i, (us, z, g, cmd, q, a, b) in enumerate(M):
    gid = f'GK-{1311 + i}'
    if not (45 <= len(q) <= 106 and q.endswith('?')): hata.append(f'{gid} soru {len(q)}')
    if any(len(x) > 28 for x in a) or len(set(a)) != 4: hata.append(f'{gid} şık')
    if len(b) > 132: hata.append(f'{gid} bilgi {len(b)}')
    for t in [q, b, *a]:
        for w in t.split():
            if len(w) > 19: hata.append(f'{gid} uzun kelime {w}')
    if not cmd.endswith('no logo'): hata.append(f'{gid} komut sonu')
print('hata:', hata or 'yok')
print('zorluk', collections.Counter(m[1] for m in M), 'gösterim', collections.Counter(m[2] for m in M), 'üslup', collections.Counter(m[0] for m in M))
print('soru sonları', collections.Counter(re.sub(r'^.* (\S+\?)$', r'\1', m[4]) for m in M))
