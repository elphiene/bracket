// Generic per-sport, per-resource in-memory cache.
//
// Extracted from the old single-sport proxy.js. Keyed by `${slug}:${resource}`
// so multiple tournaments can be cached side by side. Two-tier TTL: 30s while a
// match is live (so not-live→live transitions are caught quickly), 60s idle.
// Teams rarely change so callers pass a long TTL. On producer failure we serve
// the last-good value (stale) instead of throwing — the handler only errors if
// there is no cached value at all.

export const TTL_LIVE  = 30_000
export const TTL_IDLE  = 60_000
export const TTL_TEAMS = 3_600_000

const store = new Map() // `${slug}:${resource}` → { data, fetchedAt }

function anyLive(data) {
  return Array.isArray(data) && data.some(m => m?.status === 'live')
}

// producer: async () => data
// opts.liveAware: shorten the TTL to TTL_LIVE when the cached data has a live match
// opts.ttl:       override the idle TTL (e.g. TTL_TEAMS)
export async function getCached(slug, resource, producer, opts = {}) {
  const key = `${slug}:${resource}`
  const entry = store.get(key)
  const now = Date.now()

  let ttl = opts.ttl ?? TTL_IDLE
  if (opts.liveAware && entry && anyLive(entry.data)) ttl = TTL_LIVE

  if (entry && now - entry.fetchedAt < ttl) return entry.data

  try {
    const data = await producer()
    store.set(key, { data, fetchedAt: now })
    return data
  } catch (err) {
    if (entry) return entry.data // serve stale rather than error
    throw err
  }
}
