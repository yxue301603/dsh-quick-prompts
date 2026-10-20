import { test, expect } from '@playwright/test';
import { initialDocument } from '../../src/presets.js';
import { controlContrast } from '../contrast.mjs';

const open = page => page.getByRole('button', { name: '打开快捷指令', exact: true }).click();
const dialog = page => page.getByRole('dialog', { name: '快捷指令', exact: true });
const search = page => page.getByRole('searchbox');
const settings = page => page.getByRole('button', { name: '设置与备份', exact: true }).click();

test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.getByRole('button', { name: '打开快捷指令', exact: true })).toBeVisible(); });

test('new prompt controls and form fields remain readable in light and dark themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.body.classList.toggle('dark', theme === 'dark'), theme);
    await open(page);
    const create = page.getByRole('button', { name: '新建指令', exact: true });
    for (const hover of [false, true]) {
      if (hover) await create.hover();
      expect((await create.evaluate(controlContrast)).ratio, `${theme} new button contrast`).toBeGreaterThanOrEqual(4.5);
    }
    await create.click();
    for (const name of ['名称', '指令内容', '分类']) {
      const field = page.getByRole('textbox', { name, exact: true });
      await expect(field).toBeVisible();
      expect((await field.evaluate(controlContrast)).ratio, `${theme} ${name} contrast`).toBeGreaterThanOrEqual(4.5);
    }
    await expect(page.getByRole('combobox', { name: '使用范围', exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: '名称', exact: true }).fill(`可见性检查 ${theme}`);
    await page.getByRole('textbox', { name: '指令内容', exact: true }).fill('检查新建指令的字段和按钮。');
    const save = page.getByRole('button', { name: '保存指令', exact: true });
    expect((await save.evaluate(controlContrast)).ratio).toBeGreaterThanOrEqual(4.5);
    await save.hover();
    expect((await save.evaluate(controlContrast)).ratio).toBeGreaterThanOrEqual(4.5);
    await save.click();
    await expect(dialog(page)).toContainText(`可见性检查 ${theme}`);
    await page.keyboard.press('Escape');
  }
});

test('pinned prompts follow the centered composer across window widths and host spacing', async ({ page }) => {
  const cases = [
    { width: 1600, clearance: '16px', maxWidth: '680px' },
    { width: 1000, clearance: '28px', maxWidth: '520px' },
    { width: 640, clearance: '16px', maxWidth: '680px' },
    { width: 390, clearance: '16px', maxWidth: '680px' },
    { width: 390, clearance: '8px', maxWidth: 'min(calc(100% - 16px), 952px)' },
  ];
  for (const layout of cases) {
    await page.setViewportSize({ width: layout.width, height: 900 });
    await page.locator('.host-stage').evaluate((element, layout) => {
      element.style.setProperty('--dsh-composer-side-clearance', layout.clearance);
      element.style.setProperty('--dsh-composer-card-max-width', layout.maxWidth);
    }, layout);
    const pins = await page.locator('.dqp-pins').boundingBox();
    const card = await page.locator('.host-composer').boundingBox();
    expect(Math.abs(pins.x - card.x)).toBeLessThan(1);
    expect(Math.abs(pins.width - card.width)).toBeLessThan(1);
    expect(pins.y + pins.height).toBeLessThanOrEqual(card.y + 1);
    for (const chip of await page.locator('.dqp-pin-chip').all()) {
      const box = await chip.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(card.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width + 1);
    }
  }
});

test('search and keyboard insertion preserve existing draft and attachments without sending', async ({ page }) => {
  const draft = page.getByRole('textbox', { name: 'Harness 草稿' });
  await draft.fill('已有说明\n');
  await open(page);
  await search(page).fill('运行 测试');
  await search(page).press('Enter');
  await expect(dialog(page)).not.toBeVisible();
  await expect(draft).toHaveValue('已有说明\n运行与当前改动相关的测试，修复由本次修改引起的问题，并说明测试结果与尚未验证的部分。');
  const result = await page.evaluate(() => window.__test.snapshot());
  expect(result.submitted).toBe(0);
  expect(result.attachmentIds).toEqual(['image-1']);
  await open(page); await page.getByRole('button', { name: '最近使用', exact: true }).click();
  await expect(dialog(page).locator('.dqp-prompt')).toHaveCount(1);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await draft.fill('保留当前说明\n');
  await page.getByRole('button', { name: '先分析再修改', exact: true }).click();
  await expect(draft).toHaveValue(/^保留当前说明\n先阅读相关内容/);
  expect(await page.evaluate(() => window.__test.snapshot().submitted)).toBe(0);
});

test('create, edit, duplicate and delete project prompts with scope isolation and persistence', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: '新建指令', exact: true }).click();
  await page.getByRole('textbox', { name: '名称', exact: true }).fill('项目发布检查');
  await page.getByRole('textbox', { name: '指令内容', exact: true }).fill('检查当前项目的发布配置。');
  await page.getByRole('textbox', { name: '分类', exact: true }).fill('发布');
  await page.getByRole('combobox', { name: '使用范围', exact: true }).selectOption('workspace');
  await page.getByRole('button', { name: '保存指令', exact: true }).click();
  await search(page).fill('项目发布检查'); await expect(dialog(page).locator('.dqp-prompt')).toHaveCount(1);
  await page.getByRole('button', { name: '编辑 项目发布检查', exact: true }).click();
  await page.getByRole('textbox', { name: '指令内容', exact: true }).fill('检查修改后的配置。');
  await page.getByRole('button', { name: '保存指令', exact: true }).click();
  await page.getByRole('button', { name: '复制一份 项目发布检查', exact: true }).click();
  await page.getByRole('button', { name: '保存指令', exact: true }).click();
  await expect(dialog(page).locator('.dqp-prompt')).toHaveCount(2);
  await page.getByRole('button', { name: '删除 项目发布检查 (复制一份)', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(dialog(page).locator('.dqp-prompt')).toHaveCount(1);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '切换项目', exact: true }).click();
  await open(page); await search(page).fill('项目发布检查'); await expect(dialog(page).locator('.dqp-prompt')).toHaveCount(0);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '切换项目', exact: true }).click();
  await page.reload(); await open(page); await search(page).fill('项目发布检查');
  await expect(dialog(page).locator('.dqp-prompt')).toHaveCount(1);
});

test('template preview keeps literal text and refuses a stale draft before explicit retry', async ({ page }) => {
  await open(page); await search(page).fill('润色文本'); await dialog(page).locator('.dqp-prompt').click();
  await page.getByRole('textbox', { name: '文本', exact: true }).fill('<script>window.hacked=true</script> 原文');
  await expect(dialog(page).locator('.dqp-preview')).toContainText('<script>window.hacked=true</script>');
  await page.evaluate(() => window.__test.setDraft('另一条新草稿\n'));
  await page.getByRole('button', { name: '填入草稿', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('草稿发生变化');
  expect(await page.evaluate(() => window.__test.snapshot().draft)).toBe('另一条新草稿\n');
  await page.getByRole('button', { name: '在当前光标处重试', exact: true }).click();
  await page.getByRole('button', { name: '填入草稿', exact: true }).click();
  expect(await page.evaluate(() => window.__test.snapshot().draft)).toContain('<script>window.hacked=true</script> 原文');
  expect(await page.evaluate(() => window.hacked)).toBeUndefined();
  expect(await page.evaluate(() => window.__test.snapshot().submitted)).toBe(0);
});

test('import previews additive changes and malformed input leaves the library intact', async ({ page }) => {
  await open(page); await settings(page);
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('alert')).toContainText('文件格式不正确');
  const document = initialDocument();
  document.prompts.push({ ...document.prompts[0], id: 'new-import', title: '导入的专用指令', content: '只处理当前任务', scope: 'workspace', workspace: '/old/project', pinned: false });
  await page.locator('input[type=file]').setInputFiles({ name: 'prompts.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) });
  await expect(dialog(page)).toContainText('新增 1 条，跳过 8 条');
  await page.getByRole('checkbox', { name: '将导入的项目指令关联到当前项目', exact: true }).check();
  await page.getByRole('button', { name: '合并导入', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('新增 1 条');
  await search(page).fill('导入的专用指令'); await expect(dialog(page).locator('.dqp-prompt')).toHaveCount(1);
  await settings(page);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出指令', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^dsh-quick-prompts-\d{4}-\d\d-\d\d\.json$/);
  const stream = await file.createReadStream(); const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.prompts).toHaveLength(9);
  expect(exported.prompts.at(-1).workspace).toBe('c:/projects/alpha');
});

test('pin preferences, opt-in shortcut, native focus and Escape work', async ({ page }) => {
  await page.keyboard.press('Alt+Shift+P'); await expect(dialog(page)).not.toBeVisible();
  await open(page); await expect(search(page)).toBeFocused();
  await settings(page);
  await page.getByRole('checkbox', { name: '启用 Alt + Shift + P 快捷键', exact: true }).check();
  await page.getByRole('checkbox', { name: '在输入框上方显示置顶指令', exact: true }).uncheck();
  await page.keyboard.press('Escape'); await expect(dialog(page)).not.toBeVisible();
  await expect(page.locator('.dqp-pins')).toHaveCount(0);
  await page.keyboard.press('Alt+Shift+P'); await expect(dialog(page)).toBeVisible();
  await search(page).press('ArrowDown'); await expect(dialog(page).locator('.dqp-row').nth(1)).toHaveClass(/is-active/);
});

test('storage errors do not pretend a save succeeded or overwrite corrupt data', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('dsh.quick-prompts.v1', '{broken'));
  await page.reload(); await open(page);
  await expect(page.getByRole('alert')).toContainText('无法读取指令数据');
  await expect(page.getByRole('button', { name: '新建指令', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('dsh.quick-prompts.v1'))).toBe('{broken');
});

test('other tabs update the library, and unloading cleans up UI and styles', async ({ page, context }) => {
  const other = await context.newPage(); await other.goto('/'); await open(other);
  await open(page); await page.getByRole('button', { name: '新建指令', exact: true }).click();
  await page.getByRole('textbox', { name: '名称', exact: true }).fill('跨页同步');
  await page.getByRole('textbox', { name: '指令内容', exact: true }).fill('这条指令来自另一页。');
  await page.getByRole('button', { name: '保存指令', exact: true }).click();
  await search(other).fill('跨页同步'); await expect(dialog(other).locator('.dqp-prompt')).toHaveCount(1);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '卸载插件', exact: true }).click();
  await expect(page.locator('[data-dsh-plugin="dsh-quick-prompts"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开快捷指令', exact: true })).toHaveCount(0);
  await expect(page.locator('.dqp-pins')).toHaveCount(0);
  await other.close();
});

test('English locale and narrow dark theme render without horizontal overflow', async ({ page }) => {
  await page.evaluate(() => window.__test.setLanguage('en'));
  await page.getByRole('button', { name: 'Open Quick Prompts', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Quick Prompts');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open Quick Prompts', exact: true }).click();
  expect(await page.locator('dialog').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: 'artifacts/panel-dark-mobile.png' });
});
