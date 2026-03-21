/* ============================================================
   titel.js – Logik für die Titel-Seite (Ohrenwackeln)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Titeltext aus CONFIG setzen
    const titleEl = document.getElementById('frohe-ostern');
    if (titleEl && typeof CONFIG !== 'undefined') {
        const line1 = document.querySelector('.frohe-ostern-line1');
        const line2 = document.querySelector('.frohe-ostern-line2');
        if (line1 && CONFIG.titleLine1) line1.textContent = CONFIG.titleLine1;
        if (line2 && CONFIG.titleLine2) line2.textContent = CONFIG.titleLine2;
    }

    const bunny = document.querySelector('.bunny-container');
    const earLeft = document.querySelector('.ear-left');
    const earRight = document.querySelector('.ear-right');

    if (!bunny || !earLeft || !earRight) return;

    bunny.addEventListener('click', (e) => {
        // Nur auf Kopfbereich reagieren (obere Hälfte des SVGs)
        const rect = bunny.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        if (clickY > rect.height * 0.45) return;

        // Vorherige Animation entfernen und neu starten
        earLeft.classList.remove('wiggle');
        earRight.classList.remove('wiggle');

        // Reflow erzwingen, damit die Animation neu startet
        void earLeft.offsetWidth;

        earLeft.classList.add('wiggle');
        earRight.classList.add('wiggle');
    });

    // Animation-Klassen nach Ablauf entfernen
    earLeft.addEventListener('animationend', () => {
        earLeft.classList.remove('wiggle');
    });
    earRight.addEventListener('animationend', () => {
        earRight.classList.remove('wiggle');
    });
});
