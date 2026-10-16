// Oyun ↔ konuşma yöneticisi yapıştırıcısı: koltuk balonu, replik → söz, menü konuşmaları (galeri / market), kalıcı hafıza.
// Tek konuşma yöneticisi src/audio/speech.ts (SpeechDirector); burada yalnız oyunun HUD'una / ekranlarına bağlanır.
import {dialogue, type TalkStore} from '../ai/dialogue';
import type {Bubble, SpeechDirector} from '../audio/speech';
import type {MenuTalk} from '../ui/types';
import {store} from '../platform/bridge';
import {utter} from './seatBubble';

export {SeatBubble, quipUtter, utter} from './seatBubble';

/** Pişti konuşma hafızası (eller / oturumlar arası tekrar önleme; galeri / market replikleri de burada). */
export const PISTI_TALK_STORE: TalkStore = {load: () => store.get<unknown>('talk.pisti', null), save: m => store.set('talk.pisti', m)};
/** Blöf konuşma hafızası. */
export const BLOF_TALK_STORE: TalkStore = {load: () => store.get<unknown>('talk.blof', null), save: m => store.set('talk.blof', m)};

/**
 * Menü konuşmaları (ilk açılış galerisi, market): META anlarının replikleri, öncelik 3, etiket 'menu'.
 * Hep bir önceki menü konuşmasını keser (kaydırınca eski karakter susar).
 */
export function menuTalk(speech: SpeechDirector): MenuTalk {
  let attached = false;
  return {
    say(charId, moment, bubble) {
      speech.cancel('menu');
      if (!attached) {
        attached = true;
        dialogue.attach(PISTI_TALK_STORE); // menü replikleri de oturumlar arası tekrar etmesin
      }
      if (!speech.canSay(3)) return;
      const line = dialogue.pickLine(charId, moment);
      if (!line) return;
      const b: Bubble | undefined = bubble ? {show: (t, _m, ms) => bubble.show(t, ms), hide: () => bubble.hide()} : undefined;
      speech.say(utter(line, charId, b, 2600), {prio: 3, tag: 'menu'});
    },
    stop() {
      speech.cancel('menu');
    },
  };
}
