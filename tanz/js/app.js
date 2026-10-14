/* App-Logik: Navigation, Rendering, Player-Steuerung */
(() => {
  const el = (id) => document.getElementById(id);

  // Einstellbare Parameter
  const config = {
    loopList: true, // Playlist am Ende wieder von vorne starten
    autoplay: true, // Nächsten Song automatisch abspielen
  };

  // UI-Referenzen
  const ui = {
    viewDances: el("view-dances"),
    viewSongs: el("view-songs"),
    viewParty: el("view-party"),
    viewExport: el("view-export"),
    viewImport: el("view-import"),
    danceList: el("danceList"),
    partyList: el("partyList"),
    exportList: el("exportList"),
    importList: el("importList"),
    exportBtn: el("exportBtn"),
    importBtn: el("importBtn"),
    importFile: el("importFile"),
    partyStartBtn: el("partyStartBtn"),
    partyStartText: el("partyStartText"),
    partyResetBtn: el("partyResetBtn"),
    songList: el("songList"),
    danceTitle: el("danceTitle"),
    songsBackBtn: el("songsBackBtn"),
    appTitle: el("appTitle"),
    displayBtn: el("displayBtn"),
    menuBtn: el("menuBtn"),
    menu: el("menu"),
    infoOverlay: el("infoOverlay"),
    infoTitle: el("infoTitle"),
    infoBody: el("infoBody"),
    infoClose: el("infoClose"),
    addForm: el("addSongForm"),
    songUrl: el("songUrl"),
    songTitle: el("songTitle"),
    playerBar: el("playerBar"),
    trackEmoji: el("trackEmoji"),
    trackTitle: el("trackTitle"),
    trackArtist: el("trackArtist"),
    playBtn: el("playBtn"),
    prevBtn: el("prevBtn"),
    nextBtn: el("nextBtn"),
    seek: el("seek"),
    curTime: el("curTime"),
    durTime: el("durTime"),
    volume: el("volume"),
    speedControl: el("speedControl"),
    speedDown: el("speedDown"),
    speedUp: el("speedUp"),
    speedValue: el("speedValue"),
    iosHint: el("iosHint"),
    iosHintClose: el("iosHintClose"),
  };

  // Zustand
  const state = {
    danceKey: null,
    queue: [],
    index: -1,
    seeking: false,
    duration: 0,
    loopSongs: new Set(),
    partyMode: false,
    partyHistory: [],
    partyPos: -1,
    rate: 1,
    exportSel: new Set(),
    importSel: new Set(),
    importData: null,
  };

  const THEME_KEY = "mydancemusic.theme";

  // Einstellbare Bezeichnungen für Titel/Modi
  const APP_NAME = "DanceMusic";
  const MODE_NAMES = {
    training: "Training", // Abspielen der Lieder eines Tanzes
    party: "Party",       // Party-Mode (zufällige Tanz-Auswahl)
    export: "Export",     // Lieder exportieren
    import: "Import",     // Lieder importieren
  };

  function setTitle(mode) {
    ui.appTitle.textContent = mode ? `${APP_NAME} : ${mode}` : APP_NAME;
  }

  // Einstellbare Inhalte des Burger-Menüs
  const INFO = {
    howto: {
      title: "How to use?",
      html: `
        <p><strong>DanceMusic</strong> hilft dir, passende Musik für jeden Standard- und Lateintanz zu finden – direkt über YouTube.</p>
        <ul>
          <li><strong>Training:</strong> Wähle einen Tanz und spiele die hinterlegten Lieder ab. Eigene Songs kannst du per YouTube-Link hinzufügen.</li>
          <li><strong>Party:</strong> Tippe oben auf ▶️, stelle für jeden Tanz mit Sternen (0–3) ein, wie oft er vorkommen soll, und starte eine zufällige Wiedergabe über alle Tänze.</li>
          <li>Lautstärke, Autoplay und das Wiederholen einzelner Lieder steuerst du unten in der Player-Leiste.</li>
        </ul>`,
    },
    impressum: {
      title: "Impressum",
      html: `
        <p>Angaben gemäß § 5 TMG</p>
        <p>Arthur Mutter<br>Ziegelei 16<br>73765 Neuhausen<br>Germany</p>
        <p><strong>Contact</strong><br>Email: <a href="mailto:arti.fun@gmx.de">arti.fun@gmx.de</a></p>`,
    },
    datenschutz: {
      title: "Datenschutz",
      html: `
        <p>Diese App speichert deine Einstellungen (eigene Songs, Tanz-Gewichtung, Design) ausschließlich lokal in deinem Browser (localStorage). Es werden keine personenbezogenen Daten an uns übertragen.</p>
        <p>Zum Abspielen wird der YouTube-Player von Google eingebunden. Dabei können Daten an Google übertragen werden; es gilt die <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Datenschutzerklärung von Google</a>.</p>
        <p><em>Bitte durch deine eigenen Angaben ersetzen.</em></p>`,
    },
  };

  function openInfo(key) {
    const info = INFO[key];
    if (!info) return;
    ui.infoTitle.textContent = info.title;
    ui.infoBody.innerHTML = info.html;
    ui.infoOverlay.classList.remove("hidden");
  }
  function closeInfo() {
    ui.infoOverlay.classList.add("hidden");
  }
  function setMenuOpen(open) {
    ui.menu.classList.toggle("hidden", !open);
    ui.menuBtn.setAttribute("aria-expanded", String(open));
  }

  /* ---------- Hilfsfunktionen ---------- */
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /* ---------- Views ---------- */
  function hideViews() {
    for (const v of [ui.viewDances, ui.viewSongs, ui.viewParty, ui.viewExport, ui.viewImport]) {
      v.classList.add("hidden");
    }
  }

  function showDances() {
    state.danceKey = null;
    hideViews();
    ui.viewDances.classList.remove("hidden");
    setTitle(null);
    renderDances();
  }

  function showSongs(danceKey) {
    state.danceKey = danceKey;
    hideViews();
    ui.viewSongs.classList.remove("hidden");
    setTitle(MODE_NAMES.training);
    const dance = Store.getDance(danceKey);
    ui.danceTitle.textContent = `${dance.emoji} ${dance.name}`;
    renderSongs();
  }

  function showParty() {
    hideViews();
    ui.viewParty.classList.remove("hidden");
    setTitle(MODE_NAMES.party);
    renderParty();
  }

  function showExport() {
    hideViews();
    ui.viewExport.classList.remove("hidden");
    setTitle(MODE_NAMES.export);
    state.exportSel = new Set(Store.getDances().map((d) => d.key));
    renderExport();
  }

  function showImport() {
    hideViews();
    ui.viewImport.classList.remove("hidden");
    setTitle(MODE_NAMES.import);
    state.importData = null;
    state.importSel = new Set();
    ui.importFile.value = "";
    ui.importBtn.disabled = true;
    renderImport();
  }

  function renderDances() {
    ui.danceList.innerHTML = "";
    for (const d of Store.getDances()) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "dance-card";
      btn.innerHTML = `
        <span class="emoji">${d.emoji}</span>
        <span class="meta">
          <span class="name">${d.name}</span>
          <span class="count">${Store.countSongs(d.key)} Songs</span>
        </span>`;
      btn.addEventListener("click", () => showSongs(d.key));
      li.appendChild(btn);
      ui.danceList.appendChild(li);
    }
  }

  function renderParty() {
    const weights = Store.getWeights();
    ui.partyList.innerHTML = "";
    for (const d of Store.getDances()) {
      const w = weights[d.key];
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "dance-card party-card";
      btn.innerHTML = `
        <span class="emoji">${d.emoji}</span>
        <span class="meta">
          <span class="name">${d.name}</span>
          <span class="count">${Store.countSongs(d.key)} Songs</span>
        </span>
        <span class="rating" role="group" aria-label="Häufigkeit ${d.name}">
          <span class="ban${w === 0 ? " on" : ""}" data-val="0" title="Nicht spielen">🚫</span>
          <span class="star${w >= 1 ? " on" : ""}" data-val="1">⭐</span>
          <span class="star${w >= 2 ? " on" : ""}" data-val="2">⭐</span>
          <span class="star${w >= 3 ? " on" : ""}" data-val="3">⭐</span>
        </span>`;

      // Direkttipp auf ein Emoji setzt den genauen Wert
      btn.querySelectorAll(".rating [data-val]").forEach((node) => {
        node.addEventListener("click", (e) => {
          e.stopPropagation();
          Store.setWeight(d.key, Number(node.dataset.val));
          renderParty();
        });
      });

      // Tipp auf die Karte zyklisch 0 → 1 → 2 → 3 → 0
      btn.addEventListener("click", () => {
        Store.setWeight(d.key, (Store.getWeight(d.key) + 1) % 4);
        renderParty();
      });

      li.appendChild(btn);
      ui.partyList.appendChild(li);
    }
  }

  /* ---------- Export / Import ---------- */
  // Baut eine ausw\u00e4hlbare Tanz-Karte mit Haken-Anzeige
  function selectCard(key, label, selected, onToggle) {
    const d = Store.getDance(key);
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "dance-card party-card";
    btn.innerHTML = `
      <span class="emoji">${d.emoji}</span>
      <span class="meta">
        <span class="name">${d.name}</span>
        <span class="count">${label}</span>
      </span>
      <span class="check">${selected ? "✅" : "⬜"}</span>`;
    btn.addEventListener("click", onToggle);
    li.appendChild(btn);
    return li;
  }

  function renderExport() {
    ui.exportList.innerHTML = "";
    for (const d of Store.getDances()) {
      const own = Store.getSongs(d.key).filter((s) => s.custom).length;
      const li = selectCard(d.key, `${own} eigene Songs`, state.exportSel.has(d.key), () => {
        if (state.exportSel.has(d.key)) state.exportSel.delete(d.key);
        else state.exportSel.add(d.key);
        renderExport();
      });
      ui.exportList.appendChild(li);
    }
  }

  function renderImport() {
    ui.importList.innerHTML = "";
    if (!state.importData) return;
    const keys = Object.keys(state.importData).filter((k) => Store.getDance(k));
    for (const key of keys) {
      const count = (state.importData[key] || []).length;
      const li = selectCard(key, `${count} Songs`, state.importSel.has(key), () => {
        if (state.importSel.has(key)) state.importSel.delete(key);
        else state.importSel.add(key);
        ui.importBtn.disabled = state.importSel.size === 0;
        renderImport();
      });
      ui.importList.appendChild(li);
    }
  }

  function doExport() {
    if (state.exportSel.size === 0) {
      alert("Bitte mindestens einen Tanz auswählen.");
      return;
    }
    const dances = {};
    let totalSongs = 0;
    for (const key of state.exportSel) {
      // Nur eigene Songs exportieren – die vorgegebenen sind bereits in der App enthalten
      const own = Store.getSongs(key)
        .filter((s) => s.custom)
        .map(({ id, title, artist }) => ({ id, title, artist }));
      dances[key] = own;
      totalSongs += own.length;
    }
    if (totalSongs === 0) {
      alert("Die ausgewählten Tänze enthalten keine eigenen Songs zum Exportieren.");
      return;
    }
    const payload = {
      app: "DanceMusic",
      type: "songs-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      dances,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dancemusic-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function loadImportFile() {
    const file = ui.importFile.files && ui.importFile.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const dances = data && data.dances;
      if (!dances || typeof dances !== "object") throw new Error("invalid");
      state.importData = dances;
      state.importSel = new Set(Object.keys(dances).filter((k) => Store.getDance(k)));
      ui.importBtn.disabled = state.importSel.size === 0;
      renderImport();
    } catch {
      state.importData = null;
      state.importSel = new Set();
      ui.importBtn.disabled = true;
      renderImport();
      alert("Datei konnte nicht gelesen werden. Bitte eine gültige DanceMusic-Export-Datei wählen.");
    }
  }

  function doImport() {
    if (!state.importData || state.importSel.size === 0) return;
    let added = 0;
    for (const key of state.importSel) {
      const existing = new Set(Store.getSongs(key).map((s) => s.id));
      for (const s of state.importData[key] || []) {
        if (!s || !s.id || existing.has(s.id)) continue;
        Store.addCustomSong(key, { id: s.id, title: s.title, artist: s.artist });
        existing.add(s.id);
        added += 1;
      }
    }
    renderDances();
    alert(`${added} Lied(er) importiert.`);
    showDances();
  }

  function renderSongs() {
    const songs = Store.getSongs(state.danceKey);
    ui.songList.innerHTML = "";

    if (songs.length === 0) {
      const empty = document.createElement("li");
      empty.className = "song-item";
      empty.innerHTML = `<span class="meta"><span class="s-title">Noch keine Songs</span>
        <span class="s-artist">Füge unten einen eigenen hinzu.</span></span>`;
      ui.songList.appendChild(empty);
    }

    songs.forEach((song, i) => {
      const li = document.createElement("li");
      li.className = "song-item";
      if (state.danceKey === state.playingDance && i === state.index) li.classList.add("playing");

      const search = encodeURIComponent(`${song.title} ${song.artist || ""}`);
      const looping = state.loopSongs.has(song.id);
      li.innerHTML = `
        <span class="play-dot">♪</span>
        <span class="meta">
          <span class="s-title">${escapeHtml(song.title)}</span>
          <span class="s-artist">${escapeHtml(song.artist || "")}</span>
        </span>
        <button class="loop-btn${looping ? " active" : ""}" title="Lied wiederholen"
           aria-label="Lied wiederholen" aria-pressed="${looping}">🔂</button>
        <a class="yt-link" href="https://www.youtube.com/results?search_query=${search}"
           target="_blank" rel="noopener" title="Auf YouTube suchen" aria-label="Auf YouTube suchen">🔎</a>
        ${song.custom ? '<button class="del-btn" title="Entfernen" aria-label="Entfernen">🗑</button>' : ""}`;

      li.querySelector(".meta").addEventListener("click", () => playQueueAt(songs, i));
      li.querySelector(".play-dot").addEventListener("click", () => playQueueAt(songs, i));

      li.querySelector(".loop-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.loopSongs.has(song.id)) state.loopSongs.delete(song.id);
        else state.loopSongs.add(song.id);
        renderSongs();
      });

      if (song.custom) {
        li.querySelector(".del-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          Store.removeCustomSong(state.danceKey, song.id);
          renderSongs();
          renderDances();
        });
      }
      ui.songList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ---------- Wiedergabe ---------- */
  function playQueueAt(songs, i) {
    state.partyMode = false;
    setPartyButton(false);
    updateSpeedVisibility();
    state.queue = songs;
    state.index = i;
    state.playingDance = state.danceKey;
    const song = songs[i];
    ui.playerBar.classList.remove("hidden");
    document.body.classList.add("player-active");
    ui.trackEmoji.textContent = Store.getDance(state.danceKey)?.emoji || "";
    ui.trackTitle.textContent = song.title;
    ui.trackArtist.textContent = song.artist || "";
    Player.play(song.id);
    renderSongs();
  }

  /* ---------- Party-Mode (zufällige Lieder) ---------- */
  function showTrack(song) {
    ui.playerBar.classList.remove("hidden");
    document.body.classList.add("player-active");
    ui.trackEmoji.textContent = Store.getDance(song.danceKey)?.emoji || "";
    ui.trackTitle.textContent = song.title;
    ui.trackArtist.textContent = song.artist || "";
  }

  function partyStart() {
    state.partyMode = true;
    state.playingDance = null;
    state.index = -1;
    state.partyHistory = [];
    state.partyPos = -1;
    setPartyButton(true);
    updateSpeedVisibility();
    if (state.danceKey === state.playingDance) renderSongs();
    partyNext();
  }

  function partyStop() {
    state.partyMode = false;
    Player.pause();
    setPartyButton(false);
  }

  function partyToggle() {
    if (state.partyMode) partyStop();
    else partyStart();
  }

  function setPartyButton(running) {
    ui.partyStartBtn.textContent = running ? "■" : "▶";
    ui.partyStartBtn.setAttribute("aria-label", running ? "Stop party" : "Start random music");
    ui.partyStartText.textContent = running ? "Stop party" : "Start party (random dances)";
  }

  // Geschwindigkeitsregler nur im Training-Modus zeigen
  function updateSpeedVisibility() {
    ui.speedControl.classList.toggle("hidden", state.partyMode);
  }

  // Abspielgeschwindigkeit in 5%-Schritten (0.5–2.0)
  const SPEED_STEP = 0.05;
  const SPEED_MIN = 0.5;
  const SPEED_MAX = 2;
  function setPlaybackRate(rate) {
    state.rate = Math.round(Math.min(SPEED_MAX, Math.max(SPEED_MIN, rate)) / SPEED_STEP) * SPEED_STEP;
    ui.speedValue.textContent = `${Math.round(state.rate * 100)}%`;
    Player.setPlaybackRate(state.rate);
  }

  function partyNext() {
    // Vorwärts in bereits gespielter Historie …
    if (state.partyPos < state.partyHistory.length - 1) {
      state.partyPos += 1;
    } else {
      // … sonst neues Lied gewichtet auswählen (aktuelle Likes)
      const pick = Store.pickRandomSong();
      if (!pick) {
        alert("Kein Tanz aktiv. Stelle mindestens einen Tanz auf 1–3 Sterne.");
        return;
      }
      state.partyHistory.push({ ...pick.song, danceKey: pick.danceKey });
      state.partyPos = state.partyHistory.length - 1;
    }
    showTrack(state.partyHistory[state.partyPos]);
    Player.play(state.partyHistory[state.partyPos].id);
  }

  function partyPrev() {
    if (state.partyPos <= 0) return;
    state.partyPos -= 1;
    showTrack(state.partyHistory[state.partyPos]);
    Player.play(state.partyHistory[state.partyPos].id);
  }

  function playNext(auto = false) {
    if (state.index < 0) return;
    const last = state.index >= state.queue.length - 1;
    if (last) {
      if (config.loopList) {
        state.index = 0;
      } else if (auto) {
        return; // Ende der Liste, kein Loop
      } else {
        state.index = 0; // manuelles Weiter springt auf Anfang
      }
    } else {
      state.index += 1;
    }
    playCurrent();
  }

  function playPrev() {
    if (state.index < 0) return;
    state.index = state.index <= 0 ? state.queue.length - 1 : state.index - 1;
    playCurrent();
  }

  function playCurrent() {
    const song = state.queue[state.index];
    if (!song) return;
    ui.trackTitle.textContent = song.title;
    ui.trackArtist.textContent = song.artist || "";
    Player.play(song.id);
    if (state.danceKey === state.playingDance) renderSongs();
  }

  function togglePlay() {
    if (Player.isPlaying()) {
      Player.pause();
    } else {
      Player.resume();
    }
  }

  /* ---------- Player-Events ---------- */
  function wirePlayer() {
    Player.on("play", () => { ui.playBtn.textContent = "⏸"; });
    Player.on("pause", () => { ui.playBtn.textContent = "▶"; });
    Player.on("ended", () => {
      ui.playBtn.textContent = "▶";
      if (state.partyMode) {
        if (config.autoplay) partyNext();
        return;
      }
      const current = state.queue[state.index];
      if (current && state.loopSongs.has(current.id)) {
        playCurrent();
      } else if (config.loopList && state.queue.length === 1) {
        playCurrent();
      } else if (config.autoplay) {
        playNext(true);
      }
    });
    Player.on("time", ({ cur, dur }) => {
      state.duration = dur;
      ui.durTime.textContent = fmtTime(dur);
      ui.curTime.textContent = fmtTime(cur);
      if (!state.seeking && dur > 0) {
        ui.seek.value = Math.round((cur / dur) * 100);
      }
    });
  }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    if (theme === "light") {
      document.body.classList.add("light");
    } else {
      document.body.classList.remove("light");
    }
  }

  /* ---------- Bildschirm anlassen (Wake Lock) ---------- */
  let wakeLock = null;

  async function acquireWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) {
      console.warn("Wake Lock nicht möglich:", e);
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      try { await wakeLock.release(); } catch (_) {}
      wakeLock = null;
    }
  }

  function setDisplayOn(on) {
    document.body.classList.toggle("display-on", on);
    ui.displayBtn.classList.toggle("active", on);
    ui.displayBtn.setAttribute("aria-pressed", String(on));
    if (on) acquireWakeLock(); else releaseWakeLock();
  }

  function toggleDisplayOn() {
    setDisplayOn(!document.body.classList.contains("display-on"));
  }

  // Wake Lock wird beim Tab-Wechsel vom Browser freigegeben – bei Rückkehr neu anfordern
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" &&
        document.body.classList.contains("display-on") && !wakeLock) {
      acquireWakeLock();
    }
  });

  /* ---------- Events verdrahten ---------- */
  function wireUi() {
    ui.songsBackBtn.addEventListener("click", showDances);

    // Burger-Menü
    ui.menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setMenuOpen(ui.menu.classList.contains("hidden"));
    });
    ui.menu.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        setMenuOpen(false);
        if (item.dataset.action === "training") showDances();
        else if (item.dataset.action === "party") showParty();
        else if (item.dataset.action === "export") showExport();
        else if (item.dataset.action === "import") showImport();
        else openInfo(item.dataset.info);
      });
    });
    ui.infoClose.addEventListener("click", closeInfo);
    ui.infoOverlay.addEventListener("click", (e) => {
      if (e.target === ui.infoOverlay) closeInfo();
    });
    document.addEventListener("click", (e) => {
      if (!ui.menu.classList.contains("hidden") &&
          !ui.menu.contains(e.target) && e.target !== ui.menuBtn) {
        setMenuOpen(false);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { setMenuOpen(false); closeInfo(); }
    });

    ui.partyStartBtn.addEventListener("click", partyToggle);
    ui.partyResetBtn.addEventListener("click", () => {
      Store.resetWeights();
      renderParty();
    });
    ui.exportBtn.addEventListener("click", doExport);
    ui.importFile.addEventListener("change", loadImportFile);
    ui.importBtn.addEventListener("click", doImport);
    ui.displayBtn.addEventListener("click", toggleDisplayOn);
    ui.playBtn.addEventListener("click", togglePlay);
    ui.nextBtn.addEventListener("click", () => (state.partyMode ? partyNext() : playNext(false)));
    ui.prevBtn.addEventListener("click", () => (state.partyMode ? partyPrev() : playPrev()));

    Player.setVolume(Number(ui.volume.value));
    ui.volume.addEventListener("input", () => Player.setVolume(Number(ui.volume.value)));

    setPlaybackRate(1);
    ui.speedDown.addEventListener("click", () => setPlaybackRate(state.rate - SPEED_STEP));
    ui.speedUp.addEventListener("click", () => setPlaybackRate(state.rate + SPEED_STEP));

    ui.seek.addEventListener("input", () => { state.seeking = true; });
    ui.seek.addEventListener("change", () => {
      if (state.duration > 0) {
        Player.seekTo((Number(ui.seek.value) / 100) * state.duration);
      }
      state.seeking = false;
    });

    ui.addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = Store.extractVideoId(ui.songUrl.value);
      if (!id) {
        alert("Bitte einen gültigen YouTube-Link oder eine 11-stellige Video-ID eingeben.");
        return;
      }
      Store.addCustomSong(state.danceKey, { id, title: ui.songTitle.value.trim() });
      ui.songUrl.value = "";
      ui.songTitle.value = "";
      renderSongs();
      renderDances();
    });
  }

  /* ---------- iOS-Hinweis (YouTube Premium / Werbung) ---------- */
  function maybeShowIosHint() {
    const HINT_KEY = "mydancemusic.iosHintDismissed";
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS && !localStorage.getItem(HINT_KEY)) {
      ui.iosHint.classList.remove("hidden");
    }
    ui.iosHintClose.addEventListener("click", () => {
      ui.iosHint.classList.add("hidden");
      localStorage.setItem(HINT_KEY, "1");
    });
  }

  /* ---------- Service Worker ---------- */
  function registerSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch((e) =>
          console.warn("Service Worker Registrierung fehlgeschlagen:", e)
        );
      });
    }
  }

  /* ---------- Init ---------- */
  async function init() {
    applyTheme(localStorage.getItem(THEME_KEY) || "dark");
    await Store.load();
    wirePlayer();
    wireUi();
    Player.loadApi();
    showDances();
    maybeShowIosHint();
    registerSW();
  }

  init();
})();
