import express from 'express'
import cors from 'cors'
import http from 'http'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import {
  getConfig, getMatches, getLiveMatches, getGroups, getTeams,
  getSports, getLiveSport, getLiveNow,
} from './proxy.js'
import { listSports } from './sports/index.js'
import { buildHead, routeMeta, HEAD_META_RE } from './meta.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '../../client/dist')

const app = express()
const PORT = process.env.PORT || 3001

// Public canonical origin, used for canonical/OG URLs and the sitemap. Override
// via env if the deploy domain ever changes.
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://bracket.cherryslabs.com'

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

// Cross-sport (single-segment paths — no conflict with /api/:sport/*).
app.get('/api/sports', getSports)
app.get('/api/live-sport', getLiveSport)
app.get('/api/live-now', getLiveNow)

// ── Crawler files (generated from the registry so they track new sports) ──────
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`)
})

app.get('/sitemap.xml', (_req, res) => {
  const paths = ['/', ...listSports().map(s => `/${s.slug}`)]
  const urls = paths
    .map(p => `  <url><loc>${SITE_ORIGIN}${p}</loc><changefreq>${p === '/' ? 'daily' : 'hourly'}</changefreq></url>`)
    .join('\n')
  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
})

// Per-sport.
app.get('/api/:sport/config', getConfig)
app.get('/api/:sport/matches', getMatches)
app.get('/api/:sport/live', getLiveMatches)
app.get('/api/:sport/groups', getGroups)
app.get('/api/:sport/teams', getTeams)

// Serve built client if dist exists. `index: false` so `/` falls through to the
// meta-injecting fallback instead of static serving the raw index.html.
if (existsSync(DIST)) {
  app.use(express.static(DIST, { index: false }))

  // SPA fallback: serve index.html for any non-asset route, injecting per-route
  // title/description/OG tags (see meta.js) so shared links preview correctly.
  let template = null
  app.get('*', (req, res) => {
    if (template == null) {
      try { template = readFileSync(join(DIST, 'index.html'), 'utf8') } catch { template = '' }
    }
    const html = template.replace(HEAD_META_RE, buildHead(routeMeta(req.path, SITE_ORIGIN)))
    res.type('html').send(html)
  })
}

app.listen(PORT, () => console.log(`bracket on :${PORT}`))
