// js/app.js
(() => {
  'use strict';

  const state = {
    user: null,
    sentences: [],
    reviewQueue: [],
    reviewIndex: 0,
    sessionStats: { easy: 0, medium: 0, hard: 0, startedAt: null },
    currentList: null,
    revealed: false
  };

  // ===== Helpers =====
  const $ = id => document.getElementById(id);
  const cutoffTs = () => firebase.firestore.Timestamp.fromDate(SRS.getTodayCutoff());

  // ===== Init =====
  async function init() {
    setupTheme();
    Audio.init();
    registerSW();

    Auth.onChange(async user => {
      if (!user) {
        try { await Auth.signIn(); } catch (e) { UI.toast('فشل الاتصال'); }
        return;
      }
      state.user = user;
      await DB.ensureUser(user.uid);
      await loadAll();
      $('splash').classList.add('hidden');
      $('app').classList.remove('hidden');
      UI.show('view-dashboard');
      renderDashboard();
      bindEvents();
    });
  }

  function setupTheme() {
    const saved = localStorage.getItem('imparo-theme');
    const dark = saved ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    UI.applyTheme(dark);
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  // ===== Load =====
  async function loadAll() {
    state.sentences = await DB.getAllSentences(state.user.uid);
  }

  async function loadUser() {
    state.userDoc = await DB.getUser(state.user.uid);
  }

  // ===== Dashboard =====
  function renderDashboard() {
    const all = state.sentences;
    const daily = all.filter(s => SRS.isDue(s));
    const mistakes = all.filter(s => s.isMistake && !s.isFrozen);
    const frozen = all.filter(s => s.isFrozen);

    $('today-count').textContent = daily.length;
    $('total-count').textContent = all.length;
    $('mistake-count').textContent = mistakes.length;

    $('count-daily').textContent = `${daily.length} جملة`;
    $('count-mistake').textContent = `${mistakes.length} جملة`;
    $('count-frozen').textContent = `${frozen.length} جملة`;
    $('count-all').textContent = `${all.length} جملة`;

    loadUser().then(() => {
      $('streak-count').textContent = state.userDoc?.streak || 0;
    });
  }

  // ===== Review =====
  async function startReview() {
    state.reviewQueue = state.sentences.filter(s => SRS.isDue(s));
    if (state.reviewQueue.length === 0) {
      UI.toast('🎉 لا توجد مراجعات اليوم');
      return;
    }
    state.reviewIndex = 0;
    state.sessionStats = { easy: 0, medium: 0, hard: 0, startedAt: new Date() };
    UI.show('view-review');
    renderCard();
  }

  function renderCard() {
    const card = state.reviewQueue[state.reviewIndex];
    if (!card) return finishReview();

    state.revealed = false;
    $('card-ar').classList.add('hidden');
    $('card-hint').classList.remove('hidden');
    $('rating-actions').classList.add('hidden');

    // الجملة الإيطالية مع كلمات قابلة للنقر
    const html = card.it.split(/\s+/).map(w =>
      `<span class="word" data-word="${UI.escapeHtml(w)}">${UI.escapeHtml(w)}</span>`
    ).join(' ');
    $('card-it').innerHTML = html;
    $('card-ar').textContent = card.ar;

    // Progress
    const total = state.reviewQueue.length;
    const done = state.reviewIndex;
    $('progress-fill').style.width = `${(done / total) * 100}%`;
    $('progress-text').textContent = `${done} / ${total}`;

    // Audio
    if (state.userDoc?.settings?.autoPlay !== false) {
      Audio.speak(card.it);
    }
  }

  function revealCard() {
    if (state.revealed) return;
    state.revealed = true;
    $('card-ar').classList.remove('hidden');
    $('card-hint').classList.add('hidden');
    $('rating-actions').classList.remove('hidden');
  }

  async function rateCard(rating) {
    const card = state.reviewQueue[state.reviewIndex];
    const updates = SRS.computeNextReview(card, rating);
    await DB.updateSentence(state.user.uid, card.id, updates);

    state.sessionStats[rating] += 1;
    Object.assign(card, updates);

    state.reviewIndex += 1;
    if (state.reviewIndex >= state.reviewQueue.length) {
      finishReview();
    } else {
      renderCard();
    }
  }

  async function finishReview() {
    // تحديث الـ streak
    const user = await DB.getUser(state.user.uid);
    const today = Stats.toDateStr(new Date());
    const newStreak = Stats.computeNewStreak(user);
    await DB.updateUser(state.user.uid, {
      streak: newStreak,
      lastReviewDate: today
    });

    // حفظ الجلسة
    const total = state.sessionStats.easy + state.sessionStats.medium + state.sessionStats.hard;
    if (total > 0) {
      await DB.addSession(state.user.uid, {
        date: today,
        cardsReviewed: total,
        easy: state.sessionStats.easy,
        medium: state.sessionStats.medium,
        hard: state.sessionStats.hard,
        durationSec: Math.round((Date.now() - state.sessionStats.startedAt.getTime()) / 1000),
        startedAt: state.sessionStats.startedAt
      });
    }

    // Summary
    $('sum-total').textContent = total;
    $('sum-easy').textContent = state.sessionStats.easy;
    $('sum-medium').textContent = state.sessionStats.medium;
    $('sum-hard').textContent = state.sessionStats.hard;
    $('sum-duration').textContent = Stats.formatDuration(
      Math.round((Date.now() - state.sessionStats.startedAt.getTime()) / 1000)
    );
    $('streak-count').textContent = newStreak;

    await loadAll();
    UI.show('view-summary');
  }

  // ===== Lists =====
  async function openList(type) {
    state.currentList = type;
    const all = state.sentences;
    let items = [];
    let title = '';

    switch (type) {
      case 'daily':
        items = all.filter(s => SRS.isDue(s));
        title = '📅 المراجعة اليومية';
        break;
      case 'mistake':
        items = all.filter(s => s.isMistake && !s.isFrozen);
        title = '⚠️ الجمل الصعبة';
        break;
      case 'frozen':
        items = all.filter(s => s.isFrozen);
        title = '❄️ المجمّدة';
        break;
      case 'all':
        items = all;
        title = '📚 كل الجمل';
        break;
    }

    $('list-title').textContent = title;
    renderListActions(type, items);
    renderListItems(type, items);
    UI.show('view-list');
  }

  function renderListActions(type, items) {
    const el = $('list-actions');
    el.innerHTML = '';
    if (type === 'all') {
      const btnCopy = document.createElement('button');
      btnCopy.className = 'btn btn-ghost btn-sm';
      btnCopy.textContent = '📋 نسخ الكل';
      btnCopy.onclick = () => Export.copyAll(items);

      const btnDl = document.createElement('button');
      btnDl.className = 'btn btn-ghost btn-sm';
      btnDl.textContent = '⬇️ تحميل';
      btnDl.onclick = () => Export.downloadTxt(items);

      el.appendChild(btnCopy);
      el.appendChild(btnDl);
    }
    if (type === 'frozen' && items.length > 0) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = '🔓 إلغاء تجميد الكل';
      btn.onclick = async () => {
        const ok = await UI.confirm('إلغاء تجميد كل الجمل؟');
        if (!ok) return;
        for (const s of items) {
          await DB.updateSentence(state.user.uid, s.id, { isFrozen: false });
        }
        await loadAll();
        openList('frozen');
        UI.toast('تم إلغاء التجميد');
      };
      el.appendChild(btn);
    }
  }

  function renderListItems(type, items) {
    const el = $('list-content');
    if (items.length === 0) {
      const map = {
        daily: ['🎉', 'لا توجد مراجعات اليوم. استمتع بيومك!'],
        mistake: ['✨', 'لا توجد جمل صعبة. أحسنت!'],
        frozen: ['❄️', 'لا توجد جمل مجمّدة.'],
        all: ['📝', 'ابدأ بإضافة أول جملة من الرئيسية.']
      };
      el.innerHTML = UI.emptyState(...map[type]);
      return;
    }

    el.innerHTML = '';
    items.forEach(s => {
      const div = document.createElement('div');
      div.className = 'sentence-item';
      div.innerHTML = `
        <div class="it">${UI.escapeHtml(s.it)}</div>
        <div class="ar">${UI.escapeHtml(s.ar)}</div>
        <div class="sentence-meta">
          <span>easy: ${s.easyStreak || 0}/4</span>
          <span>medium: ${s.mediumStreak || 0}/4</span>
          ${s.isMistake ? '<span>⚠️ صعب</span>' : ''}
          ${s.isFrozen ? '<span>❄️ مجمّد</span>' : ''}
        </div>
      `;
      const actions = document.createElement('div');
      actions.className = 'sentence-actions';

      // زر إزالة من الصعبة (إن كانت)
      if (type === 'mistake') {
        const b = document.createElement('button');
        b.className = 'btn btn-primary btn-sm';
        b.textContent = '✅ صح';
        b.onclick = async () => {
          const tomorrow = SRS.tomorrowAt10AM();
          await DB.updateSentence(state.user.uid, s.id, {
            isMistake: false,
            nextReview: firebase.firestore.Timestamp.fromDate(tomorrow)
          });
          await loadAll();
          openList('mistake');
          UI.toast('تمت الإزالة من القائمة');
        };
        actions.appendChild(b);
      }

      // تجميد / إلغاء تجميد
      const fb = document.createElement('button');
      fb.className = 'btn btn-ghost btn-sm';
      fb.textContent = s.isFrozen ? '🔓 إلغاء' : '❄️ تجميد';
      fb.onclick = async () => {
        await DB.updateSentence(state.user.uid, s.id, { isFrozen: !s.isFrozen });
        await loadAll();
        openList(type);
      };
      actions.appendChild(fb);

      // حذف
      const db = document.createElement('button');
      db.className = 'btn btn-ghost btn-sm';
      db.textContent = '🗑';
      db.onclick = async () => {
        const ok = await UI.confirm('حذف هذه الجملة نهائياً؟');
        if (!ok) return;
        await DB.deleteSentence(state.user.uid, s.id);
        await loadAll();
        openList(type);
        UI.toast('تم الحذف');
      };
      actions.appendChild(db);

      // تشغيل الصوت
      const pb = document.createElement('button');
      pb.className = 'btn btn-ghost btn-sm';
      pb.textContent = '🔊';
      pb.onclick = () => Audio.speak(s.it);
      actions.appendChild(pb);

      div.appendChild(actions);
      el.appendChild(div);
    });
  }

  // ===== Quick Add =====
  async function quickAdd() {
    const it = $('qa-it').value.trim();
    const ar = $('qa-ar').value.trim();
    if (!it || !ar) { UI.toast('املأ الحقلين'); return; }

    // منع التكرار
    const dup = state.sentences.find(s => s.it.toLowerCase() === it.toLowerCase());
    if (dup) { UI.toast('هذه الجملة موجودة'); return; }

    await DB.addSentence(state.user.uid, { it, ar });
    $('qa-it').value = '';
    $('qa-ar').value = '';
    await loadAll();
    renderDashboard();
    UI.toast('تمت الإضافة ✅');
  }

  // ===== Dictionary Popup =====
  async function showDict(word) {
    const popup = $('dict-popup');
    $('dict-word').textContent = word;
    $('dict-translation').textContent = '...';
    $('dict-extra').textContent = '';
    popup.classList.remove('hidden');

    const res = await Dictionary.lookup(word);
    if (!res) {
      $('dict-translation').textContent = '—';
      return;
    }
    $('dict-translation').textContent = res.ar || '—';
    const extra = [];
    if (res.type) extra.push(res.type);
    if (res.conj?.presente) extra.push('مضارع: ' + res.conj.presente);
    if (res.note) extra.push(res.note);
    $('dict-extra').textContent = extra.join(' • ');
  }

  // ===== Events =====
  let bound = false;
  function bindEvents() {
    if (bound) return;
    bound = true;

    // Theme toggle
    $('btn-theme').onclick = () => {
      const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
      UI.applyTheme(dark);
      localStorage.setItem('imparo-theme', dark ? 'dark' : 'light');
    };

    $('btn-settings').onclick = () => UI.toast('الإعدادات قريباً');

    // Start review
    $('btn-start-review').onclick = startReview;

    // List cards
    document.querySelectorAll('.list-card').forEach(card => {
      card.onclick = () => openList(card.dataset.list);
    });

    // Quick add
    $('qa-add').onclick = quickAdd;

    // Review: tap card to reveal
    $('review-card').onclick = (e) => {
      if (e.target.classList.contains('word')) return;
      revealCard();
    };

    // Speak
    $('btn-speak').onclick = (e) => {
      e.stopPropagation();
      const card = state.reviewQueue[state.reviewIndex];
      if (card) Audio.speak(card.it);
    };

    // Ratings
    document.querySelectorAll('[data-rating]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        rateCard(btn.dataset.rating);
      };
    });

    // Back
    $('btn-review-back').onclick = () => {
      UI.show('view-dashboard');
      renderDashboard();
    };
    $('btn-list-back').onclick = () => {
      UI.show('view-dashboard');
      renderDashboard();
    };
    $('btn-summary-home').onclick = () => {
      UI.show('view-dashboard');
      renderDashboard();
    };

    // Dictionary popup
    $('dict-close').onclick = () => $('dict-popup').classList.add('hidden');
    $('dict-popup').onclick = (e) => {
      if (e.target.id === 'dict-popup') $('dict-popup').classList.add('hidden');
    };

    // Word tap (delegation)
    $('card-it').addEventListener('click', (e) => {
      const w = e.target.closest('.word');
      if (w) {
        e.stopPropagation();
        showDict(w.dataset.word);
      }
    });
  }

  // ===== Boot =====
  document.addEventListener('DOMContentLoaded', init);
})();
