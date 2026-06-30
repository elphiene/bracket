// Proxy + in-memory cache for rezarahiminia/worldcup2026 API
// TODO: verify UPSTREAM base URL from https://github.com/rezarahiminia/worldcup2026
const UPSTREAM = 'https://worldcup2026.p.rapidapi.com' // placeholder — confirm actual URL

const TTL_LIVE = 30_000   // 30s when a match is live
const TTL_IDLE = 300_000  // 5min otherwise

let cache = {
  matches: { data: null, fetchedAt: 0 },
  groups:  { data: null, fetchedAt: 0 },
}

function isLive(matches) {
  if (!Array.isArray(matches)) return false
  return matches.some(m => m.status === 'live' || m.status === 'in_progress')
}

async function fetchUpstream(path) {
  const res = await fetch(`${UPSTREAM}${path}`)
  if (!res.ok) throw new Error(`Upstream ${path} → ${res.status}`)
  return res.json()
}

async function refreshMatches() {
  const data = await fetchUpstream('/matches')
  cache.matches = { data, fetchedAt: Date.now() }
  return data
}

export async function getMatches(req, res) {
  try {
    const ttl = isLive(cache.matches.data) ? TTL_LIVE : TTL_IDLE
    if (cache.matches.data && Date.now() - cache.matches.fetchedAt < ttl) {
      return res.json(cache.matches.data)
    }
    res.json(await refreshMatches())
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}

export async function getLiveMatches(req, res) {
  try {
    if (!cache.matches.data || Date.now() - cache.matches.fetchedAt > TTL_LIVE) {
      await refreshMatches()
    }
    const live = cache.matches.data.filter(
      m => m.status === 'live' || m.status === 'in_progress'
    )
    res.json(live)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}

export async function getGroups(req, res) {
  try {
    if (cache.groups.data && Date.now() - cache.groups.fetchedAt < TTL_IDLE) {
      return res.json(cache.groups.data)
    }
    cache.groups.data = await fetchUpstream('/groups')
    cache.groups.fetchedAt = Date.now()
    res.json(cache.groups.data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
