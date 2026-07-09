import { useState } from 'react'
import Bracket from './Bracket'
import Shootout from './Shootout'
import GoalScorers from './GoalScorers'
import { useConfig } from '../hooks/useConfig'
import './LiveFocusView.css'

export default function LiveFocusView({ allMatches, liveMatches }) {
  const { capabilities } = useConfig()
  const [currentIdx, setCurrentIdx] = useState(0)
  const count = liveMatches.length
  const live = liveMatches[Math.min(currentIdx, count - 1)]

  if (!live) return null

  const homeName = live.homeTeam?.name ?? 'TBD'
  const awayName = live.awayTeam?.name ?? 'TBD'
  const homeFlag = live.homeTeam?.flag ?? null
  const awayFlag = live.awayTeam?.flag ?? null

  return (
    <div className="live-focus-wrap">
      {/* ── Hero ─────────────────────────────── */}
      <div className="live-hero">
        <div className="hero-top">
          <span className="live-dot">●</span>
          <span className="live-label">LIVE</span>
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

          <div className="hero-scoreboard">
            <span className="hero-score">{live.homeScore ?? 0}</span>
            <span className="hero-sep">–</span>
            <span className="hero-score">{live.awayScore ?? 0}</span>
          </div>

          <div className="hero-team hero-team-right">
            <span className="hero-name">{awayName}</span>
            {awayFlag && <img src={awayFlag} alt="" className="hero-flag" />}
          </div>
        </div>

        {capabilities?.scorers && <GoalScorers match={live} size="hero" />}
        {capabilities?.shootout && <Shootout match={live} size="lg" />}
      </div>

      {/* ── Full bracket below ───────────────── */}
      <Bracket allMatches={allMatches} highlightId={live.id} />
    </div>
  )
}
