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
    if (!Number.isFinite(volume) || volume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedVol = Math.max(0.01, Math.min(isCombo ? volume * 1.15 : volume, 1.0));

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

export type MeditationReminderTone = 'bell' | 'bowl' | 'chime' | 'wood' | 'none';
export type AmbientSoundType = 'wind' | 'rain' | 'stream' | 'drone';

export function playCompletionBell(volume = 0.7): void {
  playMeditationCue('bell', volume, true);
}

export function playMeditationCue(
  tone: MeditationReminderTone = 'bell',
  volume = 0.7,
  isCompletion = false
): void {
  try {
    if (tone === 'none' || !Number.isFinite(volume) || volume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedVol = Math.max(0.01, Math.min(volume, 1.0));

    if (tone === 'wood') {
      playWoodenFishHit({
        appearance: 'fish',
        soundType: 'deep',
        volume: Math.min(0.85, clampedVol),
        isCombo: isCompletion,
      });
      if (isCompletion) {
        window.setTimeout(() => {
          playWoodenFishHit({
            appearance: 'fish',
            soundType: 'deep',
            volume: Math.min(0.7, clampedVol * 0.85),
            isCombo: false,
          });
        }, 420);
      }
      return;
    }

    if (tone === 'bowl') {
      const decayScale = isCompletion ? 1.35 : 1;
      const partials = [
        { freq: 396, gain: 0.42, decay: 2.6 * decayScale },
        { freq: 1091, gain: 0.16, decay: 1.7 * decayScale },
        { freq: 2140, gain: 0.06, decay: 0.9 * decayScale },
      ];
      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(clampedVol * gain, now + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.05);
      });
      return;
    }

    if (tone === 'chime') {
      const decayScale = isCompletion ? 1.25 : 1;
      const partials = [
        { freq: 880, gain: 0.3, decay: 2.0 * decayScale },
        { freq: 1760, gain: 0.14, decay: 1.4 * decayScale },
        { freq: 2640, gain: 0.06, decay: 0.9 * decayScale },
      ];
      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(clampedVol * gain, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.05);
      });
      return;
    }

    // Default 'bell': warm temple bell
    const decayScale = isCompletion ? 1.2 : 0.95;
    const partials = [
      { freq: 528, gain: 0.38, decay: 3.0 * decayScale },
      { freq: 1056, gain: 0.16, decay: 2.0 * decayScale },
      { freq: 1584, gain: 0.07, decay: 1.2 * decayScale },
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

export function playBreathChime(
  volume = 0.25,
  phase: 'inhale' | 'exhale' = 'inhale'
): void {
  try {
    if (!Number.isFinite(volume) || volume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    const startFreq = phase === 'inhale' ? 396 : 330;
    const endFreq = phase === 'inhale' ? 432 : 296;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.85);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(Math.min(volume, 0.45), now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  } catch {
    // Ignore audio context restrictions gracefully
  }
}

interface ActiveAmbientEngine {
  type: AmbientSoundType;
  masterGain: GainNode;
  stopNodes: () => void;
}

let activeAmbient: ActiveAmbientEngine | null = null;

function createPinkNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const output = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
    b6 = white * 0.115926;
    output[i] = Math.max(-0.95, Math.min(0.95, pink));
  }

  // Smooth crossfade at loop boundaries to avoid loop seam clicks
  const fadeSamples = Math.min(2048, Math.floor(length / 10));
  for (let i = 0; i < fadeSamples; i++) {
    const w = i / fadeSamples;
    output[i] = output[i] * w + output[length - fadeSamples + i] * (1 - w);
  }

  return buffer;
}

export function startAmbientSound(type: AmbientSoundType, volume = 0.6): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (activeAmbient && activeAmbient.type === type) {
      updateAmbientVolume(volume);
      return;
    }

    stopAmbientSound();

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    const targetGain = Math.max(0.0001, Math.min(volume, 1.0) * 0.42);
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.8);
    masterGain.connect(ctx.destination);

    const stopCallbacks: Array<() => void> = [];

    if (type === 'drone') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      filter.connect(masterGain);

      const freqs = [174, 261, 348];
      const gains = [0.22, 0.11, 0.05];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(gains[idx], now);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        stopCallbacks.push(() => {
          try {
            osc.stop();
            osc.disconnect();
            g.disconnect();
          } catch {
            // ignore
          }
        });
      });

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.11, now);
      lfoGain.gain.setValueAtTime(110, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);
      stopCallbacks.push(() => {
        try {
          lfo.stop();
          lfo.disconnect();
          lfoGain.disconnect();
          filter.disconnect();
        } catch {
          // ignore
        }
      });
    } else {
      const buffer = createPinkNoiseBuffer(ctx, 3);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      if (type === 'wind') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(340, now);
        filter.Q.setValueAtTime(1.4, now);
        lfo.frequency.setValueAtTime(0.12, now);
        lfoGain.gain.setValueAtTime(160, now);
      } else if (type === 'rain') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(0.65, now);
        lfo.frequency.setValueAtTime(0.18, now);
        lfoGain.gain.setValueAtTime(180, now);
      } else {
        // stream
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(760, now);
        filter.Q.setValueAtTime(1.1, now);
        lfo.frequency.setValueAtTime(0.25, now);
        lfoGain.gain.setValueAtTime(220, now);
      }

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      source.connect(filter);
      filter.connect(masterGain);

      source.start(now);
      lfo.start(now);

      stopCallbacks.push(() => {
        try {
          source.stop();
          lfo.stop();
          source.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          filter.disconnect();
        } catch {
          // ignore
        }
      });
    }

    activeAmbient = {
      type,
      masterGain,
      stopNodes: () => {
        stopCallbacks.forEach((cb) => cb());
        try {
          masterGain.disconnect();
        } catch {
          // ignore
        }
      },
    };
  } catch {
    // Ignore audio context restrictions gracefully
  }
}

export function updateAmbientVolume(volume: number): void {
  try {
    if (!activeAmbient || !sharedAudioCtx) return;
    const now = sharedAudioCtx.currentTime;
    const clamped = Math.max(0.0001, Math.min(volume, 1.0) * 0.42);
    activeAmbient.masterGain.gain.cancelScheduledValues(now);
    activeAmbient.masterGain.gain.setTargetAtTime(clamped, now, 0.08);
  } catch {
    // ignore
  }
}

export function stopAmbientSound(): void {
  try {
    if (!activeAmbient) return;
    const current = activeAmbient;
    activeAmbient = null;

    if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
      const now = sharedAudioCtx.currentTime;
      current.masterGain.gain.cancelScheduledValues(now);
      current.masterGain.gain.setValueAtTime(current.masterGain.gain.value, now);
      current.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      window.setTimeout(() => {
        current.stopNodes();
      }, 340);
    } else {
      current.stopNodes();
    }
  } catch {
    // ignore
  }
}
