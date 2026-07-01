const BASE = import.meta.env.VITE_API_URL

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json()
}

export const fetchConfig  = () => get('/api/config')
export const fetchMatches = () => get('/api/matches')
export const fetchGroups  = () => get('/api/groups')
export const fetchTeams   = () => get('/api/teams')
