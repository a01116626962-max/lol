// js/srs.js
window.SRS = (() => {
  const DAY = 24 * 60 * 60 * 1000;
  const Rating = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' };

  function tomorrowAt10AM(now = new Date()) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  }

  function getTodayCutoff(now = new Date()) {
    const d = new Date(now);
    const cutoff = new Date(d);
    cutoff.setHours(10, 0, 0, 0);
    if (d < cutoff) cutoff.setDate(cutoff.getDate() - 1);
    return cutoff;
  }

  /**
   * يحسب موعد المراجعة القادم بناءً على التقييم (Overdue Rule: يستخدم now)
   */
  function computeNextReview(card, rating, now = new Date()) {
    const base = new Date(now);
    let next = new Date(base);
    let easyStreak = card.easyStreak || 0;
    let mediumStreak = card.mediumStreak || 0;
    let isMistake = card.isMistake || false;

    switch (rating) {
      case Rating.EASY:
        if (easyStreak < 4) {
          easyStreak += 1;
          next.setDate(next.getDate() + 7);
        } else {
          next.setDate(next.getDate() + 30);
        }
        mediumStreak = 0;
        isMistake = false;
        break;

      case Rating.MEDIUM:
        if (mediumStreak < 4) {
          mediumStreak += 1;
          next.setDate(next.getDate() + 2);
        } else {
          next.setDate(next.getDate() + 7);
        }
        easyStreak = 0;
        isMistake = false;
        break;

      case Rating.HARD:
        next = tomorrowAt10AM(now);
        easyStreak = 0;
        mediumStreak = 0;
        isMistake = true;
        break;
    }

    return {
      nextReview: firebase.firestore.Timestamp.fromDate(next),
      easyStreak,
      mediumStreak,
      isMistake,
      lastReviewed: firebase.firestore.Timestamp.now(),
      status: easyStreak >= 4 ? 'mastered' : 'reviewing'
    };
  }

  /**
   * هل البطاقة مستحقة اليوم؟
   */
  function isDue(card, now = new Date()) {
    if (card.isFrozen) return false;
    if (!card.nextReview) return true;
    const cutoff = getTodayCutoff(now);
    return card.nextReview.toDate() <= cutoff;
  }

  function isOverdue(card, now = new Date()) {
    if (!card.nextReview) return false;
    return card.nextReview.toDate() < now;
  }

  return { Rating, computeNextReview, isDue, isOverdue, getTodayCutoff, tomorrowAt10AM };
})();
