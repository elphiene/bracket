import { useMemo } from 'react'
import { useTimezone, AUTO_TIMEZONE } from '../hooks/useTimezone'
import { browserTimezone, listTimezones } from '../timeFormat'
import './TimezoneSelect.css'

export default function TimezoneSelect() {
  const { selection, setTimezone } = useTimezone()
  const zones = useMemo(() => listTimezones(), [])
  const detected = useMemo(() => browserTimezone(), [])

  return (
    <select
      className="tz-select"
      value={selection}
      onChange={e => setTimezone(e.target.value)}
      aria-label="Display kickoff times in"
      title="Display kickoff times in"
    >
      <option value={AUTO_TIMEZONE}>Local time ({detected})</option>
      {zones.map(z => (
        <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
      ))}
    </select>
  )
}
