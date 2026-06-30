# Deploy

## Backend (systemd)

1. Set `PORT` in `bracket.service` once Cherry confirms the port
2. `sudo cp bracket.service /etc/systemd/system/`
3. `sudo systemctl daemon-reload && sudo systemctl enable --now bracket`

## Frontend (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Set env var `VITE_API_URL` to the backend's public URL (via Cloudflared tunnel)
- Add cherrylabs domain once Cherry sets it up

## Cloudflared tunnel

Add to existing tunnel config — same pattern as brandpack-tools/colour-match.
