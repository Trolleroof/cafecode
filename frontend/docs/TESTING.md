# Testing Plan

This project now includes WebContainer-based terminal, file system, dev server preview, sync, and build services. Given CI installs are out of scope here, use the following manual testing plan:

- Services
  - WebContainerService: verify `boot()` once, `spawnShell()` spawns interactive shell.
  - WebContainerFileSystem: list/read/write/create/delete/rename; create files from terminal and ensure they appear in the explorer.
  - DevServerManager: auto-start `npm run dev` when `package.json` exists; observe `server-ready` URL.
  - PreviewService: watch primary URL, display in Preview tab.
  - SynchronizationService: seed from backend, queue local changes, offline/online transitions, conflict resolution.
  - BuildService: run `npm run build`, stream logs, finalize status.

- Integration
  - Editor autosave → SyncStatus transitions to Syncing then Synced.
  - Deleting a file via explorer reflects in backend (verify via `/api/v2/file/<path>` 404).
  - Dev server preview hot reload on file edits.

- Accessibility
  - Preview: buttons have labels, status is `aria-live`.
  - High contrast: verify legibility under OS high-contrast mode.

- Performance
  - Large trees: expand folders incrementally; verify the UI remains responsive.
  - First load: WebContainer pre-boot reduces first terminal/preview latency (~50–200ms defer).

CI-ready unit tests can be added with Vitest/Jest in a follow-up if desired.
