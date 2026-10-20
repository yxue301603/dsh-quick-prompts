export const FORMAT = 'dsh-quick-prompts';
export const MAX_PROMPTS = 500;
export const MAX_CONTENT = 20000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, max) => typeof value === 'string' && value.length <= max;
export const newId = () => globalThis.crypto.randomUUID();

export function normalizeWorkspace(path) {
  if (typeof path !== 'string' || !path.trim()) return '';
  let value = path.trim().replaceAll('\\', '/').replace(/\/+$/, '');
  if (!value) return '/';
  // Windows paths compare case-insensitively; POSIX paths must retain case.
  if (/^[a-z]:/i.test(value) || value.startsWith('//')) value = value.toLowerCase();
  return value;
}

export function validatePrompt(value) {
  if (!object(value) || !bounded(value.id, 100) || !value.id
    || !bounded(value.title, 80) || !value.title.trim()
    || !bounded(value.content, MAX_CONTENT) || !value.content.trim()
    || !bounded(value.category ?? '', 40)
    || !['global', 'workspace'].includes(value.scope)
    || (value.scope === 'workspace' && (!bounded(value.workspace, 2000) || !normalizeWorkspace(value.workspace)))
    || typeof value.pinned !== 'boolean' || variablesIn(value.content).length > 20) {
    throw new Error('invalidPrompt');
  }
  return {
    id: value.id, title: value.title.trim(), content: value.content,
    category: (value.category ?? '').trim(), scope: value.scope,
    workspace: value.scope === 'workspace' ? normalizeWorkspace(value.workspace) : '',
    pinned: value.pinned,
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : 0,
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
  };
}

export function parseDocument(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('tooLarge');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('invalidFile'); }
  if (!object(value) || value.format !== FORMAT || value.version !== 1
    || !Array.isArray(value.prompts) || value.prompts.length > MAX_PROMPTS) throw new Error('invalidFile');
  const prompts = value.prompts.map(validatePrompt);
  if (new Set(prompts.map(p => p.id)).size !== prompts.length) throw new Error('duplicateIds');
  const ids = new Set(prompts.map(p => p.id));
  const recent = Array.isArray(value.recent) ? [...new Set(value.recent.filter(id => typeof id === 'string' && ids.has(id)))].slice(0, 20) : [];
  return {
    format: FORMAT, version: 1, prompts, recent,
    preferences: { shortcut: value.preferences?.shortcut === true, showPinned: value.preferences?.showPinned !== false },
  };
}

export function visiblePrompts(prompts, workspace) {
  const key = normalizeWorkspace(workspace);
  return prompts.filter(p => p.scope === 'global' || (key && p.workspace === key));
}

export function selectPrompts(data, { workspace = '', query = '', scope = 'all', category = '', recentOnly = false } = {}) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const recent = new Map(data.recent.map((id, index) => [id, index]));
  return visiblePrompts(data.prompts, workspace)
    .filter(p => (scope === 'all' || p.scope === scope) && (!category || p.category === category)
      && (!recentOnly || recent.has(p.id))
      && words.every(word => `${p.title}\n${p.category}\n${p.content}`.toLocaleLowerCase().includes(word)))
    .sort((a, b) => recentOnly
      ? recent.get(a.id) - recent.get(b.id)
      : Number(b.pinned) - Number(a.pinned) || (recent.get(a.id) ?? 100) - (recent.get(b.id) ?? 100) || a.createdAt - b.createdAt);
}

export function variablesIn(text) {
  return [...new Set(Array.from(text.matchAll(/\{\{\s*([^{}\n]{1,40}?)\s*\}\}/g), match => match[1].trim()).filter(Boolean))];
}

export function renderTemplate(text, values) {
  return text.replace(/\{\{\s*([^{}\n]{1,40}?)\s*\}\}/g, (whole, name) => Object.hasOwn(values, name.trim()) ? values[name.trim()] : whole);
}

const fingerprint = p => JSON.stringify([p.title, p.content, p.category, p.scope, p.workspace]);
export function mergeImport(current, imported, { rebindWorkspace = false, workspace = '' } = {}) {
  const key = normalizeWorkspace(workspace);
  if (rebindWorkspace && !key && imported.prompts.some(p => p.scope === 'workspace')) throw new Error('noWorkspace');
  const prompts = [...current.prompts];
  const fingerprints = new Set(prompts.map(fingerprint));
  const ids = new Set(prompts.map(p => p.id));
  let added = 0;
  let skipped = 0;
  for (const original of imported.prompts) {
    const prompt = { ...original, ...(rebindWorkspace && original.scope === 'workspace' ? { workspace: key } : {}) };
    const signature = fingerprint(prompt);
    if (fingerprints.has(signature)) { skipped++; continue; }
    if (prompts.length >= MAX_PROMPTS) throw new Error('tooMany');
    if (ids.has(prompt.id)) prompt.id = newId();
    ids.add(prompt.id);
    fingerprints.add(signature);
    prompts.push(prompt);
    added++;
  }
  return { data: { ...current, prompts }, added, skipped };
}

export function exportDocument(data) {
  return JSON.stringify({ format: FORMAT, version: 1, prompts: data.prompts, preferences: data.preferences }, null, 2);
}
