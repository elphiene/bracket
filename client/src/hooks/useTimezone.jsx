import { createContext, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'bracket:timezone'
export const AUTO_TIMEZONE = 'auto'

const TimezoneContext = createContext(null)

export function TimezoneProvider({ children }) {
  const [selection, setSelection] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || AUTO_TIMEZONE
    } catch {
      return AUTO_TIMEZONE
    }
  })

  function setTimezone(value) {
    setSelection(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // localStorage unavailable (private browsing, etc.) — selection still
      // works for the current session, it just won't persist.
    }
  }

  // undefined lets Intl.DateTimeFormat fall back to the runtime's own zone.
  const timezone = selection === AUTO_TIMEZONE ? undefined : selection
  const value = useMemo(() => ({ selection, timezone, setTimezone }), [selection, timezone])

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext)
  if (!ctx) throw new Error('useTimezone must be used within a TimezoneProvider')
  return ctx
}
