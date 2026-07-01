import { useState } from 'react'
import './GroupResults.css'

export default function GroupResults({ groups }) {
  const [open, setOpen] = useState(false)

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
            <div className="groups-grid">
              {groups.map(group => (
            <div key={group.name} className="group-card">
              <div className="group-header">Group {group.name}</div>
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
            </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
