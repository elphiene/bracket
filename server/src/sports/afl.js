// AFL Finals — the Australian Football League's September finals series.
// ESPN `australian-football/afl`; round codes live in the notes headline
// ("EF1 - …", "QF2 - …", "SF1 - …", "PF2 - …", "GF - …").
//
// The AFL final-8 has a double-chance (QF losers drop to the semis rather than
// being eliminated), so it isn't a pure single-elim tree — we render it as
// rounds-by-week, which the data-driven Bracket handles cleanly. Every match is
// still a single game, so it fits the single-match scope.
import { createEspnTeamEdition } from './espnTeam.js'

// Headline prefix → normalised round. AFL's final-8 runs over four weeks, but
// Week 1 holds two distinct match types we surface as separate sections so the
// double-chance structure is visible: Qualifying Finals (top 4 — losers get a
// second chance) and Elimination Finals (5th–8th — win or out). The Semi-finals
// are where that second chance is played out (QF losers vs EF winners).
function parseRound(headline) {
  const code = /^([A-Z]{2})/.exec(headline ?? '')?.[1]
  switch (code) {
    case 'QF': return { round: 'qf',   label: 'Qualifying Finals',  sort: 1 }
    case 'EF': return { round: 'ef',   label: 'Elimination Finals', sort: 2 }
    case 'SF': return { round: 'sf',   label: 'Semi-finals',        sort: 3 }
    case 'PF': return { round: 'pf',   label: 'Preliminary Finals', sort: 4 }
    case 'GF': return { round: 'gf',   label: 'Grand Final',        sort: 5 }
    default:   return null // home-and-away round or unknown → not a finals match
  }
}

const edition = createEspnTeamEdition({
  slug: 'afl',
  name: 'AFL Finals',
  subtitle: 'Finals Series',
  sport: 'australian football',
  accentColor: '#c8102e', // AFL red
  leaguePath: 'australian-football/afl',
  window: { from: '08-30', to: '10-05' }, // September finals + early-October GF
  scoreNoun: 'points',
  finishedLabel: 'Full time',
  parseRound,
})

export const config = edition.config
export const adapter = edition.adapter
