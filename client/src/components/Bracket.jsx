import { useCallback, useRef, useEffect, useMemo } from 'react'
import MatchCard from './MatchCard'
import { isInProgress } from '../matchStatus'
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

export default function Bracket({ allMatches, onLiveRef, highlightId }) {
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

        return (
          <section
            key={key}
            ref={isFocus ? focusRef : null}
            className={`round-section${isFocus ? ' round-current' : ''}`}
          >
            <div className="round-head">
              <span className="round-name">{label}</span>
              {isFocus && isInProgress(matches.find(isInProgress)) && (
                <span className="round-badge">NOW</span>
              )}
            </div>

            <div className="round-cards">
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
          </section>
        )
      })}
    </div>
  )
}
