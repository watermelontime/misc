/* ============================================================
   spiel.js – Spiel-Logik für das Ostereier-Fangspiel
   ============================================================ */

(function () {
    'use strict';

    // --- Zustand ---
    let score = 0;
    let lives = CONFIG.maxLives;
    let gameRunning = false;
    let gamePaused = false;        // Pause bei letztem Meilenstein
    let lastMilestoneReached = false;
    let activeEggs = [];
    let brokenEggs = [];
    let spawnTimer = null;
    let rafId = null;
    let lastFrameTime = 0;
    let triggeredMilestones = new Set();

    // --- DOM-Elemente ---
    const scene        = document.querySelector('.game-scene');
    const scoreEl      = document.getElementById('score-value');
    const livesEl      = document.querySelector('.lives-display');
    const startOverlay = document.querySelector('.start-overlay');
    const gameoverEl   = document.querySelector('.gameover-overlay');
    const finalScoreEl = document.getElementById('final-score');
    const milestoneEl  = document.getElementById('milestone-text');
    const milestoneBtns= document.querySelector('.milestone-buttons');
    const playerBunny  = document.querySelector('.player-bunny');

    // --- Spieler ---
    let bunnyX = 50; // % von links
    const bunnySpeed = 1.2; // % pro Tastendruck-Frame
    const keysDown = {};

    // ========================================================
    // Hilfsfunktionen
    // ========================================================

    function getMaxEggs() {
        let max = 1;
        for (const d of CONFIG.difficulty) {
            if (score >= d.fromScore) max = d.maxEggs;
        }
        return max;
    }

    function randomColor() {
        const c = CONFIG.eggColors;
        return c[Math.floor(Math.random() * c.length)];
    }

    function bunnyRect() {
        return playerBunny.getBoundingClientRect();
    }

    // ========================================================
    // Leben-Anzeige (Pinsel)
    // ========================================================

    function renderLives() {
        livesEl.innerHTML = '';
        for (let i = 0; i < CONFIG.maxLives; i++) {
            const brush = document.createElement('div');
            brush.className = 'life-brush' + (i >= lives ? ' lost' : '');
            brush.innerHTML = '<div class="bristles"></div><div class="handle"></div>';
            livesEl.appendChild(brush);
        }
    }

    // ========================================================
    // Punkte
    // ========================================================

    function updateScore() {
        scoreEl.textContent = score;
    }

    // ========================================================
    // Meilensteine
    // ========================================================

    function checkMilestones() {
        const milestones = CONFIG.milestones;
        const lastMs = milestones[milestones.length - 1];

        for (const ms of milestones) {
            if (score >= ms.n && !triggeredMilestones.has(ms.n)) {
                triggeredMilestones.add(ms.n);
                showMilestoneText(ms.text, ms === lastMs);
            }
        }
    }

    function showMilestoneText(text, isFinal) {
        milestoneEl.textContent = text;
        milestoneEl.classList.remove('fade-out');
        milestoneEl.classList.add('visible');

        if (isFinal) {
            // Letzter Meilenstein: Text bleibt, Buttons zeigen, Spiel pausieren
            lastMilestoneReached = true;
            gamePaused = true;
            milestoneBtns.classList.remove('hidden');
        } else {
            // Normaler Meilenstein: nach T Sekunden ausblenden
            setTimeout(() => {
                milestoneEl.classList.add('fade-out');
                setTimeout(() => {
                    milestoneEl.classList.remove('visible', 'fade-out');
                }, 500);
            }, CONFIG.milestoneDisplayDuration * 1000);
        }
    }

    // ========================================================
    // Ei erzeugen
    // ========================================================

    function createEggSVG(color) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 36 46');

        // Ei-Form
        const egg = document.createElementNS(ns, 'ellipse');
        egg.setAttribute('cx', '18');
        egg.setAttribute('cy', '24');
        egg.setAttribute('rx', '16');
        egg.setAttribute('ry', '21');
        egg.setAttribute('fill', color);

        // Oberer Glanz
        const shine = document.createElementNS(ns, 'ellipse');
        shine.setAttribute('cx', '14');
        shine.setAttribute('cy', '16');
        shine.setAttribute('rx', '6');
        shine.setAttribute('ry', '8');
        shine.setAttribute('fill', 'rgba(255,255,255,0.35)');

        // Streifen-Deko
        const stripe = document.createElementNS(ns, 'ellipse');
        stripe.setAttribute('cx', '18');
        stripe.setAttribute('cy', '24');
        stripe.setAttribute('rx', '14');
        stripe.setAttribute('ry', '3');
        stripe.setAttribute('fill', 'rgba(255,255,255,0.25)');

        svg.appendChild(egg);
        svg.appendChild(stripe);
        svg.appendChild(shine);
        return svg;
    }

    function spawnEgg() {
        if (!gameRunning || gamePaused) return;

        // Prüfe ob max Eier auf Bildschirm
        if (activeEggs.length >= getMaxEggs()) return;

        const color = randomColor();
        const el = document.createElement('div');
        el.className = 'falling-egg';
        el.appendChild(createEggSVG(color));

        const x = Math.random() * (scene.clientWidth - 36);
        el.style.left = x + 'px';
        el.style.top = '-50px';

        scene.appendChild(el);


        activeEggs.push({
            el: el,
            x: x,
            y: -50,
            color: color
        });
    }

    // ========================================================
    // Zerbrochenes Ei
    // ========================================================

    function createBrokenEgg(x, y, color) {
        const wrapper = document.createElement('div');
        wrapper.className = 'broken-egg';
        wrapper.style.left = x + 'px';
        wrapper.style.top = (y - 10) + 'px';
        wrapper.style.width = '44px';
        wrapper.style.height = '40px';

        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 44 40');

        // Eigelb
        const yolk = document.createElementNS(ns, 'ellipse');
        yolk.setAttribute('cx', '22');
        yolk.setAttribute('cy', '28');
        yolk.setAttribute('rx', '12');
        yolk.setAttribute('ry', '8');
        yolk.setAttribute('fill', '#FFD700');

        // Eiweiß
        const white = document.createElementNS(ns, 'ellipse');
        white.setAttribute('cx', '22');
        white.setAttribute('cy', '30');
        white.setAttribute('rx', '18');
        white.setAttribute('ry', '10');
        white.setAttribute('fill', '#FFFDE7');
        white.setAttribute('opacity', '0.7');

        // Halbe Schale links
        const shellL = document.createElementNS(ns, 'path');
        shellL.setAttribute('d', 'M6,22 Q4,10 10,5 Q14,2 16,8 L13,20 Z');
        shellL.setAttribute('fill', color);

        // Halbe Schale rechts
        const shellR = document.createElementNS(ns, 'path');
        shellR.setAttribute('d', 'M38,22 Q40,10 34,5 Q30,2 28,8 L31,20 Z');
        shellR.setAttribute('fill', color);

        svg.appendChild(white);
        svg.appendChild(yolk);
        svg.appendChild(shellL);
        svg.appendChild(shellR);
        wrapper.appendChild(svg);
        scene.appendChild(wrapper);

        brokenEggs.push(wrapper);

        // Nach brokenEggDuration verschwinden
        setTimeout(() => {
            wrapper.classList.add('fading');
            setTimeout(() => {
                if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
                const idx = brokenEggs.indexOf(wrapper);
                if (idx >= 0) brokenEggs.splice(idx, 1);
            }, 500);
        }, CONFIG.brokenEggDuration * 1000);
    }

    // ========================================================
    // Spieler-Steuerung
    // ========================================================

    function moveBunnyTo(pct) {
        const halfW = (playerBunny.offsetWidth / scene.clientWidth) * 50;
        bunnyX = Math.max(halfW, Math.min(100 - halfW, pct));
        playerBunny.style.left = 'calc(' + bunnyX + '% - ' + (playerBunny.offsetWidth / 2) + 'px)';
    }

    // Tastatur
    document.addEventListener('keydown', (e) => {
        keysDown[e.key] = true;
    });
    document.addEventListener('keyup', (e) => {
        keysDown[e.key] = false;
    });

    // Maus/Touch – auf Click-Position bewegen
    scene.addEventListener('mousedown', (e) => {
        if (!gameRunning) return;
        const pct = (e.clientX / scene.clientWidth) * 100;
        moveBunnyTo(pct);
    });

    // Touch-Drag
    let touchActive = false;
    scene.addEventListener('touchstart', (e) => {
        if (!gameRunning) return;
        touchActive = true;
        const t = e.touches[0];
        const pct = (t.clientX / scene.clientWidth) * 100;
        moveBunnyTo(pct);
    }, { passive: true });

    scene.addEventListener('touchmove', (e) => {
        if (!gameRunning || !touchActive) return;
        const t = e.touches[0];
        const pct = (t.clientX / scene.clientWidth) * 100;
        moveBunnyTo(pct);
    }, { passive: true });

    scene.addEventListener('touchend', () => {
        touchActive = false;
    });

    // ========================================================
    // Kollisionserkennung
    // ========================================================

    function checkCatch(egg) {
        const br = bunnyRect();
        const er = egg.el.getBoundingClientRect();

        // Korb-Bereich: obere 45% des Hasen, etwas breiter
        const basketTop = br.top;
        const basketBottom = br.top + br.height * 0.45;
        const basketLeft = br.left - 8;
        const basketRight = br.right + 8;

        // Ei-Mittelpunkt (unterer Bereich)
        const eggCX = er.left + er.width / 2;
        const eggBottom = er.bottom;

        return eggCX >= basketLeft && eggCX <= basketRight &&
               eggBottom >= basketTop && eggBottom <= basketBottom;
    }

    // ========================================================
    // Spawn-Timer
    // ========================================================

    function startSpawning() {
        if (spawnTimer) clearInterval(spawnTimer);
        spawnTimer = setInterval(() => {
            if (gameRunning && !gamePaused) {
                spawnEgg();
            }
        }, 1200); // ~alle 1,2 Sekunden versuchen ein Ei zu spawnen
    }

    // ========================================================
    // Game Loop
    // ========================================================

    function gameLoop(timestamp) {
        if (!gameRunning) return;

        const delta = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        // Tastatur-Steuerung
        if (keysDown['ArrowLeft'] || keysDown['a']) {
            moveBunnyTo(bunnyX - bunnySpeed);
        }
        if (keysDown['ArrowRight'] || keysDown['d']) {
            moveBunnyTo(bunnyX + bunnySpeed);
        }

        if (!gamePaused) {
            // Eier bewegen
            const sceneH = scene.clientHeight;
            const groundY = sceneH - (sceneH * 0.02) - playerBunny.offsetHeight;

            for (let i = activeEggs.length - 1; i >= 0; i--) {
                const egg = activeEggs[i];
                egg.y += CONFIG.eggFallSpeed;
                egg.el.style.top = egg.y + 'px';

                // Gefangen?
                if (checkCatch(egg)) {
                    egg.el.remove();
                    activeEggs.splice(i, 1);
                    score++;
                    updateScore();
                    checkMilestones();
                    continue;
                }

                // Am Boden? (unterhalb des Korb-Bereichs)
                if (egg.y + 46 >= groundY + playerBunny.offsetHeight * 0.5) {
                    egg.el.remove();
                    activeEggs.splice(i, 1);
                    createBrokenEgg(egg.x, groundY + playerBunny.offsetHeight * 0.4, egg.color);
                    lives--;
                    renderLives();

                    if (lives <= 0) {
                        gameOver();
                        return;
                    }
                }
            }
        }

        rafId = requestAnimationFrame(gameLoop);
    }

    // ========================================================
    // Start / Stop / Restart
    // ========================================================

    function startGame() {
        score = 0;
        lives = CONFIG.maxLives;
        gameRunning = true;
        gamePaused = false;
        lastMilestoneReached = false;
        triggeredMilestones.clear();
        activeEggs = [];

        // Aufräumen
        scene.querySelectorAll('.falling-egg, .broken-egg').forEach(e => e.remove());
        brokenEggs = [];

        updateScore();
        renderLives();

        startOverlay.classList.add('hidden');
        gameoverEl.classList.add('hidden');
        milestoneEl.classList.remove('visible', 'fade-out');
        milestoneBtns.classList.add('hidden');

        bunnyX = 50;
        moveBunnyTo(bunnyX);

        lastFrameTime = performance.now();
        startSpawning();
        rafId = requestAnimationFrame(gameLoop);
    }

    function gameOver() {
        gameRunning = false;
        if (spawnTimer) clearInterval(spawnTimer);
        if (rafId) cancelAnimationFrame(rafId);

        // Restliche Eier entfernen
        activeEggs.forEach(e => e.el.remove());
        activeEggs = [];

        finalScoreEl.textContent = score;
        gameoverEl.classList.remove('hidden');
    }

    function continueGame() {
        gamePaused = false;
        milestoneBtns.classList.add('hidden');
        // Text bleibt stehen bei letztem Meilenstein
    }

    // ========================================================
    // Event-Listener
    // ========================================================

    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-restart-gameover').addEventListener('click', startGame);
    document.getElementById('btn-continue').addEventListener('click', continueGame);
    document.getElementById('btn-restart-milestone').addEventListener('click', startGame);

    // Initiale Anzeige
    renderLives();
    updateScore();
    moveBunnyTo(50);

})();
