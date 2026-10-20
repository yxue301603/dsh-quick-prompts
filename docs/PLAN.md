# DSH Quick Prompts · v0.1

Implementation complete. See VERIFICATION.md for the final evidence.

## Product

A native, installable DeepSeek Harness plugin. A composer button opens a compact
command palette; pinned prompts are accessible beside the composer. Selecting a
prompt inserts editable text into the current draft and never sends a message.

## Scope

- Chinese-first interface with English localization.
- Useful built-in prompts, editable and removable like personal prompts.
- Create, edit, duplicate, and delete prompts.
- Global and workspace scopes, optional category, pins, search, recent use.
- JSON export and validated, previewed, additive import.
- Optional `{{variable}}` fields, with preview before inserting.
- Keyboard navigation and a configurable, opt-in shortcut.
- Browser-local storage; explicit export for backups and device migration.
- No model calls, telemetry, remote prompt libraries, or automatic sending.

## Implementation

Use the official 0.2.1-rc.2 client module loader, typed slot contracts, composer
insertion actions, and Cordis-owned resource cleanup. Ship prebuilt client code
in the Git repository so installing from GitHub does not require a build script.
Keep the Host entry minimal; do not modify an existing DSH profile during work.

## Acceptance

At the final verification stage, run model/storage tests, the build and npm
package checks, and headless browser checks. Where available, load the plugin
in an isolated real DSH runtime using a separate data directory and port, with
browser auto-opening disabled. Test draft preservation, workspace isolation,
import failures, keyboard behavior, and plugin cleanup. Do not manipulate the
user's desktop or existing browser sessions.

## Delivery

Create `yxue301603/dsh-quick-prompts` on GitHub, commit the source, prebuilt client,
documentation, and CI workflow, and provide the repository and installation
command. Record the exact verification results and compatibility boundaries.
