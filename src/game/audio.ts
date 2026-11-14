// Procedural Web Audio API synthesizer + safe haptic feedback for Patisserie Stack

const PENTATONIC_SCALE = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0,  // A5
  1046.5, // C6
  1174.66,// D6
  1318.51,// E6
];

class PatisserieAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public vibrate(pattern: number | number[]): void {
    if (this.muted) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore unsupported environments
      }
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  public playUiTap(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.045);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playDrop(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.14);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playSliceLand(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Soft sponge thump
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(175, now);
    thump.frequency.exponentialRampToValueAtTime(72, now + 0.11);
    thumpGain.gain.setValueAtTime(0.18, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.13);

    // Crisp pastry knife snip
    const snip = ctx.createOscillator();
    const snipGain = ctx.createGain();
    snip.type = 'triangle';
    snip.frequency.setValueAtTime(980, now + 0.01);
    snip.frequency.exponentialRampToValueAtTime(340, now + 0.09);
    snipGain.gain.setValueAtTime(0.09, now + 0.01);
    snipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    snip.connect(snipGain);
    snipGain.connect(ctx.destination);
    snip.start(now + 0.01);
    snip.stop(now + 0.11);

    this.vibrate(14);
  }

  public playPerfect(combo: number, widthRestored: boolean): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const noteIdx = Math.min(Math.max(0, combo - 1), PENTATONIC_SCALE.length - 1);
    const freq = PENTATONIC_SCALE[noteIdx];

    // Warm cushioned cake base
    const base = ctx.createOscillator();
    const baseGain = ctx.createGain();
    base.type = 'sine';
    base.frequency.setValueAtTime(190, now);
    base.frequency.exponentialRampToValueAtTime(95, now + 0.1);
    baseGain.gain.setValueAtTime(0.14, now);
    baseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    base.connect(baseGain);
    baseGain.connect(ctx.destination);
    base.start(now);
    base.stop(now + 0.12);

    // Clear glockenspiel chime
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(freq, now);
    chimeGain.gain.setValueAtTime(0.16, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chime.start(now);
    chime.stop(now + 0.38);

    // Extra shimmer arpeggio when combo widens the cake
    if (widthRestored) {
      const shimmerNotes = [freq * 1.25, freq * 1.5, freq * 2];
      shimmerNotes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + 0.055 * (i + 1);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
      this.vibrate([12, 24, 18]);
    } else {
      this.vibrate(10);
    }
  }

  public playGameOver(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [392.0, 329.63, 261.63, 196.0];
    notes.forEach((freq, i) => {
      const t = now + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, t + 0.18);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });

    this.vibrate([25, 35, 45]);
  }
}

export const patisserieAudio = new PatisserieAudioEngine();
