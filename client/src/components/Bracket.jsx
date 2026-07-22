import { useCallback, useRef, useEffect, useMemo, useState } from 'react'
import MatchCard from './MatchCard'
import FocusHero from './FocusHero'
import { isInProgress, isDecided } from '../matchStatus'
import './Bracket.css'

// Which round should be in focus: the live round, else the earliest
// round with an unfinished match, else the last round.
function currentRoundKey(rounds) {
  for (const r of rounds) {
    if (r.matches.some(m => isInProgress(m))) return r.key
  }
  for (const r of rounds) {
    if (r.matches.some(m => !isInProgress(m) && m.status !== 'finished')) return r.key
  }
  return rounds[rounds.length - 1]?.key
}

export default function Bracket({ allMatches, onLiveRef, highlightId, focusHero = false }) {
  // Derive rounds from match data — works for any sport/tournament structure.
  const rounds = useMemo(() => {
    const map = new Map()
    for (const m of allMatches) {
      if (!map.has(m.round)) {
        map.set(m.round, {
          key: m.round,
          label: m.roundLabel,
          sortOrder: m.sortOrder,
          matches: [],
        })
      }
      map.get(m.round).matches.push(m)
    }
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [allMatches])

  const focusKey = currentRoundKey(rounds)

  // Only the focus round is open by default — every other round collapses to
  // a dropdown so the focus round can expand to fill the available screen
  // space. `toggled` flips a round's default open/closed state.
  const [toggled, setToggled] = useState(() => new Set())
  const toggleRound = useCallback(key => {
    setToggled(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const scrollRef = useRef()
  const focusRef = useRef()
  const didInitialScroll = useRef(false)

  useEffect(() => {
    const el = focusRef.current
    if (!el) return
    el.scrollIntoView({
      behavior: didInitialScroll.current ? 'smooth' : 'auto',
      block: 'center',
    })
    didInitialScroll.current = true
  }, [focusKey])

  const handleRef = useCallback(
    (id, el) => { if (el && onLiveRef) onLiveRef(id, el) },
    [onLiveRef]
  )

  return (
    <div className="bracket-scroll" ref={scrollRef}>
      {rounds.map(({ key, label, matches }) => {
        const isFocus = key === focusKey
        // Separate 3rd-place from the final section so they render together
        const mainMatches = matches.filter(m => m.round !== 'third')
        const thirdMatch  = matches.find(m => m.round === 'third')

        const collapsible = !isFocus
        const isOpen = toggled.has(key) ? !isFocus : isFocus
        const HeadTag = collapsible ? 'button' : 'div'

        // A lone decided focus match (typically the Final) renders as a hero
        // scoreboard that fills the space, instead of a small card in a void.
        // Falls back to the card grid for TBD/undecided finals.
        const soleMatch = mainMatches.length === 1 && !thirdMatch ? mainMatches[0] : null
        const useHero = isFocus && focusHero && soleMatch && isDecided(soleMatch)
        const focusCount = mainMatches.length + (thirdMatch ? 1 : 0)

        return (
          <section
            key={key}
            ref={isFocus ? focusRef : null}
            className={`round-section${isFocus ? ' round-current' : ''}${!isOpen ? ' round-collapsed' : ''}`}
          >
            <HeadTag
              className={`round-head${collapsible ? ' round-head-btn' : ''}`}
              {...(collapsible ? { onClick: () => toggleRound(key) } : {})}
            >
              <span className="round-name">{label}</span>
              {isFocus && isInProgress(matches.find(isInProgress)) && (
                <span className="round-badge">NOW</span>
              )}
              {collapsible && <span className="round-chevron">{isOpen ? '▲' : '▼'}</span>}
            </HeadTag>

            {isOpen && (useHero ? (
              <FocusHero match={soleMatch} label={label} />
            ) : (
              <div
                className="round-cards"
                style={isFocus ? { '--focus-count': focusCount } : undefined}
              >
                {mainMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    big={isFocus}
                    accentColor={match.groupColor ?? undefined}
                    highlight={highlightId != null && match.id === String(highlightId)}
                    ref={isInProgress(match) ? el => handleRef(match.id, el) : null}
                  />
                ))}
                {thirdMatch && (
                  <div className="third-wrap">
                    <MatchCard match={thirdMatch} big={isFocus} />
                    <div className="third-label">3rd place</div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
