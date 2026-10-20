# Verification · 2026-10-20

## Environment

- Windows x64; Node.js 24.19.0; npm 11.17.0.
- DeepSeek Harness npm runtime **0.2.1-rc.2**, reported build commit `332895e`.
- Playwright 1.64.1 with a separate headless Microsoft Edge instance.

## Results

| Check | Result |
| --- | --- |
| `npm run build` | Pass; prebuilt client bundle generated |
| `npm test` | 12 tests pass |
| `npm run test:browser` | 8 browser scenarios pass |
| `npm pack --dry-run` | Pass; only plugin/runtime documentation files included |
| Official DSH plugin-manager installation of the `.tgz` | Pass in an isolated profile |
| Real DSH boot graph | Plugin present; client activated |
| Real blank-session composer | Four pinned prompt buttons visible |
| Real DSH palette | All eight starter prompts visible; search and selection work |
| Real editor insertion | Prompt inserted; original draft preserved |
| Real editor undo | Restores the original draft |
| Real client error capture | No uncaught errors or console errors observed |

The automated data checks cover workspace path matching, search, malformed and
oversized imports, additive merges, duplicate IDs, literal template substitution,
revision-guarded insertion, multi-tab edits, storage failures and cleanup.

Browser scenarios cover prompt editing/duplication/deletion, project isolation,
refresh persistence, direct pinned insertion, template previews, rejected stale
insertions, additive import/export, optional shortcuts, keyboard selection,
corrupt-data protection, multi-tab synchronization, unload cleanup, English UI
and a narrow dark-theme layout.

The browser fixture executes the packaged module-loader bundle, not a separate
product website. The real-runtime check additionally installs the actual package
through `dsh plugin`, starts DSH with `--no-open`, and uses the real composer.
The screenshot in `docs/screenshots/panel.png` comes from that real DSH runtime.

## Reproduce the native package check

```sh
npm ci
npm run build
npm install --prefix .cache/runtime --ignore-scripts --no-audit --no-fund @deepseek-ai/dsh@0.2.1-rc.2
npm pack --pack-destination artifacts
node scripts/test-runtime.mjs --package artifacts/dsh-quick-prompts-0.1.0.tgz
```

The script uses its own `.cache/runtime-installed-home`, workspace, and loopback
port 43180, then closes its own browser and DSH child process. It uses no API key
and sends no model request. Keep port 43180 free before running it.

## Boundaries

The standalone Desktop distribution and earlier/later DSH releases have not been
verified separately. Runtime compatibility relies on the documented 0.2.1-rc.2
slot, localization, session-list and input-action surfaces. Headless/SDK/ACP
profiles have no GUI and do not expose this panel.

Browser-local data does not sync across origins, browsers or devices. Attachment
preservation is covered by the composer-contract browser scenario; the real DSH
smoke test covers text insertion and undo without uploading attachments.

All tests use isolated state and background processes. No test modifies a user's
running DSH profile or controls a visible desktop window.
