/* ============================================================
   spiel.js – Spiellogik  (Zustandsmaschine)
   ============================================================ */

const gameState = {
  playerCount: 4,
  activePlayers: [],   // Indices ins CONFIG.players-Array
  currentPlayer: 0,    // Index in activePlayers
  players: [],
  diceResult: null,
  attemptsLeft: 0,
  state: "SETUP",
  rolledSix: false
};

// ── Initialisierung ──────────────────────────────────────────

function initGame(playerCount) {
  gameState.playerCount = playerCount;
  gameState.activePlayers = CONFIG.playerSlots[playerCount];
  gameState.currentPlayer = 0;
  gameState.state = "ROLL_DICE";
  gameState.diceResult = null;
  gameState.rolledSix = false;

  gameState.players = gameState.activePlayers.map(pIdx => ({
    configIndex: pIdx,
    color: CONFIG.players[pIdx].color,
    name: CONFIG.players[pIdx].name,
    figures: Array.from({ length: CONFIG.figuresPerPlayer }, (_, i) => ({
      position: { type: "start", index: i }
    })),
    finished: false
  }));

  // Board neu aufbauen
  const boardContainer = document.getElementById("board-container");
  boardContainer.innerHTML = "";
  Board.createBoard(boardContainer);
  Board.renderFigures(gameState);

  // Würfel
  const diceContainer = document.getElementById("dice-container");
  diceContainer.innerHTML = "";
  Dice.createDice(diceContainer);
  Dice.onRoll(onDiceResult);

  // Spieler-Info
  renderPlayerInfo();

  // Würfel-Größe an Board anpassen
  updateDiceSize();
  window.addEventListener("resize", updateDiceSize);

  // Overlay weg
  document.getElementById("setup-overlay").classList.add("hidden");
  document.getElementById("gameover-overlay").classList.add("hidden");

  startTurn();
}

function updateDiceSize() {
  const wrapper = document.getElementById("board-wrapper");
  const size = wrapper.clientWidth;
  // 7% des Boards → in SVG-Einheiten ca. 42px bei viewBox 600
  // Innerste Home-Feld-Kante: 24px vom Zentrum → kein Überlappen
  const dicePx = Math.max(28, Math.round(size * 0.07));
  const diceWrap = document.querySelector(".dice-wrap");
  if (diceWrap) diceWrap.style.setProperty("--dice-px", dicePx + "px");
}

// ── Zustandsmaschine ─────────────────────────────────────────

function startTurn() {
  const p = currentPlayer();
  gameState.diceResult = null;
  gameState.rolledSix = false;

  // Prüfen ob alle Figuren im Start (3 Versuche)
  const onBoard = figuresOnBoard(p);
  if (onBoard === 0 && figuresInHome(p) < CONFIG.figuresPerPlayer) {
    gameState.attemptsLeft = CONFIG.maxDiceAttemptsAllHome;
  } else {
    gameState.attemptsLeft = 1;
  }

  updateStatus(`${p.name} ist dran – Würfle!`);
  highlightCurrentPlayer();
  Dice.setClickable(true, p.color);
  gameState.state = "ROLL_DICE";
}

function onDiceResult(result) {
  const p = currentPlayer();
  gameState.diceResult = result;
  gameState.state = "PICK_FIGURE";

  updateDiceDisplay(result);
  gameState.attemptsLeft--;

  const onBoard = figuresOnBoard(p);
  const inStart = figuresInStart(p);

  // Alle im Start und keine 6
  if (onBoard === 0 && inStart > 0 && result !== 6) {
    if (gameState.attemptsLeft > 0) {
      updateStatus(`${p.name}: Keine 6 – noch ${gameState.attemptsLeft} Versuch(e)`);
      Dice.setClickable(true, p.color);
      gameState.state = "ROLL_DICE";
      return;
    } else {
      updateStatus(`${p.name}: Keine 6 – nächster Spieler`);
      setTimeout(() => nextPlayer(), 800);
      return;
    }
  }

  // Gültige Züge berechnen
  const validMoves = getValidMoves(gameState.currentPlayer, result);

  if (validMoves.length === 0) {
    // Sonderfall: 6 gewürfelt, aber Startfeld von eigener Figur blockiert
    // und kein anderer Zug möglich
    if (result === 6 && inStart > 0) {
      updateStatus(`${p.name}: Kein gültiger Zug möglich`);
    } else {
      updateStatus(`${p.name}: Kein gültiger Zug`);
    }
    setTimeout(() => {
      if (result === 6) {
        gameState.rolledSix = true;
        startTurnAfterSix();
      } else {
        nextPlayer();
      }
    }, 800);
    return;
  }

  if (validMoves.length === 1) {
    // Automatisch ziehen
    executeMove(validMoves[0]);
    return;
  }

  // Spieler muss wählen
  updateStatus(`${p.name}: Wähle eine Figur`);
  Board.highlightFigures(validMoves);

  // Klick-Handler auf Figuren
  validMoves.forEach(move => {
    const el = document.querySelector(
      `.figure[data-player="${p.configIndex}"][data-figure="${move.figure}"]`
    );
    if (el) {
      el.onclick = (e) => {
        e.stopPropagation();
        Board.clearHighlights();
        executeMove(move);
      };
    }
  });
}

async function executeMove(move) {
  gameState.state = "ANIMATE_MOVE";
  const p = currentPlayer();
  const fig = p.figures[move.figure];

  // Figur bewegen
  if (move.action === "enter") {
    // Aus dem Start aufs Startfeld
    fig.position = { type: "board", index: CONFIG.startFieldIndex[p.configIndex] };
    Board.renderFigures(gameState);

    // Prüfe ob gegnerische Figur geschlagen wird
    await checkCapture(p.configIndex, CONFIG.startFieldIndex[p.configIndex]);
  } else {
    // Normaler Zug – Feld für Feld animieren
    await Board.animateMove(p.configIndex, move.figure, move.path);
    fig.position = { ...move.target };

    if (move.target.type === "board") {
      await checkCapture(p.configIndex, move.target.index);
    }
  }

  Board.renderFigures(gameState);

  // Gewonnen?
  if (checkWin(gameState.currentPlayer)) {
    gameState.state = "GAME_OVER";
    showGameOver(p.name, p.color);
    return;
  }

  renderPlayerInfo();

  // 6 gewürfelt → nochmal
  if (gameState.diceResult === 6) {
    gameState.rolledSix = true;
    startTurnAfterSix();
  } else {
    nextPlayer();
  }
}

function startTurnAfterSix() {
  const p = currentPlayer();
  gameState.diceResult = null;
  gameState.attemptsLeft = 1;
  updateStatus(`${p.name}: Noch einmal würfeln (6!)`);
  Dice.setClickable(true, p.color);
  gameState.state = "ROLL_DICE";
}

function nextPlayer() {
  do {
    gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.playerCount;
  } while (currentPlayer().finished);
  startTurn();
}

// ── Spiellogik-Hilfsfunktionen ───────────────────────────────

function currentPlayer() {
  return gameState.players[gameState.currentPlayer];
}

function figuresOnBoard(player) {
  return player.figures.filter(f => f.position.type === "board").length;
}

function figuresInStart(player) {
  return player.figures.filter(f => f.position.type === "start").length;
}

function figuresInHome(player) {
  return player.figures.filter(f => f.position.type === "home").length;
}

function getValidMoves(playerIndex, dice) {
  const player = gameState.players[playerIndex];
  const pConfig = player.configIndex;
  const moves = [];

  // Priorität: Bei 6 und Figuren im Start → Figur rausbringen
  // ABER nur wenn Startfeld nicht von eigener Figur blockiert
  const inStart = figuresInStart(player);
  if (dice === 6 && inStart > 0) {
    const startField = CONFIG.startFieldIndex[pConfig];
    const ownOnStart = player.figures.some(
      f => f.position.type === "board" && f.position.index === startField
    );
    if (!ownOnStart) {
      // Muss eine Figur rausbringen
      const startFig = player.figures.findIndex(f => f.position.type === "start");
      if (startFig >= 0) {
        moves.push({
          player: pConfig,
          figure: startFig,
          action: "enter",
          target: { type: "board", index: startField },
          path: []
        });
        return moves; // Zwang: nur diese Option
      }
    }
  }

  // Züge für Figuren auf dem Board
  player.figures.forEach((fig, fIdx) => {
    if (fig.position.type === "board") {
      const move = calculateBoardMove(player, fIdx, dice);
      if (move) {
        moves.push({ player: pConfig, figure: fIdx, ...move });
      }
    }
  });

  // Bei 6 und Startfeld von eigener Figur blockiert:
  // Der Spieler kann NICHT rausbringen, solange das Startfeld besetzt ist.
  // Er darf frei mit einer anderen Figur 6 Felder ziehen.
  // (Kein zusätzlicher "enter"-Zug nötig – die moves enthalten
  //  bereits alle gültigen Board-Züge inkl. der blockierenden Figur.)

  // Figuren im Home können ggf. vorrücken
  player.figures.forEach((fig, fIdx) => {
    if (fig.position.type === "home") {
      const newIndex = fig.position.index + dice;
      if (newIndex < CONFIG.homeFields) {
        // Prüfen ob Zielfeld von eigener Figur besetzt
        const targetOccupied = player.figures.some(
          f => f.position.type === "home" && f.position.index === newIndex
        );
        if (!targetOccupied) {
          moves.push({
            player: pConfig,
            figure: fIdx,
            action: "move_home",
            target: { type: "home", index: newIndex },
            path: buildHomePath(fig.position.index, newIndex)
          });
        }
      }
    }
  });

  return moves;
}

function calculateBoardMove(player, figIndex, dice) {
  const fig = player.figures[figIndex];
  const pConfig = player.configIndex;
  const startIdx = CONFIG.startFieldIndex[pConfig];

  const currentPos = fig.position.index;

  // Berechne Schritte relativ zum Startfeld
  let relativePos = (currentPos - startIdx + CONFIG.boardFields) % CONFIG.boardFields;
  let newRelative = relativePos + dice;

  // Prüfe ob ins Home gezogen wird
  if (newRelative >= CONFIG.boardFields) {
    // Ins Zielfeld
    const homeIndex = newRelative - CONFIG.boardFields;
    if (homeIndex < CONFIG.homeFields) {
      // Prüfe ob Zielfeld im Home besetzt ist
      const targetOccupied = player.figures.some(
        f => f.position.type === "home" && f.position.index === homeIndex
      );
      if (!targetOccupied) {
        // Pfad: restliche Board-Felder + Home-Felder
        const path = [];
        for (let step = 1; step <= dice; step++) {
          const stepRel = relativePos + step;
          if (stepRel < CONFIG.boardFields) {
            path.push({ type: "board", index: (startIdx + stepRel) % CONFIG.boardFields });
          } else {
            path.push({ type: "home", index: stepRel - CONFIG.boardFields });
          }
        }
        return {
          action: "move",
          target: { type: "home", index: homeIndex },
          path
        };
      }
    }
    return null; // Überschuss, kann nicht ziehen
  }

  // Normaler Board-Zug
  const newPos = (currentPos + dice) % CONFIG.boardFields;

  // Prüfe ob Zielfeld von eigener Figur besetzt
  const ownBlocking = player.figures.some(
    (f, i) => i !== figIndex && f.position.type === "board" && f.position.index === newPos
  );
  if (ownBlocking) return null;

  // Pfad bauen
  const path = [];
  for (let step = 1; step <= dice; step++) {
    path.push({ type: "board", index: (currentPos + step) % CONFIG.boardFields });
  }

  return {
    action: "move",
    target: { type: "board", index: newPos },
    path
  };
}

function buildHomePath(fromIndex, toIndex) {
  const path = [];
  for (let i = fromIndex + 1; i <= toIndex; i++) {
    path.push({ type: "home", index: i });
  }
  return path;
}

async function checkCapture(currentPlayerConfig, boardIndex) {
  for (let pi = 0; pi < gameState.players.length; pi++) {
    const other = gameState.players[pi];
    if (other.configIndex === currentPlayerConfig) continue;

    for (let fi = 0; fi < other.figures.length; fi++) {
      if (other.figures[fi].position.type === "board" &&
          other.figures[fi].position.index === boardIndex) {
        // Geschlagen!
        const freeStart = getNextFreeStart(other);
        await Board.animateCapture(other.configIndex, fi, freeStart);
        other.figures[fi].position = { type: "start", index: freeStart };
        updateStatus(`${currentPlayerName()} schlägt ${other.name}!`);
        return;
      }
    }
  }
}

function currentPlayerName() {
  return currentPlayer().name;
}

function getNextFreeStart(player) {
  const occupied = player.figures
    .filter(f => f.position.type === "start")
    .map(f => f.position.index);
  for (let i = 0; i < CONFIG.figuresPerPlayer; i++) {
    if (!occupied.includes(i)) return i;
  }
  return 0;
}

function checkWin(playerIndex) {
  const player = gameState.players[playerIndex];
  return player.figures.every(f => f.position.type === "home");
}

// ── UI-Funktionen ────────────────────────────────────────────

function updateStatus(text) {
  document.getElementById("status-text").textContent = text;
}

function updateDiceDisplay(value) {
  document.getElementById("dice-value").textContent = value;
}

function highlightCurrentPlayer() {
  const p = currentPlayer();
  const indicator = document.getElementById("current-player-indicator");
  indicator.style.backgroundColor = p.color;
  indicator.textContent = p.name;

  document.getElementById("dice-value").textContent = "-";
}

function renderPlayerInfo() {
  const container = document.getElementById("player-info");
  container.innerHTML = "";

  gameState.players.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className = "player-info-item";
    if (idx === gameState.currentPlayer) div.classList.add("active");

    const dot = document.createElement("span");
    dot.className = "player-dot";
    dot.style.backgroundColor = p.color;

    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = p.name;

    const progress = document.createElement("span");
    progress.className = "player-progress";
    const inHome = figuresInHome(p);
    progress.textContent = `${inHome}/${CONFIG.figuresPerPlayer}`;

    div.appendChild(dot);
    div.appendChild(name);
    div.appendChild(progress);
    container.appendChild(div);
  });
}

function showGameOver(playerName, playerColor) {
  const overlay = document.getElementById("gameover-overlay");
  overlay.classList.remove("hidden");
  document.getElementById("winner-name").textContent = playerName;
  document.getElementById("winner-name").style.color = playerColor;
  startConfetti();
}

// ── Konfetti ─────────────────────────────────────────────────

function startConfetti() {
  const container = document.getElementById("confetti-container");
  container.innerHTML = "";
  const colors = CONFIG.players.map(p => p.color);

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 2 + "s";
    piece.style.animationDuration = (2 + Math.random() * 3) + "s";
    container.appendChild(piece);
  }
}

// ── Setup-Events ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".player-count-btn");
  const startBtn = document.getElementById("start-btn");
  let selectedCount = null;

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedCount = parseInt(btn.dataset.count);
      startBtn.disabled = false;
    });
  });

  startBtn.addEventListener("click", () => {
    if (selectedCount) initGame(selectedCount);
  });

  document.getElementById("new-game-btn").addEventListener("click", () => {
    document.getElementById("gameover-overlay").classList.add("hidden");
    document.getElementById("setup-overlay").classList.remove("hidden");
    selectedCount = null;
    startBtn.disabled = true;
    buttons.forEach(b => b.classList.remove("selected"));
  });
});
