// compass.js
// ==========================
// BOUSSOLE – V6 STABLE
// ==========================

// État interne au module (PAS global window)
let appState = null;
let currentIndex = null;
let currentHeading = null;
let lastHeading = null;
let active = false;

/**
 * Ouvre l’overlay boussole pour un chrono donné
 */
export function openCompass(state, index) {
  // mémorisation explicite de l’état
  appState = state;
  currentIndex = index;
  currentHeading = null;
  lastHeading = null;
  active = false;

  // sécurité : supprimer un overlay existant
  document.getElementById("compassOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "compassOverlay";
  overlay.innerHTML = `
    <div class="compass-box">
      <h2>Boussole ${state.chronos[index].color}</h2>
      <div id="headingValue" style="font-size:2em;margin:10px 0;">---</div>

      <button data-action="enable">Activer la boussole</button><br><br>
      <button data-action="save">Capturer</button><br><br>
      <button data-action="close">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

/**
 * Gestion des événements d’orientation
 */
function onOrientation(event) {
  if (!active) return;

  let heading = null;

  // 🍎 iOS (PRIORITAIRE)
  if (typeof event.webkitCompassHeading === "number") {
    if (event.webkitCompassAccuracy < 0) return;
    heading = event.webkitCompassHeading;
  }
  // 🤖 Android
  else if (event.alpha !== null) {
    heading = (360 - event.alpha) % 360;
  }

  if (heading === null || isNaN(heading)) return;

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
 * Activation de la boussole (permissions iOS incluses)
 */
async function enableCompass() {
  if (active) return;

  // iOS 13+
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
}

/**
 * Capture la direction courante
 */
function saveDirection() {
  if (!appState || currentHeading === null || currentIndex === null) {
    alert("Boussole non prête");
    return;
  }

  appState.chronos[currentIndex].directions.push(currentHeading);

  // feedback utilisateur
  alert("Direction capturée : " + currentHeading + "°");
}

/**
 * Ferme l’overlay et nettoie
 */
function closeCompass() {
  window.removeEventListener("deviceorientation", onOrientation, true);
  window.removeEventListener("deviceorientationabsolute", onOrientation, true);

  active = false;
  currentHeading = null;
  lastHeading = null;
  currentIndex = null;
  appState = null;

  document.getElementById("compassOverlay")?.remove();
}

/**
 * Délégation globale des boutons de l’overlay
 */
document.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  if (action === "enable") enableCompass();
  if (action === "save") saveDirection();
  if (action === "close") closeCompass();
});
