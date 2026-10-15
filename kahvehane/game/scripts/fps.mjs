import {chromium} from 'playwright-core';
const [,, url] = process.argv;
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport: {width: 844, height: 390}});
await p.goto(url);
await p.waitForFunction(() => window.__kh, null, {timeout: 60000});
const r = await p.evaluate(async () => {
  const k = window.__kh; let n = 0; const times = [];
  k.stage.onRender(() => { n++; times.push(performance.now()); });
  const t0 = performance.now();
  await new Promise(r => setTimeout(r, 3000));
  const info = k.stage.renderer.info;
  const gl = k.stage.renderer.getContext();
  return {frames: n, sec: (performance.now() - t0) / 1000, calls: info.render.calls, tris: info.render.triangles, dpr: k.stage.renderer.getPixelRatio(), renderer: gl.getParameter(gl.RENDERER)};
});
console.log(JSON.stringify(r));
await b.close();
