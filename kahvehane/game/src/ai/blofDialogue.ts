// Blöf konuşmaları. Replik verisi (seslendirilen, kimlikli: riza_blofCallOut_3) src/ai/dialogue.ts'te — seslendirme
// aracı oradan okur. Burada: an → replik seçimi (kalıcı tekrar önleme) + sıklık (dialogue.ts → BLOF_RULES) ve
// Rıza Amca'nın öğretici metinleri.
import {BLOF_MOOD, DialogueDirector, blofKey, momentPriority, type BlofMoment, type Exchange, type Line, type TalkStore} from './dialogue';

export {BLOF_MOOD};
export type {BlofMoment};

/** Blöf masasının konuşma durumu (Pişti'ninkinden ayrı; kendi kalıcı hafızası olabilir). */
export class BlofTalk {
  private d = new DialogueDirector();

  /** Kalıcı hafızayı bağlar (eller / oturumlar arası tekrar önleme). */
  attach(store: TalkStore | null): void {
    this.d.attach(store);
  }

  /** Yeni el: el sayacı ilerler, zamanlama sıfırlanır; kalabalık masada (3–4 kişi) laf atma seyrekleşir. */
  begin(seats: number): void {
    this.d.newHand(seats);
  }

  /** Her şeyi sıfırlar (hafıza dahil). */
  reset(): void {
    this.d.reset();
  }

  /** Botlar arası atışma dener (bkz. DialogueDirector.banter): Blöf masasının kendi hafızası ve sıklığıyla. */
  banter(req: Parameters<DialogueDirector['banter']>[0]): Exchange | null {
    return this.d.banter(req);
  }

  /** Repliği seç (yoksa ya da sıra değilse null). force: sıklık sınırını atla (Blöf anı, el sonu…). */
  pick(charId: string, m: BlofMoment, force = false, now?: number): Line | null {
    const key = blofKey(m);
    return force ? this.d.force(charId, key) : this.d.react(charId, key, now);
  }
}

/** Ses önceliği (1 laf atma, 2 olay / ikincil tepki, 3 Blöf anı / el sonu). */
export function blofPriority(m: BlofMoment): 1 | 2 | 3 {
  return momentPriority(blofKey(m));
}

/** Rıza Amca'nın öğretici metinleri (ilk Blöf eli). */
export const TUTORIAL = {
  open: 'Turu sen açıyorsun evlat! Önce hangi değeri söyleyeceğini seç.',
  select: 'Kartına dokun: o değerden bir kart kalkar, basılı tutarsan hepsi. O değerden olmasa da olur… kimse görmüyor!',
  selectSpread: 'Atmak istediğin kartlara dokun (1–4 kart). O değerden olmasa da olur… kimse görmüyor!',
  play: 'Kartların kalktı! İstersen başka kart da ekle — yalan serbest. Sonra AT\'a bas.',
  blof: 'Kartları kapalı attım. İnanmıyorsan BLÖF de — ya da yığına dokun! Yalansa yığın, üstüne kenardan 2 ceza kartı bana.',
  blofOther: 'Bu atışa inanıyor musun? İnanmıyorsan BLÖF de — ya da yığına dokun! Yalansa yığını o alır, üstüne 2 ceza kartı.',
  pass: 'O değerden varsa yeşil düğmeye dokun, hepsi kalksın. Yoksa PAS de — herkes pas derse son atan yeni turu açar.',
  done: 'İşte bu kadar evlat! Gerisi senin elinde. Önce kartlarını bitiren kazanır.',
};
