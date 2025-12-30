// ==========================
// INITIALISATION CARTE
// ==========================
const map = L.map("map").setView([46.5, 2.5], 6); // France par défaut

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// ==========================
// DONNÉES (mock pour l'instant)
// ==========================
const observations = JSON.parse(
  localStorage.getItem("capturesChrono") || "[]"
);

// Si aucune capture, message simple
if (observations.length === 0) {
  alert("Aucune capture disponible.\nUtilise 'Capture d’écran' avant.");
}

// ==========================
// AFFICHAGE POINTS + VECTEURS
// ==========================
observations.forEach(obs => {
  if (!obs.lat || !obs.lon || !obs.distance || !obs.direction) return;

  const start = [obs.lat, obs.lon];

  // Marqueur point d’observation
  const marker = L.circleMarker(start, {
    radius: 6,
    color: obs.color,
    fillColor: obs.color,
    fillOpacity: 1
  }).addTo(map);

  marker.bindPopup(
    `<b>${obs.color}</b><br>
     Dist: ${obs.distance} m<br>
     Dir: ${obs.direction}°`
  );

  // Calcul du point d’arrivée du vecteur
  const dest = destinationPoint(
    obs.lat,
    obs.lon,
    obs.direction,
    obs.distance
  );

  // Vecteur
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
