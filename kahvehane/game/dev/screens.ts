// Ekran galerisi: /dev/screens.html?s=<ekran>[&anim=0][&r=win|lose|draw][&lvl=1][&loop=1]
// Ekranlar: splash lobby lobby2 versus hud hudopp hudsay hud4 pisti pisti20 banner pause pausec results settings rules daily daily2
import {Screens, type Profile} from '../src/ui/screens';
import {demoOpponents} from '../src/ui/assets';
import type {GameResult} from '../src/core/types';

const P = new URLSearchParams(location.search);
const S = P.get('s') ?? '';
const LIST = ['splash', 'lobby', 'lobby2', 'versus', 'hud', 'hudopp', 'hudsay', 'hud4', 'pisti', 'pisti20', 'banner', 'pause', 'pausec', 'results', 'settings', 'rules', 'daily', 'daily2'];

const log = (n: string) => () => console.debug('[ses]', n);
const sounds = {tap: log('tap'), whoosh: log('whoosh'), coin: log('coin'), reward: log('reward')};

const profile: Profile = {name: 'Misafir', level: 3, xp: 180, xpNext: 268, coins: 12450};
const opps = demoOpponents();
const riza = opps[0];

/** Tam ekran çuha + CSS kartlar (3B masa yerine, dikey). Destenin ekran konumunu döndürür. */
function mockTable(four = false): {x: number; y: number} {
  const m = document.createElement('div');
  m.className = 'mock';
  const card = (r: string, s: string, style: string) => `<div class="c${s === '♥' || s === '♦' ? ' r' : ''}" style="${style}"><b>${r}<small>${s}</small></b><i>${s}</i></div>`;
  const back = (style: string) => `<div class="c bk" style="${style}"><b></b></div>`;
  const oppRow = four ? '' : `<div class="opp">${[0, 1, 2, 3].map(i => back(`left:calc(50% + ${(i - 1.5) * 14}vw - 6.5vw);top:29vh`)).join('')}</div>`;
  m.innerHTML = `${oppRow}
    ${[0, 1, 2, 3, 4].map(i => back(`left:calc(${four ? 50 : 16}% - 8.5vw + ${i * 0.35}vw);top:calc(${four ? 41 : 44}vh - ${i * 0.6}vw);transform:rotate(${four ? 0 : -6}deg)`)).join('')}
    ${four ? '' : back('left:calc(50% - 8.5vw);top:44vh;transform:rotate(-12deg)')}
    ${card('9', '♣', `left:calc(${four ? 50 : 56}% - 7.5vw);top:${four ? 40 : 43}vh;transform:rotate(7deg)`)}
    ${card('Q', '♦', `left:calc(${four ? 50 : 56}% - 9.5vw);top:${four ? 41.5 : 44.5}vh;transform:rotate(-4deg)`)}
    <div class="hand">${[['7', '♥'], ['J', '♣'], ['10', '♦'], ['A', '♠']].map(([r, s], i) => card(r, s, `left:calc(50% + ${(i - 1.5) * 20}vw - 12.5vw);top:${73 + Math.abs(i - 1.5) * 1}vh;transform:rotate(${(i - 1.5) * 5}deg);z-index:${i}`)).join('')}</div>`;
  document.body.prepend(m);
  return {x: innerWidth * (four ? 0.5 : 0.16), y: innerHeight * 0.44 + innerWidth * 0.29};
}

const result = (r: string): GameResult => {
  const a = {side: 0, seats: [0], cards: 28, majority: 3, aces: 2, jacks: 3, club2: 2, diamond10: 0, pisti: 10, total: 20};
  const b = {side: 1, seats: [1], cards: 24, majority: 0, aces: 2, jacks: 1, club2: 0, diamond10: 3, pisti: 0, total: 6};
  if (r === 'lose') return {sides: [{...b, side: 0, seats: [0]}, {...a, side: 1, seats: [1]}], winners: [1]};
  if (r === 'draw') return {sides: [{...a, total: 12, pisti: 0, cards: 26}, {...b, total: 12, pisti: 10, majority: 0, cards: 26}], winners: [0, 1]};
  return {sides: [a, b], winners: [0]};
};

function gameHud(sc: Screens): void {
  const deck = mockTable();
  sc.hud.show(riza, profile);
  sc.hud.onMenu = async () => {
    const r = await sc.pause();
    if (r === 'settings') await sc.settings({sfx: true, voice: true, music: true, haptics: true, quality: 'auto'}, () => {});
    else if (r === 'rules') await sc.rules();
    else if (r === 'leave') sc.hud.hide();
  };
  sc.hud.setStats([{cards: 12, pisti: 1}, {cards: 8, pisti: 0}]);
  sc.hud.setDeck(24, deck.x, deck.y);
}

async function main(): Promise<void> {
  if (!S) {
    const g = document.createElement('div');
    g.className = 'gal';
    g.innerHTML = `<h1>Kahvehane — Ekran Galerisi</h1>${LIST.map(s => `<a href="?s=${s}">${s}</a>`).join('')}
      <p>Dondurulmuş (ekran görüntüsü): ${LIST.map(s => `<a href="?s=${s}&anim=0">${s}</a>`).join('')}</p>
      <p>Sonuç çeşitleri: <a href="?s=results&r=lose">kaybettin</a><a href="?s=results&r=draw">berabere</a><a href="?s=results&lvl=1">seviye atlama</a> · Döngü: <a href="?s=pisti&loop=1">pişti döngü</a></p>`;
    document.body.append(g);
    return;
  }
  const sc = new Screens(document.body, sounds);
  (window as unknown as {__sc: Screens}).__sc = sc;
  switch (S) {
    case 'splash': {
      const sp = sc.splash();
      sp.progress(0.62);
      break;
    }
    case 'lobby':
      sc.lobby(profile, opps, true);
      break;
    case 'lobby2': {
      // kilitli rakip seçili + yüksek seviye
      sc.lobby({...profile, level: 8, coins: 64200}, opps, false);
      setTimeout(() => (document.querySelector('[data-act=next]') as HTMLElement)?.click(), 50);
      break;
    }
    case 'versus':
      sc.versus(profile, riza, 500);
      break;
    case 'hud':
      gameHud(sc);
      sc.hud.setTurn(0);
      sc.hud.showHint('Sıra sende');
      sc.hud.say('Pişti! Çaylar senden evlat!', 'kahkaha', 60000);
      break;
    case 'hudsay':
      gameHud(sc);
      sc.hud.setTurn(-1);
      sc.hud.say('Hay aksi! Şans senden yana…', 'kizgin', 60000);
      break;
    case 'hudopp':
      gameHud(sc);
      sc.hud.setTurn(1);
      sc.hud.setStats([{cards: 12, pisti: 1}, {cards: 8, pisti: 1}]);
      break;
    case 'hud4': {
      mockTable(true);
      const ps = [
        {seat: 0, name: 'Sen', portrait: '', isMe: true, level: 3},
        {seat: 1, name: 'Defne', portrait: opps[3].portrait, moods: riza.moods, level: 31},
        {seat: 2, name: 'Rıza Amca', portrait: riza.portrait, blink: riza.blink, moods: riza.moods, level: 28},
        {seat: 3, name: 'Cem', portrait: opps[1].portrait, moods: riza.moods, level: 12},
      ];
      sc.hud.show(riza, profile);
      sc.hud.setPlayers(ps, '4');
      sc.hud.setStats([{cards: 6, pisti: 0}, {cards: 4, pisti: 1}, {cards: 9, pisti: 0}, {cards: 2, pisti: 0}]);
      sc.hud.setDeck(14, innerWidth * 0.5, innerHeight * 0.4);
      sc.hud.setTurn(0);
      sc.hud.say('Algoritmam var kanka!', undefined, 60000, 3);
      break;
    }
    case 'pisti':
    case 'pisti20': {
      gameHud(sc);
      const jack = S === 'pisti20';
      const fire = () => sc.hud.pisti(jack, jack ? 20 : 10);
      setTimeout(fire, 300);
      if (P.has('loop')) setInterval(fire, 3200);
      break;
    }
    case 'banner':
      gameHud(sc);
      setTimeout(() => sc.hud.banner('Son el!', 'Kartlar dağıtılıyor'), 200);
      setTimeout(() => sc.hud.popScore(innerWidth * 0.72, innerHeight * 0.66, '+3'), 300);
      break;
    case 'pause':
    case 'pausec':
      gameHud(sc);
      sc.pause().then(r => console.debug('mola:', r));
      if (S === 'pausec') setTimeout(() => (document.querySelector('[data-act=leave]') as HTMLElement).click(), 50);
      break;
    case 'results': {
      gameHud(sc);
      const r = P.get('r') ?? 'win';
      const lvl = P.has('lvl');
      const p2: Profile = lvl ? {...profile, level: 4, xp: 30, xpNext: 300} : profile;
      const delta = r === 'win' ? 500 : r === 'lose' ? -500 : 0;
      sc.results({result: result(r), meSide: 0, opp: riza, coinsDelta: delta, coinsAfter: profile.coins + delta, xpGain: 70, profile: {...p2, coins: profile.coins + delta},
        line: r === 'win' ? 'İçimden geçmedi bugün…' : r === 'lose' ? 'Ustaya saygı evlat!' : undefined}).then(x => console.debug('sonuç:', x));
      break;
    }
    case 'settings':
      gameHud(sc);
      sc.settings({sfx: true, voice: true, music: false, haptics: true, quality: 'auto'}, s => console.debug('ayar', s));
      break;
    case 'rules':
      gameHud(sc);
      sc.rules();
      break;
    case 'daily':
    case 'daily2': {
      sc.lobby(profile, opps, true);
      const rewards = [200, 300, 400, 500, 650, 800, 1500];
      setTimeout(() => {
        sc.daily(3, rewards).then(v => console.debug('günlük:', v));
        if (S === 'daily2') setTimeout(() => (document.querySelector('[data-act=claim]') as HTMLElement).click(), 60);
      }, 30);
      break;
    }
  }
}

main();
