let LANG = "fr";
let STRINGS = {};

async function loadLang(lang) {
  LANG = lang;
  const res = await fetch(`./i18n/${lang}.json`);
  STRINGS = await res.json();
  applyTranslations();
}

function t(key) {
  return STRINGS[key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
}
