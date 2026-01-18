function generateQRCode() {
    // Hole den Text aus dem Eingabefeld
    var text = document.getElementById('text-input').value;

    // Überprüfe, ob der Text nicht leer ist
    if (text.trim() === '') {
        alert('Bitte Text eingeben!');
        return;
    }

    // Lösche den vorherigen QR-Code, falls einer existiert
    document.getElementById('qrcode').innerHTML = '';

    // Lese Steuerungswerte (Größe und Fehlerkorrektur)
    var sizeInput = document.getElementById('size-range');
    var corrLevelInput = document.getElementById('level-range');
    var size = sizeInput ? parseInt(sizeInput.value, 10) : 300;
    var corrLevelVal = corrLevelInput ? parseInt(corrLevelInput.value, 10) : 4;

    var levelMap = {
        1: QRCode.CorrectLevel.L,
        2: QRCode.CorrectLevel.M,
        3: QRCode.CorrectLevel.Q,
        4: QRCode.CorrectLevel.H
    };
    var levelConst = levelMap[corrLevelVal] || QRCode.CorrectLevel.H;

    // Erstelle den QR-Code
    var qrcode = new QRCode(document.getElementById("qrcode"), {
        text: text,
        width: size,  // Größe des QR-Codes
        height: size, // gleiche Breite/Höhe für quadratischen Code
        colorDark : "#000000",  // Farbe des QR-Codes
        colorLight : "#ffffff", // Hintergrundfarbe
        correctLevel : levelConst // Fehlerkorrektur-Level (L, M, Q, H)
    });
}

// limits
// Byte/UTF‑8 (CRC: Low/High): up to ~2953 / ~1273 bytes (multi‑byte characters reduce count).
// TODO: count text length before generating and warn if too long?


function downloadQRCode() {
    var canvas = document.querySelector("canvas");
    var imageUrl = canvas.toDataURL("image/png");
    var link = document.createElement("a");
    link.href = imageUrl;
    link.download = "qrcode.png";
    link.click();
}

function insertWifiTemplate() {
    document.getElementById('text-input').value = "WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<PASSWORD>;;";
}

function insertPhoneTemplate() {
    document.getElementById('text-input').value = "tel:<Telefonnummer>";
}

function insertEmailTemplate() {
    document.getElementById('text-input').value = "mailto:<adresse@example.com>";
}

function insertWebsiteTemplate() {
    document.getElementById('text-input').value = "https://<webseite.com>";
}

function insertPlainTemplate() {
    document.getElementById('text-input').value = "<any text you want>";
}

function insertVCardTemplate() {
    document.getElementById('text-input').value =
`BEGIN:VCARD
VERSION:3.0
N:<Nachname>;<Vorname>;;;
FN:<Vorname> <Nachname>
ORG:<Firma>
TEL;TYPE=work,voice:<Telefonnummer>
EMAIL;TYPE=internet:<E-Mail-Adresse>
END:VCARD`;
}

function insertVCardExtendedTemplate() {
    document.getElementById('text-input').value =
`BEGIN:VCARD
VERSION:3.0
N:<Nachname>;<Vorname>;<Mittelname>;<Prefix>;<Suffix>
FN:<Vorname> <Nachname>
ORG:<Firma>;<Abteilung>
TITLE:<Position/Titel>
PHOTO;VALUE=URL;TYPE=JPEG:<https://example.com/pfad/zum/bild.jpg>
TEL;TYPE=cell,voice:<Mobiltelefon>
TEL;TYPE=work,voice:<Telefon Arbeit>
TEL;TYPE=home,voice:<Telefon Privat>
EMAIL;TYPE=work:<arbeit@example.com>
EMAIL;TYPE=home:<privat@example.com>
ADR;TYPE=work:;;<Straße und Hausnummer>;<Ort>;<Bundesland>;<PLZ>;<Land>
URL:<https://webseite.example.com>
NOTE:<Notizen oder weitere Details>
END:VCARD`;
}

// UI-Helfer: Live-Anzeige der Range-Werte
function updateSizeValue(val) {
    var el = document.getElementById('size-value');
    if (el) el.textContent = parseInt(val, 10);
}

function updateLevelValue(val) {
    var el = document.getElementById('level-value');
    if (!el) return;
    var mapLabel = {1: 'Low', 2: 'Medium', 3: 'Quartile', 4: 'High'};
    el.textContent = mapLabel[parseInt(val, 10)] || 'H';
}

// Initiale Anzeige der Standardwerte nach Laden
updateSizeValue(document.getElementById('size-range') ? document.getElementById('size-range').value : 300);
updateLevelValue(document.getElementById('level-range') ? document.getElementById('level-range').value : 4);