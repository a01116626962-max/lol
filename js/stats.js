// js/stats.js
window.Stats = (() => {
  const DAY = 24 * 60 * 60 * 1000;

  function toDateStr(d) {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  }

  function computeNewStreak(user, now = new Date()) {
    const today = toDateStr(now);
    const yesterday = toDateStr(new Date(now.getTime() - DAY));
    if (user.lastReviewDate === today) return user.streak;
    if (user.lastReviewDate === yesterday) return (user.streak || 0) + 1;
    return 1;
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  return { toDateStr, computeNewStreak, formatDuration };
})();
