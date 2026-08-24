// ─── Copas continentales (tipo Champions) ──────────────────────────
// Motor genérico reusado por las 3 copas continentales (Europa/Sudamérica/
// Norteamérica) y por la fase de grupos previa al Mundial de Clubes — nada
// acá sabe de continentes, solo recibe una lista de clubes y arma grupos de
// 4 → eliminación directa. La cantidad de grupos sale de la cantidad de
// equipos (teamIds.length / 4), no está hardcodeada.
import { WORLD_CLUBS, WORLD_LEAGUES } from '../data/worldData.js'
import { simulateMixedMatch, attributeMatchGoals } from './sim.js'

// Deterministic shuffle using a seed (so the same season = same draw)
function seededShuffle(arr, seed) {
  const a = [...arr]
  let s = seed
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pick the qualifying clubs for a continental cup: top clubs by prestige from
// tier-1 leagues of `countryIds`, max `maxPerCountry` per country, trimmed to
// `targetSize` (rounded down to a multiple of 4 — groups need to be full).
// `extraCandidates` lets a caller mix in clubs that don't live in WORLD_CLUBS
// (e.g. Argentina's real squad-bearing clubs for the Sudamérica cup) — each
// entry just needs `.id`, `.countryId`, `.prestige`.
export function selectContinentalCupTeams(countryIds, targetSize, maxPerCountry, extraCandidates = []) {
  const tier1LeagueIds = WORLD_LEAGUES
    .filter(l => l.tier === 1 && countryIds.includes(l.countryId))
    .map(l => l.id)
  const byCountry = {}
  const addCandidate = c => {
    if (!countryIds.includes(c.countryId)) return
    if (!byCountry[c.countryId]) byCountry[c.countryId] = []
    byCountry[c.countryId].push(c)
  }
  WORLD_CLUBS.forEach(c => { if (tier1LeagueIds.includes(c.leagueId)) addCandidate(c) })
  extraCandidates.forEach(addCandidate)

  const pool = []
  Object.values(byCountry).forEach(countryClubs => {
    const top = [...countryClubs].sort((a, b) => (b.prestige || 0) - (a.prestige || 0)).slice(0, maxPerCountry)
    pool.push(...top)
  })
  const sorted = pool.sort((a, b) => (b.prestige || 0) - (a.prestige || 0)).slice(0, targetSize)
  const groupFriendlyCount = Math.floor(sorted.length / 4) * 4
  return sorted.slice(0, groupFriendlyCount).map(c => c.id)
}

// Draw groups of 4 — the number of groups comes from teamIds.length, not a
// fixed constant, so the same function serves every continental cup size.
export function drawGroups(teamIds, seed) {
  const shuffled = seededShuffle(teamIds, seed)
  const groupCount = Math.floor(shuffled.length / 4)
  const groups = []
  for (let g = 0; g < groupCount; g++) {
    groups.push({
      letter: String.fromCharCode(65 + g), // A..H (máx. 8 grupos hoy, sobra rango)
      clubIds: shuffled.slice(g * 4, g * 4 + 4),
      table: shuffled.slice(g * 4, g * 4 + 4).map(id => ({
        clubId: id, pts: 0, gf: 0, ga: 0, played: 0,
      })),
    })
  }
  return groups
}

// Fixed round-robin pattern for a group of 4 (indices into group.clubIds),
// 3 matchdays covering all 6 pairings exactly once.
const GROUP_ROUND_PAIRS = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[0, 3], [1, 2]],
]

// Fixtures for a single group matchday (0, 1 or 2)
export function getGroupMatchdayFixtures(group, mdIndex) {
  const pairs = GROUP_ROUND_PAIRS[mdIndex]
  if (!pairs) return []
  return pairs.map(([i, j]) => ({ homeId: group.clubIds[i], awayId: group.clubIds[j] }))
}

// Simulate only ONE group matchday across all groups, updating tables incrementally.
// clubById lets callers pass the player's real squad-bearing club (falls back to
// static WORLD_CLUBS strength for everyone else via simulateMixedMatch).
// playerOverride — { clubId, homeGoals, awayGoals, homeScorers, awayScorers } — lets
// the store substitute an already-played (live or otherwise decided) result for the
// ONE fixture involving the player's club, without touching any other fixture this
// matchday (those still go through simulateMixedMatch as always).
export function simulateGroupMatchday(groups, mdIndex, clubById, playerOverride = null) {
  const results = []
  const newGroups = groups.map(group => {
    const table = group.table.map(t => ({ ...t }))
    const fixtures = getGroupMatchdayFixtures(group, mdIndex)
    fixtures.forEach(({ homeId, awayId }) => {
      const home = clubById[homeId]
      const away = clubById[awayId]
      if (!home || !away) return
      const isPlayerFixture = playerOverride && (homeId === playerOverride.clubId || awayId === playerOverride.clubId)
      const res = isPlayerFixture
        ? { homeGoals: playerOverride.homeGoals, awayGoals: playerOverride.awayGoals }
        : simulateMixedMatch(home, away)
      const { homeScorers, awayScorers } = isPlayerFixture
        ? { homeScorers: playerOverride.homeScorers || [], awayScorers: playerOverride.awayScorers || [] }
        : attributeMatchGoals(home, away, res.homeGoals, res.awayGoals)
      const hRow = table.find(t => t.clubId === homeId)
      const aRow = table.find(t => t.clubId === awayId)
      hRow.gf += res.homeGoals; hRow.ga += res.awayGoals; hRow.played++
      aRow.gf += res.awayGoals; aRow.ga += res.homeGoals; aRow.played++
      if (res.homeGoals > res.awayGoals) hRow.pts += 3
      else if (res.homeGoals < res.awayGoals) aRow.pts += 3
      else { hRow.pts++; aRow.pts++ }
      results.push({
        groupLetter: group.letter,
        homeId, awayId,
        homeGoals: res.homeGoals, awayGoals: res.awayGoals,
        homeScorers, awayScorers,
      })
    })
    table.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
    return { ...group, table }
  })
  return { groups: newGroups, results }
}

// Get the 16 qualifiers (top 2 of each group)
export function getQualifiers(groups) {
  const qualified = []
  groups.forEach(g => {
    qualified.push({ clubId: g.table[0].clubId, seed: 'winner', group: g.letter })
    qualified.push({ clubId: g.table[1].clubId, seed: 'runner', group: g.letter })
  })
  return qualified
}

// Draw the Round-of-16 bracket: pair group winners against runners-up from a
// DIFFERENT group where possible, seeded so the draw is reproducible.
// Returns a flat clubId list ready for simulateKnockoutRound: [w1, r1, w2, r2, ...]
export function drawKnockoutBracket(qualifiers, seed) {
  const winners = seededShuffle(qualifiers.filter(q => q.seed === 'winner'), seed)
  const runnerPool = seededShuffle(qualifiers.filter(q => q.seed === 'runner'), seed + 1)
  const pairs = []
  winners.forEach(w => {
    let idx = runnerPool.findIndex(r => r.group !== w.group)
    if (idx === -1) idx = 0
    const [r] = runnerPool.splice(idx, 1)
    pairs.push(w.clubId, r.clubId)
  })
  return pairs
}

// Single knockout round: pairs play, winner advances (higher strength wins ties via extra time sim).
// clubById lets callers pass the player's real squad-bearing club. playerOverride —
// same shape as in simulateGroupMatchday — substitutes the result for the ONE tie
// involving the player's club; a drawn override still falls back to the same
// strength-based tiebreak used for every AI-vs-AI tie (no penalty shootout yet).
export function simulateKnockoutRound(clubIds, clubById, playerOverride = null) {
  const winners = []
  const ties = []
  for (let i = 0; i < clubIds.length; i += 2) {
    const a = clubById[clubIds[i]]
    const b = clubById[clubIds[i + 1]]
    if (!a || !b) { winners.push(clubIds[i]); continue }
    const isPlayerFixture = playerOverride && (a.id === playerOverride.clubId || b.id === playerOverride.clubId)
    const res = isPlayerFixture
      ? { homeGoals: playerOverride.homeGoals, awayGoals: playerOverride.awayGoals }
      : simulateMixedMatch(a, b)
    const { homeScorers, awayScorers } = isPlayerFixture
      ? { homeScorers: playerOverride.homeScorers || [], awayScorers: playerOverride.awayScorers || [] }
      : attributeMatchGoals(a, b, res.homeGoals, res.awayGoals)
    let winner
    if (res.homeGoals > res.awayGoals) winner = a.id
    else if (res.awayGoals > res.homeGoals) winner = b.id
    else winner = (a.strength || 40) >= (b.strength || 40) ? a.id : b.id // decided on strength (penalties)
    winners.push(winner)
    ties.push({ homeId: a.id, awayId: b.id, homeGoals: res.homeGoals, awayGoals: res.awayGoals, winner, homeScorers, awayScorers })
  }
  return { winners, ties }
}
