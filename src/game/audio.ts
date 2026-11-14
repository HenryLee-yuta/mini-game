// Procedural Web Audio API synthesizer (cute patisserie BGM + SFX) + safe haptic feedback

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

// Cute French patisserie music-box / pizzicato waltz loop (8th-note steps, 128 BPM)
// 0 = rest; frequencies in Hz (C major -> F major -> Dm -> G7 -> C)
const BGM_MELODY: number[] = [
  // Bar 1 (C): E5 . G5 . C6 . A5 G5
  659.25, 0, 783.99, 0, 1046.5, 0, 880.0, 783.99,
  // Bar 2 (G/B): D5 . G5 . B5 . A5 G5
  587.33, 0, 783.99, 0, 987.77, 0, 880.0, 783.99,
  // Bar 3 (Am): E5 . A5 . C6 . B5 A5
  659.25, 0, 880.0, 0, 1046.5, 0, 987.77, 880.0,
  // Bar 4 (F -> G): F5 . A5 . G5 . . .
  698.46, 0, 880.0, 0, 783.99, 0, 659.25, 0,
  // Bar 5 (F): A5 . C6 . A5 . F5 .
  880.0, 0, 1046.5, 0, 880.0, 0, 698.46, 0,
  // Bar 6 (C/E): G5 . C6 . E6 . D6 C6
  783.99, 0, 1046.5, 0, 1318.51, 0, 1174.66, 1046.5,
  // Bar 7 (Dm7 -> G7): D6 . B5 . G5 . A5 B5
  1174.66, 0, 987.77, 0, 783.99, 0, 880.0, 987.77,
  // Bar 8 (C): C6 . G5 . C6 . . .
  1046.5, 0, 783.99, 0, 1046.5, 0, 0, 0,
];

// Soft bouncy bass/chord accompaniment (plays on beats 1, 2, 3, 4 of each bar)
const BGM_BASS: number[] = [
  // Bar 1 (C)
  261.63, 0, 329.63, 392.0, 261.63, 0, 392.0, 329.63,
  // Bar 2 (G)
  246.94, 0, 293.66, 392.0, 246.94, 0, 392.0, 293.66,
  // Bar 3 (Am)
  220.0, 0, 261.63, 329.63, 220.0, 0, 329.63, 261.63,
  // Bar 4 (F -> G)
  174.61, 0, 261.63, 0, 196.0, 0, 293.66, 0,
  // Bar 5 (F)
  174.61, 0, 261.63, 349.23, 174.61, 0, 349.23, 261.63,
  // Bar 6 (C)
  261.63, 0, 329.63, 392.0, 261.63, 0, 392.0, 329.63,
  // Bar 7 (Dm -> G7)
  293.66, 0, 349.23, 0, 196.0, 0, 293.66, 349.23,
  // Bar 8 (C)
  261.63, 0, 392.0, 329.63, 261.63, 0, 0, 0,
];

const STEP_DURATION = 60 / 128 / 2; // 128 BPM eighth-note (~0.234s)

class PatisserieAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  // BGM scheduler state
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private bgmTimer: number | null = null;
  private bgmPlaying = false;
  private bgmDucked = false;
  private bgmStep = 0;
  private nextNoteTime = 0;

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    } else if (this.bgmPlaying) {
      this.startMusic();
    }
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
    this.ensureBgmBus();
  }

  private ensureBgmBus(): void {
    if (!this.ctx || this.bgmGain) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    filter.connect(gain);
    gain.connect(this.ctx.destination);

    this.bgmFilter = filter;
    this.bgmGain = gain;
  }

  public startMusic(): void {
    this.bgmPlaying = true;
    if (this.muted || typeof window === 'undefined') return;

    this.unlock();
    if (!this.ctx || !this.bgmGain) return;

    const targetGain = this.bgmDucked ? 0.08 : 0.2;
    this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bgmGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);

    if (this.bgmTimer !== null) return;

    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.bgmTimer = window.setInterval(() => this.scheduleMusicSteps(), 70);
  }

  public stopMusic(keepIntent = false): void {
    if (!keepIntent) {
      this.bgmPlaying = false;
    }
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.ctx && this.bgmGain) {
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public setMusicPaused(paused: boolean): void {
    if (paused) {
      this.stopMusic(true);
    } else if (this.bgmPlaying && !this.muted) {
      this.startMusic();
    }
  }

  public setMusicDucked(ducked: boolean): void {
    this.bgmDucked = ducked;
    if (this.ctx && this.bgmGain && !this.muted && this.bgmPlaying) {
      const target = ducked ? 0.08 : 0.2;
      this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
    }
  }

  private scheduleMusicSteps(): void {
    if (!this.ctx || !this.bgmFilter || this.muted || this.ctx.state !== 'running') {
      return;
    }
    const lookAhead = 0.25;
    // Reset if tab was suspended and nextNoteTime fell far behind
    if (this.nextNoteTime < this.ctx.currentTime - 0.5) {
      this.nextNoteTime = this.ctx.currentTime + 0.04;
    }

    while (this.nextNoteTime < this.ctx.currentTime + lookAhead) {
      const step = this.bgmStep % BGM_MELODY.length;
      const melodyFreq = BGM_MELODY[step];
      const bassFreq = BGM_BASS[step];

      if (melodyFreq > 0) {
        this.triggerCelestaNote(melodyFreq, this.nextNoteTime, STEP_DURATION * 1.45);
      }
      if (bassFreq > 0) {
        this.triggerPizzBass(bassFreq, this.nextNoteTime, STEP_DURATION * 0.9);
      }

      this.nextNoteTime += STEP_DURATION;
      this.bgmStep = (this.bgmStep + 1) % BGM_MELODY.length;
    }
  }

  private triggerCelestaNote(freq: number, time: number, duration: number): void {
    if (!this.ctx || !this.bgmFilter) return;

    // Warm bell fundamental
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(0.24, time + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0008, time + duration);

    osc.connect(env);
    env.connect(this.bgmFilter);
    osc.start(time);
    osc.stop(time + duration + 0.02);

    // Subtle music-box octave sparkle
    const overtone = this.ctx.createOscillator();
    const overEnv = this.ctx.createGain();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, time);

    overEnv.gain.setValueAtTime(0.0001, time);
    overEnv.gain.linearRampToValueAtTime(0.045, time + 0.008);
    overEnv.gain.exponentialRampToValueAtTime(0.0005, time + duration * 0.55);

    overtone.connect(overEnv);
    overEnv.connect(this.bgmFilter);
    overtone.start(time);
    overtone.stop(time + duration * 0.6);
  }

  private triggerPizzBass(freq: number, time: number, duration: number): void {
    if (!this.ctx || !this.bgmFilter) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(0.14, time + 0.014);
    env.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(env);
    env.connect(this.bgmFilter);
    osc.start(time);
    osc.stop(time + duration + 0.02);
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
