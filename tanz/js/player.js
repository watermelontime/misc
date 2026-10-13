/* Kapselt den versteckten YouTube-IFrame-Player (nur Ton) */
const Player = (() => {
  let yt = null;          // YT.Player Instanz
  let ready = false;
  let pending = null;     // Video-ID, die vor Ready angefordert wurde
  const handlers = {};    // { ready, play, pause, ended, time }
  let timeTimer = null;
  let volume = 100;       // gewünschte Lautstärke (0–100), auch vor Ready
  let rate = 1;           // gewünschte Abspielgeschwindigkeit, auch vor Ready

  // Von der YouTube-API global aufgerufen
  window.onYouTubeIframeAPIReady = function () {
    yt = new YT.Player("player", {
      height: "1",
      width: "1",
      playerVars: {
        playsinline: 1,
        controls: 0,
        disablekb: 1,
        rel: 0,
      },
      events: {
        onReady: onReady,
        onStateChange: onStateChange,
        onError: onError,
      },
    });
  };

  function loadApi() {
    if (document.getElementById("yt-api")) return;
    const tag = document.createElement("script");
    tag.id = "yt-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }

  function onReady() {
    ready = true;
    emit("ready");
    if (pending) {
      play(pending);
      pending = null;
    }
  }

  function onStateChange(e) {
    switch (e.data) {
      case YT.PlayerState.PLAYING:
        applyVolume(); // YouTube startet ggf. stummgeschaltet – Wunschlautstärke erzwingen
        applyRate();   // gewünschte Geschwindigkeit nach Videowechsel erneut setzen
        emit("play");
        startTimeLoop();
        break;
      case YT.PlayerState.PAUSED:
        emit("pause");
        stopTimeLoop();
        break;
      case YT.PlayerState.ENDED:
        stopTimeLoop();
        emit("ended");
        break;
    }
  }

  function onError(e) {
    emit("error", e.data);
  }

  function startTimeLoop() {
    stopTimeLoop();
    timeTimer = setInterval(() => {
      if (!yt || !yt.getDuration) return;
      emit("time", { cur: yt.getCurrentTime() || 0, dur: yt.getDuration() || 0 });
    }, 500);
  }
  function stopTimeLoop() {
    if (timeTimer) clearInterval(timeTimer);
    timeTimer = null;
  }

  function emit(name, payload) {
    if (handlers[name]) handlers[name](payload);
  }

  function on(name, fn) {
    handlers[name] = fn;
  }

  function play(videoId) {
    if (!ready || !yt) {
      pending = videoId;
      loadApi();
      return;
    }
    yt.loadVideoById(videoId);
    yt.playVideo();
  }

  function resume() { if (yt && ready) yt.playVideo(); }
  function pause() { if (yt && ready) yt.pauseVideo(); }

  function applyVolume() {
    if (!yt || !ready) return;
    yt.setVolume(volume);
    if (volume === 0) yt.mute(); else yt.unMute();
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(100, Number(v) || 0));
    applyVolume();
  }

  function applyRate() {
    if (yt && ready && yt.setPlaybackRate) yt.setPlaybackRate(rate);
  }

  function setPlaybackRate(r) {
    rate = Number(r) || 1;
    applyRate();
  }
  function seekTo(sec) { if (yt && ready) yt.seekTo(sec, true); }
  function getState() { return yt && ready ? yt.getPlayerState() : -1; }
  function isPlaying() { return getState() === (window.YT ? YT.PlayerState.PLAYING : 1); }

  return { loadApi, on, play, resume, pause, setVolume, setPlaybackRate, seekTo, isPlaying };
})();
