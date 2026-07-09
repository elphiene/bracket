const BASE = import.meta.env.VITE_API_URL

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json()
}

// Per-sport resources are namespaced under /api/:sport/*.
export const fetchConfig  = sport => get(`/api/${sport}/config`)
export const fetchMatches = sport => get(`/api/${sport}/matches`)
export const fetchGroups  = sport => get(`/api/${sport}/groups`)
export const fetchTeams   = sport => get(`/api/${sport}/teams`)

// Cross-sport.
export const fetchSports    = () => get('/api/sports')
export const fetchLiveSport = () => get('/api/live-sport')
export const fetchLiveNow   = () => get('/api/live-now')
