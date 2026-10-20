# DSH Quick Prompts

[简体中文](README.md)

A native DeepSeek Harness plugin for the composer. Save frequently used prompts,
search them, and insert them into the current draft. Pinned prompts also appear
above the composer. Nothing is sent automatically.

## Install

Supports **DeepSeek Harness 0.2.x from 0.2.0-rc.2**, Desktop and Web GUI.
Verified with the 0.2.1-rc.2 npm runtime and the Windows Desktop distribution's
bundled 0.2.0-rc.2 runtime in isolated, headless checks.

In the Desktop plugin manager, use `github:yxue301603/dsh-quick-prompts`.
For the Web profile:

```sh
dsh plugin --profile web add github:yxue301603/dsh-quick-prompts
```

Follow Harness's reload/restart prompt, then refresh the page. Use your own profile
name if it differs from `web`. The repository includes its prebuilt client bundle;
no build-script permission is required. This package is not published on npm yet.

## Features

- Eight editable starter prompts, including review, testing, explanation and writing.
- Create, edit, duplicate, delete, categorize and pin prompts.
- Global and workspace scopes, full-text search and recently inserted prompts.
- Up to four pinned buttons above the composer.
- Optional `{{variable}}` fields with a preview before insertion.
- Additive JSON import with a preview, deduplication and optional workspace remapping.
- JSON export, explicit reset and readable storage-error recovery.
- Chinese and English UI, light/dark themes, keyboard navigation and narrow layouts.
- Optional **Alt + Shift + P** shortcut, disabled by default.

Insertion uses the official revision-guarded, undoable editor API. It preserves
the rest of the draft, attachments and reference chips. A stale insertion is
rejected, and variable text remains available for an explicit retry.

## Data

Prompts live in browser-local storage for the current Harness origin. Tabs of the
same origin share updates. Devices, browsers and different ports do not sync;
export a backup before switching or clearing site data. Workspace scopes use the
session's working directory, with Windows-aware path comparison.

Imports merge prompts, keep existing preferences and never replace the library.
Limits: 500 prompts, 20,000 characters and 20 variables per prompt, 2 MB per import.

No model calls, telemetry, remote catalogs, HTTP endpoints, model-facing tools,
filesystem reads or runtime npm dependencies. Prompt content enters the normal
Harness conversation only when you send your draft.

## Development

```sh
npm ci
npm run check
```

Use Node.js 24. Browser tests launch a separate headless Edge on Windows. Elsewhere,
install Chromium with `npx playwright install chromium`. The test-only composer
fixture is excluded from the installable package. See [verification](docs/VERIFICATION.md)
for the real DSH checks and compatibility limits.

## License

[MIT](LICENSE)
