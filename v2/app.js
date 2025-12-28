// app.js v2

// Couleurs des chronos
const CHRONO_COLORS = ["red", "blue", "green", "white"];

// Stockage des mesures pour chaque chrono
const chronoMeasures = {
  red: [],
  blue: [],
  green: [],
  white: []
};

// Fonction pour créer un chrono
function createChrono(color) {
  const container = document.createElement("div");
  container.className = "chrono-container " + color;

  // Affichage du chrono
  const chronoDisplay = document.createElement("div");
  chronoDisplay.className = "chrono-display";
  chronoDisplay.textContent = "0.00 s";
  container.appendChild(chronoDisplay);

  // Affichage info essai, moy, dist
  const infoDiv = document.createElement("div");
  infoDiv.className = "chrono-info";

  const essaiDiv = document.createElement("div");
  essaiDiv.className = "info-essai";
  essaiDiv.textContent = "0 essai";
  infoDiv.appendChild(essaiDiv);

  const moyDiv = document.createElement("div");
  moyDiv.className = "info-moy";
  moyDiv.textContent = "0";
  infoDiv.appendChild(moyDiv);

  const distDiv = document.createElement("div");
  distDiv.className = "info-dist";
  distDiv.textContent = "0 m";
  infoDiv.appendChild(distDiv);

  container.appendChild(infoDiv);

  // Boutons
  const buttons = document.createElement("div");
  buttons.className = "chrono-buttons";

  // SUP
  const supBtn = document.createElement("button");
  supBtn.textContent = "SUP";
  supBtn.className = "btn-sup";
  supBtn.style.backgroundColor = "orange";
  buttons.appendChild(supBtn);

  // Start/Stop
  const startStopBtn = document.createElement("button");
  startStopBtn.textContent = "Start/Stop";
  startStopBtn.className = "btn-start";
  startStopBtn.style.backgroundColor = "green";
  buttons.appendChild(startStopBtn);

  // RST
  const rstBtn = document.createElement("button");
  rstBtn.textContent = "RST";
  rstBtn.className = "btn-rst";
  rstBtn.style.backgroundColor = "red";
  buttons.appendChild(rstBtn);

  // DET
  const detBtn = document.createElement("button");
  detBtn.textContent = "DET";
  detBtn.className = "btn-det";
  detBtn.style.backgroundColor = "green";
  buttons.appendChild(detBtn);

  container.appendChild(buttons);

  // Chrono state
  let running = false;
  let startTime = 0;
  let intervalId = null;

  // Start/Stop
  startStopBtn.addEventListener("click", () => {
    if (!running) {
      running = true;
      startTime = Date.now();
      intervalId = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        chronoDisplay.textContent = elapsed.toFixed(2) + " s";
      }, 10); // centièmes
    } else {
      running = false;
      clearInterval(intervalId);
      const elapsed = (Date.now() - startTime) / 1000;
      chronoDisplay.textContent = elapsed.toFixed(2) + " s";

      // Stocker la mesure
      chronoMeasures[color].push(elapsed);

      // Mettre à jour essai, moy, dist
      const mesures = chronoMeasures[color];
      essaiDiv.textContent = mesures.length + " essai";
      const moyenne = mesures.reduce((a, b) => a + b, 0) / mesures.length;
      moyDiv.textContent = moyenne.toFixed(2);
      distDiv.textContent = Math.round(moyenne * 5) + " m";
    }
  });

  // SUP
  supBtn.addEventListener("click", () => {
    if (chronoMeasures[color].length > 0) {
      chronoMeasures[color].pop();
      const mesures = chronoMeasures[color];
      essaiDiv.textContent = mesures.length + " essai";
      if (mesures.length > 0) {
        const moyenne = mesures.reduce((a, b) => a + b, 0) / mesures.length;
        moyDiv.textContent = moyenne.toFixed(2);
        distDiv.textContent = Math.round(moyenne * 5) + " m";
      } else {
        moyDiv.textContent = "0";
        distDiv.textContent = "0 m";
      }
    }
  });

  // RST
  rstBtn.addEventListener("click", () => {
    chronoMeasures[color] = [];
    chronoDisplay.textContent = "0.00 s";
    essaiDiv.textContent = "0 essai";
    moyDiv.textContent = "0";
    distDiv.textContent = "0 m";
    if (running) {
      running = false;
      clearInterval(intervalId);
    }
  });

  // DET
  detBtn.addEventListener("click", () => {
    const mesures = chronoMeasures[color];
    if (mesures.length === 0) {
      alert("Aucune mesure pour " + color);
    } else {
      alert("Mesures " + color + " :\n" + mesures.map(m => m.toFixed(2) + " s").join("\n"));
    }
  });

  return container;
}

// Générer tous les chronos
function initChronos() {
  const main = document.getElementById("chronos");
  CHRONO_COLORS.forEach(color => {
    const chrono = createChrono(color);
    main.appendChild(chrono);
  });
}

// Initialisation
document.addEventListener("DOMContentLoaded", initChronos);
