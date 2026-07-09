import { goalScorers, matchWinner } from '../matchStatus'
import './GoalScorers.css'

// Goal scorers for a match. Two layouts share one component:
//  - hero / card (wide): a scoreboard — home goals left, away right, ball between.
//  - list (narrow: group fixtures, expanded knockout cards): a single full-width
//    column, each goal prefixed with the scoring side's flag so names have room.
// Renders nothing if the feed has no scorers yet (so it grows as a match plays).
export default function GoalScorers({ match, size }) {
  const goals = goalScorers(match)
  if (!goals) return null

  const winner = matchWinner(match)
  const cls = size === 'hero' ? ' hero' : size === 'list' ? ' list' : ' card'
  const withFlag = size === 'list'

  const side = key => {
    const flag = key === 'home' ? match.homeTeam?.flag : match.awayTeam?.flag
    return (
      <div className={`gs-side gs-${key}${winner === key ? ' gs-win' : ''}`}>
        {goals[key].map((g, i) => (
          <span key={i} className="gs-goal">
            {withFlag && flag && <img className="gs-flag" src={flag} alt="" />}
            {g.minute && <span className="gs-min">{g.minute}&rsquo;</span>}
            <span className="gs-name">{g.name}</span>
            {(g.pen || g.own) && (
              <span className="gs-tag">{g.own ? 'OG' : 'P'}</span>
            )}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={`goal-scorers${cls}`}>
      {side('home')}
      <span className="gs-ball" aria-hidden="true">⚽</span>
      {side('away')}
    </div>
  )
}
