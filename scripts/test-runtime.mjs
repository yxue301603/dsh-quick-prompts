/** Optional real-DSH smoke test. All state stays under .cache; no model calls. */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { controlContrast } from '../tests/contrast.mjs';

const root = process.cwd();
const bin = resolve('.cache/runtime/node_modules/@deepseek-ai/dsh/lib/bin.js');
const work = resolve('.cache/runtime-workspace');
const archiveOption = process.argv.indexOf('--package');
const archive = archiveOption >= 0 ? resolve(process.argv[archiveOption + 1]) : null;
const dataHome = resolve(archive ? '.cache/runtime-installed-home' : '.cache/runtime-home');
await mkdir(work, { recursive: true });
await mkdir(dataHome, { recursive: true });
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/runtime-result.json', JSON.stringify({ status: 'running', nativePackageInstall: !!archive }));
const testEnv = { ...process.env, DSH_HOME: dataHome, DSH_AGENTS_HOME: resolve('.cache/runtime-agents'), NO_COLOR: '1' };
if (archive) {
  const installer = spawn(process.execPath, [bin, 'plugin', '--profile', 'web', 'add', archive], { cwd: work, env: testEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let installLog = '';
  installer.stdout.on('data', chunk => { installLog += chunk; }); installer.stderr.on('data', chunk => { installLog += chunk; });
  const code = await new Promise((resolve, reject) => { installer.on('exit', resolve); installer.on('error', reject); });
  await writeFile('artifacts/runtime-install.log', installLog);
  if (code !== 0) throw new Error('Native DSH package installation failed. See artifacts/runtime-install.log');
  console.log('Packaged plugin installed through the native DSH plugin manager in an isolated profile.');
}
const patch = resolve('.cache/runtime-overlay.yml');
await writeFile(patch, `- insert:\n    - id: dsh-quick-prompts\n      name: ${JSON.stringify(resolve('index.js').replaceAll('\\', '/'))}\n`);
const child = spawn(process.execPath, [bin, '--profile', 'web', ...(archive ? [] : ['--patch', patch]), '--no-open', '--host', '127.0.0.1', '--port', '43180'], {
  cwd: work, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: testEnv,
});
let logs = ''; let browser; let exited = false;
child.on('exit', () => { exited = true; });
child.stdout.on('data', chunk => { logs += chunk.toString(); });
child.stderr.on('data', chunk => { logs += chunk.toString(); });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let ready = false;
  for (let i = 0; i < 120 && !exited; i++) {
    // The first navigation needs DSH's fresh process token; an unauthenticated
    // root probe can be denied even though the host has finished starting.
    if (logs.includes('dsh web: http://127.0.0.1:43180/')) { ready = true; break; }
    await delay(500);
  }
  if (!ready) throw new Error(`DSH did not start. See artifacts/runtime-host.log; exited=${exited}`);
  console.log('Real DSH started on an isolated loopback port; browser auto-opening is disabled.');
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const urls = logs.replace(/\x1b\[[0-9;]*m/g, '').match(/http:\/\/127\.0\.0\.1:43180[^\s]*/g) ?? [];
  await page.goto(urls.at(-1) ?? 'http://127.0.0.1:43180/');
  await page.waitForTimeout(2500);
  const previewNotice = page.getByRole('button', { name: '继续', exact: true });
  if (await previewNotice.isVisible()) await previewNotice.click();
  const configureLater = page.getByRole('button', { name: /^(稍后配置|Configure later)$/ });
  // Fresh test profiles have no API key. Use the product's normal defer action.
  try { await configureLater.waitFor({ state: 'visible', timeout: 5000 }); await configureLater.click(); } catch {}
  const signIn = page.getByRole('dialog', { name: '开始使用', exact: true });
  if (await signIn.isVisible()) await signIn.getByRole('button', { name: '关闭', exact: true }).click();
  await page.screenshot({ path: 'artifacts/runtime-initial.png', fullPage: true });
  const boot = await page.evaluate(() => ({
    release: window.__DSH_BOOT__?.release,
    plugin: window.__DSH_BOOT__?.entries?.find(entry => entry.id === 'dsh-quick-prompts'),
    style: !!document.querySelector('style[data-dsh-plugin="dsh-quick-prompts"]'),
    body: document.body.innerText.slice(0, 16000),
    buttons: [...document.querySelectorAll('button')].map(button => ({ text: button.innerText, label: button.getAttribute('aria-label'), title: button.title })).slice(0, 60),
  }));
  await writeFile('artifacts/runtime-inspect.json', JSON.stringify({ ...boot, errors }, null, 2));
  if (!boot.plugin) throw new Error('Plugin missing from the real DSH boot graph');
  if (!boot.style) throw new Error('Real DSH client did not activate plugin styles');
  if (await page.locator('.dqp-pin-chip').count() !== 4) throw new Error('Pinned prompts are missing from the real blank-session composer');
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible' });
  // Use a known draft and compare undo against that baseline. DSH persists
  // drafts between runs; assuming an empty editor makes this check misleading.
  await editor.fill('保留的原始说明');
  await editor.press('Control+End');
  const originalDraft = await editor.innerText();
  await page.getByRole('button', { name: '打开快捷指令', exact: true }).click();
  const palette = page.locator('dialog.dqp-dialog');
  await palette.waitFor({ state: 'visible' });
  if (await palette.locator('.dqp-prompt').count() !== 8) throw new Error('Real DSH prompt list did not show the starter library');
  await page.screenshot({ path: 'artifacts/runtime-palette.png', fullPage: true });
  await page.getByRole('searchbox').fill('总结当前进度');
  await page.getByRole('searchbox').press('Enter');
  await expect(editor).toContainText('总结当前任务');
  if (!(await editor.innerText()).includes(originalDraft)) throw new Error('Insertion did not preserve the existing draft');
  await editor.click();
  await editor.press('Control+z');
  await expect.poll(() => editor.innerText()).toBe(originalDraft);
  const themeChecks = [];
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await expect.poll(() => page.locator('body').evaluate(element => element.hasAttribute('data-ds-dark-theme'))).toBe(theme === 'dark');
    await page.getByRole('button', { name: '打开快捷指令', exact: true }).click();
    const create = page.getByRole('button', { name: '新建指令', exact: true });
    const createContrast = await create.evaluate(controlContrast);
    expect(createContrast.ratio, `${theme} new prompt button contrast`).toBeGreaterThanOrEqual(4.5);
    await create.hover();
    expect((await create.evaluate(controlContrast)).ratio).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: `artifacts/runtime-palette-${theme}.png`, fullPage: true });
    await create.click();
    for (const name of ['名称', '指令内容', '分类']) {
      const field = page.getByRole('textbox', { name, exact: true });
      await expect(field).toBeVisible();
      expect((await field.evaluate(controlContrast)).ratio, `${theme} ${name} contrast`).toBeGreaterThanOrEqual(4.5);
    }
    await expect(page.getByRole('combobox', { name: '使用范围', exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: '名称', exact: true }).fill('检查本次改动');
    await page.getByRole('textbox', { name: '指令内容', exact: true }).fill('检查当前改动，说明需要修复的问题。');
    const save = page.getByRole('button', { name: '保存指令', exact: true });
    const saveContrast = await save.evaluate(controlContrast);
    expect(saveContrast.ratio, `${theme} save button contrast`).toBeGreaterThanOrEqual(4.5);
    await save.hover();
    expect((await save.evaluate(controlContrast)).ratio).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: `artifacts/runtime-new-prompt-${theme}.png`, fullPage: true });
    themeChecks.push({ theme, createContrast, saveContrast, formFieldsVisible: true });
    await page.keyboard.press('Escape');
  }
  const pins = page.locator('.dqp-pins');
  const card = page.locator('[class*="_card"]').filter({ has: editor }).first();
  const alignment = [];
  // The dock is a sibling of the padded composer. Check both the hero's narrow
  // stack and a full-width stack, which reproduces the reported conversation layout.
  for (const mode of ['hero', 'full-width']) {
    let override;
    if (mode === 'full-width') override = await page.addStyleTag({ content: '[class*="_composerHero"]{width:100%!important;align-self:stretch!important}' });
    for (const width of [1905, 1100, 640, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect.poll(async () => {
        const row = await pins.boundingBox();
        const input = await card.boundingBox();
        return row && input ? Math.max(Math.abs(row.x - input.x), Math.abs(row.width - input.width)) : Infinity;
      }, { message: `Pinned prompts must align with the ${mode} composer at ${width}px` }).toBeLessThan(1);
      const row = await pins.boundingBox();
      const input = await card.boundingBox();
      alignment.push({ mode, viewport: width, row, card: input });
    }
    if (mode === 'full-width') {
      await page.setViewportSize({ width: 1905, height: 1000 });
      await page.screenshot({ path: 'artifacts/runtime-alignment.png', fullPage: true });
    }
    if (override) await override.evaluate(element => element.remove());
  }
  await writeFile('artifacts/runtime-result.json', JSON.stringify({ release: boot.release, nativePackageInstall: !!archive, pluginInBootGraph: true, clientActivated: true, palette: true, insertion: true, draftPreserved: true, undo: true, themeChecks, alignment, errors }, null, 2));
  if (errors.length) throw new Error(`Real DSH client reported ${errors.length} errors. See artifacts/runtime-result.json`);
  console.log(JSON.stringify({ release: boot.release, pluginInBootGraph: true, clientActivated: true, errorCount: errors.length, inspect: 'artifacts/runtime-inspect.json' }));
} finally {
  if (browser) await browser.close();
  await writeFile('artifacts/runtime-host.log', logs.replace(/(processToken|token)=([^\s&]+)/g, '$1=[test-token]'));
  if (!exited) {
    if (process.platform === 'win32') await new Promise(resolve => { const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); killer.on('exit', resolve); killer.on('error', resolve); });
    else child.kill('SIGTERM');
  }
}
