import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchLiveNow } from '../api'
import { useSpoiler } from '../hooks/useSpoiler'
import './LiveBanner.css'

const POLL_MS = 30_000

// Thin cross-sport ticker: shows every live match across all editions, whatever
// edition you're viewing. Clicking an item routes to that sport's bracket (which
// auto-focuses the live match). Renders nothing when nothing is live. `current`
// is the slug being viewed — its own live matches are hidden to avoid duplicating
// what the page's hero already shows.
export default function LiveBanner({ current }) {
  const navigate = useNavigate()
  const { spoilerFree } = useSpoiler()
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    let timer
    async function poll() {
      try {
        const live = await fetchLiveNow()
        if (!cancelled) setItems(Array.isArray(live) ? live : [])
      } catch {
        if (!cancelled) setItems([])
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS)
    }
    poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const shown = items.filter(it => it.slug !== current)
  if (!shown.length) return null

  // Duplicate the track so the marquee loops seamlessly.
  const track = [...shown, ...shown]

  return (
    <div className="live-banner" role="region" aria-label="Live now">
      <div className="live-banner-track">
        {track.map((it, i) => (
          <button
            key={`${it.slug}-${it.id}-${i}`}
            className="live-banner-item"
            style={{ '--dot': it.accentColor }}
            onClick={() => navigate(`/${it.slug}`)}
            aria-hidden={i >= shown.length ? true : undefined}
            tabIndex={i >= shown.length ? -1 : undefined}
          >
            <span className="live-banner-dot" />
            <span className="live-banner-tag">NOW LIVE</span>
            <span className="live-banner-sport">{it.sportName}</span>
            <span className="live-banner-sep">·</span>
            <span className="live-banner-round">{it.roundLabel}</span>
            <span className="live-banner-sep">·</span>
            <span className="live-banner-teams">{it.home} v {it.away}</span>
            {!spoilerFree && (
              <span className="live-banner-score">{it.homeScore ?? 0}–{it.awayScore ?? 0}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
