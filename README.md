# bracket

Live bracket display for the 2026 FIFA World Cup.

Auto-zooms to the current live match. Shows the full knockout bracket and completed group stage results. Updates every 30s during live matches, every 5min otherwise.

## Stack

- **Frontend:** React + Vite → Cloudflare Pages
- **Backend:** Node + Express (proxy + in-memory cache)
- **Data:** rezarahiminia/worldcup2026 API (free, no key)

## Structure

```
bracket/
├── server/        Express API proxy
├── client/        React + Vite frontend
├── deploy/        Systemd service file
└── docs/          Architecture + operations
```

## Quick start

```bash
npm run install:all
npm run dev
```

See `docs/OPERATIONS.md` for deploy steps.
