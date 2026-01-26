// ==========================
// I18N GLOBAL
// ==========================
let LANG = "fr";
let STRINGS = {};
const SUPPORTED_LANGS = ["fr", "en", "de", "it"];

// ==========================
// CHARGEMENT LANGUE
// ==========================
async function loadLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = "fr";

  LANG = lang;
  localStorage.setItem("lang", lang);

  console.log("[i18n] loading:", lang);

  // 🔑 BASE DYNAMIQUE (ex: /Chrono_Frelon/v8/)
  const BASE = location.pathname.replace(/\/[^\/]*$/, "/");
  const url = `${BASE}i18n/${lang}.json`;

  console.log("[i18n] fetch:", url);

  const res = await fetch(url);
  STRINGS = await res.json();

  applyTranslations();
  updateLangButtons();
}


// ==========================
// TRADUCTION
// ==========================
function t(key) {
  return STRINGS[key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

function updateLangButtons() {
  document.querySelectorAll(".lang-bar button[data-lang]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === LANG);
  });
}

// ==========================
// INIT AUTOMATIQUE 🔥
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  console.log("[i18n] init");

  const saved = localStorage.getItem("lang");
  const browser = navigator.language.slice(0, 2);

  const lang =
    saved ||
    (SUPPORTED_LANGS.includes(browser) ? browser : "fr");

  loadLang(lang);
});

// ==========================
// CLIC BOUTONS LANGUE (GLOBAL)
// ==========================
document.addEventListener("click", e => {
  const btn = e.target.closest("button[data-lang]");
  if (!btn) return;

  loadLang(btn.dataset.lang);
});
