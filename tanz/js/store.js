/* Datenlogik: Tänze, vorgegebene Songs (songs.json) + eigene Songs (localStorage) */
const Store = (() => {
  const LS_KEY = "mydancemusic.customSongs.v1";

  // Reihenfolge und Anzeigenamen der Tänze (Schlüssel = Key in songs.json)
  const DANCES = [
    { key: "chacha", name: "ChaCha", emoji: "💃" },
    { key: "rumba", name: "Rumba", emoji: "❤️" },
    { key: "samba", name: "Samba", emoji: "🪇" },
    { key: "jive", name: "Jive", emoji: "🎸" },
    { key: "pasodoble", name: "Paso Doble", emoji: "🐂" },
    { key: "langsamerwalzer", name: "Langsamer Walzer", emoji: "🌙" },
    { key: "wienerwalzer", name: "Wiener Walzer", emoji: "🥂" },
    { key: "tango", name: "Tango", emoji: "🌹" },
    { key: "slowfox", name: "Slowfox", emoji: "🎷" },
    { key: "quickstep", name: "Quickstep", emoji: "✨" },
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

  return {
    load,
    getDances,
    getDance,
    getSongs,
    countSongs,
    extractVideoId,
    addCustomSong,
    removeCustomSong,
  };
})();
