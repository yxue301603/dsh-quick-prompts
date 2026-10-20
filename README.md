# DSH Quick Prompts · 常用指令

[English](README.en.md)

DeepSeek Harness 原生插件。在输入框旁边打开常用指令面板，搜索或点击指令即可填入当前草稿；置顶指令可以直接点选。

适合保存“检查本次改动”“先分析再修改”“总结当前进度”等反复输入的话。

![真实 DSH 中的快捷指令面板](https://raw.githubusercontent.com/yxue301603/dsh-quick-prompts/main/docs/screenshots/panel.png)

## 安装

兼容 **DeepSeek Harness 0.2.0-rc.2 起的 0.2.x 版本**，面向桌面版和 Web GUI。
已在 0.2.1-rc.2 npm 运行时及 Windows 桌面安装包自带的 0.2.0-rc.2 运行时中验证。

在桌面版的插件管理器中，使用以下 GitHub 安装来源：

```text
github:yxue301603/dsh-quick-prompts
```

使用 `dsh web` 时，在终端运行：

```sh
dsh plugin --profile web add github:yxue301603/dsh-quick-prompts
```

安装后按 Harness 的提示重载插件或重启对应的 DSH 进程，再刷新页面。
如果使用自定义 profile，请将 `web` 换成自己的名称。

仓库包含预构建的 `lib/client.js`，无需授权构建脚本。
尚未发布到 npm，请使用以上 GitHub 来源安装。

## 使用

1. 打开一个已关联工作区的会话，点击输入框工具栏中的 **快捷指令**。
2. 搜索指令，或使用方向键选择、按 Enter 填入草稿。
3. 根据需要编辑草稿，再自行发送。

插件在当前光标或选区插入纯文本，保留其他草稿内容、附件和文件引用；
支持通过编辑器原有的撤销操作撤回这次插入。插件不会自动发送消息。

### 管理自己的指令

点击“新建指令”，填写名称、正文和可选分类。每条指令都能编辑、复制、删除或置顶。
初始提供八条可修改的指令，其中四条已置顶。输入框上方最多显示四条置顶指令，完整列表始终可以在面板中访问。

- **全局**：在所有项目中显示。
- **当前项目**：只在同一工作区路径下显示。
- **最近使用**：只列出当前项目可见、曾成功插入的指令。

项目范围依据会话工作区路径，而不是 Git 仓库名称。Windows 路径忽略大小写，POSIX 路径区分大小写。项目目录移动后，可通过导出、导入时重新关联项目来迁移指令。

### 变量

在正文中使用 `{{变量名}}`：

```text
将以下文本翻译成{{目标语言}}，保留格式：

{{文本}}
```

选择这条指令时，先填写变量并预览，再填入草稿。
变量仅做字面文本替换，不执行脚本，也不调用模型。重复出现的同名变量共用一个值。
如果填写期间草稿发生变化，插件会拒绝过期的插入；结果会保留，可以明确选择当前光标后重试。

### 设置与备份

面板右上角打开“设置与备份”：

- 开关输入框上方的置顶按钮。
- 按需启用 **Alt + Shift + P**；默认关闭，避免占用已有快捷键。
- 导出全部指令和设置为 JSON。
- 导入前预览新增和重复数量；合并导入保留现有指令，跳过重复内容。
- 导入项目指令时，可选择保留原路径或关联到当前项目。

导入只合并指令，不覆盖现有偏好设置。第一版限制为 500 条指令、单条正文 20,000 字符、20 个变量及 2 MB 导入文件。

## 数据与权限

指令保存在当前浏览器、当前 Harness 站点的 `localStorage` 中。
同一站点的多个标签页可以同步更新；不同浏览器、设备、端口或域名不会自动同步。
浏览器清理站点数据会移除指令，请定期导出备份。

插件没有运行时 npm 依赖，不注册模型工具、HTTP 接口或系统命令；
不读取项目文件，不调用模型，不收集遥测，也不连接外部提示词库。
插入的内容仅在你发送消息后随普通草稿进入 Harness 的处理流程。

存储不可读或数据损坏时，插件不会自动覆盖原数据。可以下载原始数据后，再明确选择恢复初始指令。

## 开发与验证

使用 Node.js 24，所有测试均可在后台运行，无需操作桌面。

```sh
npm ci
npm run build
npm test
npm run test:browser
npm pack --dry-run
```

Windows 浏览器测试默认启动独立的无界面 Edge 临时实例，不连接已有浏览器。
其他平台先运行 `npx playwright install chromium`。
测试宿主位于 `tests/fixtures/`，仅用于验证原生插槽契约和交互，**不属于插件交付内容**。
真实 DSH 的验证记录与具体边界见 [验证记录](docs/VERIFICATION.md)。

可选的真实运行时验证（使用独立数据目录和无界面浏览器）：

```sh
npm install --prefix .cache/runtime --ignore-scripts --no-audit --no-fund @deepseek-ai/dsh@0.2.1-rc.2
npm pack --pack-destination artifacts
node scripts/test-runtime.mjs --package artifacts/dsh-quick-prompts-0.1.3.tgz
```

构建采用官方 `window.__ModuleLoader__` 客户端格式，并使用：

- `conversation.input.left`：面板入口。
- `conversation.input.dock`：置顶指令。
- `inputActions.captureInsertion()` / `insertText()`：版本校验和可撤销插入。
- `ctx.effect()`：卸载时清理样式和监听。

可参阅 [官方客户端模块文档](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/docs/subsystems/client-modules.md) 与 [输入框接口](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/packages/client/ui-conversation/src/client/contract/input.ts)。

## License

[MIT](LICENSE)
