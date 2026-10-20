import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { MAX_IMPORT_BYTES, exportDocument, mergeImport, normalizeWorkspace, parseDocument, renderTemplate, selectPrompts, variablesIn, visiblePrompts } from './model.js';
import { createPromptStore } from './storage.js';
import { insertPrompt } from './insertion.js';
import { en, zh } from './locale.js';
import styles from './styles.js';

const ID = 'dsh-quick-prompts';
const NS = 'quickPrompts';
const iconPaths = {
  bolt: 'm13 2-9 12h7l-1 8 10-12h-7z',
  search: 'M21 21l-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14', close: 'm6 6 12 12M6 18 18 6',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
  edit: 'm15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z',
  copy: 'M9 9h11v11H9zM15 5V3H3v12h2',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
  back: 'm14 6-6 6 6 6', settings: 'M4 6h16M4 12h16M4 18h16M9 3v6M15 9v6M9 15v6',
  down: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
};
function Icon({ name, size = 16, filled = false }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name] ?? iconPaths.bolt} /></svg>;
}

function useWorkspace(ctx, sessionId) {
  const subscribe = useCallback(fn => ctx.sessions.list.subscribe(fn), [ctx]);
  const read = useCallback(() => normalizeWorkspace(ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd ?? ''), [ctx, sessionId]);
  return useSyncExternalStore(subscribe, read, read);
}

function createPanels() {
  const panels = new Map();
  function forSession(id) {
    if (!panels.has(id)) {
      let state = { open: false, view: 'list', span: null };
      const listeners = new Set();
      panels.set(id, {
        getSnapshot: () => state,
        subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
        set: patch => { state = { ...state, ...patch }; for (const fn of listeners) fn(); },
      });
    }
    return panels.get(id);
  }
  return { forSession, dispose: () => panels.clear() };
}

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createComponents(ctx, store, panels, translate) {
  function useT() {
    useSyncExternalStore(fn => ctx.locale.subscribe(fn), () => ctx.locale.getSnapshot());
    return translate;
  }
  function useLibrary() { return useSyncExternalStore(store.subscribe, store.getSnapshot); }

  function remember(id) { try { store.used(id); } catch { /* Recent-use tracking never invalidates successful insertion. */ } }
  function open(panel, actions, view = 'list', extra = {}) {
    let span = null;
    try { span = actions?.captureInsertion(); } catch { /* Show the panel; insertion will report unsupported. */ }
    panel.set({ open: true, view, span, ...extra });
  }

  function Pins(props) {
    const t = useT();
    const { data, error } = useLibrary();
    const workspace = useWorkspace(ctx, props.sessionId);
    const panel = panels.forSession(props.sessionId);
    if (!data.preferences.showPinned || error) return null;
    const pins = selectPrompts(data, { workspace }).filter(p => p.pinned).slice(0, 4);
    if (!pins.length) return null;
    return <div className="dqp-pins-seat"><div className="dqp-pins" aria-label={t('pinned')}>{pins.map(prompt => <button key={prompt.id} type="button" className="dqp-pin-chip" title={prompt.content} onPointerDown={e => e.preventDefault()} onClick={() => {
      if (variablesIn(prompt.content).length) open(panel, props.inputActions, 'template', { template: prompt });
      else {
        try { insertPrompt(props.inputActions, prompt.content); remember(prompt.id); }
        catch (error) { open(panel, props.inputActions, 'template', { template: prompt, insertionError: error.message }); }
      }
    }}>{prompt.title}</button>)}</div></div>;
  }

  function Launcher(props) {
    const t = useT();
    const { data } = useLibrary();
    const workspace = useWorkspace(ctx, props.sessionId);
    const panel = useMemo(() => panels.forSession(props.sessionId), [props.sessionId]);
    const state = useSyncExternalStore(panel.subscribe, panel.getSnapshot);
    const trigger = useRef(null);
    const lastWorkspace = useRef(workspace);
    useEffect(() => {
      if (lastWorkspace.current !== workspace) { panel.set({ open: false }); lastWorkspace.current = workspace; }
    }, [workspace, panel]);
    useEffect(() => {
      if (!data.preferences.shortcut) return;
      const onKey = event => {
        if (event.defaultPrevented || event.isComposing || event.repeat || event.ctrlKey || event.metaKey
          || !event.altKey || !event.shiftKey || event.code !== 'KeyP'
          || !trigger.current?.getClientRects().length || document.querySelector('dialog[open]')) return;
        event.preventDefault(); open(panel, props.inputActions);
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [data.preferences.shortcut, props.inputActions, panel]);
    return <>
      <button ref={trigger} type="button" className="dqp-launch" aria-label={t('open')} title={t('open')} onPointerDown={e => e.preventDefault()} onClick={() => open(panel, props.inputActions)}><Icon name="bolt" /><span>{t('title')}</span></button>
      {state.open && <Palette key={props.sessionId} {...props} workspace={workspace} panel={panel} initial={state} onClose={() => { panel.set({ open: false, insertionError: '' }); trigger.current?.focus(); }} />}
    </>;
  }

  function Palette({ workspace, panel, initial, inputActions, onClose }) {
    const t = useT();
    const { data, error: storageError } = useLibrary();
    const [view, setView] = useState(initial.view);
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState('all');
    const [category, setCategory] = useState('');
    const [active, setActive] = useState(0);
    const [editing, setEditing] = useState(null);
    const [template, setTemplate] = useState(initial.template ?? null);
    const [values, setValues] = useState({});
    const [error, setError] = useState(initial.insertionError ?? '');
    const [notice, setNotice] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [pendingImport, setPendingImport] = useState(null);
    const [rebind, setRebind] = useState(false);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const dialog = useRef(null);
    const search = useRef(null);
    const file = useRef(null);
    const span = useRef(initial.span);
    const prompts = selectPrompts(data, { workspace, query, scope: scope === 'recent' ? 'all' : scope, category, recentOnly: scope === 'recent' });
    const categories = [...new Set(visiblePrompts(data.prompts, workspace).map(p => p.category).filter(Boolean))];
    const variableNames = template ? variablesIn(template.content) : [];
    const preview = template ? renderTemplate(template.content, values) : '';

    useEffect(() => {
      const element = dialog.current;
      element.showModal();
      return () => { if (element.open) element.close(); };
    }, []);
    useEffect(() => { if (view === 'list') search.current?.focus(); }, [view]);
    useEffect(() => { setActive(0); }, [query, scope, category]);
    useEffect(() => { dialog.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active, query, scope, category]);

    function attempt(action) {
      setError(''); setNotice('');
      try { return action(); } catch (caught) { setError(caught.message || 'unknownError'); return undefined; }
    }
    function go(next) { setView(next); setError(''); setNotice(''); setDeleteId(null); }
    function insert(prompt, text) {
      attempt(() => {
        if (!visiblePrompts(store.getSnapshot().data.prompts, workspace).some(p => p.id === prompt.id)) throw new Error('noWorkspace');
        insertPrompt(inputActions, text, span.current);
        remember(prompt.id); onClose();
      });
    }
    function choose(prompt) {
      if (variablesIn(prompt.content).length) { setTemplate(prompt); setValues({}); go('template'); }
      else insert(prompt, prompt.content);
    }
    function edit(prompt, duplicate = false) {
      setEditing(prompt ? { ...prompt, ...(duplicate ? { id: undefined, title: `${prompt.title.slice(0, 70)} (${t('duplicate')})` } : {}) }
        : { title: '', content: '', category: '', scope: 'global', workspace: '', pinned: false });
      go('edit');
    }
    function save(event) {
      event.preventDefault();
      attempt(() => { store.save({ ...editing, workspace: editing.scope === 'workspace' ? workspace : '' }); go('list'); setNotice(t('saved')); });
    }
    function exportData(raw = false) {
      attempt(() => { download(raw ? store.raw() : exportDocument(data), `dsh-quick-prompts${raw ? '-original' : ''}-${new Date().toISOString().slice(0, 10)}.json`); });
    }
    async function readImport(event) {
      const selected = event.target.files?.[0]; event.target.value = '';
      if (!selected) return;
      setBusy(true); setError('');
      try {
        if (selected.size > MAX_IMPORT_BYTES) throw new Error('tooLarge');
        const imported = parseDocument(await selected.text());
        setPendingImport(imported); setRebind(false); go('import');
      } catch (caught) { setError(caught.message || 'invalidFile'); }
      finally { setBusy(false); }
    }
    function listKeys(event) {
      if (event.isComposing || view !== 'list' || event.target.tagName === 'SELECT'
        || (event.target !== search.current && !event.target.classList.contains('dqp-prompt'))) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); setActive(index => Math.max(0, Math.min(prompts.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      } else if (event.key === 'Enter' && event.target === search.current && prompts.length) {
        event.preventDefault(); choose(prompts[Math.min(active, prompts.length - 1)]);
      }
    }
    let importSummary;
    if (view === 'import' && pendingImport) {
      try { importSummary = mergeImport(data, pendingImport, { rebindWorkspace: rebind, workspace }); }
      catch (caught) { importSummary = { error: caught.message }; }
    }
    const heading = view === 'edit' ? (editing?.id ? t('edit') : t('new')) : view === 'template' ? t('variables') : view === 'import' ? t('importTitle') : view === 'settings' ? t('settings') : t('title');
    return <dialog ref={dialog} className="dqp-dialog" aria-label={t('title')} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
      if (event.target === dialog.current) { const box = dialog.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); }
    }} onKeyDown={listKeys}>
      <div className="dqp-shell">
        <div className="dqp-heading">
          {view === 'list' ? <span className="dqp-mark"><Icon name="bolt" size={19} /></span> : <button type="button" className="dqp-icon" aria-label={t('back')} onClick={() => go('list')}><Icon name="back" /></button>}
          <div><h2>{heading}</h2><div className="dqp-subtitle">{view === 'list' ? t('subtitle') : t('insertHint')}</div></div>
          <span className="dqp-spacer" />
          {view === 'list' && <button type="button" className="dqp-icon" aria-label={t('settings')} title={t('settings')} onClick={() => go('settings')}><Icon name="settings" /></button>}
          <button type="button" className="dqp-icon" aria-label={t('close')} onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        {(storageError || error) && <div className="dqp-notice dqp-error" role="alert">{t(storageError || error)}{storageError && <div className="dqp-actions dqp-actions-left"><button type="button" className="dqp-btn" onClick={() => exportData(true)}>{t('exportRaw')}</button><button type="button" className="dqp-btn" onClick={() => go('settings')}>{t('settings')}</button></div>}</div>}
        {notice && <div className="dqp-notice" role="status">{notice}</div>}
        {view === 'list' && <>
          <div className="dqp-search-row"><div className="dqp-search-wrap"><span className="dqp-search-icon"><Icon name="search" /></span><input ref={search} type="search" className="dqp-input" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('search')} aria-label={t('search')} /></div><button type="button" className="dqp-btn dqp-primary" disabled={!!storageError} onClick={() => edit(null)}><Icon name="plus" />{t('new')}</button></div>
          <div className="dqp-filters">{['all', 'global', 'workspace', 'recent'].map(key => <button type="button" key={key} className="dqp-filter" aria-pressed={scope === key} disabled={key === 'workspace' && !workspace} title={key === 'workspace' ? workspace || t('noWorkspace') : undefined} onClick={() => setScope(key)}>{t(key)}</button>)}<select className="dqp-select dqp-category-filter" aria-label={t('category')} value={category} onChange={event => setCategory(event.target.value)}><option value="">{t('allCategories')}</option>{categories.map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="dqp-list">
            {!storageError && prompts.map((prompt, index) => <div key={prompt.id} className={`dqp-row${index === Math.min(active, prompts.length - 1) ? ' is-active' : ''}`} data-active={index === active}>
              <button type="button" className="dqp-prompt" onClick={() => choose(prompt)} title={prompt.content} onFocus={() => setActive(index)}><span className="dqp-prompt-title">{prompt.title}{prompt.scope === 'workspace' && <span className="dqp-badge">{t('workspace')}</span>}{prompt.category && <span className="dqp-badge">{prompt.category}</span>}</span><div className="dqp-excerpt">{prompt.content.replace(/\n/g, ' ')}</div></button>
              <div className="dqp-row-actions"><button type="button" className={`dqp-icon${prompt.pinned ? ' is-pinned' : ''}`} title={t(prompt.pinned ? 'unpin' : 'pin')} aria-label={`${t(prompt.pinned ? 'unpin' : 'pin')} ${prompt.title}`} aria-pressed={prompt.pinned} onClick={() => attempt(() => store.pin(prompt.id))}><Icon name="star" filled={prompt.pinned} size={14} /></button><button type="button" className="dqp-icon" title={t('edit')} aria-label={`${t('edit')} ${prompt.title}`} onClick={() => edit(prompt)}><Icon name="edit" size={14} /></button><button type="button" className="dqp-icon" title={t('duplicate')} aria-label={`${t('duplicate')} ${prompt.title}`} onClick={() => edit(prompt, true)}><Icon name="copy" size={14} /></button>{deleteId === prompt.id ? <><button type="button" className="dqp-text-button dqp-danger" onClick={() => attempt(() => { store.remove(prompt.id); setDeleteId(null); setNotice(t('deleted')); })}>{t('confirmDelete')}</button><button type="button" className="dqp-icon" aria-label={t('cancel')} onClick={() => setDeleteId(null)}><Icon name="close" size={13} /></button></> : <button type="button" className="dqp-icon" title={t('delete')} aria-label={`${t('delete')} ${prompt.title}`} onClick={() => setDeleteId(prompt.id)}><Icon name="trash" size={14} /></button>}</div>
            </div>)}
            {!storageError && !prompts.length && <div className="dqp-empty"><strong>{t('empty')}</strong><span>{t('emptyHint')}</span></div>}
          </div>
          <div className="dqp-foot"><span>{t('count', { count: prompts.length })}</span><span className="dqp-spacer" /><span className="dqp-key-hint"><kbd>↑</kbd><kbd>↓</kbd> <kbd>Enter</kbd></span><span>{t('insertHint')}</span></div>
        </>}
        {view === 'edit' && editing && <form className="dqp-content" onSubmit={save}>
          <label className="dqp-field"><span className="dqp-label">{t('fieldTitle')}</span><input autoFocus className="dqp-input" required maxLength={80} value={editing.title} placeholder={t('titlePlaceholder')} onChange={e => setEditing({ ...editing, title: e.target.value })} /></label>
          <label className="dqp-field"><span className="dqp-label">{t('content')}</span><textarea className="dqp-textarea" required maxLength={20000} value={editing.content} placeholder={t('contentPlaceholder')} onChange={e => setEditing({ ...editing, content: e.target.value })} /></label>
          <div className="dqp-columns"><label className="dqp-field"><span className="dqp-label">{t('category')}</span><input className="dqp-input" maxLength={40} value={editing.category} placeholder={t('categoryPlaceholder')} onChange={e => setEditing({ ...editing, category: e.target.value })} /></label><label className="dqp-field"><span className="dqp-label">{t('scope')}</span><select className="dqp-select" value={editing.scope} onChange={e => setEditing({ ...editing, scope: e.target.value })}><option value="global">{t('global')}</option><option value="workspace" disabled={!workspace}>{t('workspace')}</option></select></label></div>
          <p className="dqp-hint">{editing.scope === 'workspace' ? `${t('workspaceHint')} · ${workspace}` : t('globalHint')}</p>
          <label className="dqp-check"><input type="checkbox" checked={editing.pinned} onChange={e => setEditing({ ...editing, pinned: e.target.checked })} />{t('pin')}</label>
          <div className="dqp-actions"><button type="button" className="dqp-btn" onClick={() => go('list')}>{t('cancel')}</button><button type="submit" className="dqp-btn dqp-primary" disabled={!!storageError}>{t('save')}</button></div>
        </form>}
        {view === 'template' && template && <div className="dqp-content"><div className="dqp-hint">{template.title} · {t('templateHint')}</div>
          {variableNames.map((name, index) => <label className="dqp-field" key={name}><span className="dqp-label">{name}</span><textarea autoFocus={index === 0} className="dqp-textarea" style={{ minHeight: 80 }} value={values[name] ?? ''} onChange={e => setValues({ ...values, [name]: e.target.value })} /></label>)}
          <span className="dqp-label">{t('preview')}</span><pre className="dqp-preview">{preview}</pre>
          <div className="dqp-actions">{error === 'draftChanged' && <button type="button" className="dqp-btn" onClick={() => attempt(() => { span.current = inputActions.captureInsertion(); setError(''); })}>{t('insertAgain')}</button>}<button type="button" className="dqp-btn dqp-primary" disabled={!!storageError || variableNames.some(name => !(values[name] ?? '').trim())} onClick={() => insert(template, preview)}>{t('insert')}</button></div>
        </div>}
        {view === 'settings' && <div className="dqp-content">
          <label className="dqp-check"><input type="checkbox" checked={data.preferences.showPinned} disabled={!!storageError} onChange={e => attempt(() => store.preferences({ showPinned: e.target.checked }))} />{t('showPinned')}</label>
          <label className="dqp-check"><input type="checkbox" checked={data.preferences.shortcut} disabled={!!storageError} onChange={e => attempt(() => store.preferences({ shortcut: e.target.checked }))} />{t('shortcut')}</label>
          <hr className="dqp-divider" /><p className="dqp-hint">{t('localHint')}</p>
          <div className="dqp-actions dqp-actions-left"><button type="button" className="dqp-btn" disabled={!!storageError} onClick={() => exportData()}><Icon name="down" />{t('export')}</button><button type="button" className="dqp-btn" disabled={!!storageError || busy} onClick={() => file.current.click()}>{t('import')}</button></div>
          <hr className="dqp-divider" />{resetConfirm ? <><p className="dqp-hint">{t('resetWarning')}</p><div className="dqp-actions dqp-actions-left"><button type="button" className="dqp-btn" onClick={() => setResetConfirm(false)}>{t('cancel')}</button><button type="button" className="dqp-btn dqp-danger" onClick={() => attempt(() => { store.reset(); setResetConfirm(false); go('list'); })}>{t('confirmReset')}</button></div></> : <button type="button" className="dqp-text-button dqp-danger" onClick={() => setResetConfirm(true)}>{t('reset')}</button>}
        </div>}
        {view === 'import' && pendingImport && <div className="dqp-content">
          {pendingImport.prompts.some(p => p.scope === 'workspace') && <><label className="dqp-check"><input type="checkbox" checked={rebind} disabled={!workspace} onChange={e => setRebind(e.target.checked)} />{t('rebind')}</label><p className="dqp-hint">{rebind ? workspace : t('originalPaths')}</p></>}
          <p>{importSummary?.error ? t(importSummary.error) : t('importHint', importSummary)}</p><ul className="dqp-import-list">{pendingImport.prompts.slice(0, 50).map(p => <li key={p.id}>{p.title}<span className="dqp-badge">{t(p.scope === 'workspace' ? 'workspace' : 'global')}</span></li>)}</ul>
          <div className="dqp-actions"><button type="button" className="dqp-btn" onClick={() => go('settings')}>{t('cancel')}</button><button type="button" className="dqp-btn dqp-primary" disabled={!!storageError || !!importSummary?.error} onClick={() => attempt(() => { const result = store.import(pendingImport, { rebindWorkspace: rebind, workspace }); setPendingImport(null); go('list'); setNotice(t('imported', result)); })}>{t('confirmImport')}</button></div>
        </div>}
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={readImport} />
      </div>
    </dialog>;
  }

  class Boundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <span className="dqp-launch" title="Quick Prompts could not load. Reload the page.">Quick Prompts ⚠</span> : this.props.children; }
  }
  return {
    Launcher: props => <Boundary><Launcher {...props} /></Boundary>,
    Pins: props => <Boundary><Pins {...props} /></Boundary>,
  };
}

export const name = ID;
export const inject = ['slots', 'locale', 'sessions'];
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), `${ID}: translations`);
  const store = createPromptStore({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) }, window, ctx.locale.getSnapshot().active);
  const panels = createPanels();
  const components = createComponents(ctx, store, panels, ctx.locale.bind(NS));
  ctx.effect(() => { const node = document.createElement('style'); node.dataset.dshPlugin = ID; node.textContent = styles; document.head.append(node); return () => node.remove(); }, `${ID}: styles`);
  ctx.effect(() => () => { store.dispose(); panels.dispose(); }, `${ID}: storage`);
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({ name: 'conversation.input.left', id: ID, order: 30, label: () => ctx.locale.bind(NS)('title'), locale: NS }, components.Launcher));
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: ID, order: 30, locale: NS }, components.Pins));
}
