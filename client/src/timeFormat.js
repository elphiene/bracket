// Format a UTC ISO kickoff timestamp for display in a given IANA timezone.
// timeZone === undefined lets Intl fall back to the environment's own zone
// (used for the "local time" / auto option).
export function formatKickoff(isoDate, timeZone) {
  if (!isoDate) return null
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return null
  const opts = timeZone ? { timeZone } : {}
  const datePart = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', ...opts }).format(d)
  const timePart = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', ...opts }).format(d)
  return `${datePart} · ${timePart}`
}

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Fallback for browsers without Intl.supportedValuesOf('timeZone').
const FALLBACK_ZONES = [
  'UTC',
  'Pacific/Auckland', 'Australia/Sydney', 'Australia/Perth',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Tehran',
  'Europe/Moscow', 'Europe/Istanbul', 'Europe/Athens', 'Europe/Berlin', 'Europe/Paris', 'Europe/London',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
  'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Mexico_City', 'America/Toronto', 'America/Vancouver', 'Pacific/Honolulu',
]

export function listTimezones() {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      // fall through to the curated list
    }
  }
  return FALLBACK_ZONES
}
