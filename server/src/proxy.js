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
let stadiumsCache = { data: null, fetchedAt: 0 }

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

// worldcup26.ir's local_date is the STADIUM's own local wall-clock kickoff
// time, not a single fixed source-timezone offset. (persian_date carrying
// the same clock digits as local_date is a red herring — that's just the
// Gregorian→Jalali *calendar* conversion, which never touches the time of
// day.) Upstream doesn't expose a per-match timezone, so it's hardcoded here
// from the fixed 16-venue World Cup 2026 list (`/get/stadiums`).
const STADIUM_TIMEZONE = {
  '1':  'America/Mexico_City', // Estadio Azteca, Mexico City
  '2':  'America/Mexico_City', // Estadio Akron, Guadalajara
  '3':  'America/Monterrey',   // Estadio BBVA, Monterrey
  '4':  'America/Chicago',     // AT&T Stadium, Dallas
  '5':  'America/Chicago',     // NRG Stadium, Houston
  '6':  'America/Chicago',     // Arrowhead Stadium, Kansas City
  '7':  'America/New_York',    // Mercedes-Benz Stadium, Atlanta
  '8':  'America/New_York',    // Hard Rock Stadium, Miami
  '9':  'America/New_York',    // Gillette Stadium, Boston
  '10': 'America/New_York',    // Lincoln Financial Field, Philadelphia
  '11': 'America/New_York',    // MetLife Stadium, New York/New Jersey
  '12': 'America/Toronto',     // BMO Field, Toronto
  '13': 'America/Vancouver',   // BC Place, Vancouver
  '14': 'America/Los_Angeles', // Lumen Field, Seattle
  '15': 'America/Los_Angeles', // Levi's Stadium, San Francisco Bay Area
  '16': 'America/Los_Angeles', // SoFi Stadium, Los Angeles
}
const DEFAULT_TIMEZONE = 'America/New_York' // fallback if stadium_id is ever missing/unrecognised

// Convert a wall-clock date/time in a given IANA zone to a UTC epoch ms,
// using only the built-in Intl API (no timezone library / DB needed).
// Standard "guess, measure the round-trip error, correct" approach — two
// passes always converge except within the DST-transition hour itself,
// which doesn't matter for scheduled kickoff times.
function zonedWallTimeToUtcMs(y, mo, d, h, mi, timeZone) {
  // Target wall-clock time, provisionally labeled as UTC — fixed reference
  // point we're trying to match against `timeZone`'s rendering of our guess.
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi)
  let utcGuess = wallAsUtc
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(utcGuess))
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]))
    const localAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
    utcGuess += wallAsUtc - localAsUtc
  }
  return utcGuess
}

function parseVenueKickoff(raw, stadiumId) {
  const m = typeof raw === 'string' && raw.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/)
  if (!m) return null
  const [mo, d, y, h, mi] = m.slice(1).map(Number)
  const timeZone = STADIUM_TIMEZONE[String(stadiumId)] ?? DEFAULT_TIMEZONE
  return new Date(zonedWallTimeToUtcMs(y, mo, d, h, mi, timeZone)).toISOString()
}

function normaliseMatch(raw, teamById, stadiumById) {
  const round = (!raw.type || raw.type === 'group') ? 'group' : raw.type
  // For group-stage matches, upstream's `group` field is the real letter
  // ("A"). For knockout matches that same field is overloaded as a round
  // code ("R32"), so group colour-tagging there instead comes from parsing
  // placeholder labels like "Winner Group E" off home_team_label.
  const group = round === 'group'
    ? (raw.group ?? null)
    : (raw.home_team_label?.match(/Group ([A-L])/)?.[1] ?? null)
  const homeT = teamById?.get(String(raw.home_team_id))
  const awayT = teamById?.get(String(raw.away_team_id))
  const stadium = stadiumById?.get(String(raw.stadium_id))
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
    date:       parseVenueKickoff(raw.local_date, raw.stadium_id),
    venue:      stadium ? { name: stadium.name_en, city: stadium.city_en } : null,
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

// Stadium names/cities never change mid-tournament, so cache forever like teams.
async function ensureStadiums() {
  if (stadiumsCache.data) return stadiumsCache.data
  const body = await fetchUpstream('/get/stadiums')
  stadiumsCache = { data: body.stadiums, fetchedAt: Date.now() }
  return stadiumsCache.data
}

async function refreshMatches() {
  const [gamesBody, teams, stadiums] = await Promise.all([
    fetchUpstream('/get/games'),
    ensureTeams(),
    ensureStadiums().catch(() => []),
  ])
  const teamById = new Map(teams.map(t => [String(t.id), t]))
  const stadiumById = new Map(stadiums.map(s => [String(s.id), s]))
  const data = gamesBody.games.map(raw => normaliseMatch(raw, teamById, stadiumById))
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
