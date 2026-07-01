# Deploy

Single Node process serves **both** the built client (`client/dist`) and the
`/api/*` proxy on one port. Cherry's `openresty` reverse-proxies
`bracket.cherryslabs.com` → `http://localhost:3001` on this VM, so there is no
Cloudflare tunnel / DNS work to do on our side — we only need the app to always
be running on **port 3001**.

## Architecture

```
browser ─▶ bracket.cherryslabs.com ─▶ Cherry's openresty ─▶ localhost:3001 (bracket.service)
                                                                │
                                                                ├─ serves client/dist (SPA)
                                                                └─ /api/* ─▶ worldcup26.ir (cached, serves stale on error)
```

## Install / update (run on the VM)

```bash
cd ~/Documents/El-Projects/bracket

# 1. Build the client (produces client/dist that the server serves)
npm run build

# 2. Install the systemd unit (first time only)
sudo cp deploy/bracket.service /etc/systemd/system/
sudo systemctl daemon-reload

# 3. Free port 3001 (kills the dev/preview server if it's holding it) and start
sudo fuser -k 3001/tcp 2>/dev/null; sleep 1
sudo systemctl enable --now bracket

# 4. Verify
systemctl status bracket --no-pager
curl -s localhost:3001/api/matches | head -c 100
```

### After code changes

```bash
cd ~/Documents/El-Projects/bracket
npm run build                    # only if the CLIENT changed
sudo systemctl restart bracket   # picks up server + new dist
```

## Configuration (env-var driven)

Set in `bracket.service` under `[Service]`:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Port the server listens on (must match Cherry's openresty upstream). |
| `UPSTREAM_URL` | `https://worldcup26.ir` | Upstream World Cup API base. Override to self-host / mirror. |
| `NODE_ENV` | `production` | — |

The client build uses `client/.env.production` (`VITE_API_URL=` empty) so the
SPA calls `/api/*` on the same origin — no rebuild needed to change ports.

## Notes

- `ExecStart` uses an absolute nvm node path. If node is upgraded, update the
  path in `bracket.service`, then `sudo systemctl daemon-reload && sudo systemctl restart bracket`.
- The proxy serves **stale cached data** if the upstream API is unreachable, so
  the display never blanks during an upstream blip.
- Logs: `journalctl -u bracket -f`
