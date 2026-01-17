// chronos.js
// ==========================
// LOGIQUE CHRONOS – V6
// ==========================

/**
 * Démarre ou arrête un chrono
 */
export function toggleChrono(state, i) {
  const c = state.chronos[i];
  const now = Date.now();

  if (!c.running) {
    c.running = true;
    c.startTime = now;
  } else {
    const elapsed = (now - c.startTime) / 1000;
    c.running = false;
    c.essais.push(elapsed);
  }
}

/**
 * Remise à zéro d’un chrono
 */
export function resetChrono(state, i) {
  const c = state.chronos[i];

  c.running = false;
  c.startTime = 0;
  c.essais = [];
  c.directions = [];
  c.direction = 0;
}

/**
 * Tick global : appelé toutes les 50 ms
 */
export function tickChronos(state) {
  const now = Date.now();

  state.chronos.forEach(c => {
    if (c.running) {
      c.currentTime = (now - c.startTime) / 1000;
    }
  });
}

/**
 * Temps moyen d’un chrono (secondes)
 */
export function getAverageTime(c) {
  if (!c.essais.length) return 0;
  return c.essais.reduce((a, b) => a + b, 0) / c.essais.length;
}

/**
 * Distance estimée (mètres)
 */
export function getDistance(c) {
  const moy = getAverageTime(c);
  return Math.round((moy * c.vitesse) / 2);
}
