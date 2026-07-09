import { useState, useEffect, useRef } from 'react'
import { fetchConfig, fetchMatches, fetchGroups } from '../api'
import { isInProgress } from '../matchStatus'

const TTL_LIVE = 30_000
const TTL_IDLE = 60_000   // poll every 60s while idle so a kickoff is caught quickly

const DEFAULT_CONFIG = {
  name: 'Live Brackets',
  subtitle: '',
  sport: '',
  accentColor: '#f7b731',
  hasGroups: false,
  hasThirdPlace: false,
  scoreNoun: 'points',
  finishedLabel: 'Final',
  capabilities: { shootout: false, scorers: false },
}

// Loads and polls one sport's data. Re-initialises whenever `sport` changes
// (config is fetched once per sport, matches/groups poll on a live-aware TTL).
export function useMatches(sport) {
  const [allMatches, setAllMatches] = useState([])
  const [groups, setGroups] = useState([])
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const matchesRef = useRef([])

  const knockoutMatches = allMatches.filter(m => m.round && m.round !== 'group')
  const liveMatches = allMatches.filter(isInProgress)

  useEffect(() => {
    if (!sport) return
    let timer
    let cancelled = false

    async function poll() {
      try {
        const [matches, grps] = await Promise.all([fetchMatches(sport), fetchGroups(sport)])
        if (cancelled) return
        matchesRef.current = matches
        setAllMatches(matches)
        setGroups(grps)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
      if (cancelled) return
      const isLive = matchesRef.current.some(isInProgress)
      timer = setTimeout(poll, isLive ? TTL_LIVE : TTL_IDLE)
    }

    async function init() {
      setLoading(true)
      try {
        const [cfg, matches, grps] = await Promise.all([
          fetchConfig(sport),
          fetchMatches(sport),
          fetchGroups(sport),
        ])
        if (cancelled) return
        matchesRef.current = matches
        setConfig(cfg)
        setAllMatches(matches)
        setGroups(grps)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
      if (cancelled) return
      const isLive = matchesRef.current.some(isInProgress)
      timer = setTimeout(poll, isLive ? TTL_LIVE : TTL_IDLE)
    }

    init()

    // Dev-only: window.dispatchEvent(new Event('bracket:poll')) forces an immediate re-poll
    if (import.meta.env.DEV) {
      const handler = () => { clearTimeout(timer); poll() }
      window.addEventListener('bracket:poll', handler)
      return () => { cancelled = true; clearTimeout(timer); window.removeEventListener('bracket:poll', handler) }
    }

    return () => { cancelled = true; clearTimeout(timer) }
  }, [sport])

  return { allMatches, knockoutMatches, liveMatches, groups, config, loading, error }
}
