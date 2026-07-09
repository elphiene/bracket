import { createContext, useContext } from 'react'

// Makes the active sport's config (capabilities, terminology, labels) available
// to deeply-nested cards without prop-drilling. Mirrors TimezoneProvider.
const ConfigContext = createContext({
  capabilities: { shootout: false, scorers: false },
  scoreNoun: 'points',
  finishedLabel: 'Final',
})

export function ConfigProvider({ config, children }) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  return useContext(ConfigContext)
}
