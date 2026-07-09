// Reusable adapter builder for ESPN's *team-sport* scoreboard JSON (NFL, NCAA,
// AFL, soccer cups…). Unlike tennis's `groupings`, these use a flat shape: each
// top-level `event` is one match (`event.competitions[0]`), the round text lives
// in `competition.notes[0].headline` (the structured `round` field is null), and
// competitors carry `team` (displayName + logos) plus `score`/`winner`/seed.
//
// An edition supplies a `leaguePath`, a calendar `window`, a `parseRound`
// (headline → normalised round, or null to drop a match), and optionally a
// `groupOf` (→ {group, groupColor}) to colour-tag conference/region halves.

const BASE = 'https://site.api.espn.com/apis/site/v2/sports'

function normaliseStatus(name) {
  if (name === 'STATUS_IN_PROGRESS' || name === 'STATUS_HALFTIME' || name === 'STATUS_END_PERIOD')
    return 'live'
  if (name === 'STATUS_SCHEDULED') return 'scheduled'
  return 'finished' // STATUS_FINAL, STATUS_FULL_TIME, etc.
}

// ESPN ?dates=YYYYMMDD-YYYYMMDD for the most recent occurrence of a month/day
// window (see the same logic in tennisEdition.js). Empty when no window given.
function resolveDates(window, now = new Date()) {
  if (!window) return ''
  const y = now.getUTCFullYear()
  const [fm, fd] = window.from.split('-').map(Number)
  const thisYearStart = Date.UTC(y, fm - 1, fd)
  const occYear = now.getTime() >= thisYearStart ? y : y - 1
  const from = `${String(occYear).padStart(4, '0')}${window.from.replace('-', '')}`
  const toYear = occYear + (window.to < window.from ? 1 : 0)
  const to = `${String(toYear).padStart(4, '0')}${window.to.replace('-', '')}`
  return `${from}-${to}`
}

function competitor(c) {
  const t = c?.team ?? {}
  const seed = Number(c?.curatedRank?.current ?? c?.seed)
  return {
    id: String(t.id ?? c?.id ?? '0'),
    name: t.displayName || t.shortDisplayName || t.name || 'TBD',
    flag: t.logos?.[0]?.href ?? t.logo ?? null, // team badge reuses the flag slot
    seed: Number.isNaN(seed) || seed <= 0 || seed > 999 ? null : seed,
    score: c?.score,
    winner: !!c?.winner,
  }
}

export function createEspnTeamEdition(opts) {
  const {
    slug, name, subtitle = '', accentColor = '#f7b731',
    leaguePath, window = null, extraQuery = '',
    scoreNoun = 'points', finishedLabel = 'Final',
    parseRound, groupOf = null,
  } = opts

  const config = {
    slug, name, subtitle, sport: opts.sport ?? 'team', accentColor,
    hasGroups: false, hasThirdPlace: false,
    scoreNoun, finishedLabel,
    capabilities: { shootout: false, scorers: false },
  }

  async function fetchScoreboard() {
    const dates = resolveDates(window)
    const qs = [dates ? `dates=${dates}` : '', extraQuery].filter(Boolean).join('&')
    const url = `${process.env[`ESPN_${slug.toUpperCase()}_URL`] || `${BASE}/${leaguePath}/scoreboard`}${qs ? `?${qs}` : ''}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`ESPN (${slug}) upstream → ${res.status}`)
    return res.json()
  }

  function normaliseMatch(event) {
    const c = event.competitions?.[0]
    if (!c) return null
    const headline = c.notes?.[0]?.headline ?? ''
    const meta = parseRound(headline, event)
    if (!meta) return null // not a bracket match (e.g. regular season) — drop

    const comps = c.competitors ?? []
    const h = comps.find(x => x.homeAway === 'home') ?? comps[0]
    const a = comps.find(x => x.homeAway === 'away') ?? comps[1]
    const home = competitor(h), away = competitor(a)
    const status = normaliseStatus(c.status?.type?.name)
    const started = status === 'finished' || status === 'live'

    let date = null
    if (c.date) { const t = Date.parse(c.date); if (!Number.isNaN(t)) date = new Date(t).toISOString() }

    let winner = null
    if (home.winner) winner = 'home'
    else if (away.winner) winner = 'away'

    const grp = groupOf ? groupOf(headline, event) : null

    return {
      id: String(c.id ?? event.id),
      homeTeam: { id: home.id, name: home.name, flag: home.flag },
      awayTeam: { id: away.id, name: away.name, flag: away.flag },
      homeScore: started && home.score != null ? Number(home.score) : null,
      awayScore: started && away.score != null ? Number(away.score) : null,
      homeSeed: home.seed,
      awaySeed: away.seed,
      date,
      venue: c.venue?.fullName
        ? { name: c.venue.fullName, city: c.venue.address?.city ?? null }
        : null,
      status,
      round: meta.round,
      roundLabel: meta.label,
      sortOrder: meta.sort,
      group: grp?.group ?? null,
      groupColor: grp?.color ?? null,
      winner,
      time_elapsed: status === 'live' ? 'live' : status === 'finished' ? 'finished' : 'notstarted',
      finished: status === 'finished' ? 'TRUE' : null,
    }
  }

  const adapter = {
    async getMatches() {
      const body = await fetchScoreboard()
      return (body.events ?? []).map(normaliseMatch).filter(Boolean)
    },
    async getGroups() { return [] },
    async getTeams() { return [] },
  }

  return { config, adapter }
}
