import { useState } from 'react'
import Bracket from './Bracket'
import { useTimezone } from '../hooks/useTimezone'
import { formatKickoff } from '../timeFormat'
import './LiveFocusView.css'
import './UpcomingFocusView.css'

export default function UpcomingFocusView({ allMatches, nextMatches }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const { timezone } = useTimezone()
  const count = nextMatches.length
  const next = nextMatches[Math.min(currentIdx, count - 1)]

  if (!next) return null

  const homeName = next.homeTeam?.name ?? 'TBD'
  const awayName = next.awayTeam?.name ?? 'TBD'
  const homeFlag = next.homeTeam?.flag ?? null
  const awayFlag = next.awayTeam?.flag ?? null
  const dateStr  = formatKickoff(next.date, timezone)
  const venue    = next.venue

  return (
    <div className="live-focus-wrap">
      {/* ── Hero ─────────────────────────────── */}
      <div className="live-hero">
        <div className="hero-top">
          <span className="upcoming-badge">Upcoming</span>
          {count > 1 && (
            <button className="swap-btn" onClick={() => setCurrentIdx(i => (i + 1) % count)}>
              {currentIdx + 1} / {count} &rarr;
            </button>
          )}
        </div>

        <div className="hero-matchup">
          <div className="hero-team">
            {homeFlag && <img src={homeFlag} alt="" className="hero-flag" />}
            <span className="hero-name">{homeName}</span>
          </div>

          <div className="hero-when-where">
            {dateStr && <span className="hero-when">{dateStr}</span>}
            {venue && <span className="hero-where">{venue.name} · {venue.city}</span>}
          </div>

          <div className="hero-team hero-team-right">
            <span className="hero-name">{awayName}</span>
            {awayFlag && <img src={awayFlag} alt="" className="hero-flag" />}
          </div>
        </div>
      </div>

      {/* ── Full bracket below ───────────────── */}
      <Bracket allMatches={allMatches} highlightId={next.id} />
    </div>
  )
}
