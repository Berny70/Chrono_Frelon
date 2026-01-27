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

  if (obs.length > 0) {
    localStorage.setItem("chronoObservations", JSON.stringify(obs));
  }
}

// ==========================
// INITIALISATION UI
// ==========================
document.addEventListener("DOMContentLoaded", () => {
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
  });

  document.getElementById("btnLoc")?.addEventListener("click", openLocationMenu);
});

// ==========================
// GPS
// ==========================
function getPos(i) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      chronos[i].lat = pos.coords.latitude.toFixed(5);
      chronos[i].lon = pos.coords.longitude.toFixed(5);
      document.getElementById(`lat${i}`).textContent = chronos[i].lat;
      document.getElementById(`lon${i}`).textContent = chronos[i].lon;
      saveObservations();
    },
    () => alert("Erreur GPS"),
    { enableHighAccuracy: true }
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
    alert("Envoyé ✔️");
  }
}

// ==========================
// === CARTE PARTAGÉE =======
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

// ==========================
// CHARGEMENT FLUIDE
// ==========================
async function loadVisiblePoints(map, markers) {
  const b = map.getBounds();

  const { data, error } = await window.supabaseClient
    .from("chrono_frelon_geo")
    .select("id, lat, lon, direction, distance")
    .gte("lat", b.getSouth())
    .lte("lat", b.getNorth())
    .gte("lon", b.getWest())
    .lte("lon", b.getEast())
    .limit(1000);

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
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), delay);
  };
}
