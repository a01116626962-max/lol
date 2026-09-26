// js/export.js
window.Export = (() => {
  function toText(sentences) {
    return sentences.map(s => `${s.it}\n${s.ar}`).join('\n\n');
  }

  async function copyAll(sentences) {
    const text = toText(sentences);
    try {
      await navigator.clipboard.writeText(text);
      UI.toast(`تم نسخ ${sentences.length} جملة ✅`);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      UI.toast('تم النسخ ✅');
    }
  }

  function downloadTxt(sentences) {
    const lines = sentences.map(s => `${s.it}\n${s.ar}\n---`).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `imparo-backup-${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.toast('تم التحميل ✅');
  }

  return { copyAll, downloadTxt };
})();
