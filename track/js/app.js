/* Themen-Tracker – Oberfläche und Logik (siehe spec.md) */
"use strict";

(() => {
  const MAX_PARAMS = 8;
  const DEFAULT_PARAMS = 4;
  const SLIDER_MAX_STEPS = 20; // bis zu so vielen Stufen: Schieberegler, sonst Zahlenfeld
  const PAGE_SIZE = 50;        // Einträge pro "Mehr anzeigen" in der Historie
  const EXPORT_FORMAT = 1;
  const LS_CURRENT = "themen-tracker.currentTopic";

  // Feste Farbreihenfolge für bis zu 8 Parameter (hell / dunkel)
  const COLORS_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
  const COLORS_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"];
  const darkMq = window.matchMedia("(prefers-color-scheme: dark)");

  const state = {
    topics: [],
    entries: [],
    currentId: null,
    shown: PAGE_SIZE,
    chart: null,
    newForm: null,
    standalone: false,
    persisted: null, // true / false / null = vom Browser nicht unterstützt
  };

  /* ---------- Helfer ---------- */

  const $ = (sel) => document.querySelector(sel);

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
  }

  const uid = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);

  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const colorOf = (param) => (darkMq.matches ? COLORS_DARK : COLORS_LIGHT)[param.color % 8];
  const currentTopic = () => state.topics.find((t) => t.id === state.currentId) || null;
  const topicEntries = (topicId) => state.entries.filter((e) => e.topicId === topicId);
  const withUnit = (value, param) => (param.unit ? `${value} ${param.unit}` : String(value));

  const pad2 = (n) => String(n).padStart(2, "0");
  const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const fmtDateTime = (ts) => dateTimeFmt.format(new Date(ts));

  function toLocalInput(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  const fromLocalInput = (str) => (str ? new Date(str).getTime() : NaN);

  let toastTimer = null;
  function toast(msg, isError) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("error", !!isError);
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), isError ? 6000 : 2500);
    // Über offenen Dialogen sichtbar bleiben
    const open = [...document.querySelectorAll("dialog[open]")].pop();
    (open || document.body).append(t);
  }

  /* Rückfrage; liefert den value des gewählten Buttons, sonst null. */
  function ask({ title, text, buttons }) {
    const dlg = $("#confirmDialog");
    $("#confirmTitle").textContent = title;
    $("#confirmText").textContent = text;
    const actions = $("#confirmActions");
    actions.replaceChildren();
    return new Promise((resolve) => {
      let result = null;
      for (const b of buttons) {
        actions.append(el("button", { class: "btn " + (b.cls || ""), text: b.label, onclick: () => { result = b.value; dlg.close(); } }));
      }
      actions.append(el("button", { class: "btn", text: "Abbrechen", onclick: () => dlg.close() }));
      dlg.addEventListener("close", () => resolve(result), { once: true });
      dlg.showModal();
    });
  }

  /* Fehlerhafte Eingabe des Nutzers: nur melden, Formular bleibt wie es ist. */
  class InputError extends Error {}

  /* Umschließt Aktionen: Fehler werden angezeigt. Bei unerwarteten Fehlern wird der
   * Stand neu aus der Datenbank gelesen, damit die Anzeige nie von den gespeicherten
   * Daten abweicht. */
  function guard(fn) {
    return async (...args) => {
      try {
        await fn(...args);
      } catch (err) {
        if (err instanceof InputError) { toast(err.message, true); return; }
        console.error(err);
        toast("Fehler: " + (err && err.message ? err.message : err), true);
        try { await reload(); renderAll(); } catch (_) { /* Datenbank nicht lesbar */ }
      }
    };
  }

  /* ---------- Laden ---------- */

  async function reload() {
    const data = await DB.getAll();
    state.topics = data.topics.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "de"));
    state.entries = data.entries;
    if (!state.topics.some((t) => t.id === state.currentId)) {
      state.currentId = state.topics.length ? state.topics[0].id : null;
    }
  }

  function selectTopic(id) {
    state.currentId = id;
    state.shown = PAGE_SIZE;
    try { localStorage.setItem(LS_CURRENT, id || ""); } catch (_) { /* nur Komfort */ }
  }

  /* ---------- Anzeige ---------- */

  function renderAll() {
    renderTopicSelect();
    renderTopicView();
  }

  function renderTopicSelect() {
    const sel = $("#topicSelect");
    sel.replaceChildren(...state.topics.map((t) => el("option", { value: t.id, text: t.name })));
    sel.value = state.currentId || "";
    sel.disabled = !state.topics.length;
    $("#editTopicBtn").disabled = !state.topics.length;
  }

  function renderTopicView() {
    const topic = currentTopic();
    $("#emptyState").classList.toggle("hidden", !!topic);
    $("#topicView").classList.toggle("hidden", !topic);
    if (!topic) { destroyChart(); return; }
    renderChart(topic);
    renderNewForm(topic);
    renderHistory(topic);
  }

  function renderNewForm(topic) {
    state.newForm = buildEntryForm(topic, null);
    $("#newEntryForm").replaceChildren(state.newForm.node);
  }

  function renderHistory(topic) {
    const list = topicEntries(topic.id).sort((a, b) => b.ts - a.ts);
    const box = $("#history");
    if (!list.length) {
      box.replaceChildren(el("p", { class: "muted", text: "Noch keine Einträge." }));
    } else {
      box.replaceChildren(...list.slice(0, state.shown).map((e) => entryRow(topic, e)));
    }
    const more = $("#moreBtn");
    more.classList.toggle("hidden", list.length <= state.shown);
    more.textContent = `Mehr anzeigen (${list.length - state.shown} weitere)`;
  }

  function entryRow(topic, entry) {
    const chips = el("div", { class: "chips" });
    for (const p of topic.params) {
      const v = entry.values[p.id];
      if (v == null) continue;
      const dot = el("span", { class: "dot" });
      dot.style.background = colorOf(p);
      chips.append(el("span", { class: "chip" }, dot, p.name + " ", el("b", { text: withUnit(v, p) })));
    }
    return el("div", { class: "entry" },
      el("div", { class: "entry-top" },
        el("span", { class: "when", text: fmtDateTime(entry.ts) }),
        el("button", { class: "btn", "aria-label": "Eintrag bearbeiten", text: "✎", onclick: () => openEntryDialog(topic, entry) }),
        el("button", { class: "btn", "aria-label": "Eintrag löschen", text: "🗑", onclick: guard(() => removeEntry(entry)) })),
      chips,
      entry.note ? el("p", { class: "note", text: entry.note }) : null);
  }

  /* ---------- Werteingabe ---------- */

  /* Eingabeelement für einen Parameter. read() liefert Zahl oder null (nicht erfasst)
   * und wirft bei ungültiger Eingabe. */
  function buildValueInput(param, initial) {
    const hasInitial = initial != null;
    const dot = el("span", { class: "dot" });
    dot.style.background = colorOf(param);
    const range = el("span", { class: "range", text: `${param.min}–${param.max}${param.unit ? " " + param.unit : ""}` });
    const name = el("span", { class: "name", text: param.name });
    const row = el("div", { class: "value-row" });

    if (param.max - param.min <= SLIDER_MAX_STEPS) {
      let value = hasInitial ? initial : null;
      const val = el("span", { class: "val" });
      const slider = el("input", { type: "range", min: param.min, max: param.max, step: 1, "aria-label": param.name });
      const clear = el("button", { class: "clear", type: "button", "aria-label": `${param.name} leeren`, text: "×" });
      const update = () => {
        row.classList.toggle("unset", value == null);
        val.textContent = value == null ? "–" : String(value);
      };
      slider.value = value == null ? Math.round((param.min + param.max) / 2) : clamp(value, param.min, param.max);
      const set = () => { value = Number(slider.value); update(); };
      slider.addEventListener("input", set);
      slider.addEventListener("change", set);
      // Antippen ohne Verschieben übernimmt den angezeigten Wert
      slider.addEventListener("pointerup", set);
      clear.addEventListener("click", () => { value = null; update(); });
      update();
      row.append(el("div", { class: "value-head" }, dot, name, range, val, clear), slider);
      return { node: row, read: () => value };
    }

    const input = el("input", {
      type: "number", min: param.min, max: param.max, step: 1, placeholder: "–", "aria-label": param.name,
      inputmode: param.min >= 0 ? "numeric" : null,
    });
    if (hasInitial) input.value = initial;
    const step = (delta) => {
      const cur = input.value.trim() === "" ? NaN : Number(input.value);
      input.value = Number.isFinite(cur) ? clamp(Math.round(cur) + delta, param.min, param.max) : param.min;
    };
    row.append(
      el("div", { class: "value-head" }, dot, name, range),
      el("div", { class: "stepper" },
        el("button", { class: "btn", type: "button", "aria-label": `${param.name} verringern`, text: "−", onclick: () => step(-1) }),
        input,
        el("button", { class: "btn", type: "button", "aria-label": `${param.name} erhöhen`, text: "+", onclick: () => step(1) })));
    return {
      node: row,
      read: () => {
        const txt = input.value.trim();
        if (txt === "") {
          // Leeres Feld mit ungültigem Inhalt (z.B. Buchstaben) nicht stillschweigend verwerfen
          if (input.validity && input.validity.badInput) throw new InputError(`${param.name}: Bitte eine ganze Zahl eingeben.`);
          return null;
        }
        const n = Number(txt);
        if (hasInitial && n === initial) return n; // unveränderter Altwert bleibt, auch außerhalb des Bereichs
        if (!Number.isInteger(n) || n < param.min || n > param.max) {
          throw new InputError(`${param.name}: Wert muss eine ganze Zahl von ${param.min} bis ${param.max} sein.`);
        }
        return n;
      },
    };
  }

  /* Formular für einen neuen (entry = null) oder bestehenden Eintrag. */
  function buildEntryForm(topic, entry) {
    let timeTouched = !!entry;
    const time = el("input", { type: "datetime-local", "aria-label": "Datum und Uhrzeit" });
    time.value = toLocalInput(entry ? entry.ts : Date.now());
    time.addEventListener("input", () => { timeTouched = true; });
    const inputs = topic.params.map((p) => ({ param: p, input: buildValueInput(p, entry ? entry.values[p.id] : null) }));
    const note = el("textarea", { rows: 2, placeholder: "z.B. Medikament genommen" });
    note.value = entry ? entry.note || "" : "";

    const node = el("div", { class: "entry-form" },
      el("label", { class: "field" }, el("span", { text: "Datum und Uhrzeit" }), time),
      ...inputs.map((i) => i.input.node),
      el("label", { class: "field" }, el("span", { text: "Notiz (optional)" }), note));

    return {
      node,
      read() {
        // Unverändertes Zeitfeld bei neuem Eintrag = "jetzt" beim Speichern
        const ts = timeTouched ? fromLocalInput(time.value) : Math.floor(Date.now() / 60000) * 60000;
        if (!Number.isFinite(ts)) throw new InputError("Bitte Datum und Uhrzeit angeben.");
        const values = {};
        for (const { param, input } of inputs) {
          const v = input.read();
          if (v != null) values[param.id] = v;
        }
        const text = note.value.trim();
        if (!Object.keys(values).length && !text) throw new InputError("Bitte mindestens einen Wert oder eine Notiz eingeben.");
        return { ts, values, note: text };
      },
    };
  }

  /* ---------- Einträge ---------- */

  async function saveNewEntry() {
    const topic = currentTopic();
    if (!topic || !state.newForm) return;
    const data = state.newForm.read();
    await DB.putEntry({ id: uid(), topicId: topic.id, ...data });
    await reload();
    renderTopicView();
    toast("Eintrag gespeichert");
  }

  function openEntryDialog(topic, entry) {
    const form = buildEntryForm(topic, entry);
    $("#entryDialogBody").replaceChildren(form.node);
    const dlg = $("#entryDialog");
    $("#entryDialogSave").onclick = guard(async () => {
      const data = form.read();
      await DB.putEntry({ id: entry.id, topicId: entry.topicId, ...data });
      dlg.close();
      await reload();
      renderTopicView();
      toast("Eintrag geändert");
    });
    dlg.showModal();
  }

  async function removeEntry(entry) {
    const ok = await ask({
      title: "Eintrag löschen?",
      text: `Der Eintrag vom ${fmtDateTime(entry.ts)} wird endgültig gelöscht.`,
      buttons: [{ label: "Endgültig löschen", value: true, cls: "danger" }],
    });
    if (!ok) return;
    await DB.deleteEntry(entry.id);
    await reload();
    renderTopicView();
  }

  /* ---------- Diagramm ---------- */

  function destroyChart() {
    if (state.chart) { state.chart.destroy(); state.chart = null; }
  }

  function renderChart(topic) {
    destroyChart();
    const list = topicEntries(topic.id).sort((a, b) => a.ts - b.ts);
    const hasValues = list.some((e) => Object.keys(e.values).length);
    $("#chartWrap").classList.toggle("hidden", !hasValues);
    $("#chartHint").classList.toggle("hidden", !hasValues);
    $("#chartEmpty").classList.toggle("hidden", hasValues);
    $("#resetZoomBtn").classList.add("hidden");
    if (!hasValues || typeof Chart === "undefined") return;

    const css = getComputedStyle(document.documentElement);
    const textColor = css.getPropertyValue("--text-2").trim();
    const gridColor = css.getPropertyValue("--border").trim();
    const surface = css.getPropertyValue("--surface").trim();
    const notes = new Map(list.filter((e) => e.note).map((e) => [e.ts, e.note]));

    const datasets = topic.params.map((p) => {
      const color = colorOf(p);
      const data = [];
      for (const e of list) {
        const v = e.values[p.id];
        if (v == null) continue;
        // Normiert auf 0–100 % des Wertebereichs; Werte außerhalb werden auf den Rand begrenzt
        data.push({ x: e.ts, y: ((clamp(v, p.min, p.max) - p.min) / (p.max - p.min)) * 100, raw: v });
      }
      return {
        label: p.name, data, param: p,
        borderColor: color, backgroundColor: color,
        borderWidth: 2, tension: 0, spanGaps: true,
        pointRadius: data.length > 40 ? 2.5 : 4, pointHoverRadius: 6, pointHitRadius: 14,
        pointBorderColor: surface, pointBorderWidth: 1,
      };
    }).filter((d) => d.data.length);

    const HOUR = 3600 * 1000, DAY = 24 * HOUR;
    const first = list[0].ts, last = list[list.length - 1].ts;
    const padX = Math.max((last - first) * 0.03, first === last ? 12 * HOUR : HOUR);
    const xMin = first - padX, xMax = last + padX;

    const showReset = () => $("#resetZoomBtn").classList.remove("hidden");

    state.chart = new Chart($("#chart"), {
      type: "line",
      data: { datasets },
      options: {
        parsing: false, animation: false, responsive: true, maintainAspectRatio: false,
        interaction: { mode: "nearest", axis: "x", intersect: false },
        scales: {
          x: {
            type: "linear", min: xMin, max: xMax,
            grid: { color: gridColor },
            ticks: {
              color: textColor, maxRotation: 0, autoSkipPadding: 16, maxTicksLimit: 6,
              callback(value) {
                const span = this.max - this.min;
                const d = new Date(value);
                const date = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
                if (span < 3 * DAY) return `${date} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
                if (span < 300 * DAY) return date;
                return `${date}${String(d.getFullYear()).slice(2)}`;
              },
            },
          },
          y: {
            min: 0, max: 100,
            grid: { color: gridColor },
            ticks: { color: textColor, stepSize: 25, callback: (v) => v + " %" },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: textColor, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8, padding: 14 },
          },
          tooltip: {
            callbacks: {
              title: (items) => (items.length ? fmtDateTime(items[0].raw.x) : ""),
              label: (item) => ` ${item.dataset.label}: ${withUnit(item.raw.raw, item.dataset.param)}`,
              footer: (items) => (items.length && notes.has(items[0].raw.x) ? notes.get(items[0].raw.x) : ""),
            },
          },
          zoom: {
            limits: { x: { min: xMin, max: xMax, minRange: HOUR } },
            pan: { enabled: true, mode: "x", onPanComplete: showReset },
            zoom: { mode: "x", pinch: { enabled: true }, wheel: { enabled: true }, onZoomComplete: showReset },
          },
        },
      },
    });
  }

  /* ---------- Themen und Parameter ---------- */

  function freeColor(topic) {
    const used = new Set(topic.params.map((p) => p.color));
    for (let i = 0; i < MAX_PARAMS; i++) if (!used.has(i)) return i;
    return topic.params.length % MAX_PARAMS;
  }

  const newParam = (topic, name) => ({ id: uid(), name, min: 0, max: 10, unit: "", color: freeColor(topic) });

  async function createTopic() {
    const topic = {
      id: uid(), name: "Neues Thema", params: [],
      order: state.topics.reduce((m, t) => Math.max(m, t.order), -1) + 1,
    };
    for (let i = 1; i <= DEFAULT_PARAMS; i++) topic.params.push(newParam(topic, `Parameter ${i}`));
    await DB.putTopics([topic]);
    await reload();
    selectTopic(topic.id);
    renderAll();
    openTopicDialog(true);
  }

  function openTopicDialog(focusName) {
    if (!currentTopic()) return;
    renderTopicDialog();
    $("#topicDialog").showModal();
    if (focusName) {
      const name = $("#topicDialogBody input");
      name.focus();
      name.select();
    }
  }

  /* Alle Änderungen im Dialog werden sofort gespeichert. */
  function renderTopicDialog() {
    const topic = currentTopic();
    const body = $("#topicDialogBody");
    if (!topic) { $("#topicDialog").close(); return; }
    const save = () => DB.putTopics([topic]).then(renderTopicSelect);
    const idx = state.topics.indexOf(topic);

    const nameInput = el("input", { type: "text", maxlength: 60 });
    nameInput.value = topic.name;
    nameInput.addEventListener("change", guard(async () => {
      const v = nameInput.value.trim();
      if (!v) { nameInput.value = topic.name; return; }
      topic.name = v;
      await save();
    }));

    const paramCards = topic.params.map((p, i) => {
      const dot = el("span", { class: "dot" });
      dot.style.background = colorOf(p);
      const name = el("input", { type: "text", maxlength: 40, "aria-label": "Name des Parameters" });
      name.value = p.name;
      name.addEventListener("change", guard(async () => {
        const v = name.value.trim();
        if (!v) { name.value = p.name; return; }
        p.name = v;
        await save();
      }));
      const min = el("input", { type: "number", step: 1 });
      const max = el("input", { type: "number", step: 1 });
      min.value = p.min;
      max.value = p.max;
      const rangeChanged = guard(async () => {
        const lo = min.value.trim() === "" ? NaN : Number(min.value);
        const hi = max.value.trim() === "" ? NaN : Number(max.value);
        if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo >= hi) {
          min.value = p.min;
          max.value = p.max;
          toast("Wertebereich: ganze Zahlen, Minimum kleiner als Maximum.", true);
          return;
        }
        p.min = lo;
        p.max = hi;
        await save();
      });
      min.addEventListener("change", rangeChanged);
      max.addEventListener("change", rangeChanged);
      const unit = el("input", { type: "text", maxlength: 12, placeholder: "z.B. kg" });
      unit.value = p.unit;
      unit.addEventListener("change", guard(async () => { p.unit = unit.value.trim(); await save(); }));

      return el("div", { class: "param-card" },
        el("div", { class: "param-top" }, dot, name,
          el("button", { class: "btn", "aria-label": "Parameter nach oben", text: "↑", disabled: i === 0, onclick: guard(() => moveParam(topic, i, -1)) }),
          el("button", { class: "btn", "aria-label": "Parameter nach unten", text: "↓", disabled: i === topic.params.length - 1, onclick: guard(() => moveParam(topic, i, 1)) }),
          el("button", { class: "btn danger", "aria-label": "Parameter löschen", text: "🗑", disabled: topic.params.length <= 1, onclick: guard(() => removeParam(topic, p)) })),
        el("div", { class: "param-grid" },
          el("label", { class: "field" }, el("span", { text: "Minimum" }), min),
          el("label", { class: "field" }, el("span", { text: "Maximum" }), max),
          el("label", { class: "field" }, el("span", { text: "Einheit" }), unit)));
    });

    body.replaceChildren(
      el("label", { class: "field" }, el("span", { text: "Name des Themas" }), nameInput),
      el("div", { class: "section-title", text: `Parameter (${topic.params.length} von ${MAX_PARAMS})` }),
      ...paramCards,
      el("button", {
        class: "btn wide", text: "＋ Parameter hinzufügen", disabled: topic.params.length >= MAX_PARAMS,
        onclick: guard(async () => {
          topic.params.push(newParam(topic, `Parameter ${topic.params.length + 1}`));
          await save();
          renderTopicDialog();
        }),
      }),
      el("div", { class: "section-title", text: "Reihenfolge der Themen" }),
      el("div", { class: "row" },
        el("button", { class: "btn", text: "↑ Weiter nach vorne", disabled: idx === 0, onclick: guard(() => moveTopic(topic, -1)) }),
        el("button", { class: "btn", text: "↓ Weiter nach hinten", disabled: idx === state.topics.length - 1, onclick: guard(() => moveTopic(topic, 1)) })),
      el("div", { class: "section-title", text: "Löschen" }),
      el("button", { class: "btn danger wide", text: "Thema löschen …", onclick: guard(() => removeTopic(topic)) }));
  }

  async function moveParam(topic, index, delta) {
    const [p] = topic.params.splice(index, 1);
    topic.params.splice(index + delta, 0, p);
    await DB.putTopics([topic]);
    renderTopicDialog();
  }

  async function removeParam(topic, param) {
    const affected = topicEntries(topic.id).filter((e) => e.values[param.id] != null);
    const ok = await ask({
      title: `Parameter „${param.name}" löschen?`,
      text: affected.length
        ? `Der Parameter und seine ${affected.length} erfassten Werte werden endgültig gelöscht.`
        : "Der Parameter wird endgültig gelöscht.",
      buttons: [{ label: "Endgültig löschen", value: true, cls: "danger" }],
    });
    if (!ok) return;
    const updated = clone(topic);
    updated.params = updated.params.filter((p) => p.id !== param.id);
    const changed = [], deleted = [];
    for (const e of affected) {
      const copy = clone(e);
      delete copy.values[param.id];
      // Einträge ohne verbleibenden Inhalt entfallen
      if (!Object.keys(copy.values).length && !copy.note) deleted.push(e.id);
      else changed.push(copy);
    }
    await DB.putTopicWithEntries(updated, changed, deleted);
    await reload();
    renderTopicDialog();
  }

  async function moveTopic(topic, delta) {
    const list = state.topics.slice();
    const i = list.indexOf(topic);
    list.splice(i, 1);
    list.splice(i + delta, 0, topic);
    list.forEach((t, n) => { t.order = n; });
    await DB.putTopics(list);
    await reload();
    renderTopicSelect();
    renderTopicDialog();
  }

  async function removeTopic(topic) {
    const ids = topicEntries(topic.id).map((e) => e.id);
    const ok = await ask({
      title: `Thema „${topic.name}" löschen?`,
      text: `Das Thema, alle seine Parameter und ${ids.length} Einträge werden endgültig gelöscht.`,
      buttons: [{ label: "Endgültig löschen", value: true, cls: "danger" }],
    });
    if (!ok) return;
    await DB.deleteTopic(topic.id, ids);
    $("#topicDialog").close();
    await reload();
    selectTopic(state.currentId);
    renderAll();
  }

  /* ---------- Export ---------- */

  async function exportData() {
    const data = await DB.getAll(); // direkt aus der Datenbank, nicht aus dem Anzeige-Stand
    const payload = {
      app: "themen-tracker", format: EXPORT_FORMAT, exportedAt: new Date().toISOString(),
      topics: data.topics, entries: data.entries,
    };
    const d = new Date();
    const fileName = `themen-tracker-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.json`;
    const json = JSON.stringify(payload, null, 1);

    // Auf dem Handy: Teilen-Dialog (In Dateien sichern, AirDrop, Mail …)
    if (navigator.maxTouchPoints > 0 && navigator.canShare) {
      const file = new File([json], fileName, { type: "application/json" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return; // vom Nutzer abgebrochen
        }
      }
    }
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = el("a", { href: url, download: fileName });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /* ---------- Import ---------- */

  /* Prüft eine Importdatei vollständig und liefert bereinigte Daten.
   * Wirft bei jedem Fehler – der Bestand wird dann nicht angefasst. */
  function parseImport(text) {
    const fail = (msg) => { throw new InputError("Datei ungültig: " + msg); };
    let obj;
    try { obj = JSON.parse(text); } catch (_) { fail("kein lesbares JSON."); }
    if (!obj || typeof obj !== "object" || obj.app !== "themen-tracker") fail("kein Themen-Tracker-Export.");
    if (!Number.isInteger(obj.format) || obj.format < 1) fail("Formatangabe fehlt.");
    if (obj.format > EXPORT_FORMAT) fail("stammt aus einer neueren App-Version.");
    if (!Array.isArray(obj.topics) || !Array.isArray(obj.entries)) fail("Themen oder Einträge fehlen.");

    const isId = (v) => typeof v === "string" && v.length > 0 && v.length <= 100;
    const topics = [];
    const paramIds = new Map(); // topicId -> Set(paramId)
    obj.topics.forEach((t, ti) => {
      if (!t || typeof t !== "object" || !isId(t.id) || paramIds.has(t.id)) fail(`Thema ${ti + 1} hat keine eindeutige Kennung.`);
      if (typeof t.name !== "string" || !t.name.trim()) fail(`Thema ${ti + 1} hat keinen Namen.`);
      if (!Array.isArray(t.params) || t.params.length < 1 || t.params.length > MAX_PARAMS) fail(`Thema „${t.name}" braucht 1 bis ${MAX_PARAMS} Parameter.`);
      const ids = new Set();
      const params = t.params.map((p, pi) => {
        if (!p || typeof p !== "object" || !isId(p.id) || ids.has(p.id)) fail(`Parameter ${pi + 1} in „${t.name}" hat keine eindeutige Kennung.`);
        if (typeof p.name !== "string" || !p.name.trim()) fail(`Parameter ${pi + 1} in „${t.name}" hat keinen Namen.`);
        if (!Number.isInteger(p.min) || !Number.isInteger(p.max) || p.min >= p.max) fail(`Wertebereich von „${p.name}" ist ungültig.`);
        ids.add(p.id);
        return {
          id: p.id, name: p.name.trim(), min: p.min, max: p.max,
          unit: typeof p.unit === "string" ? p.unit : "",
          color: Number.isInteger(p.color) && p.color >= 0 && p.color < MAX_PARAMS ? p.color : pi,
        };
      });
      paramIds.set(t.id, ids);
      topics.push({ id: t.id, name: t.name.trim(), order: Number.isFinite(t.order) ? t.order : ti, params });
    });

    const entryIds = new Set();
    const entries = obj.entries.map((e, ei) => {
      const where = `Eintrag ${ei + 1}`;
      if (!e || typeof e !== "object" || !isId(e.id) || entryIds.has(e.id)) fail(`${where} hat keine eindeutige Kennung.`);
      if (!paramIds.has(e.topicId)) fail(`${where} gehört zu keinem Thema der Datei.`);
      if (!Number.isFinite(e.ts)) fail(`${where} hat kein gültiges Datum.`);
      if (!e.values || typeof e.values !== "object" || Array.isArray(e.values)) fail(`${where} hat keine Werte.`);
      const values = {};
      for (const [pid, v] of Object.entries(e.values)) {
        if (!paramIds.get(e.topicId).has(pid)) fail(`${where} enthält einen Wert für einen unbekannten Parameter.`);
        if (!Number.isInteger(v)) fail(`${where} enthält einen ungültigen Wert.`);
        values[pid] = v;
      }
      if (e.note != null && typeof e.note !== "string") fail(`${where} hat eine ungültige Notiz.`);
      entryIds.add(e.id);
      return { id: e.id, topicId: e.topicId, ts: e.ts, values, note: e.note || "" };
    });
    return { topics, entries };
  }

  const entryKey = (e) =>
    JSON.stringify([e.topicId, e.ts, Object.keys(e.values).sort().map((k) => [k, e.values[k]]), e.note || ""]);

  /* Zusammenführen: nichts wird gelöscht oder überschrieben. */
  async function mergeImport(data) {
    const existing = new Map(state.topics.map((t) => [t.id, t]));
    let nextOrder = state.topics.reduce((m, t) => Math.max(m, t.order), -1) + 1;
    const topicsToPut = [];
    const allowed = new Map(); // topicId -> Set der Parameter, deren Werte übernommen werden
    for (const imp of data.topics) {
      const ex = existing.get(imp.id);
      if (!ex) {
        imp.order = nextOrder++;
        topicsToPut.push(imp);
        allowed.set(imp.id, new Set(imp.params.map((p) => p.id)));
        continue;
      }
      // Vorhandenes Thema bleibt wie es ist; fehlende Parameter werden ergänzt, soweit Platz ist
      const copy = clone(ex);
      let added = false;
      for (const p of imp.params) {
        if (copy.params.some((q) => q.id === p.id) || copy.params.length >= MAX_PARAMS) continue;
        copy.params.push({ ...p, color: freeColor(copy) });
        added = true;
      }
      if (added) topicsToPut.push(copy);
      allowed.set(imp.id, new Set(copy.params.map((p) => p.id)));
    }

    const ids = new Set(state.entries.map((e) => e.id));
    const keys = new Set(state.entries.map(entryKey));
    const entriesToPut = [];
    let skipped = 0;
    for (const e of data.entries) {
      const ok = allowed.get(e.topicId);
      for (const pid of Object.keys(e.values)) if (!ok.has(pid)) delete e.values[pid];
      const key = entryKey(e);
      if (ids.has(e.id) || keys.has(key) || (!Object.keys(e.values).length && !e.note)) { skipped++; continue; }
      ids.add(e.id);
      keys.add(key);
      entriesToPut.push(e);
    }
    await DB.putMany(topicsToPut, entriesToPut);
    return { added: entriesToPut.length, skipped };
  }

  async function importFile(file) {
    const data = parseImport(await file.text());
    const summary = `Die Datei enthält ${data.topics.length} Themen und ${data.entries.length} Einträge.`;
    let mode = "replace";
    if (state.topics.length || state.entries.length) {
      mode = await ask({
        title: "Import",
        text: `${summary} Es sind bereits Daten vorhanden (${state.topics.length} Themen, ${state.entries.length} Einträge). Wie soll importiert werden?`,
        buttons: [
          { label: "Zusammenführen (nichts wird gelöscht)", value: "merge", cls: "primary" },
          { label: "Bestand ersetzen …", value: "replace", cls: "danger" },
        ],
      });
      if (!mode) return;
      if (mode === "replace") {
        const sure = await ask({
          title: "Bestand wirklich ersetzen?",
          text: `Alle vorhandenen Daten (${state.topics.length} Themen, ${state.entries.length} Einträge) werden endgültig gelöscht und durch den Inhalt der Datei ersetzt.`,
          buttons: [{ label: "Ja, alles ersetzen", value: true, cls: "danger" }],
        });
        if (!sure) return;
      }
    }
    let msg;
    if (mode === "merge") {
      const r = await mergeImport(data);
      msg = `Import: ${r.added} Einträge hinzugefügt, ${r.skipped} übersprungen.`;
    } else {
      await DB.replaceAll(data.topics, data.entries);
      msg = `Import: ${data.topics.length} Themen, ${data.entries.length} Einträge.`;
    }
    await reload();
    selectTopic(state.currentId);
    renderAll();
    $("#dataDialog").close();
    toast(msg);
  }

  /* ---------- Speicherstatus ---------- */

  async function initStorage() {
    state.standalone = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    try {
      if (navigator.storage && navigator.storage.persist) {
        state.persisted = await navigator.storage.persisted();
        if (!state.persisted) state.persisted = await navigator.storage.persist();
      }
    } catch (_) { state.persisted = null; }

    const banner = $("#banner");
    let text = "";
    if (!state.standalone) {
      text = "Die App läuft im Browser-Tab. Damit deine Daten sicher gespeichert bleiben: Teilen-Symbol → „Zum Home-Bildschirm“ wählen und die App von dort starten.";
    } else if (state.persisted === false) {
      text = "Der Browser hat dauerhaften Speicher nicht zugesagt. Bitte regelmäßig über ⋮ → Export sichern.";
    }
    banner.textContent = text;
    banner.classList.toggle("hidden", !text);

    $("#storageStatus").textContent =
      (state.persisted === true ? "✅ Dauerhafter Speicher: gewährt."
        : state.persisted === false ? "⚠️ Dauerhafter Speicher: vom Browser nicht gewährt."
        : "⚠️ Dauerhafter Speicher: wird von diesem Browser nicht unterstützt.")
      + (state.standalone ? " App läuft vom Home-Bildschirm." : " App läuft im Browser-Tab, nicht vom Home-Bildschirm.");
  }

  /* ---------- Start ---------- */

  function bindEvents() {
    $("#topicSelect").addEventListener("change", (e) => { selectTopic(e.target.value); renderTopicView(); });
    $("#newTopicBtn").addEventListener("click", guard(createTopic));
    $("#firstTopicBtn").addEventListener("click", guard(createTopic));
    $("#editTopicBtn").addEventListener("click", () => openTopicDialog(false));
    $("#dataBtn").addEventListener("click", () => $("#dataDialog").showModal());
    $("#saveEntryBtn").addEventListener("click", guard(saveNewEntry));
    $("#moreBtn").addEventListener("click", () => { state.shown += PAGE_SIZE; renderHistory(currentTopic()); });
    $("#resetZoomBtn").addEventListener("click", () => {
      if (state.chart) state.chart.resetZoom();
      $("#resetZoomBtn").classList.add("hidden");
    });
    $("#exportBtn").addEventListener("click", guard(exportData));
    $("#importBtn").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", guard(async (e) => {
      const file = e.target.files[0];
      e.target.value = ""; // dieselbe Datei erneut wählbar
      if (file) await importFile(file);
    }));
    // Nach dem Bearbeiten eines Themas Formular, Diagramm und Historie neu aufbauen
    $("#topicDialog").addEventListener("close", guard(async () => { await reload(); renderAll(); }));
    for (const btn of document.querySelectorAll("[data-close]")) {
      btn.addEventListener("click", () => btn.closest("dialog").close());
    }
    darkMq.addEventListener("change", () => renderTopicView());
  }

  async function start() {
    bindEvents();
    try { state.currentId = localStorage.getItem(LS_CURRENT) || null; } catch (_) { /* nur Komfort */ }
    try {
      await reload();
    } catch (err) {
      console.error(err);
      toast("Die Datenbank konnte nicht geöffnet werden: " + (err && err.message ? err.message : err), true);
      return;
    }
    renderAll();
    initStorage();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch((err) => console.warn("Service Worker:", err));
    }
  }

  start();
})();
