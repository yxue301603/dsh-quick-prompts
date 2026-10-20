/** Minimal composer contract fixture. The real DSH smoke test is recorded separately. */
import React, { useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

let language = 'zh'; let dictionaries = {}; const localeListeners = new Set();
let localeSnapshot = { active: language };
const sessions = { byId: { test: { cwd: 'C:/projects/alpha' } } }; const sessionListeners = new Set();
let slots = new Map(); let slotRevision = 0; const slotListeners = new Set();
let componentProps;
let disposers = [];
let documentState = { draft: '', draftRev: 0, phase: 'plain', attachmentIds: ['image-1'], occurrences: [] };
const inputListeners = new Set(); let editor;
let submitted = 0;
function publish() { for (const fn of inputListeners) fn(); }
const inputActions = {
  captureInsertion() { return { start: editor?.selectionStart ?? documentState.draft.length, end: editor?.selectionEnd ?? documentState.draft.length, draftRev: documentState.draftRev }; },
  insertText(text, span) {
    if (span.draftRev !== documentState.draftRev || documentState.phase !== 'plain') return false;
    documentState = { ...documentState, draft: documentState.draft.slice(0, span.start) + text + documentState.draft.slice(span.end), draftRev: documentState.draftRev + 1 };
    publish(); return true;
  },
  persistDraft() {},
  setDraft() { throw new Error('Plugin must not call setDraft'); },
  submit() { submitted++; throw new Error('Plugin must never submit'); },
};
const locale = {
  register(ns, dictionary) { dictionaries[ns] = dictionary; return () => { delete dictionaries[ns]; }; },
  bind(ns) { return (key, vars = {}) => (dictionaries[ns]?.[language]?.[key] ?? key).replace(/\{(\w+)\}/g, (_, field) => String(vars[field] ?? `{${field}}`)); },
  getSnapshot: () => localeSnapshot,
  subscribe(fn) { localeListeners.add(fn); return () => localeListeners.delete(fn); },
};
const ctx = {
  locale,
  sessions: { list: { getSnapshot: () => sessions, subscribe(fn) { sessionListeners.add(fn); return () => sessionListeners.delete(fn); } } },
  effect(fn) { const result = fn(); if (typeof result === 'function') disposers.push(result); return result; },
  slots: {
    inject(_name, fn) { return fn(); },
    register(meta, component) { slots.set(meta.name, component); slotRevision++; for (const fn of slotListeners) fn(); const dispose = () => { slots.delete(meta.name); slotRevision++; for (const fn of slotListeners) fn(); }; disposers.push(dispose); return dispose; },
  },
};
function useInput(selector) { return selector(useSyncExternalStore(fn => { inputListeners.add(fn); return () => inputListeners.delete(fn); }, () => documentState)); }
function Host() {
  useSyncExternalStore(fn => { slotListeners.add(fn); return () => slotListeners.delete(fn); }, () => slotRevision);
  const input = useInput(value => value);
  const [workspace, setWorkspace] = useState(sessions.byId.test.cwd);
  const Toolbar = slots.get('conversation.input.left'); const Pins = slots.get('conversation.input.dock');
  componentProps = { sessionId: 'test', inputActions, useInput };
  return <>
    <div className="host-title">DeepSeek Harness · isolated composer fixture</div>
    <div className="host-controls"><button onClick={() => { const path = workspace.endsWith('alpha') ? 'C:/projects/beta' : 'C:/projects/alpha'; sessions.byId.test.cwd = path; setWorkspace(path); for (const fn of sessionListeners) fn(); }}>切换项目</button><button onClick={() => document.body.classList.toggle('dark')}>切换主题</button><button onClick={() => { for (const dispose of [...disposers].reverse()) dispose(); disposers = []; }}>卸载插件</button></div>
    <div className="host-placeholder">今天想完成什么？</div>
    <div className="host-stage">
      {Pins && <Pins {...componentProps} />}
      <div className="host-input-bar"><div className="host-composer"><textarea aria-label="Harness 草稿" ref={element => { editor = element; }} value={input.draft} onChange={event => { documentState = { ...documentState, draft: event.target.value, draftRev: documentState.draftRev + 1 }; publish(); }} /><span className="host-attachment">image-1 · 附件保留</span><div className="host-tools">{Toolbar && <Toolbar {...componentProps} />}<span>{workspace} · Send</span></div></div></div>
    </div>
  </>;
}
window.__ModuleLoader__ = { load(entry) { const plugin = entry.factory(name => { if (name === 'react') return React; throw new Error(`Unexpected external ${name}`); }); window.__test.plugin = plugin; plugin.apply(ctx); } };
window.__test = {
  snapshot: () => ({ ...documentState, submitted }),
  setDraft(text) { documentState = { ...documentState, draft: text, draftRev: documentState.draftRev + 1 }; publish(); },
  setLocked(value) { documentState = { ...documentState, phase: value ? 'submitting' : 'plain' }; publish(); },
  setLanguage(value) { language = value; localeSnapshot = { active: value }; for (const fn of localeListeners) fn(); },
  ctx,
};
createRoot(document.getElementById('root')).render(<Host />);
