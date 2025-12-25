// ===============================
// Données des chronos
// ===============================
const chronoColors = ["red", "blue", "green", "white"];
const chronos = [];

window.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("chronos");

  // Création des 4 chronos
  chronoColors.forEach((color, i) => {
    const c = {
      running: false,
      startTime: 0,
      essais: [],
      color: color
    };
    chronos.push(c);

    const div = document.createElement("div");
    div.className = `chrono ${color}`;
    div.id = `chrono-${i}`;

    div.innerHTML = `
      <button class="start">Start / Stop</button>
      <span class="time" id="t${i}">0.00 s</span>
      <span class="count" id="n${i}">0</span>
      <span class="avg" id="m${i}">0</span>
      <span class="dist" id="d${i}">0</span>
      <button class="undo">SUP</button>
      <button class="reset">RST</button>
    `;

    container.appendChild(div);

    // Boutons
    div.querySelector(".start").addEventListener("click", () => startStop(i));
    div.querySelector(".undo").addEventListener("click", () => sup(i));
    div.querySelector(".reset").addEventListener("click", () => rst(i));
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
    const elapsedSec = (now - c.startTime) / 1000;
    c.essais.push(elapsedSec);
    c.running = false;

    document.getElementById(`t${i}`).textContent = elapsedSec.toFixed(2) + " s";
    updateStats(i);
  }
}

// ==========================
// Supprimer dernier essai
// ==========================
function sup(i) {
  const c = chronos[i];
  if (c.essais.length > 0) {
    c.essais.pop();
    updateStats(i);
  }
}

// ==========================
// Reset complet
// ==========================
function rst(i) {
  chronos[i].running = false;
  chronos[i].startTime = 0;
  chronos[i].essais = [];

  document.getElementById(`t${i}`).textContent = "0.00 s";
  updateStats(i);
}

// ==========================
// Mise à jour stats
// ==========================
function updateStats(i) {
  const c = chronos[i];
  const essais = c.essais;

  document.getElementById(`n${i}`).textContent = essais.length;

  if (essais.length === 0) {
    document.getElementById(`m${i}`).textContent = "0";
    document.getElementById(`d${i}`).textContent = "0";
    return;
  }

  const total = essais.reduce((a, b) => a + b, 0);
  const moyenne = total / essais.length;
  const distance = moyenne * 2;

  document.getElementById(`m${i}`).textContent = moyenne.toFixed(2);
  document.getElementById(`d${i}`).textContent = distance.toFixed(2);
}

// ==========================
// Tick pour centièmes
// ==========================
function tick() {
  const now = Date.now();

  chronos.forEach((c, i) => {
    if (c.running) {
      const elapsedSec = (now - c.startTime) / 1000;
      document.getElementById(`t${i}`).textContent = elapsedSec.toFixed(2) + " s";
    }
  });
}

setInterval(tick, 50);

