/* ============================================================
   titel.js – Logik für die Titel-Seite (Ohrenwackeln)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
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
