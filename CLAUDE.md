# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server (HMR)
npm run build     # production build → dist/
npm run preview   # preview the production build
npm run lint      # ESLint
```

No test suite is configured.

## Architecture

Single-page React app (Vite + Tailwind). All state lives in one Zustand store persisted to `localStorage` under the key `dt-career-save`.

### Data flow

```
src/data/gameData.js   → static constants + procedural generators
src/engine/sim.js      → pure functions (no state): schedule gen, Poisson match sim, standings, rep math
src/store/useGame.js   → single Zustand store; imports from both above; persisted via zustand/middleware persist
src/App.jsx            → screen router (reads screen + activeTab from store)
src/screens/*.jsx      → each tab/screen; reads/writes store only
src/components/*.jsx   → shared UI (Header, BottomNav, MatchReportModal, Toast)
```

### State shape (useGame store)

Key fields on the store:
- `screen` — current route: `'main-menu' | 'unemployed' | 'dashboard' | 'season-end'`
- `activeTab` — `'home' | 'squad' | 'tactics' | 'standings' | 'market'`
- `clubs[]` — every club in the world; each has `{ id, squad[], formation, morale, managerId, budget, leagueId, prestige, ... }`
- `leagues{}` — keyed by leagueId; each has `{ clubIds, schedule[][], currentMatchday, totalMatchdays, completed }`
- `currentJob` — `{ clubId, objective, boardConfidence, salary, contractEndSeason }` or `null`
- `coach` — player stats (`reputation`, `money`, `jobHistory`, `trophies`, ...)
- `freeAgents[]` — players not under contract

### Simulation engine (`src/engine/sim.js`)

`simulateMatch(homeClub, awayClub)` is the core: it derives `calcStrength` and `calcDefStrength` from the club's top-11 by skill + formation bonuses + morale multiplier, then feeds those into Poisson random goal generation. **Formation bonuses** come from `FORMATIONS` in `gameData.js` (`atkBonus`, `defBonus`).

Currently `calcStrength` picks the 11 highest-skill players regardless of position. Any lineup/position editor feature must update this function to use `club.starters` instead of `sorted.slice(0,11)` and apply position-mismatch penalties.

### Formations & positions

- 5 formations defined in `FORMATIONS` (`gameData.js`): `4-4-2`, `4-3-3`, `4-2-3-1`, `3-5-2`, `5-3-2`
- 9 positions: `POR`, `CAR`, `LD`, `LI`, `MCD`, `MCC`, `MCO`, `EXT`, `DEL`
- `POSITIONS_BY_ROLE` maps formation roles (`gk/def/mid/fwd`) to valid positions
- `FORMATION_VISUALS` in `TacticsScreen.jsx` maps each formation to a row-by-row pitch layout (used to render the field view)

### UI conventions

- Mobile-first; max-width 480px centered (`#root` in `index.css`)
- Color palette: `pitch-*` (dark greens), `gold-400` accents, position colors consistent across screens (`POR=#f59e0b`, `CAR/LD/LI=#3b82f6`, mids=greens, `DEL=#ef4444`)
- Screens use `px-4 py-4 pb-24` padding (pb-24 clears the fixed BottomNav)
- Fixed bottom bar pattern: `className="form-bar"` from `index.css`
- Tailwind only — no CSS modules, no styled-components
