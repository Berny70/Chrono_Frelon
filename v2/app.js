// ==========================
// VERSION (depuis service-worker)
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
      color
    };
    chronos.push(c);

    const div = document.createElement("div");
    div.className = `chrono ${color}`;
    div.id = `chrono-${i}`;

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
  const now = Date.now();

  if (!c.running) {
    c.startTime = now;
    c.running = true;
  } else {
    const elapsed = (now - c.startTime) / 1000;
    c.running = false;
    c.essais.push(elapsed);

    document.getElementById(`t$
