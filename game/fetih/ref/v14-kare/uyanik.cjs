// "Ekranda hareket var mı" sinyali (app._wake / app._moved): durgun kamera, kaydırma, yavaş sürüklenme, efekt.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=1&debug');
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  console.log(JSON.stringify(await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    const P = app.board.byId.get(6);
    const step = (n) => {
      let act = 0;
      for (let i = 0; i < n; i++) {
        app.frame(1 / 60, false);
        if (app._wake()) act++;
      }
      return Math.round((100 * act) / n) + '%';
    };
    const out = {};
    app.cam.shot(P.x, P.z, { dist: 20, pitch: 0.9, yaw: 0, dur: 0.5, arc: 0 });
    out.cekimSirasinda = step(20);
    step(120);
    out.durgun = step(60);
    // seçim gecesi süzülüşü (frameList): yavaş dönme + yakınlaşma, sönerek
    app.cinema.frameList([P.index]);
    out.suzulusIlk1sn = step(60);
    step(240);
    out.suzulus5snSonra = step(60);
    app.cinema.attack(app.match.players[0], app.match.players[1], app.match.owned(app.match.players[1].i)[0], false);
    out.saldiriFilmi = step(60);
    return out;
  })));
  await b.close();
})();
