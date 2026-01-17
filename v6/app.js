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
  console.log("État initial :", state);

  initUI(state);

  // Tick global (rafraîchissement chronos)
  setInterval(() => {
    tickChronos(state);
    updateChronoTime(state);
  }, 50);
}

// ==========================
// DÉMARRAGE
// ==========================
window.addEventListener("DOMContentLoaded", initApp);
