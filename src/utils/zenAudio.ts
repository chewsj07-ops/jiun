// Shared zero-dependency Web Audio synthesizer for wooden fish, singing bowl, and meditation bells.
// Works reliably across Safari, iOS, Android, Chrome, and offline PWA mode without external .ogg network failures.

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export interface WoodenFishSoundOptions {
  appearance?: 'fish' | 'lotus' | 'bowl';
  soundType?: 'standard' | 'crisp' | 'deep';
  volume?: number;
  isCombo?: boolean;
}

export function playWoodenFishHit({
  appearance = 'fish',
  soundType = 'standard',
  volume = 0.8,
  isCombo = false,
}: WoodenFishSoundOptions = {}): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedVol = Math.max(0.02, Math.min(isCombo ? volume * 1.15 : volume, 1.0));

    if (appearance === 'bowl') {
      // Tibetan singing bowl: warm fundamental + metallic inharmonic partials + long decay
      const baseFreq = soundType === 'crisp' ? 540 : soundType === 'deep' ? 320 : 432;
      const freq = isCombo ? baseFreq * 1.06 : baseFreq;
      const partials = [
        { ratio: 1, gain: 0.45, decay: 2.2 },
        { ratio: 2.756, gain: 0.2, decay: 1.4 },
        { ratio: 5.404, gain: 0.08, decay: 0.8 },
      ];

      partials.forEach(({ ratio, gain, decay }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * ratio, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(clampedVol * gain, now + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.05);
      });
      return;
    }

    // Hollow wooden fish ("木鱼") / lotus wood-block resonance
    const baseFreq =
      soundType === 'crisp'
        ? appearance === 'lotus' ? 920 : 840
        : soundType === 'deep'
        ? appearance === 'lotus' ? 500 : 420
        : appearance === 'lotus' ? 720 : 620;

    const startFreq = isCombo ? baseFreq * 1.08 : baseFreq;

    // 1. Hollow body tone
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    const bodyFilter = ctx.createBiquadFilter();

    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(startFreq, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(startFreq * 0.48, now + 0.09);

    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(startFreq * 1.1, now);
    bodyFilter.Q.setValueAtTime(2.5, now);

    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(clampedVol * 0.65, now + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    bodyOsc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.16);

    // 2. Crisp mallet attack transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(startFreq * 2.2, now);
    clickOsc.frequency.exponentialRampToValueAtTime(startFreq * 0.9, now + 0.025);

    clickGain.gain.setValueAtTime(clampedVol * 0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.04);
  } catch {
    // Ignore audio context restrictions gracefully
  }
}

export function playCompletionBell(volume = 0.7): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedVol = Math.max(0.02, Math.min(volume, 1.0));
    const partials = [
      { freq: 528, gain: 0.38, decay: 3.0 },
      { freq: 1056, gain: 0.16, decay: 2.0 },
      { freq: 1584, gain: 0.07, decay: 1.2 },
    ];

    partials.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(clampedVol * gain, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    });
  } catch {
    // Ignore audio context restrictions gracefully
  }
}

export function playBreathChime(volume = 0.25): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(396, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(Math.min(volume, 0.5), now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.25);
  } catch {
    // Ignore audio context restrictions gracefully
  }
}
