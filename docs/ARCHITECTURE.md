# Architecture

## Data flow

```
rezarahiminia API (external)
  → bracket-server (Express proxy + in-memory cache)
    → bracket-client (React, polls /api/matches every 30s live / 5min idle)
```

## Backend (`server/`)

Single responsibility: proxy + cache the upstream API. No DB.

**Endpoints:**
- `GET /api/matches` — all matches, TTL-cached
- `GET /api/live`    — filtered live matches only
- `GET /api/groups`  — group stage results

**Cache:** in-memory object `{ data, fetchedAt }`. TTL switches between 30s (live) and 5min (idle) based on whether any match has status `live`/`in_progress`.

**Status field names:** verify from the actual API response — may differ from the placeholder values in `proxy.js`. Inspect with: `curl https://<upstream>/matches | jq '.[0].status'`

## Frontend (`client/`)

React + Vite. Polls backend (not upstream API directly).

**Components:**
- `App.jsx` — picks view based on live state
- `Bracket.jsx` — full knockout bracket, R32 → Final
- `MatchCard.jsx` — single match tile (teams, score, status badge)
- `LiveFocusView.jsx` — zoomed-in on live match, swap button if >1 live
- `GroupResults.jsx` — completed group stage, collapsible

**Zoom:** CSS `transform: scale() translate()` on the bracket container, animated with `transition`. `MatchCard` ref → `getBoundingClientRect()` → compute translate to centre it.

**Polling:** `useMatches` hook with `setInterval`. Clears on unmount.

## Bracket structure (2026 format)

48 teams → unique format:
- Round of 32 (16 matches) — current stage as of July 1
- Round of 16
- Quarterfinals
- Semifinals
- Third-place playoff
- Final

Bracket is a tree. Each match has `home`, `away`, `score`, `status`, `round`, `matchId`.
TBD teams shown as placeholders (winner of match X).
