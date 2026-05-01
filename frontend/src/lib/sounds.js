// Synthesized sounds via WebAudio API — no external files needed.
// Kept simple: two short tones for start, ascending arpeggio for completion.

let _ctx = null;
const getCtx = () => {
  try {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch { return null; }
};

const beep = (freq, duration, type = 'sine', gain = 0.12, delay = 0) => {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ctx.destination);
  const t0 = ctx.currentTime + delay;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
};

export const playStartSound = () => {
  // Short futuristic "power on" — 2 quick notes ascending
  beep(440, 0.12, 'triangle', 0.18, 0);
  beep(660, 0.18, 'sine', 0.16, 0.12);
};

export const playSuccessSound = () => {
  // Arpeggio: C-E-G-C (major)
  beep(523, 0.13, 'sine', 0.15, 0);
  beep(659, 0.13, 'sine', 0.15, 0.12);
  beep(784, 0.14, 'sine', 0.15, 0.24);
  beep(1047, 0.22, 'triangle', 0.18, 0.38);
};
