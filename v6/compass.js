// compass.js
// ==========================
// BOUSSOLE – V6
// ==========================

let currentIndex = null;
let currentHeading = null;
let lastHeading = null;
let active = false;

/**
 * Ouvre l’overlay boussole
 */
export function openCompass(state, index) {
  currentIndex = index;
  currentHeading = null;
  lastHeading = null;
  active = false;

  const overlay = document.createElement("div");
  overlay.id = "compassOverlay";
  overlay.innerHTML = `
    <div class="compass-box">
      <h2>Boussole ${state.chronos[index].color}</h2>
      <div id="headingValue">---</div>
      <button data-action="enable">Activer</button><br><br>
      <button data-action="save">Capturer</button><br><br>
      <button data-action="close">Fermer</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

/**
 * Gestion orientation appareil
 */
function onOrientation(e) {
  if (!active) return;

  let heading = null;

  // 🍎 iOS PRIORITAIRE
  if (typeof e.webkitCompassHeading === "number") {
    if (e.webkitCompassAccuracy < 0) return;
    heading = e.webkitCompassHeading;
  }
  // 🤖 Android
  else if (e.absolute === true && e.alpha !== null) {
    heading = (360 - e.alpha) % 360;
  }

  if (heading === null || isNaN(heading)) return;

  // Filtrage des sauts brutaux
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
 * Activation de la boussole (permission iOS)
 */
async function enableCompass() {
  if (active) return;

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

  window.addEventListener("deviceorientationabsolute", onOrientation, true);
  window.addEventListener("deviceorientation", onOrientation, true);

  active = true;
}

/**
 * Sauvegarde direction
 */
function saveDirection(state) {
  if (currentHeading === null) {
    alert("Boussole non prête");
    return;
  }

  state.chronos[currentIndex].directions.push(currentHeading);
}

/**
 * Fermeture overlay
 */
function closeCompass() {
  window.removeEventListener("deviceorientationabsolute", onOrientation, true);
  window.removeEventListener("deviceorientation", onOrientation, true);

  active = false;
  currentIndex = null;
  currentHeading = null;
  lastHeading = null;

  document.getElementById("compassOverlay")?.remove();
}

/**
 * Délégation boutons overlay
 */
document.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  if (action === "enable") enableCompass();
  if (action === "save") saveDirection(window.__APP_STATE__);
  if (action === "close") closeCompass();
});
