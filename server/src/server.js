import express from 'express'
import cors from 'cors'
import http from 'http'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { getMatches, getLiveMatches, getGroups, getTeams } from './proxy.js'
import { getConfig } from './sports/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '../../client/dist')

const app = express()
const PORT = process.env.PORT || 3001

// Same-origin reverse proxy to the self-hosted GoatCounter analytics instance.
// GoatCounter runs privately on STATS_UPSTREAM under the /stats base-path; the
// browser only ever talks to this origin (bracket.cherryslabs.com/stats/*), so
// no extra subdomain/DNS is needed. The tracking beacon lives at /stats/count.
// Set STATS_UPSTREAM='' to disable (e.g. dev without GoatCounter running).
const STATS_UPSTREAM = process.env.STATS_UPSTREAM ?? 'http://127.0.0.1:8085'
const STATS_VHOST = process.env.STATS_VHOST || 'bracket.cherryslabs.com'

if (STATS_UPSTREAM) {
  const target = new URL(STATS_UPSTREAM)
  // Mount before express.json() so the request body stream is passed through untouched.
  app.use('/stats', (req, res) => {
    const proxyReq = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        method: req.method,
        path: req.originalUrl, // keeps the /stats prefix + query string
        headers: {
          ...req.headers,
          // GoatCounter routes to a site by Host; pin it to the configured vhost
          // so counting works even when the incoming Host differs (dev, IP, etc.).
          host: STATS_VHOST,
          'x-forwarded-host': STATS_VHOST,
          'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'https',
          'x-forwarded-for': req.socket.remoteAddress,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers)
        proxyRes.pipe(res)
      }
    )
    proxyReq.on('error', () => {
      if (!res.headersSent) res.status(502).json({ error: 'stats upstream unavailable' })
    })
    req.pipe(proxyReq)
  })
}

app.use(cors())
app.use(express.json())

app.get('/api/config', (req, res) => res.json(getConfig()))
app.get('/api/matches', getMatches)
app.get('/api/live', getLiveMatches)
app.get('/api/groups', getGroups)
app.get('/api/teams', getTeams)

// Serve built client if dist exists
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (req, res) => res.sendFile(join(DIST, 'index.html')))
}

app.listen(PORT, () => console.log(`bracket on :${PORT}`))
