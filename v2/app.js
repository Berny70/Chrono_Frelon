// ==========================
// Lecture version depuis SW
// ==========================
fetch('service-worker.js')
  .then(r => r.text())
  .then(txt => {
    const match = txt.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (match) {
      document.getElementById('version').textContent = "version " + match[1];
    }
  });

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
      color: color,
      vitesse: 4,
      direction: 0,
      position: null
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
        <button class="det">DET</button>
        <button class="reset">RST</button>
      </div>
    `;

    container.appendChild(div);

    div.querySelector(".start").onclick = () => startStop(i);
    div.querySelector(".undo").onclick = () => sup(i);
    div.querySelector(".reset").onclick = () => rst(i);
    div.querySelector(".det").onclick = () => det(i);
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
// SUP DERNIER ESSAI
// ==========================
function sup(i) {
  const c = chronos[i];
  if (c.essais.length) {
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
  document.getElementById(`t${i}`).textContent = "0.00 s";
  updateStats(i);
}

// ==========================
// STATS
// ==========================
function updateStats(i) {
  const c = chronos[i];
  const e = c.essais;

  document.getElementById(`n${i}`).textContent = e.length + " essai";

  if (!e.length) {
    document.getElementById(`m${i}`).textContent = "moy: 0.00 s";
    document.getElementById(`d${i}`).textContent = "dist: 0 m";
    return;
  }

  const moy = e.reduce((a, b) => a + b, 0) / e.length;
  document.getElementById(`m${i}`).textContent = "moy: " + moy.toFixed(2) + " s";
  document.getElementById(`d${i}`).textContent = "dist: " + Math.round(moy * c.vitesse / 2) + " m";
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
function det(i) {
  detIndex = i;
  const c = chronos[i];

  if (!c.position && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      c.position = {
        lat: pos.coords.latitude.toFixed(5),
        lon: pos.coords.longitude.toFixed(5)
      };
      renderDET();
    });
  }

  renderDET();
}

// ==========================
// RENDER DET
// ==========================
function renderDET() {
  const c = chronos[detIndex];
  const container = document.getElementById("chronos");

  container.innerHTML = `
    <div class="det-view ${c.color}">
      <div class="det-header">
        Vitesse :
        <input type="number" min="1" max="9" value="${c.vitesse}">

        Direction :
        <input type="number" value="${c.direction}" maxlength="3"> °
      </div>

      <div class="det-position">
        ${c.position
          ? `Lat : ${c.position.lat} | Lon : ${c.position.lon}`
          : "Position en cours…"}
      </div>

      <div class="det-list">
        ${c.essais.map((e, idx) => {
          const t = Math.ceil(e);
          const d = Math.round((t * c.vitesse) / 2);
          return `
            <div class="det-line">
              Essai ${idx + 1} : ${t} s – dist : ${d} m
              <button onclick="delEssai(${idx})">SUPP</button>
            </div>`;
        }).join("")}
      </div>

      <button class="det-close" onclick="closeDET()">Retour</button>
    </div>
  `;

  const inputs = container.querySelectorAll("input");
  inputs[0].oninput = e => c.vitesse = Number(e.target.value || 1);
  inputs[1].onblur = e => {
    c.direction = Number(e.target.value || 0);
    renderDET();
  };
}

// ==========================
// SUPP ESSAI
// ==========================
function delEssai(idx) {
  chronos[detIndex].essais.splice(idx, 1);
  renderDET();
}

// ==========================
// FERMER DET
// ==========================
function closeDET() {
  location.reload();
}
