// The normalised match shape — the contract between every sport adapter and the
// client. Adapters map their upstream's quirks into THIS shape; the client only
// ever sees this, so it never needs per-sport branches.
//
// This module is documentation only (no runtime code). See wc2026.js and
// tennis.js for two concrete producers of this shape.
//
// A normalised match:
// {
//   id:         string,                       // stable per-match id
//   homeTeam:   { id, name, flag|null },      // "team" = competitor (a country, club, or individual athlete)
//   awayTeam:   { id, name, flag|null },
//   homeScore:  number|null,                  // null until the match starts
//   awayScore:  number|null,                  // score UNIT is per-sport (goals, sets…) — see config.scoreNoun
//   homeSeed:   number|null,                   // OPTIONAL seed/rank (NCAA, NFL); null when the sport has none
//   awaySeed:   number|null,
//   date:       string|null,                  // UTC ISO 8601 kickoff/start time
//   venue:      { name, city }|null,
//   status:     'scheduled'|'live'|'finished',
//   round:      string,                        // grouping key, e.g. 'group','r16','qf','final'
//   roundLabel: string,                        // human label, e.g. 'Round of 16'
//   sortOrder:  number,                        // bracket ordering of rounds
//   group:      string|null,                   // group-stage letter, else null
//   groupColor: string|null,
//   winner:     'home'|'away'|null,            // OPTIONAL explicit winner (e.g. tennis retirement);
//                                              // when absent, matchStatus.js derives it from score
//   // Raw pass-throughs consumed by the client's matchStatus.js. A sport that
//   // has no concept of these simply omits them (or sets them null) and the
//   // corresponding UI (Shootout, GoalScorers) self-suppresses:
//   time_elapsed, finished,
//   home_penalty_score, away_penalty_score,
//   home_penalty_scorers, home_penalty_misses, away_penalty_scorers, away_penalty_misses,
//   home_scorers, away_scorers,
// }

export const NORMALISED_SHAPE = 'see comment above'
