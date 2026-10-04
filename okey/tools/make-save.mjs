// Görsel QA için bir "oyun ortası" kaydı üretir (botlar oynatılır; sıra bende, taş çekmeden önce durur).
// Kullanım: node tools/make-save.mjs <okey|okey101> <seed> <minMeld> <out.json>
// Çıktı, uygulamanın devam etme kaydı biçimindedir (localStorage 'patisever.save.v1').
import fs from 'node:fs';
import { Game } from '../src/game/game.js';
import { Bot } from '../src/game/bot/bot.js';
import { ROSTER } from '../src/ui/avatars.js';

const [, , mode = 'okey101', seedArg = '5', minMeldArg = '6', out = 'tests/ui/fixtures/mid101.json'] = process.argv;
const seed = Number(seedArg);
const minMeld = Number(minMeldArg);
const rules = { mode, matchType: 'single', rounds: 3 };
const game = Game.create(rules, seed);
const bots = [0, 1, 2, 3].map((i) => new Bot(i, 'normal', seed + i * 101));
let steps = 0;
for (; steps < 4000; steps++) {
  const s = game.state;
  if (s.status !== 'playing') break;
  if (s.turn.seat === 0 && s.turn.needsDraw && steps > 8 && s.melds.length >= minMeld) break;
  const seat = s.turn.seat;
  const view = game.view(seat);
  let a = bots[seat].nextAction(view);
  let r = game.apply(seat, a);
  if (!r.ok) {
    a = bots[seat].safeAction(game.view(seat));
    r = game.apply(seat, a);
  }
}
const s = game.state;
if (s.status !== 'playing' || s.turn.seat !== 0 || !s.turn.needsDraw) {
  console.error(`hedef duruma ulaşılamadı: status=${s.status} seat=${s.turn.seat} melds=${s.melds.length} steps=${steps}`);
  process.exit(1);
}
const roster = [{ name: 'Sen', avatar: ROSTER[0].id, difficulty: null }].concat(
  [1, 2, 3].map((i) => ({ name: ROSTER[i].name, avatar: ROSTER[i].id, difficulty: 'normal', title: ROSTER[i].title })),
);
const save = { v: 1, when: Date.now(), cfg: { mode, difficulty: 'normal', seed, rules }, roster, matchStats: { penalties0: 0 }, state: game.snapshot(), rack: null, difficulty: 'normal' };
fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(out, JSON.stringify(save));
console.log(`kayıt yazıldı: ${out} — meld=${s.melds.length} açan=${s.opened.map((o, i) => (o ? i : '')).join('')} taş=${s.hands.map((h) => h.length)} adım=${steps}`);
