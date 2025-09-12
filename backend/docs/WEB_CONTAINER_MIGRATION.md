# WebContainer Migration Notes

The IDE now uses WebContainer in the browser for terminal, filesystem, and dev-server preview.

Key changes:

- Removed server-side WebSocket terminal and file-events broadcasting.
- Frontend terminal uses WebContainer.spawn and pipes TTY to xterm.js.
- Filesystem operations moved to in-browser WebContainer FS with sync to backend via `/api/v2/file/*`.
- Dev servers run in-browser; preview uses `server-ready` URL from WebContainer.

APIs kept:

- `/api/v2/files`, `/api/v2/file/*` remain for persistence and conflict detection.
- `/api/sync/*` added for batch sync and diagnostics.

Operational notes:

- Ensure Next.js serves COOP/COEP headers (see `frontend/next.config.js`).
- Backend no longer depends on `ws` or `node-pty`.

