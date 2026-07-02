// Proxy + in-memory cache for rezarahiminia/worldcup2026 API
// Endpoints: /get/games, /get/groups, /get/teams — no auth required
const UPSTREAM = process.env.UPSTREAM_URL || 'https://worldcup26.ir'

const TTL_LIVE  = 30_000     // 30s when a match is live
const TTL_IDLE  = 60_000     // 60s otherwise — keeps not-live→live transitions snappy
const TTL_TEAMS = 3_600_000  // teams rarely change; refresh hourly

let cache = {
  matches: { data: null, fetchedAt: 0 },
  groups:  { data: null, fetchedAt: 0 },
}
let teamsCache = { data: null, fetchedAt: 0 }

// ── Normalisation ──────────────────────────────────────────────────────────
const WC_GROUP_COLORS = {
  A:'#E24B4A', B:'#D85A30', C:'#EF9F27', D:'#7CBB41',
  E:'#1D9E75', F:'#378ADD', G:'#7F77DD', H:'#D4537E',
  I:'#C94B6D', J:'#4BACB0', K:'#8E6AC9', L:'#BC7E4A',
}
const ROUND_SORT   = { r32:1, r16:2, qf:3, sf:4, third:5, final:6 }
const ROUND_LABELS = {
  r32:'Round of 32', r16:'Round of 16', qf:'Quarter-finals',
  sf:'Semi-finals', third:'3rd Place', final:'Final',
}

// worldcup26.ir publishes kickoff times in Iran Standard Time (UTC+3:30,
// fixed — Iran abolished DST in 2022): local_date and persian_date always
// carry the identical clock digits, just in the Gregorian vs. Jalali
// calendar, confirming it's one fixed source zone rather than per-venue
// local time. Convert to a real UTC instant here so the client can render
// it in whatever timezone the viewer picks, instead of echoing Iran time.
const IRAN_OFFSET_MINUTES = 3 * 60 + 30

function parseIranKickoff(raw) {
  const m = typeof raw === 'string' && raw.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/)
  if (!m) return null
  const [mo, d, y, h, mi] = m.slice(1).map(Number)
  const utcMs = Date.UTC(y, mo - 1, d, h, mi) - IRAN_OFFSET_MINUTES * 60_000
  return new Date(utcMs).toISOString()
}

function normaliseMatch(raw, teamById) {
  const group = raw.home_team_label?.match(/Group ([A-L])/)?.[1] ?? null
  const round = (!raw.type || raw.type === 'group') ? 'group' : raw.type
  const homeT = teamById?.get(String(raw.home_team_id))
  const awayT = teamById?.get(String(raw.away_team_id))
  return {
    // ── Normalised fields ───────────────────────────────────────────────────
    id:         String(raw.id),
    homeTeam: {
      id:   String(raw.home_team_id),
      name: raw.home_team_name_en || raw.home_team_label || 'TBD',
      flag: homeT?.flag ?? null,
    },
    awayTeam: {
      id:   String(raw.away_team_id),
      name: raw.away_team_name_en || raw.away_team_label || 'TBD',
      flag: awayT?.flag ?? null,
    },
    homeScore:  raw.home_score != null ? Number(raw.home_score) : null,
    awayScore:  raw.away_score != null ? Number(raw.away_score) : null,
    date:       parseIranKickoff(raw.local_date),
    status:     raw.time_elapsed === 'live' ? 'live'
                : (raw.finished === 'TRUE' || raw.time_elapsed === 'finished' || raw.time_elapsed === 'Finished')
                  ? 'finished' : 'scheduled',
    round,
    roundLabel: ROUND_LABELS[round] ?? round,
    sortOrder:  ROUND_SORT[round] ?? 99,
    group,
    groupColor: group ? (WC_GROUP_COLORS[group] ?? null) : null,
    // ── Raw pass-throughs for matchStatus.js ───────────────────────────────
    time_elapsed:         raw.time_elapsed,
    finished:             raw.finished,
    home_penalty_score:   raw.home_penalty_score,
    away_penalty_score:   raw.away_penalty_score,
    // Per-kick shootout lists (Postgres-array strings, e.g. '{"A","B"}').
    // Parsed client-side by penaltyShootout() in matchStatus.js.
    home_penalty_scorers: raw.home_penalty_scorers,
    home_penalty_misses:  raw.home_penalty_misses,
    away_penalty_scorers: raw.away_penalty_scorers,
    away_penalty_misses:  raw.away_penalty_misses,
  }
}

// ── Upstream helpers ───────────────────────────────────────────────────────
function isLive(matches) {
  if (!Array.isArray(matches)) return false
  return matches.some(m => m.status === 'live')
}

async function fetchUpstream(path) {
  const res = await fetch(`${UPSTREAM}${path}`)
  if (!res.ok) throw new Error(`Upstream ${path} → ${res.status}`)
  return res.json()
}

async function ensureTeams() {
  if (teamsCache.data) return teamsCache.data
  const body = await fetchUpstream('/get/teams')
  teamsCache = { data: body.teams, fetchedAt: Date.now() }
  return teamsCache.data
}

async function refreshMatches() {
  const [gamesBody, teams] = await Promise.all([
    fetchUpstream('/get/games'),
    ensureTeams(),
  ])
  const teamById = new Map(teams.map(t => [String(t.id), t]))
  const data = gamesBody.games.map(raw => normaliseMatch(raw, teamById))
  cache.matches = { data, fetchedAt: Date.now() }
  return data
}

// ── Route handlers ─────────────────────────────────────────────────────────
export async function getMatches(req, res) {
  try {
    const ttl = isLive(cache.matches.data) ? TTL_LIVE : TTL_IDLE
    if (cache.matches.data && Date.now() - cache.matches.fetchedAt < ttl) {
      return res.json(cache.matches.data)
    }
    res.json(await refreshMatches())
  } catch (err) {
    if (cache.matches.data) return res.json(cache.matches.data)
    res.status(502).json({ error: err.message })
  }
}

export async function getLiveMatches(req, res) {
  try {
    if (!cache.matches.data || Date.now() - cache.matches.fetchedAt > TTL_LIVE) {
      await refreshMatches()
    }
    res.json(cache.matches.data.filter(m => m.status === 'live'))
  } catch (err) {
    if (cache.matches.data) {
      return res.json(cache.matches.data.filter(m => m.status === 'live'))
    }
    res.status(502).json({ error: err.message })
  }
}

function enrichGroups(groups, teams) {
  if (!teams) return groups
  const teamById = new Map(teams.map(t => [String(t.id), t]))
  return groups.map(g => ({
    ...g,
    teams: g.teams?.map(t => ({
      ...t,
      name: teamById.get(String(t.team_id))?.name_en ?? t.name_en ?? `Team ${t.team_id}`,
      flag: teamById.get(String(t.team_id))?.flag ?? null,
    })),
  }))
}

export async function getGroups(req, res) {
  try {
    if (cache.groups.data && Date.now() - cache.groups.fetchedAt < TTL_IDLE) {
      return res.json(cache.groups.data)
    }
    const [body, teams] = await Promise.all([
      fetchUpstream('/get/groups'),
      ensureTeams().catch(() => null),
    ])
    cache.groups.data = enrichGroups(body.groups, teams)
    cache.groups.fetchedAt = Date.now()
    res.json(cache.groups.data)
  } catch (err) {
    if (cache.groups.data) return res.json(cache.groups.data)
    res.status(502).json({ error: err.message })
  }
}

export async function getTeams(req, res) {
  try {
    if (teamsCache.data && Date.now() - teamsCache.fetchedAt < TTL_TEAMS) {
      return res.json(teamsCache.data)
    }
    const teams = await ensureTeams()
    res.json(teams)
  } catch (err) {
    if (teamsCache.data) return res.json(teamsCache.data)
    res.status(502).json({ error: err.message })
  }
}
