import { useMemo, useState } from 'react'
import { isFinished, matchWinner } from '../matchStatus'
import { useTimezone } from '../hooks/useTimezone'
import { formatKickoff } from '../timeFormat'
import './GroupResults.css'

function GroupFixture({ match, timezone }) {
  const done = isFinished(match)
  const winner = matchWinner(match)
  const dateStr = formatKickoff(match.date, timezone)

  return (
    <div className="fixture-row">
      <div className="fixture-teams">
        <div className={`fixture-team${winner === 'home' ? ' fixture-winner' : ''}`}>
          {match.homeTeam?.flag && <img src={match.homeTeam.flag} alt="" className="flag-sm" />}
          <span className="fixture-name">{match.homeTeam?.name ?? 'TBD'}</span>
          {done && <span className="fixture-score">{match.homeScore ?? 0}</span>}
        </div>
        <div className={`fixture-team${winner === 'away' ? ' fixture-winner' : ''}`}>
          {match.awayTeam?.flag && <img src={match.awayTeam.flag} alt="" className="flag-sm" />}
          <span className="fixture-name">{match.awayTeam?.name ?? 'TBD'}</span>
          {done && <span className="fixture-score">{match.awayScore ?? 0}</span>}
        </div>
      </div>
      {!done && dateStr && <span className="fixture-date">{dateStr}</span>}
    </div>
  )
}

export default function GroupResults({ groups, matches }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('standings')
  const { timezone } = useTimezone()

  const matchesByGroup = useMemo(() => {
    const map = {}
    for (const m of matches ?? []) {
      if (!m.group) continue
      ;(map[m.group] ??= []).push(m)
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    }
    return map
  }, [matches])

  if (!groups?.length) return null

  return (
    <div className="group-results">
      <button className="groups-toggle" onClick={() => setOpen(o => !o)}>
        Group Stage Results {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="groups-overlay" onClick={() => setOpen(false)}>
          <div className="groups-panel" onClick={e => e.stopPropagation()}>
            <div className="groups-panel-head">
              <span>Group Stage Results</span>
              <button
                className="groups-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="view-tabs">
              <button
                className={`view-tab${view === 'standings' ? ' active' : ''}`}
                onClick={() => setView('standings')}
              >
                Standings
              </button>
              <button
                className={`view-tab${view === 'results' ? ' active' : ''}`}
                onClick={() => setView('results')}
              >
                Results
              </button>
            </div>

            <div className="groups-grid">
              {groups.map(group => (
                <div key={group.name} className="group-card">
                  <div className="group-header">Group {group.name}</div>

                  {view === 'standings' ? (
                    <table className="group-table">
                      <thead>
                        <tr>
                          <th className="col-team"></th>
                          <th>P</th>
                          <th>W</th>
                          <th>D</th>
                          <th>L</th>
                          <th>GD</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.teams?.map((t, pos) => {
                          const qualified = pos < 2
                          return (
                            <tr key={t.team_id} className={qualified ? 'qualified' : ''}>
                              <td className="col-team">
                                {t.flag && <img src={t.flag} alt="" className="flag-sm" />}
                                <span className="tname">{t.name ?? `Team ${t.team_id}`}</span>
                              </td>
                              <td>{t.mp}</td>
                              <td>{t.w}</td>
                              <td>{t.d}</td>
                              <td>{t.l}</td>
                              <td>{parseInt(t.gd) > 0 ? `+${t.gd}` : t.gd}</td>
                              <td className="pts">{t.pts}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="group-fixtures">
                      {(matchesByGroup[group.name] ?? []).length > 0 ? (
                        matchesByGroup[group.name].map(m => (
                          <GroupFixture key={m.id} match={m} timezone={timezone} />
                        ))
                      ) : (
                        <div className="fixture-empty">No results yet</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
