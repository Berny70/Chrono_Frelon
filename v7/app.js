// ==========================
// DONNÉES GLOBALES
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

// ++++++++++++++++++++
(function ensureLocOverlayCSS() {
  if (document.getElementById("locOverlayStyle")) return;

  const style = document.createElement("style");
  style.id = "locOverlayStyle";
  style.textContent = `
    #locOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    }

    #locOverlay .loc-box {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      width: 90%;
      max-width: 420px;
      text-align: center;
      color: #000;
      font-size: 16px;
      line-height: 1.4;
    }

    #locOverlay .loc-box button {
      width: 100%;
      margin: 6px 0;
      padding: 10px;
      font-size: 1em;
      font-weight: bold;
      border-radius: 6px;
      border: none;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
})();

// +++++++++++++++++

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

  if (obs.length > 0) {
    localStorage.setItem("chronoObservations", JSON.stringify(obs));
  }
}

// ==========================
// MISE À JOUR DIRECTION
// ==========================
function updateDirection(i) {
  const c = chronos[i];
  c.direction = moyenneCirculaire(c.directions);
  document.getElementById(`dir${i}`).textContent = c.direction + "°";
  saveObservations();
}

// ==========================
// INITIALISATION
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
    div.querySelector(".det").onclick = () => openDET(i);

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

    div.querySelector(`#vit${i}`).oninput = e => {
      c.vitesse = +e.target.value;
      updateStats(i);
    };
  });

  // ✅ BOUTON LOCALISATION DU NID — UNE SEULE FOIS
  const btnLoc = document.getElementById("btnLoc");
  if (btnLoc) {
    btnLoc.addEventListener("click", openLocationMenu);
  } else {
    console.warn("btnLoc introuvable");
  }
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

  Object.assign(c, {
    running: false,
    startTime: 0,
    essais: [],
    directions: [],
    direction: 0,
    vitesse: DEFAULT_VITESSE,
    lat: "--",
    lon: "--"
  });

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
// LOCALISATION DU NID
// ==========================
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

  // 🔒 FORÇAGE STYLE OVERLAY (sécurité absolue)
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "99999";

  // 🔒 FORÇAGE STYLE BOÎTE
  const box = overlay.querySelector(".loc-box");
  if (box) {
    box.style.background = "#fff";
    box.style.padding = "20px";
    box.style.borderRadius = "12px";
    box.style.width = "90%";
    box.style.maxWidth = "420px";
    box.style.textAlign = "center";
  }

  // actions boutons
  overlay.addEventListener("click", async e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === "local") {
      overlay.remove();
      location.href = "map.html";
    }

    if (action === "shared") {
      overlay.remove();
      location.href = "map.html?mode=shared";
    }

    if (action === "send") {
      await sendGeoJSON();
    }

    if (action === "close") {
      overlay.remove();
    }
  });

  // clic hors boîte → fermer
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const btnMail = document.getElementById("btnMail");
  if (!btnMail) return;

  btnMail.addEventListener("click", () => {
    window.open(
      "https://docs.google.com/forms/d/e/1FAIpQLSdZZLGB8u3ULsnCr6GbNkQ9mVIAhWCk2NEatUOeeElGAoMcmg/viewform",
      "_blank",
      "noopener"
    );
  });
});


// ==========================
// EXPORT GLOBALS
// ==========================
window.__chronos = chronos;



