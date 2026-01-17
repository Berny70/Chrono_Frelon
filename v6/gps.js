// gps.js
// ==========================
// GÉOLOCALISATION – V6
// ==========================
export function getPosition(state, index, onUpdate) {
  if (!navigator.geolocation) {
    alert("Géolocalisation non supportée");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const c = state.chronos[index];
      c.lat = +pos.coords.latitude.toFixed(5);
      c.lon = +pos.coords.longitude.toFixed(5);

      if (onUpdate) onUpdate();
    },
    () => alert("Impossible d’obtenir la position GPS"),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
