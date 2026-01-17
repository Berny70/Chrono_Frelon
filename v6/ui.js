// ui.js
// ==========================
// INTERFACE UTILISATEUR – V6
// ==========================

import { toggleChrono, resetChrono, getAverageTime, getDistance } from "./chronos.js";
import { getPosition } from "./gps.js";

/**
 * Initialisation de l’UI
 */
export function initUI(state) {
  const container = document.getElementById("chronos");
  container.innerHTML = "";

  state.chronos.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = `chrono ${c.color}`;

    div.innerHTML = `
      <div class="row row-main">
        <button class="start">Start / Stop</button>
        <span class="time" id="t${i}">0.00 s</span>
        <button class="reset">Reset</button>
      </div>

      <div class="row row-info">
        <div><b>Lat.:</b> <span id="lat${i}">--</span></div>
        <div><b>T.moy:</b> <span id="m${i}">0 s</span></div>
        <div>
          <b>Vit.:</b>
          <input type="number" id="vit${i}" value="${c.vitesse}" min="1" max="9"> m/s
        </div>
      </div>

      <div class="row row-info">
        <div><b>Long.:</b> <span id="lon${i}">--</span></div>
        <div><b>Dir.:</b> <span id="dir${i}">0°</span></div>
        <div><b>Dist.:</b> <span id="d${i}">0 m</span></div>
      </div>

      <div class="row row-actions">
        <button class="pos">Position</button>
        <button class="compass">Boussole</button>
        <button class="det">Détail</button>
      </div>
    `;

    container.appendChild(div);

    // ==========================
    // BOUTONS
    // ==========================

    div.querySelector(".start").onclick = () => {
      const wasRunning = state.chronos[i].running;
      toggleChrono(state, i);
    
      // Si on vient de STOP → mise à jour stats
      if (wasRunning) {
        updateChronoStats(state, i);
      }
    };
    div.querySelector(".reset").onclick = () => {
      resetChrono(state, i);
      updateChronoStats(state, i);
      updateChronoTime(state, i);
    };

    div.querySelector(`#vit${i}`).oninput = e => {
      c.vitesse = +e.target.value;
      updateChronoStats(state, i);
    };
    div.querySelector(".pos").onclick = () => {
      getPosition(state, i, () => updateGPS(state, i));
    };
    div.querySelector(".det").onclick = () => {
      alert("Détail – à réactiver dans une prochaine étape");
    };

  });
}

/**
 * Mise à jour du temps courant
 */
export function updateChronoTime(state) {
  state.chronos.forEach((c, i) => {
    const el = document.getElementById(`t${i}`);
    if (!el) return;

    if (c.running && c.currentTime !== undefined) {
      el.textContent = c.currentTime.toFixed(2) + " s";
    }
  });
}

/**
 * Mise à jour moyenne & distance
 */
export function updateChronoStats(state, i) {
  const c = state.chronos[i];

  document.getElementById(`m${i}`).textContent =
    getAverageTime(c).toFixed(0) + " s";

  document.getElementById(`d${i}`).textContent =
    getDistance(c) + " m";
}
export function updateGPS(state, i) {
  const c = state.chronos[i];

  document.getElementById(`lat${i}`).textContent =
    c.lat !== null ? c.lat : "--";

  document.getElementById(`lon${i}`).textContent =
    c.lon !== null ? c.lon : "--";
}

