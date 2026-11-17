// ============================================================================
// JUST2PAY - ADMIN REAL-TIME AUDIO NOTIFICATION ENGINE
// Professional Web Audio API Synthesizer with Custom Event Routing & Presets
// ============================================================================

export type SoundPresetKey = 
  | 'cash_register'
  | 'bell_chime'
  | 'electronic_swoosh'
  | 'success_fanfare'
  | 'digital_alert'
  | 'gentle_pop'
  | 'marimba_chime';

export interface SoundPreset {
  id: SoundPresetKey;
  name: string;
  description: string;
  category: 'chime' | 'cash' | 'digital' | 'melodic';
}

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'cash_register',
    name: '🪙 Coin Drop & Cha-Ching',
    description: 'Metallic coins clinking into cash tray (Best for QR Requests)',
    category: 'cash'
  },
  {
    id: 'bell_chime',
    name: '🔔 Crystal Ding Chime',
    description: 'Smooth harmonic bell tone with soft decay (Best for CC Bills)',
    category: 'chime'
  },
  {
    id: 'electronic_swoosh',
    name: '⚡ Cyber IMPS Swoosh',
    description: 'Fast high-tech rising frequency ping (Best for Payouts)',
    category: 'digital'
  },
  {
    id: 'success_fanfare',
    name: '✨ Victory Upward Arpeggio',
    description: 'Crisp 4-note upward chord fanfare (Best for Live Bill Pay)',
    category: 'melodic'
  },
  {
    id: 'digital_alert',
    name: '📟 Double Pulse Beep',
    description: 'Dual high-contrast clear digital alert pulses',
    category: 'digital'
  },
  {
    id: 'gentle_pop',
    name: '🫧 Modern Bubble Pop',
    description: 'Subtle, unobtrusive gentle notification pop',
    category: 'chime'
  },
  {
    id: 'marimba_chime',
    name: '🪵 Acoustic Marimba Drop',
    description: 'Warm acoustic wooden chime melody',
    category: 'melodic'
  }
];

export interface AdminSoundSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  qrSound: SoundPresetKey;
  ccBillSound: SoundPresetKey;
  payoutSound: SoundPresetKey;
  liveBillSound: SoundPresetKey;
  showToasts: boolean;
}

const SETTINGS_KEY = 'just2pay_admin_sound_settings_v1';

export const DEFAULT_SOUND_SETTINGS: AdminSoundSettings = {
  enabled: true,
  volume: 0.8,
  qrSound: 'cash_register',
  ccBillSound: 'bell_chime',
  payoutSound: 'electronic_swoosh',
  liveBillSound: 'success_fanfare',
  showToasts: true
};

// Singleton Audio Context
let sharedAudioCtx: AudioContext | null = null;
let audioUnlocked = false;

export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  return sharedAudioCtx;
};

// Auto-unlock on first user interaction in browser
export const unlockAudio = () => {
  if (audioUnlocked) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      audioUnlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === 'running') {
    audioUnlocked = true;
  }
};

if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'keydown'];
  const handleUnlock = () => {
    unlockAudio();
    unlockEvents.forEach(evt => window.removeEventListener(evt, handleUnlock));
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleUnlock, { passive: true, once: true }));
}

// ----------------------------------------------------------------------------
// SYNTHESIS ENGINES FOR EACH PRESET
// ----------------------------------------------------------------------------

const synthesizeTone = (preset: SoundPresetKey, volume: number) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const masterVol = Math.max(0.01, Math.min(volume, 1.0));
  const now = ctx.currentTime;

  switch (preset) {
    case 'cash_register': {
      // 1. Rapid series of 4 coin drops
      const coinFreqs = [2400, 3100, 2800, 3800];
      coinFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        
        gain.gain.setValueAtTime(masterVol * 0.4, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.09);
      });

      // 2. Lingering register chime
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1760, now + 0.16); // A6
      bellGain.gain.setValueAtTime(masterVol * 0.6, now + 0.16);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16 + 0.6);

      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(now + 0.16);
      bell.stop(now + 0.16 + 0.65);
      break;
    }

    case 'bell_chime': {
      // Harmonic crystal bell (Fundamental + 2nd Harmonic)
      const freqs = [1046.5, 2093.0]; // C6 & C7
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        const amp = idx === 0 ? masterVol * 0.7 : masterVol * 0.35;
        gain.gain.setValueAtTime(amp, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      });
      break;
    }

    case 'electronic_swoosh': {
      // Upward frequency swoop with resonant ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      // Sweep pitch up from 400Hz to 1600Hz
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(1580, now + 0.15);

      gain.gain.setValueAtTime(masterVol * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      // Lowpass filter to smooth harshness
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
      break;
    }

    case 'success_fanfare': {
      // 4-note upward chord: C5 -> E5 -> G5 -> C6
      const chord = [523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.065);

        gain.gain.setValueAtTime(masterVol * 0.55, now + i * 0.065);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + (i === 3 ? 0.5 : 0.2));

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.065);
        osc.stop(now + i * 0.065 + (i === 3 ? 0.55 : 0.25));
      });
      break;
    }

    case 'digital_alert': {
      // Dual high-pitch pulse beep (880Hz -> 1174Hz)
      const pulses = [
        { f: 880, start: 0, dur: 0.09 },
        { f: 1174.66, start: 0.12, dur: 0.15 }
      ];
      pulses.forEach(p => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(p.f, now + p.start);

        gain.gain.setValueAtTime(masterVol * 0.3, now + p.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + p.start + p.dur);

        // Filter square wave to make it musical rather than abrasive
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now + p.start);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + p.start);
        osc.stop(now + p.start + p.dur + 0.02);
      });
      break;
    }

    case 'gentle_pop': {
      // Warm frequency drop bubble pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.09);

      gain.gain.setValueAtTime(masterVol * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
      break;
    }

    case 'marimba_chime': {
      // Double acoustic wooden bar strike
      const notes = [
        { f: 739.99, t: 0 },    // F#5
        { f: 1108.73, t: 0.08 } // C#6
      ];
      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(masterVol * 0.6, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + 0.38);
      });
      break;
    }

    default:
      break;
  }
};

// ----------------------------------------------------------------------------
// SETTINGS PERSISTENCE & HELPERS
// ----------------------------------------------------------------------------

export const getStoredSoundSettings = (): AdminSoundSettings => {
  if (typeof window === 'undefined') return DEFAULT_SOUND_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SOUND_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SOUND_SETTINGS,
      ...parsed
    };
  } catch (err) {
    console.warn('Failed to parse sound settings, using defaults:', err);
    return DEFAULT_SOUND_SETTINGS;
  }
};

export const saveSoundSettings = (settings: AdminSoundSettings) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('just2pay_sound_settings_changed', { detail: settings }));
  } catch (err) {
    console.error('Failed to save sound settings:', err);
  }
};

// ----------------------------------------------------------------------------
// PUBLIC PLAY API
// ----------------------------------------------------------------------------

export type AdminSoundEventType = 'qr' | 'cc_bill' | 'payout' | 'live_bill';

export const playSoundPreview = (preset: SoundPresetKey, volume?: number) => {
  const currentSettings = getStoredSoundSettings();
  const vol = volume !== undefined ? volume : currentSettings.volume;
  synthesizeTone(preset, vol);
};

export const playEventSound = (eventType: AdminSoundEventType) => {
  const settings = getStoredSoundSettings();
  if (!settings.enabled) return;

  let presetToPlay: SoundPresetKey = 'cash_register';
  switch (eventType) {
    case 'qr':
      presetToPlay = settings.qrSound;
      break;
    case 'cc_bill':
      presetToPlay = settings.ccBillSound;
      break;
    case 'payout':
      presetToPlay = settings.payoutSound;
      break;
    case 'live_bill':
      presetToPlay = settings.liveBillSound;
      break;
  }

  synthesizeTone(presetToPlay, settings.volume);
};

