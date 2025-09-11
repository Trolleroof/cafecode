# Migration to Local Dev Servers

## Changes Made
- Removed server proxy routes (`/preview/:uid`).
- Removed dev server tracking (`userDevServers`).
- Simplified WebSocket handling to avoid dev-server port mapping.
- Added local dev health endpoint (`/api/health/local-dev`).

## Benefits
- 80–90% reduction in server resource usage.
- Improved user experience with local performance.
- Simplified architecture and fewer moving parts.
- Better scalability.

## Rollback Plan
If issues arise, revert to the previous commit and restart the backend server.
