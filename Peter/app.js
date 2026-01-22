let device;
let server;
let service;
let characteristic;

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHAR_UUID    = "abcdefab-1234-5678-1234-abcdefabcdef";

const log = msg => {
  document.getElementById("log").textContent += msg + "\n";
};

document.getElementById("connect").onclick = async () => {
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }]
    });

    server = await device.gatt.connect();
    service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHAR_UUID);

    log("✅ Connecté à " + device.name);
  } catch (e) {
    log("❌ Erreur connexion: " + e);
  }
};

document.getElementById("read").onclick = async () => {
  try {
    const value = await characteristic.readValue();
    const text = new TextDecoder().decode(value);
    log("📖 Valeur lue: " + text);
  } catch (e) {
    log("❌ Lecture impossible");
  }
};

document.getElementById("write").onclick = async () => {
  try {
    const encoder = new TextEncoder();
    await characteristic.writeValue(
      encoder.encode("CALIB=1234")
    );
    log("✏️ Valeur écrite");
  } catch (e) {
    log("❌ Écriture impossible");
  }
};

// Enregistrement du service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
