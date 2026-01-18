/* Mobile Sensors + Camera Demo (optimized for iOS) */

const els = (sel) => document.querySelector(sel);
const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

// PWA: Service Worker Registration
(async function registerSW(){
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./service-worker.js');
      console.log('SW registered', reg.scope);
    } catch (e) { console.warn('SW registration failed', e); }
  }
})();

// Install prompt handling (Chrome only; iOS uses Add to Home Screen)
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    btn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
});

// Geolocation
let geoWatchId = null;
function startGeolocation() {
  if (!('geolocation' in navigator)) { setText('geoStatus', 'Geolocation unsupported'); return; }
  setText('geoStatus', 'Starting…');
  geoWatchId = navigator.geolocation.watchPosition((pos) => {
    const { latitude, longitude, accuracy, speed } = pos.coords;
    setText('geoLat', latitude?.toFixed(6));
    setText('geoLon', longitude?.toFixed(6));
    setText('geoAcc', accuracy?.toFixed(1));
    setText('geoSpd', (speed ?? 0).toFixed(2));
    setText('geoStatus', 'Live');
  }, (err) => {
    setText('geoStatus', `Error: ${err.message}`);
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
}
function stopGeolocation() {
  if (geoWatchId !== null) { navigator.geolocation.clearWatch(geoWatchId); geoWatchId = null; setText('geoStatus', 'Stopped'); }
}

// Device Orientation & Motion (iOS needs user gesture + permission)
let motionEnabled = false;
async function enableMotionSensors() {
  try {
    const oriPerm = (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')
      ? await DeviceOrientationEvent.requestPermission() : 'granted';
    const motPerm = (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function')
      ? await DeviceMotionEvent.requestPermission() : 'granted';

    if (oriPerm !== 'granted' || motPerm !== 'granted') {
      setText('permissionsStatus', 'Motion/Orientation permission denied');
      return;
    }

    window.addEventListener('deviceorientation', (e) => {
      setText('oriAlpha', (e.alpha ?? 0).toFixed(2));
      setText('oriBeta', (e.beta ?? 0).toFixed(2));
      setText('oriGamma', (e.gamma ?? 0).toFixed(2));
      setText('oriStatus', 'Live');
    });

    window.addEventListener('devicemotion', (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration || {};
      const r = e.rotationRate || {};
      setText('motAx', (a.x ?? 0).toFixed(3));
      setText('motAy', (a.y ?? 0).toFixed(3));
      setText('motAz', (a.z ?? 0).toFixed(3));
      setText('motRa', (r.alpha ?? 0).toFixed(3));
      setText('motRb', (r.beta ?? 0).toFixed(3));
      setText('motRg', (r.gamma ?? 0).toFixed(3));
      setText('motStatus', 'Live');
    });

    motionEnabled = true;
    setText('permissionsStatus', 'Motion/Orientation enabled');
  } catch (err) {
    setText('permissionsStatus', `Motion enable failed: ${err?.message || err}`);
  }
}

// Battery Status (unsupported on iOS Safari as of now)
async function initBattery() {
  try {
    if (!('getBattery' in navigator)) { setText('batStatus', 'Battery API unsupported on this device'); return; }
    const battery = await navigator.getBattery();
    const update = () => {
      setText('batLevel', `${Math.round(battery.level * 100)}%`);
      setText('batCharging', battery.charging ? 'Yes' : 'No');
    };
    battery.addEventListener('levelchange', update);
    battery.addEventListener('chargingchange', update);
    update();
    setText('batStatus', 'Live');
  } catch (e) { setText('batStatus', `Battery error: ${e.message}`); }
}

// Ambient Light (Generic Sensor API; likely unsupported on iOS)
function initAmbientLight() {
  try {
    if ('AmbientLightSensor' in window) {
      const sensor = new AmbientLightSensor();
      sensor.addEventListener('reading', () => {
        setText('lightLux', sensor.illuminance?.toFixed(2));
        setText('lightStatus', 'Live');
      });
      sensor.addEventListener('error', (e) => setText('lightStatus', `Error: ${e.error?.message || e.name}`));
      sensor.start();
    } else {
      setText('lightStatus', 'Ambient Light Sensor unsupported on this device');
    }
  } catch (e) { setText('lightStatus', `Light error: ${e.message}`); }
}

// Generic Sensors (Accelerometer, Gyroscope, Magnetometer) — feature detect
function initGenericSensors() {
  // Accelerometer
  try {
    if ('Accelerometer' in window) {
      const acc = new Accelerometer({ frequency: 30 });
      acc.addEventListener('reading', () => {
        setText('accX', (acc.x ?? 0).toFixed(3));
        setText('accY', (acc.y ?? 0).toFixed(3));
        setText('accZ', (acc.z ?? 0).toFixed(3));
        setText('accStatus', 'Live');
      });
      acc.addEventListener('error', (e) => setText('accStatus', `Error: ${e.error?.message || e.name}`));
      acc.start();
    } else { setText('accStatus', 'Accelerometer unsupported'); }
  } catch (e) { setText('accStatus', `Accel error: ${e.message}`); }

  // Gyroscope
  try {
    if ('Gyroscope' in window) {
      const g = new Gyroscope({ frequency: 30 });
      g.addEventListener('reading', () => {
        setText('gyroX', (g.x ?? 0).toFixed(3));
        setText('gyroY', (g.y ?? 0).toFixed(3));
        setText('gyroZ', (g.z ?? 0).toFixed(3));
        setText('gyroStatus', 'Live');
      });
      g.addEventListener('error', (e) => setText('gyroStatus', `Error: ${e.error?.message || e.name}`));
      g.start();
    } else { setText('gyroStatus', 'Gyroscope unsupported'); }
  } catch (e) { setText('gyroStatus', `Gyro error: ${e.message}`); }

  // Magnetometer
  try {
    if ('Magnetometer' in window) {
      const m = new Magnetometer({ frequency: 10 });
      m.addEventListener('reading', () => {
        setText('magX', (m.x ?? 0).toFixed(3));
        setText('magY', (m.y ?? 0).toFixed(3));
        setText('magZ', (m.z ?? 0).toFixed(3));
        setText('magStatus', 'Live');
      });
      m.addEventListener('error', (e) => setText('magStatus', `Error: ${e.error?.message || e.name}`));
      m.start();
    } else { setText('magStatus', 'Magnetometer unsupported'); }
  } catch (e) { setText('magStatus', `Mag error: ${e.message}`); }
}

// Network Info
function initNetworkInfo() {
  const c = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  if (!c) { setText('netStatus', 'Network Information API unsupported'); return; }
  const update = () => {
    setText('netType', c.effectiveType || c.type || 'unknown');
    setText('netDown', c.downlink ? c.downlink.toFixed(2) : '–');
    setText('netRtt', c.rtt ? c.rtt.toFixed(0) : '–');
  };
  c.addEventListener('change', update);
  update();
}

// Camera & Barcode Scanning
let mediaStream = null;
let videoTrack = null;
let scanning = false;
let zxingReader = null;
let barcodeDetector = null;

async function enableCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 }, height: { ideal: 720 }
      },
      audio: false
    });
    const v = document.getElementById('video');
    v.srcObject = mediaStream;
    await v.play();
    videoTrack = mediaStream.getVideoTracks()[0] || null;
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('stopScanBtn').disabled = false;
    const caps = videoTrack?.getCapabilities?.() || {};
    document.getElementById('torchBtn').disabled = !caps.torch;
    setText('scanStatus', 'Camera ready');
  } catch (e) {
    setText('scanStatus', `Camera error: ${e.message}`);
  }
}

function toggleTorch() {
  try {
    if (!videoTrack) return;
    const settings = videoTrack.getSettings();
    const isOn = settings.torch === true;
    videoTrack.applyConstraints({ advanced: [{ torch: !isOn }] });
  } catch (e) { setText('scanStatus', `Torch error: ${e.message}`); }
}

async function startScanning() {
  if (!mediaStream) { setText('scanStatus', 'Camera not enabled'); return; }
  if (scanning) return; scanning = true;
  setText('scanStatus', 'Starting scanner…');

  // Prefer native BarcodeDetector if available
  if ('BarcodeDetector' in window) {
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      barcodeDetector = new BarcodeDetector({ formats });
      const v = document.getElementById('video');
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const loop = () => {
        if (!scanning) return;
        const w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) { requestAnimationFrame(loop); return; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(v, 0, 0, w, h);
        barcodeDetector.detect(canvas)
          .then((codes) => {
            if (codes && codes.length > 0) {
              setText('scanResult', codes[0].rawValue || '');
              setText('scanFormat', codes[0].format || '');
            }
            requestAnimationFrame(loop);
          })
          .catch(() => requestAnimationFrame(loop));
      };
      requestAnimationFrame(loop);
      setText('scanStatus', 'Scanning (native)');
      return;
    } catch (e) {
      console.warn('BarcodeDetector failed; falling back to ZXing', e);
    }
  }

  // Fallback: ZXing multi-format
  try {
    const { BrowserMultiFormatReader, NotFoundException } = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@latest/+esm');
    zxingReader = new BrowserMultiFormatReader();
    const v = document.getElementById('video');
    await zxingReader.decodeFromVideoDevice(null, v, (result, err) => {
      if (result) {
        setText('scanResult', result.getText());
        setText('scanFormat', result.getBarcodeFormat());
        setText('scanStatus', 'Scanning (ZXing)');
      } else if (err && !(err instanceof NotFoundException)) {
        setText('scanStatus', `ZXing error: ${err}`);
      }
    });
  } catch (e) { setText('scanStatus', `ZXing load failed: ${e.message}`); }
}

async function stopScanning() {
  scanning = false;
  try { if (zxingReader) { await zxingReader.reset(); zxingReader = null; } } catch {}
  try { const v = document.getElementById('video'); v.pause(); } catch {}
  try { if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; videoTrack = null; } } catch {}
  setText('scanStatus', 'Scanner stopped');
}

// Wire UI events
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('enableMotionBtn').addEventListener('click', enableMotionSensors);
  document.getElementById('enableGeoBtn').addEventListener('click', startGeolocation);
  document.getElementById('stopGeoBtn').addEventListener('click', stopGeolocation);
  document.getElementById('enableCameraBtn').addEventListener('click', enableCamera);
  document.getElementById('scanBtn').addEventListener('click', startScanning);
  document.getElementById('stopScanBtn').addEventListener('click', stopScanning);
  document.getElementById('torchBtn').addEventListener('click', toggleTorch);

  initBattery();
  initAmbientLight();
  initGenericSensors();
  initNetworkInfo();
});
