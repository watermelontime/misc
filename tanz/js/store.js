/* Datenlogik: Tänze, vorgegebene Songs (songs.json) + eigene Songs (localStorage) */
const Store = (() => {
  const LS_KEY = "mydancemusic.customSongs.v1";
  const WEIGHTS_KEY = "mydancemusic.partyWeights.v1";
  const DEFAULT_WEIGHT = 2; // Fallback, falls ein Tanz kein defaultWeight hat (0 = aus, 1–3 = relative Häufigkeit)

  // Reihenfolge, Anzeigenamen und Party-Mode-Standardgewicht (defaultWeight: 0–3) der Tänze
  const DANCES = [
    { key: "chacha", name: "ChaCha", emoji: "💃", defaultWeight: 2 },
    { key: "rumba", name: "Rumba", emoji: "🌹", defaultWeight: 1 },
    { key: "samba", name: "Samba", emoji: "🪇", defaultWeight: 1 },
    { key: "jive", name: "Jive", emoji: "🎸", defaultWeight: 1 },
    { key: "pasodoble", name: "Paso Doble", emoji: "🐂", defaultWeight: 1 },
    { key: "discofox", name: "DiscoFox", emoji: "🕺", defaultWeight: 2 },
    { key: "langsamerwalzer", name: "Langsamer Walzer", emoji: "🌙", defaultWeight: 0 },
    { key: "wienerwalzer", name: "Wiener Walzer", emoji: "🥂", defaultWeight: 1 },
    { key: "tango", name: "Tango", emoji: "🔥", defaultWeight: 1 },
    { key: "quickstep", name: "Quickstep", emoji: "✨", defaultWeight: 1 },
    { key: "slowfox", name: "Slowfox", emoji: "🎷", defaultWeight: 0 },
  ];

  let presets = {}; // aus songs.json

  async function load() {
    try {
      const res = await fetch("data/songs.json", { cache: "no-cache" });
      presets = await res.json();
    } catch (e) {
      console.error("songs.json konnte nicht geladen werden:", e);
      presets = {};
    }
  }

  function getCustom() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveCustom(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  function getDances() {
    return DANCES;
  }

  function getDance(key) {
    return DANCES.find((d) => d.key === key);
  }

  // Liefert vorgegebene + eigene Songs eines Tanzes (mit Herkunftsmarkierung)
  function getSongs(danceKey) {
    const base = (presets[danceKey] || []).map((s) => ({ ...s, custom: false }));
    const custom = (getCustom()[danceKey] || []).map((s) => ({ ...s, custom: true }));
    return [...base, ...custom];
  }

  function countSongs(danceKey) {
    return getSongs(danceKey).length;
  }

  // Extrahiert eine 11-stellige YouTube-Video-ID aus Link oder roher ID
  function extractVideoId(input) {
    const str = (input || "").trim();
    if (/^[\w-]{11}$/.test(str)) return str;
    const patterns = [
      /[?&]v=([\w-]{11})/,
      /youtu\.be\/([\w-]{11})/,
      /\/embed\/([\w-]{11})/,
      /\/shorts\/([\w-]{11})/,
      /music\.youtube\.com\/watch\?v=([\w-]{11})/,
    ];
    for (const p of patterns) {
      const m = str.match(p);
      if (m) return m[1];
    }
    return null;
  }

  function addCustomSong(danceKey, { id, title, artist }) {
    const data = getCustom();
    if (!data[danceKey]) data[danceKey] = [];
    data[danceKey].push({ id, title: title || "Eigener Song", artist: artist || "" });
    saveCustom(data);
  }

  function removeCustomSong(danceKey, id) {
    const data = getCustom();
    if (!data[danceKey]) return;
    data[danceKey] = data[danceKey].filter((s) => s.id !== id);
    saveCustom(data);
  }

  /* ---------- Party-Mode: Gewichtung pro Tanz ---------- */
  function getWeights() {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(WEIGHTS_KEY)) || {};
    } catch {
      stored = {};
    }
    const weights = {};
    for (const d of DANCES) {
      const v = stored[d.key];
      const fallback = Number.isInteger(d.defaultWeight) ? d.defaultWeight : DEFAULT_WEIGHT;
      weights[d.key] = Number.isInteger(v) && v >= 0 && v <= 3 ? v : fallback;
    }
    return weights;
  }

  function getWeight(danceKey) {
    return getWeights()[danceKey] ?? DEFAULT_WEIGHT;
  }

  function setWeight(danceKey, value) {
    const weights = getWeights();
    weights[danceKey] = Math.max(0, Math.min(3, Number(value) || 0));
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
  }

  // Setzt alle Gewichte auf die defaultWeight-Werte der Tänze zurück
  function resetWeights() {
    localStorage.removeItem(WEIGHTS_KEY);
  }

  // Wählt gewichtet einen zufälligen Song aus allen Tänzen mit Gewicht > 0 und Songs
  function pickRandomSong() {
    const weights = getWeights();
    const pool = DANCES
      .map((d) => ({ key: d.key, weight: weights[d.key], count: countSongs(d.key) }))
      .filter((d) => d.weight > 0 && d.count > 0);
    if (pool.length === 0) return null;

    const total = pool.reduce((sum, d) => sum + d.weight, 0);
    let r = Math.random() * total;
    let chosen = pool[pool.length - 1];
    for (const d of pool) {
      if (r < d.weight) { chosen = d; break; }
      r -= d.weight;
    }
    const songs = getSongs(chosen.key);
    const song = songs[Math.floor(Math.random() * songs.length)];
    return { danceKey: chosen.key, song };
  }

  return {
    load,
    getDances,
    getDance,
    getSongs,
    countSongs,
    extractVideoId,
    addCustomSong,
    removeCustomSong,
    getWeights,
    getWeight,
    setWeight,
    resetWeights,
    pickRandomSong,
  };
})();
