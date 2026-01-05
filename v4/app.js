// ==========================
// VERSION (service-worker)
// ==========================
fetch('service-worker.js')
  .then(r => r.text())
  .then(txt => {
    const match = txt.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (match) {
      const v = document.getElementById('version');
      if (v) v.textContent = "version " + match[1];
    }
  });

// ==========================
// DONNÉES
// ==========================
const chronoColors = ["red", "blue", "green", "white"];
const chronos = [];
let detIndex = null;

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
      directions: [],   // ⬅️ NOUVEAU
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
      <span class="time" id="t${i}">0.00 s</span>

      <div class="info-line">
        <div class="info-left">
          <button class="pos">Position</button>
          <div class="coords">
            <div id="lat${i}">Lat.: --</div>
            <div id="lon${i}">Long.: --</div>
          </div>
        </div>

        <div class="info-right">
          <div>
            Vit.: <input type="number" value="4" min="1" max="9" id="vit${i}"> m/s
          </div>
          <div>
            Dir.: <input type="number" value="0" min="0" max="359" id="dir${i}"> °
          </div>
        </div>
      </div>

      <div class="info">
        <span id="n${i}">0 essai</span>
        <span id="m${i}">moy: 0.00 s</span>
        <span id="d${i}">dist: 0 m</span>
      </div>

      <div class="buttons">
        <button class="start">Start / Stop</button>
        <button class="compass">Boussole</button>
        <button class="det">Détail</button>
        <button class="reset">Reset</button>
      </div>
    `;

    container.appendChild(div);

    // Boutons
    div.querySelector(".start").onclick = () => startStop(i);
    div.querySelector(".reset").onclick = () => rst(i);
    div.querySelector(".det").onclick = () => openDET(i);
    div.querySelector(".pos").onclick = () => getPos(i);
    div.querySelector(".compass").onclick = () => openCompass(i);

    // Paramètres
    div.querySelector(`#vit${i}`).oninput =
      e => chronos[i].vitesse = +e.target.value;

    div.querySelector(`#dir${i}`).oninput =
      e => chronos[i].direction = +e.target.value;
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

    document.getElementById(`t${i}`).textContent =
      elapsed.toFixed(2) + " s";

    updateStats(i);
  }
}

// ==========================
// STATS
// ==========================
function updateStats(i) {
  const c = chronos[i];
  const essais = c.essais;

  document.getElementById(`n${i}`).textContent =
    essais.length + " essai";

  if (!essais.length) {
    document.getElementById(`m${i}`).textContent = "moy: 0.00 s";
    document.getElementById(`d${i}`).textContent = "dist: 0 m";
    return;
  }

  const total = essais.reduce((a, b) => a + b, 0);
  const moy = total / essais.length;
  const dist = (moy * c.vitesse) / 2;

  document.getElementById(`m${i}`).textContent =
    "moy: " + moy.toFixed(2) + " s";

  document.getElementById(`d${i}`).textContent =
    "dist: " + Math.round(dist) + " m";
}

// ==========================
// RESET
// ==========================
function rst(i) {
  chronos[i].essais = [];
  chronos[i].directions = [];
  chronos[i].running = false;
  chronos[i].startTime = 0;
  document.getElementById(`t${i}`).textContent = "0.00 s";
  updateStats(i);
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
  if (!navigator.geolocation) {
    alert("Géolocalisation non disponible");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    chronos[i].lat = pos.coords.latitude.toFixed(5);
    chronos[i].lon = pos.coords.longitude.toFixed(5);

    document.getElementById(`lat${i}`).textContent =
      "Lat.: " + chronos[i].lat;

    document.getElementById(`lon${i}`).textContent =
      "Long.: " + chronos[i].lon;
  });
}

// ==========================
// BOUSSOLE
// ==========================
function openCompass(i) {
  const c = chronos[i];

  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission();
  }

  let heading = null;

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

  function onOrient(e) {
    if (e.alpha !== null) {
      heading = Math.round(360 - e.alpha);
      document.getElementById("headingValue").textContent = heading + "°";
    }
  }

  window.addEventListener("deviceorientationabsolute", onOrient);

  document.getElementById("saveDir").onclick = () => {
    if (heading !== null) {
      c.directions.push(heading);
      c.direction = heading;
      document.getElementById(`dir${i}`).value = heading;
    }
  };

  overlay.onremove = () => {
    window.removeEventListener("deviceorientationabsolute", onOrient);
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
      <h2>Détails ${c.color}</h2>

      ${c.essais.map((t, idx) => {
        const sec = Math.ceil(t);
        const dist = Math.round((sec * c.vitesse) / 2);
        return `
          <div class="det-line">
            Essai ${idx + 1} : ${sec} s – ${dist} m
            <button onclick="delEssai(${idx})">Supprimer</button>
          </div>`;
      }).join("")}

      <hr>
      <h3>Directions</h3>
      ${c.directions.length === 0 ? "<i>Aucune</i>" :
        c.directions.map((d, idx) => `
          <div class="det-line">
            ${d}°
            <button onclick="delDirection(${idx})">Supprimer</button>
          </div>
        `).join("")
      }

      <br>
      <button onclick="closeDET()">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

function delEssai(idx) {
  chronos[detIndex].essais.splice(idx, 1);
  updateStats(detIndex);
  openDET(detIndex);
}

function delDirection(idx) {
  chronos[detIndex].directions.splice(idx, 1);
  openDET(detIndex);
}

function closeDET() {
  document.getElementById("detOverlay")?.remove();
}
