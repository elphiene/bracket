import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useMatches } from './hooks/useMatches'
import { TimezoneProvider } from './hooks/useTimezone'
import { ConfigProvider } from './hooks/useConfig'
import { isFinished, isInProgress, isDecided } from './matchStatus'
import Bracket from './components/Bracket'
import LiveFocusView from './components/LiveFocusView'
import UpcomingFocusView from './components/UpcomingFocusView'
import GroupResults from './components/GroupResults'
import TimezoneSelect from './components/TimezoneSelect'
import SportSelect from './components/SportSelect'
import LiveBanner from './components/LiveBanner'
import Footer from './components/Footer'
import './App.css'

export default function App() {
  const { sport } = useParams()
  const { allMatches, knockoutMatches, liveMatches, groups, config, loading, error } = useMatches(sport)
  const groupMatches = allMatches.filter(m => m.round === 'group')

  // The next kicked-off-but-unstarted match(es) with real (non-TBD) teams —
  // more than one if several share the same earliest kickoff slot.
  const nextMatches = useMemo(() => {
    const upcoming = knockoutMatches
      .filter(m => m.date && isDecided(m) && !isInProgress(m) && !isFinished(m))
      .sort((a, b) => a.date.localeCompare(b.date))
    if (!upcoming.length) return []
    const soonest = upcoming[0].date
    return upcoming.filter(m => m.date === soonest)
  }, [knockoutMatches])

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
        <Footer />
      </div>
    )
  }

  return (
    <ConfigProvider config={config}>
      <TimezoneProvider>
        <div className="app">
          <LiveBanner current={sport} />
          <header className="site-header">
            <SportSelect current={sport} />
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
            ) : nextMatches.length > 0 ? (
              <UpcomingFocusView
                allMatches={knockoutMatches}
                nextMatches={nextMatches}
              />
            ) : (
              <Bracket allMatches={knockoutMatches} />
            )}
          </div>

          {config.hasGroups && <GroupResults groups={groups} matches={groupMatches} />}

          <Footer />
        </div>
      </TimezoneProvider>
    </ConfigProvider>
  )
}
