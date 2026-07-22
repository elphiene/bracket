import { isInProgress, isFinished, matchWinner, matchStatus, shouldHideResult } from '../matchStatus'
import { useTimezone } from '../hooks/useTimezone'
import { useConfig } from '../hooks/useConfig'
import { useSpoiler } from '../hooks/useSpoiler'
import { formatKickoff } from '../timeFormat'
import Shootout from './Shootout'
import GoalScorers from './GoalScorers'
import './FocusHero.css'

// A single-match hero scoreboard for a lone focus match (typically the Final).
// Reuses the live-hero visual language but scales bigger, and works for a
// finished, live, or (as a fallback) upcoming match. Rendered by Bracket.jsx
// in place of the card grid when the focus round is one decided match.
export default function FocusHero({ match, label }) {
  const { timezone } = useTimezone()
  const { capabilities, finishedLabel } = useConfig()
  const { spoilerFree } = useSpoiler()

  const live = isInProgress(match)
  const done = isFinished(match)
  const hideResult = shouldHideResult(match, spoilerFree)
  const showScore = (live || done) && !hideResult
  const winner = hideResult ? null : matchWinner(match)
  const status = matchStatus(match)
  const statusLabel = hideResult ? null : (status.state === 'ft' ? (finishedLabel ?? status.label) : status.label)

  const homeName = match.homeTeam?.name ?? 'TBD'
  const awayName = match.awayTeam?.name ?? 'TBD'
  const homeFlag = match.homeTeam?.flag ?? null
  const awayFlag = match.awayTeam?.flag ?? null
  const homeSeed = match.homeSeed ?? null
  const awaySeed = match.awaySeed ?? null
  const dateStr = formatKickoff(match.date, timezone)
  const venueName = match.venue?.name ?? null

  return (
    <div className="focus-hero">
      <div className="fh-eyebrow">
        {live && !hideResult && <span className="live-dot">●</span>}
        <span className="fh-label">{label}</span>
      </div>

      <div className="fh-matchup">
        <div className={`fh-team${winner === 'home' ? ' fh-win' : ''}`}>
          {homeSeed && <span className="fh-seed">{homeSeed}</span>}
          {homeFlag && <img src={homeFlag} alt="" className="fh-flag" />}
          <span className="fh-name">{homeName}</span>
          {winner === 'home' && <span className="fh-trophy" title="Winner">🏆</span>}
        </div>

        {showScore ? (
          <div className="fh-scoreboard">
            <span className="fh-score">{match.homeScore ?? 0}</span>
            <span className="fh-sep">–</span>
            <span className="fh-score">{match.awayScore ?? 0}</span>
          </div>
        ) : (
          <div className="fh-kickoff">
            {dateStr && <span className="fh-when">{dateStr}</span>}
            {venueName && <span className="fh-where">{venueName}</span>}
          </div>
        )}

        <div className="fh-team fh-team-right">
          {winner === 'away' && <span className="fh-trophy" title="Winner">🏆</span>}
          <span className="fh-name">{awayName}</span>
          {awayFlag && <img src={awayFlag} alt="" className="fh-flag" />}
          {awaySeed && <span className="fh-seed">{awaySeed}</span>}
        </div>
      </div>

      {showScore && statusLabel && (
        <div className={`fh-status status-${status.state}`}>
          <span className="fh-status-line">{statusLabel}</span>
        </div>
      )}

      {!hideResult && capabilities?.scorers && <GoalScorers match={match} size="hero" />}
      {!hideResult && capabilities?.shootout && <Shootout match={match} size="lg" />}
    </div>
  )
}
