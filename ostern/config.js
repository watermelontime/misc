/* ============================================================
   config.js – Zentrale Konfiguration für das Ostereier-Spiel
   ============================================================ */

const CONFIG = {

    // ----------------------------------------------------------
    // Meilenstein-Texte
    // Ab welchem Punktestand (n) welcher Text (text) erscheint.
    // Der LETZTE Eintrag gilt als finaler Meilenstein:
    //   → Text bleibt permanent stehen
    //   → Buttons "Weiter spielen" / "Neu starten" erscheinen
    // ----------------------------------------------------------
    milestones: [
        { n: 5,  text: "Toll" },
        { n: 10, text: "Super-Toll" },
        { n: 15, text: "Super-Duper-Toll" },
        { n: 20, text: "Frohe Ostern 2026" }
    ],

    // Anzeigedauer der Meilenstein-Texte in Sekunden
    milestoneDisplayDuration: 3,

    // ----------------------------------------------------------
    // Schwierigkeitskurve
    // Ab welchem Punktestand (fromScore) wie viele Eier (maxEggs)
    // gleichzeitig auf dem Bildschirm sein können.
    // ----------------------------------------------------------
    difficulty: [
        { fromScore: 0,  maxEggs: 1 },
        { fromScore: 5,  maxEggs: 2 },
        { fromScore: 10, maxEggs: 3 },
        { fromScore: 15, maxEggs: 4 },
        { fromScore: 20, maxEggs: 5 }
    ],

    // Fallgeschwindigkeit der Eier in Pixel pro Frame (~60 fps)
    eggFallSpeed: 3,

    // Anzahl Leben (verpasste Eier bis Game Over)
    maxLives: 3,

    // Dauer bis zerbrochene Eier verschwinden (Sekunden)
    brokenEggDuration: 2,

    // Farb-Palette für die Ostereier
    eggColors: [
        "#e74c3c", // rot
        "#3498db", // blau
        "#f1c40f", // gelb
        "#2ecc71", // grün
        "#9b59b6", // lila
        "#e67e22", // orange
        "#e91e63"  // rosa
    ]
};
