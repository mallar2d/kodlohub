import type { FoodType } from "./types";

class AudioManager {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private isTurboPlaying = false;

  constructor() {
    // Lazy init on first user gesture
  }

  private initCtx() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopTurbo();
    }
  }

  public getSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public playEat(type: FoodType = "bean") {
    if (!this.soundEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "carrot") {
        // Heavy double crunch
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (type === "sadoczyk") {
        // Magical apple powerup chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.22);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "drop") {
        // Liquid slurp / pop
        osc.type = "sine";
        osc.frequency.setValueAtTime(280 + Math.random() * 80, now);
        osc.frequency.exponentialRampToValueAtTime(650 + Math.random() * 100, now + 0.07);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        // Coffee bean crunch
        osc.type = "triangle";
        osc.frequency.setValueAtTime(380 + Math.random() * 120, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch {
      // Ignore audio errors
    }
  }

  public startTurbo() {
    if (!this.soundEnabled || this.isTurboPlaying) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      this.turboOsc = ctx.createOscillator();
      this.turboGain = ctx.createGain();

      this.turboOsc.type = "sawtooth";
      this.turboOsc.frequency.setValueAtTime(95, ctx.currentTime);

      this.turboGain.gain.setValueAtTime(0.01, ctx.currentTime);
      this.turboGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);

      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(ctx.destination);

      this.turboOsc.start();
      this.isTurboPlaying = true;
    } catch {
      // Ignore
    }
  }

  public stopTurbo() {
    if (!this.isTurboPlaying) return;
    try {
      if (this.turboGain && this.ctx) {
        this.turboGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      }
      setTimeout(() => {
        if (this.turboOsc) {
          try {
            this.turboOsc.stop();
            this.turboOsc.disconnect();
          } catch {}
          this.turboOsc = null;
        }
        this.isTurboPlaying = false;
      }, 90);
    } catch {
      this.isTurboPlaying = false;
    }
  }

  public playDeath() {
    if (!this.soundEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Ignore
    }
  }

  public playKill() {
    if (!this.soundEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "square";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc1.frequency.setValueAtTime(1046.5, now + 0.24); // C6

      osc2.frequency.setValueAtTime(261.63, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch {
      // Ignore
    }
  }

  public playClick() {
    if (!this.soundEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore
    }
  }
}

export const audio = new AudioManager();
