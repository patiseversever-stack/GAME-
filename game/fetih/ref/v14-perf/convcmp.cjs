const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('about:blank');
  await p.addScriptTag({ content: fs.readFileSync('/tmp/conv.iife.js', 'utf8') });
  console.log(await p.evaluate(async () => {
    const sr = 32000, n = 32000 * 3;
    const opts = { seconds: 1.5, rt60: 1.05, pre: 0.008, seed: 9, bright: 0.9 };
    const r = (s) => { let a = s; return () => ((a = (a * 16807) % 2147483647) / 2147483647); };
    const g = r(7);
    const wL = new Float32Array(n), wR = new Float32Array(n);
    for (let i = 0; i < 20000; i++) { wL[i] = (g() - 0.5) * Math.exp(-i / 4000); wR[i] = (g() - 0.5) * Math.exp(-i / 3000); }
    // tarayıcı
    const oc = new OfflineAudioContext(2, n, sr);
    const buf = oc.createBuffer(2, n, sr); buf.getChannelData(0).set(wL); buf.getChannelData(1).set(wR);
    const [hL, hR] = CONV.irData(sr, opts);
    const ir = oc.createBuffer(2, hL.length, sr); ir.getChannelData(0).set(hL); ir.getChannelData(1).set(hR);
    const src = oc.createBufferSource(); src.buffer = buf; const cv = oc.createConvolver(); cv.buffer = ir; src.connect(cv); cv.connect(oc.destination); src.start(0);
    const out = await oc.startRendering();
    const t = performance.now();
    const js = CONV.reverbJS(wL, wR, sr, opts);
    const ms = performance.now() - t;
    let err = 0, pk = 0;
    for (const [a, bb] of [[out.getChannelData(0), js.L], [out.getChannelData(1), js.R]]) for (let i = 0; i < n; i++) { err = Math.max(err, Math.abs(a[i] - bb[i])); pk = Math.max(pk, Math.abs(a[i])); }
    return `tepe ${pk.toFixed(4)} · en büyük fark ${err.toExponential(2)} (${(20 * Math.log10(err / pk)).toFixed(1)} dB) · JS evrişim ${ms.toFixed(0)} ms (işçide)`;
  }));
  await b.close();
})();
