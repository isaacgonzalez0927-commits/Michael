/**
 * Procedural audio: diner hum, dream distortion, arena drone, combat stingers.
 * No samples, no external files — oscillators and noise buffers only.
 */
function noiseBuffer(ctx, seconds = 1.5) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.drive = null;
    this.filter = null;
    this.hum = [];
    this.noise = null;
    this.mode = 'off';
    this.distortion = 0;
  }

  async resume() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.drive = this.ctx.createWaveShaper();
      this.drive.curve = this._makeDistortion(4);
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 9000;
      this.drive.connect(this.filter);
      this.filter.connect(this.master);
      this.master.connect(this.ctx.destination);
      this._noiseBuffer = noiseBuffer(this.ctx);
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  _makeDistortion(amount) {
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
    }
    return curve;
  }

  setDistortion(t) {
    this.distortion = t;
    if (!this.ctx) return;
    this.drive.curve = this._makeDistortion(4 + t * 40);
    this.filter.frequency.setTargetAtTime(9000 - t * 7800, this.ctx.currentTime, 0.05);
    this.master.gain.setTargetAtTime(0.22 + t * 0.08, this.ctx.currentTime, 0.05);
  }

  startDiner() {
    this._stopLoops();
    this.mode = 'diner';
    this._hum(110, 0.04);
    this._hum(221, 0.015);
    this._hum(60, 0.03);
    this._startNoise(0.03, 1800);
  }

  startArena() {
    this._stopLoops();
    this.mode = 'arena';
    this.setDistortion(0.18);
    this._hum(46, 0.05);
    this._hum(92.5, 0.03);
    this._hum(138, 0.02);
    this._hum(311, 0.012);
    this._startNoise(0.045, 900);
  }

  _hum(freq, gain) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(this.drive);
    osc.start();
    this.hum.push(osc, g);
  }

  _startNoise(gain, freq) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.drive);
    src.start();
    this.noise = { src, filter, g };
  }

  _stopLoops() {
    for (const node of this.hum) {
      try { node.stop?.(); } catch { /* already stopped */ }
      try { node.disconnect(); } catch { /* noop */ }
    }
    this.hum = [];
    if (this.noise) {
      try { this.noise.src.stop(); } catch { /* noop */ }
      this.noise.src.disconnect();
      this.noise = null;
    }
  }

  _blip(freq, dur, type = 'square', gain = 0.08, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.drive);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  eat() {
    this._blip(180, 0.12, 'sawtooth', 0.05, -80);
    this._blip(90, 0.2, 'square', 0.04, -40);
  }

  gulp() {
    this._blip(140, 0.28, 'sine', 0.09, -90);
    this._blip(70, 0.4, 'triangle', 0.07, -30);
  }

  shoot() {
    this._blip(520, 0.07, 'square', 0.05, -400);
  }

  explosion() {
    this._blip(90, 0.4, 'sawtooth', 0.12, -50);
    this._blip(40, 0.55, 'square', 0.08, -10);
  }

  pickup() {
    this._blip(440, 0.1, 'square', 0.05, 220);
    this._blip(660, 0.16, 'triangle', 0.04, 80);
  }

  neigh() {
    this._blip(620, 0.22, 'sawtooth', 0.05, -280);
    this._blip(340, 0.3, 'triangle', 0.04, -120);
  }

  splash() {
    this._blip(300, 0.18, 'sawtooth', 0.04, -200);
  }

  hit() {
    this._blip(160, 0.12, 'square', 0.07, -80);
  }

  feed() {
    this._blip(240, 0.14, 'triangle', 0.05, 160);
    this.neigh();
  }

  complete() {
    this._blip(330, 0.2, 'square', 0.07, 80);
    this._blip(440, 0.28, 'square', 0.07, 120);
    this._blip(660, 0.4, 'triangle', 0.06, 40);
  }

  laser() {
    this._blip(880, 0.18, 'sawtooth', 0.03, -500);
  }
}
