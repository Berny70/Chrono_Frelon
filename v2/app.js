// Extrait de la génération d'un chrono
function createChrono(color) {
  const container = document.createElement("div");
  container.className = "chrono-container " + color;

  const chronoDisplay = document.createElement("div");
  chronoDisplay.className = "chrono-display";
  chronoDisplay.textContent = "0.00 s";
  container.appendChild(chronoDisplay);

  // Boutons existants : SUP, Start/Stop, RST
  const buttons = document.createElement("div");
  buttons.className = "chrono-buttons";

  const supBtn = document.createElement("button");
  supBtn.textContent = "SUP";
  supBtn.className = "btn-sup";
  buttons.appendChild(supBtn);

  const startStopBtn = document.createElement("button");
  startStopBtn.textContent = "Start/Stop";
  startStopBtn.className = "btn-start";
  buttons.appendChild(startStopBtn);

  const rstBtn = document.createElement("button");
  rstBtn.textContent = "RST";
  rstBtn.className = "btn-rst";
  buttons.appendChild(rstBtn);

  // Nouveau bouton DET
  const detBtn = document.createElement("button");
  detBtn.textContent = "DET";
  detBtn.className = "btn-det";
  detBtn.style.backgroundColor = "green";
  buttons.appendChild(detBtn);

  container.appendChild(buttons);

  // Retour du container
  return container;
}
