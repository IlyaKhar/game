// Lightweight Web Audio API synth for crisp arcade SFX with zero external audio files.
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public tone(freq: number, duration = 0.09, type: OscillatorType = 'triangle', volume = 0.12, slideTo?: number): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  public jump(): void {
    this.tone(280, 0.12, 'square', 0.08, 620);
  }

  public coin(): void {
    this.tone(780, 0.07, 'sine', 0.12, 1180);
  }

  public clear(): void {
    this.tone(440, 0.09, 'triangle', 0.14, 880);
    setTimeout(() => this.tone(660, 0.13, 'triangle', 0.12, 1320), 65);
  }

  public hit(): void {
    this.tone(170, 0.24, 'sawtooth', 0.14, 52);
  }
}

export const sfx = new SoundEngine();

