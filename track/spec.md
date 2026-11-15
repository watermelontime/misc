# Themen-Tracker – Spezifikation

## 1. Ziel

Eine PWA, mit der zu beliebigen Themen (z.B. Allergie, Sport) regelmäßig Zahlenwerte erfasst,
als Historie angezeigt und als Diagramm dargestellt werden.

**Oberste Anforderung: Werte/Einträge dürfen nicht verloren gehen.**

## 2. Rahmenbedingungen

- Zielgerät: ein iPhone (Safari), als PWA zum Home-Bildschirm hinzugefügt
- Kein Server, kein Sync, kein Konto – alle Daten liegen lokal auf dem Gerät
- Vollständig offline nutzbar (Service Worker)
- Technik: reines HTML/JS/CSS ohne Build-Schritt (index.html, JS, CSS, Manifest, Service Worker)
- Auslieferung über GitHub Pages
- Bibliotheken (z.B. für das Diagramm) werden lokal eingebunden, kein CDN
- Sprache der Oberfläche: Deutsch

## 3. Datenmodell

Struktur: Thema → Parameter (1:N), Thema → Einträge (1:N)

### Thema
- Name
- Beliebig viele Themen möglich
- Wird über einen „Neu"-Button angelegt

### Parameter
- Pro Thema 1 bis 8 Parameter; beim Anlegen eines Themas sind 4 vorbelegt
- Name
- Wertebereich (Minimum, Maximum) – pro Parameter wählbar, Standard 0 bis 10
- Einheit – pro Parameter wählbar, optional
- Werte sind ganze Zahlen
- Linienfarbe im Diagramm wird automatisch vergeben

### Eintrag
- Gehört zu genau einem Thema
- Datum und Uhrzeit (vorbelegt mit „jetzt", änderbar)
- Bis zu 8 Werte, einer je Parameter – **alle Werte sind optional**, es werden nur die
  Parameter ausgefüllt, die man gerade erfassen will
- Optionale Notiz (Freitext)
- Mehrere Einträge pro Tag möglich
- Einträge sind editierbar und löschbar

## 4. Oberfläche

### Hauptansicht
- Global: Thema auswählen
- Für das gewählte Thema, von oben nach unten:
  1. Diagramm
  2. Neue Werte eingeben
  3. Werthistorie (neueste Einträge zuerst), jeder Eintrag editierbar und löschbar

### Werteingabe
- Eingabeelement wird automatisch gewählt:
  - Schieberegler bei kleinem Wertebereich (bis 20 Stufen)
  - Zahlenfeld mit +/- Tasten bei größerem Wertebereich
- Eingaben außerhalb des Wertebereichs werden nicht angenommen

### Diagramm
- Ein Liniendiagramm pro Thema, X-Achse = Zeit
- Alle Parameter als Linien in einem Diagramm, **normiert** auf 0–100 % ihres jeweiligen
  Wertebereichs, damit Parameter mit unterschiedlichen Bereichen vergleichbar sind
- Die echten Werte (mit Einheit) sind beim Antippen eines Punktes sichtbar
- Fehlt in einem Eintrag der Wert eines Parameters, wird dessen Linie zwischen den
  vorhandenen Punkten durchgezogen
- Zeitraum per Fingergeste frei zoom- und verschiebbar

### Themen und Parameter verwalten
- Thema: anlegen, umbenennen, löschen
- Parameter: hinzufügen (bis 8), umbenennen, Wertebereich und Einheit ändern, löschen
- Löschen ist endgültig und entfernt auch alle zugehörigen Werte – immer erst nach
  Sicherheitsabfrage

## 5. Speicherung und Datensicherheit

- Speicherung in IndexedDB
- Die App fordert beim Browser „persistent storage" an (`navigator.storage.persist()`),
  damit die Daten nicht automatisch geräumt werden
- Die App zeigt an, ob persistenter Speicher gewährt wurde
- Hinweis in der App, falls sie nicht vom Home-Bildschirm aus läuft (auf iOS können Daten
  im normalen Safari-Tab nach 7 Tagen Inaktivität gelöscht werden)
- Jede Eingabe wird sofort gespeichert (kein „Speichern vergessen")
- Updates der App (neue Version über GitHub Pages) dürfen bestehende Daten nicht verändern
  oder löschen; das Datenformat trägt eine Versionsnummer für spätere Migrationen

## 6. Export und Import

- Export: eine JSON-Datei mit allem (Themen, Parameter, Einträge, Notizen), Dateiname mit Datum
- Import einer solchen JSON-Datei; sind bereits Daten vorhanden, wählt der Nutzer:
  - **Bestand ersetzen** (nach Sicherheitsabfrage) oder
  - **Zusammenführen** (identische Einträge werden übersprungen, nichts wird gelöscht)
- Eine ungültige oder beschädigte Datei wird abgelehnt, ohne den Bestand zu verändern

## 7. Beispiel

**Thema 1: Allergie**
| Parameter | Bereich | Bemerkung |
|---|---|---|
| Niesen | 0 bis 10 | 0 gut, 10 starke Beschwerden |
| Augen | 0 bis 10 | |
| Nase | 0 bis 10 | |
| Allgemeinbefinden | 0 bis 10 | |
| Erkältung | 0 bis 10 | |

**Thema 2: Sport**
| Parameter | Bereich |
|---|---|
| Klimmzüge | 0 bis 100 |
| Bauchaufzüge | 0 bis 100 |

## 8. Offene Punkte

- Wertebereich nachträglich ändern: Was passiert mit vorhandenen Werten außerhalb des neuen Bereichs?
  Antwort: Wert bleibt wie er ist, jedoch gilt der neue Bereich, das heißt im Diagramm wir der Maximalwert des Bereichs angezeigt, statt dem zu hohen Wert
- Namen der 4 vorbelegten Parameter beim Anlegen eines Themas („Parameter 1" … „Parameter 4"?)
  Antwort: Ja
- Reihenfolge der Parameter und Themen änderbar?
  Antwort: Ja
- Anzeige „letzter Export am …" als Erinnerung an ein Backup?
  Antwort: Nein
- Diagramm-Bibliothek (z.B. Chart.js mit Zoom-Plugin oder uPlot) oder selbst gezeichnet?
  Antwort: Ja, mit Diagramm-Bibliothek. Entscheide du, welche am besten passt.
