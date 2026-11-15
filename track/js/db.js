/* Datenschicht: IndexedDB.
 *
 * Stores:
 *   topics  { id, name, order, params: [{ id, name, min, max, unit, color }] }
 *   entries { id, topicId, ts, values: { [paramId]: int }, note }
 *
 * WICHTIG: Bei Änderungen am Datenformat DB_VERSION erhöhen und in upgrade()
 * einen neuen "if (oldVersion < N)"-Block ergänzen. Bestehende Blöcke und
 * Daten nie löschen oder umschreiben, nur migrieren.
 */
"use strict";

const DB = (() => {
  const DB_NAME = "themen-tracker";
  const DB_VERSION = 1;
  let dbPromise = null;

  function upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore("topics", { keyPath: "id" });
      const entries = db.createObjectStore("entries", { keyPath: "id" });
      entries.createIndex("topicId", "topicId");
    }
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => upgrade(req.result, e.oldVersion);
      req.onsuccess = () => {
        const db = req.result;
        // Neuere App-Version in anderem Tab: Verbindung freigeben
        db.onversionchange = () => { db.close(); dbPromise = null; };
        db.onclose = () => { dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
      req.onblocked = () => { dbPromise = null; reject(new Error("Datenbank ist blockiert")); };
    });
    return dbPromise;
  }

  /* Führt fn(stores) in EINER Transaktion aus. Erst wenn die Transaktion
   * vollständig geschrieben ist, gilt die Änderung als gespeichert. */
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(["topics", "entries"], mode);
      let result;
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("Speichern abgebrochen"));
      try {
        result = fn({ topics: t.objectStore("topics"), entries: t.objectStore("entries") });
      } catch (err) {
        try { t.abort(); } catch (_) { /* bereits beendet */ }
        reject(err);
      }
    });
  }

  function getAll() {
    const out = { topics: [], entries: [] };
    return tx("readonly", (s) => {
      s.topics.getAll().onsuccess = (e) => { out.topics = e.target.result; };
      s.entries.getAll().onsuccess = (e) => { out.entries = e.target.result; };
      return out;
    });
  }

  const putTopics = (topics) => tx("readwrite", (s) => topics.forEach((t) => s.topics.put(t)));
  const putEntry = (entry) => tx("readwrite", (s) => { s.entries.put(entry); });
  const deleteEntry = (id) => tx("readwrite", (s) => { s.entries.delete(id); });

  /* Thema speichern und zugleich Einträge ändern/löschen (z.B. Parameter gelöscht). */
  const putTopicWithEntries = (topic, changedEntries, deletedEntryIds) =>
    tx("readwrite", (s) => {
      s.topics.put(topic);
      changedEntries.forEach((e) => s.entries.put(e));
      deletedEntryIds.forEach((id) => s.entries.delete(id));
    });

  const deleteTopic = (topicId, entryIds) =>
    tx("readwrite", (s) => {
      s.topics.delete(topicId);
      entryIds.forEach((id) => s.entries.delete(id));
    });

  /* Import "Zusammenführen": fügt hinzu / aktualisiert, löscht nichts. */
  const putMany = (topics, entries) =>
    tx("readwrite", (s) => {
      topics.forEach((t) => s.topics.put(t));
      entries.forEach((e) => s.entries.put(e));
    });

  /* Import "Ersetzen": Löschen und Schreiben in einer Transaktion –
   * schlägt etwas fehl, bleibt der alte Bestand unverändert. */
  const replaceAll = (topics, entries) =>
    tx("readwrite", (s) => {
      s.topics.clear();
      s.entries.clear();
      topics.forEach((t) => s.topics.put(t));
      entries.forEach((e) => s.entries.put(e));
    });

  return { open, getAll, putTopics, putEntry, deleteEntry, putTopicWithEntries, deleteTopic, putMany, replaceAll };
})();
