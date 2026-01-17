// compass.js
// ==========================
// BOUSSOLE – V6 (MODE V4 STABLE)
// ==========================

let appState = null;
let currentIndex = null;

let samples = [];
let listening = false;
let listener = null;

/**
 * Ouvre la boussole
 */
export function openCompass(state, index) {
  appState = state;
  currentIndex = index;
  samples = [];
  listening = false;

  document.getElementById("compassOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "compassOverlay";
  overlay.innerHTML = `
    <div class="compass-box">
      <h2>Boussole ${state.chronos[index].color}</h2>

      <div id="headingValue"
           style="font-size:2em;margin:10px 0;">
        —
      </div>

      <button id="compassEnable">Activer</button><br><br>
      <button id="compassSave" disabled>Capturer</button><br><br>
      <button id="compassClose">Fermer</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById("compassEnable").onclick = enableCompass;
  document.getElementById("compassSave").onclick   = saveDirection;
  document.getElementById("compassClose").onclick  = closeCompass;
}

/**
 * Activation et écoute courte
 */
async function enableCompass() {
  if (listening) return;

  // iOS permission
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const res = await DeviceOrientationEvent.requestPermission();
    if (res !== "granted") {
      alert("Autorisation boussole refusée");
      return;
    }
  }

  samples = [];
  listening = true;

  listener = e => {
    let h = null;

    if (typeof e.webkitCompassHeading === "number") {
      h = e.webkitCompassHeading;
    } else if (e.alpha !== null) {
      h = (360 - e.alpha) % 360;
    }

    if (h !== null && !isNaN(h)) {
      samples.push(h);
    }
  };

  window.addEventListener("deviceorientation", listener, true);

  // écoute volontairement COURTE
  setTimeout(stopListening, 2000);
}

/**
 * Stoppe l’écoute et calcule la moyenne
 */
function stopListening() {
  window.removeEventListener("deviceorientation", listener, true);
  listening = false;

  if (samples.length < 5) {
    alert("Boussole non fiable – recommencez");
    return;
  }

  const angle = moyenneCirculaire(samples);

  document.getElementById("headingValue").textContent =
    angle + "°";

  document.getElementById("compassSave").disabled = false;

  // stock temporairement
  document.getElementById("compassSave").dataset.angle = angle;
}

/**
 * Capture définitive
 */
function saveDirection() {
  const angle = Number(
    document.getElementById("compassSave").dataset.angle
  );

  if (isNaN(angle)) return;

  appState.chronos[currentIndex].directions.push(angle);

  closeCompass();
}

/**
 * Fermeture
 */
function closeCompass() {
  window.removeEventListener("deviceorientation", listener, true);
  document.getElementById("compassOverlay")?.remove();

  samples = [];
  listening = false;
  appState = null;
  currentIndex = null;
}

/**
 * Moyenne circulaire (comme V4)
 */
function moyenneCirculaire(degs) {
  let sin = 0, cos = 0;

  degs.forEach(d => {
    const r = d * Math.PI / 180;
    sin += Math.sin(r);
    cos += Math.cos(r);
  });

  let a = Math.atan2(sin / degs.length, cos / degs.length);
  let deg = a * 180 / Math.PI;
  if (deg < 0) deg += 360;

  return Math.round(deg);
}
