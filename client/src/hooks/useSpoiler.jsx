import { createContext, useContext, useCallback, useMemo, useState } from 'react'

// Spoiler settings: an opt-in, remembered preference (results shown by default).
// Mirrors TimezoneProvider — persisted to localStorage so a returning visitor
// keeps their choice. Three modes:
//   'off'   — show everything normally (default).
//   'delay' — show results, but only `delaySeconds` after first observed. The
//             actual time-shift mechanism is not implemented yet (pending an
//             architecture pass); for now 'delay' behaves like 'off'.
//   'hide'  — hide result-revealing UI (scores, live badges, the finished
//             label, winner trophies, goal scorers) while fixtures and
//             kickoff times stay — see shouldHideResult() and its consumers.
// `spoilerFree` is kept as a derived boolean (true only in 'hide' mode) so
// existing consumers that just gate on it need no changes.
const MODE_KEY = 'bracket:spoilerMode'
const DELAY_KEY = 'bracket:spoilerDelay'
const DEFAULT_DELAY = 30
const MODES = ['off', 'delay', 'hide']

const SpoilerContext = createContext(null)

export function SpoilerProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try {
      const stored = localStorage.getItem(MODE_KEY)
      return MODES.includes(stored) ? stored : 'off'
    } catch {
      return 'off'
    }
  })
  const [delaySeconds, setDelaySecondsState] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(DELAY_KEY))
      return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_DELAY
    } catch {
      return DEFAULT_DELAY
    }
  })

  const setMode = useCallback(next => {
    setModeState(next)
    try { localStorage.setItem(MODE_KEY, next) } catch { /* private browsing */ }
  }, [])

  const setDelaySeconds = useCallback(next => {
    setDelaySecondsState(next)
    try { localStorage.setItem(DELAY_KEY, String(next)) } catch { /* private browsing */ }
  }, [])

  const value = useMemo(
    () => ({ mode, delaySeconds, setMode, setDelaySeconds, spoilerFree: mode === 'hide' }),
    [mode, delaySeconds, setMode, setDelaySeconds]
  )
  return <SpoilerContext.Provider value={value}>{children}</SpoilerContext.Provider>
}

export function useSpoiler() {
  const ctx = useContext(SpoilerContext)
  // Tolerant default so components can render outside the provider (e.g. tests,
  // the loading shell) without throwing.
  return ctx ?? {
    mode: 'off', delaySeconds: DEFAULT_DELAY,
    setMode: () => {}, setDelaySeconds: () => {}, spoilerFree: false,
  }
}
