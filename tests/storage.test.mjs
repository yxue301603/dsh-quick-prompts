import test from 'node:test';
import assert from 'node:assert/strict';
import { createPromptStore, STORAGE_KEY } from '../src/storage.js';
import { initialDocument } from '../src/presets.js';

function disk() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; }
const draft = () => ({ title: '自己的指令', content: '保留我的原文', category: '', scope: 'global', workspace: '', pinned: false });

test('first-run presets can be edited/deleted and an empty library stays empty', () => {
  const storage = disk(); const store = createPromptStore(storage, new EventTarget(), 'zh');
  for (const prompt of [...store.getSnapshot().data.prompts]) store.remove(prompt.id);
  assert.equal(store.getSnapshot().data.prompts.length, 0);
  const reopened = createPromptStore(storage, new EventTarget(), 'zh');
  assert.equal(reopened.getSnapshot().data.prompts.length, 0);
  store.dispose(); reopened.dispose();
});

test('mutations preserve changes from another tab and reject stale editors', () => {
  const storage = disk(); const events = new EventTarget();
  const a = createPromptStore(storage, events, 'zh'); const b = createPromptStore(storage, events, 'zh');
  const first = a.save(draft()); const second = b.save({ ...draft(), title: '另一页' });
  a.pin(first.id);
  assert.ok(a.getSnapshot().data.prompts.some(p => p.id === second.id));
  assert.throws(() => b.save({ ...first, content: 'stale' }), /editConflict/);
  const latest = a.getSnapshot().data.prompts.find(p => p.id === first.id);
  b.save({ ...latest, content: 'new' });
  events.dispatchEvent(Object.assign(new Event('storage'), { key: STORAGE_KEY }));
  assert.equal(a.getSnapshot().data.prompts.find(p => p.id === first.id).content, 'new');
  a.dispose(); b.dispose();
});

test('corrupt or inaccessible storage never gets silently overwritten', () => {
  const storage = disk(); storage.setItem(STORAGE_KEY, '{broken');
  const store = createPromptStore(storage, new EventTarget(), 'zh');
  assert.equal(store.getSnapshot().error, 'storageRead');
  assert.throws(() => store.save(draft()), /storageRead/);
  assert.equal(store.raw(), '{broken');
  store.reset(); assert.equal(store.getSnapshot().error, '');
  const unavailable = createPromptStore({ getItem() { throw Error(); }, setItem() { throw Error(); } }, new EventTarget(), 'en');
  assert.equal(unavailable.getSnapshot().error, 'storageRead');
  store.dispose(); unavailable.dispose();
});

test('quota failures report failure and leave the snapshot unchanged', () => {
  const storage = disk(); storage.setItem(STORAGE_KEY, JSON.stringify(initialDocument()));
  const store = createPromptStore({ ...storage, setItem() { throw new Error('quota'); } }, new EventTarget(), 'zh');
  const before = store.getSnapshot();
  assert.throws(() => store.save(draft()), /storageWrite/);
  assert.equal(store.getSnapshot(), before);
  store.dispose();
});

test('unloading removes the storage listener', () => {
  let removed = 0;
  const store = createPromptStore(disk(), { addEventListener() {}, removeEventListener() { removed++; } }, 'zh');
  store.dispose(); assert.equal(removed, 1);
});
