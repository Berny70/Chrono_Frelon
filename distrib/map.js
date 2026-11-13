// ==========================
// MODE (LOCAL / PARTAGÉ)
// ==========================
const mapSearchParams = new URLSearchParams(window.location.search);
const MODE_SHARED = mapSearchParams.get("mode") === "shared";

const _savedDecl = localStorage.getItem("declinaison");
let declinaison = _savedDecl !== null ? (parseFloat(_savedDecl) || 3) : 3;

// ==========================
// DONNÉES
// ==========================
let observations = [];
let nestsVisible = false; // masqué par défaut, cohérent avec ChassNid Admin / VigieNid
let guessActive = false;
let guessMarker = null;
let ignRouteLayer = null;
let measureActive = false;
let measurePoints = [];
let measureLayers = [];
let measureTooltip = null;
let suggestLayers = [];
let drawnObs = [];   // relevés affichés, pour « Suggérer le 2e relevé »

// Pendant "Point supposé", les points/fuseaux ne doivent plus intercepter
// le clic (sinon impossible de cliquer pile à leur intersection, qui est
// justement l'endroit recherché) — même principe que ChassNid Admin.
(function() {
  const style = document.createElement('style');
  style.textContent =
    '.leaflet-container.tool-active .leaflet-interactive { pointer-events: none !important; }' +
    '.leaflet-container.tool-active .leaflet-marker-icon.guess-marker,' +
    '.leaflet-container.tool-active .leaflet-marker-icon.guess-marker * { pointer-events: auto !important; }';
  document.head.appendChild(style);
})();

// ==========================
// INITIALISATION CARTE
// ==========================
const map = L.map("map").setView([46.5, 2.5], 6);
const observationsLayer = L.layerGroup().addTo(map);

// ── FONDS DE CARTE (alignés sur ChassNid Admin) ────────────
const BASEMAPS = {
  osm:       { label: '🗺 Standard',  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                          opts: { attribution: '© OpenStreetMap', maxZoom: 19 } },
  topo:      { label: '🏔 Topo',      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                            opts: { attribution: '© OpenTopoMap',   maxZoom: 17 } },
  relief:    { label: '🌄 Relief',    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',          opts: { attribution: '© Esri',          maxZoom: 13 } },
  satellite: { label: '🛰 Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                opts: { attribution: '© Esri',          maxZoom: 19 } },
};

let currentBasemapLayer = null;

function applyBasemap(key) {
  const bm = BASEMAPS[key] || BASEMAPS.osm;
  if (currentBasemapLayer) map.removeLayer(currentBasemapLayer);
  currentBasemapLayer = L.tileLayer(bm.url, bm.opts).addTo(map);
  localStorage.setItem('chassnid_basemap', key);
  document.querySelectorAll('.basemap-btn').forEach(btn => {
    btn.classList.toggle('basemap-btn--active', btn.dataset.basemap === key);
  });
}

function addBasemapControl() {
  const ctrl = L.control({ position: 'bottomright' });
  ctrl.onAdd = () => {
    const div = L.DomUtil.create('div', 'basemap-control');
    div.innerHTML =
      `<button id="btn-toggle-nests-cf" style="
        width:100%;margin-bottom:6px;padding:6px 10px;
        background:#fff;color:#333;
        border:1px solid rgba(0,0,0,0.15);border-radius:8px;
        font-family:'DM Sans',sans-serif;font-size:13px;
        font-weight:600;cursor:pointer;text-align:left">
        🪺 Nids ${nestsVisible ? 'visibles' : 'masqués'}
      </button>` +
      `<button id="btn-toggle-measure-cf" style="
        width:100%;margin-bottom:6px;padding:6px 10px;
        background:#fff;color:#333;
        border:1px solid rgba(0,0,0,0.15);border-radius:8px;
        font-family:'DM Sans',sans-serif;font-size:13px;
        font-weight:600;cursor:pointer;text-align:left">
        📏 Mesurer
      </button>` +
      `<button id="btn-toggle-guess-cf" style="
        width:100%;margin-bottom:6px;padding:6px 10px;
        background:#fff;color:#333;
        border:1px solid rgba(0,0,0,0.15);border-radius:8px;
        font-family:'DM Sans',sans-serif;font-size:13px;
        font-weight:600;cursor:pointer;text-align:left">
        📍 Point supposé
      </button>` +
      Object.entries(BASEMAPS).map(([key, bm]) =>
      `<button class="basemap-btn${key === (localStorage.getItem('chassnid_basemap') || 'osm') ? ' basemap-btn--active' : ''}" data-basemap="${key}">${bm.label}</button>`
    ).join('');
    L.DomEvent.disableClickPropagation(div);
    div.addEventListener('click', e => {
      const btn = e.target.closest('.basemap-btn');
      if (btn) applyBasemap(btn.dataset.basemap);
      if (e.target.closest('#btn-toggle-nests-cf')) toggleNestsVisibility();
      if (e.target.closest('#btn-toggle-measure-cf')) toggleMeasure();
      if (e.target.closest('#btn-toggle-guess-cf')) toggleGuess();
    });
    return div;
  };
  ctrl.addTo(map);
}

function toggleNestsVisibility() {
  nestsVisible = !nestsVisible;
  const btn = document.getElementById('btn-toggle-nests-cf');
  if (btn) btn.textContent = `🪺 Nids ${nestsVisible ? 'visibles' : 'masqués'}`;
  if (nestsVisible) nestsLayer.addTo(map);
  else map.removeLayer(nestsLayer);
}

// ── OUTIL DE MESURE DE DISTANCE (aligné sur ChassNid Admin) ────
// Clic = pose un point ; déplacement = distance en direct depuis le
// dernier point ; nouveaux clics = mesure cumulée sur plusieurs segments.
function toggleMeasure() {
  if (!measureActive && guessActive) toggleGuess(); // modes exclusifs
  measureActive = !measureActive;
  const btn = document.getElementById('btn-toggle-measure-cf');

  if (measureActive) {
    if (btn) { btn.style.background = '#1e88e5'; btn.style.color = '#fff'; }
    map.on('click', onMeasureClick);
    map.on('mousemove', onMeasureMouseMove);
    map.getContainer().style.cursor = 'crosshair';
    map.getContainer().classList.add('tool-active');
  } else {
    if (btn) { btn.style.background = '#fff'; btn.style.color = '#333'; }
    map.off('click', onMeasureClick);
    map.off('mousemove', onMeasureMouseMove);
    map.getContainer().style.cursor = '';
    map.getContainer().classList.remove('tool-active');
    clearMeasure();
  }
}

function clearMeasure() {
  measurePoints = [];
  measureLayers.forEach(l => map.removeLayer(l));
  measureLayers = [];
  if (measureTooltip) { map.removeLayer(measureTooltip); measureTooltip = null; }
}

function formatDistance(meters) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(2)} km`;
}

function onMeasureClick(e) {
  const marker = L.circleMarker(e.latlng, { radius: 5, color: '#1e88e5', fillColor: '#1e88e5', fillOpacity: 1 }).addTo(map);
  measureLayers.push(marker);
  if (measurePoints.length > 0) {
    const line = L.polyline([measurePoints[measurePoints.length - 1], e.latlng], { color: '#1e88e5', weight: 3, dashArray: '6 4' }).addTo(map);
    measureLayers.push(line);
  }
  measurePoints.push(e.latlng);
}

function onMeasureMouseMove(e) {
  if (measurePoints.length === 0) return;
  const last  = measurePoints[measurePoints.length - 1];
  const total = measurePoints.reduce((sum, p, i) =>
    i === 0 ? 0 : sum + map.distance(measurePoints[i - 1], p), 0
  ) + map.distance(last, e.latlng);

  if (!measureTooltip) {
    measureTooltip = L.tooltip({ permanent: true, direction: 'right', offset: [10, 0] })
      .setLatLng(e.latlng).setContent(formatDistance(total)).addTo(map);
  } else {
    measureTooltip.setLatLng(e.latlng).setContent(formatDistance(total));
  }
}

// ── SUGGÉRER LE 2e RELEVÉ (aligné sur ChassNid Admin) ──────────
// À partir d'un seul relevé : secteur ±25° et deux postes A/B (gauche /
// droite) d'où viser pour couper la 1re direction à ~90°. Suggestion
// indicative, aucun enregistrement.
function mapToast(msg) {
  let el = document.getElementById('map-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'map-toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:3000;' +
      'background:rgba(30,30,30,.92);color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;' +
      'max-width:80vw;text-align:center;display:none';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function clearSuggest() {
  suggestLayers.forEach(l => map.removeLayer(l));
  suggestLayers = [];
}

function fetchWalk(fromLat, fromLng, toLat, toLng) {
  const url = `https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&start=${fromLng},${fromLat}&end=${toLng},${toLat}&profile=pedestrian&optimization=fastest&geometryFormat=geojson&distanceUnit=meter&timeUnit=second`;
  return fetch(url)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(d => ({ m: d.distance, sec: d.duration }))
    .catch(() => null);
}

function mapSuggestSecond(idx) {
  const o = drawnObs[idx];
  if (!o) return;
  map.closePopup();
  clearSuggest();

  const bearing = o.direction;
  const D = Math.min(Math.max(o.distance || 800, 400), 3000);
  const dp = (lat, lon, b, d) => { const r = destinationPoint(lat, lon, b, d); return [r.lat, r.lon]; };
  const target = dp(o.lat, o.lon, bearing, 0.6 * D);
  const off = Math.min(Math.max(0.5 * D, 250), 800);
  const cands = [
    { label: 'A (gauche)', pt: dp(target[0], target[1], bearing - 90, off) },
    { label: 'B (droite)', pt: dp(target[0], target[1], bearing + 90, off) },
  ];

  const sector = L.polygon(buildFuseau(o.lat, o.lon, bearing, D, 25), {
    color: '#1565c0', weight: 1.5, dashArray: '6 4', fillColor: '#1565c0', fillOpacity: 0.10,
  }).addTo(map);
  suggestLayers.push(sector);

  cands.forEach(c => {
    const m = L.marker(c.pt, {
      icon: L.divIcon({
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
        html: `<div style="width:26px;height:26px;border-radius:50%;background:#1565c0;color:#fff;border:2px solid #fff;` +
              `box-shadow:0 1px 4px rgba(0,0,0,.4);font:700 13px sans-serif;display:flex;align-items:center;justify-content:center">${c.label[0]}</div>`,
      }),
    }).addTo(map);
    suggestLayers.push(m);
    const body = (txt) => `<div style="font-size:12px;min-width:170px">` +
      `<b>Poste ${c.label}</b><br>Viser vers le secteur bleu : le 2e relevé coupera le 1er à ~90°.<br>` +
      `<span style="color:#555">${txt}</span><br>` +
      `<span style="color:#999;font-size:11px">Suggestion indicative (1 seul relevé : direction ±25°).</span></div>`;
    m.bindPopup(body('⏳ Calcul du temps de marche…'), { maxWidth: 240 });
    fetchWalk(o.lat, o.lon, c.pt[0], c.pt[1]).then(w => {
      m.setPopupContent(body(w
        ? `🚶 ${(w.m / 1000).toFixed(1)} km · ~${Math.round(w.sec / 60)} min à pied depuis le 1er relevé`
        : 'Temps de marche indisponible'));
    });
  });

  map.fitBounds(sector.getBounds().extend(cands[0].pt).extend(cands[1].pt), { padding: [40, 40] });
  mapToast('Postes A et B suggérés — touchez un poste pour le temps de marche.');
}

// ── POINT SUPPOSÉ (nid non confirmé) ───────────────────────────
// Outil ponctuel, rien n'est enregistré en base : place un repère,
// affiche ses coordonnées et un lien direct vers Google Maps pour s'y
// rendre sur le terrain — même principe que ChassNid Admin.
function toggleGuess() {
  if (!guessActive && measureActive) toggleMeasure(); // modes exclusifs
  guessActive = !guessActive;
  const btn = document.getElementById('btn-toggle-guess-cf');

  if (guessActive) {
    if (btn) { btn.style.background = '#e53935'; btn.style.color = '#fff'; }
    map.on('click', onGuessClick);
    map.getContainer().style.cursor = 'crosshair';
    map.getContainer().classList.add('tool-active');
  } else {
    if (btn) { btn.style.background = '#fff'; btn.style.color = '#333'; }
    map.off('click', onGuessClick);
    map.getContainer().style.cursor = '';
    map.getContainer().classList.remove('tool-active');
    if (guessMarker) { map.removeLayer(guessMarker); guessMarker = null; }
    if (ignRouteLayer) { map.removeLayer(ignRouteLayer); ignRouteLayer = null; }
  }
}

function onGuessClick(e) {
  const { lat, lng } = e.latlng;
  const latStr = lat.toFixed(5);
  const lngStr = lng.toFixed(5);
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latStr},${lngStr}`;
  // Géoportail IGN : cartes officielles françaises, bien plus précises
  // que Google Maps en zone rurale/forestière (parcelles, relief, sentiers).
  const ignUrl = `https://www.geoportail.gouv.fr/carte?c=${lngStr},${latStr}&z=19&l0=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;

  if (guessMarker) map.removeLayer(guessMarker);
  if (ignRouteLayer) { map.removeLayer(ignRouteLayer); ignRouteLayer = null; }

  guessMarker = L.marker(e.latlng, {
    icon: L.divIcon({
      className: 'guess-marker',
      html: '<div style="font-size:28px;line-height:1;transform:translate(-50%,-100%)">📍</div>',
      iconSize: [0, 0],
    })
  }).addTo(map);

  guessMarker.bindPopup(`
    <div style="font-size:13px;line-height:1.6">
      <b>📍 Point supposé</b><br>
      ${latStr}, ${lngStr}<br>
      <a href="${ignUrl}" target="_blank" rel="noopener"
         style="display:inline-block;margin-top:6px;padding:6px 10px;background:#2d6a2d;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
        🗺️ Ouvrir sur Géoportail (IGN)
      </a><br>
      <a href="${gmapsUrl}" target="_blank" rel="noopener"
         style="display:inline-block;margin-top:6px;padding:6px 10px;background:#1e88e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
        🧭 Ouvrir dans Google Maps
      </a><br>
      <button class="ign-route-btn" data-lat="${latStr}" data-lng="${lngStr}"
         style="display:block;width:100%;margin-top:6px;padding:6px 10px;background:#e65100;color:#fff;border:none;border-radius:6px;font-weight:600;font-family:inherit;font-size:13px;cursor:pointer">
        🚗 Itinéraire IGN depuis ma position
      </button>
      <div class="ign-route-result" style="font-size:12px;color:#555;margin-top:4px"></div>
    </div>
  `, { maxWidth: 240 }).openPopup();
}

// ── ITINÉRAIRE IGN (Géoplateforme) depuis la position actuelle ──
// Calcule un itinéraire routier via l'API publique data.geopf.fr et le
// dessine directement sur la carte (aucun lien externe à ouvrir).
function fetchIgnRoute(destLat, destLng, cb) {
  if (!navigator.geolocation) { cb(null, "Géolocalisation indisponible sur cet appareil"); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const startLat = pos.coords.latitude;
      const startLng = pos.coords.longitude;
      const url = `https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&start=${startLng},${startLat}&end=${destLng},${destLat}&profile=pedestrian&optimization=fastest&geometryFormat=geojson`;
      fetch(url)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => cb(data, null))
        .catch(() => cb(null, "Service d'itinéraire IGN indisponible pour le moment"));
    },
    () => cb(null, "Position actuelle indisponible (GPS refusé ou hors de portée)"),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.ign-route-btn');
  if (!btn) return;
  const destLat = parseFloat(btn.dataset.lat);
  const destLng = parseFloat(btn.dataset.lng);
  const resultEl = btn.parentElement ? btn.parentElement.querySelector('.ign-route-result') : null;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Calcul en cours…';
  fetchIgnRoute(destLat, destLng, (data, err) => {
    btn.disabled = false;
    btn.textContent = originalText;
    if (err || !data || !data.geometry || !data.geometry.coordinates) {
      if (resultEl) resultEl.textContent = '⚠️ ' + (err || "Itinéraire indisponible");
      return;
    }
    if (ignRouteLayer) map.removeLayer(ignRouteLayer);
    const latlngs = data.geometry.coordinates.map(c => [c[1], c[0]]);
    ignRouteLayer = L.polyline(latlngs, { color: '#e65100', weight: 5, opacity: 0.85 }).addTo(map);
    map.fitBounds(ignRouteLayer.getBounds(), { padding: [30, 30] });
    const distKm = (data.distance / 1000).toFixed(1);
    const durMin = Math.round(data.duration / 60);
    if (resultEl) resultEl.textContent = `✅ ${distKm} km · ~${durMin} min à pied`;
  });
});

applyBasemap(localStorage.getItem('chassnid_basemap') || 'osm');
addBasemapControl();
L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

// ==========================
// MODE LOCAL
// ==========================
if (!MODE_SHARED) {
  observations = JSON.parse(
    localStorage.getItem("chronoObservations") || "[]"
  );

  // 🔧 NORMALISATION (OPTION B compatible)
  observations = observations.map(o => {
    if (o.distance == null) {
      o.distance = 0; // distance inconnue → hypothèse
    }
    return o;
  });

  if (!observations.length) {
    alert(
      t("map_no_data_title") + "\n\n" +
      "• " + t("map_no_data_1") + "\n" +
      "• " + t("map_no_data_2")
    );
    map.setView([46.5, 2.5], 6);
  } else {
    centrerCarte(observations);
    afficherObservations();
  }
}

// ==========================
// MODE PARTAGÉ
// ==========================
// (lancement en fin de fichier)

// ==========================
// SAUVEGARDE ZOOM LOCAL
// ==========================
map.on("moveend", () => {
  if (MODE_SHARED) return;

  const center = map.getCenter();
  const zoom = map.getZoom();

  localStorage.setItem(
    "mapView",
    JSON.stringify({
      center: [center.lat, center.lng],
      zoom
    })
  );
});

// ==========================
// AFFICHAGE OBSERVATIONS
// ==========================
function afficherObservations() {
  drawnObs = [];
  clearSuggest();

  observations.forEach(obs => {

    if (
      obs.lat == null ||
      obs.lon == null ||
      obs.direction == null
    ) return;

    const start = [obs.lat, obs.lon];

    // couleur (manuel = noir)
    const color = obs.color === "manual"
      ? "black"
      : (obs.color || "red");

    // ==========================
    // DISTANCE (manuel OU calcul)
    // ==========================
    let distance = obs.distance || 0;

    if (
      distance === 0 &&
      obs.essais &&
      obs.essais.length &&
      obs.vitesse
    ) {
      const total = obs.essais.reduce((a, b) => a + b, 0);
      const moy = total / obs.essais.length;
      distance = moy * obs.vitesse / 2;
    }

    // ==========================
    // DIRECTION AVEC DECLINAISON
    // ==========================
    let direction = obs.direction + declinaison;

    if (direction < 0) direction += 360;
    if (direction >= 360) direction -= 360;

    // ==========================
    // POINT
    // ==========================
    const marker = L.circleMarker(start, {
      radius: 6,
      color,
      fillColor: color,
      fillOpacity: 1
    }).addTo(observationsLayer);

    // ==========================
    // POPUP (partagée par le point ET le fuseau)
    // ==========================
    const dateStr = obs.created_at ? new Date(obs.created_at).toLocaleString('fr-FR') : null;
    const isMine    = obs.phone_id === localStorage.getItem('phone_id');
    const pseudoStr = isMine
      ? '👤 Moi'
      : (obs.pseudo ? `🏷️ ${obs.pseudo}` : `📱 ${(obs.phone_id||'').substring(0,8)}…`);
    const popupHtml =
      `<b>${t("map_station")}</b><br>
       ${pseudoStr}<br>
       ${dateStr ? `📅 ${dateStr}<br>` : ''}
       ${t("map_distance")}: ${Math.round(distance)} m<br>
       ${t("map_direction")}: ${Math.round(direction)}°<br>
       <button onclick="mapSuggestSecond(${drawnObs.length})" style="width:100%;margin-top:6px;padding:6px;background:#1565c0;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">🎯 Suggérer le 2e relevé</button>`;
    drawnObs.push({ lat: obs.lat, lon: obs.lon, direction, distance });

    marker.bindPopup(popupHtml);

    // ==========================
    // FUSEAU DIRECTIONNEL (±5°)
    // ==========================
    const fuseauLength = distance === 0 ? 1500 : distance;
    const fuseauPoints = buildFuseau(obs.lat, obs.lon, direction, fuseauLength, 5);

    L.polygon(fuseauPoints, {
      color,
      weight:      1.5,
      opacity:     0.8,
      fillColor:   color,
      fillOpacity: 0.22,
      dashArray:   distance === 0 ? "6 6" : null,
    }).bindPopup(popupHtml).addTo(observationsLayer);

  }); // ✅ FIN DU forEach
}     // ✅ FIN DE afficherObservations
// ==========================
// CENTRAGE CARTE
// ==========================
function centrerCarte(data) {
  const points = data
    .filter(o => o.lat && o.lon)
    .map(o => [o.lat, o.lon]);

  const savedView = localStorage.getItem("mapView");

  if (!MODE_SHARED && savedView) {
    const { center, zoom } = JSON.parse(savedView);
    map.setView(center, zoom);

  } else if (points.length === 1) {
    map.setView(points[0], 16);

  } else if (points.length > 1) {
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30] });

  } else {
    map.setView([46.5, 2.5], 6);
  }
}

// ==========================
// SUPABASE – RPC
// ==========================
async function chargerDonneesAutour(lat, lon) {
  const { data, error } = await window.supabaseClient.rpc(
    "get_nearby_frelons",
    {
      lat,
      lon,
      radius_m: 10000
    }
  );

  if (error) {
    console.error("Erreur RPC Supabase :", error);
    return [];
  }

  return data || [];
}

// ==========================
// MODE PARTAGÉ : CHARGEMENT
// ==========================
let positionMarker = null;
let gpsDone = false;
let gpsFallbackShown = false;
let gpsWatchdog = null;

async function afficherAutourDe(lat, lon, isLive) {
  // La carte s'ouvre sur l'endroit où se trouve le téléphone (pas sur toute l'Europe)
  map.setView([lat, lon], 12);
  if (positionMarker) map.removeLayer(positionMarker);
  positionMarker = L.circleMarker([lat, lon], {
    radius: 8, color: '#fff', weight: 2, fillColor: '#1e88e5', fillOpacity: 1,
  }).addTo(map).bindPopup(isLive ? '📍 Vous êtes ici' : '📍 Dernière position connue');

  observations = await chargerDonneesAutour(lat, lon);
  observations = observations.map(o => {
    if (o.distance == null) o.distance = 0;
    return o;
  });

  if (!observations.length) {
    alert(
      t("map_no_shared_data") ||
      "Aucune donnée partagée dans un rayon de 10 km"
    );
    return;
  }

  if (typeof observationsLayer !== "undefined" && observationsLayer.clearLayers) observationsLayer.clearLayers();
  afficherObservations();
  chargerEtAfficherNids(lat, lon);
}

function gpsEchec() {
  if (gpsDone) return;
  clearTimeout(gpsWatchdog);
  let last = null;
  try {
    const p = JSON.parse(localStorage.getItem("lastGpsPos"));
    if (p && isFinite(p.lat) && isFinite(p.lon)) last = p;
  } catch (e) {}
  if (last && !gpsFallbackShown) {
    gpsFallbackShown = true;
    alert((t("gps_error") || "GPS indisponible") + " — affichage autour de la dernière position connue.");
    afficherAutourDe(last.lat, last.lon, false);
  } else if (!last) {
    alert(t("gps_error") || "GPS indisponible");
    map.setView([46.5, 2.5], 6);
  }
}

async function chargerObservationsPartagees() {
  // Ouverture immédiate sur la dernière position connue, en attendant le GPS
  try {
    const p = JSON.parse(localStorage.getItem("lastGpsPos"));
    if (p && isFinite(p.lat) && isFinite(p.lon)) map.setView([p.lat, p.lon], 12);
  } catch (e) {}

  // Garde-fou : certains navigateurs ne répondent jamais (ni succès ni erreur)
  gpsWatchdog = setTimeout(gpsEchec, 12000);
  if (!navigator.geolocation) { gpsEchec(); return; }

  navigator.geolocation.getCurrentPosition(
    pos => {
      if (gpsDone) return;
      gpsDone = true;
      clearTimeout(gpsWatchdog);
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      try { localStorage.setItem("lastGpsPos", JSON.stringify({ lat, lon })); } catch (e) {}
      afficherAutourDe(lat, lon, true);
    },
    gpsEchec,
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
  );
}

// ==========================
// CONSTRUCTION DU FUSEAU (secteur angulaire ±5°)
// ==========================
function buildFuseau(lat, lon, bearing, lengthM, halfAngleDeg) {
  const steps  = 8;
  const points = [[lat, lon]];

  for (let i = 0; i <= steps; i++) {
    const a   = bearing - halfAngleDeg + (2 * halfAngleDeg * i / steps);
    const dst = destinationPoint(lat, lon, a, lengthM);
    points.push([dst.lat, dst.lon]);
  }

  points.push([lat, lon]);
  return points;
}

// ==========================
// GÉOMÉTRIE : POINT DESTINATION
// ==========================
function destinationPoint(lat, lon, bearing, distance) {
  const R = 6371000;
  const δ = distance / R;
  const θ = bearing * Math.PI / 180;

  const φ1 = lat * Math.PI / 180;
  const λ1 = lon * Math.PI / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: φ2 * 180 / Math.PI,
    lon: λ2 * 180 / Math.PI
  };
}

// ==========================
// BOUTON RETOUR
// ==========================
document.getElementById("btnBackMap")?.addEventListener("click", () => {
  location.href = "index.html";
});
// ==========================
// DECLINAISON SIMPLE
// ==========================
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

// modification
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

    observationsLayer.clearLayers();
    afficherObservations();
  });
}

// init
document.addEventListener("DOMContentLoaded", () => {
  initDeclinaison();
  setupDeclinaison();
});

// ==========================
// NIDS TROUVÉS
// ==========================

const nestsLayer = L.layerGroup(); // ajoutée/retirée selon nestsVisible

// Couleurs des reines d'abeilles par année — code international
// 1/6=Blanc, 2/7=Jaune, 3/8=Rouge, 4/9=Vert, 5/0=Bleu (comme ChassNid Admin)
function getQueenColor(annee) {
  const y = parseInt(annee) || new Date().getFullYear();
  const d = y % 10;
  if (d === 1 || d === 6) return { bg: '#f5f5f5', border: '#9e9e9e', label: 'Blanc' };
  if (d === 2 || d === 7) return { bg: '#FFD700', border: '#b8a000', label: 'Jaune' };
  if (d === 3 || d === 8) return { bg: '#e53935', border: '#8b0000', label: 'Rouge' };
  if (d === 4 || d === 9) return { bg: '#43a047', border: '#1b5e20', label: 'Vert'  };
  return { bg: '#1e88e5', border: '#0d47a1', label: 'Bleu' };
}

function getNestIcon(annee, type) {
  const c = getQueenColor(annee);
  const prim = type === 'primaire';
  return L.divIcon({
    html: `<div style="width:24px;height:24px;border:2px solid ${prim ? '#e07b00' : c.border};border-radius:50%;` +
          `background:${prim ? '#fff3e0' : c.bg};box-shadow:0 2px 5px rgba(0,0,0,0.4);` +
          `display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1">🪺</div>`,
    className: 'nest-div-icon',
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
    popupAnchor:[0, -14],
  });
}

async function chargerEtAfficherNids(lat, lon) {
  nestsLayer.clearLayers();

  const { data, error } = await window.supabaseClient
    .from('nests')
    .select('*')
    .order('found_at', { ascending: false });

  if (error || !data) return;

  data.forEach(n => {
    const year   = n.found_at ? new Date(n.found_at).getFullYear() : (parseInt(n.annee, 10) || new Date().getFullYear());
    const marker = L.marker([n.lat, n.lon], { icon: getNestIcon(year, n.type) }).addTo(nestsLayer);
    const date   = n.found_at ? new Date(n.found_at).toLocaleDateString('fr-FR') : '—';
    const pilote = n.pilot_nom || n.declarant || '—';
    const c      = getQueenColor(year);
    const taille = n.taille ? `<div>📏 ${n.taille}</div>` : '';
    const mapsUrl = `https://www.google.com/maps?q=${n.lat.toFixed(5)},${n.lon.toFixed(5)}`;
    marker.bindPopup(
      `<div style="font-family:sans-serif;font-size:13px">
        <div style="font-weight:700;color:#7b3f00;margin-bottom:4px">🪺 Nid trouvé ${year}
          <span style="display:inline-block;width:10px;height:10px;background:${c.bg};border:2px solid ${c.border};border-radius:50%;vertical-align:middle" title="${c.label}"></span></div>
        <div>📅 ${date}</div>
        <div>👤 ${pilote}</div>
        ${taille}
        <a href="${mapsUrl}" target="_blank" rel="noopener" style="display:block;margin-top:4px;font-family:monospace;font-size:11px;color:#2563eb;text-decoration:none">📍 ${n.lat.toFixed(5)}, ${n.lon.toFixed(5)}</a>
      </div>`, { maxWidth: 220 }
    );
  });
}

// ==========================
// LANCEMENT MODE PARTAGÉ (en dernier : toutes les déclarations sont faites)
// ==========================
if (MODE_SHARED) {
  chargerObservationsPartagees();
}
