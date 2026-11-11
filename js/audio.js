/*
 * Sons sintetizados no navegador (sem arquivos de áudio) e fala do nome do bicho.
 * Navegadores só liberam som depois do primeiro toque: ver Sound.unlock().
 */
const Sound = (() => {
  const STORAGE_KEY = 'pets-memoria-mudo';
  let ctx = null;
  let muted = false;
  let speechReady = false;
  try { muted = localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { /* modo privado */ }

  function unlock() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    // No iPad, a fala só funciona depois de ser iniciada uma vez dentro de um toque
    if (!speechReady && 'speechSynthesis' in window) {
      speechReady = true;
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0;
      speechSynthesis.speak(silent);
    }
  }

  function note(freq, at, length, volume = 0.22, type = 'triangle') {
    if (!ctx || muted) return;
    const start = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  const melody = (notes, step, length, volume) =>
    notes.forEach((f, i) => note(f, i * step, length, volume));

  function say(word) {
    if (muted || !('speechSynthesis' in window)) return;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find((v) => /^pt[-_]BR/i.test(v.lang)) || voices.find((v) => /^pt/i.test(v.lang));
    if (!voice) return; // sem voz em português, é melhor o silêncio do que sotaque errado
    speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(word.toLowerCase());
    speech.voice = voice;
    speech.lang = voice.lang;
    speech.rate = 0.9;
    speech.pitch = 1.25;
    speechSynthesis.speak(speech);
  }

  return {
    unlock,
    say,
    isMuted: () => muted,
    toggle() {
      muted = !muted;
      try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (_) { /* modo privado */ }
      if (muted && 'speechSynthesis' in window) speechSynthesis.cancel();
      return muted;
    },
    tap:   () => note(660, 0, 0.09, 0.14, 'sine'),
    flip:  () => { note(520, 0, 0.07, 0.16, 'sine'); note(780, 0.05, 0.08, 0.12, 'sine'); },
    miss:  () => { note(392, 0, 0.2, 0.12, 'sine'); note(330, 0.16, 0.26, 0.12, 'sine'); },
    match: () => melody([523, 659, 784, 1047], 0.09, 0.32, 0.2),
    phaseWin: () => melody([523, 523, 659, 784, 659, 784, 1047], 0.13, 0.36, 0.2),
    gameWin:  () => melody([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.14, 0.45, 0.2),
  };
})();
