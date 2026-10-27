// Ses (geçici iskelet): ses ajanı bunu WebAudio ile dolduracak.
// Sözleşme: unlock(), play(name, opts), music(theme), mute(on).

export class Sfx {
	constructor(hooks = {}) {
		this.hooks = hooks;
		this.muted = false;
	}
	unlock() {}
	play(name, opts) {
		if (this.hooks.sound) this.hooks.sound(name, opts);
	}
	music() {}
	mute(on) {
		this.muted = !!on;
	}
}
