// Sport registry. Each entry is a module exporting { config, adapter } — see
// shape.js for the normalised match contract every adapter must satisfy.
// Add a sport = add a module + one line here; no route or client changes.
import * as wc2026 from './wc2026.js'
import * as tennis from './tennis.js'
import * as ausopen from './ausopen.js'
import * as afl from './afl.js'

const sports = {
  [wc2026.config.slug]: wc2026,
  [tennis.config.slug]: tennis,
  [ausopen.config.slug]: ausopen,
  [afl.config.slug]: afl,
}

export function getSport(slug) {
  return sports[slug] ?? null
}

// Public display fields for the client's sport selector. Order = registry order.
export function listSports() {
  return Object.values(sports).map(s => ({
    slug: s.config.slug,
    name: s.config.name,
    sport: s.config.sport,
    subtitle: s.config.subtitle,
    accentColor: s.config.accentColor,
  }))
}

// The fallback sport for the root landing when nothing is live. ACTIVE_SPORT
// (set by the systemd unit) selects it, defaulting to the first registered sport.
export function defaultSport() {
  const env = process.env.ACTIVE_SPORT
  return env && sports[env] ? env : Object.keys(sports)[0]
}
