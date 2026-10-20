import { MAX_PROMPTS, parseDocument, validatePrompt, mergeImport, newId } from './model.js';
import { initialDocument } from './presets.js';

export const STORAGE_KEY = 'dsh.quick-prompts.v1';

/** One document per browser origin. Mutations re-read disk to preserve other tabs' changes. */
export function createPromptStore(storage, events, locale) {
  const listeners = new Set();
  let snapshot;
  function read() {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return { data: raw === null ? initialDocument(locale) : parseDocument(raw), error: '' };
    } catch {
      return { data: initialDocument(locale), error: 'storageRead' };
    }
  }
  snapshot = read();
  function notify() { for (const listener of listeners) listener(); }
  function update(change) {
    const latest = read();
    if (latest.error) { snapshot = latest; notify(); throw new Error(latest.error); }
    const data = change(latest.data);
    // Validate before persistence; failed writes never pretend to have succeeded.
    const normalized = parseDocument(JSON.stringify(data));
    try { storage.setItem(STORAGE_KEY, JSON.stringify(normalized)); }
    catch { throw new Error('storageWrite'); }
    snapshot = { data: normalized, error: '' };
    notify();
  }
  const onStorage = event => {
    if (event.key === STORAGE_KEY || event.key === null) { snapshot = read(); notify(); }
  };
  events.addEventListener('storage', onStorage);
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    save(input) {
      let saved;
      update(data => {
        const existing = data.prompts.find(p => p.id === input.id);
        // A stale editor must not silently overwrite another tab's content.
        if (input.id && (!existing || existing.updatedAt !== input.updatedAt)) throw new Error('editConflict');
        if (!existing && data.prompts.length >= MAX_PROMPTS) throw new Error('tooMany');
        saved = validatePrompt({ ...input, id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? Date.now(), updatedAt: Math.max(Date.now(), (existing?.updatedAt ?? 0) + 1) });
        return { ...data, prompts: existing ? data.prompts.map(p => p.id === saved.id ? saved : p) : [...data.prompts, saved] };
      });
      return saved;
    },
    pin(id) {
      update(data => ({ ...data, prompts: data.prompts.map(p => p.id === id ? { ...p, pinned: !p.pinned, updatedAt: Math.max(Date.now(), p.updatedAt + 1) } : p) }));
    },
    remove(id) {
      update(data => ({ ...data, prompts: data.prompts.filter(p => p.id !== id), recent: data.recent.filter(item => item !== id) }));
    },
    used(id) {
      update(data => data.prompts.some(p => p.id === id) ? { ...data, recent: [id, ...data.recent.filter(item => item !== id)].slice(0, 20) } : data);
    },
    preferences(patch) { update(data => ({ ...data, preferences: { ...data.preferences, ...patch } })); },
    import(document, options) {
      let summary;
      update(data => { const result = mergeImport(data, document, options); summary = result; return result.data; });
      return summary;
    },
    raw() { return storage.getItem(STORAGE_KEY) ?? ''; },
    reset() {
      const data = initialDocument(locale);
      try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { throw new Error('storageWrite'); }
      snapshot = { data, error: '' }; notify();
    },
    dispose() { events.removeEventListener('storage', onStorage); listeners.clear(); },
  };
}
