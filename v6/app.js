// app.js
// ==========================
// APPLICATION V6 – ORCHESTRATEUR
// ==========================

import { state } from "./state.js";
import { initUI, updateChronoTime } from "./ui.js";
import { tickChronos } from "./chronos.js";

// ==========================
// INITIALISATION
// ==========================
function initApp() {
  console.log("Chrono Frelon – V6 démarrage");

  // 🔑 exposition explicite de l’état (debug + boussole)
  window.__APP_STATE__ = state;

  // 🔥 construction de l’interface
  initUI(state);

  // ⏱️ tick global (rafraîchissement des chronos)
  setInterval(() => {
    tickChronos(state);
    updateChronoTime(state);
  }, 50);
}

// ==========================
// DÉMARRAGE
// ==========================
window.addEventListener("DOMContentLoaded", initApp);
