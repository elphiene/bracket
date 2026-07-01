// Single source of truth for interpreting a match's `time_elapsed` field.
//
// The upstream API (rezarahiminia/worldcup2026) currently only emits these
// time_elapsed values: "notstarted", "live", "finished", "Finished".
// It does NOT provide a live minute or phase code. We still handle a numeric
// minute ("67", "45+2", "90+3") and phase codes (HT/ET/PEN) defensively, in
// case upstream starts populating them — plus penalties are inferred from the
// *_penalty_score fields, which the API does expose.

const DONE_VALUES = new Set(['finished', 'ft'])

function te(match) {
  return String(match?.time_elapsed ?? '').trim()
}

export function isFinished(match) {
  return match?.finished === 'TRUE' || DONE_VALUES.has(te(match).toLowerCase())
}

// True for any non-terminal, kicked-off state: "live", a minute, HT/ET/PEN.
export function isInProgress(match) {
  if (!match || isFinished(match)) return false
  const v = te(match).toLowerCase()
  return v !== '' && v !== 'notstarted'
}

function inPenalties(match) {
  const p = match?.home_penalty_score
  return p != null && p !== 'null' && p !== ''
}

function penScore(raw) {
  if (raw == null || raw === 'null' || raw === '') return null
  const n = Number(raw)
  return Number.isNaN(n) ? null : n
}

// Which side won a finished match: 'home' | 'away' | null.
// null means either not finished or a genuine draw (group stage). Knockout ties
// are broken on the penalty shootout when the 90'/ET score is level.
export function matchWinner(match) {
  if (!match || !isFinished(match)) return null
  const h = match.homeScore
  const a = match.awayScore
  if (h == null || a == null) return null
  if (h > a) return 'home'
  if (a > h) return 'away'
  const hp = penScore(match.home_penalty_score)
  const ap = penScore(match.away_penalty_score)
  if (hp != null && ap != null) {
    if (hp > ap) return 'home'
    if (ap > hp) return 'away'
  }
  return null
}

// Parse the upstream Postgres-array strings ('{"A","B"}') into ['A','B'].
function parsePgArray(raw) {
  if (typeof raw !== 'string') return []
  const trimmed = raw.trim()
  // Upstream uses the literal string 'null' (and '{}') for "no data".
  if (trimmed === '' || trimmed === 'null') return []
  const inner = trimmed.replace(/^\{/, '').replace(/\}$/, '').trim()
  if (!inner) return []
  const items = inner.match(/"([^"]*)"|[^,]+/g) || []
  return items
    .map(s => s.replace(/^"|"$/g, '').trim())
    .filter(s => s && s !== 'null')
}

// Reconstruct the penalty shootout, or null if this match didn't have one.
// NOTE: the feed gives each side's scored/missed *sets*, not the interleaved
// kick order — so we can show per-team attempts and the tally, but not a true
// alternating A/B/A/B sequence. Lists grow across polls, so a live shootout
// fills in as it goes.
export function penaltyShootout(match) {
  if (!match) return null
  const homeScored = parsePgArray(match.home_penalty_scorers)
  const homeMissed = parsePgArray(match.home_penalty_misses)
  const awayScored = parsePgArray(match.away_penalty_scorers)
  const awayMissed = parsePgArray(match.away_penalty_misses)
  const hs = penScore(match.home_penalty_score)
  const as = penScore(match.away_penalty_score)
  const any = hs != null || as != null ||
    homeScored.length || homeMissed.length || awayScored.length || awayMissed.length
  if (!any) return null
  return {
    home: { score: hs ?? homeScored.length, scored: homeScored, missed: homeMissed },
    away: { score: as ?? awayScored.length, scored: awayScored, missed: awayMissed },
  }
}

// Returns { text, className } for the card-header badge, or null when there's
// nothing to show (not started — the caller shows the kickoff date instead).
export function matchBadge(match) {
  if (!match) return null
  if (isFinished(match)) return { text: 'FT', className: 'status-ft' }

  const raw = te(match)
  const v = raw.toLowerCase()
  if (v === '' || v === 'notstarted') return null

  if (v === 'ht') return { text: 'HT', className: 'status-phase' }
  if (v === 'et') return { text: 'ET', className: 'status-phase' }
  if (v === 'pen' || inPenalties(match)) return { text: 'PEN', className: 'status-phase' }

  // Numeric minute: "67", "45+2", "90+3"
  if (/^\d+(\+\d+)?$/.test(raw)) return { text: `${raw}'`, className: 'status-minute' }

  // Literal "live" (the value the API actually sends) or any other
  // non-terminal state: pulsing LIVE badge.
  return { text: v === 'live' ? 'LIVE' : raw.toUpperCase(), className: 'status-live' }
}
