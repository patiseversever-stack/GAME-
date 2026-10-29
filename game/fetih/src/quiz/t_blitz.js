// YILDIRIM TURU: kısa sürede olabildiğince çok "doğru mu yanlış mı" bil. Tur süresi ifadelerin uzunluğuna göre
// 10–18 sn (timing.js: ortalama bir oyuncu ~7 ifade okuyup cevaplayabilsin).
// Veri: items: [{t, ans}, ×12..16]  (t kısa ifade, ans true/false). Her oyunda karıştırılır.
// Değer: { score, n }  (score = doğru sayısı, n = cevaplanan ifade sayısı).
//
// SIRALAMA: tür 'closest'. judge → err = −score; yani çok doğru yapan önde. Eşitlikte `time` (daha erken
// bitiren) belirler. İnsan süre dolunca otomatik gönderilir (arayüz value() ile skoru okur, time = süre);
// botlar süre sonunda bitirmiş sayılır. correct = skor en az 5.
// Yanlış cevap 0.6 sn'lik bir kilitlenme getirir (rastgele basarak puan toplanmasın).

import { css, esc, shuffle, pCorrect, clamp, buzz, chips, LAND } from './util.js';
import { secOf } from './timing.js';
import { setTimeout } from '../core/clock.js';

const CSS = /* css */ `
.fl-bz{display:flex;flex-direction:column;gap:10px}
.fl-bz-top{display:flex;align-items:center;gap:10px}
.fl-bz-score{font-family:'Lilita One';font-weight:400;font-size:40px;line-height:1;color:var(--gold);text-shadow:0 3px 0 #3a2000;min-width:1.4em;transition:transform .15s}
.fl-bz-score.pop{transform:scale(1.35)}
.fl-bz-top small{font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.75}
.fl-bz-combo{margin-left:auto;font-family:'Lilita One';font-size:18px;color:#ff8a3a;opacity:0;transform:scale(.6);transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}
.fl-bz-combo.on{opacity:1;transform:scale(1)}
.fl-bz-stage{position:relative;min-height:116px;display:grid;place-items:center;overflow:hidden;border-radius:18px;padding:14px;text-align:center;
  background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06));border:2.5px solid rgba(255,255,255,.28);font-size:clamp(19px,calc(5.4 * var(--vw)),24px);line-height:1.25;text-wrap:balance}
.fl-bz-stage span{display:block;animation:flq-slide .2s ease-out}
.fl-bz-stage.ok{border-color:#7dff9a;box-shadow:0 0 0 3px rgba(125,255,154,.35)}
.fl-bz-stage.no{border-color:#ff6a5a;box-shadow:0 0 0 3px rgba(255,106,90,.35);animation:flq-shake .38s}
.fl-bz .fl-tf .fl-opt{min-height:72px}
.fl-bz.lock .fl-tf .fl-opt{opacity:.4;pointer-events:none}
.fl-bz-log{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:2px}
.fl-bz-log i{width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700}
.fl-bz-log i.y{background:#2a9a44}.fl-bz-log i.n{background:#c8352a}
.fl-bz-final{text-align:center;font-family:'Lilita One';font-size:28px;color:#7dff9a;margin:2px 0}
.fl-bz-rows{display:flex;flex-direction:column;gap:3px;font-size:13px;text-align:left}
.fl-bz-rows div{display:flex;gap:8px;align-items:center;padding:3px 8px;border-radius:8px;background:rgba(255,255,255,.06)}
.fl-bz-rows div.n{background:rgba(255,80,60,.2)}
.fl-bz-rows em{margin-left:auto;font-style:normal;font-family:'Lilita One';opacity:.8}
${LAND}{
  .fl-bz{gap:6px}
  .fl-bz-score{font-size:30px}
  .fl-bz-stage{min-height:62px;padding:8px;font-size:17px;border-radius:14px}
  .fl-bz .fl-tf .fl-opt{min-height:52px}
}
@keyframes flq-slide{from{transform:translateX(26px);opacity:0}to{transform:none;opacity:1}}
`;

export const blitz = {
	time: 12,
	label: 'Yıldırım',
	kind: 'closest',
	fmt: (v, value) => `${value?.score || 0} doğru`,
	sub: (v, value) => (value?.n ? `${value.n} ifade` : ''),
	prepare(q, R) {
		return { q, items: shuffle(q.items, R) };
	},
	mount(el, v, api) {
		css('blitz', CSS);
		const items = v.items;
		el.innerHTML = `<div class="fl-bz">
			<div class="fl-bz-top"><b class="fl-bz-score">0</b><small>doğru</small><span class="fl-bz-combo"></span></div>
			<div class="fl-bz-stage"><span></span></div>
			<div class="fl-tf"><button class="fl-opt fl-yes" data-a="1"><span>DOĞRU</span></button><button class="fl-opt fl-no" data-a="0"><span>YANLIŞ</span></button></div>
			<div data-r="x"></div>
		</div>`;
		const root = el.querySelector('.fl-bz');
		const stage = root.querySelector('.fl-bz-stage');
		const txt = stage.firstChild;
		const scoreEl = root.querySelector('.fl-bz-score');
		const comboEl = root.querySelector('.fl-bz-combo');
		let k = 0; // sıradaki ifade
		let score = 0;
		let combo = 0;
		let done = false;
		let lock = false;
		const log = [];
		const show = () => {
			txt.style.animation = 'none';
			void txt.offsetWidth;
			txt.style.animation = '';
			txt.textContent = items[k].t;
		};
		show();
		const finish = () => {
			if (done) return;
			done = true;
			api.answer({ score, n: log.length });
		};
		const flash = (cls) => {
			stage.classList.remove('ok', 'no');
			void stage.offsetWidth;
			stage.classList.add(cls);
			setTimeout(() => stage.classList.remove(cls), 330);
		};
		root.querySelector('.fl-tf').addEventListener('click', (e) => {
			const b = e.target.closest('.fl-opt');
			if (!b || done || lock) return;
			const say = b.dataset.a === '1';
			const it = items[k];
			const ok = say === !!it.ans;
			log.push({ t: it.t, ans: !!it.ans, ok });
			if (ok) {
				score++;
				combo++;
				scoreEl.textContent = score;
				scoreEl.classList.add('pop');
				setTimeout(() => scoreEl.classList.remove('pop'), 150);
				flash('ok');
				buzz(6);
				comboEl.textContent = combo >= 3 ? `🔥 x${combo}` : '';
				comboEl.classList.toggle('on', combo >= 3);
			} else {
				combo = 0;
				comboEl.classList.remove('on');
				flash('no');
				buzz(40);
				lock = true;
				root.classList.add('lock');
				setTimeout(() => {
					lock = false;
					root.classList.remove('lock');
				}, 600);
			}
			k++;
			if (k >= items.length) return finish();
			show();
		});
		return {
			lock() {
				done = true;
			},
			value: () => ({ score, n: log.length }),
			reveal(results) {
				done = true;
				const x = root.querySelector('[data-r=x]');
				root.querySelector('.fl-tf').style.display = 'none';
				stage.style.display = 'none';
				const sc = (r) => (r.value ? r.value.score : 0);
				x.innerHTML = `<div class="fl-bz-final">${score} doğru!</div>
					<div class="fl-bz-rows">${log
						.slice(-6)
						.map((l) => `<div class="${l.ok ? '' : 'n'}"><span>${l.ok ? '✓' : '✗'}</span><span>${esc(l.t)}</span><em>${l.ans ? 'Doğru' : 'Yanlış'}</em></div>`)
						.join('')}</div>${chips(results, (r) => sc(r) + ' doğru')}`;
			},
			destroy() {},
		};
	},
	judge(v, value) {
		const score = value ? value.score || 0 : 0;
		return { correct: score >= 5, err: -score, score };
	},
	bot(v, skill, R) {
		// her ifade: okuma (ortalama uzunluğa göre, timing.js ile aynı ölçü) ve dokunma; usta bot daha çabuk. Yanlış: 0.6 sn ceza.
		const sec = secOf(v);
		const avg = v.items.reduce((s, x) => s + String(x.t).length, 0) / Math.max(1, v.items.length);
		const per = (avg / 20 + 0.55) * (1.15 - 0.5 * skill);
		const p = clamp(pCorrect(skill, v.q.diff) + 0.12, 0.2, 0.97);
		let t = 0;
		let score = 0;
		let n = 0;
		while (n < v.items.length) {
			t += per * (0.75 + R() * 0.5);
			if (t > sec) break;
			n++;
			if (R() < p) score++;
			else t += 0.6;
		}
		return { value: { score, n }, time: n >= v.items.length ? Math.min(t, sec) : sec };
	},
};
