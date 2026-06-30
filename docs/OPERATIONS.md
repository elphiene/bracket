# Operations

## Dev

```bash
npm run install:all   # first time
npm run dev           # starts server (3001) + client (5173) concurrently
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:3001
```

## Production deploy

```bash
# 1. Build frontend
npm run build   # outputs client/dist/

# 2. Push client/dist to Cloudflare Pages (via git push → auto-build, or wrangler)

# 3. Restart backend after server changes
sudo systemctl restart bracket
```

## Logs

```bash
journalctl -u bracket -f
```

## Upstream API

Base URL and endpoint paths: confirm from https://github.com/rezarahiminia/worldcup2026
The placeholder in `server/src/proxy.js` must be updated before first run.
