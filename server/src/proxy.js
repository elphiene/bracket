// Sport-aware route handlers. Each resolves `:sport` → a registry adapter, then
// runs it through the generic cache. All upstream/normalisation knowledge lives
// in the per-sport adapters (server/src/sports/*); this file is transport only.
import { getSport, listSports, defaultSport } from './sports/index.js'
import { getCached, TTL_TEAMS } from './cache.js'

// Resolve the sport from the route param, or 404. Returns the module or null
// (having already sent the 404 response).
function resolve(req, res) {
  const sport = getSport(req.params.sport)
  if (!sport) {
    res.status(404).json({ error: `unknown sport: ${req.params.sport}` })
    return null
  }
  return sport
}

async function serve(res, slug, resource, producer, opts) {
  try {
    res.json(await getCached(slug, resource, producer, opts))
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}

// ── Per-sport endpoints ──────────────────────────────────────────────────────
export function getConfig(req, res) {
  const s = resolve(req, res); if (!s) return
  res.json(s.config)
}

export function getMatches(req, res) {
  const s = resolve(req, res); if (!s) return
  serve(res, s.config.slug, 'matches', () => s.adapter.getMatches(), { liveAware: true })
}

export async function getLiveMatches(req, res) {
  const s = resolve(req, res); if (!s) return
  try {
    const matches = await getCached(s.config.slug, 'matches', () => s.adapter.getMatches(), { liveAware: true })
    res.json(matches.filter(m => m.status === 'live'))
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}

export function getGroups(req, res) {
  const s = resolve(req, res); if (!s) return
  serve(res, s.config.slug, 'groups', () => s.adapter.getGroups())
}

export function getTeams(req, res) {
  const s = resolve(req, res); if (!s) return
  serve(res, s.config.slug, 'teams', () => s.adapter.getTeams(), { ttl: TTL_TEAMS })
}

// ── Cross-sport endpoints ────────────────────────────────────────────────────

// Light per-edition summary for the hub landing: overall state + the raw bits the
// client needs to compose a blurb. `champion` is left for the client to redact
// under spoiler-free mode (the server can't know that per-user preference).
function summarise(matches) {
  const live = matches.filter(m => m.status === 'live')
  if (live.length) {
    return { status: 'live', liveCount: live.length, round: live[0].roundLabel ?? null, champion: null, startDate: null }
  }
  const scheduled = matches.filter(m => m.status === 'scheduled' && m.date)
  if (scheduled.length) {
    const next = scheduled.reduce((a, b) => (a.date < b.date ? a : b))
    return { status: 'upcoming', liveCount: 0, round: next.roundLabel ?? null, champion: null, startDate: next.date }
  }
  const final = matches.find(m => m.round === 'final')
  let champion = null
  if (final?.winner) champion = (final.winner === 'home' ? final.homeTeam : final.awayTeam)?.name ?? null
  return { status: 'finished', liveCount: 0, round: final?.roundLabel ?? null, champion, startDate: null }
}

export async function getSports(_req, res) {
  const out = await Promise.all(listSports().map(async s => {
    try {
      const matches = await getCached(s.slug, 'matches', () => getSport(s.slug).adapter.getMatches(), { liveAware: true })
      return { ...s, ...summarise(matches) }
    } catch {
      return { ...s, status: null, liveCount: 0, round: null, champion: null, startDate: null }
    }
  }))
  res.json(out)
}

// Which sport to show on the root landing: the first with a live match, else the
// default. Uses cached matches so this is cheap to poll.
export async function getLiveSport(_req, res) {
  for (const { slug } of listSports()) {
    const s = getSport(slug)
    try {
      const matches = await getCached(slug, 'matches', () => s.adapter.getMatches(), { liveAware: true })
      if (matches.some(m => m.status === 'live')) return res.json({ slug })
    } catch {
      // ignore a failing sport; keep scanning
    }
  }
  res.json({ slug: defaultSport() })
}

// Every live match across every sport, as lightweight items for the "NOW LIVE"
// banner. Reuses each sport's cached matches (no extra upstream calls), so it's
// cheap to poll. Errors on one sport don't sink the rest.
export async function getLiveNow(_req, res) {
  const items = []
  for (const { slug } of listSports()) {
    const s = getSport(slug)
    try {
      const matches = await getCached(slug, 'matches', () => s.adapter.getMatches(), { liveAware: true })
      for (const m of matches) {
        if (m.status !== 'live') continue
        items.push({
          slug,
          sportName: s.config.name,
          accentColor: s.config.accentColor,
          scoreNoun: s.config.scoreNoun,
          id: m.id,
          roundLabel: m.roundLabel,
          home: m.homeTeam?.name ?? 'TBD',
          away: m.awayTeam?.name ?? 'TBD',
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        })
      }
    } catch {
      // ignore a failing sport; keep scanning
    }
  }
  res.json(items)
}
