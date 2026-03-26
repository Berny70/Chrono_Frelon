// ==========================
// MODE (LOCAL / PARTAGÉ)
// ==========================
const mapSearchParams = new URLSearchParams(window.location.search);
const MODE_SHARED = mapSearchParams.get("mode") === "shared";

// ==========================
// DONNÉES
// ==========================
let observations = [];
let pointsNid = [];

// ==========================
// DECLINAISON
// ==========================
let declinaison = 0.0;

// ==========================
// INITIALISATION DECLINAISON
// ==========================
function loadDeclinaison() {
  const saved = localStorage.getItem("declinaison");

  if (saved !== null) {
    declinaison = parseFloat(saved);
  } else {
    declinaison = 3; // valeur par défaut (Paris)
  }

  const input = document.getElementById("declinaisonInput");
  if (input) input.value = declinaison.toFixed(1);
}

// ==========================
// INPUT DECLINAISON
// ==========================
    function setupDeclinaisonInput() {
      const input = document.getElementById("declinaisonInput");
      if (!input) return;
    
      input.addEventListener("change", () => {
        let val = parseFloat(input.value.replace(",", "."));
    
        if (isNaN(val)) return;
    
        // limites
        if (val > 30) val = 30;
        if (val < -30) val = -30;
    
        declinaison = val;
        localStorage.setItem("declinaison", declinaison);
    
        input.value = declinaison.toFixed(1);
    
        redrawMap();
      });
    }

// ==========================
// REFRESH CARTE
// ==========================
function redrawMap() {
  map.eachLayer(layer => {
    if (
      layer instanceof L.Marker ||
      layer instanceof L.Polyline ||
      layer instanceof L.Circle ||
      layer instanceof L.CircleMarker
    ) {
      map.removeLayer(layer);
    }
  });

  afficherObservations();
}

// ==========================
// INITIALISATION CARTE
// ==========================
const map = L.map("map").setView([46.5, 2.5], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// ==========================
// MODE LOCAL
// ==========================
if (!MODE_SHARED) {
  observations = JSON.parse(
    localStorage.getItem("chronoObservations") || "[]"
  );

  observations = observations.map(o => {
    if (o.distance == null) o.distance = 0;
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
if (MODE_SHARED) {
  chargerObservationsPartagees();
}

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

  pointsNid = [];

  observations.forEach(obs => {

    if (!obs.lat || !obs.lon || obs.direction == null) return;

    const start = [obs.lat, obs.lon];
    const color = obs.color || "red";

    // ===== déclinaison =====
    let directionCorrigee = obs.direction + declinaison;
    if (directionCorrigee < 0) directionCorrigee += 360;
    if (directionCorrigee >= 360) directionCorrigee -= 360;

    // ===== distance =====
    let distance = 0;

    if (obs.essais && obs.essais.length && obs.vitesse) {
      const total = obs.essais.reduce((a, b) => a + b, 0);
      const moy = total / obs.essais.length;
      distance = moy * obs.vitesse / 2;
    }

    // ===== point =====
    const marker = L.circleMarker(start, {
      radius: 6,
      color,
      fillColor: color,
      fillOpacity: 1
    }).addTo(map);

    marker.bindPopup(
      `<b>${t("map_station")}</b><br>
       ${t("map_distance")}: ${Math.round(distance)} m<br>
       ${t("map_direction")}: ${Math.round(directionCorrigee)}°`
    );

    // ===== destination =====
    const dest = destinationPoint(
      obs.lat,
      obs.lon,
      directionCorrigee,
      distance === 0 ? 500 : distance
    );

    // ===== ligne =====
    L.polyline(
      [start, [dest.lat, dest.lon]],
      {
        color,
        weight: distance === 0 ? 2 : 3,
        dashArray: distance === 0 ? "6 6" : null,
        opacity: 1
      }
    ).addTo(map);

    // ===== stockage nid =====
    if (distance > 0) {
      pointsNid.push([dest.lat, dest.lon]);
    }

    // ===== cercle =====
    if (distance > 0) {
      L.circle([dest.lat, dest.lon], {
        radius: 50,
        color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 1
      }).addTo(map);
    }
  });

  // ===== nid probable =====
  if (pointsNid.length >= 2) {
    let latSum = 0, lonSum = 0;

    pointsNid.forEach(p => {
      latSum += p[0];
      lonSum += p[1];
    });

    const latMoy = latSum / pointsNid.length;
    const lonMoy = lonSum / pointsNid.length;

    L.marker([latMoy, lonMoy])
      .addTo(map)
      .bindPopup("📍 Nid probable");
  }
}

// ==========================
// CENTRAGE
// ==========================
function centrerCarte(data) {
  const points = data
    .filter(o => o.lat != null && o.lon != null)
    .map(o => [o.lat, o.lon]);

  const savedView = localStorage.getItem("mapView");

  if (!MODE_SHARED && savedView) {
    const { center, zoom } = JSON.parse(savedView);
    map.setView(center, zoom);

  } else if (points.length === 1) {
    map.setView(points[0], 16);

  } else if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });

  } else {
    map.setView([46.5, 2.5], 6);
  }
}

// ==========================
// SUPABASE
// ==========================
async function chargerDonneesAutour(lat, lon) {
  const { data, error } = await window.supabaseClient.rpc(
    "get_nearby_frelons",
    { lat, lon, radius_m: 10000 }
  );

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

// ==========================
// MODE PARTAGÉ
// ==========================
async function chargerObservationsPartagees() {
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      observations = await chargerDonneesAutour(lat, lon);
      observations = observations.map(o => ({ ...o, distance: o.distance || 0 }));

      if (!observations.length) {
        alert(t("map_no_shared_data"));
        map.setView([lat, lon], 11);
        return;
      }

      centrerCarte(observations);
      afficherObservations();
    },
    () => {
      alert(t("gps_error"));
      map.setView([46.5, 2.5], 6);
    }
  );
}

// ==========================
// GÉOMÉTRIE
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
document.getElementById("btnBackMap")?.onclick = () => {
  location.href = "index.html";
};

// ==========================
// INIT GLOBAL
// ==========================
window.addEventListener("load", () => {
  loadDeclinaison();
  setupDeclinaisonInput();
});
