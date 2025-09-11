# Local Development Server Integration

## Overview
Your IDE now supports local development servers running on your machine. This provides better performance and reduces server costs.

## How It Works
1. Run your development server locally (`npm run dev`).
2. The IDE automatically detects your local server on common ports.
3. Click "Open Local Preview" to view your app.

## Supported Frameworks
- Vite (port 5173)
- Next.js (port 3000)
- Create React App (port 3000)
- Custom ports (3000–3003, 5173, 8080, 8000)

## Manual Configuration
If automatic detection doesn't work:
1. Click "Configure" in the dev server panel.
2. Enter your local server URL (e.g., http://localhost:3000).
3. Click "Connect".

## Troubleshooting
- Ensure your dev server is running.
- Check that the port is not blocked by firewall.
- Try refreshing the IDE; detection runs every few seconds.

