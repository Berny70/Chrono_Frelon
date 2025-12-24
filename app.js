const chronos = Array.from({ length: 4 }, () => ({
    running: false,
    startTime: 0,
    essais: []
  }));
  
  function startStop(i) {
    const c = chronos[i];
    const now = Math.floor(Date.now() / 1000);
  
    if (!c.running) {
      c.startTime = now;
      c.running = true;
    } else {
      const elapsed = now - c.startTime;
      c.essais.push(elapsed);
      c.running = false;
      updateStats(i);
    }
  }
  
  function sup(i) {
    const c = chronos[i];
    if (c.essais.length > 0) {
      c.essais.pop();
      updateStats(i);
    }
  }
  
  function rst(i) {
    chronos[i] = { running: false, startTime: 0, essais: [] };
    document.getElementById(`t${i}`).textContent = "0 s";
    updateStats(i);
  }
  
  function updateStats(i) {
    const essais = chronos[i].essais;
    document.getElementById(`n${i}`).textContent = essais.length;
  
    if (essais.length === 0) {
      document.getElementById(`m${i}`).textContent = 0;
      document.getElementById(`d${i}`).textContent = 0;
      return;
    }
  
    const total = essais.reduce((a, b) => a + b, 0);
    const moyenne = Math.round(total / essais.length);
    const distance = moyenne * 5; // m/s
  
    document.getElementById(`m${i}`).textContent = moyenne;
    document.getElementById(`d${i}`).textContent = distance;
  }
  
  function tick() {
    const now = Math.floor(Date.now() / 1000);
  
    chronos.forEach((c, i) => {
      if (c.running) {
        document.getElementById(`t${i}`).textContent =
          (now - c.startTime) + " s";
      }
    });
  }
  
  setInterval(tick, 1000);
  