// GPU zaman ölçümü (EXT_disjoint_timer_query_webgl2): varsa kare yöneticisine gerçek GPU süresini verir; kademe
// yükseltme kararı tahmine değil ölçüme dayanır. Yoksa (iOS Safari, bazı Android) hiçbir şey yapmaz.
// Her 4 karede bir ölçülür (sorgu nesnesi az, sonuç birkaç kare sonra okunur: çizimi bekletmez).

export class GpuTimer {
	constructor(gl) {
		this.gl = gl;
		this.ext = null;
		try {
			this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
		} catch (e) {
			this.ext = null;
		}
		this.ms = 0;
		this._q = [];
		this._on = null;
		this._n = 0;
	}

	begin() {
		if (!this.ext || this._on || this._q.length > 3 || this._n++ % 4) return;
		const gl = this.gl;
		const q = gl.createQuery();
		if (!q) return;
		gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
		this._on = q;
	}

	end() {
		if (!this._on) return;
		this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
		this._q.push(this._on);
		this._on = null;
	}

	/** Hazır sonuçları okur; GPU saati kesintiye uğradıysa (disjoint) bekleyenler atılır. */
	poll() {
		if (!this.ext || !this._q.length) return this.ms;
		const gl = this.gl;
		const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
		while (this._q.length) {
			const q = this._q[0];
			if (!disjoint && !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
			if (!disjoint) {
				const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
				if (ms > 0 && ms < 200) this.ms = this.ms ? this.ms + (ms - this.ms) * 0.15 : ms;
			}
			gl.deleteQuery(q);
			this._q.shift();
		}
		return this.ms;
	}
}
