# Spezifikation: Oster-Website 2026

## 1. Übersicht

Eine zweiseitige, responsive Oster-Website als PWA (Progressive Web App).  
Technologie: reines HTML / CSS / JavaScript – keine Frameworks.  
Grafiken: CSS und inline-SVG (keine externen Bilddateien für Spielelemente).  
PWA-Icon: rotes Osterei.

Verzeichnis: `ostern/`

---

## 2. Dateistruktur

```
ostern/
├── index.html            ← Seite 1: Titel-Seite
├── spiel.html            ← Seite 2: Spiele-Seite
├── styles.css            ← Gemeinsame Styles
├── titel.css             ← Styles Titel-Seite
├── titel.js              ← Logik Titel-Seite (Ohrenwackeln)
├── spiel.css             ← Styles Spiele-Seite
├── spiel.js              ← Spiel-Logik
├── config.js             ← Zentrale Konfigurationsdatei
├── manifest.json         ← PWA-Manifest
├── service-worker.js     ← Service Worker
└── images/
    ├── icon-192x192.png  ← PWA-Icon (rotes Osterei)
    └── icon-512x512.png  ← PWA-Icon (rotes Osterei)
```

---

## 3. Konfigurationsdatei (`config.js`)

Alle spielrelevanten Parameter werden zentral in einer einzigen Konfigurationsdatei definiert:

```javascript
const CONFIG = {
  // Meilenstein-Texte: Ab welchem Punktestand (n) welcher Text (text) erscheint
  milestones: [
    { n: 5,  text: "Toll" },
    { n: 10, text: "Super-Toll" },
    { n: 15, text: "Super-Duper-Toll" },
    { n: 20, text: "Frohe Ostern 2026" }
  ],

  // Anzeigedauer der Meilenstein-Texte in Sekunden
  milestoneDisplayDuration: 2,

  // Schwierigkeitskurve: Ab welchem Punktestand wie viele Eier
  // gleichzeitig (kurz nacheinander) fallen können
  difficulty: [
    { fromScore: 0,  maxEggs: 1 },
    { fromScore: 5,  maxEggs: 2 },
    { fromScore: 10, maxEggs: 3 },
    { fromScore: 15, maxEggs: 4 },
    { fromScore: 20, maxEggs: 5 }
  ],

  // Fallgeschwindigkeit der Eier in Pixel pro Frame (bei ~60 fps)
  eggFallSpeed: 3,

  // Anzahl Leben (verpasste Eier bis Game Over)
  maxLives: 3,

  // Dauer bis zerbrochene Eier verschwinden (Sekunden)
  brokenEggDuration: 2
};
```

---

## 4. Seite 1 – Titel-Seite (`index.html`)

### 4.1 Layout & Design

- Vollbild-Szene, bunt gestaltet.
- Hintergrund: Osterwerkstatt (warme Holztöne, Regale) – rein mit CSS-Gradienten / -Formen realisiert.

### 4.2 Elemente (alle CSS / SVG)

| Element | Beschreibung |
|---|---|
| **Osterhase** | Braun, mittig stehend. Trägt eine Schürze mit bunten Farbklecksen (rot, blau, gelb, grün). |
| **Hintergrund-Objekte** | Farbeimer (verschiedene Farben), Pinsel, bunte Ostereier – auf Regalen / Tischen. |
| **„Spielen"-Button** | Unten links. 3D-Effekt: erhaben im Ruhezustand; beim Klicken gedrückt (`box-shadow` + `transform`). Navigiert zu `spiel.html`. |

### 4.3 Interaktion

- **Ohrenwackeln**: Klick auf den Kopfbereich des Hasen löst eine CSS-Animation aus.  
  Beide Ohren wackeln einmal hin und her (~0,5 s).  
  Animation wird per JavaScript-Click-Event getriggert und läuft einmalig ab.

---

## 5. Seite 2 – Spiele-Seite (`spiel.html`)

### 5.1 Spielfeld

- Vollbild, responsive (füllt den Viewport).
- Hintergrund: Frühlingswiese – grüner Boden unten, hellblauer Himmel oben (CSS-Gradient).

### 5.2 Elemente

| Element | Beschreibung |
|---|---|
| **Start-Button** | Zentriert auf dem Bildschirm. Startet das Spiel. Verschwindet nach dem Start. |
| **Osterhase (unten)** | SVG/CSS-Hase mit Osternest/Korb in den Händen. Horizontal verschiebbar. |
| **Ostereier (fallend)** | Bunte SVG-Eier in zufälligen Farben. Fallen von zufälligen X-Positionen am oberen Rand. |
| **Punktestand** | Oben mittig: z. B. „Eier: 0". |
| **Leben-Anzeige (Pinsel)** | Oben rechts. Anfangs 3 Pinsel-Icons (brauner Griff, rote Farbhaare). Bei Verlust eines Lebens verschwindet ein Pinsel. |
| **Zurück-Button** | Klein, unten links. Navigiert zurück zu `index.html`. |

### 5.3 Steuerung

| Eingabe | Aktion |
|---|---|
| **Pfeiltasten ← →** | Hase bewegt sich links / rechts. |
| **Mausklick / Touch** | Hase bewegt sich zur angeklickten / berührten X-Position. |
| **Touch-Wischen** | Hase folgt der horizontalen Wischbewegung. |

### 5.4 Spielmechanik

1. **Start**: Spieler klickt den „Start"-Button. Button verschwindet, Eier beginnen zu fallen.
2. **Eier fallen**: Von oben nach unten, mit konstanter, konfigurierbarer Geschwindigkeit (`eggFallSpeed`). Zufällige X-Position, zufällige Farbe.
3. **Fangen**: Ei trifft den Korb des Hasen → Ei verschwindet, Punktestand +1.
4. **Verfehlen**: Ei erreicht den Boden →
   - Ei zerbricht: Schale bricht auf, Eigelb wird sichtbar (SVG-Animation).
   - Nach `brokenEggDuration` Sekunden (Standard: 2) verschwindet das zerbrochene Ei.
   - Ein Leben geht verloren → ein Pinsel-Icon oben rechts verschwindet.
5. **Schwierigkeit**: Gesteuert durch `difficulty`-Array in `config.js`. Bestimmt, wie viele Eier maximal gleichzeitig auf dem Bildschirm sein können.
6. **Game Over**: Bei 0 verbleibenden Leben.
   - Anzeige: „Game Over" + finale Punktzahl + „Neu starten"-Button.

### 5.5 Meilenstein-Texte

- Beim Erreichen eines konfigurierten Punktestands (`milestones[].n`) erscheint der zugehörige Text (`milestones[].text`) **groß und zentriert** im Hintergrund.
- Erscheint mit **Fade-In**-Animation, verschwindet nach `milestoneDisplayDuration` Sekunden (Standard: 2) mit **Fade-Out**.
- **Letzter Meilenstein** (höchstes `n`, hier 20):
  - Text bleibt **permanent** stehen (kein Fade-Out).
  - Zwei Buttons erscheinen zentriert:
    - **„Weiter spielen"**: Spiel läuft weiter. Keine weiteren Meilenstein-Texte. Der letzte Text bleibt sichtbar.
    - **„Neu starten"**: Punktestand → 0, Leben → 3, Spiel beginnt komplett von vorn.

### 5.6 Spielablauf-Diagramm

```
   [Start-Button klicken]
            │
            ▼
  ┌──── Spiel läuft ◄──────────────────────┐
  │     Eier fallen                         │
  │          │                              │
  │     ┌────┴─────┐                        │
  │     ▼          ▼                        │
  │  Gefangen    Verfehlt                   │
  │  Score +1    Leben −1                   │
  │     │          │                        │
  │     │     Leben = 0?                    │
  │     │     Ja ──► Game Over              │
  │     │             [Neu starten] ────────┤
  │     │     Nein                          │
  │     │          │                        │
  │     ▼          ▼                        │
  │  Meilenstein erreicht?                  │
  │     Ja → Text anzeigen                  │
  │     Letzter Meilenstein?                │
  │       Ja → Text bleibt, Buttons zeigen  │
  │         ├─ [Weiter spielen] ────────────┘
  │         └─ [Neu starten] ──────────────►│
  │                                         │
  └─────────────────────────────────────────┘
```

---

## 6. Grafik-Spezifikation (CSS / SVG)

### 6.1 Titel-Seite – Osterhase (stehend)

| Teil | Umsetzung |
|---|---|
| Körper | Braune Ellipse |
| Kopf | Braune Ellipse, oberhalb des Körpers |
| Ohren | Zwei lange braune Ellipsen oben am Kopf (klickbar, animierbar) |
| Augen | Schwarze Kreise mit weißem Glanzpunkt |
| Nase | Rosa Dreieck / Ellipse |
| Schnurrhaare | Dünne Linien |
| Schürze | Weißes / beiges Rechteck mit runden, bunten Farbklecksen |
| Arme / Pfoten | Braune Ellipsen |

### 6.2 Titel-Seite – Hintergrund-Objekte

| Objekt | Umsetzung |
|---|---|
| Farbeimer | Trapezförmig, verschiedene Füllfarben, mit Henkel |
| Pinsel | Brauner Stiel, farbige Borsten |
| Ostereier | Ovale mit bunten Mustern (Streifen, Punkte) |

### 6.3 Spiele-Seite – Osterhase (Spielfigur)

- Vereinfachte Version: Kopf + Körper + Korb.
- Korb: geflochtene Textur (CSS-Pattern), vor dem Körper gehalten.

### 6.4 Spiele-Seite – Ostereier (fallend)

- Einfache ovale SVG-Elemente.
- Zufällige Farbe aus Palette: rot, blau, gelb, grün, lila, orange, rosa.
- Optionale Muster (Streifen / Punkte).

### 6.5 Spiele-Seite – Zerbrochenes Ei

- Zwei Schalenhälften (oben / unten, auseinander).
- Gelber Kreis (Eigelb) in der Mitte.
- Fade-Out nach `brokenEggDuration` Sekunden.

### 6.6 Spiele-Seite – Pinsel (Leben-Anzeige)

- Kleines Icon, ca. 30 × 15 px.
- Brauner Griff (Rechteck).
- Rote Farbhaare (abgerundetes Rechteck oben).

---

## 7. PWA-Konfiguration

### 7.1 `manifest.json`

| Feld | Wert |
|---|---|
| `name` | „Ostern 2026" |
| `short_name` | „Ostern" |
| `start_url` | `index.html` |
| `display` | `standalone` |
| `background_color` | `#fffbe6` (warmes Gelb) |
| `theme_color` | `#e74c3c` (Rot, passend zum Osterei-Icon) |
| Icons | Rotes Osterei in 192 × 192 und 512 × 512 |

### 7.2 `service-worker.js`

- Caching aller statischen Assets (HTML, CSS, JS, Icons).
- Cache-first-Strategie für Offline-Fähigkeit.

---

## 8. Responsive Design

| Breakpoint | Anpassung |
|---|---|
| **Desktop (> 768 px)** | Volle Szene, Hase mittig, Steuerung via Tastatur + Maus. |
| **Tablet / Mobil (≤ 768 px)** | Szene skaliert, Touch-Steuerung, größere Buttons, Spielfeld füllt Viewport. |

- Spielfeld nutzt relative Einheiten (`vw`, `vh`, `%`).
- Hase und Eier skalieren proportional.
- Touch-Events für Wischen auf Mobilgeräten.

---

## 9. Zusammenfassung: konfigurierbare Parameter

| Parameter | Ort | Beschreibung |
|---|---|---|
| `milestones` | `config.js` | Array von `{ n, text }` – Punktestand-Meilensteine und zugehörige Texte |
| `milestoneDisplayDuration` | `config.js` | Anzeigedauer T der Meilenstein-Texte (Sekunden) |
| `difficulty` | `config.js` | Array von `{ fromScore, maxEggs }` – Schwierigkeitskurve |
| `eggFallSpeed` | `config.js` | Fallgeschwindigkeit der Eier (px / Frame) |
| `maxLives` | `config.js` | Anzahl Leben |
| `brokenEggDuration` | `config.js` | Dauer, bis zerbrochene Eier verschwinden (Sekunden) |
