import test from 'node:test';
import assert from 'node:assert/strict';
import { exportDocument, mergeImport, normalizeWorkspace, parseDocument, renderTemplate, selectPrompts, validatePrompt, variablesIn } from '../src/model.js';
import { initialDocument } from '../src/presets.js';
import { insertPrompt } from '../src/insertion.js';

const custom = (patch = {}) => ({ ...initialDocument().prompts[0], id: 'custom', title: '项目检查', scope: 'workspace', workspace: 'C:\\Work\\App\\', ...patch });

test('workspace isolation respects Windows case folding and POSIX case sensitivity', () => {
  assert.equal(normalizeWorkspace('C:\\Work\\App\\'), 'c:/work/app');
  assert.equal(normalizeWorkspace('C:\\'), 'c:');
  assert.equal(normalizeWorkspace('/'), '/');
  const data = initialDocument();
  data.prompts.push(validatePrompt(custom()));
  assert.ok(selectPrompts(data, { workspace: 'c:/WORK/APP' }).some(p => p.id === 'custom'));
  assert.ok(!selectPrompts(data, { workspace: 'c:/work/other' }).some(p => p.id === 'custom'));
  assert.ok(!selectPrompts(data).some(p => p.id === 'custom'));
  data.prompts.push(validatePrompt(custom({ id: 'posix', workspace: '/Work/App' })));
  assert.ok(!selectPrompts(data, { workspace: '/work/app' }).some(p => p.id === 'posix'));
});

test('search matches all words across title, body and category; recent filters stay scoped', () => {
  const data = initialDocument();
  data.prompts.push(validatePrompt(custom({ content: '验证 release checklist', category: '发布' })));
  data.recent = ['custom', 'builtin-review'];
  assert.deepEqual(selectPrompts(data, { workspace: 'C:/Work/App', query: '发布 RELEASE' }).map(p => p.id), ['custom']);
  assert.deepEqual(selectPrompts(data, { recentOnly: true, workspace: 'C:/other' }).map(p => p.id), ['builtin-review']);
});

test('import validates every row, duplicate ids, size, schema and field boundaries', () => {
  const good = initialDocument();
  assert.equal(parseDocument(exportDocument(good)).prompts.length, good.prompts.length);
  for (const invalid of [{}, { ...good, version: 99 }, { ...good, prompts: [custom({ title: '' })] }, { ...good, prompts: [custom({ workspace: '' })] }, { ...good, prompts: [good.prompts[0], good.prompts[0]] }]) {
    assert.throws(() => parseDocument(JSON.stringify(invalid)));
  }
  assert.throws(() => parseDocument('['));
  assert.throws(() => parseDocument('中'.repeat(800000)), /tooLarge/);
  assert.throws(() => validatePrompt(custom({ content: 'x'.repeat(20001) })), /invalidPrompt/);
  assert.throws(() => validatePrompt(custom({ content: Array.from({ length: 21 }, (_, i) => `{{v${i}}}`).join('') })), /invalidPrompt/);
});

test('additive import preserves existing ids and makes collision copies without overwriting', () => {
  const data = initialDocument();
  const imported = parseDocument(exportDocument(data));
  imported.prompts.push(validatePrompt(custom({ id: data.prompts[0].id, title: 'Different' })));
  // Imported documents reject duplicate IDs before merging; model merge can still handle cross-library collisions.
  imported.prompts = imported.prompts.slice(-1);
  const result = mergeImport(data, imported);
  assert.equal(result.added, 1);
  assert.equal(result.data.prompts[0].title, data.prompts[0].title);
  assert.notEqual(result.data.prompts.at(-1).id, data.prompts[0].id);
  assert.equal(mergeImport(data, parseDocument(exportDocument(data))).skipped, data.prompts.length);
});

test('project import remapping is explicit and cannot map into an unknown workspace', () => {
  const imported = { ...initialDocument(), prompts: [validatePrompt(custom())] };
  assert.equal(mergeImport(initialDocument(), imported).data.prompts.at(-1).workspace, 'c:/work/app');
  assert.equal(mergeImport(initialDocument(), imported, { rebindWorkspace: true, workspace: '/new' }).data.prompts.at(-1).workspace, '/new');
  assert.throws(() => mergeImport(initialDocument(), imported, { rebindWorkspace: true }), /noWorkspace/);
});

test('template substitution is literal, repeated variables share a value, and code braces survive', () => {
  assert.deepEqual(variablesIn('Hello {{ who }} / {{who}} / {x}'), ['who']);
  assert.equal(renderTemplate('{{who}} {{ who }} {x}', { who: '$& <script>' }), '$& <script> $& <script> {x}');
  assert.equal(renderTemplate('{{missing}}', {}), '{{missing}}');
});

test('insertion uses only revision-guarded plain text, never setDraft or submit', () => {
  let calls = [];
  const target = { start: 2, end: 4, draftRev: 7 };
  const actions = { captureInsertion: () => target, insertText: (text, span) => { calls.push([text, span]); return true; },
    setDraft: () => assert.fail('must not replace the whole draft'), submit: () => assert.fail('must never send'), persistDraft: () => {} };
  insertPrompt(actions, 'hello');
  assert.deepEqual(calls, [['hello', target]]);
  assert.throws(() => insertPrompt({ ...actions, insertText: () => false }, 'x', target), /draftChanged/);
  assert.throws(() => insertPrompt({}, 'x'), /unsupported/);
  assert.doesNotThrow(() => insertPrompt({ ...actions, persistDraft: () => { throw new Error('offline'); } }, 'already inserted'));
});
