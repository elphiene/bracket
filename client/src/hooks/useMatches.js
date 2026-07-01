import { useState, useEffect, useRef } from 'react'
import { fetchConfig, fetchMatches, fetchGroups } from '../api'
import { isInProgress } from '../matchStatus'

const TTL_LIVE = 30_000
const TTL_IDLE = 300_000

const DEFAULT_CONFIG = {
  name: 'Live Brackets',
  subtitle: '',
  sport: '',
  accentColor: '#f7b731',
  hasGroups: false,
  hasThirdPlace: false,
}

export function useMatches() {
  const [allMatches, setAllMatches] = useState([])
  const [groups, setGroups] = useState([])
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const matchesRef = useRef([])

  const knockoutMatches = allMatches.filter(m => m.round && m.round !== 'group')
  const liveMatches = allMatches.filter(isInProgress)

  useEffect(() => {
    let timer

    async function poll() {
      try {
        const [matches, grps] = await Promise.all([fetchMatches(), fetchGroups()])
        matchesRef.current = matches
        setAllMatches(matches)
        setGroups(grps)
        setError(null)
      } catch (e) {
        setError(e.message)
      }
      const isLive = matchesRef.current.some(isInProgress)
      timer = setTimeout(poll, isLive ? TTL_LIVE : TTL_IDLE)
    }

    async function init() {
      try {
        const [cfg, matches, grps] = await Promise.all([
          fetchConfig(),
          fetchMatches(),
          fetchGroups(),
        ])
        matchesRef.current = matches
        setConfig(cfg)
        setAllMatches(matches)
        setGroups(grps)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
      const isLive = matchesRef.current.some(isInProgress)
      timer = setTimeout(poll, isLive ? TTL_LIVE : TTL_IDLE)
    }

    init()

    // Dev-only: window.dispatchEvent(new Event('bracket:poll')) forces an immediate re-poll
    if (import.meta.env.DEV) {
      const handler = () => { clearTimeout(timer); poll() }
      window.addEventListener('bracket:poll', handler)
      return () => { clearTimeout(timer); window.removeEventListener('bracket:poll', handler) }
    }

    return () => clearTimeout(timer)
  }, [])

  return { allMatches, knockoutMatches, liveMatches, groups, config, loading, error }
}
