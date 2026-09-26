// js/firebase.js
// ⚠️ استبدل هذه القيم بمفاتيح مشروعك من Firebase Console

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Init
firebase.initializeApp(firebaseConfig);

// Expose globally
window.FB = {
  auth: firebase.auth(),
  db: firebase.firestore()
};

// تفعيل offline persistence
window.FB.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  console.warn('Persistence error:', err.code);
});
