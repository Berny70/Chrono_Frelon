
// Lecture de la version depuis le service worker
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
window.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("chronos");

  chronoColors.forEach((color, i) => {
  const c = {
    running: false,
    startTime: 0,
    essais: [],
    color: color,
    vitesse: 4,        // m/s (modifiable)
    direction: "000"   // degrés (modifiable)
  };

    chronos.push(c);

    const div = document.createElement("div");
    div.className = `chrono ${color}`;
    div.id = `chrono-${i}`;
    
    div.innerHTML = `
      <span class="time" id="t${i}">0.00 s</span>
      <div class="info">
        <span class="count" id="n${i}">0 ess.</span>
        <span class="avg" id="m${i}">moy.: 0.00 s</span>
        <span class="dist" id="d${i}">dist.: 0 m</span>
      </div>
      <div class="buttons">
        <button class="undo">SUP</button>
        <button class="start">Start / Stop</button>
        <button class="det">DET</button>
        <button class="reset">RST</button>
      </div>

    `;



    container.appendChild(div);

    div.querySelector(".start").addEventListener("click", () => startStop(i));
    div.querySelector(".undo").addEventListener("click", () => sup(i));
    div.querySelector(".reset").addEventListener("click", () => rst(i));
    div.querySelector(".det").addEventListener("click", () => det(i)); 
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
// Mise à jour stats avec textes
// ==========================
function updateStats(i) {
  const c = chronos[i];
  const essais = c.essais;

  document.getElementById(`n${i}`).textContent = essais.length + " essai";

  if (essais.length === 0) {
    document.getElementById(`m${i}`).textContent = "moy: 0.00 s";
    document.getElementById(`d${i}`).textContent = "dist: 0.00 m";
    return;
  }

  const total = essais.reduce((a, b) => a + b, 0);
  const moyenne = total / essais.length;
  const distance = moyenne * 2;

  document.getElementById(`m${i}`).textContent = "moy: " + moyenne.toFixed(2) + " s";
  document.getElementById(`d${i}`).textContent = "dist: " + Math.round(distance) + " m";

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
// ==========================
// Détails des essais
// ==========================
function det(i) {
  const c = chronos[i];

  function render() {
    overlay.innerHTML = `
      <div class="det-box">
        <div class="det-header">
          <label>
            vitesse =
            <input type="number" value="${c.vitesse}" min="1" max="9">
          </label>
          <label>
            direction =
            <input type="text" value="${c.direction}" maxlength="3"> °
          </label>
        </div>

        <div class="det-list">
          ${c.essais.length === 0 ? "<p>Aucune mesure</p>" :
            c.essais.map((t, n) => {
              const sec = Math.ceil(t);
              const dist = Math.round(sec * c.vitesse / 2);
              return `
                <div class="det-line">
                  <span>Essai ${n + 1} : ${sec} s | dist : ${dist} m</span>
                  <button data-i="${n}">SUPP</button>
                </div>
              `;
            }).join("")
          }
        </div>

        <button class="det-close">FERMER</button>
      </div>
    `;

    // champs vitesse / direction
    const vInput = overlay.querySelector("input[type=number]");
    const dInput = overlay.querySelector("input[type=text]");

    vInput.oninput = () => {
      c.vitesse = parseInt(vInput.value) || c.vitesse;
      render();
    };

    dInput.oninput = () => {
      c.direction = dInput.value.padStart(3, "0").slice(-3);
      dInput.value = c.direction;
    };

    // suppression d’un essai
    overlay.querySelectorAll(".det-line button").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.i);
        c.essais.splice(idx, 1);
        render();
      };
    });

    overlay.querySelector(".det-close").onclick = () => overlay.remove();
  }

  const overlay = document.createElement("div");
  overlay.className = "det-overlay " + c.color;
  document.body.appendChild(overlay);

  render();
}



setInterval(tick, 50);










