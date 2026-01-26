// ==========================
// DONNÉES
// ==========================
const observations = JSON.parse(
  localStorage.getItem("chronoObservations") || "[]"
);

// ==========================
// INITIALISATION CARTE
// ==========================
const map = L.map("map");

// Fond de carte
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// ==========================
// GESTION ZOOM / CENTRAGE
// ==========================
const points = observations
  .filter(o => o.lat && o.lon)
  .map(o => [o.lat, o.lon]);

const savedView = localStorage.getItem("mapView");

if (savedView) {
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

// Sauvegarde du zoom utilisateur
map.on("moveend", () => {
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
// MESSAGE SI AUCUNE DONNÉE
// ==========================
if (observations.length === 0) {
  alert(
    t("map_no_data_title") + "\n\n" +
    "• " + t("map_no_data_1") + "\n" +
    "• " + t("map_no_data_2")
  );
}

// ==========================
// AFFICHAGE POINTS + VECTEURS
// ==========================
observations.forEach(obs => {
  if (
    obs.lat == null ||
    obs.lon == null ||
    obs.distance == null ||
    obs.direction == null
  ) return;

  const start = [obs.lat, obs.lon];

  // Point d’observation
  const marker = L.circleMarker(start, {
    radius: 6,
    color: obs.color,
    fillColor: obs.color,
    fillOpacity: 1
  }).addTo(map);

  marker.bindPopup(
    `<b>${t("map_station")} ${obs.color}</b><br>
     ${t("map_distance")}: ${obs.distance} m<br>
     ${t("map_direction")}: ${obs.direction}°`
  );

  // Calcul du point d’arrivée
  const dest = destinationPoint(
    obs.lat,
    obs.lon,
    obs.direction,
    obs.distance
  );

  // Vecteur directionnel
  L.polyline([start, [dest.lat, dest.lon]], {
    color: obs.color,
    weight: 3
  }).addTo(map);
});

// ==========================
// FONCTION GÉO
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
