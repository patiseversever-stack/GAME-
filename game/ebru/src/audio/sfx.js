// Ses (geçici iskelet): ses ajanı bu dosyayı WebAudio ile dolduracak.
// Sözleşme: play(name, opts), flow(energy), music(theme), unlock(), mute(on).

export class Sfx {
	constructor(hooks = {}) {
		this.hooks = hooks;
		this.muted = false;
	}
	unlock() {}
	play(/* name, opts */) {}
	flow(/* energy */) {}
	music(/* theme */) {}
	mute(on) {
		this.muted = !!on;
	}
}
