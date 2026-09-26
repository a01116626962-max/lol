// js/audio.js
window.Audio = (() => {
  let voice = null;
  let rate = 1.0;

  function init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      const voices = speechSynthesis.getVoices();
      voice = voices.find(v => v.lang === 'it-IT')
           || voices.find(v => v.lang && v.lang.startsWith('it'))
           || null;
    };
    load();
    speechSynthesis.onvoiceschanged = load;
  }

  function setRate(r) { rate = r; }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      UI.toast('الصوت غير مدعوم في متصفحك');
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT';
    u.rate = rate;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  function isSupported() {
    return 'speechSynthesis' in window;
  }

  return { init, speak, setRate, isSupported };
})();
