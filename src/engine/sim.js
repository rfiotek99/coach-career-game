import { FORMATIONS, FORMATION_SLOTS, POSITION_ROLE, ROLE_PENALTY, assignInitialContract } from '../data/gameData.js'
import { DEFAULT_TACTICS, MENTALITY_MODS, PRESSING_MODS, TEMPO_MODS, TRAINING_MODS, attackChannelMods } from '../data/tactics.js'

// ── Poisson random via Knuth ─────────────────────────────────────────────────
export function poissonRandom(lambda) {
  const L = Math.exp(-lambda)
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

// ── Individual player morale multiplier ──────────────────────────────────────
// Small, bounded (±6%) effect on a single player's effectiveSkill. Default
// morale (70, set at squad generation) yields ~1.024 — a uniform bump applied
// to every untouched player on both sides, so it doesn't shift existing
// balance; only deviations from that baseline (via life events) matter.
export function moraleMultiplier(morale) {
  return 0.94 + ((morale ?? 70) / 100) * 0.12
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
        return { ...p, effectiveSkill: Math.round(p.skill * penalty * moraleMultiplier(p.morale)) }
      }
      // Player unavailable — find best bench replacement for this slot's role
      const slotRole = POSITION_ROLE[slots[i]]
      const sameRoleIdx = bench.findIndex(bp => POSITION_ROLE[bp.position] === slotRole)
      const replIdx = sameRoleIdx !== -1 ? sameRoleIdx : 0
      const replacement = bench[replIdx]
      if (replacement) {
        bench.splice(replIdx, 1)
        const penalty = getPositionPenalty(replacement.position, slots[i])
        return { ...replacement, effectiveSkill: Math.round(replacement.skill * penalty * moraleMultiplier(replacement.morale)) }
      }
      return null
    }).filter(Boolean)

    if (result.length >= 7) return result
  }

  // Fallback: top 11 available by skill, no position penalty
  return available
    .sort((a, b) => b.skill - a.skill)
    .slice(0, 11)
    .map(p => ({ ...p, effectiveSkill: Math.round(p.skill * moraleMultiplier(p.morale)) }))
}

// ── Goal / assist attribution ─────────────────────────────────────────────────
// Post-hoc: se llama DESPUÉS de que homeGoals/awayGoals ya están decididos
// (Poisson). Nunca cambia el marcador — solo reparte los goles que ya existen
// entre los titulares. getEffectiveStarters() no usa Math.random(), así que
// llamarla acá no interfiere con la secuencia de sorteo del resultado.
const GOAL_POSITION_WEIGHT = { DEL: 10, EXT: 5, MCO: 4, MCC: 1.5, MCD: 0.8, LD: 0.5, LI: 0.5, CAR: 0.35, POR: 0.03 }
const ASSIST_POSITION_WEIGHT = { MCO: 9, EXT: 7, MCC: 5, MCD: 2.5, LD: 2, LI: 2, CAR: 0.8, DEL: 2, POR: 0.05 }
const NO_ASSIST_CHANCE = 0.25

function weightedPlayerPick(players, weightTable, excludeId = null) {
  const pool = excludeId != null ? players.filter(p => p.id !== excludeId) : players
  if (!pool.length) return null
  const weights = pool.map(p => (weightTable[p.position] ?? 1) * Math.max(1, p.skill ?? 50))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return pool[Math.floor(Math.random() * pool.length)]
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

export function pickGoalScorer(players) {
  return weightedPlayerPick(players, GOAL_POSITION_WEIGHT)
}

export function pickAssist(players, scorerId) {
  if (!players || players.length < 2 || Math.random() < NO_ASSIST_CHANCE) return null
  return weightedPlayerPick(players, ASSIST_POSITION_WEIGHT, scorerId)
}

// Reparte `goalCount` goles entre `players` (típicamente los titulares
// efectivos de un equipo) — no decide el marcador, solo lo atribuye.
// Devuelve [{ scorerId, scorerName, assistId, assistName }], siempre de
// longitud === goalCount (o menos solo si `players` está vacío).
export function assignGoalScorers(players, goalCount) {
  if (!players?.length || goalCount <= 0) return []
  const events = []
  for (let i = 0; i < goalCount; i++) {
    const scorer = pickGoalScorer(players)
    if (!scorer) continue
    const assist = pickAssist(players, scorer.id)
    events.push({
      scorerId: scorer.id, scorerName: scorer.name,
      assistId: assist?.id || null, assistName: assist?.name || null,
    })
  }
  return events
}

// Atribución para el camino rápido — usa los mismos titulares efectivos que
// ya decidieron la fuerza del equipo (calcStrength/calcDefStrength). No-op
// gratis para un club sin plantel real (rival "de mundo" solo con .strength).
export function attributeMatchGoals(homeClub, awayClub, homeGoals, awayGoals) {
  return {
    homeScorers: assignGoalScorers(getEffectiveStarters(homeClub), homeGoals),
    awayScorers: assignGoalScorers(getEffectiveStarters(awayClub), awayGoals),
  }
}

// ── Team strength from squad + formation + morale + tactics ──────────────────
// club.tactics (Mentalidad/Presión/Ritmo/Ataque) folds in here as extra
// multipliers on top of the existing skill/formation/morale base — same
// insertion point liveMatch.js already used for Mentalidad, just generalized.
// Presión's cross-team term (suppressOppAtk) lives in simulateMatch/
// simulateMixedMatch below, since it needs BOTH clubs' tactics.
export function calcStrength(club) {
  if (!club?.squad?.length) return 40
  const f = FORMATIONS[club.formation] || FORMATIONS['4-4-2']
  const starters = getEffectiveStarters(club)
  if (!starters.length) return 40
  const avgSkill = starters.reduce((s, p) => s + p.effectiveSkill, 0) / starters.length
  // club.morale puede faltar (ej. rival de amistoso resuelto directo desde
  // WORLD_CLUBS, que no trae .morale) — sin el fallback, undefined/100 da
  // NaN y eso hace que poissonRandom(NaN) devuelva 0 siempre (0-0 garantizado).
  // Mismo default que moraleMultiplier() para jugadores individuales arriba.
  const moraleMult = 0.75 + ((club.morale ?? 70) / 100) * 0.4
  const t = club.tactics || DEFAULT_TACTICS
  const channel = attackChannelMods(starters, t.attack)
  const training = TRAINING_MODS[club.trainingFocus?.type] || TRAINING_MODS.ninguno
  const tacticAtk = MENTALITY_MODS[t.mentality].atk * TEMPO_MODS[t.tempo].atk * channel.atk * training.atk
  return (avgSkill + f.atkBonus * 0.4 + f.defBonus * 0.4) * moraleMult * tacticAtk
}

export function calcDefStrength(club) {
  if (!club?.squad?.length) return 40
  const f = FORMATIONS[club.formation] || FORMATIONS['4-4-2']
  const starters = getEffectiveStarters(club)
  if (!starters.length) return 40
  const avgSkill = starters.reduce((s, p) => s + p.effectiveSkill, 0) / starters.length
  const moraleMult = 0.75 + ((club.morale ?? 70) / 100) * 0.4
  const t = club.tactics || DEFAULT_TACTICS
  const channel = attackChannelMods(starters, t.attack)
  const training = TRAINING_MODS[club.trainingFocus?.type] || TRAINING_MODS.ninguno
  const tacticDef = MENTALITY_MODS[t.mentality].def * PRESSING_MODS[t.pressing].ownDef * channel.def * training.def
  return (avgSkill + f.defBonus * 0.7) * moraleMult * tacticDef
}

// ── Simulate a single match ──────────────────────────────────────────────────
export function simulateMatch(homeClub, awayClub) {
  const homePressing = PRESSING_MODS[(homeClub.tactics || DEFAULT_TACTICS).pressing]
  const awayPressing = PRESSING_MODS[(awayClub.tactics || DEFAULT_TACTICS).pressing]
  const homeAtk = calcStrength(homeClub) * 1.12 * awayPressing.suppressOppAtk   // home advantage + rival's press
  const awayAtk = calcStrength(awayClub) * homePressing.suppressOppAtk
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

  // Fila = resultado real, columna = resultado esperado. La reputación SOLO
  // sube cuando superás lo que se esperaba de vos: cumplir exactamente lo
  // previsto (empate esperado/empate, derrota esperada/derrota, y casi también
  // ganar lo que debías ganar) da ~0. Sobrevivir sin dar sorpresas no infla
  // nada; el que se queda corto pierde reputación.
  const table = {
    win:  { win:  0.5, draw:  2, loss:  5 },
    draw: { win: -2,   draw:  0, loss:  2 },
    loss: { win: -4,   draw: -2, loss:  0 },
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
  // Los logros ambiciosos (campeón, ascenso) pegan fuerte; "mantener categoría"
  // cumplido no suma nada (es el piso, no un logro) pero descender castiga.
  const bonuses = {
    champion: { met: 16, failed: -6 },
    promote:  { met: 12, failed: -5 },
    top:      { met: 4,  failed: -4 },
    survive:  { met: 0,  failed: -8 },
  }
  const b = bonuses[type] || { met: 2, failed: -3 }
  return met ? b.met : b.failed
}

// ── Mixed match sim (one club with squad, one world club with strength only) ──
export function simulateMixedMatch(homeClub, awayClub) {
  const homePressing = PRESSING_MODS[(homeClub.tactics || DEFAULT_TACTICS).pressing]
  const awayPressing = PRESSING_MODS[(awayClub.tactics || DEFAULT_TACTICS).pressing]
  const homeAtk = (homeClub.squad?.length > 0 ? calcStrength(homeClub) : (homeClub.strength || 40)) * 1.12 * awayPressing.suppressOppAtk
  const awayAtk = (awayClub.squad?.length > 0 ? calcStrength(awayClub) : (awayClub.strength || 40)) * homePressing.suppressOppAtk
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
// tactics: club.tactics (opcional) — Ritmo escala la tasa de lesión (más
// vertiginoso, más riesgo), Presión escala la tasa de tarjetas (más presión,
// juego más físico). injuryMultExtra (opcional, default 1): factor extra sobre
// la tasa de lesión — hoy solo lo usa el foco de entrenamiento "Físico"
// (0.8, ver useGame.js). Sin 3er argumento se comporta igual que antes.
export function generateMatchEvents(starters, tactics = DEFAULT_TACTICS, injuryMultExtra = 1) {
  const injuryMult = (TEMPO_MODS[tactics.tempo]?.injuryMult ?? 1) * injuryMultExtra
  const cardMult = PRESSING_MODS[tactics.pressing]?.cardMult ?? 1
  const injuries = []
  const yellows = []
  const reds = []
  starters.forEach(player => {
    // Injury: 3.5% per starter (scaled by Ritmo)
    if (Math.random() < 0.035 * injuryMult) {
      const r = Math.random()
      const matchdays = r < 0.60 ? 1 + Math.floor(Math.random() * 2)   // 1-2 short
        : r < 0.90 ? 3 + Math.floor(Math.random() * 2)                   // 3-4 medium
        : 5 + Math.floor(Math.random() * 4)                               // 5-8 long
      injuries.push({ playerId: player.id, matchdays })
    }
    // Red card: 0.8%; yellow: 8% (only if no red) — scaled by Presión
    if (Math.random() < 0.008 * cardMult) {
      reds.push({ playerId: player.id, matchdays: Math.random() < 0.10 ? 2 : 1 })
    } else if (Math.random() < 0.08 * cardMult) {
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

// Deadline for a "vender la próxima ventana" promise — the close of the closest
// window still ahead. Once invierno has already closed there are no more
// windows this season, so the promise just caps at the season end.
export function getNextWindowCloseMatchday(currentMatchday, totalMatchdays) {
  const mid = Math.floor(totalMatchdays / 2)
  if (currentMatchday < mid + 1) return mid + 1
  return totalMatchdays
}

// Pure AI transfer market: runs once per window. Steps:
//  1. Clubs with surplus (>19 players) release their worst player
//  2. Clubs with budget + small squad sign the best affordable free agent
//  3. 12% chance per AI club to poach a mid-tier player from another AI club
// `preferredTargets` — [{ buyerClubId, sellerClubId, playerId }] — pre-announced
// as rumors by the store before the window opens; consumed here first so a
// meaningful share of rumors actually happen (not all — budgets/squads may
// have changed since the rumor was floated). Returns which ones landed via
// `consumedIntentions` so the store can flip each rumor to confirmed/faded.
export function runAITransfers(clubs, freeAgents, playerClubId, preferredTargets = []) {
  let updClubs = clubs.map(c => ({ ...c }))
  let updFree = [...freeAgents]
  const log = []
  const consumedIntentions = []
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

  // Step 2.5 — Rumored intentions get first crack at actually happening
  for (const intent of preferredTargets) {
    const buyerIdx = updClubs.findIndex(c => c.id === intent.buyerClubId)
    const sellerIdx = updClubs.findIndex(c => c.id === intent.sellerClubId)
    if (buyerIdx === -1 || sellerIdx === -1) { consumedIntentions.push({ ...intent, status: 'faded' }); continue }
    const buyer = updClubs[buyerIdx]
    const seller = updClubs[sellerIdx]
    const target = seller.squad.find(p => p.id === intent.playerId)
    if (!isAI(buyer) || !isAI(seller) || !target || seller.squad.length <= 14) {
      consumedIntentions.push({ ...intent, status: 'faded' }); continue
    }
    const value = calcTransferValue(target)
    const ratio = 0.90 + Math.random() * 0.30
    const offer = Math.round(value * ratio)
    if (buyer.budget < offer) { consumedIntentions.push({ ...intent, status: 'faded' }); continue }
    log.push(`${buyer.name} fichó a ${target.name} (${target.skill}) de ${seller.name} por $${Math.round(offer / 1000)}k`)
    updClubs[buyerIdx] = { ...buyer, budget: buyer.budget - offer, squad: [...buyer.squad, { ...target, clubId: buyer.id }] }
    updClubs[sellerIdx] = {
      ...seller,
      budget: seller.budget + offer,
      squad: seller.squad.filter(p => p.id !== target.id),
      starters: (seller.starters || []).filter(id => id !== target.id),
    }
    consumedIntentions.push({ ...intent, status: 'confirmed' })
  }

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

  return { updatedClubs: updClubs, updatedFreeAgents: updFree, log, consumedIntentions }
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

// `myClubId` es el club que el DT dirigió la temporada que termina — el
// único cuyos vencimientos de contrato se resuelven de verdad (jugador
// marcado en `expired`, el llamador lo saca de squad y lo manda a
// freeAgents). El resto de los clubes (IA) se auto-renuevan en silencio para
// no tocar sus planteles ni el pool de agentes libres.
export function developPlayers(clubs, myClubId = null) {
  const develop = p => {
    const potential = p.potential ?? assignPotential(p)
    const delta = growthDelta(p.age, p.skill, potential)
    const newSkill = Math.max(20, Math.min(97, p.skill + delta))
    return { ...p, potential, skill: newSkill, age: p.age + 1, value: Math.floor(newSkill * newSkill * 80) }
  }

  const expired = []
  const expiringSoon = []
  const tickContract = (p, clubId) => {
    if (!p.contract) return p
    const yearsLeft = p.contract.yearsLeft - 1
    if (yearsLeft > 0) {
      if (yearsLeft === 1 && clubId === myClubId) expiringSoon.push({ clubId, playerId: p.id })
      return { ...p, contract: { ...p.contract, yearsLeft } }
    }
    if (clubId === myClubId) {
      expired.push({ clubId, playerId: p.id })
      return p
    }
    return { ...p, contract: assignInitialContract(p) }
  }

  // Misma curva para la cantera (youthSquad) — los juveniles ya son casi
  // todos <=20 años, que es justo el tramo de crecimiento más rápido. La
  // cantera no tiene contrato todavía (se le asigna uno recién al subir al
  // primer equipo), así que no pasa por tickContract.
  const clubsOut = clubs.map(c => ({
    ...c,
    squad: (c.squad || []).map(p => tickContract(develop(p), c.id)),
    youthSquad: (c.youthSquad || []).map(develop),
  }))

  return { clubs: clubsOut, expired, expiringSoon }
}

// Foco de entrenamiento "Juveniles" (pretemporada): le da a cada juvenil un
// empujón puntual, equivalente a un año extra de crecimiento — misma curva
// que el tramo <=20 años de growthDelta, con tope en su potencial.
export function applyYouthCamp(youthSquad) {
  return (youthSquad || []).map(p => {
    const potential = p.potential ?? assignPotential(p)
    const gap = potential - p.skill
    if (gap <= 0) return p
    const bump = Math.min(gap, 2 + Math.floor(Math.random() * 3))
    const newSkill = Math.min(97, p.skill + bump)
    return { ...p, potential, skill: newSkill, value: Math.floor(newSkill * newSkill * 80) }
  })
}
