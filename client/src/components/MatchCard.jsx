import { forwardRef } from 'react'
import { isFinished, isInProgress, matchStatus, matchWinner, penaltyShootout } from '../matchStatus'
import Shootout from './Shootout'
import './MatchCard.css'

function parseDate(localDate) {
  if (!localDate) return null
  const m = localDate.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})/)
  if (!m) return null
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m[1]) - 1]} ${parseInt(m[2])} · ${m[4]}`
}

const MatchCard = forwardRef(function MatchCard({ match, accentColor, highlight, big }, ref) {
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
  const dateStr   = parseDate(match.date)

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
          <span className="status-line status-date">{dateStr}</span>
        )}
      </div>
    </div>
  )
})

export default MatchCard
