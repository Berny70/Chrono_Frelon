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

  // 🔑 EXPOSITION EXPLICITE DE L’ÉTAT POUR LA BOUSSOLE
  window.__APP_STATE__ = state;

  initUI(state);

  // Tick global (rafraîchissement des chronos)
  setInterval(() => {
    tickChronos(state);
    updateChronoTime(state);
  }, 50);
}

// ==========================
// DÉMARRAGE
// ==========================
window.addEventListener("DOMContentLoaded", initApp);

