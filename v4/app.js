
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
// MISE À JOUR DIRECTION
// ==========================
function updateDirection(i) {
  const c = chronos[i];
  const m = moyenneCirculaire(c.directions);
  c.direction = m;
  document.getElementById(`dir${i}`).textContent = m + "°";
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
      vitesse: 4,
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
        <div class="info-left"><b>Lat.:</b> <span id="lat${i}">--</span></div>
        <div class="info-center"><b>T.moy:</b> <span id="m${i}">0 s</span></div>
        <div class="info-right">
          <b>Vit.:</b>
          <input type="number" id="vit${i}" value="4" min="1" max="9"> m/s
        </div>
      </div>

      <div class="row row-info">
        <div class="info-left"><b>Long.:</b> <span id="lon${i}">--</span></div>
        <div class="info-center"><b>Dir.:</b> <span id="dir${i}">0°</span></div>
        <div class="info-right"><b>Dist.:</b> <span id="d${i}">0 m</span></div>
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
  const dist = (moy * c.vitesse) / 2;

  document.getElementById(`m${i}`).textContent = moy.toFixed(0) + " s";
  document.getElementById(`d${i}`).textContent = Math.round(dist) + " m";
}

// ==========================
// RESET
// ==========================
function resetChrono(i) {
  const c = chronos[i];

  // Données internes
  c.running = false;
  c.startTime = 0;
  c.essais = [];
  c.directions = [];
  c.direction = 0;
  c.vitesse = DEFAULT_VITESSE;
  c.lat = "--";
  c.lon = "--";

  // Affichage
  document.getElementById(`t${i}`).textContent = "0.00 s";
  document.getElementById(`m${i}`).textContent = "0 s";
  document.getElementById(`d${i}`).textContent = "0 m";
  document.getElementById(`dir${i}`).textContent = "0°";
  document.getElementById(`lat${i}`).textContent = "--";
  document.getElementById(`lon${i}`).textContent = "--";
  document.getElementById(`vit${i}`).value = DEFAULT_VITESSE;
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
// POSITION
// ==========================
function getPos(i) {
  navigator.geolocation.getCurrentPosition(pos => {
    chronos[i].lat = pos.coords.latitude.toFixed(5);
    chronos[i].lon = pos.coords.longitude.toFixed(5);
    document.getElementById(`lat${i}`).textContent = chronos[i].lat;
    document.getElementById(`lon${i}`).textContent = chronos[i].lon;
  });
}

// ==========================
// BOUSSOLE
// ==========================
function openCompass(i) {
  const c = chronos[i];
  let heading = null;

  if (window.DeviceOrientationEvent?.requestPermission) {
    DeviceOrientationEvent.requestPermission();
  }

  const overlay = document.createElement("div");
  overlay.id = "compassOverlay";
  overlay.innerHTML = `
    <div class="compass-box">
      <h2>Boussole ${c.color}</h2>
      <div id="headingValue">---</div>
      <button id="saveDir">Capturer direction</button><br><br>
      <button onclick="closeCompass()">Fermer</button>
    </div>
  `;
  document.body.appendChild(overlay);

  function orient(e) {
    if (e.alpha !== null) {
      heading = Math.round(360 - e.alpha);
      document.getElementById("headingValue").textContent = heading + "°";
    }
  }

  window.addEventListener("deviceorientationabsolute", orient);

  document.getElementById("saveDir").onclick = () => {
    if (heading !== null) {
      c.directions.push(heading);
      updateDirection(i);
    }
  };
}

function closeCompass() {
  document.getElementById("compassOverlay")?.remove();
}

// ==========================
// DÉTAIL
// ==========================
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
          <button onclick="delEssai(${k})">Supprimer</button>
        </div>
      `).join("")}

      <hr>
      <h3>Directions</h3>
      ${c.directions.map((d, k) => `
        <div class="det-line">
          ${d}°
          <button onclick="delDirection(${k})">Supprimer</button>
        </div>
      `).join("")}

      <br>
      <button onclick="closeDET()">Fermer</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function delEssai(k) {
  chronos[detIndex].essais.splice(k, 1);
  updateStats(detIndex);
  openDET(detIndex);
}

function delDirection(k) {
  chronos[detIndex].directions.splice(k, 1);
  updateDirection(detIndex);
  openDET(detIndex);
}

function closeDET() {
  document.getElementById("detOverlay")?.remove();
}

function saveObservations() {
  const obs = chronos.map(c => {
    if (c.lat === "--" || c.lon === "--" || !c.essais.length || !c.direction)
      return null;

    const total = c.essais.reduce((a,b)=>a+b,0);
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

