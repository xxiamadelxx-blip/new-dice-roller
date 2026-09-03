let audioContext = null;
let noiseBuffer = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  try {
    audioContext = new AudioContextConstructor();
    return audioContext;
  } catch (_) {
    return null;
  }
}

function getNoiseBuffer(context) {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(context.sampleRate * 0.16);
  noiseBuffer = context.createBuffer(1, length, context.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    const fade = 1 - index / length;
    channel[index] = (Math.random() * 2 - 1) * fade;
  }
  return noiseBuffer;
}

function scheduleClack(context, when, pitch, volume) {
  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(pitch, when);
  filter.Q.setValueAtTime(5.5, when);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.095);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(when);
  source.stop(when + 0.11);

  const body = context.createOscillator();
  const bodyGain = context.createGain();
  body.type = 'triangle';
  body.frequency.setValueAtTime(Math.max(55, pitch * 0.11), when);
  body.frequency.exponentialRampToValueAtTime(Math.max(42, pitch * 0.07), when + 0.13);
  bodyGain.gain.setValueAtTime(0.0001, when);
  bodyGain.gain.exponentialRampToValueAtTime(volume * 0.42, when + 0.008);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
  body.connect(bodyGain).connect(context.destination);
  body.start(when);
  body.stop(when + 0.16);
}

export function playDiceRollSound(count = 1) {
  const context = getAudioContext();
  if (!context) return false;
  const resume = context.state === 'suspended' ? context.resume() : Promise.resolve();
  resume.then(() => {
    const start = context.currentTime + 0.012;
    const hits = Math.min(8, Math.max(3, Number(count) + 2));
    for (let index = 0; index < hits; index += 1) {
      const progress = index / Math.max(1, hits - 1);
      scheduleClack(context, start + progress * 0.68, 1180 + (index % 3) * 290, 0.045 + (index % 2) * 0.014);
    }
    scheduleClack(context, start + 0.76, 820, 0.09);
  }).catch(() => {});
  return true;
}

export function triggerDiceHaptic(kind = 'roll') {
  if (typeof navigator.vibrate !== 'function') return false;
  const pattern = kind === 'settle' ? [22, 26, 54] : [12, 18, 10, 24, 15];
  try {
    return navigator.vibrate(pattern);
  } catch (_) {
    return false;
  }
}

export function triggerDiceFeedback({ count = 1, sound = true, haptics = true, phase = 'roll' } = {}) {
  const soundPlayed = sound ? playDiceRollSound(count) : false;
  const hapticPlayed = haptics ? triggerDiceHaptic(phase) : false;
  return { soundPlayed, hapticPlayed };
}
