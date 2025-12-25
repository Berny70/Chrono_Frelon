// ===============================
// Données des chronos
// ===============================
const chronoColors = ["red", "blue", "green", "white"];
const chronos = [];

// ===============================
// INITIALISATION DES CHRONOS
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("chronos");

  chronoColors.forEach((color, i) => {
    const c = {
      running: false,
      startTime: 0,
      essais: [],
      color: color
    };
    chronos.push(c);

    // Création HTML
    const div = document.createElement("div");
    div.className = `chrono ${color}`;
    div.id = `chrono-${i}`;
    div.innerHTML = `
      <button class="start">Start / Stop</button>
      <span class="time" id="t${i}">0.00 s</span>
      <span class="count" id="n${i}">0</span>
      <span class="avg" id="m${i}">0</span>
      <span class="dist" id="d${i}">0</span>
      <button class="undo">SUO</button>
      <button class="reset">RST</button>
    `;

    container.appendChild(div);

    // Événements
    div.querySelector(".start").addEventListener("click", () => startStop(i));
    div.querySelector(".undo").addEventListener("click", () => sup(i));
    div.querySelector(".reset").addEventListener("click", () => rst(i));
  });
});

// ===============================
// START / STOP
// ===============================
function startStop(i) {
  const c = chronos[i];
  const nowSec = Math.floor(Date.now() / 1000);

  if (!c.running) {
    // START
    c.startTime = nowSec;
    c.running = true;
  } else {
    // STOP
    const elapsed = nowSec - c.startTime; // secondes entières
    c.essais.push(elapsed);
    c.running = false;

    // Affichage figé en secondes entières
    document.getElementById(`t${i}`).textContent = elapsed + " s";

    updateStats(i);
  }
}

// ===============================
// SUPPRIMER DERNIER ESSAI
// ===============================
function sup(i) {
  const c = chronos[i];
  if (c.essais.length > 0) {
    c.essais.pop();
    updateStats(i);
  }
}

// ===============================
// RESET COMPLET D’UN CHRONO
// ===============================
function rst(i) {
  chronos[i] = {
    running: false,
    startTime: 0,
    essais: [],
    color: chronos[i].color
  };

  document.getElementById(`t${i}`).textContent = "0 s";
  updateStats(i);
}

// ===============================
// MISE À JOUR DES STATS
// ===============================
function updateStats(i) {
  const essais = chronos[i].essais;
  document.getElementById(`n${i}`).textContent = essais.length;

  if (essais.length === 0) {
    document.getElementById(`m${i}`).textContent = "0";
    document.getElementById(`d${i}`).textContent = "0";
    return;
  }

  const total = essais.reduce((a, b) => a + b, 0);
  const moyenne = Math.round(total / essais.length); // secondes entières
  const distance = moyenne * 5; // m/s

  document.getElementById(`m${i}`).textContent = moyenne;
  document.getElementById(`d${i}`).textContent = distance;
}

// ===============================
// AFFICHAGE TEMPS EN COURS
// (secondes + centièmes)
// ===============================
function tick() {
  const nowMs = Date.now();

  chronos.forEach((c, i) => {
    if (c.running) {
      const elapsedMs = nowMs - (c.startTime * 1000);
      const elapsedSec = elapsedMs / 1000;

      document.getElementById(`t${i}`).textContent =
        elapsedSec.toFixed(2) + " s";
    }
  });
}

// Rafraîchissement fluide pour centièmes
setInterval(tick, 50);
