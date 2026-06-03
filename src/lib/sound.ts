"use client";

/**
 * The One Wish Willow sound engine.
 *
 * Everything here is synthesized live with the Web Audio API — no audio files,
 * no network, no licensing. This keeps the ritual sounding consistent and
 * loads instantly. Sounds: ambient wind/drone, chimes, typing whispers, the
 * tension build, the SNAP + golden burst, and the dry-crack failure.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambientNodes: { stop: () => void } | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function resumeAudio() {
  const c = ac();
  if (c && c.state === "suspended") void c.resume();
}

export function setMuted(value: boolean) {
  muted = value;
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(value ? 0 : 0.9, ctx.currentTime + 0.4);
  }
}

export function isMuted() {
  return muted;
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Low, slow, breathing drone + filtered wind. Returns a stop handle. */
export function startAmbient() {
  const c = ac();
  if (!c || !master || ambientNodes) return;

  const bus = c.createGain();
  bus.gain.value = 0;
  bus.connect(master);
  bus.gain.linearRampToValueAtTime(0.32, c.currentTime + 4);

  // Drone — two detuned low oscillators
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.value = 55;
  osc2.frequency.value = 55.6;
  const droneGain = c.createGain();
  droneGain.gain.value = 0.18;
  osc1.connect(droneGain);
  osc2.connect(droneGain);
  droneGain.connect(bus);

  // Slow LFO on the drone gain — "breathing"
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.1;
  lfo.connect(lfoGain);
  lfoGain.connect(droneGain.gain);

  // Wind — pink-ish filtered noise
  const wind = c.createBufferSource();
  wind.buffer = noiseBuffer(c, 6);
  wind.loop = true;
  const windFilter = c.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 420;
  windFilter.Q.value = 0.6;
  const windGain = c.createGain();
  windGain.gain.value = 0.06;
  wind.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(bus);

  // Slow filter sweep on the wind
  const windLfo = c.createOscillator();
  windLfo.frequency.value = 0.05;
  const windLfoGain = c.createGain();
  windLfoGain.gain.value = 180;
  windLfo.connect(windLfoGain);
  windLfoGain.connect(windFilter.frequency);

  osc1.start();
  osc2.start();
  lfo.start();
  wind.start();
  windLfo.start();

  ambientNodes = {
    stop: () => {
      try {
        bus.gain.cancelScheduledValues(c.currentTime);
        bus.gain.linearRampToValueAtTime(0, c.currentTime + 1.4);
        osc1.stop(c.currentTime + 1.6);
        osc2.stop(c.currentTime + 1.6);
        lfo.stop(c.currentTime + 1.6);
        wind.stop(c.currentTime + 1.6);
        windLfo.stop(c.currentTime + 1.6);
      } catch {
        /* noop */
      }
      ambientNodes = null;
    },
  };
}

export function stopAmbient() {
  ambientNodes?.stop();
}

/** A soft chime — used sparingly for arrivals / hovers. */
export function chime(base = 880) {
  const c = ac();
  if (!c || !master) return;
  const now = c.currentTime;
  [base, base * 1.5].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.value = 0;
    o.connect(g);
    g.connect(master!);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.08 - i * 0.03, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    o.start(now);
    o.stop(now + 1.7);
  });
}

/** Faint whisper for each keystroke while writing a wish. */
export function whisper() {
  const c = ac();
  if (!c || !master) return;
  const now = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.18);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1400 + Math.random() * 1600;
  f.Q.value = 2.5;
  const g = c.createGain();
  g.gain.value = 0;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  g.gain.linearRampToValueAtTime(0.02, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  src.start(now);
  src.stop(now + 0.18);
}

/** Low rumble that swells over `seconds` — the tension before the snap. */
export function rumble(seconds = 3.2) {
  const c = ac();
  if (!c || !master) return;
  const now = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, seconds + 0.5);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 90;
  const g = c.createGain();
  g.gain.value = 0;
  src.connect(lp);
  lp.connect(g);
  g.connect(master);
  g.gain.linearRampToValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.35, now + seconds);
  g.gain.linearRampToValueAtTime(0.0001, now + seconds + 0.35);
  src.start(now);
  src.stop(now + seconds + 0.5);
}

/** The SNAP + golden burst. */
export function snap() {
  const c = ac();
  if (!c || !master) return;
  const now = c.currentTime;

  // Sharp crack — short burst of high noise through a quick decay
  const crack = c.createBufferSource();
  crack.buffer = noiseBuffer(c, 0.4);
  const crackHp = c.createBiquadFilter();
  crackHp.type = "highpass";
  crackHp.frequency.value = 1800;
  const crackGain = c.createGain();
  crackGain.gain.setValueAtTime(0.9, now);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  crack.connect(crackHp);
  crackHp.connect(crackGain);
  crackGain.connect(master);
  crack.start(now);
  crack.stop(now + 0.4);

  // Body thump
  const thump = c.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(140, now);
  thump.frequency.exponentialRampToValueAtTime(38, now + 0.4);
  const thumpGain = c.createGain();
  thumpGain.gain.setValueAtTime(0.6, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  thump.connect(thumpGain);
  thumpGain.connect(master);
  thump.start(now);
  thump.stop(now + 0.55);

  // Golden shimmer burst — bright noise tail
  const shimmer = c.createBufferSource();
  shimmer.buffer = noiseBuffer(c, 1.8);
  const sf = c.createBiquadFilter();
  sf.type = "highpass";
  sf.frequency.value = 3200;
  const sg = c.createGain();
  sg.gain.setValueAtTime(0, now + 0.04);
  sg.gain.linearRampToValueAtTime(0.16, now + 0.1);
  sg.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  shimmer.connect(sf);
  sf.connect(sg);
  sg.connect(master);
  shimmer.start(now + 0.04);
  shimmer.stop(now + 1.9);
}

/** Failure: a dry crack and a fading echo, then silence. */
export function dryCrack() {
  const c = ac();
  if (!c || !master) return;
  const now = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.3);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 900;
  bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.5, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(now);
  src.stop(now + 0.3);

  // fading echo
  const echo = c.createOscillator();
  echo.type = "triangle";
  echo.frequency.value = 220;
  const eg = c.createGain();
  eg.gain.setValueAtTime(0.0001, now + 0.1);
  eg.gain.linearRampToValueAtTime(0.08, now + 0.16);
  eg.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
  echo.connect(eg);
  eg.connect(master);
  echo.start(now + 0.1);
  echo.stop(now + 1.2);
}
