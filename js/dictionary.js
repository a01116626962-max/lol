// js/dictionary.js
window.Dictionary = (() => {
  let local = null;
  const cache = {};

  async function loadLocal() {
    if (local) return local;
    try {
      const res = await fetch('data/dictionary-it-ar.json');
      local = await res.json();
    } catch {
      local = {};
    }
    return local;
  }

  function clean(w) {
    return w.toLowerCase().replace(/[^\wàèéìòù]/g, '');
  }

  async function lookup(word) {
    const key = clean(word);
    if (!key) return null;
    if (cache[key]) return cache[key];

    const dict = await loadLocal();

    // 1. مباشر
    if (dict[key]) {
      cache[key] = dict[key];
      return dict[key];
    }

    // 2. محاولة إزالة اللاحقة (أفعال/جمع)
    const stem = key.replace(/(are|ere|ire|ato|uto|ito|ando|endo|i|e|o|a)$/, '');
    if (stem.length >= 3 && dict[stem]) {
      cache[key] = { ...dict[stem], note: 'مشتق' };
      return cache[key];
    }

    // 3. API احتياطي
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(key)}&langpair=it|ar`);
      const data = await res.json();
      const result = {
        ar: data.responseData?.translatedText || '—',
        source: 'api'
      };
      cache[key] = result;
      return result;
    } catch {
      return { ar: 'لا توجد ترجمة', source: 'none' };
    }
  }

  return { lookup };
})();
