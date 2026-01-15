// ==========================
// VERSION (service-worker)
// ==========================
fetch("service-worker.js")
  .then(r => r.text())
  .then(txt => {
    const match = txt.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (match) {
      document.getElementById("version").textContent = "version " + match[1];
    }
  });

// ==========================
// DONNÉES
// ==========================
const chronoColors = ["red", "blue", "green", "white"];
const chronos = [];

const DEFAULT_DISTANCE_FACTOR = 2;

// ==========================
// BOUSSOLE – variables globales
// ==========================
let currentCompassIndex = null;
let currentHeading = null;
let compassActive = false;
let lastHeading = null;

// ==========================
// INIT
// ==========================
window.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("chronos");

  chronoColors.forEach((color, i) => {
    const c = {
      running: false,
      startTime: 0,
      essais: [],
      directions: [],
      color
    };
    chronos.push(c);

    const div = document.createElement("div");
    div.className = `chrono ${color}`;
    div.id = `chrono-${i}`;

    div.innerHTML = `
      <span class="time" id="t${i}">0.00 s</span>

      <div class="info">
        <span class="count" id="n${i}">0 ess.</span>
        <span class="avg" id="m${i}">moy: 0.00 s</span>
        <span class="dist" id="d${i}">dist: 0 m</span>
      </div>

      <div class="buttons">
        <button class="undo">SUP</button>
        <button class="start">Start / Stop</button>
        <button class="reset">RST</button>
        <!-- prêt pour V5 -->
        <!-- <button class="compass">Boussole</button> -->
      </div>
    `;

    container.appendChild(div);

    div.querySelector(".start").onclick = () => startStop(i);
    div.querySelector(".undo").onclick = () => sup(i);
    div.querySelector(".reset").onclick = () => rst(i);

    // Quand tu activeras la boussole en V5 :
    // div.querySelector(".compass").onclick = () => openCompass(i);
  });
});

// ==========================
// START / STOP
// ==========================
function startStop(i) {
  const c = chronos[i];
  const now = Date.now();

  if (!c.running) {
    c.startTime = now;
    c.running = true;
  } else {
    const elapsed = (now - c.startTime) / 1000;
    c.essais.push(elapsed);
    c.running = false;

    document.getElementById(`t${i}`).textContent = elapsed.toFixed(2) + " s";
    updateStats(i);
  }
}

// ==========================
// SUPPRIMER DERNIER ESSAI
// ==========================
function sup(i) {
  const c = chronos[i];
  if (c.essais.length > 0) {
    c.essais.pop();
    updateStats(i);
  }
}

// ==========================
// RESET
// ==========================
function rst(i) {
  const c = chronos[i];
  c.running = false;
  c.startTime = 0;
  c.essais = [];
  c.directions = [];

  document.getElementById(`t${i}`).textContent = "0.00 s";
  updateStats(i);
}

// ==========================
// STATS
// ==========================
function updateStats(i) {
  const c = chronos[i];
  const essais = c.essais;

  document.getElementById(`n${i}`).textContent = essais.length + " ess.";

  if (essais.length === 0) {
    document.getElementById(`m${i}`).textContent = "moy: 0.00 s";
    document.getElementById(`d${i}`).textContent = "dist: 0 m";
    return;
  }

  const total = essais.reduce((a, b) => a + b, 0);
  const moyenne = total / essais.length;
  const distance = moyenne * DEFAULT_DISTANCE_FACTOR;

  document.getElementById(`m${i}`).textContent =
    "moy: " + moyenne.toFixed(2) + " s";
  document.getElementById(`d${i}`).textContent =
    "dist: " + Math.round(distance) + " m";
}

// ==========================
// TICK
// ==========================
setInterval(() => {
  const now = Date.now();
  chronos.forEach((c, i) => {
    if (c.running) {
      document.getElementById(`t${i}`).textContent =
        ((now - c.startTime) / 1000).toFixed(2) + " s";
    }
  });
}, 50);

// =====================================================
// 🧭 BOUSSOLE – MOTEUR UNIFIÉ ANDROID / iOS (V5 READY)
// =====================================================

// Overlay (non encore utilisé en V5 UI)
function openCompass(i) {
  currentCompassIndex = i;
  currentHeading = null;
  compassActive = false;

  const overlay = document.createElement("div");
  overlay.id = "compassOverlay";
  overlay.innerHTML = `
    <div class="compass-box">
      <h2>Boussole ${chronos[i].color}</h2>
      <div id="headingValue">---</div>

      <button data-action="enable">Activer la boussole</button><br><br>
      <button data-action="save">Capturer direction</button><br><br>
      <button data-action="close">Fermer</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Handler orientation (CORRIGÉ)
function onOrientation(e) {
  if (!compassActive) return;

  let heading = null;

  // iOS Safari
  if (e.webkitCompassHeading !== undefined) {
    if (e.webkitCompassAccuracy < 0) return;
    heading = e.webkitCompassHeading;
  }
  // Android
  else if (e.absolute === true && e.alpha !== null) {
    heading = (360 - e.alpha) % 360;
  }

  if (heading === null || isNaN(heading)) return;

  if (lastHeading !== null) {
    let delta = Math.abs(heading - lastHeading);
    if (delta > 180) delta = 360 - delta;
    if (delta > 25) return;
  }

  lastHeading = heading;
  currentHeading = Math.round(heading);

  const el = document.getElementById("headingValue");
  if (el) el.textContent = currentHeading + "°";
}

// ==========================
// DÉLÉGATION ÉVÉNEMENTS BOUSSOLE
// ==========================
document.addEventListener("click", async e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  // ACTIVER
  if (action === "enable" && !compassActive) {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted") {
        alert("Autorisation boussole refusée");
        return;
      }
    }

    lastHeading = null;
    currentHeading = null;

    window.addEventListener("deviceorientationabsolute", onOrientation, true);
    window.addEventListener("deviceorientation", onOrientation, true);

    compassActive = true;
  }

  // SAUVEGARDER
  if (action === "save") {
    if (currentHeading === null) {
      alert("Boussole non prête");
      return;
    }
    chronos[currentCompassIndex].directions.push(currentHeading);
  }

  // FERMER
  if (action === "close") {
    window.removeEventListener("deviceorientation", onOrientation, true);
    window.removeEventListener("deviceorientationabsolute", onOrientation, true);
    compassActive = false;
    lastHeading = null;
    document.getElementById("compassOverlay")?.remove();
  }
});
