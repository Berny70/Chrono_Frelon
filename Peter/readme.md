🎯 Objectif fonctionnel

Créer une application smartphone (PWA) permettant de :
se connecter en Bluetooth Low Energy (BLE) à une balance basée sur ESP32
lire l’état de la balance (version, ID, batterie…)
mettre à jour des paramètres (calibration, seuils, nom, réseau…)
éventuellement mettre à jour le firmware (OTA)
Le tout sans application native, directement depuis le navigateur.

pwa-balance/
├── index.html
├── app.js
├── manifest.json
├── sw.js
└── icon-192.png
└── icon-512.png
