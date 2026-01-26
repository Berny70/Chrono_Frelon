// ==========================
// HELP – AIDE UTILISATEUR (V7)
// ==========================

function openHelpPopup() {
  // sécurité anti-doublon
  document.getElementById("helpOverlay")?.remove();
  document.querySelector(".helpOverlaySub")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "helpOverlay";

  overlay.innerHTML = `
    <div class="help-box">
      <h2>Aide – Pot à Mèche</h2>

      <button class="help-btn" data-help="install">
        📱 Installation smartphone
      </button>

      <button class="help-btn" data-help="vars">
        📊 Explication de l’application
      </button>

      <button class="help-btn" data-help="contact">
        ✉️ Contact / retours terrain
      </button>

      <br>
      <button onclick="closeHelp()">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeHelp();
  });

  overlay.querySelectorAll(".help-btn").forEach(btn => {
    btn.onclick = () => openHelpSection(btn.dataset.help);
  });
}

function openHelpSection(type) {
  if (type === "contact") {
    window.open(
      "https://docs.google.com/forms/d/e/1FAIpQLSdZZLGB8u3ULsnCr6GbNkQ9mVIAhWCk2NEatUOeeElGAoMcmg/viewform",
      "_blank",
      "noopener"
    );
    return;
  }

  let html = "";

  if (type === "install") {
    html = `
      <h3>Installation sur smartphone</h3>
      <ul>
        <li>Ouvrir l’application dans le navigateur</li>
        <li>Menu → <b>Ajouter à l’écran d’accueil</b></li>
        <li>Autoriser la localisation GPS</li>
        <li>Autoriser l’accès à la boussole</li>
      </ul>
    `;
  }

  if (type === "vars") {
    html = `
      <h3>Fonctionnement de l’application</h3>
      <ul>
        <li>Chaque couleur correspond à une station</li>
        <li>Start / Stop : mesure le temps</li>
        <li>Position : relève la localisation</li>
        <li>Boussole : capture la direction</li>
        <li>Détail : supprime les valeurs aberrantes</li>
      </ul>
    `;
  }

  openHelpSubPopup(html);
}

function openHelpSubPopup(html) {
  document.querySelector(".helpOverlaySub")?.remove();

  const sub = document.createElement("div");
  sub.className = "helpOverlaySub";
  sub.innerHTML = `
    <div class="help-box">
      ${html}
      <br>
      <button onclick="closeHelp()">Fermer</button>
    </div>
  `;

  document.body.appendChild(sub);
}

function closeHelp() {
  document.getElementById("helpOverlay")?.remove();
  document.querySelector(".helpOverlaySub")?.remove();
}

// exposition globale
window.openHelpPopup = openHelpPopup;
