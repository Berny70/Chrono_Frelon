// ==========================
// MODE (LOCAL / PARTAGÉ)
// ==========================
const params = new URLSearchParams(window.location.search);
const MODE_SHARED = params.get("mode") === "shared";

// ==========================
// DONNÉES
// ==========================
let observations = [];

// ==========================
// INITIALISATION CARTE
// ==========================
const map = L.map("map");

// Fond de carte
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// ==========================
// MODE LOCAL : chargement immédiat
// ==========================
if (!MODE_SHARED) {
  observations = JSON.parse(
    localStorage.getItem("chronoObservations") || "[]"
  );

  if (observations.length === 0) {
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
// MODE PARTAGÉ : Supabase
// ==========================
if (MODE_SHARED) {
  chargerObservationsPartagees();
}

// ==========================
// SAUVEGARDE DU ZOOM UTILISATEUR
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
// AFFICHAGE DES OBSERVATIONS
// ==========================
function afficherObservations() {
  observations.forEach(obs => {
    if (
      obs.lat == null ||
      obs.lon == null ||
      obs.distance == null ||
      obs.direction == null
    ) return;

    const start = [obs.lat, obs.lon];
    const color = obs.color || "red";

    // Point d’observation
    const marker = L.circleMarker(start, {
      radius: 6,
      color,
      fillColor: color,
      fillOpacity: 1
    }).addTo(map);

    marker.bindPopup(
      `<b>${t("map_station")}</b><br>
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
      color,
      weight: 3
    }).addTo(map);
  });
}

// ==========================
// CENTRAGE DE LA CARTE
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
// MODE PARTAGÉ : APPEL SUPABASE
// ==========================
async function chargerObservationsPartagees() {
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // 🔥 RPC SUPABASE
    observations = await chargerDonneesAutour(lat, lon);

    if (!observations || observations.length === 0) {
      alert(
        t("map_no_shared_data") ||
        "Aucune donnée partagée dans un rayon de 10 km"
      );
      map.setView([lat, lon], 11);
      return;
    }

    centrerCarte(observations);
    afficherObservations();

  }, () => {
    alert("GPS indisponible");
    map.setView([46.5, 2.5], 6);
  });
}

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
