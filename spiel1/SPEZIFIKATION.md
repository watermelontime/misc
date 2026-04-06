# Spezifikation: Mensch ärgere Dich nicht

## 1. Übersicht

Ein digitales Brettspiel „Mensch ärgere Dich nicht" für 2–4 Spieler.  
Technologie: reines HTML / CSS / JavaScript – keine Frameworks.  
Grafiken: CSS und inline-SVG (keine externen Bilddateien für Spielelemente).  
Alle Spieler spielen lokal am selben Gerät (Hot-Seat-Modus).

Verzeichnis: `spiel/`

---

## 2. Dateistruktur

```
spiel/
├── index.html            ← Hauptseite (Startbildschirm + Spielfeld)
├── styles.css            ← Alle Styles
├── spiel.js              ← Spiel-Logik (Regeln, Züge, KI-frei)
├── board.js              ← Spielfeld-Rendering (SVG-Aufbau)
├── dice.js               ← Würfel-Animation und -Logik
├── config.js             ← Zentrale Konfigurationsdatei
├── manifest.json         ← PWA-Manifest
├── service-worker.js     ← Service Worker
└── images/
    ├── icon-192x192.png  ← PWA-Icon
    └── icon-512x512.png  ← PWA-Icon
```

---

## 3. Konfigurationsdatei (`config.js`)

Alle spielrelevanten Parameter werden zentral definiert:

```javascript
const CONFIG = {
  // Spielerfarben (Index 0–3)
  colors: ["#E53935", "#1E88E5", "#43A047", "#FDD835"],

  // Spielernamen (Standardwerte)
  playerNames: ["Rot", "Blau", "Grün", "Gelb"],

  // Anzahl Figuren pro Spieler
  figuresPerPlayer: 4,

  // Anzahl Felder auf dem Rundkurs
  boardFields: 40,

  // Felder pro Spieler im Zielbereich
  homeFields: 4,

  // Startfeld-Indizes (auf dem 40-Felder-Rundkurs) je Spieler
  startFieldIndex: [0, 10, 20, 30],

  // Würfel-Animationsdauer in Millisekunden
  diceAnimationDuration: 800,

  // Verzögerung bei Figur-Bewegung pro Feld (ms)
  moveStepDelay: 200,

  // Anzahl Würfelversuche wenn alle Figuren in Startposition
  maxDiceAttemptsAllHome: 3
};
```

---

## 4. Spielregeln

### 4.1 Grundprinzip

- Jeder Spieler besitzt 4 Spielfiguren einer Farbe.
- Ziel: Alle 4 eigenen Figuren vom Startbereich über den Rundkurs in den eigenen Zielbereich (die 4 „Häuschen") bringen.
- Gespielt wird reihum im Uhrzeigersinn.
- Über die Anzahl der zu ziehenden Felder entscheidet ein Würfel (1–6).

### 4.2 Spielbeginn

- Der Spieler wählt die Anzahl der Spieler (2, 3 oder 4) auf dem Startbildschirm.
- Zu Beginn stehen alle 4 Figuren jedes Spielers im Startbereich (B-Felder).
- Es wird reihum gewürfelt. Das Spiel beginnt mit Spieler 1 (Rot).

### 4.3 Figur ins Spiel bringen

- Eine Figur kann nur mit einer **6** aus dem Startbereich auf das eigene Startfeld (A-Feld) gesetzt werden.
- Steht bereits eine eigene Figur auf dem Startfeld, muss mit dieser gezogen werden (Startfeld freihalten).
- Hat ein Spieler **keine Figur auf dem Spielfeld** (alle in Startbereich oder Zielbereich), hat er **3 Würfelversuche**, um eine 6 zu würfeln.
- Hat ein Spieler mindestens eine Figur auf dem Spielfeld, wird nur einmal gewürfelt (außer bei einer 6).

### 4.4 Ziehen

- Der Spieler zieht eine Figur um die gewürfelte Augenzahl vorwärts auf dem Rundkurs.
- Die gewürfelte Zahl darf **nicht** auf mehrere Figuren aufgeteilt werden.
- Hat ein Spieler mehrere Figuren im Spiel, wählt er per **Klick/Tipp auf die Figur**, welche er ziehen möchte.
- Es werden nur Figuren hervorgehoben, die einen gültigen Zug haben.
- Hat nur eine Figur einen gültigen Zug, wird diese automatisch gezogen.

### 4.5 Sechs gewürfelt

- Wer eine **6** würfelt:
  1. **Muss** eine Figur aus dem Startbereich auf das Startfeld stellen, **falls** noch Figuren im Startbereich sind **und** das Startfeld nicht von einer eigenen Figur besetzt ist.
  2. Sind keine Figuren im Startbereich, darf er frei wählen, welche Figur er zieht.
  3. Nach dem Zug darf er **erneut würfeln**.

### 4.6 Schlagen

- Landet eine Figur auf einem Feld, das von einer **gegnerischen** Figur besetzt ist, wird diese geschlagen.
- Die geschlagene Figur wird zurück in den Startbereich des Gegners gesetzt.
- Es besteht **kein Schlagzwang** (der Spieler kann eine andere Figur ziehen).

### 4.7 Blockade durch eigene Figuren

- Ist das Zielfeld bereits von einer **eigenen** Figur besetzt, ist der Zug **ungültig**.
- Der Spieler muss eine andere Figur wählen oder – wenn kein gültiger Zug möglich ist – aussetzen.

### 4.8 Zielbereich (Häuschen)

- Hat eine Figur den Rundkurs komplett umrundet, zieht sie in den eigenen Zielbereich.
- Im Zielbereich wird exakt vorgerückt; die Figur muss mit genauer Augenzahl einziehen.
- Figuren im Zielbereich können **nicht geschlagen** werden.

### 4.9 Spielende

- Ein Spieler hat gewonnen, wenn alle 4 Figuren im Zielbereich stehen.
- Das Spiel endet sofort mit einer Gewinnmeldung.
- Danach kann ein neues Spiel gestartet werden.

---

## 5. Spielfeld-Layout

### 5.1 Aufbau (SVG)

Das Spielfeld wird als **SVG** gerendert und besteht aus:

1. **Rundkurs**: 40 kreisförmige Felder, angeordnet im klassischen Kreuz-Layout.
2. **Startbereiche**: 4 Bereiche (je einer pro Ecke), jeweils 4 Positionen in Spielerfarbe.
3. **Zielbereiche**: 4 Reihen à 4 farbige Felder, die vom Rundkurs zur Mitte zeigen.
4. **Würfelbereich**: Zentrum des Spielfeldes.

### 5.2 Feld-Anordnung (Kreuz-Schema)

```
        [B][B]    [20][21][22]    [B][B]
        [B][B]    [19]     [23]   [B][B]
                  [18]     [24]
                  [17]     [25]
  [10][11][12][13][14][15][16][17][26][27][28][29]
   [9]    [H][H][H][H]  [WÜRFEL]  [H][H][H][H]    [30]
   [8]    [H][H][H][H]            [H][H][H][H]    [31]
  [38][37][36][35][34][33][32][31][30][29][28][27]
                  [37]     [35]
                  [38]     [34]
        [B][B]    [39]     [33]   [B][B]
        [B][B]    [ 0][ 1][ 2]    [B][B]
```

*(Schematische Darstellung – exakte Positionen werden in `board.js` als Koordinaten-Array definiert.)*

### 5.3 Koordinatensystem

- SVG-Viewbox: `0 0 600 600`
- Alle Positionen werden als `{x, y}`-Paare in Arrays gespeichert:
  - `BOARD_POSITIONS[0..39]` – Rundkurs
  - `START_POSITIONS[player][0..3]` – Startbereiche
  - `HOME_POSITIONS[player][0..3]` – Zielbereiche
- Feldradius: 14px (Rundkurs), 12px (Start/Ziel)
- Figurradius: 11px

### 5.4 Farbschema

| Spieler | Farbe   | Hex-Code  | Position   |
|---------|---------|-----------|------------|
| 1       | Rot     | `#E53935` | Links unten |
| 2       | Blau    | `#1E88E5` | Links oben  |
| 3       | Grün    | `#43A047` | Rechts oben |
| 4       | Gelb    | `#FDD835` | Rechts unten|

### 5.5 Startfelder auf dem Rundkurs

| Spieler | Startfeld-Index (A-Feld) |
|---------|--------------------------|
| Rot     | 0                        |
| Blau    | 10                       |
| Grün    | 20                       |
| Gelb    | 30                       |

---

## 6. Startbildschirm

### 6.1 Layout

- Zentriertes Overlay über dem (im Hintergrund sichtbaren) Spielfeld.
- Titel: **„Mensch ärgere Dich nicht"** (große Schrift, dekorativ).
- Spielerauswahl: Buttons für **2**, **3** oder **4** Spieler.
- Start-Button: **„Spiel starten"** (erst aktiv, wenn Spieleranzahl gewählt).

### 6.2 Spieler-Konfiguration

- Bei 2 Spielern: Rot und Grün (gegenüber).
- Bei 3 Spielern: Rot, Blau und Grün.
- Bei 4 Spielern: alle vier Farben.

---

## 7. Würfel

### 7.1 Position

- Der Würfel befindet sich **im Zentrum** des Spielfeldes.

### 7.2 Darstellung

- 3D-Würfel mit CSS-Transforms (`perspective`, `rotateX`, `rotateY`, `rotateZ`).
- Sechs Seiten mit den klassischen Augenzahlen (1–6) als Punkte dargestellt.
- Weiße Flächen, schwarze Punkte, abgerundete Ecken.
- Größe: ca. 60×60px.

### 7.3 Animation

- **Auslöser**: Klick / Tipp auf den Würfel.
- Der Würfel ist nur klickbar, wenn der aktuelle Spieler am Zug ist und gewürfelt werden muss.
- **Animation**: Der Würfel dreht sich mit zufälligen Rotationen um alle drei Achsen (CSS `@keyframes` oder JS-gesteuerte Transitions).
- **Dauer**: ca. 800 ms (konfigurierbar in `config.js`).
- Während der Animation wird ein zufälliges Ergebnis (1–6) ermittelt.
- Am Ende der Animation stoppt der Würfel exakt auf der Seite, die dem Ergebnis entspricht.

### 7.4 Visuelles Feedback

- Der Würfel hat einen **Glow-Effekt** in der Farbe des aktuellen Spielers.
- Ist der Würfel klickbar, pulsiert er leicht (CSS-Animation) als Aufforderung.
- Während der Animation ist der Würfel nicht klickbar.

---

## 8. Spielfiguren

### 8.1 Darstellung

- Jede Figur ist ein **SVG-Kreis** mit:
  - Füllung in Spielerfarbe
  - Dunklem Rand (2px)
  - Leichter Schattierung (radialer Gradient) für 3D-Effekt
- Figuren im Startbereich sind leicht transparent (opacity: 0.6).
- Figuren auf dem Spielfeld haben volle Deckkraft.

### 8.2 Interaktion

- Figuren, die einen gültigen Zug haben, werden **hervorgehoben**:
  - Pulsierender Rand / Glow-Animation
  - Cursor wechselt zu `pointer`
- Klick/Tipp auf eine hervorgehobene Figur wählt sie für den Zug aus.
- Nicht-ziehbare Figuren reagieren nicht auf Klick.

### 8.3 Bewegungsanimation

- Figuren bewegen sich **Feld für Feld** mit `CONFIG.moveStepDelay` (200 ms) Verzögerung.
- Die Figur gleitet per CSS-Transition von Position zu Position.
- Beim Schlagen: Die geschlagene Figur blinkt kurz rot und bewegt sich dann zurück in den Startbereich.

---

## 9. Spielablauf (Zustandsmaschine)

### 9.1 Zustände

```
SETUP → ROLL_DICE → PICK_FIGURE → ANIMATE_MOVE → CHECK_STATE → [ROLL_DICE | GAME_OVER]
```

| Zustand       | Beschreibung                                                                 |
|---------------|------------------------------------------------------------------------------|
| `SETUP`       | Startbildschirm – Spieleranzahl wählen.                                     |
| `ROLL_DICE`   | Warten auf Würfelklick. Würfel pulsiert.                                    |
| `ROLLING`     | Würfelanimation läuft. Keine Interaktion möglich.                           |
| `PICK_FIGURE` | Spieler wählt Figur. Gültige Figuren hervorgehoben.                         |
| `ANIMATE_MOVE`| Figur bewegt sich Feld für Feld.                                            |
| `CHECK_STATE` | Prüfung: Schlagen? Zielbereich erreicht? Gewonnen? Nächster Spieler? Nochmal würfeln? |
| `GAME_OVER`   | Gewinnermeldung + „Neues Spiel"-Button.                                     |

### 9.2 Ablauf pro Zug

1. **ROLL_DICE**: Anzeige „Spieler X ist dran". Würfel pulsiert in Spielerfarbe. Spieler klickt Würfel.
2. **ROLLING**: Animation läuft, Ergebnis wird ermittelt.
3. **Sonderfall – Alle Figuren im Start**:
   - Ist das Ergebnis keine 6 → Versuch zählen (-1 von 3).
   - Sind Versuche übrig → zurück zu ROLL_DICE.
   - Keine Versuche übrig → nächster Spieler.
4. **Ergebnis 6, Figuren im Startbereich vorhanden**:
   - Ist das Startfeld (A-Feld) von eigener Figur blockiert → Spieler wählt Figur zum Ziehen (PICK_FIGURE mit 6 Feldern).
   - Ist das Startfeld frei → Figur wird automatisch auf A-Feld gesetzt. Erneut würfeln.
5. **Ergebnis 1–5 (oder 6 ohne Startbereich-Figuren)**:
   - Gültige Züge berechnen.
   - Kein gültiger Zug → nächster Spieler.
   - Genau ein gültiger Zug → automatisch ausführen.
   - Mehrere gültige Züge → PICK_FIGURE (Spieler wählt).
6. **ANIMATE_MOVE**: Figur bewegen. Schlagen prüfen.
7. **CHECK_STATE**: Gewonnen? → GAME_OVER. War eine 6 → erneut ROLL_DICE. Sonst → nächster Spieler.

---

## 10. UI-Elemente

### 10.1 Statusleiste

- Position: **oberhalb** des Spielfeldes.
- Inhalt:
  - Aktueller Spieler (Name + Farbpunkt)
  - Gewürfelte Zahl (nach dem Würfeln)
  - Hinweistext (z. B. „Würfle!", „Wähle eine Figur", „Keine Zugmöglichkeit")

### 10.2 Spieler-Info

- Position: neben dem Spielfeld oder unterhalb (responsive).
- Zeigt für jeden aktiven Spieler:
  - Farbpunkt + Name
  - Anzahl Figuren im Ziel / 4

### 10.3 Gewinn-Dialog

- Overlay über dem Spielfeld.
- Text: **„🎉 [Spielername] hat gewonnen!"**
- Konfetti-Animation (CSS-Keyframes, bunte fallende Partikel).
- Button: **„Neues Spiel"** → zurück zum Startbildschirm.

---

## 11. Responsive Design

### 11.1 Desktop (> 768px)

- Spielfeld zentriert, max. 600×600px.
- Statusleiste und Spieler-Info links/rechts.

### 11.2 Mobil (≤ 768px)

- Spielfeld nimmt volle Breite ein (mit Padding).
- Statusleiste oben, Spieler-Info unten.
- Touch-Targets min. 44×44px (Figuren und Würfel).

### 11.3 Skalierung

- SVG skaliert automatisch via `viewBox`.
- Würfel (HTML/CSS) skaliert mit `vmin`-Einheiten.

---

## 12. Technische Details

### 12.1 Spielfeld (`board.js`)

- Erzeugt das SVG-Element mit allen Feldern, Startbereichen und Zielbereichen.
- Exportiert Funktionen:
  - `createBoard(container)` – SVG in Container einfügen.
  - `getFieldPosition(type, player, index)` – Koordinaten eines Feldes.
  - `placeFigure(player, figure, type, index)` – Figur positionieren.
  - `highlightFigures(figures[])` – Gültige Figuren hervorheben.
  - `clearHighlights()` – Hervorhebung entfernen.

### 12.2 Würfel (`dice.js`)

- Erzeugt den 3D-Würfel als HTML/CSS-Element.
- Exportiert Funktionen:
  - `createDice(container)` – Würfel in Container einfügen.
  - `rollDice()` → `Promise<number>` – Animation starten, Ergebnis zurückgeben.
  - `setDiceClickable(enabled, color)` – Klickbarkeit und Glow-Farbe setzen.

### 12.3 Spiellogik (`spiel.js`)

- Zustandsmaschine gemäß Abschnitt 9.
- Datenmodell:

```javascript
// Zustand einer Figur
// position: { type: 'start'|'board'|'home', index: number }
const gameState = {
  playerCount: 4,
  currentPlayer: 0,        // 0–3
  players: [
    {
      color: '#E53935',
      name: 'Rot',
      figures: [
        { position: { type: 'start', index: 0 } },
        { position: { type: 'start', index: 1 } },
        { position: { type: 'start', index: 2 } },
        { position: { type: 'start', index: 3 } }
      ]
    },
    // ... weitere Spieler
  ],
  diceResult: null,
  attemptsLeft: 0,
  state: 'SETUP'  // 'SETUP'|'ROLL_DICE'|'ROLLING'|'PICK_FIGURE'|'ANIMATE_MOVE'|'CHECK_STATE'|'GAME_OVER'
};
```

- Wichtige Funktionen:
  - `getValidMoves(player, diceResult)` → Array der ziehbaren Figuren mit Zielposition.
  - `moveFigure(player, figureIndex, targetPosition)` – Figur ziehen + Schlagen prüfen.
  - `checkWin(player)` → boolean.
  - `nextPlayer()` – Nächsten Spieler ermitteln.
  - `boardIndexForPlayer(player, steps)` – Absoluten Board-Index aus Spieler-Startfeld + Schritte berechnen.

### 12.4 Kollisionserkennung

```javascript
// Prüfe ob auf boardIndex eine gegnerische Figur steht
function getOpponentFigureAt(boardIndex, currentPlayer) {
  for (let p = 0; p < gameState.playerCount; p++) {
    if (p === currentPlayer) continue;
    for (let f = 0; f < CONFIG.figuresPerPlayer; f++) {
      if (gameState.players[p].figures[f].position.type === 'board'
          && gameState.players[p].figures[f].position.index === boardIndex) {
        return { player: p, figure: f };
      }
    }
  }
  return null;
}
```

### 12.5 Zugvalidierung

Ein Zug ist gültig, wenn:
1. Die Figur dem aktuellen Spieler gehört.
2. Das Zielfeld nicht von einer eigenen Figur besetzt ist.
3. Die Figur nicht über eigene Figuren im Zielbereich springt.
4. Bei Figuren im Startbereich: nur bei Würfelergebnis 6, und Zielfeld ist das A-Feld.
5. Figuren im Zielbereich: nur weiter nach vorne, nicht rückwärts, nicht über Zielbereich hinaus.

---

## 13. Besondere Regeln – Zusammenfassung

| Regel                       | Beschreibung                                                              |
|-----------------------------|---------------------------------------------------------------------------|
| **6 = Raus**                | Bei einer 6 muss eine Figur aus dem Start auf das A-Feld gestellt werden, sofern möglich. |
| **6 = Nochmal**             | Nach einer 6 darf/muss erneut gewürfelt werden.                           |
| **3 Versuche**              | Hat ein Spieler keine Figur auf dem Feld, darf er 3× würfeln.             |
| **Startfeld freihalten**    | Das A-Feld muss so schnell wie möglich geräumt werden.                    |
| **Schlagen**                | Gegnerische Figur auf dem Zielfeld wird zurück in den Start geschickt.    |
| **Kein Selbstschlagen**     | Eigene Figuren können nicht geschlagen werden; Zug ist ungültig.          |
| **Zielbereich exakt**       | In den Zielbereich muss mit genauer Augenzahl eingezogen werden.          |

---

## 14. Sounds (optional, Stretch Goal)

Aktuell kein Sound vorgesehen. Kann später ergänzt werden:
- Würfelgeräusch beim Rollen
- Klick-Sound beim Figur-Setzen
- Fanfare beim Gewinnen
- „Ärger"-Sound beim Geschlagen-Werden

---

## 15. Barrierefreiheit

- Farben sind kontrastreich gewählt.
- Figuren erhalten zusätzlich unterschiedliche Symbole (Kreis, Dreieck, Quadrat, Raute) für Farbenblinde.
- Spielstatus wird als Text ausgegeben (keine rein visuelle Information).
- Keyboard-Navigation: Tab durch Figuren, Enter zum Auswählen (Stretch Goal).

---

## 16. Performance

- Keine externen Abhängigkeiten.
- SVG-Rendering ist GPU-beschleunigt.
- CSS-Animationen (transform, opacity) nutzen den Compositor-Thread.
- Gesamte App < 100 KB (ohne Icons).
