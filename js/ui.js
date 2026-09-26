// js/ui.js
window.UI = (() => {
  let toastTimer = null;

  function show(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(viewId);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(msg, ms = 2000) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
  }

  function confirm(text) {
    return new Promise(resolve => {
      const modal = document.getElementById('confirm-modal');
      document.getElementById('confirm-text').textContent = text;
      modal.classList.remove('hidden');

      const yes = document.getElementById('confirm-yes');
      const no = document.getElementById('confirm-no');

      const cleanup = () => {
        modal.classList.add('hidden');
        yes.removeEventListener('click', onYes);
        no.removeEventListener('click', onNo);
      };
      const onYes = () => { cleanup(); resolve(true); };
      const onNo = () => { cleanup(); resolve(false); };

      yes.addEventListener('click', onYes);
      no.addEventListener('click', onNo);
    });
  }

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = dark ? '☀️' : '🌙';
  }

  function emptyState(emoji, text) {
    return `<div class="empty-state"><div class="emoji">${emoji}</div><div>${text}</div></div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  return { show, toast, confirm, applyTheme, emptyState, escapeHtml };
})();
