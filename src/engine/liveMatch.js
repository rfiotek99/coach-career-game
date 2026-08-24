// ─── Partido en vivo ───────────────────────────────────────────────────────
// El resultado base sale de simulateMatch() — la MISMA función Poisson que usa
// "Simular rápido" — y se reparte en minutos al azar. Si el usuario no toca
// nada, el marcador final es exactamente el que hubiera salido en modo rápido
// (misma distribución, no una aproximación). Cuando el jugador hace un cambio
// o cambia de mentalidad, se recalcula la fuerza actual (misma fórmula que
// calcStrength/calcDefStrength) y se vuelve a sortear SOLO lo que falta por
// jugar — las decisiones ajustan el resultado base, no generan goles de la nada.
import { FORMATIONS, FORMATION_SLOTS } from '../data/gameData.js'
import { poissonRandom, getPositionPenalty, simulateMatch, moraleMultiplier, pickGoalScorer, pickAssist } from './sim.js'
import { DEFAULT_TACTICS, MENTALITY_MODS, MENTALITY_LABELS, PRESSING_MODS, TEMPO_MODS, attackChannelMods } from '../data/tactics.js'

export const MAX_SUBS = 5

// Re-exportado para no romper el import existente en LiveMatchScreen.jsx.
export { MENTALITY_LABELS } from '../data/tactics.js'

// Per-minute equivalents of the per-match rates in sim.js's generateMatchEvents
// (3.5% injury / 0.8% red / 8% yellow per starter, spread over 90 minutes).
const INJURY_PER_MIN = 0.035 / 90
const RED_PER_MIN = 0.008 / 90
const YELLOW_PER_MIN = 0.08 / 90

function defaultLineupIds(club) {
  if (!club.squad?.length) return []
  if (club.starters?.length === 11) return [...club.starters]
  return [...club.squad]
    .filter(p => (p.injuredFor || 0) === 0 && (p.suspendedFor || 0) === 0)
    .sort((a, b) => b.skill - a.skill)
    .slice(0, 11)
    .map(p => p.id)
}

// Titulares reales AHORA MISMO en cancha (post-cambios/post-lesión), para
// elegir goleador/asistencia en el momento exacto del gol — no el lineup
// inicial del partido. No-op gratis para un club sin plantel real.
function scorerCandidates(club, lineupIds) {
  if (!club.squad?.length) return []
  const squadMap = Object.fromEntries(club.squad.map(p => [p.id, p]))
  return lineupIds.map(id => (id != null ? squadMap[id] : null)).filter(Boolean)
}

export function getBenchIds(club, lineupIds) {
  if (!club.squad?.length) return []
  const lineupSet = new Set(lineupIds)
  return club.squad
    .filter(p => !lineupSet.has(p.id) && (p.injuredFor || 0) === 0 && (p.suspendedFor || 0) === 0)
    .map(p => p.id)
}

// Picks `count` distinct minutes at random, without replacement, from (from, to].
function pickGoalMinutes(count, from, to) {
  const pool = []
  for (let m = from + 1; m <= to; m++) pool.push(m)
  for (let i = pool.length - 1; i > 0 && count > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).sort((a, b) => a - b)
}

function liveEffectiveStarters(club, lineupIds, fatigue, fatigueMult = 1) {
  const slots = FORMATION_SLOTS[club.formation] || FORMATION_SLOTS['4-4-2']
  const squadMap = Object.fromEntries(club.squad.map(p => [p.id, p]))
  return lineupIds.map((pid, i) => {
    const p = squadMap[pid]
    if (!p) return null
    const posPenalty = getPositionPenalty(p.position, slots[i])
    const mins = fatigue[pid] || 0
    const fatiguePenalty = slots[i] === 'POR' ? 1 : Math.max(0.88, 1 - (mins / 90) * 0.12 * fatigueMult)
    return { position: p.position, effectiveSkill: p.skill * posPenalty * fatiguePenalty * moraleMultiplier(p.morale) }
  }).filter(Boolean)
}

// Same shape as calcStrength/calcDefStrength in sim.js, but driven by an
// ad-hoc live lineup/fatigue instead of the club's saved starters. `tactics`
// is { mentality (live-adjustable), pressing, tempo, attack (fijos para todo
// el partido) } — ver computeLiveLambdas, que arma este objeto por lado.
function liveTeamStrength(club, lineupIds, fatigue, tactics) {
  const mentMod = MENTALITY_MODS[tactics.mentality] || MENTALITY_MODS.equilibrado
  const tempoMod = TEMPO_MODS[tactics.tempo] || TEMPO_MODS.equilibrado
  const pressMod = PRESSING_MODS[tactics.pressing] || PRESSING_MODS.media
  if (!club.squad?.length) {
    const base = club.strength || 40
    return { atk: base * mentMod.atk * tempoMod.atk, def: base * 0.9 * mentMod.def * pressMod.ownDef }
  }
  const f = FORMATIONS[club.formation] || FORMATIONS['4-4-2']
  const starters = liveEffectiveStarters(club, lineupIds, fatigue, tempoMod.fatigueMult)
  if (!starters.length) return { atk: 40 * mentMod.atk * tempoMod.atk, def: 40 * mentMod.def * pressMod.ownDef }
  const avgSkill = starters.reduce((s, p) => s + p.effectiveSkill, 0) / starters.length
  const moraleMult = 0.75 + (club.morale / 100) * 0.4
  const channel = attackChannelMods(starters, tactics.attack)
  // Playing a man down (red card, or an injury with no subs left) is a real
  // handicap beyond just losing that player's contribution to the average.
  const menMissing = Math.max(0, lineupIds.length - starters.length)
  const manDownAtk = Math.max(0.55, 1 - menMissing * 0.15)
  const manDownDef = Math.max(0.60, 1 - menMissing * 0.12)
  return {
    atk: (avgSkill + f.atkBonus * 0.4 + f.defBonus * 0.4) * moraleMult * mentMod.atk * tempoMod.atk * channel.atk * manDownAtk,
    def: (avgSkill + f.defBonus * 0.7) * moraleMult * mentMod.def * pressMod.ownDef * channel.def * manDownDef,
  }
}

// Full-match (90-minute) goal expectation from the CURRENT live state — same
// shape as simulateMatch() in sim.js, just fed by live lineup/fatigue/tactics.
// Presión's cross-team term (mi presión suprime el atq rival) se aplica acá,
// igual que en simulateMatch — necesita AMBOS lados.
function computeLiveLambdas(homeClub, awayClub, state) {
  const homeTactics = { ...state.homeTactics, mentality: state.homeMentality }
  const awayTactics = { ...state.awayTactics, mentality: state.awayMentality }
  const homeS = liveTeamStrength(homeClub, state.homeLineup, state.homeFatigue, homeTactics)
  const awayS = liveTeamStrength(awayClub, state.awayLineup, state.awayFatigue, awayTactics)
  const homeAtk = homeS.atk * 1.12 * PRESSING_MODS[awayTactics.pressing].suppressOppAtk
  const homeDef = homeS.def * 1.05
  const awayAtk = awayS.atk * PRESSING_MODS[homeTactics.pressing].suppressOppAtk
  const awayDef = awayS.def
  const diff = (homeAtk - awayDef) / 60
  const diff2 = (awayAtk - homeDef) / 60
  return {
    home: Math.max(0.25, 1.25 + diff * 1.2),
    away: Math.max(0.25, 1.05 + diff2 * 1.2),
  }
}

// Re-plans the goals for the time remaining, using the current strength —
// goals already scored (minute <= state.minute) are untouched. Called after
// any decision that changes a side's effective strength.
function rescheduleRemaining(state, homeClub, awayClub) {
  if (state.finished) return state
  const lambdas = computeLiveLambdas(homeClub, awayClub, state)
  const remainingFrac = (90 - state.minute) / 90
  const newHomeCount = poissonRandom(lambdas.home * remainingFrac)
  const newAwayCount = poissonRandom(lambdas.away * remainingFrac)
  return {
    ...state,
    goalMinutes: {
      home: pickGoalMinutes(newHomeCount, state.minute, 90),
      away: pickGoalMinutes(newAwayCount, state.minute, 90),
    },
  }
}

export function createLiveMatch(homeClub, awayClub, isPlayerHome) {
  const homeTactics = homeClub.tactics || DEFAULT_TACTICS
  const awayTactics = awayClub.tactics || DEFAULT_TACTICS
  const baseline = simulateMatch(homeClub, awayClub)
  return {
    minute: 0,
    homeGoals: 0, awayGoals: 0,
    goalMinutes: {
      home: pickGoalMinutes(baseline.homeGoals, 0, 90),
      away: pickGoalMinutes(baseline.awayGoals, 0, 90),
    },
    homeLineup: defaultLineupIds(homeClub),
    awayLineup: defaultLineupIds(awayClub),
    homeFatigue: {}, awayFatigue: {},
    // Presión/Ritmo/Ataque quedan fijos para todo el partido (elegidos antes,
    // en TacticsScreen); Mentalidad es el único eje ajustable en vivo, y
    // arranca en lo que ya tenías configurado — no se resetea a "equilibrado".
    homeTactics, awayTactics,
    homeMentality: homeTactics.mentality, awayMentality: awayTactics.mentality,
    playerSide: isPlayerHome ? 'home' : 'away',
    subsUsed: 0,
    events: [{ minute: 0, type: 'kickoff', side: null, text: `¡Arranca el partido! ${homeClub.name} vs ${awayClub.name}` }],
    cardEvents: { injuries: [], yellows: [], reds: [] },
    scorers: [], // [{ side, minute, scorerId, scorerName, assistId, assistName }]
    finished: false,
  }
}

export function simulateLiveMinute(state, homeClub, awayClub) {
  if (state.finished) return state
  const minute = state.minute + 1

  const homeFatigue = { ...state.homeFatigue }
  state.homeLineup.forEach(id => { if (id != null) homeFatigue[id] = (homeFatigue[id] || 0) + 1 })
  const awayFatigue = { ...state.awayFatigue }
  state.awayLineup.forEach(id => { if (id != null) awayFatigue[id] = (awayFatigue[id] || 0) + 1 })

  const events = []
  let homeGoals = state.homeGoals
  let awayGoals = state.awayGoals

  const homeScored = state.goalMinutes.home.includes(minute)
  const awayScored = state.goalMinutes.away.includes(minute)

  // ── Goleador/asistencia — elegido con el lineup ACTUAL (post-cambios/post-
  // lesión), no afecta homeGoals/awayGoals (ya decididos por goalMinutes). ──
  const scorers = [...state.scorers]
  if (homeScored) {
    homeGoals++
    const candidates = scorerCandidates(homeClub, state.homeLineup)
    const scorer = pickGoalScorer(candidates)
    const assist = scorer ? pickAssist(candidates, scorer.id) : null
    if (scorer) {
      scorers.push({ side: 'home', minute, scorerId: scorer.id, scorerName: scorer.name, assistId: assist?.id || null, assistName: assist?.name || null })
    }
    events.push({ minute, type: 'goal', side: 'home', text: `⚽ ¡GOL de ${homeClub.name}${scorer ? ` (${scorer.name})` : ''}! (${homeGoals}-${awayGoals})` })
  }
  if (awayScored) {
    awayGoals++
    const candidates = scorerCandidates(awayClub, state.awayLineup)
    const scorer = pickGoalScorer(candidates)
    const assist = scorer ? pickAssist(candidates, scorer.id) : null
    if (scorer) {
      scorers.push({ side: 'away', minute, scorerId: scorer.id, scorerName: scorer.name, assistId: assist?.id || null, assistName: assist?.name || null })
    }
    events.push({ minute, type: 'goal', side: 'away', text: `⚽ ¡GOL de ${awayClub.name}${scorer ? ` (${scorer.name})` : ''}! (${homeGoals}-${awayGoals})` })
  }
  // ─────────────────────────────────────────────────────────────────────
  if (!homeScored && !awayScored && Math.random() < 0.06) {
    const side = Math.random() < 0.5 ? 'home' : 'away'
    const club = side === 'home' ? homeClub : awayClub
    events.push({ minute, type: 'chance', side, text: `${club.name} tuvo una ocasión clara` })
  }

  // Cards/injuries only tracked for the player's side — these become the
  // authoritative post-match events (see commitLiveMatch in the store).
  const cardEvents = {
    injuries: [...state.cardEvents.injuries],
    yellows: [...state.cardEvents.yellows],
    reds: [...state.cardEvents.reds],
  }
  const lineupKey = state.playerSide === 'home' ? 'homeLineup' : 'awayLineup'
  const playerLineup = state[lineupKey]
  const playerClub = state.playerSide === 'home' ? homeClub : awayClub
  const flaggedIds = new Set([
    ...cardEvents.yellows.map(e => e.playerId),
    ...cardEvents.reds.map(e => e.playerId),
  ])
  const injuredIds = new Set(cardEvents.injuries.map(e => e.playerId))
  const newPlayerLineup = [...playerLineup]

  // Escalado por Ritmo/Presión del lado del jugador — el rival nunca se
  // trackea acá (ver comentario arriba: solo el lado del jugador importa
  // para lesiones/tarjetas post-partido).
  // Amistoso de pretemporada: no cuenta para nada, así que tampoco lesiona ni
  // saca tarjetas — evita narrar un evento que además no se aplica al plantel
  // real (commitPreseasonFriendly no persiste cardEvents, a propósito).
  const isFriendly = state.kind === 'friendly'
  const playerTactics = state.playerSide === 'home' ? state.homeTactics : state.awayTactics
  const injuryRate = isFriendly ? 0 : INJURY_PER_MIN * (TEMPO_MODS[playerTactics.tempo]?.injuryMult ?? 1)
  const cardMult = PRESSING_MODS[playerTactics.pressing]?.cardMult ?? 1
  const redRate = isFriendly ? 0 : RED_PER_MIN * cardMult
  const yellowRate = isFriendly ? 0 : YELLOW_PER_MIN * cardMult

  playerLineup.forEach((id, i) => {
    if (id == null) return
    const p = playerClub.squad?.find(pp => pp.id === id)
    if (!p) return
    if (!flaggedIds.has(id)) {
      if (Math.random() < redRate) {
        const matchdays = Math.random() < 0.10 ? 2 : 1
        cardEvents.reds.push({ playerId: id, matchdays })
        newPlayerLineup[i] = null
        const onPitch = newPlayerLineup.filter(pid => pid != null).length
        events.push({ minute, type: 'red', side: state.playerSide, text: `🟥 ¡Roja para ${p.name}! ${playerClub.name} se queda con ${onPitch} jugadores` })
      } else if (Math.random() < yellowRate) {
        cardEvents.yellows.push({ playerId: id })
        events.push({ minute, type: 'yellow', side: state.playerSide, text: `🟨 Amarilla para ${p.name}` })
      }
    }
    if (!injuredIds.has(id) && Math.random() < injuryRate) {
      const r = Math.random()
      const matchdays = r < 0.60 ? 1 + Math.floor(Math.random() * 2)
        : r < 0.90 ? 3 + Math.floor(Math.random() * 2)
        : 5 + Math.floor(Math.random() * 4)
      cardEvents.injuries.push({ playerId: id, matchdays })
      const forcedOut = state.subsUsed >= MAX_SUBS
      if (forcedOut) newPlayerLineup[i] = null
      events.push({
        minute, type: 'injury', side: state.playerSide,
        text: `🚑 ${p.name} se lesionó${forcedOut ? ' — no quedan cambios, sale del campo' : ''}`,
      })
    }
  })

  const lineupChanged = newPlayerLineup.some((id, i) => id !== playerLineup[i])

  let nextState = {
    ...state,
    minute, homeGoals, awayGoals, homeFatigue, awayFatigue,
    events: [...state.events, ...events],
    cardEvents,
    scorers,
    [lineupKey]: newPlayerLineup,
    finished: minute >= 90,
  }
  if (lineupChanged && !nextState.finished) {
    nextState = rescheduleRemaining(nextState, homeClub, awayClub)
  }
  return nextState
}

export function applyLiveSub(state, club, outId, inId, homeClub, awayClub) {
  if (state.finished || state.subsUsed >= MAX_SUBS) return state
  if (outId == null || inId == null) return state
  const lineupKey = state.playerSide === 'home' ? 'homeLineup' : 'awayLineup'
  const fatigueKey = state.playerSide === 'home' ? 'homeFatigue' : 'awayFatigue'
  const lineup = state[lineupKey]
  const idx = lineup.indexOf(outId)
  if (idx === -1 || lineup.includes(inId)) return state
  const inPlayer = club.squad?.find(p => p.id === inId)
  const outPlayer = club.squad?.find(p => p.id === outId)
  if (!inPlayer || (inPlayer.injuredFor || 0) > 0 || (inPlayer.suspendedFor || 0) > 0) return state

  const newLineup = [...lineup]
  newLineup[idx] = inId

  const nextState = {
    ...state,
    [lineupKey]: newLineup,
    [fatigueKey]: { ...state[fatigueKey], [inId]: 0 },
    subsUsed: state.subsUsed + 1,
    events: [...state.events, {
      minute: state.minute, type: 'sub', side: state.playerSide,
      text: `🔄 Cambio: entra ${inPlayer.name}, sale ${outPlayer?.name || 'un jugador'}`,
    }],
  }
  return rescheduleRemaining(nextState, homeClub, awayClub)
}

export function setLiveMentality(state, mentality, homeClub, awayClub) {
  if (state.finished || !MENTALITY_MODS[mentality]) return state
  const key = state.playerSide === 'home' ? 'homeMentality' : 'awayMentality'
  if (state[key] === mentality) return state
  const nextState = {
    ...state,
    [key]: mentality,
    events: [...state.events, {
      minute: state.minute, type: 'tactic', side: state.playerSide,
      text: `🎯 Instrucción: modo ${MENTALITY_LABELS[mentality]}`,
    }],
  }
  return rescheduleRemaining(nextState, homeClub, awayClub)
}
