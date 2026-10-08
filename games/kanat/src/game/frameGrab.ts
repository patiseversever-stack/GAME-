// Grab the current 3D frame (HUD-less) for share cards / Foto Modu saves. Renders once and copies the drawing
// buffer in the same task (works without preserveDrawingBuffer).
import type { Game } from './Game.ts';

export function grabFrame(game: Game, maxW = 1080): HTMLCanvasElement | null {
  const src = game.scene.wr.renderer.domElement;
  try {
    game.scene.render(0);
    const k = Math.min(1, maxW / Math.max(1, src.width));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(src.width * k));
    c.height = Math.max(1, Math.round(src.height * k));
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  } catch (err) {
    console.warn('[grab] frame capture failed', err);
    return null;
  }
}
