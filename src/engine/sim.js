import { FORMATIONS, FORMATION_SLOTS, POSITION_ROLE, ROLE_PENALTY } from '../data/gameData.js'

// ── Poisson random via Knuth ─────────────────────────────────────────────────
function poissonRandom(lambda) {
  const L = Math.exp(-Math.max(0.1, lambda))
  let p = 1, k = 0
  do { k++; p *= Math.random() } while (p > L)
  return k - 1
}

// ── Position penalty multiplier ──────────────────────────────────────────────
export function getPositionPenalty(playerPos, slotPos) {
  const pr = POSITION_ROLE[playerPos]
  const sr = POSITION_ROLE[slotPos]
  if (!pr || !sr) return 1.0
  return ROLE_PENALTY[pr][sr]
}

// Returns 11 starters with effectiveSkill, skipping injured/suspended players (auto-replaced from bench)
export function getEffectiveStarters(club) {
  const squad = club.squad || []
  if (!squad.length) return []
  const slots = FORMATION_SLOTS[club.formation] || FORMATION_SLOTS['4-4-2']

  const isUnavailable = p => (p.injuredFor || 0) > 0 || (p.suspendedFor || 0) > 0
  const available = squad.filter(p => !isUnavailable(p))

  if (club.starters?.length === 11) {
    const squadMap = Object.fromEntries(squad.map(p => [p.id, p]))
    const starterSet = new Set(club.starters)
    const bench = available
      .filter(p => !starterSet.has(p.id))
      .sort((a, b) => b.skill - a.skill)

    const result = club.starters.map((pid, i) => {
      const p = squadMap[pid]
      if (!p) return null
      if (!isUnavailable(p)) {
        const penalty = getPositionPenalty(p.position, slots[i])
        return { ...p, effectiveSkill: Math.round(p.skill * penalty) }
      }
      // Player unavailable — find best bench replacement for this slot's role
      const slotRole = POSITION_ROLE[slots[i]]
      const sameRoleIdx = bench.findIndex(bp => POSITION_ROLE[bp.position] === slotRole)
      const replIdx = sameRoleIdx !== -1 ? sameRoleIdx : 0
      const replacement = bench[replIdx]
      if (replacement) {
        bench.splice(replIdx, 1)
        const penalty = getPositionPenalty(replacement.position, slots[i])
        return { ...replacement, effectiveSkill: Math.round(replacement.skill * penalty) }
      }
      return null
    }).filter(Boolean)

    if (result.length >= 7) return result
  }

  // Fallback: top 11 available by skill, no penalty
  return available
    .sort((a, b) => b.skill - a.skill)
    .slice(0, 11)
    .map(p => ({ ...p, effectiveSkill: p.skill }))
}

// ── Team strength from squad + formation + morale ────────────────────────────
export function calcStrength(club) {
  if (!club?.squad?.length) return 40
  const f = FORMATIONS[club.formation] || FORMATIONS['4-4-2']
  const starters = getEffectiveStarters(club)
  if (!starters.length) return 40
  const avgSkill = starters.reduce((s, p) => s + p.effectiveSkill, 0) / starters.length
  const moraleMult = 0.75 + (club.morale / 100) * 0.4
  return (avgSkill + f.atkBonus * 0.4 + f.defBonus * 0.4) * moraleMult
}

export function calcDefStrength(club) {
  if (!club?.squad?.length) return 40
  const f = FORMATIONS[club.formation] || FORMATIONS['4-4-2']
  const starters = getEffectiveStarters(club)
  if (!starters.length) return 40
  const avgSkill = starters.reduce((s, p) => s + p.effectiveSkill, 0) / starters.length
  const moraleMult = 0.75 + (club.morale / 100) * 0.4
  return (avgSkill + f.defBonus * 0.7) * moraleMult
}

// ── Simulate a single match ──────────────────────────────────────────────────
export function simulateMatch(homeClub, awayClub) {
  const homeAtk = calcStrength(homeClub) * 1.12   // home advantage
  const awayAtk = calcStrength(awayClub)
  const homeDef = calcDefStrength(homeClub) * 1.05
  const awayDef = calcDefStrength(awayClub)

  // Expected goals: base 1.25 ± attacking/defensive diff
  const diff = (homeAtk - awayDef) / 60
  const homeLambda = Math.max(0.25, 1.25 + diff * 1.2)
  const diff2 = (awayAtk - homeDef) / 60
  const awayLambda = Math.max(0.25, 1.05 + diff2 * 1.2)

  return {
    homeGoals: poissonRandom(homeLambda),
    awayGoals: poissonRandom(awayLambda),
  }
}

// ── Round-robin schedule generator ─────────────────────────────────────────
export function generateSchedule(clubIds) {
  const ids = [...clubIds]
  if (ids.length % 2 !== 0) ids.push('bye')
  const n = ids.length
  const rounds = []

  for (let round = 0; round < n - 1; round++) {
    const fixtures = []
    for (let i = 0; i < n / 2; i++) {
      const home = ids[i]
      const away = ids[n - 1 - i]
      if (home !== 'bye' && away !== 'bye') {
        fixtures.push({ homeId: home, awayId: away })
      }
    }
    rounds.push(fixtures)
    // rotate (keep ids[0] fixed)
    ids.splice(1, 0, ids.pop())
  }

  // Return schedule (home + return legs)
  const fullSchedule = [
    ...rounds,
    ...rounds.map(r => r.map(f => ({ homeId: f.awayId, awayId: f.homeId }))),
  ]
  return fullSchedule.map((fixtures, i) =>
    fixtures.map(f => ({ ...f, matchday: i + 1, homeGoals: null, awayGoals: null }))
  )
}

// ── Standings calculation ─────────────────────────────────────────────────────
export function calcStandings(clubIds, allMatches) {
  const table = {}
  clubIds.forEach(id => {
    table[id] = { clubId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }
  })

  allMatches.flat().forEach(m => {
    if (m.homeGoals === null) return
    const h = table[m.homeId]
    const a = table[m.awayId]
    if (!h || !a) return
    h.played++; h.gf += m.homeGoals; h.ga += m.awayGoals
    a.played++; a.gf += m.awayGoals; a.ga += m.homeGoals
    if (m.homeGoals > m.awayGoals) { h.won++; h.points += 3; a.lost++ }
    else if (m.homeGoals < m.awayGoals) { a.won++; a.points += 3; h.lost++ }
    else { h.drawn++; h.points++; a.drawn++; a.points++ }
  })

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.gf - a.ga, gdB = b.gf - b.ga
    if (gdB !== gdA) return gdB - gdA
    return b.gf - a.gf
  })
}

// ── Lightweight match sim (world leagues, no squad) ──────────────────────────
export function simulateLightweightMatch(homeClub, awayClub) {
  const homeStr = (homeClub.strength || 40) * 1.08
  const awayStr = awayClub.strength || 40
  const diff = (homeStr - awayStr) / 50
  const homeLambda = Math.max(0.2, 1.15 + diff * 1.1)
  const awayLambda = Math.max(0.2, 1.0  - diff * 1.1)
  return {
    homeGoals: poissonRandom(homeLambda),
    awayGoals: poissonRandom(awayLambda),
  }
}

// Deterministic round-robin fixture list for a given matchday (0-indexed)
// Returns array of { homeId, awayId } — no goals, just pairings
export function getLightweightFixtures(clubIds, matchdayIndex) {
  const ids = [...clubIds]
  if (ids.length % 2 !== 0) ids.push('bye')
  const n = ids.length
  const totalRounds = (n - 1) * 2  // home + away legs

  const round = matchdayIndex % totalRounds
  const isReturnLeg = round >= n - 1
  const baseRound = isReturnLeg ? round - (n - 1) : round

  // Rotate for baseRound
  const rotated = [ids[0], ...ids.slice(1)]
  for (let r = 0; r < baseRound; r++) {
    rotated.splice(1, 0, rotated.pop())
  }

  const fixtures = []
  for (let i = 0; i < n / 2; i++) {
    const a = rotated[i]
    const b = rotated[n - 1 - i]
    if (a === 'bye' || b === 'bye') continue
    fixtures.push(isReturnLeg ? { homeId: b, awayId: a } : { homeId: a, awayId: b })
  }
  return fixtures
}

// ── Rep delta per match ───────────────────────────────────────────────────────
export function calcRepDelta(playerTeamId, homeId, homeGoals, awayGoals, homeStrength, awayStrength) {
  const isHome = playerTeamId === homeId
  const playerGoals  = isHome ? homeGoals  : awayGoals
  const opponentGoals = isHome ? awayGoals : homeGoals
  const playerStr    = isHome ? homeStrength : awayStrength
  const opponentStr  = isHome ? awayStrength : homeStrength

  const strengthDiff = playerStr - opponentStr
  let expected = 'draw'
  if (strengthDiff > 12) expected = 'win'
  else if (strengthDiff < -12) expected = 'loss'

  let result = 'draw'
  if (playerGoals > opponentGoals) result = 'win'
  else if (playerGoals < opponentGoals) result = 'loss'

  const table = {
    win:  { win:  2, draw:  4, loss:  9 },
    draw: { win: -1, draw:  1, loss:  4 },
    loss: { win: -6, draw: -2, loss:  0 },
  }
  return table[result][expected]
}

// ── Board confidence delta per match ─────────────────────────────────────────
export function calcConfidenceDelta(playerGoals, opponentGoals) {
  if (playerGoals > opponentGoals) return 10
  if (playerGoals === opponentGoals) return 3
  return -14
}

// ── Season end: check objective met ─────────────────────────────────────────
export function checkObjective(position, objective) {
  const { type, target } = objective
  if (type === 'champion') return position === 1
  if (type === 'top')      return position <= target
  if (type === 'promote')  return position <= target
  if (type === 'survive')  return position <= target
  return false
}

export function objectiveRepBonus(met, objective) {
  const { type } = objective
  const bonuses = {
    champion: { met: 20, failed: -15 },
    promote:  { met: 15, failed: -10 },
    top:      { met: 10, failed: -6  },
    survive:  { met: 5,  failed: -8  },
  }
  const b = bonuses[type] || { met: 5, failed: -5 }
  return met ? b.met : b.failed
}

// ── Mixed match sim (one club with squad, one world club with strength only) ──
export function simulateMixedMatch(homeClub, awayClub) {
  const homeAtk = (homeClub.squad?.length > 0 ? calcStrength(homeClub) : (homeClub.strength || 40)) * 1.12
  const awayAtk = awayClub.squad?.length > 0 ? calcStrength(awayClub) : (awayClub.strength || 40)
  const homeDef = homeClub.squad?.length > 0 ? calcDefStrength(homeClub) * 1.05 : (homeClub.strength || 40) * 0.9
  const awayDef = awayClub.squad?.length > 0 ? calcDefStrength(awayClub) : (awayClub.strength || 40) * 0.9
  const diff  = (homeAtk - awayDef) / 60
  const diff2 = (awayAtk - homeDef) / 60
  return {
    homeGoals: poissonRandom(Math.max(0.25, 1.25 + diff  * 1.2)),
    awayGoals: poissonRandom(Math.max(0.25, 1.05 + diff2 * 1.2)),
  }
}

// ── Injury / card / suspension helpers ───────────────────────────────────────

// Decrement injury and suspension counters (call once per jornada for the player's club)
export function tickDownStatus(squad) {
  return squad.map(p => ({
    ...p,
    injuredFor: Math.max(0, (p.injuredFor || 0) - 1),
    suspendedFor: Math.max(0, (p.suspendedFor || 0) - 1),
  }))
}

// Generate match events (injuries, yellows, reds) for the 11 starters who played
export function generateMatchEvents(starters) {
  const injuries = []
  const yellows = []
  const reds = []
  starters.forEach(player => {
    // Injury: 3.5% per starter
    if (Math.random() < 0.035) {
      const r = Math.random()
      const matchdays = r < 0.60 ? 1 + Math.floor(Math.random() * 2)   // 1-2 short
        : r < 0.90 ? 3 + Math.floor(Math.random() * 2)                   // 3-4 medium
        : 5 + Math.floor(Math.random() * 4)                               // 5-8 long
      injuries.push({ playerId: player.id, matchdays })
    }
    // Red card: 0.8%; yellow: 8% (only if no red)
    if (Math.random() < 0.008) {
      reds.push({ playerId: player.id, matchdays: Math.random() < 0.10 ? 2 : 1 })
    } else if (Math.random() < 0.08) {
      yellows.push({ playerId: player.id })
    }
  })
  return { injuries, yellows, reds }
}

// ── Transfer system ──────────────────────────────────────────────────────────

// Enhanced player value: base (skill²×80) × age multiplier × potential gap bonus
export function calcTransferValue(player) {
  const base = player.skill * player.skill * 80
  const ageMult = player.age <= 22 ? 1.30
    : player.age <= 26 ? 1.10
    : player.age <= 30 ? 1.00
    : player.age <= 32 ? 0.70
    : 0.50
  const potGap = Math.max(0, (player.potential || player.skill) - player.skill)
  const potMult = 1 + potGap * 0.008
  return Math.round(base * ageMult * potMult)
}

// Returns whether a transfer window is open for a given matchday position
export function getTransferWindow(currentMatchday, totalMatchdays) {
  const mid = Math.floor(totalMatchdays / 2)
  if (currentMatchday <= 2) {
    return { open: true, type: 'verano', closesAfterMd: 2, nextOpensAt: null }
  }
  if (currentMatchday >= mid - 1 && currentMatchday <= mid + 1) {
    return { open: true, type: 'invierno', closesAfterMd: mid + 1, nextOpensAt: null }
  }
  const nextOpensAt = currentMatchday < mid - 1 ? mid - 1 : null
  return { open: false, type: null, closesAfterMd: null, nextOpensAt }
}

// Pure AI transfer market: runs once per window. Steps:
//  1. Clubs with surplus (>19 players) release their worst player
//  2. Clubs with budget + small squad sign the best affordable free agent
//  3. 12% chance per AI club to poach a mid-tier player from another AI club
export function runAITransfers(clubs, freeAgents, playerClubId) {
  let updClubs = clubs.map(c => ({ ...c }))
  let updFree = [...freeAgents]
  const log = []
  const isAI = c => c.id !== playerClubId && c.managerId !== 'player'

  // Step 1 — Surplus releases
  updClubs = updClubs.map(club => {
    if (!isAI(club) || club.squad.length <= 19 || Math.random() > 0.65) return club
    const nonGK = club.squad.filter(p => p.position !== 'POR')
    const pool = nonGK.length >= 2 ? nonGK : club.squad
    const toSell = [...pool].sort((a, b) => a.skill - b.skill)[0]
    if (!toSell) return club
    const revenue = Math.round(calcTransferValue(toSell) * 0.5)
    log.push(`${club.name} liberó a ${toSell.name} (${toSell.skill})`)
    updFree = [...updFree, { ...toSell, clubId: null }]
    return {
      ...club,
      budget: club.budget + revenue,
      squad: club.squad.filter(p => p.id !== toSell.id),
      starters: (club.starters || []).filter(id => id !== toSell.id),
    }
  })

  // Step 2 — Sign best affordable free agent
  updClubs = updClubs.map(club => {
    if (!isAI(club) || club.squad.length >= 20 || club.budget < club.prestige * 400) return club
    if (Math.random() > 0.70) return club
    const maxSpend = club.budget * 0.35
    const target = updFree.filter(p => calcTransferValue(p) <= maxSpend).sort((a, b) => b.skill - a.skill)[0]
    if (!target) return club
    const price = calcTransferValue(target)
    log.push(`${club.name} fichó a ${target.name} (${target.position} ${target.skill}) por $${Math.round(price / 1000)}k`)
    updFree = updFree.filter(p => p.id !== target.id)
    return {
      ...club,
      budget: club.budget - price,
      squad: [...club.squad, { ...target, clubId: club.id }],
    }
  })

  // Step 3 — Club-to-club poaching
  const idxOrder = updClubs.map((_, i) => i).sort(() => Math.random() - 0.5)
  for (const buyerIdx of idxOrder) {
    const buyer = updClubs[buyerIdx]
    if (!isAI(buyer) || Math.random() > 0.12 || buyer.budget < buyer.prestige * 600) continue
    const sellers = updClubs.map((c, i) => [c, i]).filter(([c, i]) => i !== buyerIdx && isAI(c) && c.squad.length > 15)
    if (!sellers.length) continue
    const [seller, sellerIdx] = sellers[Math.floor(Math.random() * sellers.length)]
    const bySkill = [...seller.squad].sort((a, b) => b.skill - a.skill)
    const lo = Math.min(4, bySkill.length - 1)
    const hi = Math.min(10, bySkill.length - 1)
    if (lo > hi) continue
    const target = bySkill[lo + Math.floor(Math.random() * (hi - lo + 1))]
    if (!target) continue
    const value = calcTransferValue(target)
    const ratio = 0.85 + Math.random() * 0.30
    const offer = Math.round(value * ratio)
    if (buyer.budget < offer) continue
    if (ratio < (seller.squad.length > 18 ? 0.82 : 0.92) && Math.random() > 0.30) continue
    log.push(`${buyer.name} fichó a ${target.name} (${target.skill}) de ${seller.name} por $${Math.round(offer / 1000)}k`)
    updClubs[buyerIdx] = { ...buyer, budget: buyer.budget - offer, squad: [...buyer.squad, { ...target, clubId: buyer.id }] }
    updClubs[sellerIdx] = {
      ...seller,
      budget: seller.budget + offer,
      squad: seller.squad.filter(p => p.id !== target.id),
      starters: (seller.starters || []).filter(id => id !== target.id),
    }
  }

  return { updatedClubs: updClubs, updatedFreeAgents: updFree, log }
}

// ── Player development ────────────────────────────────────────────────────────

function hashId(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  return h >>> 0
}

export function assignPotential(player) {
  const r = (hashId(String(player.id)) % 1000) / 1000
  const { age, skill } = player
  const potGap = age <= 21 ? 20 + Math.floor(r * 16)
               : age <= 24 ? 10 + Math.floor(r * 11)
               : age <= 28 ? 3  + Math.floor(r * 8)
               : age <= 30 ? Math.floor(r * 6)
               : 0
  return Math.min(97, skill + potGap)
}

function growthDelta(age, skill, potential) {
  const gap = potential - skill
  const r = Math.random()
  if (age <= 20) return gap > 0 ? Math.min(gap, 2 + Math.floor(r * 3)) : 0
  if (age <= 23) return gap > 0 ? Math.min(gap, 1 + Math.floor(r * 2)) : 0
  if (age <= 28) return (gap > 5 && r < 0.15) ? 1 : 0
  if (age <= 30) return r < 0.6 ? -1 : 0
  if (age <= 33) return -(1 + Math.floor(r * 2))
  return -(2 + Math.floor(r * 2))
}

export function developPlayers(clubs) {
  const develop = p => {
    const potential = p.potential ?? assignPotential(p)
    const delta = growthDelta(p.age, p.skill, potential)
    const newSkill = Math.max(20, Math.min(97, p.skill + delta))
    return { ...p, potential, skill: newSkill, age: p.age + 1, value: Math.floor(newSkill * newSkill * 80) }
  }
  return clubs.map(c => ({ ...c, squad: (c.squad || []).map(develop) }))
}
