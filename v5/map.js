// ==========================
// CARTE LOCALE – POT À MÈCHE
// Source UNIQUE : localStorage (smartphone)
// ==========================

// 🔒 SOURCE UNIQUE DES DONNÉES
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
// AUCUNE DONNÉE → MESSAGE
// ==========================
if (!Array.isArray(observations) || observations.length === 0) {
  alert(
    "Aucune donnée exploitable pour la localisation.\n\n" +
    "Pour afficher la carte locale, veuillez au minimum :\n" +
    "• relever une position\n" +
    "• mesurer un temps\n" +
    "• capturer une direction"
  );

  // Vue par défaut (France)
  map.setView([46.5, 2.5], 6);
  throw new Error("Carte locale : aucune observation");
}

// ==========================
// CENTRAGE / ZOOM
// ==========================
const points = observations
  .filter(o => typeof o.lat === "number" && typeof o.lon === "number")
  .map(o => [o.lat, o.lon]);

if (points.length === 1) {
  map.setView(points[0], 16);
} else if (points.length > 1) {
  map.fitBounds(points, { padding: [30, 30] });
} else {
  map.setView([46.5, 2.5], 6);
}

// ==========================
// AFFICHAGE OBSERVATIONS
// ==========================
observations.forEach(obs => {

  // 🔍 Validation stricte
  if (
    typeof obs.lat !== "number" ||
    typeof obs.lon !== "number" ||
    typeof obs.direction !== "number" ||
    typeof obs.distance !== "number" ||
    obs.distance <= 0
  ) return;

  const start = [obs.lat, obs.lon];

  // 📍 Point d’observation
  const marker = L.circleMarker(start, {
    radius: 6,
    color: "red",
    fillColor: "red",
    fillOpacity: 1
  }).addTo(map);

  marker.bindPopup(
    `<b>Observation locale</b><br>
     Direction : ${obs.direction}°<br>
     Distance : ${obs.distance} m`
  );

  // ➡️ Calcul du point d’arrivée
  const dest = destinationPoint(
    obs.lat,
    obs.lon,
    obs.direction,
    obs.distance
  );

  // ➡️ Vecteur directionnel
  L.polyline(
    [start, [dest.lat, dest.lon]],
    {
      color: "red",
      weight: 3
    }
  ).addTo(map);
});

// ==========================
// GÉOMÉTRIE – DESTINATION
// ==========================
function destinationPoint(lat, lon, bearing, distance) {
  const R = 6371000; // rayon Terre (m)
  const d = distance / R;
  const b = bearing * Math.PI / 180;

  const φ1 = lat * Math.PI / 180;
  const λ1 = lon * Math.PI / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(d) +
    Math.cos(φ1) * Math.sin(d) * Math.cos(b)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(b) * Math.sin(d) * Math.cos(φ1),
    Math.cos(d) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: φ2 * 180 / Math.PI,
    lon: λ2 * 180 / Math.PI
  };
}
