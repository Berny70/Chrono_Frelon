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
      color,
      vitesse: 4,
      direction: 0
    };
    chronos.push(c);

    const div = document.createElement("div");
    div.className = `chrono ${color}`;
    div.id = `chrono-${i}`;

    div.innerHTML = `
      <span class="time" id="t${i}">0.00 s</span>

      <div class="info">
        <span id="n${i}">0 ess.</span>
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

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        c.essais.push({
          time: elapsed,
          lat: pos.coords.latitude.toFixed(5),
          lon: pos.coords.longitude.toFixed(5)
        });
        updateStats(i);
      }, () => {
        c.essais.push({ time: elapsed, lat: "?", lon: "?" });
        updateStats(i);
      });
    }
  }
}

// ==========================
// STATS
// ==========================
function updateStats(i) {
  const c = chronos[i];
  const e = c.essais;

  document.getElementById(`n${i}`).textContent = e.length + " ess.";

  if (!e.length) return;

  const moy = e.reduce((a, b) => a + b.time, 0) / e.length;
  document.getElementById(`m${i}`).textContent = "moy: " + moy.toFixed(2) + " s";
  document.getElementById(`d${i}`).textContent =
    "dist: " + Math.round((moy * c.vitesse) / 2) + " m";
}

// ==========================
// SUP / RESET
// ==========================
function sup(i) {
  chronos[i].essais.pop();
  updateStats(i);
}

function rst(i) {
  chronos[i].essais = [];
  updateStats(i);
}

// ==========================
// TICK
// ==========================
setInterval(() => {
  chronos.forEach((c, i) => {
    if (c.running) {
      document.getElementById(`t${i}`).textContent =
        ((Date.now() - c.startTime) / 1000).toFixed(2) + " s";
    }
  });
}, 50);

// ==========================
// DET OVERLAY
// ==========================
function openDET(i) {
  detIndex = i;
  const c = chronos[i];

  const overlay = document.createElement("div");
  overlay.id = "detOverlay";
  overlay.className = c.color;

  overlay.innerHTML = `
    <div class="det-box">
      <h2>Détails ${c.color}</h2>

      Vitesse :
      <input type="number" value="${c.vitesse}" min="1" max="9">

      Direction :
      <input type="number" value="${c.direction}" maxlength="3"> °

      <div class="det-list">
        ${c.essais.map((e, idx) => {
          const t = Math.ceil(e.time);
          const d = Math.round((t * c.vitesse) / 2);
          return `
            <div>
              Essai ${idx + 1} : ${t} s – dist ${d} m
              <br>Lat ${e.lat} / Lon ${e.lon}
              <button onclick="delEssai(${idx})">SUPP</button>
            </div>`;
        }).join("")}
      </div>

      <button onclick="closeDET()">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll("input")[0].oninput = e => c.vitesse = +e.target.value;
  overlay.querySelectorAll("input")[1].oninput = e => c.direction = +e.target.value;
}

function delEssai(idx) {
  chronos[detIndex].essais.splice(idx, 1);
  closeDET();
  openDET(detIndex);
}

function closeDET() {
  document.getElementById("detOverlay")?.remove();
}
