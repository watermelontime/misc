/* App-Logik: Navigation, Rendering, Player-Steuerung */
(() => {
  const el = (id) => document.getElementById(id);

  // UI-Referenzen
  const ui = {
    viewDances: el("view-dances"),
    viewSongs: el("view-songs"),
    danceList: el("danceList"),
    songList: el("songList"),
    danceTitle: el("danceTitle"),
    backBtn: el("backBtn"),
    themeBtn: el("themeBtn"),
    addForm: el("addSongForm"),
    songUrl: el("songUrl"),
    songTitle: el("songTitle"),
    playerBar: el("playerBar"),
    trackTitle: el("trackTitle"),
    trackArtist: el("trackArtist"),
    playBtn: el("playBtn"),
    prevBtn: el("prevBtn"),
    nextBtn: el("nextBtn"),
    seek: el("seek"),
    curTime: el("curTime"),
    durTime: el("durTime"),
    volume: el("volume"),
    autoplayToggle: el("autoplayToggle"),
    loopToggle: el("loopToggle"),
  };

  // Zustand
  const state = {
    danceKey: null,
    queue: [],
    index: -1,
    seeking: false,
    duration: 0,
  };

  const THEME_KEY = "mydancemusic.theme";

  /* ---------- Hilfsfunktionen ---------- */
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /* ---------- Views ---------- */
  function showDances() {
    state.danceKey = null;
    ui.viewSongs.classList.add("hidden");
    ui.viewDances.classList.remove("hidden");
    ui.backBtn.classList.add("hidden");
    renderDances();
  }

  function showSongs(danceKey) {
    state.danceKey = danceKey;
    ui.viewDances.classList.add("hidden");
    ui.viewSongs.classList.remove("hidden");
    ui.backBtn.classList.remove("hidden");
    const dance = Store.getDance(danceKey);
    ui.danceTitle.textContent = `${dance.emoji} ${dance.name}`;
    renderSongs();
  }

  function renderDances() {
    ui.danceList.innerHTML = "";
    for (const d of Store.getDances()) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "dance-card";
      btn.innerHTML = `
        <span class="emoji">${d.emoji}</span>
        <span class="name">${d.name}</span>
        <span class="count">${Store.countSongs(d.key)} Songs</span>`;
      btn.addEventListener("click", () => showSongs(d.key));
      li.appendChild(btn);
      ui.danceList.appendChild(li);
    }
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
      li.innerHTML = `
        <span class="play-dot">♪</span>
        <span class="meta">
          <span class="s-title">${escapeHtml(song.title)}</span>
          <span class="s-artist">${escapeHtml(song.artist || "")}</span>
        </span>
        <a class="yt-link" href="https://www.youtube.com/results?search_query=${search}"
           target="_blank" rel="noopener" title="Auf YouTube suchen" aria-label="Auf YouTube suchen">🔎</a>
        ${song.custom ? '<button class="del-btn" title="Entfernen" aria-label="Entfernen">🗑</button>' : ""}`;

      li.querySelector(".meta").addEventListener("click", () => playQueueAt(songs, i));
      li.querySelector(".play-dot").addEventListener("click", () => playQueueAt(songs, i));

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
    state.queue = songs;
    state.index = i;
    state.playingDance = state.danceKey;
    const song = songs[i];
    ui.playerBar.classList.remove("hidden");
    ui.trackTitle.textContent = song.title;
    ui.trackArtist.textContent = song.artist || "";
    Player.play(song.id);
    renderSongs();
  }

  function playNext(auto = false) {
    if (state.index < 0) return;
    const last = state.index >= state.queue.length - 1;
    if (last) {
      if (ui.loopToggle.checked) {
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
      if (ui.loopToggle.checked && state.queue.length === 1) {
        playCurrent();
      } else if (ui.autoplayToggle.checked) {
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
      ui.themeBtn.textContent = "🌙";
    } else {
      document.body.classList.remove("light");
      ui.themeBtn.textContent = "☀️";
    }
  }
  function toggleTheme() {
    const light = !document.body.classList.contains("light");
    applyTheme(light ? "light" : "dark");
    localStorage.setItem(THEME_KEY, light ? "light" : "dark");
  }

  /* ---------- Events verdrahten ---------- */
  function wireUi() {
    ui.backBtn.addEventListener("click", showDances);
    ui.themeBtn.addEventListener("click", toggleTheme);
    ui.playBtn.addEventListener("click", togglePlay);
    ui.nextBtn.addEventListener("click", () => playNext(false));
    ui.prevBtn.addEventListener("click", playPrev);

    ui.volume.addEventListener("input", () => Player.setVolume(Number(ui.volume.value)));

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
    registerSW();
  }

  init();
})();
