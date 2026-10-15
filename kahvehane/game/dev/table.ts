// Arayüzsüz masa önizlemesi: dağıtım + birkaç atış (ekran görüntüsü ve his testi için).
import '@fontsource/playfair-display/latin-900.css';
import {Stage} from '../src/render/stage';
import {buildEnvironment} from '../src/render/env';
import {buildCardAtlas} from '../src/render/cardAtlas';
import {CardSystem} from '../src/render/cards';
import {CAMERA, makeLayout} from '../src/game/layout';
import {HandInput} from '../src/input/hand';
import {TableView} from '../src/game/table';
import {Sparks} from '../src/fx/particles';
import {Shockwave} from '../src/fx/ring';
import {createGame} from '../src/core/pisti';
import {detectTier, qualityFor} from '../src/quality';

const q = qualityFor(detectTier());
const stage = new Stage(document.getElementById('app')!, q, CAMERA);
await buildEnvironment(stage);
const cards = new CardSystem(stage, await buildCardAtlas(q.atlasWidth));
const layout = makeLayout(2);
const hand = new HandInput(stage, cards, () => layout.pile);
const fx = {deal() {}, land() {}, flip() {}, throwWhoosh() {}};
const table = new TableView(stage, cards, layout, hand, fx);
const sparks = new Sparks(stage, q.particles);
const ring = new Shockwave(stage);
table.reset(2);
const {events} = createGame({seats: 2, teams: [0, 1], dealer: 1, seed: 42});
for (const e of events) {
  if (e.t === 'tableDeal') await table.dealTable(e.cards, e.faceUp);
  else if (e.t === 'handDeal') await table.dealHands(e.deals);
}
hand.setEnabled(true);
(window as unknown as {__t: unknown}).__t = {stage, table, hand, sparks, ring, cards, ready: true};
const pisti = new URLSearchParams(location.search).has('pisti');
if (pisti) {
  await stage.time.wait(0.4);
  ring.fire(layout.pile);
  sparks.burst(layout.pile, 1.2);
  stage.shake(0.6);
}
