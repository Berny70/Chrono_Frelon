// compass.js
// ==========================
// BOUSSOLE – V6 ROBUSTE
// ==========================

let appState = null;
let currentIndex = null;

let currentHeading = null;
let lastHeading = null;
let active = false;

let overlay = null;

/**
 * Ouvre la boussole pour un chrono
 */
export function openCompass(state, index) {
  // mémorisation explicite
  appState = state;
  currentIndex = index;

  currentHeading = null;
  lastHeading = null;
  active = false;

  // sécurité : un seul overlay
  document.getElementById("compassOverlay")?.remove();

  overlay = document.createElement("div");
  overlay.id = "compassOverlay";
  overlay.innerHTML = `
    <div class="compass-box">
      <h2>Boussole ${state.chronos[index].color}</h2>

      <div id="headingValue"
           style="font-size:2.2em;font-weight:bold;margin:10px 0;">
        ---
      </div>

      <button id="compassEnable">Activer la boussole</button><br><br>
      <button id="compassSave">Capturer</button><br><br>
      <button id="compassClose">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("compassEnable").onclick = enableCompass;
  document.getElementById("compassSave").onclick   = saveDirection;
  document.getElementById("compassClose").onclick  = closeCompass;
}

/**
 * Activation du capteur
 */
async function enableCompass() {
  if (active) return;

  // iOS : permission obligatoire
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

  lastHeading = null;
  currentHeading = null;

  window.addEventListener("deviceorientation", onOrientation, true);
  window.addEventListener("deviceorientationabsolute", onOrientation, true);

  active = true;

  // watchdog : capteur bloqué / non supporté
  setTimeout(() => {
    if (currentHeading === null) {
      alert(
        "Boussole indisponible sur ce navigateur.\n" +
        "Essayez Safari iOS ou Chrome Android."
      );
      closeCompass();
    }
  }, 1200);
}

/**
 * Lecture orientation
 */
function onOrientation(e) {
  if (!active) return;

  let heading = null;

  // 🍎 iOS (le SEUL fiable)
  if (typeof e.webkitCompassHeading === "number") {
    heading = e.webkitCompassHeading;
  }
  // 🤖 Android : uniquement si ABSOLU
  else if (e.alpha !== null && e.absolute === true) {
    heading = (360 - e.alpha) % 360;
  }

  // capteur non exploitable
  if (heading === null || isNaN(heading)) return;

  // blocage classique à 0°
  if (heading === 0 && lastHeading === 0) return;

  // filtrage des sauts brutaux
  if (lastHeading !== null) {
    let delta = Math.abs(heading - lastHeading);
    if (delta > 180) delta = 360 - delta;
    if (delta > 25) return;
  }

  lastHeading = heading;
  currentHeading = Math.round(heading);

  const el = document.getElementById("headingValue");
  if (el) el.textContent = currentHeading + "°";
}

/**
 * Capture de la direction
 */
function saveDirection() {
  if (!appState || currentHeading === null) {
    alert("Boussole non prête");
    return;
  }

  appState.chronos[currentIndex].directions.push(currentHeading);

  // feedback utilisateur
  const btn = document.getElementById("compassSave");
  btn.textContent = "✔ Capturé";
  setTimeout(() => (btn.textContent = "Capturer"), 800);
}

/**
 * Fermeture & nettoyage
 */
function closeCompass() {
  window.removeEventListener("deviceorientation", onOrientation, true);
  window.removeEventListener("deviceorientationabsolute", onOrientation, true);

  active = false;
  appState = null;
  currentIndex = null;
  currentHeading = null;
  lastHeading = null;

  document.getElementById("compassOverlay")?.remove();
}
