// Koltuk balonu + replik → söz dönüştürücüleri (DOM'a / yerel kayda dokunmaz; testlerde de yüklenir).
import {spectatorFor, type Line} from '../ai/dialogue';
import type {Bubble, Utter} from '../audio/speech';
import type {GameHud, HudPose} from '../ui/types';

/** Koltuğun konuşma balonu: yönetici sesi kesince yalnız KENDİ yazısını kapatır (arada gelen iddia balonuna dokunmaz). */
export class SeatBubble implements Bubble {
  private tok = 0;
  private text = '';

  constructor(
    private hud: GameHud,
    private seat: number,
    /** Yazı başka yerde (pişti kahramanı) gösteriliyor: balonu ancak late() ile aç. */
    private deferred = false,
  ) {}

  show(text: string, mood: string | null | undefined, ms: number): void {
    this.text = text;
    if (this.deferred) return;
    this.tok = this.hud.say(text, (mood ?? null) as HudPose | null, ms, this.seat) || 0;
  }

  /** Ertelenmiş balonu şimdi aç (ör. kahraman bandı çekildi ama ses sürüyor). */
  late(ms: number): void {
    if (!this.text || ms <= 0) return;
    this.deferred = false;
    this.tok = this.hud.say(this.text, null, ms, this.seat) || 0;
  }

  hide(): void {
    if (this.tok) this.hud.unsay?.(this.seat, this.tok);
    this.tok = 0;
  }

  hold(ms: number): void {
    if (this.tok) this.hud.holdSay?.(this.seat, this.tok, ms);
  }
}

/** dialogue.ts repliğini yöneticinin sözüne çevirir. */
export function utter(line: Line, char: string, bubble?: Bubble, minMs?: number): Utter {
  return {id: line.id, text: line.text, tts: line.tts, mood: line.mood ?? null, char, bubble, minMs};
}

/**
 * Paketli ses düzeninde (tek dosya / yayın önizlemesi) masada gereken paketler, öncelik sırasıyla: botların oyun
 * replikleri, oyuncunun kendi hızlı sohbet söyleyişleri, botların atışma + cevapları, el / maç sonu konuşmaları (botlar +
 * 1'e 1'de kenardaki seyirci) (VoicePlayer.prepare). endFirst: el bitti → Ara Skor / sonuç konuşmaları önce insin.
 */
export function voiceWant(game: 'pisti' | 'blof', players: readonly {char: {id: string}; human: boolean}[], endFirst = false): [string, string][] {
  const bots = players.filter(p => !p.human).map(p => p.char.id);
  const out: [string, string][] = bots.map(c => [c, game]);
  for (const p of players) if (p.human) out.push([p.char.id, 'say']);
  for (const c of bots) out.push([c, 'bot']);
  const end: [string, string][] = bots.map(c => [c, 'end']);
  const spec = players.length === 2 ? spectatorFor(players.map(p => p.char.id)) : null;
  if (spec) end.push([spec, 'end']);
  return endFirst ? [...end, ...out] : [...out, ...end];
}

/** Seslendirmesiz kısa tepki (dürtme, ortak sevinci): yine kanal sırasına uyar. */
export function quipUtter(text: string, char: string, bubble: Bubble, mood: string | null, minMs: number): Utter {
  return {id: 'quip', text, char, mood, bubble, minMs, audio: false};
}
