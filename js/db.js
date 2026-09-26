// js/db.js
window.DB = (() => {
  const usersCol = () => FB.db.collection('users');

  // ===== User doc =====
  async function ensureUser(uid, timezone) {
    const ref = usersCol().doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        streak: 0,
        lastReviewDate: null,
        settings: { autoPlay: true, voiceRate: 1.0, darkMode: false }
      });
    }
  }

  async function getUser(uid) {
    const snap = await usersCol().doc(uid).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  async function updateUser(uid, data) {
    return usersCol().doc(uid).set(data, { merge: true });
  }

  // ===== Sentences =====
  const sentencesCol = (uid) => usersCol().doc(uid).collection('sentences');

  async function addSentence(uid, { it, ar }) {
    const now = firebase.firestore.Timestamp.now();
    const doc = {
      it: it.trim(),
      ar: ar.trim(),
      createdAt: now,
      lastReviewed: null,
      nextReview: now,          // تظهر فوراً في المراجعة اليومية
      easyStreak: 0,
      mediumStreak: 0,
      isFrozen: false,
      isMistake: false,
      status: 'new'
    };
    const ref = await sentencesCol(uid).add(doc);
    return { id: ref.id, ...doc };
  }

  async function getAllSentences(uid) {
    const snap = await sentencesCol(uid).orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function updateSentence(uid, id, data) {
    return sentencesCol(uid).doc(id).set(data, { merge: true });
  }

  async function deleteSentence(uid, id) {
    return sentencesCol(uid).doc(id).delete();
  }

  // ===== Sessions =====
  async function addSession(uid, session) {
    return usersCol().doc(uid).collection('sessions').add({
      ...session,
      startedAt: firebase.firestore.Timestamp.fromDate(session.startedAt),
      endedAt: firebase.firestore.Timestamp.now()
    });
  }

  return {
    ensureUser, getUser, updateUser,
    addSentence, getAllSentences, updateSentence, deleteSentence,
    addSession
  };
})();
