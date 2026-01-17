// ==========================
// DONNÉES
// ==========================
const chronoColors = ["red", "blue", "green", "white"];
const chronos = [];
const DEFAULT_VITESSE = 4;

let detIndex = null;
let currentCompassIndex = null;
let currentHeading = null;
let lastHeading = null;
let compassActive = false;


// ==========================
// MOYENNE CIRCULAIRE
// ==========================
function moyenneCirculaire(degs) {
  if (!degs.length) return 0;

  let sin = 0, cos = 0;
  degs.forEach(d => {
    const r = d * Math.PI / 180;
    sin += Math.sin(r);
    cos += Math.cos(r);
  });

  let a = Math.atan2(sin / degs.length, cos / degs.length);
  let deg = a * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return Math.round(deg);
}

// ==========================
// SAUVEGARDE OBSERVATIONS
// ==========================
function saveObservations() {
  const obs = chronos.map(c => {
    if (
      c.lat === "--" ||
      c.lon === "--" ||
      !c.essais.length ||
      c.direction == null
    ) return null;

    const total = c.essais.reduce((a, b) => a + b, 0);
    const moy = total / c.essais.length;

    return {
      lat: parseFloat(c.lat),
      lon: parseFloat(c.lon),
      direction: c.direction,
      distance: Math.round(moy * c.vitesse),
      color: c.color
    };
  }).filter(Boolean);

  // 🔒 NE PAS écraser avec un tableau vide
  if (obs.length > 0) {
    localStorage.setItem("chronoObservations", JSON.stringify(obs));
  }
}

// ==========================
// MISE À JOUR DIRECTION
// ==========================
function updateDirection(i) {
  const c = chronos[i];
  const m = moyenneCirculaire(c.directions);
  c.direction = m;
  document.getElementById(`dir${i}`).textContent = m + "°";
  saveObservations();
}

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
      vitesse: DEFAULT_VITESSE,
      direction: 0,
      lat: "--",
      lon: "--",
      color
    };
    chronos.push(c);

    const div = document.createElement("div");
    div.className = `chrono ${color}`;

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
          <input type="number" id="vit${i}" value="${DEFAULT_VITESSE}" min="1" max="9"> m/s
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

    div.querySelector(".start").onclick = () => startStop(i);
    div.querySelector(".reset").onclick = () => resetChrono(i);
    div.querySelector(".pos").onclick = () => getPos(i);
    div.querySelector(".compass").onclick = async () => {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const state = await DeviceOrientationEvent.requestPermission();
        if (state !== "granted") {
          alert("Autorisation boussole refusée");
          return;
        }
      }
      openCompass(i);
    };

    div.querySelector(".det").onclick = () => openDET(i);
    
    document.getElementById("btnLoc").onclick = () => {
      openLocationMenu();
    };
    
    div.querySelector(`#vit${i}`).oninput = e => {
      c.vitesse = +e.target.value;
      updateStats(i);
    };
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
    c.running = false;
    c.essais.push(elapsed);
    document.getElementById(`t${i}`).textContent = elapsed.toFixed(2) + " s";
    updateStats(i);
  }
}

// ==========================
// STATS
// ==========================
function updateStats(i) {
  const c = chronos[i];

  if (!c.essais.length) {
    document.getElementById(`m${i}`).textContent = "0 s";
    document.getElementById(`d${i}`).textContent = "0 m";
    return;
  }

  const total = c.essais.reduce((a, b) => a + b, 0);
  const moy = total / c.essais.length;
  const dist = moy * c.vitesse;

  document.getElementById(`m${i}`).textContent = Math.round(moy) + " s";
  document.getElementById(`d${i}`).textContent = Math.round(dist) + " m";

  saveObservations();
}

// ==========================
// RESET
// ==========================
function resetChrono(i) {
  const c = chronos[i];

  c.running = false;
  c.startTime = 0;
  c.essais = [];
  c.directions = [];
  c.direction = 0;
  c.vitesse = DEFAULT_VITESSE;
  c.lat = "--";
  c.lon = "--";

  document.getElementById(`t${i}`).textContent = "0.00 s";
  document.getElementById(`m${i}`).textContent = "0 s";
  document.getElementById(`d${i}`).textContent = "0 m";
  document.getElementById(`dir${i}`).textContent = "0°";
  document.getElementById(`lat${i}`).textContent = "--";
  document.getElementById(`lon${i}`).textContent = "--";
  document.getElementById(`vit${i}`).value = DEFAULT_VITESSE;

  saveObservations();
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

// ==========================
// POSITION GPS
// ==========================
function getPos(i) {
  navigator.geolocation.getCurrentPosition(pos => {
    chronos[i].lat = pos.coords.latitude.toFixed(5);
    chronos[i].lon = pos.coords.longitude.toFixed(5);
    document.getElementById(`lat${i}`).textContent = chronos[i].lat;
    document.getElementById(`lon${i}`).textContent = chronos[i].lon;
    saveObservations();
  });
}
// ==========================
// FERMETURE POPUP DÉTAIL
// ==========================
function closeDET() {
  const overlay = document.getElementById("detOverlay");
  if (overlay) overlay.remove();
}


// ==========================
// BOUSSOLE
 // ++++++++++++++++++++++++++++++
// ==========================
// BOUSSOLE (overlay)
// ==========================
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

// ==========================
// ORIENTATION HANDLER (CORRIGÉ)
// ==========================
function onOrientation(e) {
  if (!compassActive) return;

  let heading = null;

  // iOS
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
// DÉLÉGATION ÉVÉNEMENTS (iOS / Android)
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
    updateDirection(currentCompassIndex);
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

 // ++++++++++++++++++++++++++++++
 // ++++++++++++++++++++++++++++++
function openDET(i) {
  detIndex = i;
  const c = chronos[i];
  closeDET();

  const overlay = document.createElement("div");
  overlay.id = "detOverlay";
  overlay.className = c.color;

  overlay.innerHTML = `
    <div class="det-box">
      <h2>Détail ${c.color}</h2>

      ${c.essais.map((t, k) => `
        <div class="det-line">
          Essai ${k + 1} : ${Math.ceil(t)} s
          <button class="del-essai" data-k="${k}">Supprimer</button>
        </div>
      `).join("")}

      <hr>
      <h3>Directions</h3>

      ${c.directions.map((d, k) => `
        <div class="det-line">
          ${d}°
          <button class="del-dir" data-k="${k}">Supprimer</button>
        </div>
      `).join("")}

      <br>
      <button id="closeDET">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);

  /* ==========================
     FERMETURE
  ========================== */

  // bouton Fermer
  overlay.querySelector("#closeDET").onclick = closeDET;

  // clic hors de la boîte
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeDET();
  });

  /* ==========================
     SUPPRESSIONS
  ========================== */

  // supprimer essai
  overlay.querySelectorAll(".del-essai").forEach(btn => {
    btn.onclick = () => {
      chronos[detIndex].essais.splice(btn.dataset.k, 1);
      updateStats(detIndex);
      openDET(detIndex);
    };
  });

  // supprimer direction
  overlay.querySelectorAll(".del-dir").forEach(btn => {
    btn.onclick = () => {
      chronos[detIndex].directions.splice(btn.dataset.k, 1);
      updateDirection(detIndex);
      openDET(detIndex);
    };
  });
}

window.closeDET = closeDET;
window.__chronos = chronos;

function openLocationMenu() {
  document.getElementById("locOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "locOverlay";
  overlay.innerHTML = `
    <div class="loc-box">
      <h2>Localisation du nid</h2>

      <button data-action="local">
        🗺️ Carte avec les données du smartphone
      </button><br><br>

      <button data-action="send">
        📤 Envoi des données smartphone vers la carte partagée
      </button><br><br>

      <button data-action="shared">
        🌍 Carte partagée autour du smartphone (10 km)
      </button><br><br>

      <button data-action="close">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", async e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === "local") {
      overlay.remove();
      location.href = "map.html";
    }

    if (action === "send") {
      await sendGeoJSON();
    }

    if (action === "shared") {
      overlay.remove();
      location.href = "map.html?mode=shared";
    }

    if (action === "close") {
      overlay.remove();
    }
  });

  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });
}
// ++++++++++++++++++++++++++++++++
// a supprimer : test sur PC dir undefined
// +++++++++++++++++++++++++++++++++
function isCompassAvailable() {
  return (
    typeof window.DeviceOrientationEvent !== "undefined"
  );
}
// ++++++++++++++++++++++++++++++++
// a supprimer : test sur PC
// +++++++++++++++++++++++++++++++++




















