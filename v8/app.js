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
      !c.essais.length ||
      c.direction == null
    ) return null;

    const total = c.essais.reduce((a, b) => a + b, 0);
    const moy = total / c.essais.length;

    return {
      lat: parseFloat(c.lat),
      lon: parseFloat(c.lon),
      direction: c.direction,
      distance: Math.round(moy * c.vitesse),
      color: c.color
    };
  }).filter(Boolean);

  if (obs.length) {
    localStorage.setItem("chronoObservations", JSON.stringify(obs));
  }
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
        <button class="start">${t("start")}</button>
        <span class="time" id="t${i}">0.00 s</span>
        <button class="reset">${t("reset")}</button>
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
        <button class="pos">${t("position")}</button>
        <button class="compass">${t("compass")}</button>
        <button class="det">${t("detail")}</button>
      </div>
    `;

    container.appendChild(div);

    div.querySelector(".start").onclick = () => startStop(i);
    div.querySelector(".reset").onclick = () => resetChrono(i);
    div.querySelector(".pos").onclick = () => getPos(i);
    div.querySelector(".det").onclick = () => openDET(i);
    div.querySelector(".compass").onclick = () => openCompass(i);

    div.querySelector(`#vit${i}`).oninput = e => {
      c.vitesse = +e.target.value;
      updateStats(i);
    };
  });

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
  const dist = moy * c.vitesse;

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
      <button data-action="local">🗺️ Carte locale</button>
      <button data-action="send">📤 Envoyer</button>
      <button data-action="shared">🌍 Carte partagée</button>
      <button data-action="close">${t("close")}</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.onclick = e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.dataset.action === "local") location.href = "map.html";
    if (btn.dataset.action === "shared") location.href = "map.html?mode=shared";
    if (btn.dataset.action === "send") envoyerVersCartePartagee();
    if (btn.dataset.action === "close") overlay.remove();
  };
}

// ==========================
// ENVOI SUPABASE
// ==========================
async function envoyerVersCartePartagee() {
  const obs = JSON.parse(localStorage.getItem("chronoObservations") || "[]");
  if (!obs.length) return alert("Aucune observation");

  let phoneId = localStorage.getItem("phone_id");
  if (!phoneId) {
    phoneId = crypto.randomUUID();
    localStorage.setItem("phone_id", phoneId);
  }

  const rows = obs.map(o => ({
    lat: o.lat,
    lon: o.lon,
    direction: o.direction,
    distance: o.distance,
    phone_id: phoneId
  }));

  const { error } = await window.supabaseClient
    .from("chrono_frelon_geo")
    .insert(rows);

  if (error) {
    console.error(error);
    alert("Erreur Supabase");
  } else {
    alert("Envoyé vers la carte partagée ✅");
  }
}

// ==========================
// CARTE PARTAGÉE (ISOLÉE)
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  const map = L.map("map").setView([46.5, 2.5], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(map);

  const markers = L.markerClusterGroup();
  map.addLayer(markers);

  map.on("moveend", debounce(() => loadVisiblePoints(map, markers), 300));
  loadVisiblePoints(map, markers);
});

async function loadVisiblePoints(map, markers) {
  const b = map.getBounds();

  let query = window.supabaseClient
    .from("chrono_frelon_geo")
    .select("id, lat, lon, direction, distance")
    .gte("lat", b.getSouth())
    .lte("lat", b.getNorth())
    .gte("lon", b.getWest())
    .lte("lon", b.getEast())
    .limit(1000);

  const params = new URLSearchParams(location.search);
  if (params.get("mode") !== "shared") {
    const phoneId = localStorage.getItem("phone_id");
    if (phoneId) query = query.eq("phone_id", phoneId);
  }

  const { data, error } = await query;
  if (error) return console.error(error);

  markers.clearLayers();

  data.forEach(p => {
    const m = L.circleMarker([p.lat, p.lon], { radius: 6 });
    m.bindPopup(`🧭 ${p.direction}°<br>📏 ${p.distance} m`);
    markers.addLayer(m);
  });
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

    window.addEventListener("deviceorientationabsolute", onOrientation, true);
    window.addEventListener("deviceorientation", onOrientation, true);

    compassActive = true;
  }

  if (action === "save") {
    if (currentHeading === null) return;
    chronos[currentCompassIndex].directions.push(currentHeading);
    updateDirection(currentCompassIndex);
  }

  if (action === "close") {
    window.removeEventListener("deviceorientation", onOrientation, true);
    window.removeEventListener("deviceorientationabsolute", onOrientation, true);

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


