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

    // Erstelle den QR-Code
    var qrcode = new QRCode(document.getElementById("qrcode"), {
        text: text,
        width: 300,  // Größe des QR-Codes
        height: 300, // Größe des QR-Codes
        colorDark : "#000000",  // Farbe des QR-Codes
        colorLight : "#ffffff", // Hintergrundfarbe
        correctLevel : QRCode.CorrectLevel.H // Fehlerkorrektur-Level (L, M, Q, H)
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