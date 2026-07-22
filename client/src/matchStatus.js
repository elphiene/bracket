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

// True once both sides are real teams rather than TBD bracket placeholders
// (upstream gives TBD slots id "0" and no flag, e.g. "Winner Match 93").
export function isDecided(match) {
  return Boolean(match?.homeTeam?.flag && match?.awayTeam?.flag)
}

// Whether spoiler-free mode should hide this match's result. Only live or
// finished matches have a result to hide; a scheduled match shows its fixture
// as usual. The single gate every spoiler-aware component consults so the rule
// isn't re-derived per component (see useSpoiler.jsx).
export function shouldHideResult(match, spoilerFree) {
  return Boolean(spoilerFree) && (isInProgress(match) || isFinished(match))
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
  // An adapter may state the winner explicitly (e.g. tennis, where a retirement
  // can leave the set count level). Trust it over score-derived logic.
  if (match.winner === 'home' || match.winner === 'away') return match.winner
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

// Parse one scorer entry, e.g. "F. Balogun 45'+5'", "D. Bobadilla 7'(OG)",
// "L. Messi 90'+8'(P)" → { name, minute, own, pen }. `minute` keeps stoppage
// time ("45+5") and drops the apostrophes; the UI re-adds a single trailing '.
function parseScorerEntry(raw) {
  let s = String(raw).trim()
  if (!s) return null
  const own = /\(o\.?g\.?\)/i.test(s)
  const pen = /\(pen\.?\)|\(p\)/i.test(s)
  s = s.replace(/\((?:o\.?g\.?|pen\.?|p)\)/ig, '').trim()
  // Trailing minute: "9'", "45'+5'", "90'+8'".
  const m = s.match(/\s+(\d+'?(?:\s*\+\s*\d+'?)?)\s*$/)
  let minute = null
  let name = s
  if (m) {
    minute = m[1].replace(/'/g, '').replace(/\s+/g, '')
    name = s.slice(0, m.index).trim()
  }
  return { name: name || s, minute, own, pen }
}

// Parse a scorers array string into [{ name, minute, own, pen }]. Upstream uses
// a Postgres-array string but with inconsistent quote characters (straight " or
// typographic “ ”); "null"/"" mean no goals. Reuses parsePgArray after folding
// smart quotes to straight ones.
function parseScorers(raw) {
  if (typeof raw !== 'string') return []
  const norm = raw.replace(/[“”]/g, '"')
  return parsePgArray(norm).map(parseScorerEntry).filter(Boolean)
}

// Goal scorers for a match, or null if none recorded. Lists grow across polls,
// so a live match fills in as goals are scored.
export function goalScorers(match) {
  if (!match) return null
  const home = parseScorers(match.home_scorers)
  const away = parseScorers(match.away_scorers)
  if (!home.length && !away.length) return null
  return { home, away }
}

// Descriptor for the card status bar: { label, state }.
//   state ∈ 'upcoming' | 'live' | 'ft'  — drives styling.
//   label is null when upcoming (the caller shows the kickoff date/time),
//   or when a shootout should be shown instead (the caller checks that first).
export function matchStatus(match) {
  if (!match) return { label: null, state: 'upcoming' }
  if (isFinished(match)) return { label: 'Full time', state: 'ft' }

  const raw = te(match)
  const v = raw.toLowerCase()
  if (v === '' || v === 'notstarted') return { label: null, state: 'upcoming' }

  if (v === 'ht') return { label: 'Half time', state: 'live' }
  if (v === 'et') return { label: 'Extra time', state: 'live' }
  if (v === 'pen' || inPenalties(match)) return { label: 'Penalties', state: 'live' }

  // Numeric minute: "67", "45+2", "90+3"
  if (/^\d+(\+\d+)?$/.test(raw)) return { label: `${raw}'`, state: 'live' }

  // Literal "live" (the value the API actually sends) or any other
  // non-terminal state.
  return { label: 'In progress', state: 'live' }
}
