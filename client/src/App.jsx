import { useEffect } from 'react'
import { useMatches } from './hooks/useMatches'
import { TimezoneProvider } from './hooks/useTimezone'
import Bracket from './components/Bracket'
import LiveFocusView from './components/LiveFocusView'
import GroupResults from './components/GroupResults'
import TimezoneSelect from './components/TimezoneSelect'
import './App.css'

export default function App() {
  const { allMatches, knockoutMatches, liveMatches, groups, config, loading, error } = useMatches()

  // Inject tournament accent colour as a CSS variable so all components pick it up.
  useEffect(() => {
    if (config?.accentColor) {
      document.documentElement.style.setProperty('--accent-primary', config.accentColor)
    }
  }, [config?.accentColor])

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading…</div>
      </div>
    )
  }

  return (
    <TimezoneProvider>
      <div className="app">
        <header className="site-header">
          {config.sport && <div className="header-eyebrow">{config.sport.toUpperCase()}</div>}
          <h1 className="header-title">{config.name}</h1>
          {config.subtitle && <div className="header-sub">{config.subtitle}</div>}
          <TimezoneSelect />
        </header>

        {error && <div className="error-banner">API error: {error}</div>}

        <div className="bracket-section">
          {liveMatches.length > 0 ? (
            <LiveFocusView
              allMatches={knockoutMatches}
              liveMatches={liveMatches}
            />
          ) : (
            <Bracket allMatches={knockoutMatches} />
          )}
        </div>

        {config.hasGroups && <GroupResults groups={groups} />}
      </div>
    </TimezoneProvider>
  )
}
