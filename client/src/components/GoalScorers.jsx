import { goalScorers, matchWinner } from '../matchStatus'
import './GoalScorers.css'

// Goal scorers for a match: home goals on the left, away on the right, a ball
// between them — the classic scoreboard layout. Renders nothing if the feed has
// no scorers yet (so it appears/grows as a live match progresses).
export default function GoalScorers({ match, size }) {
  const goals = goalScorers(match)
  if (!goals) return null

  const winner = matchWinner(match)
  const cls = size === 'hero' ? ' hero' : ' card'

  const side = key => (
    <div className={`gs-side gs-${key}${winner === key ? ' gs-win' : ''}`}>
      {goals[key].map((g, i) => (
        <span key={i} className="gs-goal">
          <span className="gs-name">{g.name}</span>
          {(g.pen || g.own) && (
            <span className="gs-tag">{g.own ? 'OG' : 'P'}</span>
          )}
          {g.minute && <span className="gs-min">{g.minute}&rsquo;</span>}
        </span>
      ))}
    </div>
  )

  return (
    <div className={`goal-scorers${cls}`}>
      {side('home')}
      <span className="gs-ball" aria-hidden="true">⚽</span>
      {side('away')}
    </div>
  )
}
