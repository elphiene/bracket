import { useEffect, useRef, useState } from 'react'
import { useSpoiler } from '../hooks/useSpoiler'
import './SpoilerToggle.css'

const PRESETS = [5, 10, 20, 30, 60, 90, 120]

function formatDelay(seconds) {
  return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60}m` : `${seconds}s`
}

function EyeIcon() {
  return (
    <svg className="spoiler-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg className="spoiler-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg className="spoiler-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

// Header control for spoiler settings. The eye button opens a small panel with
// three mutually-exclusive modes (show normally / delay / hide) — see
// useSpoiler.jsx. Only 'hide' currently changes what renders; 'delay' captures
// the preference ahead of the time-shift mechanism landing.
export default function SpoilerToggle() {
  const { mode, delaySeconds, setMode, setDelaySeconds } = useSpoiler()
  const [open, setOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const icon = mode === 'hide' ? <EyeOffIcon /> : mode === 'delay' ? <ClockIcon /> : <EyeIcon />
  const label = mode === 'hide' ? 'Spoiler-free' : mode === 'delay' ? `Delay ${formatDelay(delaySeconds)}` : 'Spoilers'

  function choosePreset(seconds) {
    setCustomValue('')
    setDelaySeconds(seconds)
  }
  function chooseCustom(e) {
    const raw = e.target.value
    setCustomValue(raw)
    const n = Math.floor(Number(raw))
    if (Number.isFinite(n) && n > 0) setDelaySeconds(n)
  }

  return (
    <div className="spoiler-root" ref={rootRef}>
      <button
        type="button"
        className={`spoiler-toggle${mode !== 'off' ? ' on' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        title="Spoiler settings"
      >
        {icon}
        <span className="spoiler-label">{label}</span>
      </button>

      {open && (
        <div className="spoiler-panel" role="menu">
          <div className="spoiler-panel-title">Spoiler settings</div>
          <div className="spoiler-panel-sub">Applies across every sport &middot; remembered on this device</div>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === 'off'}
            className={`spoiler-mode${mode === 'off' ? ' active' : ''}`}
            onClick={() => setMode('off')}
          >
            <span className="spoiler-mode-head"><EyeIcon /><span>Show scores normally</span></span>
            <span className="spoiler-mode-desc">No delay, no hiding &mdash; the default.</span>
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === 'delay'}
            className={`spoiler-mode${mode === 'delay' ? ' active' : ''}`}
            onClick={() => setMode('delay')}
          >
            <span className="spoiler-mode-head"><ClockIcon /><span>Delay updates</span></span>
            <span className="spoiler-mode-desc">Scores updating before your TV? Add a delay so nothing spoils before you see it live.</span>

            {mode === 'delay' && (
              <span className="spoiler-delay-controls" onClick={e => e.stopPropagation()}>
                <span className="spoiler-chip-row">
                  {PRESETS.map(s => (
                    <span
                      key={s}
                      role="button"
                      tabIndex={0}
                      className={`spoiler-chip${customValue === '' && delaySeconds === s ? ' sel' : ''}`}
                      onClick={() => choosePreset(s)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choosePreset(s) } }}
                    >
                      {formatDelay(s)}
                    </span>
                  ))}
                </span>
                <span className="spoiler-custom-row">
                  <span>Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    placeholder={`${delaySeconds}`}
                    value={customValue}
                    onChange={chooseCustom}
                  />
                  <span>seconds</span>
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === 'hide'}
            className={`spoiler-mode${mode === 'hide' ? ' active' : ''}`}
            onClick={() => setMode('hide')}
          >
            <span className="spoiler-mode-head"><EyeOffIcon /><span>Hide until I reveal it</span></span>
            <span className="spoiler-mode-desc">Recording it for later? Scores stay hidden &mdash; fixtures and times still show.</span>
          </button>
        </div>
      )}
    </div>
  )
}
