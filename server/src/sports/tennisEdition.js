// Shared factory for tennis-Slam editions on ESPN's tennis scoreboard JSON.
//
// Every Slam has the identical shape: top-level `events` are tournaments, each
// with `groupings` (Men's/Women's Singles, doubles…); a grouping's
// `competitions` are the matches, each with a `round` ({id,displayName}),
// `status`, and two `competitors` carrying `athlete` (name + nationality flag),
// `winner`, and per-set `linescores`. So one factory covers Wimbledon, the
// Australian Open, etc. — they differ only by tour, grouping, and calendar slot.
//
// `window` pins an edition to its month/day slot so it stays correct year-round:
// the adapter queries the most recent occurrence via ESPN's ?dates= range
// (live when today is inside the window, most-recent-completed otherwise).
// Without a window, it fetches the current scoreboard (whatever major is on now).

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/tennis'

// ESPN main-draw round.id → normalised round. Qualifying rounds (id >= 11) are
// excluded — they precede the 128-draw and don't belong in the bracket.
const ROUNDS = {
  '1': { round: 'r128',  label: 'Round 1',        sort: 1 },
  '2': { round: 'r64',   label: 'Round 2',        sort: 2 },
  '3': { round: 'r32',   label: 'Round 3',        sort: 3 },
  '4': { round: 'r16',   label: 'Round 4',        sort: 4 },
  '5': { round: 'qf',    label: 'Quarter-finals', sort: 5 },
  '6': { round: 'sf',    label: 'Semi-finals',    sort: 6 },
  '7': { round: 'final', label: 'Final',          sort: 7 },
}

function normaliseStatus(name) {
  if (name === 'STATUS_IN_PROGRESS' || name === 'STATUS_SUSPENDED') return 'live'
  if (name === 'STATUS_SCHEDULED') return 'scheduled'
  return 'finished' // STATUS_FINAL, STATUS_RETIRED, STATUS_WALKOVER, etc.
}

// Sets won = number of set columns this competitor took. ESPN omits a summary
// `score`, so count winning line scores directly.
function setsWon(me, other) {
  const a = me?.linescores ?? []
  const b = other?.linescores ?? []
  let n = 0
  for (let i = 0; i < a.length; i++) {
    const av = Number(a[i]?.value), bv = Number(b[i]?.value)
    if (!Number.isNaN(av) && !Number.isNaN(bv) && av > bv) n++
  }
  return n
}

function competitor(c) {
  const a = c?.athlete ?? {}
  const seed = Number(c?.curatedRank?.current ?? c?.seed)
  return {
    id: String(a.id ?? c?.id ?? '0'),
    name: a.displayName || a.shortName || 'TBD',
    flag: a.flag?.href ?? null,
    seed: Number.isNaN(seed) || seed <= 0 || seed > 999 ? null : seed,
  }
}

function normaliseMatch(c) {
  const [h, aw] = c.competitors ?? []
  const status = normaliseStatus(c.status?.type?.name)
  const started = status === 'finished' || status === 'live'
  const meta = ROUNDS[String(c.round?.id)]
    ?? { round: `r${c.round?.id}`, label: c.round?.displayName || '—', sort: 99 }
  const home = competitor(h)
  const away = competitor(aw)

  let date = null
  if (c.date) { const t = Date.parse(c.date); if (!Number.isNaN(t)) date = new Date(t).toISOString() }

  // Prefer ESPN's explicit winner flag (correct even on retirements, where the
  // set count can be level). matchStatus.js falls back to score when absent.
  let winner = null
  if (h?.winner) winner = 'home'
  else if (aw?.winner) winner = 'away'

  return {
    id: String(c.id),
    homeTeam: home,
    awayTeam: away,
    homeScore: started ? setsWon(h, aw) : null,
    awayScore: started ? setsWon(aw, h) : null,
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
    group: null,
    groupColor: null,
    winner,
    time_elapsed: status === 'live' ? 'live' : status === 'finished' ? 'finished' : 'notstarted',
    finished: status === 'finished' ? 'TRUE' : null,
  }
}

// Compute ESPN's ?dates=YYYYMMDD-YYYYMMDD for the most recent occurrence of a
// month/day window (from/to are 'MM-DD'). If today is on/after this year's start
// the current year's edition is used (live or just-finished); otherwise last
// year's. Returns '' when no window is configured (→ current scoreboard).
function resolveDates(window, now = new Date()) {
  if (!window) return ''
  const y = now.getUTCFullYear()
  const [fm, fd] = window.from.split('-').map(Number)
  const thisYearStart = Date.UTC(y, fm - 1, fd)
  const occYear = now.getTime() >= thisYearStart ? y : y - 1
  const nextYear = String(occYear).padStart(4, '0')
  const from = `${nextYear}${window.from.replace('-', '')}`
  const to = `${String(occYear + (window.to < window.from ? 1 : 0)).padStart(4, '0')}${window.to.replace('-', '')}`
  return `${from}-${to}`
}

export function createTennisEdition(opts) {
  const {
    slug, name, subtitle = "Men's Singles", accentColor = '#57a773',
    tour = 'atp', grouping = 'mens-singles', window = null,
  } = opts

  const config = {
    slug, name, subtitle, sport: 'tennis', accentColor,
    hasGroups: false, hasThirdPlace: false,
    scoreNoun: 'sets', finishedLabel: 'Final',
    capabilities: { shootout: false, scorers: false },
  }

  // Pick the event with the largest chosen-grouping draw — i.e. the real major
  // in the window (filters out any minor concurrent tournament).
  function selectGrouping(body) {
    let best = null
    for (const ev of body.events ?? []) {
      const g = (ev.groupings ?? []).find(x => x.grouping?.slug === grouping)
      if (g && (!best || (g.competitions?.length ?? 0) > (best.competitions?.length ?? 0))) best = g
    }
    return best
  }

  async function fetchScoreboard() {
    const dates = resolveDates(window)
    const url = `${process.env[`TENNIS_${slug.toUpperCase()}_URL`] || `${BASE}/${tour}/scoreboard`}${dates ? `?dates=${dates}` : ''}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Tennis (${slug}) upstream → ${res.status}`)
    return res.json()
  }

  const adapter = {
    async getMatches() {
      const body = await fetchScoreboard()
      const g = selectGrouping(body)
      if (!g) return []
      return (g.competitions ?? [])
        .filter(c => ROUNDS[String(c.round?.id)]) // main draw only, drop qualifying
        .map(normaliseMatch)
    },
    async getGroups() { return [] },
    async getTeams() { return [] },
  }

  return { config, adapter }
}
