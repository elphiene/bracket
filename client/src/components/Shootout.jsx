import { penaltyShootout, matchWinner } from '../matchStatus'
import './Shootout.css'

// Build the pip list for one side: filled = scored, hollow = missed.
// Order isn't provided by the feed, so scored are shown before missed.
// If only the tally is known (names not yet published), fall back to N filled.
function pips(team) {
  const made = team.scored?.length ?? 0
  const missed = team.missed?.length ?? 0
  if (made + missed === 0) return Array.from({ length: team.score || 0 }, () => true)
  return [...Array(made).fill(true), ...Array(missed).fill(false)]
}

export default function Shootout({ match, size }) {
  const so = penaltyShootout(match)
  if (!so) return null

  const winner = matchWinner(match)

  return (
    <div className={`shootout${size === 'lg' ? ' lg' : ''}`}>
      <span className="so-label">Penalties</span>
      <div className="so-rows">
        {['home', 'away'].map(side => {
          const team = so[side]
          return (
            <div key={side} className={`so-row${winner === side ? ' so-win' : ''}`}>
              <span className="so-pips">
                {pips(team).map((made, i) => (
                  <span key={i} className={`so-pip ${made ? 'so-goal' : 'so-miss'}`} />
                ))}
              </span>
              <span className="so-count">{team.score ?? 0}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
