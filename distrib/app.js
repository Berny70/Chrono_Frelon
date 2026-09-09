// ==========================
// DONNÉES GLOBALES – V7 i18n
// ==========================
const chronoColors = ["red", "blue", "green", "white"];
const chronos = [];
const DEFAULT_VITESSE = 4;

let detIndex = null;
let currentCompassIndex = null;
let currentHeading = null;
let lastHeading = null;
let compassActive = false;
let compassListenersAdded = false;


(async function initAdminButton() {
  const pilotId = localStorage.getItem('pilot_id');
  if (!pilotId) return;

  const { data } = await window.supabaseClient
    .rpc('chassnid_is_admin', { p_pilot_id: pilotId });

  if (data === true) {
    const btn = document.getElementById('btnAdmin');
    if (btn) {
      btn.style.display = '';
      btn.addEventListener('click', async () => {
        // Enregistrer le phone_id dans admin_profiles
        const phoneId = localStorage.getItem('phone_id');
        if (phoneId) {
          await window.supabaseClient.rpc('chassnid_register_phone_id', {
            p_pilot_id: pilotId,
            p_phone_id: phoneId,
          });
        }
        window.open('https://berny70.github.io/Chrono_Frelon_Admin/', '_blank');
      });
    }
  }
})();
const DEFAULT_PILOT_ID = 'af095067-eb9b-4603-b850-0406e777b252'; // Bernard par défaut

(function initPilotId() {
  const params      = new URLSearchParams(window.location.search);
  const pilotParam  = params.get('pilot');
  if (pilotParam) {
    // QR Code scanné — toujours réinitialiser le rattachement
    localStorage.setItem('pilot_id', pilotParam);
    localStorage.removeItem('pilot_attached');
  } else if (!localStorage.getItem('pilot_id')) {
    // Pas de pilote connu — rattacher à Bernard par défaut
    localStorage.setItem('pilot_id', DEFAULT_PILOT_ID);
  }
})();

// ==========================
// mode au démarrage 
// ==========================
const MODE =
  localStorage.getItem("mode") || "direction"; 
// "chrono" | "direction"

const MODE_DIRECTION_ONLY = MODE === "direction";

// ==========================
// MOYENNE CIRCULAIRE
// ==========================
function moyenneCirculaire(degs) {
  if (!degs.length) return 0;
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

// ==========================
// SAUVEGARDE OBSERVATIONS
// ==========================
  function saveObservations() {
    const obs = chronos.map(c => {
      if (
        c.lat === "--" ||
        c.lon === "--" ||
        c.direction == null
      ) return null;
  
      return {
        lat: parseFloat(c.lat),
        lon: parseFloat(c.lon),
        direction: c.direction,
        directions: c.directions,
        essais: c.essais,
        vitesse: c.vitesse,
        color: c.color
      };
    }).filter(Boolean);
  
    if (obs.length) {
      localStorage.setItem("chronoObservations", JSON.stringify(obs));
    }
  }
// ==========================
// RESTAURATION OBSERVATIONS
// ==========================
  function restoreObservations() {
    const obs = JSON.parse(localStorage.getItem("chronoObservations") || "[]");
  
    obs.forEach((o, i) => {
      if (!chronos[i]) return;
      const c = chronos[i];
  
      // état interne
      c.lat = o.lat.toFixed(5);
      c.lon = o.lon.toFixed(5);
      c.direction = o.direction;
      c.directions = o.directions || [];
      c.essais = o.essais || [];
      c.vitesse = o.vitesse || DEFAULT_VITESSE;
      c.running = false;
      c.startTime = 0;
  
      // UI
      document.getElementById(`lat${i}`).textContent = c.lat;
      document.getElementById(`lon${i}`).textContent = c.lon;
      document.getElementById(`dir${i}`).textContent = c.direction + "°";
  
      if (!MODE_DIRECTION_ONLY) {
        document.getElementById(`vit${i}`).value = c.vitesse;
        updateStats(i); // 🔑 recalcule moyennes & distances
      }
    });
  }

// ==========================
// INITIALISATION UI
// ==========================
window.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("chronos");
  if (!container) return;

  chronoColors.forEach((color, i) => {
    const c = {
      running: false,
      startTime: 0,
      essais: [],
      directions: [],
      vitesse: DEFAULT_VITESSE,
      direction: 0,
      lat: "--",
      lon: "--",
      color
    };
    chronos.push(c);

    const div = document.createElement("div");
    div.className = `chrono ${color}`;
    div.innerHTML = `
      <div class="row row-main">
        <button class="start" data-i18n="start"></button>
        <span class="time" id="t${i}">0.00 s</span>
        <button class="reset" data-i18n="reset"></button>
      </div>

      <div class="row row-info">
        <div><b>Lat.:</b> <span id="lat${i}">--</span></div>
        <div><b>T.moy:</b> <span id="m${i}">0 s</span></div>
        <div>
          <b>Vit.:</b>
          <input type="number" id="vit${i}" value="${DEFAULT_VITESSE}" min="1" max="9"> m/s
        </div>
      </div>

      <div class="row row-info">
        <div><b>Lon.:</b> <span id="lon${i}">--</span></div>
        <div><b>Dir.:</b> <span id="dir${i}">0°</span></div>
        <div><b>Dist.:</b> <span id="d${i}">0 m</span></div>
      </div>

      <div class="row row-actions">
        <button class="pos" data-i18n="position"></button>
        <button class="compass" data-i18n="compass"></button>
        <button class="det" data-i18n="detail"></button>
      </div>
    `;

    container.appendChild(div);
      
      // 🔒 MODE DIRECTION : nettoyage UI AVANT handlers
      if (MODE_DIRECTION_ONLY) {
        // Supprimer chrono
        div.querySelector(".start")?.remove();
        div.querySelector(".time")?.remove();
      
        // Supprimer vitesse et temps moyen
        div.querySelector(`#vit${i}`)?.closest("div")?.remove();
        div.querySelector(`#m${i}`)?.closest("div")?.remove();
      
        // Supprimer distance
        div.querySelector(`#d${i}`)?.closest("div")?.remove();
      }

      
      // Handlers communs (toujours utiles)
      div.querySelector(".pos").onclick = () => getPos(i);
      div.querySelector(".det").onclick = () => openDET(i);
      div.querySelector(".compass").onclick = () => openCompass(i);
      
      // START uniquement en mode chrono
        if (!MODE_DIRECTION_ONLY) {
          div.querySelector(".start").onclick = () => startStop(i);
        
          div.querySelector(`#vit${i}`).oninput = e => {
            c.vitesse = +e.target.value;
            updateStats(i);
          };
        }
        
        // RESET fonctionne dans les deux modes
        if (MODE_DIRECTION_ONLY) {
          div.querySelector(".reset").onclick = () => resetDirectionOnly(i);
        } else {
          div.querySelector(".reset").onclick = () => resetChrono(i);
        }
      // ==========================
      // Sélecteur de mode (header)
      // ==========================
      const btnChrono = document.getElementById("btnModeChrono");
      const btnDirection = document.getElementById("btnModeDirection");
    
      if (btnChrono && btnDirection) {
    
        if (MODE_DIRECTION_ONLY) {
          btnDirection.classList.add("active");
        } else {
          btnChrono.classList.add("active");
        }
    
        btnChrono.onclick = () => {
          localStorage.setItem("mode", "chrono");
          location.reload();
        };
    
        btnDirection.onclick = () => {
          localStorage.setItem("mode", "direction");
          location.reload();
        };
      }



    
  });
 restoreObservations();

  document.getElementById("btnLoc")?.addEventListener("click", openLocationMenu);
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
    document.getElementById(`t${i}`).textContent = elapsed.toFixed(2) + " s";
    updateStats(i);
  }
}

// ==========================
// STATS
// ==========================
function updateStats(i) {
  const c = chronos[i];

  if (!c.essais.length) {
    document.getElementById(`m${i}`).textContent = "0 s";
    document.getElementById(`d${i}`).textContent = "0 m";
    return;
  }

  const total = c.essais.reduce((a, b) => a + b, 0);
  const moy = total / c.essais.length;
  const dist = moy * c.vitesse / 2;

  document.getElementById(`m${i}`).textContent = Math.round(moy) + " s";
  document.getElementById(`d${i}`).textContent = Math.round(dist) + " m";

  saveObservations();
}

// ==========================
// RESET
// ==========================
function resetChrono(i) {
  const c = chronos[i];
  Object.assign(c, {
    running: false,
    startTime: 0,
    essais: [],
    directions: [],
    direction: 0,
    vitesse: DEFAULT_VITESSE,
    lat: "--",
    lon: "--"
  });

  document.getElementById(`t${i}`).textContent = "0.00 s";
  document.getElementById(`m${i}`).textContent = "0 s";
  document.getElementById(`d${i}`).textContent = "0 m";
  document.getElementById(`dir${i}`).textContent = "0°";
  document.getElementById(`lat${i}`).textContent = "--";
  document.getElementById(`lon${i}`).textContent = "--";
  document.getElementById(`vit${i}`).value = DEFAULT_VITESSE;

  saveObservations();
}

// ==========================
// TICK
// ==========================
setInterval(() => {
  const now = Date.now();
  chronos.forEach((c, i) => {
    if (c.running) {
      document.getElementById(`t${i}`).textContent =
        ((now - c.startTime) / 1000).toFixed(2) + " s";
    }
  });
}, 50);

// ==========================
// POSITION GPS (AVEC SPINNER)
// ==========================
function getPos(i) {
  document.getElementById(`lat${i}`).innerHTML =
    '<span class="gps-spinner"></span>';
  document.getElementById(`lon${i}`).textContent = "GPS…";

  navigator.geolocation.getCurrentPosition(
    pos => {
      chronos[i].lat = pos.coords.latitude.toFixed(5);
      chronos[i].lon = pos.coords.longitude.toFixed(5);

      document.getElementById(`lat${i}`).textContent = chronos[i].lat;
      document.getElementById(`lon${i}`).textContent = chronos[i].lon;

      saveObservations();
    },
    () => {
      alert(t("gps_error"));
      document.getElementById(`lat${i}`).textContent = "--";
      document.getElementById(`lon${i}`).textContent = "--";
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
}

// ==========================
// MENU LOCALISATION
// ==========================
function openLocationMenu() {
  document.getElementById("locOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "locOverlay";

overlay.innerHTML = `
  <div class="loc-box">
    <h2>${t("nest_location")}</h2>

    <!-- Pseudo directement dans la popup -->
    <div style="margin-bottom:10px;display:flex;gap:6px;align-items:center">
      <span style="font-size:14px">🏷️</span>
      <input
        type="text"
        id="pseudoInLoc"
        placeholder="Mon pseudo…"
        maxlength="40"
        value="${(localStorage.getItem("my_pseudo") || "").replace(/"/g, '&quot;')}"
        style="flex:1;border:1px solid #ccc;border-radius:6px;padding:6px 8px;font-size:13px;font-family:inherit"
      >
      <button data-action="savePseudoLoc" style="background:#c8a44a;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:13px;cursor:pointer">💾</button>
    </div>

    <!-- ✅ DECLINAISON JUSTE SOUS LE TITRE -->
    <div style="margin-bottom:10px;">
      Déclinaison :
      <input
        type="text"
        id="declinaisonInput"
        inputmode="decimal"
        style="width:60px; text-align:center;"
      > °
    </div>

    <hr>

    <button data-action="local">
      🗺️ <span data-i18n="map_local"></span>
    </button>

    <button data-action="send">
      📤 <span data-i18n="map_send"></span>
    </button>

    <button data-action="shared">
      🌍 <span data-i18n="map_shared"></span>
    </button>

    <button data-action="manual">
      ✏️ <span data-i18n="manual_input"></span>
    </button>

    <hr>

    <button data-action="reset">
      🗑 <span data-i18n="delete_data"></span>
    </button>

    <button data-action="close">
      <span data-i18n="close"></span>
    </button>
  </div>
`;

  document.body.appendChild(overlay);

  applyTranslations();
  initDeclinaison();
  setupDeclinaison();
  // ✅ VERSION ROBUSTE (IMPORTANT)
  overlay.addEventListener("click", async e => {

    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;

    console.log("ACTION:", action); // debug

    // ==========================
    // NAVIGATION
    // ==========================
    if (action === "local") location.href = "map.html";
    if (action === "shared") location.href = "map.html?mode=shared";
    if (action === "send") envoyerVersCartePartagee();

    // ==========================
    // POPUP MANUEL
    // ==========================
    if (action === "manual") openManualInput();

    // Sauvegarde pseudo depuis la popup localisation
    if (action === "savePseudoLoc") {
      const val     = document.getElementById("pseudoInLoc")?.value.trim();
      const btn     = e.target.closest("button");
      const pilotId = localStorage.getItem("pilot_id") || DEFAULT_PILOT_ID;
      const phoneId = localStorage.getItem("phone_id");

      if (phoneId && val !== undefined) {
        if (btn) { btn.disabled = true; btn.textContent = "⏳"; }
        localStorage.setItem("my_pseudo", val);

        const { error } = await window.supabaseClient?.rpc("chassnid_sentinel_set_pseudo", {
          p_phone_id: phoneId,
          p_pilot_id: pilotId,
          p_pseudo:   val,
        }) || {};

        if (btn) {
          btn.disabled = false;
          btn.textContent = error ? "❌" : "✅";
          setTimeout(() => { btn.textContent = "💾"; }, 2000);
        }
      }
    }

    // ==========================
    // FERMETURE
    // ==========================
    if (action === "close") overlay.remove();

    // ==========================
    // RESET
    // ==========================
    if (action === "reset") {

      if (!confirm(t("confirm_delete_local") || "Supprimer toutes les données locales ?")) return;

      localStorage.removeItem("chronoObservations");
      localStorage.removeItem("mapView");

      alert(t("data_deleted") || "Données locales supprimées");

      location.reload();
    }
  });
}
// ==========================
// ENVOI SUPABASE
// ==========================
async function envoyerVersCartePartagee() {
  console.log("1 - début");
  const obs = JSON.parse(localStorage.getItem("chronoObservations") || "[]");
  console.log("2 - obs:", obs.length, obs);
  if (!obs.length) return alert("Aucune observation");
  let phoneId = localStorage.getItem("phone_id");
  if (!phoneId) {
    phoneId = crypto.randomUUID();
    localStorage.setItem("phone_id", phoneId);
  }
  console.log("3 - phoneId:", phoneId);

  // ── Rattachement pilote (une seule fois) ──────────────────
  const pilotId = localStorage.getItem("pilot_id") || DEFAULT_PILOT_ID;
  const alreadyAttached = localStorage.getItem("pilot_attached");
  if (!alreadyAttached && window.supabaseClient) {
    const { error: attachError } = await window.supabaseClient
      .from("pilot_users")
      .upsert({ pilot_id: pilotId, phone_id: phoneId }, { onConflict: 'pilot_id,phone_id' });
    if (!attachError) {
      localStorage.setItem("pilot_attached", "1");
      console.log("Rattachement OK — pilot:", pilotId, "phone:", phoneId);
    } else {
      console.error("Erreur rattachement:", attachError);
    }
  } else if (!alreadyAttached) {
    console.warn("supabaseClient non disponible au moment du rattachement");
  }

  const rows = obs.map(o => {
      let distance = 0;
      if (MODE_DIRECTION_ONLY) {
        distance = 500;
      } else if (o.essais && o.essais.length && o.vitesse) {
        const total = o.essais.reduce((a, b) => a + b, 0);
        const moy = total / o.essais.length;
        distance = moy * o.vitesse / 2;
      }
      return {
        lat: o.lat,
        lon: o.lon,
        direction: o.direction,
        distance: Math.round(distance),
        phone_id: phoneId
      };
    });
  console.log("4 - rows:", rows);
  console.log("5 - supabaseClient:", window.supabaseClient);
  const { error } = await window.supabaseClient
    .from("chrono_frelon_geo")
    .insert(rows);
  console.log("6 - retour insert, error:", error);
  if (error) {
    console.error(error);
    alert("Erreur Supabase");
  } else {
    alert("Envoyé vers la carte partagée ✅");
  }
}



// ==========================
// DEBOUNCE
// ==========================
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
// ==========================
// GESTION BOUTONS BOUSSOLE
// ==========================
// ==========================
// BOUSSOLE : ÉCOUTEURS + RÉABONNEMENT AUTOMATIQUE
// ==========================
// Sur Android notamment, le verrouillage de l'écran ou le passage en
// arrière-plan (fréquent en marchant vers un point d'observation) peut
// couper silencieusement les écouteurs deviceorientation, sans que rien
// ne le signale ni ne s'y réabonne au retour - la boussole "disparaît"
// alors sans raison apparente, y compris après désinstallation/
// réinstallation (le problème n'est pas dans l'installation).
function _attachOrientationListeners() {
  // Attache toujours les deux écouteurs, sans se fier à la détection
  // iOS (typeof requestPermission === "function"), qui n'est pas fiable
  // à 100% - certaines versions de Chrome Android la supportent aussi
  // partiellement, ce qui pouvait faire sauter à tort l'écouteur
  // deviceorientationabsolute dont certains appareils Android ont
  // besoin. Sans risque sur iOS : onOrientation() donne de toute façon
  // la priorité à webkitCompassHeading (la boussole calibrée) dès
  // qu'il est présent, peu importe quel évènement l'a déclenché.
  window.addEventListener("deviceorientationabsolute", onOrientation, true);
  window.addEventListener("deviceorientation", onOrientation, true);
}

function _detachOrientationListeners() {
  window.removeEventListener("deviceorientation", onOrientation, true);
  window.removeEventListener("deviceorientationabsolute", onOrientation, true);
}

let _visibilityRebindAdded = false;
function _ensureVisibilityRebind() {
  if (_visibilityRebindAdded) return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && compassActive) {
      _detachOrientationListeners();
      _attachOrientationListeners();
    }
  });
  _visibilityRebindAdded = true;
}

document.addEventListener("click", async e => {
  const btn = e.target.closest("button");
  if (!btn || !btn.dataset.action) return;

  const action = btn.dataset.action;

  if (action === "enable" && !compassActive) {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted") return;
    }

    lastHeading = null;
    currentHeading = null;

    if (!compassListenersAdded) {
      _attachOrientationListeners();
      compassListenersAdded = true;
    }

    compassActive = true;
    _ensureVisibilityRebind();
  }

  if (action === "save") {
    if (currentHeading === null) return;
    chronos[currentCompassIndex].directions.push(currentHeading);
    updateDirection(currentCompassIndex);
  }

  if (action === "close") {
    compassActive = false;
    lastHeading = null;
    currentHeading = null;

    document.getElementById("compassOverlay")?.remove();
  }
});
// ==========================
// MISE À JOUR DIRECTION
// ==========================
function updateDirection(i) {
  const c = chronos[i];
  c.direction = moyenneCirculaire(c.directions);
  document.getElementById(`dir${i}`).textContent = c.direction + "°";
  saveObservations();
}
// ==========================
// BOUSSOLE : OVERLAY
// ==========================
function openCompass(i) {
  currentCompassIndex = i;
  currentHeading = null;
  lastHeading = null;
  compassActive = false;

  document.getElementById("compassOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "compassOverlay";
  overlay.innerHTML = `
    <div class="compass-box">
      <h2>${t("compass_title")} ${chronos[i].color}</h2>
      <div id="headingValue">---</div>
        <button data-action="enable">
          <span data-i18n="compass_enable"></span>
        </button><br><br>
        
        <button data-action="save">
          <span data-i18n="compass_save"></span>
        </button><br><br>
        
        <button data-action="close">
          <span data-i18n="close"></span>
        </button>
    </div>
  `;
  document.body.appendChild(overlay);
  applyTranslations();
}
// ==========================
// ORIENTATION DU TÉLÉPHONE
// ==========================
function onOrientation(e) {
  if (!compassActive) return;

  let heading = null;

  // webkitCompassHeading (iOS) est toujours prioritaire et fiable :
  // c'est la boussole calibrée au nord magnétique réel.
  if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading)) {
    heading = e.webkitCompassHeading;
  } else if (e.absolute === true && typeof e.alpha === "number") {
    heading = (360 - e.alpha) % 360;
  }

  if (heading === null || isNaN(heading)) return;

  if (lastHeading !== null) {
    let delta = Math.abs(heading - lastHeading);
    if (delta > 180) delta = 360 - delta;
    if (delta > 20) return;
  }

  lastHeading = heading;
  currentHeading = Math.round(heading);

  const el = document.getElementById("headingValue");
  if (el) el.textContent = currentHeading + "°";
}
// ==========================
// DÉTAIL DES ESSAIS / DIRECTIONS
// ==========================
function openDET(i) {
  detIndex = i;
  const c = chronos[i];

  document.getElementById("detOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "detOverlay";
  overlay.className = c.color;

  const myPseudo = localStorage.getItem("my_pseudo");

  overlay.innerHTML = `
    <div class="det-box">
      <h2>${t("detail_title")} ${c.color}</h2>

      ${myPseudo
        ? `<p style="font-size:12px;opacity:0.75;margin:-6px 0 10px">🏷️ Mon pseudo : <b>${myPseudo}</b></p>`
        : `<p style="font-size:12px;opacity:0.75;margin:-6px 0 10px">🏷️ Aucun pseudo défini — touche l'icône étiquette en haut de l'écran</p>`
      }

      <h3>${t("directions")}</h3>

      ${
        c.directions.length
          ? c.directions.map((d, k) => `
              <div class="det-line">
                ${d}°
                <button class="del-dir" data-k="${k}">
                  ${t("delete")}
                </button>
              </div>
            `).join("")
          : `<div class="det-line"><i>${t("no_direction") || "Aucune direction enregistrée"}</i></div>`
      }

      <h3>${t("essais_title")}</h3>

      ${
        c.essais.length
          ? c.essais.map((e, k) => `
              <div class="det-line">
                ${e.toFixed(2)} s → ${Math.round(e * c.vitesse / 2)} m
                <button class="del-essai" data-k="${k}">
                  ${t("delete")}
                </button>
              </div>
            `).join("")
          : `<div class="det-line"><i>${t("no_essai")}</i></div>`
      }

      <br>
      <button id="closeDET">${t("close")}</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // fermeture
  overlay.querySelector("#closeDET").onclick = () => overlay.remove();

  // suppression d’une direction
  overlay.querySelectorAll(".del-dir").forEach(btn => {
    btn.onclick = () => {
      chronos[detIndex].directions.splice(btn.dataset.k, 1);
      updateDirection(detIndex);
      openDET(detIndex);
    };
  });

  // suppression d’un essai chronométré
  overlay.querySelectorAll(".del-essai").forEach(btn => {
    btn.onclick = () => {
      chronos[detIndex].essais.splice(btn.dataset.k, 1);
      updateStats(detIndex);
      openDET(detIndex);
    };
  });
}
function resetDirectionOnly(i) {
  const c = chronos[i];

  c.lat = "--";
  c.lon = "--";
  c.directions = [];
  c.direction = 0;

  document.getElementById(`lat${i}`).textContent = "--";
  document.getElementById(`lon${i}`).textContent = "--";
  document.getElementById(`dir${i}`).textContent = "0°";

  saveObservations();
}
// ==========================
// PARSE ROBUSTE
// ==========================
function parseNombre(val) {
  if (!val) return NaN;

  val = val.replace(",", ".");
  val = val.replace(/[^0-9.\-]/g, "");

  return parseFloat(val);
}

// ==========================
// POPUP SAISIE MANUELLE
// ==========================
window.openManualInput = function () {

  document.getElementById("manualOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "manualOverlay";

  overlay.innerHTML = `
    <div class="manual-box">
      <h2>Saisie manuelle</h2>

      Date : <input id="manTime" type="datetime-local"><br><br>

      Lat : <input id="manLat" type="text"><br><br>
      Lon : <input id="manLon" type="text"><br><br>

      Direction : <input id="manDir" type="text"><br><br>
      Distance (m) : <input id="manDist" type="text"><br><br>

      <button id="manSave">Ajouter</button>
      <button id="manClose">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // ==========================
  // FERMETURE
  // ==========================
  document.getElementById("manClose").onclick = () => overlay.remove();

  // ==========================
  // AJOUT
  // ==========================
  document.getElementById("manSave").onclick = () => {

    const lat = parseNombre(document.getElementById("manLat").value);
    const lon = parseNombre(document.getElementById("manLon").value);
    const dir = parseNombre(document.getElementById("manDir").value);
    const dist = parseNombre(document.getElementById("manDist").value);

    // validation minimale
    if (isNaN(lat) || isNaN(lon) || isNaN(dir)) {
      alert("Données invalides");
      return;
    }

    // validation réaliste
    if (lat < -90 || lat > 90) {
      alert("Latitude invalide");
      return;
    }

    if (lon < -180 || lon > 180) {
      alert("Longitude invalide");
      return;
    }

    if (dir < 0 || dir > 360) {
      alert("Direction invalide");
      return;
    }

    // création observation
    const obs = {
      lat,
      lon,
      direction: dir,
      distance: isNaN(dist) ? 0 : dist,
      essais: [],
      vitesse: 0,
      color: "manual"
    };

    // sauvegarde
    const data = JSON.parse(localStorage.getItem("chronoObservations") || "[]");
    data.push(obs);
    localStorage.setItem("chronoObservations", JSON.stringify(data));

    alert("Point ajouté ✅");

    overlay.remove();
  };
};

// ==========================
// DECLINAISON (POPUP)
// ==========================
let declinaison = 0;

function initDeclinaison() {
  const input = document.getElementById("declinaisonInput");
  if (!input) return;

  const saved = localStorage.getItem("declinaison");

  if (saved !== null) {
    declinaison = parseFloat(saved);
  } else {
    declinaison = 3; // valeur par défaut
  }

  input.value = declinaison.toFixed(1);
}

function setupDeclinaison() {
  const input = document.getElementById("declinaisonInput");
  if (!input) return;

  input.addEventListener("input", () => {
    let val = parseFloat(input.value.replace(",", "."));

    if (isNaN(val)) return;

    if (val > 30) val = 30;
    if (val < -30) val = -30;

    declinaison = val;
    localStorage.setItem("declinaison", declinaison);
  });
}


