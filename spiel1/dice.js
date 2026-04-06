/* ============================================================
   dice.js – 3D-Würfel mit CSS-Animation
   ============================================================ */

const Dice = (() => {
  let diceWrap = null;
  let diceCube = null;
  let clickable = false;
  let rolling = false;
  let onRollCallback = null;

  // Rotation für jede Seite so, dass sie nach vorne zeigt
  const FACE_ROTATIONS = {
    1: { x: 0,    y: 0   },
    2: { x: -90,  y: 0   },
    3: { x: 0,    y: 90  },
    4: { x: 0,    y: -90 },
    5: { x: 90,   y: 0   },
    6: { x: 180,  y: 0   }
  };

  function createDice(container) {
    diceWrap = document.createElement("div");
    diceWrap.className = "dice-wrap";
    diceWrap.addEventListener("click", onDiceClick);

    const scene = document.createElement("div");
    scene.className = "dice-scene";

    diceCube = document.createElement("div");
    diceCube.className = "dice-cube";

    // 6 Seiten erzeugen
    for (let face = 1; face <= 6; face++) {
      const faceEl = document.createElement("div");
      faceEl.className = `dice-face dice-face-${face}`;
      // Punkte erzeugen
      const dots = getDotPositions(face);
      dots.forEach(pos => {
        const dot = document.createElement("span");
        dot.className = "dice-dot";
        dot.style.gridArea = pos;
        faceEl.appendChild(dot);
      });
      diceCube.appendChild(faceEl);
    }

    scene.appendChild(diceCube);
    diceWrap.appendChild(scene);
    container.appendChild(diceWrap);

    // Initial: Seite 1 zeigen
    showFace(1, false);
  }

  function getDotPositions(face) {
    // CSS Grid 3x3, areas: "a1 a2 a3 / b1 b2 b3 / c1 c2 c3"
    switch (face) {
      case 1: return ["b2"];
      case 2: return ["a3", "c1"];
      case 3: return ["a3", "b2", "c1"];
      case 4: return ["a1", "a3", "c1", "c3"];
      case 5: return ["a1", "a3", "b2", "c1", "c3"];
      case 6: return ["a1", "a3", "b1", "b3", "c1", "c3"];
    }
  }

  function showFace(number, animated) {
    const rot = FACE_ROTATIONS[number];
    if (animated) {
      // Zufällige Vollrotationen dazu (2-4 mal 360°)
      const extraX = (2 + Math.floor(Math.random() * 3)) * 360;
      const extraY = (2 + Math.floor(Math.random() * 3)) * 360;
      const dirX = Math.random() > 0.5 ? 1 : -1;
      const dirY = Math.random() > 0.5 ? 1 : -1;

      diceCube.style.transition = `transform ${CONFIG.diceAnimationDuration}ms cubic-bezier(0.2, 0.8, 0.3, 1)`;
      diceCube.style.transform = `rotateX(${rot.x + extraX * dirX}deg) rotateY(${rot.y + extraY * dirY}deg)`;
    } else {
      diceCube.style.transition = "none";
      diceCube.style.transform = `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
    }
  }

  function onDiceClick() {
    if (!clickable || rolling) return;
    roll();
  }

  function roll() {
    rolling = true;
    clickable = false;
    diceWrap.classList.remove("dice-pulse");
    diceWrap.classList.add("dice-rolling");

    const result = Math.floor(Math.random() * 6) + 1;
    showFace(result, true);

    setTimeout(() => {
      rolling = false;
      diceWrap.classList.remove("dice-rolling");
      if (onRollCallback) onRollCallback(result);
    }, CONFIG.diceAnimationDuration + 50);
  }

  function setClickable(enabled, playerColor) {
    clickable = enabled;
    if (enabled) {
      diceWrap.classList.add("dice-pulse");
      diceWrap.style.cursor = "pointer";
    } else {
      diceWrap.classList.remove("dice-pulse");
      diceWrap.style.cursor = "default";
    }
    if (playerColor) {
      diceWrap.style.setProperty("--dice-color", playerColor);
    }
  }

  function onRoll(callback) {
    onRollCallback = callback;
  }

  return { createDice, setClickable, onRoll, roll };
})();
