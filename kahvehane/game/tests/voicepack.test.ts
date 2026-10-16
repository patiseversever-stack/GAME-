// Paketli ses düzeni: paketleyici (scripts/voice-pack.mjs) + VoicePlayer'ın paket dilimleme, paket LRU'su ve prepare.
import {afterEach, describe, expect, it, vi} from 'vitest';
import {packGroup, packManifest} from '../scripts/voice-pack.mjs';
import {VoicePlayer} from '../src/audio/voice';

const bytes = (seed: number, n: number): Uint8Array => Uint8Array.from({length: n}, (_, i) => (seed * 31 + i * 7) & 255);

describe('paketleyici (scripts/voice-pack.mjs)', () => {
  it('karakter × grup paketleri, bayt aralıkları asıl dosyaları verir, takma adlar grup içinde, sınırda eşit bölünür', () => {
    const man: Record<string, {url: string; dur: number; h: string; p: number}> = {};
    const files: Record<string, Uint8Array> = {};
    const add = (id: string, char: string, file: string, n: number, p = 2) => {
      const url = `${char}/${file}.mp3`;
      files[url] ??= bytes(Object.keys(files).length + 1, n);
      man[id] = {url, dur: n / 100, h: 'h' + id.length, p};
    };
    for (let i = 1; i <= 6; i++) add(`riza_botPisti_${i}`, 'riza', `riza_botPisti_${i}`, 400 + i, 3);
    add('riza_botThinking_3', 'riza', 'riza_botThinking_3', 120, 1);
    add('qr_riza_friendly_3', 'riza', 'riza_botThinking_3', 120); // takma ad, başka grup (bot)
    add('riza_blofCallOut_1', 'riza', 'riza_blofCallOut_1', 300, 3);
    add('banter_riza_cem_steal_1a', 'riza', 'banter_riza_cem_steal_1a', 250);
    add('banter_riza_cem_steal_1b', 'cem', 'banter_riza_cem_steal_1b', 260);
    add('qc_riza_gg_1', 'riza', 'qc_riza_gg_1', 150);
    add('riza_galleryIntro_1', 'riza', 'riza_galleryIntro_1', 500, 3);
    man.dursun_yok_1 = {url: 'dursun/dursun_yok_1.mp3', dur: 1, h: 'x', p: 2}; // dosya yok → atlanır
    man.bozuk = {url: '../../etc/passwd', dur: 1, h: 'x', p: 2}; // geçersiz yol → atlanır

    expect(packGroup('riza_botPisti_1')).toBe('pisti');
    expect(packGroup('cem_blofCatchGloat_2')).toBe('blof');
    expect(packGroup('banter_riza_cem_steal_1a')).toBe('bot');
    expect(packGroup('qr_defne_trust_1')).toBe('bot');
    expect(packGroup('qc_cem_gg_1')).toBe('say');
    expect(packGroup('defne_shopPoor_1')).toBe('meta');

    const {manifest: out, files: packs} = packManifest(man, url => files[url] ?? null, {maxPack: 1000});
    expect(out.v).toBe(2);
    // pisti grubu (≈ 2560 B) 1000 B sınırla üç parçaya bölünür
    expect(Object.keys(out.packs).filter(k => k.startsWith('riza-pisti')).sort()).toEqual(['riza-pisti-1', 'riza-pisti-2', 'riza-pisti-3']);
    for (const [k, pk] of Object.entries(out.packs)) {
      expect(packs.get(k)!.length).toBe(pk.n);
      expect(pk.n).toBeLessThanOrEqual(1000);
      expect(pk.url).toBe(`packs/${k}.bin`);
    }
    expect(Object.keys(out.packs)).toEqual(expect.arrayContaining(['riza-blof', 'riza-bot', 'riza-say', 'riza-meta', 'cem-bot']));
    // her klibin aralığı asıl dosyanın baytlarıdır
    for (const [id, c] of Object.entries(out.clips)) {
      expect([...packs.get(c.p)!.subarray(c.o, c.o + c.n)]).toEqual([...files[man[id].url]]);
      expect(c.dur).toBe(man[id].dur);
      expect(c.prio).toBe(man[id].p);
      expect(c.h).toBe(man[id].h);
    }
    // takma ad kendi grubunun paketinde (bot), asıl replik pisti paketinde
    expect(out.clips.qr_riza_friendly_3.p).toBe('riza-bot');
    expect(out.clips.riza_botThinking_3.p.startsWith('riza-pisti')).toBe(true);
    expect(out.clips.dursun_yok_1).toBeUndefined();
    expect(out.clips.bozuk).toBeUndefined();
    expect(Object.keys(out.clips).length).toBe(Object.keys(man).length - 2);
  });
});

// ── VoicePlayer, paketli manifest ──
class FakeCtx {
  state = 'running';
  currentTime = 0;
  destination = {};
  decoded: number[][] = [];
  createGain() {
    return {gain: {value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}}, connect() {}, disconnect() {}, context: this};
  }
  createBufferSource() {
    return {buffer: null, onended: null, connect() {}, disconnect() {}, start() {}, stop() {}};
  }
  decodeAudioData(d: ArrayBuffer, ok?: (b: {duration: number}) => void) {
    this.decoded.push([...new Uint8Array(d)]);
    const b = {duration: 1};
    ok?.(b);
    return Promise.resolve(b);
  }
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  await new Promise(r => setTimeout(r, 0));
};

/** 4 paket × 60 bayt: a (riza pisti), b (cem pisti), c (riza say), d (cem bot); her pakette 3 klip (20'şer bayt). */
function packedFixture() {
  const packs: Record<string, {url: string; n: number; char: string; group: string}> = {};
  const clips: Record<string, {p: string; o: number; n: number; dur: number; prio: number}> = {};
  const data: Record<string, Uint8Array> = {};
  const def: [string, string, string][] = [['a', 'riza', 'pisti'], ['b', 'cem', 'pisti'], ['c', 'riza', 'say'], ['d', 'cem', 'bot']];
  def.forEach(([name, char, group], k) => {
    data[name] = bytes(k + 1, 60);
    packs[name] = {url: `packs/${name}.bin`, n: 60, char, group};
    for (let i = 0; i < 3; i++) clips[`${name}${i}`] = {p: name, o: i * 20, n: 20, dur: 1, prio: 2};
  });
  const fetches: string[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    fetches.push(u);
    const m = /packs\/(\w)\.bin$/.exec(u);
    if (m) return new Response(data[m[1]].slice(), {status: 200});
    if (u.endsWith('manifest.json')) return new Response(JSON.stringify({v: 2, packs, clips}), {status: 200});
    return new Response('yok', {status: 404});
  });
  return {packs, clips, data, fetches, fetchFn};
}

describe('VoicePlayer: paketli düzen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('paket bir kez iner, klip baytları tam aralıkla kesilip çözülür; adres manifeste göre (göreli)', async () => {
    const f = packedFixture();
    vi.stubGlobal('fetch', f.fetchFn);
    const ctx = new FakeCtx();
    const v = new VoicePlayer(() => ctx as unknown as AudioContext);
    await v.load('https://ornek.test/oyun/voice/manifest.json');
    expect(v.packed).toBe(true);
    expect(v.size).toBe(12);
    expect(v.duration('a1')).toBe(1);
    expect(v.play('a1', {priority: 3})).toBe(true);
    await flush();
    expect(ctx.decoded[0]).toEqual([...f.data.a.slice(20, 40)]);
    v.stop();
    expect(v.play('a2', {priority: 3})).toBe(true);
    await flush();
    expect(ctx.decoded[1]).toEqual([...f.data.a.slice(40, 60)]);
    expect(f.fetches.filter(u => u.endsWith('a.bin'))).toEqual(['https://ornek.test/oyun/voice/packs/a.bin']);
    expect(v.stats().packsLoaded).toEqual(['a']);
    v.stop();
  });

  it('paket LRU: toplam bayt sınırı; prepare istenenleri sırayla indirir, masada olmayanları atar, sığmayanı tembel bırakır', async () => {
    const f = packedFixture();
    vi.stubGlobal('fetch', f.fetchFn);
    const ctx = new FakeCtx();
    const v = new VoicePlayer(() => ctx as unknown as AudioContext, {packCapBytes: 130});
    await v.load('voice/manifest.json');
    // masa: riza pisti + riza say + cem bot (sınır 130 → ilk ikisi iner, üçüncüsü sığmaz)
    await v.prepare([['riza', 'pisti'], ['riza', 'say'], ['cem', 'bot']]);
    expect(v.stats().packsLoaded).toEqual(['a', 'c']);
    expect(v.stats().packBytes).toBe(120);
    // istenmeyen paket (cem pisti) gerekince iner; sınır aşılınca önce İSTENMEYEN atılmaz, yenisi korunur → en eski istenen düşer
    v.play('b0', {priority: 3});
    await flush();
    expect(v.stats().packsLoaded).toEqual(['c', 'b']);
    expect(v.stats().packBytes).toBeLessThanOrEqual(130);
    v.stop();
    // yeni masa: yalnız cem → riza paketleri hemen bellekten çıkar
    await v.prepare([['cem', 'bot']]);
    expect(v.stats().packsLoaded).toEqual(['d']);
    expect(v.stats().packBytes).toBe(60);
    // kapatınca paket belleği bırakılır
    v.setEnabled(false);
    expect(v.stats().packBytes).toBe(0);
  });

  it('istenmeyen paketler, istenenlerden önce atılır', async () => {
    const f = packedFixture();
    vi.stubGlobal('fetch', f.fetchFn);
    const ctx = new FakeCtx();
    const v = new VoicePlayer(() => ctx as unknown as AudioContext, {packCapBytes: 130});
    await v.load('voice/manifest.json');
    await v.prepare([['riza', 'pisti']]); // a istenen
    v.play('b0', {priority: 3}); // b istenmeyen
    await flush();
    v.stop();
    expect(v.stats().packsLoaded).toEqual(['a', 'b']);
    v.play('c0', {priority: 3}); // c istenmeyen, yeni → sınır aşıldı: önce istenmeyen b atılır, istenen a kalır
    await flush();
    v.stop();
    expect(v.stats().packsLoaded).toEqual(['a', 'c']);
  });

  it('sabitleme (oyuncunun söyleyişleri) paketten keser; dosya başına düzende prepare bir şey yapmaz', async () => {
    const f = packedFixture();
    vi.stubGlobal('fetch', f.fetchFn);
    const ctx = new FakeCtx();
    const v = new VoicePlayer(() => ctx as unknown as AudioContext);
    await v.load('voice/manifest.json');
    await v.preload(['c0', 'c1', 'c2'], 2);
    expect(v.stats().pinned).toBe(3);
    expect(v.stats().pinnedDecoded).toBe(2);
    expect(f.fetches.filter(u => u.endsWith('c.bin')).length).toBe(1);
    const w = new VoicePlayer(() => null);
    w.setManifest({x: {url: 'riza/x.mp3', dur: 1}}, 'voice/manifest.json');
    expect(w.packed).toBe(false);
    await w.prepare([['riza', 'pisti']]);
    expect(w.stats().packsLoaded).toEqual([]);
  });

  it('bozuk paketli kayıtlar ayıklanır (aralık paketi aşıyor, paket yok)', () => {
    const v = new VoicePlayer(() => null);
    v.setManifest({v: 2, packs: {a: {url: 'packs/a.bin', n: 50, char: 'riza', group: 'pisti'}}, clips: {
      ok: {p: 'a', o: 0, n: 50, dur: 1}, tasan: {p: 'a', o: 40, n: 20, dur: 1}, yok: {p: 'z', o: 0, n: 5, dur: 1}, eksi: {p: 'a', o: -1, n: 5, dur: 1},
    }}, 'voice/manifest.json');
    expect(v.size).toBe(1);
    expect(v.has('ok')).toBe(true);
  });
});
