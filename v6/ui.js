// ui.js
// ==========================
// INTERFACE UTILISATEUR – V6
// ==========================

import {
  toggleChrono,
  resetChrono,
  getAverageTime,
  getDistance,

} from "./chronos.js";

import { getPosition } from "./gps.js";
import { openCompass } from "./compass.js";

console.log("ui.js V6 LOADED");

/**
 * Initialisation de l’interface
 */
export function initUI(state) {
  const container = document.getElementById("chronos");
  if (!container) {
    console.error("Container #chronos introuvable");
    return;
  }

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

    // Start / Stop
    div.querySelector(".start").onclick = () => {
      if (!c.running) {
        toggleChrono(state, i);
      } else {
        toggleChrono(state, i);
        updateChronoStats(state, i);
      }
    };

    // Reset
// Reset
    div.querySelector(".reset").onclick = () => {
      resetChrono(state, i);
      updateChronoStats(state, i);
      updateChronoTime(state);
      updateGPS(state, i);   // 👈 ESSENTIEL
    };


    // Vitesse
    div.querySelector(`#vit${i}`).oninput = e => {
      c.vitesse = +e.target.value;
      updateChronoStats(state, i);
    };

    // GPS
    div.querySelector(".pos").onclick = () => {
      getPosition(state, i, () => updateGPS(state, i));
    };

    // Boussole (Option A)
    div.querySelector(".compass").onclick = () => {
      openCompass(state, i);

      // Rafraîchissement direction à la fermeture
      const observer = new MutationObserver(() => {
        if (!document.getElementById("compassOverlay")) {
    
          observer.disconnect();
        }
      });

      observer.observe(document.body, { childList: true });
    };

    // Détail (placeholder)
    div.querySelector(".det").onclick = () => {
      alert("Détail – à réactiver ultérieurement");
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

    if (typeof c.currentTime === "number") {
      el.textContent = c.currentTime.toFixed(2) + " s";
    }
  });
}


/**
 * Mise à jour moyenne & distance
 */
export function updateChronoStats(state, i) {
  const c = state.chronos[i];

  const m = document.getElementById(`m${i}`);
  const d = document.getElementById(`d${i}`);

  if (m) m.textContent = getAverageTime(c).toFixed(0) + " s";
  if (d) d.textContent = getDistance(c) + " m";
}

/**
 * Mise à jour GPS
 */
export function updateGPS(state, i) {
  const c = state.chronos[i];

  const lat = document.getElementById(`lat${i}`);
  const lon = document.getElementById(`lon${i}`);

  if (lat) lat.textContent = c.lat ?? "--";
  if (lon) lon.textContent = c.lon ?? "--";
}


