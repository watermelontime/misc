/* ============================================================
   board.js – SVG-Spielfeld-Rendering
   ============================================================ */

const Board = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SIZE = 600;
  const FIELD_R = 21;
  const FIGURE_R = 16;
  const SPACING = 54;

  let svgEl = null;
  let figuresGroup = null;

  // ── Positionen ──────────────────────────────────────────────

  // Zentrum des Brettes
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  // Hilfsfunktion: Kreuz-Koordinaten für die 40 Felder im Uhrzeigersinn
  // Das Brett ist ein Kreuz mit 4 Armen (oben, rechts, unten, links)
  // Spieler 0 (Rot)  startet unten links,  läuft aufwärts
  // Spieler 1 (Blau) startet oben links,   läuft nach rechts
  // Spieler 2 (Grün) startet oben rechts,  läuft abwärts
  // Spieler 3 (Gelb) startet unten rechts,  läuft nach links

  function buildBoardPositions() {
    const S = SPACING;
    const positions = [];

    // Wir bauen das klassische Kreuz.
    // Die Felder sind gegen den Uhrzeigersinn nummeriert, startend
    // bei Rot (unten-mitte links).
    //
    // Layout-Grid: 11x11 Zellen von Zelle (0,0) oben-links bis (10,10) unten-rechts
    // Zentrum = (5,5)
    // Jede Zelle = SPACING px breit

    const grid = (col, row) => ({
      x: (col - 5) * S + CX,
      y: (row - 5) * S + CY
    });

    // Feld 0-39 im Uhrzeigersinn, Start bei unten-mitte-links (Rot A-Feld)
    const fields = [
      // Rot startet hier (Feld 0) – unten Mitte, links
      grid(4, 10),  // 0  – A-Feld Rot
      grid(4, 9),   // 1
      grid(4, 8),   // 2
      grid(4, 7),   // 3
      grid(4, 6),   // 4
      // Ecke unten-links → nach rechts
      grid(3, 6),   // 5
      grid(2, 6),   // 6
      grid(1, 6),   // 7
      grid(0, 6),   // 8
      // hoch
      grid(0, 5),   // 9
      // Blau startet hier (Feld 10) – links oben
      grid(0, 4),   // 10 – A-Feld Blau
      grid(1, 4),   // 11
      grid(2, 4),   // 12
      grid(3, 4),   // 13
      grid(4, 4),   // 14
      // Ecke oben-links → nach oben
      grid(4, 3),   // 15
      grid(4, 2),   // 16
      grid(4, 1),   // 17
      grid(4, 0),   // 18
      // rechts
      grid(5, 0),   // 19
      // Grün startet hier (Feld 20) – oben rechts
      grid(6, 0),   // 20 – A-Feld Grün
      grid(6, 1),   // 21
      grid(6, 2),   // 22
      grid(6, 3),   // 23
      grid(6, 4),   // 24
      // Ecke oben-rechts → nach rechts
      grid(7, 4),   // 25
      grid(8, 4),   // 26
      grid(9, 4),   // 27
      grid(10, 4),  // 28
      // runter
      grid(10, 5),  // 29
      // Gelb startet hier (Feld 30) – rechts unten
      grid(10, 6),  // 30 – A-Feld Gelb
      grid(9, 6),   // 31
      grid(8, 6),   // 32
      grid(7, 6),   // 33
      grid(6, 6),   // 34
      // Ecke unten-rechts → nach unten
      grid(6, 7),   // 35
      grid(6, 8),   // 36
      grid(6, 9),   // 37
      grid(6, 10),  // 38
      // links
      grid(5, 10),  // 39
    ];
    return fields;
  }

  function buildStartPositions() {
    const S = SPACING;
    const grid = (col, row) => ({
      x: (col - 5) * S + CX,
      y: (row - 5) * S + CY
    });
    // 4 Spieler, je 4 Positionen (2x2 Grid in jeder Ecke)
    return [
      // Spieler 0 – Rot – links unten
      [grid(0, 9), grid(1, 9), grid(0, 10), grid(1, 10)],
      // Spieler 1 – Blau – links oben
      [grid(0, 0), grid(1, 0), grid(0, 1), grid(1, 1)],
      // Spieler 2 – Grün – rechts oben
      [grid(9, 0), grid(10, 0), grid(9, 1), grid(10, 1)],
      // Spieler 3 – Gelb – rechts unten
      [grid(9, 9), grid(10, 9), grid(9, 10), grid(10, 10)],
    ];
  }

  function buildHomePositions() {
    const S = SPACING;
    const grid = (col, row) => ({
      x: (col - 5) * S + CX,
      y: (row - 5) * S + CY
    });
    // Zielfelder zeigen vom Rand zur Mitte
    return [
      // Spieler 0 – Rot – von unten nach oben zur Mitte
      [grid(5, 9), grid(5, 8), grid(5, 7), grid(5, 6)],
      // Spieler 1 – Blau – von links nach rechts zur Mitte
      [grid(1, 5), grid(2, 5), grid(3, 5), grid(4, 5)],
      // Spieler 2 – Grün – von oben nach unten zur Mitte
      [grid(5, 1), grid(5, 2), grid(5, 3), grid(5, 4)],
      // Spieler 3 – Gelb – von rechts nach links zur Mitte
      [grid(9, 5), grid(8, 5), grid(7, 5), grid(6, 5)],
    ];
  }

  const BOARD_POSITIONS = buildBoardPositions();
  const START_POSITIONS = buildStartPositions();
  const HOME_POSITIONS  = buildHomePositions();

  // ── SVG-Hilfsfunktionen ────────────────────────────────────

  function svgCreate(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  // ── Board zeichnen ─────────────────────────────────────────

  function createBoard(container) {
    svgEl = svgCreate("svg", {
      viewBox: `0 0 ${SIZE} ${SIZE}`,
      class: "board-svg"
    });

    // Hintergrund
    svgEl.appendChild(svgCreate("rect", {
      x: 0, y: 0, width: SIZE, height: SIZE,
      rx: 16, ry: 16,
      fill: CONFIG.board.background
    }));

    // Rundkurs-Felder
    const activePlayers = getActivePlayers();
    BOARD_POSITIONS.forEach((pos, i) => {
      let fill = CONFIG.board.fieldFill;
      // Startfelder einfärben
      for (let p = 0; p < 4; p++) {
        if (i === CONFIG.startFieldIndex[p] && activePlayers.includes(p)) {
          fill = CONFIG.players[p].colorLight;
        }
      }
      svgEl.appendChild(svgCreate("circle", {
        cx: pos.x, cy: pos.y, r: FIELD_R,
        fill: fill,
        stroke: CONFIG.board.fieldStroke,
        "stroke-width": 1.5,
        class: "board-field",
        "data-field-index": i
      }));
    });

    // Startbereiche (B-Felder)
    for (let p = 0; p < 4; p++) {
      if (!activePlayers.includes(p)) continue;
      START_POSITIONS[p].forEach((pos, i) => {
        svgEl.appendChild(svgCreate("circle", {
          cx: pos.x, cy: pos.y, r: FIELD_R - 2,
          fill: CONFIG.players[p].colorLight,
          stroke: CONFIG.players[p].colorDark,
          "stroke-width": 1.5,
          class: "start-field",
          "data-player": p,
          "data-start-index": i
        }));
      });
    }

    // Zielbereiche (Home-Felder)
    for (let p = 0; p < 4; p++) {
      if (!activePlayers.includes(p)) continue;
      HOME_POSITIONS[p].forEach((pos, i) => {
        svgEl.appendChild(svgCreate("circle", {
          cx: pos.x, cy: pos.y, r: FIELD_R - 2,
          fill: CONFIG.players[p].colorLight,
          stroke: CONFIG.players[p].colorDark,
          "stroke-width": 1.5,
          class: "home-field",
          "data-player": p,
          "data-home-index": i
        }));
      });
    }

    // Figuren-Gruppe (über den Feldern)
    figuresGroup = svgCreate("g", { class: "figures-group" });
    svgEl.appendChild(figuresGroup);

    // Spielname in 4 Sprachen (je Quadrant, diagonal)
    drawBoardTexts();

    container.appendChild(svgEl);
    return svgEl;
  }

  function drawBoardTexts() {
    if (!CONFIG.boardTexts || !svgEl) return;
    const color = CONFIG.board.textColor || "#E0CEAB";
    const fontSize = CONFIG.board.textFontSize || 16;
    const lineSpacing = fontSize * 1.3;
    //  /   \
    //  \   /
    // Center of each quadrant's diagonal (between start area and track)
    const placements = [
      { x: 134, y: 134, angle: -45 },  // top-left     /
      { x: 466, y: 134, angle:  45 },  // top-right    \
      { x: 134, y: 466, angle:  45 },  // bottom-left  \
      { x: 466, y: 466, angle: -45 },  // bottom-right /
    ];
    placements.forEach((p, i) => {
      if (i >= CONFIG.boardTexts.length) return;
      const lines = Array.isArray(CONFIG.boardTexts[i])
        ? CONFIG.boardTexts[i]
        : [CONFIG.boardTexts[i]];
      const totalHeight = (lines.length - 1) * lineSpacing;
      const text = svgCreate("text", {
        x: p.x, y: p.y,
        fill: color,
        "font-size": fontSize,
        "font-weight": "bold",
        "font-family": "sans-serif",
        "text-anchor": "middle",
        "dominant-baseline": "central",
        transform: `rotate(${p.angle}, ${p.x}, ${p.y})`,
        "pointer-events": "none"
      });
      lines.forEach((line, li) => {
        const tspan = svgCreate("tspan", {
          x: p.x,
          dy: li === 0 ? `${-totalHeight / 2}` : `${lineSpacing}`
        });
        tspan.textContent = line;
        text.appendChild(tspan);
      });
      svgEl.appendChild(text);
    });
  }

  function getActivePlayers() {
    if (typeof gameState !== "undefined" && gameState.activePlayers) {
      return gameState.activePlayers;
    }
    return [0, 1, 2, 3];
  }

  // ── Figuren zeichnen ───────────────────────────────────────

  function createFigureElement(player, figIndex) {
    const color = CONFIG.players[player].color;
    const dark  = CONFIG.players[player].colorDark;

    const g = svgCreate("g", {
      class: "figure",
      "data-player": player,
      "data-figure": figIndex,
      cursor: "default"
    });

    // Schatten
    g.appendChild(svgCreate("circle", {
      r: FIGURE_R, cx: 2, cy: 2,
      fill: "rgba(0,0,0,0.18)"
    }));

    // Hauptkreis
    g.appendChild(svgCreate("circle", {
      r: FIGURE_R, cx: 0, cy: 0,
      fill: color,
      stroke: dark,
      "stroke-width": 2,
      class: "figure-body"
    }));

    // Glanzpunkt
    g.appendChild(svgCreate("circle", {
      r: 4, cx: -3, cy: -3,
      fill: "rgba(255,255,255,0.45)"
    }));

    return g;
  }

  function clearFigures() {
    if (figuresGroup) figuresGroup.innerHTML = "";
  }

  function renderFigures(state) {
    clearFigures();
    state.players.forEach((player, pIdx) => {
      const ci = player.configIndex;
      player.figures.forEach((fig, fIdx) => {
        const el = createFigureElement(ci, fIdx);
        const pos = getPosition(fig.position, ci);
        el.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);

        if (fig.position.type === "start") {
          el.style.opacity = "0.6";
        } else {
          el.style.opacity = "1";
        }

        figuresGroup.appendChild(el);
      });
    });
  }

  function getPosition(position, player) {
    switch (position.type) {
      case "start":
        return START_POSITIONS[player][position.index];
      case "board":
        return BOARD_POSITIONS[position.index];
      case "home":
        return HOME_POSITIONS[player][position.index];
    }
  }

  function highlightFigures(validMoves) {
    document.querySelectorAll(".figure").forEach(el => {
      el.classList.remove("highlight");
      el.style.cursor = "default";
      el.onclick = null;
    });

    validMoves.forEach(move => {
      const el = document.querySelector(
        `.figure[data-player="${move.player}"][data-figure="${move.figure}"]`
      );
      if (el) {
        el.classList.add("highlight");
        el.style.cursor = "pointer";
      }
    });
  }

  function clearHighlights() {
    document.querySelectorAll(".figure.highlight").forEach(el => {
      el.classList.remove("highlight");
      el.style.cursor = "default";
      el.onclick = null;
    });
  }

  async function animateMove(player, figIndex, path) {
    const el = document.querySelector(
      `.figure[data-player="${player}"][data-figure="${figIndex}"]`
    );
    if (!el) return;

    for (const pos of path) {
      const coords = pos.type === "board"
        ? BOARD_POSITIONS[pos.index]
        : HOME_POSITIONS[player][pos.index];
      el.style.transition = `transform ${CONFIG.moveStepDelay}ms ease`;
      el.setAttribute("transform", `translate(${coords.x}, ${coords.y})`);
      await delay(CONFIG.moveStepDelay);
    }
    el.style.transition = "";
  }

  async function animateCapture(player, figIndex, startIndex) {
    const el = document.querySelector(
      `.figure[data-player="${player}"][data-figure="${figIndex}"]`
    );
    if (!el) return;

    // Blink
    el.querySelector(".figure-body").style.fill = "#FF1744";
    await delay(200);
    el.querySelector(".figure-body").style.fill = "#FF1744";
    await delay(200);

    // Move to start
    const pos = START_POSITIONS[player][startIndex];
    el.style.transition = `transform 300ms ease`;
    el.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
    el.style.opacity = "0.6";
    await delay(350);

    el.querySelector(".figure-body").style.fill = CONFIG.players[player].color;
    el.style.transition = "";
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function getSvg() { return svgEl; }

  return {
    createBoard, renderFigures, highlightFigures, clearHighlights,
    animateMove, animateCapture, clearFigures, getSvg,
    getPosition,
    BOARD_POSITIONS, START_POSITIONS, HOME_POSITIONS,
    SIZE, CX, CY
  };
})();
