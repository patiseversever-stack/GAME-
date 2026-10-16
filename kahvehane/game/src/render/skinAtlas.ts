// Deste kaplamasından (Skin) kart atlası: 52 yüz + arka, cardAtlas ile aynı 8×7 hücre düzeni.
// Masa (Table2D) atlası olduğu gibi kullanır; yeni bir deste eklemek = yeni bir Skin yazmak.
import {ATLAS_COLS, ATLAS_ROWS, BACK_INDEX, CARD_ASPECT, type CardAtlas} from './cardAtlas';
import {SUITS} from '../core/types';
import type {Skin} from '../skins/contract';
import {yieldToMain} from '../platform/sched';

export async function buildSkinAtlas(skin: Skin, width: number): Promise<CardAtlas> {
  await skin.prepare();
  const cellW = Math.floor(width / ATLAS_COLS);
  const cellH = Math.floor(cellW / CARD_ASPECT);
  const canvas = document.createElement('canvas');
  canvas.width = cellW * ATLAS_COLS;
  canvas.height = cellH * ATLAS_ROWS;
  const g = canvas.getContext('2d')!;
  for (let id = 0; id <= BACK_INDEX; id++) {
    g.save();
    g.translate((id % ATLAS_COLS) * cellW, Math.floor(id / ATLAS_COLS) * cellH);
    g.beginPath();
    g.rect(0, 0, cellW, cellH);
    g.clip();
    if (id === BACK_INDEX) skin.drawBack(g, cellW, cellH);
    else skin.drawFace(g, cellW, cellH, SUITS[Math.floor(id / 13)], (id % 13) + 1);
    g.restore();
    if (id % 6 === 5) await yieldToMain(); // 53 kart tek görevde çizilmesin (zayıf telefonda donma)
  }
  return {canvas, width: canvas.width, height: canvas.height, cellW, cellH};
}
