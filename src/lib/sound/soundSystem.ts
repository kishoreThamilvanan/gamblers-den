// Web Audio API pure synthesizer for zero-dependency, ultra-realistic casino audio.
// Generates authentic chip clacks, card flicks, table knocks, and ambient room murmurs.

class SoundSystem {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientSource: AudioNode | null = null;
  private isAmbientPlaying: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.15, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.15, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsAmbientPlaying(): boolean {
    return this.isAmbientPlaying;
  }

  /**
   * Crisp, layered casino chip click / clack.
   * Synthesized using bandpass filtered white noise burst + resonant ceramic decay.
   */
  public playChipSound(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.7, t);
    masterGain.connect(ctx.destination);

    // High frequency ceramic transient (1800Hz - 2800Hz)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime((2200 + Math.random() * 400) * pitchMultiplier, t);
    osc.frequency.exponentialRampToValueAtTime(800 * pitchMultiplier, t + 0.04);

    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.05);

    // Clay/ceramic noise impact
    const bufferSize = ctx.sampleRate * 0.03;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(3200 * pitchMultiplier, t);
    bandpass.Q.setValueAtTime(4.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(masterGain);

    noise.start(t);
    noise.stop(t + 0.035);
  }

  /**
   * Cascade of multiple chips splashing into pot or stacking.
   */
  public playChipSplash() {
    if (this.isMuted) return;
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playChipSound(0.9 + Math.random() * 0.3);
      }, i * (25 + Math.random() * 20));
    }
  }

  /**
   * Crisp, slick card deal / snap / flick.
   */
  public playCardDeal() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, t);
    masterGain.connect(ctx.destination);

    // Filtered noise swoosh of card leaving shoe / sliding on felt
    const bufferSize = ctx.sampleRate * 0.08;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(3400, t + 0.04);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.08);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, t);
    noiseGain.gain.linearRampToValueAtTime(0.7, t + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noise.start(t);
    noise.stop(t + 0.085);
  }

  /**
   * Card peeling sound - tactile paper friction.
   */
  public playCardPeel() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    const bufferSize = ctx.sampleRate * 0.12;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.13);
  }

  /**
   * Multi-Density Chip Sound Escalation:
   * - Small Bets ($1 - $6): Crisp, single-chip ceramic tick.
   * - Standard Bets ($7 - $45): Rhythmic multi-chip clack of a short barrel sliding forward.
   * - Heavy Overbets & All-Ins ($46+ or >= pot): Deep resonant felt thud + loud chip scatter cascade.
   */
  public playBetByDensity(betAmount: number, potAmount: number = 10) {
    if (this.isMuted) return;
    if (betAmount <= 6) {
      this.playChipSound(1.12);
      return;
    }
    if (betAmount >= 65 || (betAmount >= 35 && betAmount >= potAmount)) {
      this.playHeavyAllInThud();
      return;
    }
    this.playChipSplash();
  }

  /**
   * Deep resonant thud + scatter cascade for heavy bets and all-in shoves.
   */
  public playHeavyAllInThud() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (ctx) {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.14);

      gain.gain.setValueAtTime(this.volume * 0.95, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    }

    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playChipSound(0.75 + Math.random() * 0.45);
      }, i * (18 + Math.random() * 18));
    }
  }

  /**
   * Card snap sound when releasing a 3D peeked card flat back onto the felt.
   */
  public playCardSnap() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.04);

    gain.gain.setValueAtTime(this.volume * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Double wooden table knock for Check (tap... tap).
   */
  public playCheckKnock() {
    if (this.isMuted) return;
    this.playSingleKnock(0);
    setTimeout(() => {
      this.playSingleKnock(20);
    }, 110);
  }

  private playSingleKnock(freqOffset: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 + freqOffset, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

    oscGain.gain.setValueAtTime(this.volume * 0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    // Wood transient click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(420, t);
    clickGain.gain.setValueAtTime(this.volume * 0.3, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
    click.start(t);
    click.stop(t + 0.03);
  }

  /**
   * Win pot slide - satisfying celebratory chip slide and soft harmonic chord.
   */
  public playWinPot() {
    if (this.isMuted) return;
    this.playChipSplash();
    setTimeout(() => this.playChipSplash(), 150);

    const ctx = this.getContext();
    if (!ctx) return;

    // Soft warm chord (F, A, C)
    const freqs = [349.23, 440.0, 523.25];
    const t = ctx.currentTime;
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.06);

      gain.gain.setValueAtTime(0.001, t + idx * 0.06);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, t + idx * 0.06 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.85);
    });
  }

  /**
   * Ambient casino room soundscape generator:
   * Continuous gentle brown/pink noise floor with low-pass filtering and subtle random riffling.
   */
  public toggleAmbientRoom(): boolean {
    if (this.isAmbientPlaying) {
      this.stopAmbientRoom();
      return false;
    } else {
      this.startAmbientRoom();
      return true;
    }
  }

  public startAmbientRoom() {
    const ctx = this.getContext();
    if (!ctx) return;

    if (this.isAmbientPlaying) return;
    this.isAmbientPlaying = true;

    // 5 seconds looping brown noise buffer for background room tone
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brownian noise approximation
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 1.2;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Filter to muffled background hum
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.15, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    this.ambientSource = source;
    this.ambientGain = gain;
  }

  public stopAmbientRoom() {
    if (this.ambientSource) {
      try {
        (this.ambientSource as AudioBufferSourceNode).stop();
      } catch {}
      this.ambientSource = null;
    }
    this.ambientGain = null;
    this.isAmbientPlaying = false;
  }
}

export const sound = new SoundSystem();
