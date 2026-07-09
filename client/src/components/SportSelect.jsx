import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSports } from '../api'
import './SportSelect.css'

// Header event/sport switcher. Populated from /api/sports; changing it navigates
// to that sport's route (/:slug). Hidden until at least two sports are available.
export default function SportSelect({ current }) {
  const navigate = useNavigate()
  const [sports, setSports] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchSports().then(s => { if (!cancelled) setSports(s) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (sports.length < 2) return null

  return (
    <select
      className="sport-select"
      value={current}
      onChange={e => navigate(`/${e.target.value}`)}
      aria-label="Choose event"
      title="Choose event"
    >
      {sports.map(s => (
        <option key={s.slug} value={s.slug}>{s.name}</option>
      ))}
    </select>
  )
}
