// ==========================
// VERSION
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

      <div class="info">
        <span id="n${i}">0 essai</span>
        <span id="m${i}">moy: 0.00 s</span>
        <span id="d${i}">dist: 0 m</span>
      </div>

      <div class="buttons">
        <button class="undo">SUP</button>
        <button class="start">Start / Stop</button>
        <button class="det">DET</button>
        <button class="reset">RST</button>
      </div>
    `;

    container.appendChild(div);

    div.querySelector(".start").onclick = () => startStop(i);
    div.querySelector(".undo").onclick = () => sup(i);
    div.querySelector(".reset").onclick = () => rst(i);
    div.querySelector(".det").onclick = () => openDET(i);
  });
});

// ==========================
// START / STOP
// ==========================
function startStop(i) {
  const c = chronos[i];

  if (!c.running) {
    c.startTime = Date.now();
    c.running = true;
  } else {
    const elapsed = (Date.now() - c.startTime) / 1000;
    c.running = false;
    c.essais.push(elapsed);

    document.getElementById(`t${i}`).textContent =
      elapsed.toFixed(2) + " s";

    updateStats(i); // ✅ MAJ immédiate
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
// SUP / RESET
// ==========================
function sup(i) {
  if (chronos[i].essais.length) {
    chronos[i].essais.pop();
    updateStats(i); // ✅ MAJ immédiate
  }
}

function rst(i) {
  chronos[i].essais = [];
  chronos[i].running = false;
  chronos[i].startTime = 0;
  document.getElementById(`t${i}`).textContent = "0.00 s";
  updateStats(i); // ✅ MAJ immédiate
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
// DET
// ==========================
function openDET(i) {
  detIndex = i;
  const c = chronos[i];

  closeDET(); // évite doublons

  const overlay = document.createElement("div");
  overlay.id = "detOverlay";
  overlay.className = c.color;

  overlay.innerHTML = `
    <div class="det-box">
      <h2>Détails ${c.color}</h2>

      <div>
        Vitesse :
        <input type="number" value="${c.vitesse}" min="1" max="9">
      </div>

      <div>
        Direction :
        <input type="number" value="${c.direction}" maxlength="3"> °
      </div>

      <hr>

      ${c.essais.map((t, idx) => {
        const sec = Math.ceil(t);
        const dist = Math.round((sec * c.vitesse) / 2);
        return `
          <div class="det-line">
            Essai ${idx + 1} : ${sec} s – dist ${dist} m
            <button onclick="delEssai(${idx})">SUPP</button>
          </div>`;
      }).join("")}

      <br>
      <button onclick="closeDET()">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll("input")[0].oninput =
    e => c.vitesse = +e.target.value;

  overlay.querySelectorAll("input")[1].oninput =
    e => c.direction = +e.target.value;
}

function delEssai(idx) {
  chronos[detIndex].essais.splice(idx, 1);
  updateStats(detIndex);
  openDET(detIndex);
}

function closeDET() {
  document.getElementById("detOverlay")?.remove();
}

