// js/auth.js
window.Auth = (() => {
  let currentUser = null;

  async function signIn() {
    const cred = await FB.auth.signInAnonymously();
    currentUser = cred.user;
    return currentUser;
  }

  function onChange(cb) {
    FB.auth.onAuthStateChanged(user => {
      currentUser = user;
      cb(user);
    });
  }

  function uid() { return currentUser ? currentUser.uid : null; }

  return { signIn, onChange, uid, get user() { return currentUser; } };
})();
