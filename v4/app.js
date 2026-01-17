// ==========================
// DONNÉES
// ==========================
const chronoColors = ["red", "blue", "green", "white"];
const chronos = [];
const DEFAULT_VITESSE = 4;

let detIndex = null;

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
      !c.direction
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

  localStorage.setItem("chronoObservations", JSON.stringify(obs));
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
    div.querySelector(".compass").onclick = () => openCompass(i);
    div.querySelector(".det").onclick = () => openDET(i);

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
// ==========================
function openCompass(i) {
  const c = chronos[i];

  let heading = null;
  let warmup = 0;
  const WARMUP_COUNT = 10;

  function startCompass() {
    const overlay = document.createElement("div");
    overlay.id = "compassOverlay";
    overlay.innerHTML = `
      <div class="compass-box">
        <h2>Boussole ${c.color}</h2>

        <div id="headingValue">…</div>

        <button id="btnInitCompass">Initialisation</button><br><br>

        <button id="saveDir">Capturer direction</button><br><br>

        <button id="closeCompass">Fermer</button>
      </div>
    `;
    document.body.appendChild(overlay);

    function orient(e) {
      if (e.alpha == null) return;

      // phase d'initialisation capteur
      if (warmup < WARMUP_COUNT) {
        warmup++;
        document.getElementById("headingValue").textContent = "…";
        return;
      }

      heading = Math.round(360 - e.alpha);
      document.getElementById("headingValue").textContent = heading + "°";
    }

    window.addEventListener("deviceorientation", orient);

    // 🔄 bouton INITIALISATION
    document.getElementById("btnInitCompass").onclick = () => {
      warmup = 0;          // relance la phase de chauffe
      heading = null;
      document.getElementById("headingValue").textContent = "…";
    };

    // capture direction (inchangée)
    document.getElementById("saveDir").onclick = () => {
      if (heading !== null) {
        c.directions.push(heading);
        updateDirection(i);
      }
    };

    // fermeture popup
    document.getElementById("closeCompass").onclick = () => {
      window.removeEventListener("deviceorientation", orient);
      overlay.remove();
    };
  }

  // gestion permission iOS
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission().then(state => {
      if (state === "granted") startCompass();
      else alert("Autorisation boussole refusée");
    });
  } else {
    startCompass();
  }
}

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






