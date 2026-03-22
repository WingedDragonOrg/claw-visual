/**
 * SoundManager — procedural sound effects via Web Audio API.
 * No external audio files needed.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Call on first user interaction to unlock AudioContext */
  unlock() {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  setMuted(v: boolean) {
    this.muted = v;
  }

  isMuted() { return this.muted; }

  /** Short "ping" for agent highlight / status change */
  ping() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } catch (_) {}
  }

  /** Soft "blip" for bubble appear */
  blip() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  }

  /** Cheerful "task done" arpeggio */
  arpeggio() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.start(t);
        osc.stop(t + 0.14);
      });
    } catch (_) {}
  }
}
