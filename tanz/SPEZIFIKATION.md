# Spezifikation – Tanz-Musik-PWA (YouTube-Variante)

## 1. Ziel & Kurzbeschreibung

Eine installierbare Progressive Web App (PWA), mit der zu jedem Tanz (z. B. ChaCha)
eine feste Auswahl von ca. 3–5 Liedern abgespielt werden kann. Die Musik kommt über
**YouTube** (eingebetteter Player, Option A). Die App dient als Fernbedienung/Abspieler
für das Tanztraining und soll auf dem Smartphone einfach bedienbar sein.

---

## 2. Festgelegte Entscheidungen (aus Rückfragen)

| Thema | Entscheidung |
|---|---|
| Musikquelle | YouTube, eingebettet via **IFrame Player API** (Option A) |
| Technik-Stack | **Vanilla JS** (HTML/CSS/JS, kein Framework, kein Build-Tool) |
| Zielgerät | **Smartphone, Hochformat** (responsive, mobile-first) |
| Hosting | **GitHub Pages** |
| Player-Darstellung | **Video versteckt** – nur Ton, Steuerung über eigene Buttons |
| Songverwaltung | **Vorgegebene Liste + eigene Songs ergänzen** (lokal gespeichert) |
| Wiedergabemodus | **Umschaltbar**: Autoplay (nächster Song automatisch) ODER Einzelsong |
| Songausschnitte | Nein – immer kompletter Song |
| Zusatzfunktionen | **Dark Mode**, **Loop/Wiederholen** |

---

## 3. Tänze (Kategorien)

Vorgegebene Kategorien (Reihenfolge wie unten):

1. ChaCha
2. Rumba
3. Samba
4. Jive
5. Paso Doble
6. Langsamer Walzer
7. Wiener Walzer
8. Tango
9. Slowfox
10. Quickstep

Je Tanz sind ca. 3–5 Songs vorgesehen (Anzahl frei, keine harte Grenze).

---

## 4. Funktionsumfang

### 4.1 Tanz-Übersicht (Startansicht)
- Liste/Kacheln aller 10 Tänze.
- Tippen auf einen Tanz öffnet dessen Songliste.
- Anzeige der Song-Anzahl pro Tanz (optional).

### 4.2 Songliste pro Tanz
- Zeigt alle Songs des gewählten Tanzes (Titel + optional Interpret).
- Tippen auf einen Song startet die Wiedergabe.
- Aktuell laufender Song wird hervorgehoben.
- Möglichkeit, eigene Songs hinzuzufügen und eigene wieder zu löschen.

### 4.3 Player (versteckter YouTube-Player + eigene Steuerung)
Eigene Steuerleiste mit:
- ▶️ Play / ⏸️ Pause
- ⏭️ Nächster Song / ⏮️ Vorheriger Song
- 🔊 Lautstärke
- Fortschrittsanzeige (aktuelle Zeit / Gesamtzeit)
- 🔁 Loop-Umschalter (Song/Playlist wiederholen)
- Umschalter **Wiedergabemodus**: „Autoplay nächster" ↔ „Einzelsong"
- Anzeige des aktuellen Songtitels

### 4.4 Songs hinzufügen (eigene)
- Eingabe per **YouTube-Link oder Video-ID** + optionalem Titel.
- Zuordnung zu einem Tanz.
- Speicherung lokal im Browser (`localStorage`), bleibt nach Neuladen erhalten.
- Vorgegebene Songs bleiben bestehen; eigene werden zusätzlich angezeigt.

### 4.5 Darstellung / UX
- **Dark Mode** (umschaltbar, Einstellung wird gespeichert).
- Mobile-first, große Touch-Flächen, Hochformat optimiert.
- Klare, ablenkungsarme Oberfläche für den Einsatz im Training.

### 4.6 PWA-Eigenschaften
- Installierbar (Web App Manifest, Icons, Name, Theme-Farbe).
- Service Worker für App-Shell-Caching (UI lädt offline).
- **Hinweis:** Die YouTube-Inhalte selbst benötigen eine Internetverbindung
  (nur die App-Hülle funktioniert offline, nicht die Musikwiedergabe).

---

## 5. Datenmodell

Songs werden in zwei Quellen zusammengeführt: eine mitgelieferte `songs.json`
(Vorgaben) und `localStorage` (eigene Ergänzungen).

```jsonc
// songs.json – vorgegebene Songs
{
  "chacha": [
    { "id": "VIDEO_ID", "title": "Songtitel", "artist": "Interpret" }
  ],
  "rumba": [ /* ... */ ],
  "samba": [],
  "jive": [],
  "pasodoble": [],
  "langsamerwalzer": [],
  "wienerwalzer": [],
  "tango": [],
  "slowfox": [],
  "quickstep": []
}
```

Tanz-Definition (Schlüssel + Anzeigename) wird in einer `dances`-Konfiguration gepflegt.

Eigene Songs im `localStorage` folgen demselben Song-Schema und werden pro Tanz
an die Vorgaben angehängt.

---

## 6. Technische Umsetzung

### 6.1 YouTube IFrame Player API
- Einbindung über `https://www.youtube.com/iframe_api`.
- Ein (einzelner) Player-Container, visuell versteckt (z. B. außerhalb des
  sichtbaren Bereichs positioniert bzw. minimal dimensioniert), Steuerung
  ausschließlich über eigene Buttons.
- Steuerung via `playVideo()`, `pauseVideo()`, `loadVideoById()`, `setVolume()`,
  `getCurrentTime()`, `getDuration()` sowie `onStateChange` für Autoplay-Logik.

### 6.2 Wichtige Rahmenbedingungen / Einschränkungen
- **Autoplay mit Ton** ist auf Mobilgeräten nur nach einer ersten
  Nutzer-Interaktion erlaubt (Browser-Richtlinie). Der erste Start erfolgt daher
  immer per Tastendruck des Nutzers.
- **Hintergrundwiedergabe** (Bildschirm aus / anderer Tab) ist bei eingebettetem
  YouTube auf Mobilgeräten eingeschränkt – kein garantiertes Weiterspielen bei
  gesperrtem Bildschirm.
- Nicht jedes Video ist einbettbar; nicht einbettbare Videos können nicht
  abgespielt werden.
- Ohne YouTube Premium kann **Werbung** vor/zwischen Videos erscheinen.
- „YouTube Music"-App wird nicht gesteuert – es handelt sich um einbettbare
  normale YouTube-Videos.

### 6.3 Projektstruktur (geplant)

```
/
├── index.html          # App-Shell / Einstiegspunkt
├── manifest.webmanifest
├── sw.js               # Service Worker (App-Shell-Caching)
├── css/
│   └── styles.css      # Mobile-first, Dark Mode
├── js/
│   ├── app.js          # UI-Steuerung, Navigation, Views
│   ├── player.js       # YouTube IFrame Player + Wiedergabelogik
│   └── store.js        # Laden/Mergen von songs.json + localStorage
├── data/
│   └── songs.json      # Vorgegebene Songs pro Tanz
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 7. Nicht im Umfang (bewusst ausgeschlossen)

- Start-/Endzeiten bzw. Songausschnitte.
- Shuffle, Timer pro Song, globale Suche/Filter.
- Offline-Wiedergabe der Musik (nur App-Hülle offline).
- Steuerung externer Apps (YouTube Music, Amazon Prime Music).
- Benutzerkonten / Cloud-Synchronisation (alles lokal im Browser).

---

## 8. Geklärte Punkte (ehemals offen)

1. **Song-Inhalte:** Die Tänze wurden mit **Platzhalter-Songs** gefüllt, deren
   Titel/Interpreten jeweils zum Tanz passen (`data/songs.json`).
   ⚠️ Die hinterlegten YouTube-IDs sind **noch nicht als einbettbar verifiziert** –
   viele offizielle Musikvideos lassen sich nicht einbetten (siehe 6.2). Gültige,
   einbettbare IDs müssen bei Bedarf ersetzt werden (am zuverlässigsten
   „– Topic"-Kanäle). Hinzufügen/Ersetzen: in der App oder direkt in `songs.json`.
2. **App-Name & Icon:** Name = **MyDanceMusicPlayer**. Icon = **Disco-Kugel**
   (`icons/icon.svg`), Design mit **popigen, bunten Farben**, inkl. Dark-/Light-Modus.
3. **Veröffentlichung:** Die Struktur ist als **statische Dateien mit relativen
   Pfaden ohne Build-Schritt** angelegt und damit direkt **GitHub-Pages-fertig**
   (Repo-Inhalt hochladen, Pages aktivieren – kein Umbau nötig).

---

## 9. Stand der Umsetzung

Die PWA ist gemäß dieser Spezifikation umgesetzt und lokal getestet:

- App-Navigation (10 Tänze → Songliste → Player), Design und Steuerung funktionieren.
- Die YouTube-Player-Technik ist nachweislich funktionsfähig (verifiziert mit
  einbettbaren Test-IDs).
- **Einschränkung:** Die aktuell in `songs.json` hinterlegten Platzhalter-IDs sind
  teils nicht einbettbar und müssen durch gültige ersetzt werden (siehe 8.1).

Offener nächster Schritt nach Freigabe: einbettbare Song-IDs eintragen und auf
GitHub Pages veröffentlichen.
```
