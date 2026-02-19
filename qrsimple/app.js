
// Status: functional, but NO QR-Code generation sometimes fails silently (no error message due to library limitations); in mode Error Correction=M it fails at around 1270 bytes, in mode H at around 1273 bytes;

// Description
// QR-Code Generator
// - uses QRCode.js library from https://github.com/davidshimjs/qrcodejs
//   - does not give error responses, but fails silently if text exceeds capacity for selected error correction level
//   - max capacity: ~2953 bytes (L), ~2331 bytes (M), ~1663 bytes (Q), ~1273 bytes (H) for UTF-8 text
//   - multi-byte characters reduce total character count significantly
//   - is able to encode UTF-8 text, but actual byte length must be considered for limits
// - HTML file has: <meta charset="UTF-8">, so all user inputs will be treated as UTF-8
// - Templates: should either contain only ASCII characters OR HTML file should be saved with UTF-8 encoding to ensure correct byte length calculation

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
    
    console.log('Text bytes:', new TextEncoder().encode(text).length);
    console.log('Correction level:', corrLevelVal, '→', levelConst);

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
ADR;TYPE=work:;;<Strasse und Hausnummer>;<Ort>;<Bundesland>;<PLZ>;<Land>
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

function updateInputStatus() {
    // Performs byte length calculation and updates status display, also applies red color if over limit
    var textarea = document.getElementById('text-input');
    var statusEl = document.getElementById('input-status');
    var levelInput = document.getElementById('level-range');
    
    if (!textarea || !statusEl || !levelInput) return;
    
    var text = textarea.value;
    var charCount = text.length;
    var byteCount = new TextEncoder().encode(text).length;
    var corrLevelVal = parseInt(levelInput.value, 10);
    
    var limitsInByte = {
        1: 2940,  // L
        2: 1270,  // M Theoretically: 2331 byte, but it does not work
        3: 1660,  // Q
        4: 1270   // H
    };
    var maxBytesCount = limitsInByte[corrLevelVal] || 1273;
    var isOverLimit = byteCount > maxBytesCount;
    
    // Format with padding for fixed width display
    var byteStr = String(byteCount).padStart(4, ' ');
    var charStr = String(charCount).padStart(4, ' ');
    var maxByteStr = String(maxBytesCount).padStart(4, ' ');
    
    statusEl.textContent = 'User input: ' + byteStr + ' byte (' + charStr + ' characters), Max approx.: ' + maxByteStr + ' byte';
    
    // Apply red color if over limit
    if (isOverLimit) {
        statusEl.classList.add('input-status-overflow');
    } else {
        statusEl.classList.remove('input-status-overflow');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateSizeValue(document.getElementById('size-range') ? document.getElementById('size-range').value : 300);
    updateLevelValue(document.getElementById('level-range') ? document.getElementById('level-range').value : 4);
    updateInputStatus();
});