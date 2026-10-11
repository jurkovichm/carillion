// Short, original Web Audio effects; one bus lets mute and scene exit stop them instantly.
let loonAudioBus = null;
const loonAudioSources = new Set();
function stopLoonAudio() {
  for (const source of loonAudioSources) { try { source.stop(); } catch {} }
  loonAudioSources.clear();
  loonAudioBus?.disconnect(); loonAudioBus = null;
}
function setLoonSoundEnabled(on) {
  if (loonAudioBus) { loonAudioBus.gain.cancelScheduledValues(0); loonAudioBus.gain.value = on ? 1 : 0; }
  const button = $('#loonSoundToggle');
  if (button) {
    button.textContent = on ? 'SFX ON' : 'SFX OFF';
    button.setAttribute('aria-label', on ? 'Mute loon game sound' : 'Enable loon game sound');
  }
}
function loonSound(name) {
  if (!soundEnabled) return;
  const ctx = soundContext(); if (!ctx) return;
  if (!loonAudioBus) { loonAudioBus = ctx.createGain(); loonAudioBus.connect(ctx.destination); }
  const track = source => {
    loonAudioSources.add(source);
    source.onended = () => { loonAudioSources.delete(source); source.disconnect(); };
  };
  const tone = (from, to, duration, volume, delay = 0, type = 'sine', vibrato = false) => {
    const start = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(from, start); osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(gain); gain.connect(loonAudioBus); track(osc);
    if (vibrato) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 7; depth.gain.value = 18; lfo.connect(depth); depth.connect(osc.frequency);
      track(lfo); lfo.start(start); lfo.stop(start + duration);
    }
    osc.start(start); osc.stop(start + duration + .02);
  };
  const noise = (duration, volume, frequency, delay = 0) => {
    const start = ctx.currentTime + delay, buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // An independent noise sequence cannot change obstacle randomness when sound is enabled.
    let seed = 173;
    for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647 * 2 - 1) * (1 - i / data.length); }
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(loonAudioBus); track(source);
    source.start(start); source.stop(start + duration + .02);
  };
  if (name === 'call') { tone(480, 760, .3, .026, 0, 'sine', true); tone(680, 430, .48, .022, .25, 'sine', true); }
  else if (name === 'stroke') { noise(.12, .014, 650); tone(120, 85, .1, .006); }
  else if (name === 'jump') { noise(.16, .035, 1200); tone(210, 470, .16, .017); }
  else if (name === 'land') { noise(.27, .04, 850); tone(180, 75, .22, .022); tone(320, 150, .1, .06, .08); }
  else if (name === 'collision') { noise(.17, .045, 330); tone(125, 45, .3, .04, 0, 'triangle'); }
  else if (name === 'punch') { noise(.09, .075, 950); tone(145, 42, .19, .055, 0, 'triangle'); tone(690, 270, .25, .015, .07, 'sine', true); }
  else if (name === 'current') { tone(440, 550, .1, .018, 0, 'triangle'); tone(660, 820, .14, .014, .12, 'triangle'); }
  else if (name === 'recover') { tone(523, 523, .15, .022, 0, 'triangle'); tone(659, 659, .15, .022, .11, 'triangle'); tone(784, 784, .3, .021, .23, 'triangle'); }
}
