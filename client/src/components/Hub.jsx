import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSports, fetchLiveNow, fetchLiveSport } from '../api'
import { useTimezone } from '../hooks/useTimezone'
import { useSpoiler } from '../hooks/useSpoiler'
import { formatKickoff } from '../timeFormat'
import SpoilerToggle from './SpoilerToggle'
import TimezoneSelect from './TimezoneSelect'
import Footer from './Footer'
import './Hub.css'

const POLL_MS = 30_000

const STATUS_LABEL = { live: 'Live', upcoming: 'Upcoming', finished: 'Finished' }

// The hub landing at `/`: a real, bookmarkable home (not a redirect). Shows a
// cross-sport live-now strip and a grid of every edition tagged by state, and
// offers an opt-in "jump to what's live". Respects the remembered spoiler-free
// preference (no live scores, no champion in the finished blurb).
export default function Hub() {
  const navigate = useNavigate()
  const { timezone } = useTimezone()
  const { spoilerFree } = useSpoiler()
  const [sports, setSports] = useState([])
  const [live, setLive] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchSports()
      .then(s => { if (!cancelled) setSports(Array.isArray(s) ? s : []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer
    async function poll() {
      try {
        const l = await fetchLiveNow()
        if (!cancelled) setLive(Array.isArray(l) ? l : [])
      } catch {
        if (!cancelled) setLive([])
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS)
    }
    poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  async function jumpToLive() {
    try {
      const { slug } = await fetchLiveSport()
      if (slug) return navigate(`/${slug}`)
    } catch { /* fall through */ }
    if (sports[0]) navigate(`/${sports[0].slug}`)
  }

  function contextLine(s) {
    if (s.status === 'live') return `${s.round ?? 'In progress'} · ${s.liveCount} live now`
    if (s.status === 'upcoming') return s.startDate ? `Starts ${formatKickoff(s.startDate, timezone)}` : 'Upcoming'
    if (s.status === 'finished') {
      if (spoilerFree) return `${s.round ?? 'Complete'} · result hidden`
      return s.champion ? `Won by ${s.champion}` : 'Completed'
    }
    return ''
  }

  const anyLive = live.length > 0

  return (
    <div className="hub">
      <header className="hub-header">
        <span className="hub-wordmark">LIVE BRACKETS</span>
        <div className="hub-controls">
          <SpoilerToggle />
          <TimezoneSelect />
        </div>
      </header>

      <section className="hub-hero">
        <h1 className="hub-title">Every bracket, live, in one place.</h1>
        <p className="hub-sub">Follow every knockout tournament as it happens — no clutter, no sign-in, no spoilers unless you want them.</p>
        {anyLive && (
          <button className="hub-jump" onClick={jumpToLive}>Jump to what&rsquo;s live &rarr;</button>
        )}
      </section>

      {anyLive && (
        <section className="hub-block">
          <div className="hub-live-label"><span className="hub-live-dot" />LIVE NOW</div>
          <div className="hub-live-list">
            {live.map(it => (
              <button
                key={`${it.slug}-${it.id}`}
                className="hub-live-item"
                onClick={() => navigate(`/${it.slug}`)}
              >
                <span className="hub-live-eyebrow" style={{ color: it.accentColor }}>
                  {it.sportName} · {it.roundLabel}
                </span>
                <span className="hub-live-teams">{it.home} v {it.away}</span>
                {!spoilerFree && (
                  <span className="hub-live-score">{it.homeScore ?? 0}&ndash;{it.awayScore ?? 0}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="hub-block">
        <div className="hub-section-label">Editions</div>
        {loading ? (
          <div className="hub-loading">Loading editions&hellip;</div>
        ) : (
          <div className="hub-grid">
            {sports.map(s => (
              <button
                key={s.slug}
                className="hub-card"
                style={{ '--accent': s.accentColor }}
                onClick={() => navigate(`/${s.slug}`)}
              >
                <span className="hub-card-bar" />
                <span className="hub-card-content">
                  <span className="hub-card-top">
                    <span className="hub-card-eyebrow">{s.sport}</span>
                    {s.status && (
                      <span className={`hub-pill hub-pill-${s.status}`}>
                        {s.status === 'live' && <span className="hub-pill-dot" />}
                        {STATUS_LABEL[s.status]}
                      </span>
                    )}
                  </span>
                  <span className="hub-card-name">{s.name}</span>
                  <span className="hub-card-ctx">{contextLine(s)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}
