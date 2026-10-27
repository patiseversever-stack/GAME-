// Dokunma ve fare: ekran noktasını su yüzeyine (y = 0 düzlemi) izdüşürür.
// Her parmak ayrı izlenir; iki parmakla iki akıntı birden yapılabilir.
// Kısa ve az kıpırdayan dokunuş "damla", gerisi "sürükleme" sayılır.

import * as THREE from 'three';

const TAP_MOVE = 0.018; // tekne birimi
const TAP_TIME = 0.28; // sn

export class Input {
	constructor(el, app) {
		this.el = el;
		this.app = app;
		this.A = app.A;
		this.ptrs = new Map();
		this._ray = new THREE.Raycaster();
		this._ndc = new THREE.Vector2();
		this._hit = new THREE.Vector3();
		this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		this.enabled = true;
		this._down = (e) => this.down(e);
		this._move = (e) => this.move(e);
		this._up = (e) => this.up(e);
		el.addEventListener('pointerdown', this._down);
		window.addEventListener('pointermove', this._move, { passive: true });
		window.addEventListener('pointerup', this._up);
		window.addEventListener('pointercancel', this._up);
	}

	/** Ekran noktası → tekne koordinatı {x, y}. */
	toTray(cx, cy, out) {
		const r = this.el.getBoundingClientRect();
		this._ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
		this._ray.setFromCamera(this._ndc, this.app.camera);
		if (!this._ray.ray.intersectPlane(this._plane, this._hit)) return null;
		out.x = this._hit.x + 0.5;
		out.y = this.A / 2 - this._hit.z;
		return out;
	}

	down(e) {
		if (!this.enabled) return;
		const p = this.toTray(e.clientX, e.clientY, { x: 0, y: 0 });
		if (!p) return;
		const now = performance.now() / 1000;
		this.ptrs.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, t0: now, t: now, vx: 0, vy: 0, moved: 0 });
		try {
			this.el.setPointerCapture(e.pointerId);
		} catch (err) {
			/* bazı tarayıcılar desteklemez */
		}
		this.app.sfx?.unlock?.();
	}

	move(e) {
		const s = this.ptrs.get(e.pointerId);
		if (!s) return;
		const p = this.toTray(e.clientX, e.clientY, { x: 0, y: 0 });
		if (!p) return;
		const now = performance.now() / 1000;
		const dt = Math.max(1 / 240, now - s.t);
		const vx = (p.x - s.x) / dt;
		const vy = (p.y - s.y) / dt;
		// parmak hızı yumuşatılır (titrek dokunmatik örneklemesi akıntıyı sarsmasın)
		s.vx += (vx - s.vx) * 0.5;
		s.vy += (vy - s.vy) * 0.5;
		s.moved += Math.hypot(p.x - s.x, p.y - s.y);
		if (s.moved > TAP_MOVE || now - s.t0 > TAP_TIME) this.app.game.drag(s.x, s.y, p.x, p.y, s.vx, s.vy);
		s.x = p.x;
		s.y = p.y;
		s.t = now;
	}

	up(e) {
		const s = this.ptrs.get(e.pointerId);
		if (!s) return;
		this.ptrs.delete(e.pointerId);
		const now = performance.now() / 1000;
		if (s.moved < TAP_MOVE && now - s.t0 < TAP_TIME) this.app.game.tap(s.sx, s.sy);
	}

	dispose() {
		this.el.removeEventListener('pointerdown', this._down);
		window.removeEventListener('pointermove', this._move);
		window.removeEventListener('pointerup', this._up);
		window.removeEventListener('pointercancel', this._up);
	}
}
