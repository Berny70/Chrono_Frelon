// compass.js
// ==========================
// BOUSSOLE – V6 (SANS DÉLÉGATION)
// ==========================

let appState = null;
let currentIndex = null;
let currentHeading = null;
let lastHeading = null;
let active = false;

let btnEnable = null;
let btnSave = null;
let btnClose = null;

/**
 * Ouvre la boussole
 */
export function openCompass(state, index) {
  appState = state;
  currentIndex = index;
  currentHeading = null;
  lastHeading = null;
  active = false;

  // supprimer un overlay existant
  document.getElementById("compassOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "compassOverlay";
  overlay.innerHTML = `
    <div class="compass-box">
      <h2>Boussole ${state.chronos[index].color}</h2>
      <div id="headingValue" style="font-size:2em;margin:10px 0;">---</div>

      <button id="compassEnable">Activer la boussole</button><br><br>
      <button id="compassSave">Capturer</button><br><br>
      <button id="compassClose">Fermer</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // récupérer les boutons
  btnEnable = document.getElementById("compassEnable");
  btnSave   = document.getElementById("compassSave");
  btnClose  = document.getElementById("compassClose");

  // brancher explicitement
  btnEnable.onclick = enableCompass;
  btnSave.onclick   = saveDirection;
  btnClose.onclick  = closeCompass;
}

/**
 * Orientation device
 */
    function onOrientation(e) {
      if (!active) return;
    
      let heading = null;
    
      // iOS
      if (typeof e.webkitCompassHeading === "number") {
        heading = e.webkitCompassHeading;
      }
      // Android
      else if (e.alpha !== null && e.absolute === true) {
        heading = (360 - e.alpha) % 360;
      }
    
      // ❌ capteur non fiable
      if (heading === null || isNaN(heading)) return;


  if (heading === null || isNaN(heading)) return;

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
 * Activation boussole
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

  lastHeading = null;
  currentHeading = null;

  window.addEventListener("deviceorientation", onOrientation, true);
  window.addEventListener("deviceorientationabsolute", onOrientation, true);

  active = true;
}

/**
 * Capture direction
 */
function saveDirection() {
  if (!appState || currentHeading === null) {
    alert("Boussole non prête");
    return;
  }

  appState.chronos[currentIndex].directions.push(currentHeading);

  // feedback clair
  btnSave.textContent = "✔ Capturé";
  setTimeout(() => (btnSave.textContent = "Capturer"), 800);
}

/**
 * Fermeture
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
