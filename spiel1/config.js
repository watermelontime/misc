/* ============================================================
   config.js – Zentrale Konfiguration für Mensch ärgere Dich nicht
   ============================================================ */

const CONFIG = {
  // ── Spielerfarben & Namen (nutzer-konfigurierbar) ──────────
  players: [
    { name: "Rot",   color: "#E53935", colorLight: "#EF9A9A",  colorDark: "#B71C1C"  },
    { name: "Blau",  color: "#1E88E5", colorLight: "#90CAF9",  colorDark: "#0D47A1"  },
    { name: "Grün",  color: "#43A047", colorLight: "#A5D6A7",  colorDark: "#1B5E20"  },
    { name: "Gelb",  color: "#FDD835", colorLight: "#FFF59D",  colorDark: "#F9A825"  }
  ],

  // ── Board-Farben ───────────────────────────────────────────
  board: {
    background:    "#F5E6CA",
    fieldFill:     "#FFFDE7",
    fieldStroke:   "#5D4037",
    centerFill:    "#EFEBE9",
    centerStroke:  "#8D6E63",
    textColor:     "#E0CEAB",
    textFontSize:  20
  },

  // ── Spielname in 4 Sprachen (je Quadrant) ──────────────────
  // Jeder Eintrag: Array mit 2 Zeilen
  boardTexts: [
    ["Mensch ärgere",       "Dich nicht!"],
    ["Man, Don't",          "Get Angry!"],
    ["Nu te supăra,",       "frate!"],
    ["Ki nevet",            "a végén!"]
  ],

  // ── Spielparameter ─────────────────────────────────────────
  figuresPerPlayer:      4,
  boardFields:           40,
  homeFields:            4,
  startFieldIndex:       [0, 10, 20, 30],

  // ── Animationen ────────────────────────────────────────────
  diceAnimationDuration: 800,
  moveStepDelay:         200,

  // ── Regeln ─────────────────────────────────────────────────
  maxDiceAttemptsAllHome: 3,

  // ── Spieler-Zuordnung bei weniger als 4 Spielern ───────────
  // indices in das players-Array
  playerSlots: {
    2: [0, 2],        // Rot & Grün (gegenüber)
    3: [0, 1, 2],     // Rot, Blau, Grün
    4: [0, 1, 2, 3]   // alle
  }
};
