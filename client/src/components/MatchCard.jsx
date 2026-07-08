import { forwardRef } from 'react'
import { isFinished, isInProgress, matchStatus, matchWinner, penaltyShootout } from '../matchStatus'
import { useTimezone } from '../hooks/useTimezone'
import { formatKickoff } from '../timeFormat'
import Shootout from './Shootout'
import GoalScorers from './GoalScorers'
import './MatchCard.css'

const MatchCard = forwardRef(function MatchCard({ match, accentColor, highlight, big }, ref) {
  const { timezone } = useTimezone()

  if (!match) {
    return <div ref={ref} className={`match-card placeholder${big ? ' big' : ''}`}>TBD</div>
  }

  const done = isFinished(match)
  const live = isInProgress(match)
  const showScore = live || done
  const winner = matchWinner(match)
  const shootout = penaltyShootout(match)
  const status = matchStatus(match)

  const homeName = match.homeTeam?.name ?? 'TBD'
  const awayName = match.awayTeam?.name ?? 'TBD'
  const homeFlag = match.homeTeam?.flag ?? null
  const awayFlag = match.awayTeam?.flag ?? null
  const homeScore = match.homeScore
  const awayScore = match.awayScore
  const dateStr   = formatKickoff(match.date, timezone)
  const venueName = match.venue?.name ?? null
  const venueCity = match.venue?.city ?? null

  return (
    <div
      ref={ref}
      className={`match-card${big ? ' big' : ''}${live ? ' live' : ''}${done ? ' done' : ''}${highlight ? ' highlight' : ''}`}
      style={accentColor ? { '--accent': accentColor } : {}}
    >
      <div className={`team-row${winner === 'home' ? ' winner' : ''}`}>
        {homeFlag && <img src={homeFlag} alt="" className="flag" />}
        <span className="team-name">{homeName}</span>
        {winner === 'home' && <span className="trophy" title="Winner">🏆</span>}
        {showScore && <span className="score">{homeScore ?? 0}</span>}
      </div>
      <div className={`team-row${winner === 'away' ? ' winner' : ''}`}>
        {awayFlag && <img src={awayFlag} alt="" className="flag" />}
        <span className="team-name">{awayName}</span>
        {winner === 'away' && <span className="trophy" title="Winner">🏆</span>}
        {showScore && <span className="score">{awayScore ?? 0}</span>}
      </div>

      {/* Focus round only: goal scorers fill the taller card and add detail.
          Renders nothing when the feed has no scorers. */}
      {big && showScore && <GoalScorers match={match} size="card" />}

      {/* Fixed-height status bar. Penalties render here too, so shootout
          cards stay the same height as every other card. */}
      <div className={`card-status status-${status.state}`}>
        {shootout ? (
          <Shootout match={match} size="bar" />
        ) : status.label ? (
          <span className="status-line">
            {status.state === 'live' && <span className="status-dot" />}
            {status.label}
          </span>
        ) : (
          <div
            className="upcoming-info"
            title={venueName ? `${venueName}${venueCity ? `, ${venueCity}` : ''}` : undefined}
          >
            <span className="upcoming-label">Upcoming</span>
            <span className="upcoming-meta">
              {venueName && <span className="upcoming-venue">{venueName}</span>}
              {dateStr && <span className="upcoming-date">{dateStr}</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  )
})

export default MatchCard
