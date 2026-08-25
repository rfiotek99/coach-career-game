import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  LEAGUES, CLUB_TEMPLATES, initClubs, generateFreeAgents,
  getObjective, canApplyToClub, randomName, rng,
  FINANCE, calcPlayerWage, calcSponsorRevenue, calcTicketRevenue,
  calcBoardInvestment, calcPrizeMoney, generateSquad,
  STARTING_PROFILES, assignInitialContract, calcAskingWage, calcAskingYears,
} from '../data/gameData.js'
import { WORLD_CLUBS, WORLD_LEAGUES, resolveFinanceLeagueId, getCountriesByContinent } from '../data/worldData.js'
import { DEFAULT_TACTICS } from '../data/tactics.js'
import { generateYouthIntake } from '../data/academy.js'
import {
  generateSchedule, calcStandings, simulateMatch,
  calcStrength, calcRepDelta, calcConfidenceDelta,
  checkObjective, objectiveRepBonus,
  simulateLightweightMatch, getLightweightFixtures,
  simulateMixedMatch,
  assignPotential, developPlayers, applyYouthCamp,
  getEffectiveStarters, tickDownStatus, generateMatchEvents,
  calcTransferValue, getTransferWindow, runAITransfers,
  getNextWindowCloseMatchday, attributeMatchGoals,
} from '../engine/sim.js'
import {
  calcStreak, generateMatchdayHeadlines, triggerPressConference, PRESS_CONFERENCES,
} from '../data/pressData.js'
import {
  selectContinentalCupTeams, drawGroups, simulateGroupMatchday, getQualifiers,
  drawKnockoutBracket, simulateKnockoutRound, getGroupMatchdayFixtures,
} from '../engine/cup.js'
import {
  createLiveMatch, simulateLiveMinute,
  applyLiveSub as engineApplyLiveSub, setLiveMentality as engineSetLiveMentality,
} from '../engine/liveMatch.js'
import {
  generateVestuarioEvent, getCharlaEvent, resolveLifeEventEffects,
  generateMarketExitEvent, buildExitOfferEvent, checkPromiseDeadlines,
  generateCareerEvent, generatePrensaEvent, generateLegacyEvent,
} from '../data/lifeEvents.js'
import {
  checkDtDelMes, checkDtDelAnio, updateWinStreakRecord, makeCelebration, checkRepTierUp,
  addScorerEvents,
} from '../data/history.js'

// ── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function blankFinances(season) {
  return { season, tvRevenue: 0, sponsorRevenue: 0, boardInvestment: 0, ticketRevenue: 0, prizeRevenue: 0, promotionBonus: 0, wagesPaid: 0, maintenancePaid: 0 }
}

function calcFormScore(schedule, clubId, last = 5) {
  const played = schedule.flat().filter(m =>
    m.homeGoals != null && (m.homeId === clubId || m.awayId === clubId)
  ).slice(-last)
  if (!played.length) return 0.5
  const pts = played.map(m =>
    m.homeId === clubId
      ? (m.homeGoals > m.awayGoals ? 1 : m.homeGoals === m.awayGoals ? 0.5 : 0)
      : (m.awayGoals > m.homeGoals ? 1 : m.awayGoals === m.homeGoals ? 0.5 : 0)
  )
  return pts.reduce((a, b) => a + b, 0) / pts.length
}

function fmtK(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  return `${sign}$${Math.round(abs / 1_000)}k`
}

function buildLeagueState(clubs) {
  const state = {}
  LEAGUES.forEach(league => {
    const clubIds = clubs.filter(c => c.leagueId === league.id).map(c => c.id)
    const schedule = generateSchedule(clubIds)
    state[league.id] = {
      clubIds,
      schedule,
      currentMatchday: 0,
      totalMatchdays: schedule.length,
      completed: false,
    }
  })
  return state
}

// Un club del que renunciaste o te echaron no te vuelve a ofrecer el cargo
// hasta que pasen JOB_COOLDOWN_SEASONS temporadas — evita el exploit de
// renunciar justo antes del despido y retomar el mismo club al toque con la
// confianza reseteada a 60% (acceptJob no distingue "primera vez" de "volviste").
const JOB_COOLDOWN_SEASONS = 2

function isClubOnCooldown(clubId, jobHistory, season) {
  const lastExit = [...(jobHistory || [])].reverse().find(h => h.clubId === clubId && (h.fired || h.resigned))
  return !!lastExit && season - lastExit.season < JOB_COOLDOWN_SEASONS
}

function makeAvailableJobs(clubs, coachRep, jobHistory, season) {
  return clubs
    .filter(c => c.managerId === null)
    .filter(c => canApplyToClub(coachRep, c.prestige))
    .filter(c => !isClubOnCooldown(c.id, jobHistory, season))
    .map(c => ({
      clubId: c.id,
      salary: Math.floor(c.prestige * 850 + 5000),
    }))
}

function getClubsMap(clubs) {
  return Object.fromEntries(clubs.map(c => [c.id, c]))
}

// djb2 — mismo patrón que ya usan sim.js/history.js para ids -> seed determinístico
function hashClubId(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  return h >>> 0
}

// Extracts scorer events for one side from a committed live match's `scorers`
// list (see liveMatch.js) in the same shape assignGoalScorers() returns, so
// both paths (rápido/en vivo) feed addScorerEvents identically. Defensive
// against `liveResult.scorers` being absent (older saves, or mid-rollout).
function scorersFromLiveResult(liveResult, side) {
  return (liveResult?.scorers || [])
    .filter(e => e.side === side)
    .map(e => ({ scorerId: e.scorerId, scorerName: e.scorerName, assistId: e.assistId, assistName: e.assistName }))
}

// Looks up a club for the live-match engine: the store's own clubs first
// (has a real squad), falling back to the static WORLD_CLUBS entry (background
// AI opponent with only .strength, no squad) — same fallback simulateMixedMatch uses.
// worldClubSquads (opcional): si el club es del exterior y ya tenemos su
// plantel cacheado (ensureWorldClubSquad), lo componemos acá — así
// calcStrength usa el plantel real en vez de caer al fallback plano (40).
// Parámetro opcional y con default {} — los call sites que no lo pasan
// se comportan exactamente igual que antes.
function resolveLiveClub(clubId, clubs, worldClubSquads = {}) {
  const domestic = clubs.find(c => c.id === clubId)
  if (domestic) return domestic
  const worldClub = WORLD_CLUBS.find(c => c.id === clubId)
  if (!worldClub) return null
  return worldClubSquads[clubId] ? { ...worldClub, squad: worldClubSquads[clubId] } : worldClub
}

const AI_FORMATIONS = ['4-4-2','4-3-3','4-2-3-1','3-5-2','5-3-2']

// ── World league helpers ──────────────────────────────────────────────────────
function buildWorldLeagueState() {
  const state = {}
  WORLD_LEAGUES.forEach(league => {
    const clubIds = WORLD_CLUBS.filter(c => c.leagueId === league.id).map(c => c.id)
    const n = clubIds.length % 2 === 0 ? clubIds.length : clubIds.length + 1
    const totalMatchdays = (n - 1) * 2
    const standings = {}
    clubIds.forEach(id => {
      standings[id] = { clubId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }
    })
    state[league.id] = { clubIds, standings, currentMatchday: 0, totalMatchdays, completed: false, champion: null }
  })
  return state
}

function applyLightweightFixture(standings, homeId, awayId, homeGoals, awayGoals) {
  const h = { ...standings[homeId] }
  const a = { ...standings[awayId] }
  if (!h || !a) return standings
  h.played++; h.gf += homeGoals; h.ga += awayGoals
  a.played++; a.gf += awayGoals; a.ga += homeGoals
  if (homeGoals > awayGoals) { h.won++; h.points += 3; a.lost++ }
  else if (homeGoals < awayGoals) { a.won++; a.points += 3; h.lost++ }
  else { h.drawn++; h.points++; a.drawn++; a.points++ }
  return { ...standings, [homeId]: h, [awayId]: a }
}

function getLeagueChampion(standings) {
  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return (b.gf - b.ga) - (a.gf - a.ga)
  })[0]?.clubId || null
}

// Pre-build a per-league club lookup to avoid filtering WORLD_CLUBS repeatedly
const WORLD_CLUBS_BY_LEAGUE = {}
WORLD_CLUBS.forEach(c => {
  if (!WORLD_CLUBS_BY_LEAGUE[c.leagueId]) WORLD_CLUBS_BY_LEAGUE[c.leagueId] = {}
  WORLD_CLUBS_BY_LEAGUE[c.leagueId][c.id] = c
})

// ── Copas continentales + Mundial de Clubes ───────────────────────────────────
// CUP_ROUND_NAME/CUP_REWARDS están keyed por TAMAÑO de ronda (16/8/4/2), no por
// continente — una ronda de 8 equipos es "Cuartos de Final" sea cual sea el
// continente que arrancó ahí, así que el mismo lookup sirve para las 3 copas
// sin cambios.
const CUP_REWARDS = {
  qualifyGroup: { rep: 1, money: 0 },
  round16:      { rep: 2, money: 40_000 },
  quarters:     { rep: 2, money: 80_000 },
  semis:        { rep: 3, money: 150_000 },
  champion:     { rep: 8, money: 500_000 },
  runnerUp:     { rep: 4, money: 200_000 },
}
const CUP_ROUND_NAME = { 16: 'Octavos de Final', 8: 'Cuartos de Final', 4: 'Semifinal', 2: 'Final' }

const CONTINENTAL_CUP_CONFIG = {
  europa:       { name: 'Copa Europea',        targetSize: 32, maxPerCountry: 8, includeArgentina: false },
  sudamerica:   { name: 'Copa Sudamericana',   targetSize: 16, maxPerCountry: 8, includeArgentina: true },
  norteamerica: { name: 'Copa Norteamericana', targetSize: 8,  maxPerCountry: 8, includeArgentina: false },
}

// Avanza UNA copa continental un paso cada dos llamadas (crea el torneo en la
// primera si no existe). Misma mecánica que la vieja Copa Internacional única
// — grupos → eliminación — parametrizada por continente en vez de duplicada.
function advanceSingleCup(continentId, cup, clubs, coach, season, playerClubId, records, playerOverride = null) {
  const config = CONTINENTAL_CUP_CONFIG[continentId]
  const competitionId = `copa-${continentId}`
  const competitionName = config.name
  const notifications = []
  const celebrations = []
  const cupGoalEvents = []
  let toastEvent = null
  let updatedClubs = clubs
  let updatedCoach = coach

  if (!cup) {
    const seed = Date.now() + season * 7919 + continentId.length * 131
    const countryIds = getCountriesByContinent(continentId)
    const extraCandidates = config.includeArgentina
      ? clubs.filter(c => c.leagueId === 'liga-premier').map(c => ({ id: c.id, countryId: 'argentina', prestige: c.prestige }))
      : []
    const teamIds = selectContinentalCupTeams(
      config.includeArgentina ? [...countryIds, 'argentina'] : countryIds,
      config.targetSize, config.maxPerCountry, extraCandidates,
    )
    // Cuáles de esos ids son REALMENTE clubes argentinos — no basta con mirar
    // el string del id más tarde, porque un id de CLUB_TEMPLATES puede
    // coincidir por casualidad con uno de WORLD_CLUBS (ej. "pumas-fc" existe
    // en ambos lados). Esta lista se arma en el único momento en que sabemos
    // con certeza de dónde salió cada id.
    const argentineTeamIds = teamIds.filter(id => extraCandidates.some(c => c.id === id))
    const groups = drawGroups(teamIds, seed)
    cup = { seed, teamIds, argentineTeamIds, groups, groupMd: 0, phase: 'groups', pendingBracket: null, knockout: [], champion: null, tickCount: 0 }
    if (playerClubId && teamIds.includes(playerClubId)) {
      notifications.push({
        id: Date.now() + 1, category: 'milestone',
        text: `Tu club fue sorteado para la ${competitionName}`,
        read: false, season, matchday: null,
      })
    }
    // Recién sorteada: no simular todavía. Si lo hiciéramos en el mismo tick,
    // el primer partido de grupos (que puede ser el del jugador) se resolvería
    // sin darle chance de elegir rápido/en vivo — getPendingCupMatch() necesita
    // al menos un tick de margen para poder "espiar" el fixture antes de que
    // se juegue. La primera fecha se simula recién en la próxima llamada.
    return { cup, clubs: updatedClubs, coach: updatedCoach, notifications, toastEvent, celebrations, records }
  }

  if (cup.phase === 'done') {
    return { cup, clubs: updatedClubs, coach: updatedCoach, notifications, toastEvent, celebrations, records }
  }

  const tickCount = cup.tickCount + 1
  if (tickCount % 2 !== 1) {
    return { cup: { ...cup, tickCount }, clubs: updatedClubs, coach: updatedCoach, notifications, toastEvent, celebrations, records }
  }

  // Solo mezclamos los clubes argentinos marcados como tales al armar el
  // sorteo (cup.argentineTeamIds) — NO re-derivarlo de cup.teamIds, porque
  // un id de CLUB_TEMPLATES puede coincidir por casualidad con uno de
  // WORLD_CLUBS (ej. "pumas-fc" existe en ambos lados) y el string por sí
  // solo no alcanza para saber cuál de los dos es el participante real.
  const cupClubById = Object.fromEntries(
    [...WORLD_CLUBS, ...updatedClubs.filter(c => cup.argentineTeamIds?.includes(c.id))].map(c => [c.id, c]),
  )
  let newCup = { ...cup, tickCount }

  const applyReward = (reward) => {
    if (!playerClubId) return
    if (reward.money) {
      updatedClubs = updatedClubs.map(c => c.id === playerClubId ? { ...c, budget: c.budget + reward.money } : c)
    }
    if (reward.rep) {
      updatedCoach = { ...updatedCoach, reputation: clamp(updatedCoach.reputation + reward.rep, 0, 100) }
    }
  }

  if (newCup.phase === 'groups') {
    const { groups, results } = simulateGroupMatchday(newCup.groups, newCup.groupMd, cupClubById, playerOverride)
    newCup.groups = groups
    newCup.groupMd += 1

    // ── Goleadores/asistencias — no-op gratis para los rivales sin plantel ──
    const cupGoalCtx = { season, competitionId, competitionName }
    results.forEach(r => {
      const home = cupClubById[r.homeId]
      const away = cupClubById[r.awayId]
      r.homeScorers.forEach(ev => cupGoalEvents.push({ ...cupGoalCtx, clubId: r.homeId, clubName: home?.name || r.homeId, ...ev }))
      r.awayScorers.forEach(ev => cupGoalEvents.push({ ...cupGoalCtx, clubId: r.awayId, clubName: away?.name || r.awayId, ...ev }))
    })
    // ─────────────────────────────────────────────────────────────────────

    const myResult = results.find(r => r.homeId === playerClubId || r.awayId === playerClubId)
    if (myResult) {
      const isHome = myResult.homeId === playerClubId
      const pg = isHome ? myResult.homeGoals : myResult.awayGoals
      const og = isHome ? myResult.awayGoals : myResult.homeGoals
      const oppId = isHome ? myResult.awayId : myResult.homeId
      const oppName = cupClubById[oppId]?.name || oppId
      notifications.push({
        id: Date.now() + 2, category: 'milestone',
        text: `${competitionName} (Grupo ${myResult.groupLetter}): ${pg > og ? 'Ganaste' : pg === og ? 'Empataste' : 'Perdiste'} ${pg}-${og} vs ${oppName}`,
        read: false, season, matchday: null,
      })
    }

    if (newCup.groupMd >= 3) {
      const qualifiers = getQualifiers(newCup.groups)
      newCup.pendingBracket = drawKnockoutBracket(qualifiers, newCup.seed)
      newCup.phase = 'knockout'

      if (playerClubId) {
        if (qualifiers.some(q => q.clubId === playerClubId)) {
          applyReward(CUP_REWARDS.qualifyGroup)
          notifications.push({
            id: Date.now() + 3, category: 'milestone',
            text: `🏆 Clasificaste a la fase eliminatoria de la ${competitionName}`,
            read: false, season, matchday: null,
          })
        } else if (newCup.teamIds.includes(playerClubId)) {
          notifications.push({
            id: Date.now() + 3, category: 'milestone',
            text: `Quedaste eliminado de la ${competitionName} en fase de grupos`,
            read: false, season, matchday: null,
          })
        }
      }
    }
  } else if (newCup.phase === 'knockout' && newCup.pendingBracket) {
    const roundSize = newCup.pendingBracket.length
    const { winners, ties } = simulateKnockoutRound(newCup.pendingBracket, cupClubById, playerOverride)
    newCup.knockout = [...newCup.knockout, { size: roundSize, ties }]

    // ── Goleadores/asistencias ──────────────────────────────────────────────
    const cupGoalCtx = { season, competitionId, competitionName }
    ties.forEach(t => {
      const home = cupClubById[t.homeId]
      const away = cupClubById[t.awayId]
      t.homeScorers.forEach(ev => cupGoalEvents.push({ ...cupGoalCtx, clubId: t.homeId, clubName: home?.name || t.homeId, ...ev }))
      t.awayScorers.forEach(ev => cupGoalEvents.push({ ...cupGoalCtx, clubId: t.awayId, clubName: away?.name || t.awayId, ...ev }))
    })
    // ─────────────────────────────────────────────────────────────────────

    const myTie = ties.find(t => t.homeId === playerClubId || t.awayId === playerClubId)
    const roundName = CUP_ROUND_NAME[roundSize] || `Ronda de ${roundSize}`

    if (winners.length === 1) {
      newCup.champion = winners[0]
      newCup.phase = 'done'
      newCup.pendingBracket = null

      if (playerClubId === newCup.champion) {
        applyReward(CUP_REWARDS.champion)
        updatedCoach = {
          ...updatedCoach,
          trophies: [...(updatedCoach.trophies || []), {
            season, leagueId: competitionId, clubId: playerClubId, clubName: cupClubById[playerClubId]?.name,
          }],
        }
        celebrations.push(makeCelebration({
          type: 'continental-cup-title', icon: '🌎',
          title: `¡CAMPEÓN DE LA ${competitionName.toUpperCase()}!`,
          subtitle: cupClubById[playerClubId]?.name || '',
          detail: `Temporada ${season}`,
        }))
        notifications.push({
          id: Date.now() + 5, category: 'milestone',
          text: `🏆 ¡Ganaste la ${competitionName}! Clasificaste al Mundial de Clubes`,
          read: false, season, matchday: null,
        })
      } else if (myTie) {
        applyReward(CUP_REWARDS.runnerUp)
        notifications.push({
          id: Date.now() + 5, category: 'milestone',
          text: `Subcampeón de la ${competitionName} — gran temporada igual`,
          read: false, season, matchday: null,
        })
      }
    } else {
      newCup.pendingBracket = winners
      if (myTie) {
        if (myTie.winner === playerClubId) {
          const wonReward = roundSize === 16 ? CUP_REWARDS.round16 : roundSize === 8 ? CUP_REWARDS.quarters : CUP_REWARDS.semis
          applyReward(wonReward)
          notifications.push({
            id: Date.now() + 5, category: 'milestone',
            text: `🏆 Avanzaste a ${CUP_ROUND_NAME[winners.length] || 'la siguiente ronda'} de la ${competitionName}`,
            read: false, season, matchday: null,
          })
          toastEvent = { id: Date.now() + 6, text: `¡Avanzaste en la ${competitionName}! (${roundName})`, type: 'success' }
        } else {
          notifications.push({
            id: Date.now() + 5, category: 'milestone',
            text: `Quedaste eliminado de la ${competitionName} en ${roundName}`,
            read: false, season, matchday: null,
          })
        }
      }
    }
  }

  return {
    cup: newCup, clubs: updatedClubs, coach: updatedCoach, notifications, toastEvent, celebrations,
    records: addScorerEvents(records, cupGoalEvents),
  }
}

// ── Mundial de Clubes ─────────────────────────────────────────────────────────
// Liguilla simple todos-contra-todos entre los (hasta 3) campeones
// continentales — con tan pocos participantes no tiene sentido forzar el
// bracket de grupos+eliminación de cup.js, pero sí reutiliza
// simulateMixedMatch/attributeMatchGoals (mismo motor de partido).
const WORLD_CUP_REWARDS = {
  champion: { rep: 12, money: 800_000 },
  runnerUp: { rep: 6, money: 300_000 },
}

function createWorldCup(champions, season) {
  const valid = champions.filter(c => c.clubId)
  const fixtures = []
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      fixtures.push({ homeId: valid[i].clubId, awayId: valid[j].clubId })
    }
  }
  return {
    season, champions: valid, fixtures, results: [], nextFixtureIdx: 0,
    table: Object.fromEntries(valid.map(c => [c.clubId, { clubId: c.clubId, pts: 0, gf: 0, ga: 0, played: 0 }])),
    phase: fixtures.length ? 'active' : 'done',
    champion: fixtures.length ? null : (valid[0]?.clubId || null),
    tickCount: 0,
  }
}

// Un partido de la liguilla cada dos llamadas — misma cadencia que las copas
// continentales, para que el ritmo se sienta parejo. playerOverride — mismo
// shape que en advanceSingleCup — sustituye el resultado del ÚNICO fixture
// del jugador (ya resuelto rápido o en vivo vía getPendingCupMatch/
// startCupLiveMatch/commitCupLiveMatch, con continentId 'mundial').
function advanceWorldCup(worldCup, clubs, coach, season, playerClubId, playerOverride = null) {
  const notifications = []
  const celebrations = []
  let toastEvent = null
  let updatedClubs = clubs
  let updatedCoach = coach

  if (worldCup.phase === 'done' || worldCup.nextFixtureIdx >= worldCup.fixtures.length) {
    return { worldCup, clubs: updatedClubs, coach: updatedCoach, notifications, toastEvent, celebrations }
  }

  const tickCount = worldCup.tickCount + 1
  if (tickCount % 2 !== 1) {
    return { worldCup: { ...worldCup, tickCount }, clubs: updatedClubs, coach: updatedCoach, notifications, toastEvent, celebrations }
  }

  // Mismo criterio que advanceSingleCup: solo mezclamos clubes marcados como
  // argentinos (worldCup.champions[].isArgentine), no re-derivarlo del id.
  const argentineChampionIds = worldCup.champions.filter(c => c.isArgentine).map(c => c.clubId)
  const clubById = Object.fromEntries(
    [...WORLD_CLUBS, ...updatedClubs.filter(c => argentineChampionIds.includes(c.id))].map(c => [c.id, c]),
  )
  const fixture = worldCup.fixtures[worldCup.nextFixtureIdx]
  const home = clubById[fixture.homeId]
  const away = clubById[fixture.awayId]
  const isPlayerFixture = playerOverride && (fixture.homeId === playerOverride.clubId || fixture.awayId === playerOverride.clubId)
  const res = isPlayerFixture
    ? { homeGoals: playerOverride.homeGoals, awayGoals: playerOverride.awayGoals }
    : simulateMixedMatch(home, away)
  const { homeScorers, awayScorers } = isPlayerFixture
    ? { homeScorers: playerOverride.homeScorers || [], awayScorers: playerOverride.awayScorers || [] }
    : attributeMatchGoals(home, away, res.homeGoals, res.awayGoals)

  const newTable = { ...worldCup.table }
  const h = { ...newTable[fixture.homeId] }
  const a = { ...newTable[fixture.awayId] }
  h.gf += res.homeGoals; h.ga += res.awayGoals; h.played++
  a.gf += res.awayGoals; a.ga += res.homeGoals; a.played++
  if (res.homeGoals > res.awayGoals) h.pts += 3
  else if (res.homeGoals < res.awayGoals) a.pts += 3
  else { h.pts++; a.pts++ }
  newTable[fixture.homeId] = h
  newTable[fixture.awayId] = a

  const newResults = [...worldCup.results, { ...fixture, homeGoals: res.homeGoals, awayGoals: res.awayGoals, homeScorers, awayScorers }]
  const nextIdx = worldCup.nextFixtureIdx + 1

  if (fixture.homeId === playerClubId || fixture.awayId === playerClubId) {
    const isHome = fixture.homeId === playerClubId
    const pg = isHome ? res.homeGoals : res.awayGoals
    const og = isHome ? res.awayGoals : res.homeGoals
    const oppName = clubById[isHome ? fixture.awayId : fixture.homeId]?.name || ''
    notifications.push({
      id: Date.now() + 200, category: 'milestone',
      text: `Mundial de Clubes: ${pg > og ? 'Ganaste' : pg === og ? 'Empataste' : 'Perdiste'} ${pg}-${og} vs ${oppName}`,
      read: false, season, matchday: null,
    })
    toastEvent = { id: Date.now() + 201, text: `Mundial de Clubes: ${pg}-${og} vs ${oppName}`, type: pg >= og ? 'success' : 'warn' }
  }

  const newWorldCup = { ...worldCup, tickCount, table: newTable, results: newResults, nextFixtureIdx: nextIdx }

  if (nextIdx >= worldCup.fixtures.length) {
    const standings = Object.values(newTable).sort((a, b) =>
      b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
    )
    const championId = standings[0]?.clubId || null
    newWorldCup.phase = 'done'
    newWorldCup.champion = championId

    if (playerClubId === championId) {
      updatedClubs = updatedClubs.map(c => c.id === playerClubId ? { ...c, budget: c.budget + WORLD_CUP_REWARDS.champion.money } : c)
      updatedCoach = {
        ...updatedCoach,
        reputation: clamp(updatedCoach.reputation + WORLD_CUP_REWARDS.champion.rep, 0, 100),
        trophies: [...(updatedCoach.trophies || []), {
          season, leagueId: 'mundial-de-clubes', clubId: playerClubId, clubName: clubById[playerClubId]?.name,
        }],
      }
      celebrations.push(makeCelebration({
        type: 'world-cup-title', icon: '🌍',
        title: '¡CAMPEÓN DEL MUNDO!',
        subtitle: clubById[playerClubId]?.name || '',
        detail: `Mundial de Clubes · Temporada ${season}`,
      }))
      notifications.push({
        id: Date.now() + 300, category: 'milestone',
        text: '🌍🏆 ¡CAMPEÓN DEL MUNDIAL DE CLUBES! El máximo título de tu carrera',
        read: false, season, matchday: null,
      })
    } else if (standings.some(s => s.clubId === playerClubId)) {
      updatedClubs = updatedClubs.map(c => c.id === playerClubId ? { ...c, budget: c.budget + WORLD_CUP_REWARDS.runnerUp.money } : c)
      updatedCoach = { ...updatedCoach, reputation: clamp(updatedCoach.reputation + WORLD_CUP_REWARDS.runnerUp.rep, 0, 100) }
      notifications.push({
        id: Date.now() + 300, category: 'milestone',
        text: 'Terminaste subcampeón del Mundial de Clubes',
        read: false, season, matchday: null,
      })
    }
  }

  return { worldCup: newWorldCup, clubs: updatedClubs, coach: updatedCoach, notifications, toastEvent, celebrations }
}

// ── Orquestador: avanza las 3 copas continentales + el Mundial ───────────────
// Llamado una vez por simulateMatchday, igual que la vieja advanceCup.
function advanceContinentalCups(continentalCups, worldCup, clubs, coach, season, playerClubId, records, pendingCupResult = null) {
  const notifications = []
  const celebrations = []
  let toastEvent = null
  let updatedClubs = clubs
  let updatedCoach = coach
  let updatedRecords = records
  const newContinentalCups = {}

  for (const continentId of Object.keys(CONTINENTAL_CUP_CONFIG)) {
    const playerOverride = pendingCupResult?.continentId === continentId
      ? { clubId: pendingCupResult.clubId, homeGoals: pendingCupResult.homeGoals, awayGoals: pendingCupResult.awayGoals, homeScorers: pendingCupResult.homeScorers, awayScorers: pendingCupResult.awayScorers }
      : null
    const result = advanceSingleCup(continentId, continentalCups[continentId], updatedClubs, updatedCoach, season, playerClubId, updatedRecords, playerOverride)
    newContinentalCups[continentId] = result.cup
    updatedClubs = result.clubs
    updatedCoach = result.coach
    updatedRecords = result.records
    notifications.push(...result.notifications)
    celebrations.push(...result.celebrations)
    if (result.toastEvent && !toastEvent) toastEvent = result.toastEvent
  }

  let newWorldCup = worldCup
  const allContinentalDone = Object.values(newContinentalCups).every(c => c?.phase === 'done')
  if (allContinentalDone && !newWorldCup) {
    const champions = Object.entries(newContinentalCups).map(([continentId, c]) => ({
      continentId, clubId: c.champion, isArgentine: !!c.argentineTeamIds?.includes(c.champion),
    }))
    newWorldCup = createWorldCup(champions, season)
    if (playerClubId && champions.some(c => c.clubId === playerClubId)) {
      notifications.push({
        id: Date.now() + 100, category: 'milestone',
        text: '🌍 ¡Clasificaste al Mundial de Clubes!',
        read: false, season, matchday: null,
      })
    }
  } else if (newWorldCup && newWorldCup.phase !== 'done') {
    const worldCupOverride = pendingCupResult?.continentId === 'mundial'
      ? { clubId: pendingCupResult.clubId, homeGoals: pendingCupResult.homeGoals, awayGoals: pendingCupResult.awayGoals, homeScorers: pendingCupResult.homeScorers, awayScorers: pendingCupResult.awayScorers }
      : null
    const wcResult = advanceWorldCup(newWorldCup, updatedClubs, updatedCoach, season, playerClubId, worldCupOverride)
    newWorldCup = wcResult.worldCup
    updatedClubs = wcResult.clubs
    updatedCoach = wcResult.coach
    notifications.push(...wcResult.notifications)
    celebrations.push(...wcResult.celebrations)
    if (wcResult.toastEvent && !toastEvent) toastEvent = wcResult.toastEvent
  }

  return {
    continentalCups: newContinentalCups, worldCup: newWorldCup,
    clubs: updatedClubs, coach: updatedCoach, notifications, toastEvent, celebrations, records: updatedRecords,
  }
}

// ── Transfer helpers (pure, outside store) ────────────────────────────────────

function computeAIResponse(player, sellerClub, buyerClub, amount) {
  const value = calcTransferValue(player)
  const ratio = amount / value
  if (ratio < 0.65) return { decision: 'rejected', counterAmount: null, reason: 'oferta irrisoria' }
  if (sellerClub.squad.length <= 14) return { decision: 'rejected', counterAmount: null, reason: 'plantel mínimo' }

  let acceptP, counterP
  if (ratio < 0.80) { acceptP = 0.15; counterP = 0.50 }
  else if (ratio < 0.95) { acceptP = 0.40; counterP = 0.35 }
  else if (ratio < 1.10) { acceptP = 0.70; counterP = 0.22 }
  else { acceptP = 0.92; counterP = 0.06 }

  if (player.age >= 32) acceptP = Math.min(1, acceptP + 0.20)
  if (sellerClub.prestige > (buyerClub?.prestige || 0) + 15) {
    acceptP = Math.max(0, acceptP - 0.15)
    counterP = Math.min(1 - acceptP, counterP + 0.10)
  }

  const r = Math.random()
  const decision = r < acceptP ? 'accepted' : r < acceptP + counterP ? 'countered' : 'rejected'
  const mult = ratio < 0.80 ? 1.30 : ratio < 0.95 ? 1.15 : ratio < 1.10 ? 1.08 : 0.96
  const counterAmount = decision === 'countered' ? Math.round(amount * mult) : null
  return { decision, counterAmount, reason: null }
}

// Misma forma que computeAIResponse, pero del lado del jugador negociando su
// renovación: ratio de sueldo ofrecido vs. pedido, penalizado si además se
// ofrecen menos años de los que pide. `askWage`/`askYears` es lo que el
// jugador viene pidiendo en esta ronda (converge hacia la oferta si contraofertea).
function computePlayerContractResponse(offerWage, offerYears, askWage, askYears) {
  const wageRatio = offerWage / askWage
  const yearsGap = askYears - offerYears

  let acceptP, counterP
  if (wageRatio < 0.75) { acceptP = 0.05; counterP = 0.55 }
  else if (wageRatio < 0.90) { acceptP = 0.25; counterP = 0.55 }
  else if (wageRatio < 1.0) { acceptP = 0.55; counterP = 0.35 }
  else { acceptP = 0.85; counterP = 0.13 }

  if (yearsGap >= 2) {
    acceptP = Math.max(0, acceptP - 0.25)
    counterP = Math.min(1 - acceptP, counterP + 0.15)
  } else if (yearsGap === 1) {
    acceptP = Math.max(0, acceptP - 0.10)
  } else if (yearsGap < 0) {
    acceptP = Math.min(1, acceptP + 0.05)
  }

  const r = Math.random()
  const decision = r < acceptP ? 'accepted' : r < acceptP + counterP ? 'countered' : 'rejected'
  if (decision !== 'countered') return { decision, counterWage: null, counterYears: null }

  const mult = wageRatio < 0.75 ? 1.20 : wageRatio < 0.90 ? 1.10 : 1.04
  const counterWage = Math.round((offerWage * mult) / 10) * 10
  const counterYears = yearsGap > 0 ? Math.max(offerYears, askYears - 1) : askYears
  return { decision, counterWage, counterYears }
}

function doTransfer(clubs, buyerClubId, sellerClubId, player, amount) {
  return clubs.map(c => {
    if (c.id === buyerClubId) {
      const signedPlayer = { ...player, clubId: buyerClubId, contract: assignInitialContract(player) }
      return { ...c, budget: c.budget - amount, squad: [...c.squad, signedPlayer] }
    }
    if (c.id === sellerClubId) {
      return {
        ...c,
        budget: c.budget + amount,
        squad: c.squad.filter(p => p.id !== player.id),
        starters: (c.starters || []).filter(id => id !== player.id),
      }
    }
    return c
  })
}

// Resuelve un club vendedor para el mercado: doméstico (vive en `clubs`) o del
// mundo (WORLD_CLUBS + worldClubSquads, cacheado por ensureWorldClubSquad —
// nunca genera acá, solo lee lo que ya esté cacheado).
function resolveMarketSeller(clubId, clubs, worldClubSquads) {
  const domestic = clubs.find(c => c.id === clubId)
  if (domestic) return { club: domestic, isWorld: false }
  const worldClub = WORLD_CLUBS.find(c => c.id === clubId)
  if (!worldClub) return { club: null, isWorld: false }
  return { club: { ...worldClub, squad: worldClubSquads[clubId] || [] }, isWorld: true }
}

// Como doTransfer, pero el vendedor es un club del mundo — no vive en `clubs`
// (no tiene presupuesto propio simulado), solo se le saca el jugador de su
// plantel cacheado en worldClubSquads.
function doTransferFromWorld(clubs, worldClubSquads, buyerClubId, sellerClubId, player, amount) {
  const updatedClubs = clubs.map(c =>
    c.id === buyerClubId
      ? { ...c, budget: c.budget - amount, squad: [...c.squad, { ...player, clubId: buyerClubId, contract: assignInitialContract(player) }] }
      : c
  )
  const sellerSquad = worldClubSquads[sellerClubId] || []
  const updatedWorldClubSquads = {
    ...worldClubSquads,
    [sellerClubId]: sellerSquad.filter(p => p.id !== player.id),
  }
  return { clubs: updatedClubs, worldClubSquads: updatedWorldClubSquads }
}

// ── Store ─────────────────────────────────────────────────────────────────────
const useGame = create(
  persist(
    (set, get) => ({
      // Meta
      screen: 'main-menu',
      activeTab: 'home',
      hasGame: false,

      // Coach
      coach: null,

      // World
      clubs: [],         // flat array
      freeAgents: [],
      season: 1,
      leagues: {},       // leagueId → { clubIds, schedule, currentMatchday, totalMatchdays, completed }

      // World
      worldLeagues: {},      // leagueId → { clubIds, standings, currentMatchday, totalMatchdays, completed, champion }
      worldInitialized: false,
      detailedCountryId: 'argentina',

      // Copas continentales + Mundial de Clubes
      continentalCups: { europa: null, sudamerica: null, norteamerica: null },
      // { seed, teamIds, groups, groupMd, phase, pendingBracket, knockout, champion } | null, por continente
      worldCup: null, // { season, champions, fixtures, results, nextFixtureIdx, table, phase, champion } | null

      // Job
      currentJob: null,  // { clubId, objective, boardConfidence, salary, contractEndSeason }
      foreignLeague: null, // { leagueId, schedule, currentMatchday, totalMatchdays, completed }

      // Events / notifications
      events: [],        // { id, text, type } – shown as toast or log
      notifications: [], // { id, category, text, read, season, matchday, requiresAction, actionType, actionPayload } – persistent history
      coachInterest: null,    // { clubId, clubName, prestige, salary, rumorMatchday, rumorSeason } | null
      matchReport: null, // last simulated matchday's results

      // Life events (extensible: vestuario now, prensa/vida personal/hinchada later)
      lifeEvents: [],      // queue — front item shown in LifeEventModal, see src/data/lifeEvents.js
      lastLifeEventMd: 0,  // cooldown tracker for automatic events

      // Live match (player's own fixture, played out minute by minute)
      liveMatch: null, // { minute, homeGoals, awayGoals, homeClubId, awayClubId, homeLineup, awayLineup, homeFatigue, awayFatigue, homeMentality, awayMentality, playerSide, subsUsed, events, cardEvents, finished, kind?, continentId? } | null

      // Cup match already resolved (quick or live) this turn, staged until the
      // league fixture also resolves and simulateMatchday() consumes it — see
      // commitCupLiveMatch/getPendingCupMatch.
      pendingCupResult: null, // { continentId, clubId, homeGoals, awayGoals, homeScorers, awayScorers, cardEvents } | null

      // Season end data
      seasonEndData: null,

      // Preseason friendlies played this preseason (quick or live), staged
      // until finishPreseason() clears them along with the rest of the
      // preseason UI — capped at 3, never touches leagues/reputation/history.
      preseasonFriendlyResults: [], // { id, opponentId, opponentName, homeGoals, awayGoals, isHome }

      // Foco de entrenamiento elegido (todavía sin confirmar) en la pantalla
      // de Pretemporada. Vive en el store (no en useState local de
      // PreseasonScreen) porque un amistoso en vivo desmonta esa pantalla —
      // App.jsx renderiza LiveMatchScreen en su lugar mientras liveMatch esté
      // activo — y un useState local perdería la selección al volver.
      preseasonFocusDraft: 'ninguno',

      // Celebrations (queue) — momentos de impacto: título, ascenso, copa,
      // subida de tier de reputación, premios de DT. Ver src/data/history.js.
      celebrations: [], // { id, type, icon, title, subtitle, detail }

      // Press system
      pressHeadlines: [],    // { id, text, type, matchday, season }
      pressConference: null, // active press conference | null
      lastConferenceMd: 0,   // matchday when last conference was triggered

      // Transfer market
      transferOffers: [],    // { id, type, fromClubId, toClubId, playerId, playerName, ... }
      aiTransferLog: [],     // [ { text, season } ] — log of AI market activity
      transferWindowRan: { verano: false, invierno: false },

      // Contract renewal negotiation (in progress) | null
      contractNegotiation: null,

      // Market drama: rumors + world "planned" intentions (see simulateMatchday)
      marketRumors: [],          // { id, kind, text, playerId, playerName, buyerClubId, buyerClubName, season, matchday, status: 'pending'|'confirmed'|'faded' }
      pendingMarketIntentions: [], // [{ id, buyerClubId, sellerClubId, playerId, resolveSeason }] — AI-AI moves rumored before the window opens

      // World history / palmarés — persists across seasons (never reset in
      // processSeasonEnd, only on startNewGame/resetGame). See src/data/history.js.
      worldHistory: { titles: [], movements: [], awards: [], records: {} },
      lastDtMesMd: 0,

      // Planteles de clubes del mundo — generados bajo demanda (ver
      // ensureWorldClubSquad) y cacheados acá, nunca los 328 de una.
      // worldSeed se fija una vez por partida (startNewGame) para que el
      // plantel de cada club sea estable dentro de la partida pero varíe
      // entre partidas nuevas.
      worldClubSquads: {}, // { [clubId]: player[] }
      worldSeed: 0,

      // ── Actions ─────────────────────────────────────────────────────────────

      startNewGame(coachName, profileId, seed) {
        const profile = STARTING_PROFILES.find(p => p.id === profileId) || STARTING_PROFILES[0]
        const s = seed || Date.now()
        const clubs = initClubs(s)
        const freeAgents = generateFreeAgents(s)

        const rand = rng(s + 1)
        const nonPremier = clubs.filter(c => c.leagueId !== 'liga-premier')

        // Guaranteed vacancies: pick from clubs accessible to this profile
        const guaranteePool = nonPremier
          .filter(c => c.prestige <= profile.guaranteePrestigeMax)
          .sort(() => rand() - 0.5)
        const guaranteedIds = new Set(guaranteePool.slice(0, profile.guaranteeCount).map(c => c.id))

        // Random additional vacancies from remaining non-premier clubs
        const remaining = nonPremier.filter(c => !guaranteedIds.has(c.id))
        const randomVacant = [...remaining].sort(() => rand() - 0.5).slice(0, 5)
        randomVacant.forEach(c => guaranteedIds.add(c.id))

        const clubsWithManagers = clubs.map(c => ({
          ...c,
          managerId: guaranteedIds.has(c.id) ? null : `ai-${c.id}`,
        }))

        const leagueState = buildLeagueState(clubsWithManagers)

        set({
          hasGame: true,
          screen: 'unemployed',
          activeTab: 'home',
          season: 1,
          clubs: clubsWithManagers,
          freeAgents,
          leagues: leagueState,
          worldLeagues: buildWorldLeagueState(),
          worldInitialized: true,
          detailedCountryId: 'argentina',
          continentalCups: { europa: null, sudamerica: null, norteamerica: null },
          worldCup: null,
          currentJob: null,
          foreignLeague: null,
          events: [],
          notifications: [],
          coachInterest: null,
          lifeEvents: [],
          lastLifeEventMd: 0,
          matchReport: null,
          liveMatch: null,
          pendingCupResult: null,
          seasonEndData: null,
          preseasonFriendlyResults: [],
          preseasonFocusDraft: 'ninguno',
          celebrations: [],
          pressHeadlines: [],
          pressConference: null,
          lastConferenceMd: 0,
          transferOffers: [],
          aiTransferLog: [],
          transferWindowRan: { verano: false, invierno: false },
          contractNegotiation: null,
          marketRumors: [],
          pendingMarketIntentions: [],
          worldHistory: { titles: [], movements: [], awards: [], records: {} },
          lastDtMesMd: 0,
          worldClubSquads: {},
          worldSeed: s + 999983,
          coach: {
            name: coachName,
            reputation: profile.startRep,
            money: profile.startMoney,
            totalMatches: 0,
            totalWins: 0,
            totalDraws: 0,
            totalLosses: 0,
            seasonsManaged: 0,
            jobHistory: [],
            trophies: [],
          },
        })
      },

      acceptJob(clubId) {
        const { clubs, coach, season } = get()

        // ── Camino argentino ──────────────────────────────────────────────────
        const argIdx = clubs.findIndex(c => c.id === clubId)
        if (argIdx !== -1) {
          const club = clubs[argIdx]
          const objective = getObjective(club, club.leagueId)
          const salary = Math.floor(club.prestige * 850 + 5000)
          const updatedClubs = clubs.map(c =>
            c.id === clubId
              ? { ...c, managerId: 'player', finances: c.finances || blankFinances(season) }
              : c
          )
          set({
            clubs: updatedClubs,
            foreignLeague: null,
            screen: 'dashboard',
            activeTab: 'home',
            currentJob: { clubId, objective, boardConfidence: 60, salary, contractEndSeason: season + 1 },
            events: [{ id: Date.now(), text: `Contratado como DT de ${club.name}`, type: 'success' }],
          })
          return
        }

        // ── Camino club del mundo ─────────────────────────────────────────────
        const worldClub = WORLD_CLUBS.find(c => c.id === clubId)
        if (!worldClub) return

        const rand = rng(Date.now() + worldClub.prestige * 37)
        const squad = generateSquad(clubId, worldClub.prestige, rand, worldClub.countryId)

        const wl = WORLD_LEAGUES.find(l => l.id === worldClub.leagueId)
        const tierMult = wl?.tier === 1 ? 2.5 : 1.0
        const budget = Math.floor(worldClub.prestige * 2000 * tierMult + 200_000)

        const fullWorldClub = {
          ...worldClub, squad,
          formation: '4-4-2', morale: 65,
          managerId: 'player', starters: [],
          tactics: { ...DEFAULT_TACTICS },
          youthSquad: [], youthCounter: 0,
          budget, finances: blankFinances(season),
        }

        const leagueClubIds = WORLD_CLUBS.filter(c => c.leagueId === worldClub.leagueId).map(c => c.id)
        const schedule = generateSchedule(leagueClubIds)
        const worldLeagueFull = { ...wl, teams: leagueClubIds.length }
        const objective = getObjective(fullWorldClub, worldClub.leagueId, worldLeagueFull)
        const salary = Math.floor(worldClub.prestige * 850 + 5000)

        set({
          clubs: [...clubs, fullWorldClub],
          foreignLeague: { leagueId: worldClub.leagueId, schedule, currentMatchday: 0, totalMatchdays: schedule.length, completed: false },
          screen: 'dashboard',
          activeTab: 'home',
          currentJob: { clubId, objective, boardConfidence: 60, salary, contractEndSeason: season + 1 },
          events: [{ id: Date.now(), text: `Contratado como DT de ${worldClub.name}`, type: 'success' }],
        })
      },

      resignJob() {
        const { clubs, coach, currentJob, season, foreignLeague } = get()
        if (!currentJob) return

        const club = clubs.find(c => c.id === currentJob.clubId)
        const isWorldJob = !!foreignLeague
        let updatedClubs = clubs.map(c =>
          c.id === currentJob.clubId ? { ...c, managerId: null } : c
        )
        if (isWorldJob) updatedClubs = updatedClubs.filter(c => c.id !== currentJob.clubId)

        // Renunciar con la confianza ya por el piso paga lo mismo (o más) que
        // dejarte despedir (-8 a mitad de temporada, -5 a fin de temporada) —
        // si no, renunciar preventivamente sería siempre la salida más barata,
        // el mismo escape que el cooldown de arriba busca cerrar.
        const confBefore = currentJob.boardConfidence
        const repPenalty = confBefore < 15 ? 8 : confBefore < 30 ? 6 : 4
        const newRep = clamp(coach.reputation - repPenalty, 0, 100)

        set({
          clubs: updatedClubs,
          foreignLeague: null,
          currentJob: null,
          screen: 'unemployed',
          activeTab: 'home',
          coach: {
            ...coach,
            reputation: newRep,
            jobHistory: [
              ...coach.jobHistory,
              { clubId: currentJob.clubId, clubName: club?.name, season, resigned: true },
            ],
          },
          events: [{ id: Date.now(), text: 'Renunciaste al cargo', type: 'warn' }],
        })
      },

      respondPressConference(optionIndex) {
        const { pressConference, currentJob, clubs, coach } = get()
        if (!pressConference) return
        const conf = PRESS_CONFERENCES[pressConference.type]
        if (!conf) { set({ pressConference: null }); return }
        const opt = conf.options[optionIndex]
        if (!opt) return

        const { boardConfidenceDelta, moraleDelta, reputationDelta } = opt

        let newJob = currentJob
        if (currentJob && boardConfidenceDelta !== 0) {
          newJob = {
            ...currentJob,
            boardConfidence: clamp(currentJob.boardConfidence + boardConfidenceDelta, 0, 100),
          }
        }

        let updatedClubs = clubs
        if (currentJob && moraleDelta !== 0) {
          updatedClubs = clubs.map(c =>
            c.id === currentJob.clubId
              ? { ...c, morale: clamp(c.morale + moraleDelta, 20, 100) }
              : c
          )
        }

        let newCoach = coach
        if (reputationDelta !== 0) {
          newCoach = { ...coach, reputation: clamp(coach.reputation + reputationDelta, 0, 100) }
        }

        // Build result toast
        const parts = []
        if (boardConfidenceDelta > 0) parts.push(`Confianza +${boardConfidenceDelta}`)
        if (boardConfidenceDelta < 0) parts.push(`Confianza ${boardConfidenceDelta}`)
        if (moraleDelta > 0) parts.push(`Moral +${moraleDelta}`)
        if (moraleDelta < 0) parts.push(`Moral ${moraleDelta}`)
        if (reputationDelta > 0) parts.push(`Rep +${reputationDelta}`)
        if (reputationDelta < 0) parts.push(`Rep ${reputationDelta}`)
        const evText = parts.length ? parts.join(' · ') : 'Declaraciones sin efecto inmediato'
        const evType = boardConfidenceDelta >= 3 ? 'success' : boardConfidenceDelta <= -3 ? 'danger' : 'info'

        set({
          pressConference: null,
          currentJob: newJob,
          clubs: updatedClubs,
          coach: newCoach,
          events: [{ id: Date.now(), text: evText, type: evType }],
        })
      },

      setFormation(formation) {
        const { clubs, currentJob } = get()
        if (!currentJob) return
        set({
          clubs: clubs.map(c =>
            c.id === currentJob.clubId ? { ...c, formation, starters: [] } : c
          ),
        })
      },

      setLineup(starters) {
        const { clubs, currentJob } = get()
        if (!currentJob) return
        set({
          clubs: clubs.map(c =>
            c.id === currentJob.clubId ? { ...c, starters } : c
          ),
        })
      },

      // Estilo de juego — instrucciones tácticas persistentes (Mentalidad,
      // Presión, Ritmo, Ataque). `partial` es un merge parcial, ej.
      // setTactics({ pressing: 'alta' }) toca solo ese eje.
      setTactics(partial) {
        const { clubs, currentJob } = get()
        if (!currentJob) return
        set({
          clubs: clubs.map(c =>
            c.id === currentJob.clubId
              ? { ...c, tactics: { ...(c.tactics || DEFAULT_TACTICS), ...partial } }
              : c
          ),
        })
      },

      // Cantera — sube un juvenil de youthSquad a squad (mismo id/clubId).
      // A partir de acá es un jugador de plantel más: seleccionable en
      // táctica/alineación, vendible en el mercado, elegible para partidos —
      // sin wiring adicional en ningún otro lado.
      promoteYouthPlayer(playerId) {
        const { clubs, currentJob } = get()
        if (!currentJob) return
        const club = clubs.find(c => c.id === currentJob.clubId)
        const player = club?.youthSquad?.find(p => p.id === playerId)
        if (!player) return
        const promoted = { ...player, contract: assignInitialContract(player) }
        set({
          clubs: clubs.map(c =>
            c.id === currentJob.clubId
              ? {
                  ...c,
                  squad: [...c.squad, promoted],
                  youthSquad: c.youthSquad.filter(p => p.id !== playerId),
                }
              : c
          ),
          events: [{ id: Date.now(), text: `¡${player.name} subió al primer equipo!`, type: 'success' }],
        })
      },

      // ── Contratos: renovación negociada ───────────────────────────────────
      // Abre la negociación con el pedido inicial del jugador (calcAskingWage/
      // calcAskingYears, coherente con su nivel/edad/moral). No hay plazo de
      // espera — se puede renovar en cualquier momento, no solo en el último
      // año de contrato.
      openContractRenewal(playerId) {
        const { clubs, currentJob } = get()
        if (!currentJob) return
        const club = clubs.find(c => c.id === currentJob.clubId)
        const player = club?.squad.find(p => p.id === playerId)
        if (!player || !player.contract) return
        set({
          contractNegotiation: {
            playerId,
            clubId: club.id,
            askWage: calcAskingWage(player),
            askYears: calcAskingYears(player),
            round: 1,
            maxRounds: 3,
          },
        })
      },

      // action: 'accept' (al pedido actual del jugador) | 'counter' (con
      // offerWage/offerYears propios) | 'reject' (corta la negociación, el
      // jugador sigue con su contrato viejo). Mismo patrón de rondas que
      // respondToOutgoingOffer (mercado): tope de rondas fuerza a
      // aceptar-o-rechazar, computePlayerContractResponse decide si el
      // jugador acepta, contraoferta o corta.
      respondContractNegotiation(action, offerWage, offerYears) {
        const { clubs, currentJob, contractNegotiation } = get()
        if (!contractNegotiation || !currentJob) return
        const club = clubs.find(c => c.id === currentJob.clubId)
        const player = club?.squad.find(p => p.id === contractNegotiation.playerId)
        if (!player) { set({ contractNegotiation: null }); return }

        const finalizeContract = (wage, years) => {
          // +1: la cuenta regresiva de contrato descuenta un año una sola vez
          // por temporada (en el fin de temporada), sin importar en qué
          // momento del año renovaste. Si el jugador ya estaba en yearsLeft:1
          // y firmás "1 año más", sin este +1 quedaría con yearsLeft:1 de
          // nuevo — el mismo valor que tenía antes de renovar — y se iría
          // gratis en el mismo límite de temporada como si nunca hubieras
          // renovado. El +1 asegura que renovar siempre compre al menos una
          // temporada completa de aire, sin cambiar lo que el jugador pidió.
          const updatedClubs = clubs.map(c =>
            c.id === currentJob.clubId
              ? { ...c, squad: c.squad.map(p => p.id === player.id ? { ...p, contract: { yearsLeft: years + 1, wage } } : p) }
              : c
          )
          set({
            clubs: updatedClubs,
            contractNegotiation: null,
            events: [{ id: Date.now(), text: `Renovaste a ${player.name} por ${years} año${years > 1 ? 's' : ''} a $${wage}/jornada`, type: 'success' }],
          })
        }

        if (action === 'accept') {
          finalizeContract(contractNegotiation.askWage, contractNegotiation.askYears)
          return
        }
        if (action === 'reject') {
          set({ contractNegotiation: null })
          return
        }

        if (contractNegotiation.round >= contractNegotiation.maxRounds) {
          set({
            contractNegotiation: null,
            events: [{ id: Date.now(), text: `${player.name} se cansó de negociar — sigue con su contrato actual`, type: 'warn' }],
          })
          return
        }

        const { decision, counterWage, counterYears } = computePlayerContractResponse(
          offerWage, offerYears, contractNegotiation.askWage, contractNegotiation.askYears
        )

        if (decision === 'accepted') {
          finalizeContract(offerWage, offerYears)
        } else if (decision === 'rejected') {
          set({
            contractNegotiation: null,
            events: [{ id: Date.now(), text: `${player.name} rechazó tu oferta y cortó la negociación`, type: 'warn' }],
          })
        } else {
          set({
            contractNegotiation: { ...contractNegotiation, askWage: counterWage, askYears: counterYears, round: contractNegotiation.round + 1 },
          })
        }
      },

      // ── Live match (player's own fixture, played minute by minute) ───────────

      startLiveMatch() {
        const { currentJob, clubs } = get()
        if (!currentJob) return
        const club = clubs.find(c => c.id === currentJob.clubId)
        if (!club) return
        const fixture = get().getUpcomingMatches(currentJob.clubId, 1)[0]
        if (!fixture) return

        const isPlayerHome = fixture.homeId === currentJob.clubId
        const opponentId = isPlayerHome ? fixture.awayId : fixture.homeId
        const opponentClub = resolveLiveClub(opponentId, clubs)
        if (!opponentClub) return

        const homeClub = isPlayerHome ? club : opponentClub
        const awayClub = isPlayerHome ? opponentClub : club
        const base = createLiveMatch(homeClub, awayClub, isPlayerHome)
        set({ liveMatch: { ...base, homeClubId: homeClub.id, awayClubId: awayClub.id } })
      },

      // ── Live match for the player's own continental-cup fixture ──────────────
      // Same engine as startLiveMatch/commitLiveMatch (tickLiveMatch, applyLiveSub,
      // setLiveMentality all work unchanged — they only look at homeClubId/awayClubId/
      // playerSide). The fixture comes from getPendingCupMatch() instead of the
      // league schedule.
      startCupLiveMatch() {
        const { currentJob, clubs } = get()
        if (!currentJob) return
        const pending = get().getPendingCupMatch()
        if (!pending) return
        const club = clubs.find(c => c.id === currentJob.clubId)
        if (!club) return

        const isPlayerHome = pending.isPlayerHome
        const opponentClub = resolveLiveClub(pending.opponentId, clubs)
        if (!opponentClub) return

        const homeClub = isPlayerHome ? club : opponentClub
        const awayClub = isPlayerHome ? opponentClub : club
        const base = createLiveMatch(homeClub, awayClub, isPlayerHome)
        set({ liveMatch: { ...base, homeClubId: homeClub.id, awayClubId: awayClub.id, kind: 'cup', continentId: pending.continentId, competitionName: pending.competitionName } })
      },

      tickLiveMatch(minutes = 1) {
        const { liveMatch, clubs, worldClubSquads } = get()
        if (!liveMatch || liveMatch.finished) return
        const homeClub = resolveLiveClub(liveMatch.homeClubId, clubs, worldClubSquads)
        const awayClub = resolveLiveClub(liveMatch.awayClubId, clubs, worldClubSquads)
        if (!homeClub || !awayClub) return

        let next = liveMatch
        for (let i = 0; i < minutes && !next.finished; i++) {
          next = simulateLiveMinute(next, homeClub, awayClub)
        }
        set({ liveMatch: next })
      },

      applyLiveSub(outId, inId) {
        const { liveMatch, clubs, worldClubSquads } = get()
        if (!liveMatch) return
        const playerClubId = liveMatch.playerSide === 'home' ? liveMatch.homeClubId : liveMatch.awayClubId
        const playerClub = resolveLiveClub(playerClubId, clubs, worldClubSquads)
        const homeClub = resolveLiveClub(liveMatch.homeClubId, clubs, worldClubSquads)
        const awayClub = resolveLiveClub(liveMatch.awayClubId, clubs, worldClubSquads)
        if (!playerClub || !homeClub || !awayClub) return
        set({ liveMatch: engineApplyLiveSub(liveMatch, playerClub, outId, inId, homeClub, awayClub) })
      },

      setLiveMentality(mentality) {
        const { liveMatch, clubs, worldClubSquads } = get()
        if (!liveMatch) return
        const homeClub = resolveLiveClub(liveMatch.homeClubId, clubs, worldClubSquads)
        const awayClub = resolveLiveClub(liveMatch.awayClubId, clubs, worldClubSquads)
        if (!homeClub || !awayClub) return
        set({ liveMatch: engineSetLiveMentality(liveMatch, mentality, homeClub, awayClub) })
      },

      commitLiveMatch() {
        const { liveMatch, currentJob } = get()
        if (!liveMatch || !liveMatch.finished || !currentJob) return
        const playerLineup = liveMatch.playerSide === 'home' ? liveMatch.homeLineup : liveMatch.awayLineup
        const cleanLineup = playerLineup.filter(id => id != null)
        if (cleanLineup.length === 11) {
          get().setLineup(cleanLineup)
        }
        const liveResult = {
          homeGoals: liveMatch.homeGoals,
          awayGoals: liveMatch.awayGoals,
          cardEvents: liveMatch.cardEvents,
          scorers: liveMatch.scorers,
        }
        set({ liveMatch: null })
        get().simulateMatchday(liveResult)
      },

      // Unlike commitLiveMatch, this does NOT call simulateMatchday directly —
      // the cup fixture is staged in pendingCupResult so the player still gets
      // to resolve their league fixture (quick or live) afterward; whichever
      // one triggers simulateMatchday() picks up pendingCupResult automatically.
      commitCupLiveMatch() {
        const { liveMatch, currentJob } = get()
        if (!liveMatch || !liveMatch.finished || !currentJob || liveMatch.kind !== 'cup') return
        const playerLineup = liveMatch.playerSide === 'home' ? liveMatch.homeLineup : liveMatch.awayLineup
        const cleanLineup = playerLineup.filter(id => id != null)
        if (cleanLineup.length === 11) {
          get().setLineup(cleanLineup)
        }
        const homeScorers = liveMatch.scorers.filter(e => e.side === 'home').map(e => ({ scorerId: e.scorerId, scorerName: e.scorerName, assistId: e.assistId, assistName: e.assistName }))
        const awayScorers = liveMatch.scorers.filter(e => e.side === 'away').map(e => ({ scorerId: e.scorerId, scorerName: e.scorerName, assistId: e.assistId, assistName: e.assistName }))
        const playerClubId = liveMatch.playerSide === 'home' ? liveMatch.homeClubId : liveMatch.awayClubId
        set({
          liveMatch: null,
          pendingCupResult: {
            continentId: liveMatch.continentId,
            clubId: playerClubId,
            homeGoals: liveMatch.homeGoals,
            awayGoals: liveMatch.awayGoals,
            homeScorers, awayScorers,
            cardEvents: liveMatch.cardEvents,
          },
        })
      },

      // ── Amistosos de pretemporada ─────────────────────────────────────────
      // No tocan leagues/reputación/confianza/historia en ningún punto — ni
      // el modo rápido ni el modo en vivo llaman a simulateMatchday(). Tampoco
      // generan lesiones/tarjetas (no llaman a generateMatchEvents): son de
      // prueba, no cuentan para nada. Solo dan un empujoncito chico de moral.
      getPreseasonFriendlyOpponents() {
        const { currentJob, clubs, foreignLeague } = get()
        if (!currentJob) return []
        const myClub = clubs.find(c => c.id === currentJob.clubId)
        if (!myClub) return []
        const isWorldJob = !!foreignLeague && !LEAGUES.find(l => l.id === myClub.leagueId)
        const pool = isWorldJob
          ? WORLD_CLUBS.filter(c => c.leagueId === myClub.leagueId && c.id !== myClub.id)
          : clubs.filter(c => c.leagueId === myClub.leagueId && c.id !== myClub.id)
        return pool
          .slice()
          .sort((a, b) => Math.abs(a.prestige - myClub.prestige) - Math.abs(b.prestige - myClub.prestige))
          .slice(0, 5)
          .map(c => ({ id: c.id, name: c.name, prestige: c.prestige }))
      },

      // Resuelve el rival de un amistoso con su plantel real: si es doméstico
      // ya lo tiene, si es del exterior lo asegura vía ensureWorldClubSquad
      // (mismo helper que usa el mercado) antes de componerlo.
      _resolveFriendlyOpponent(opponentId) {
        const { clubs } = get()
        const domestic = clubs.find(c => c.id === opponentId)
        if (domestic) return domestic
        const worldClub = WORLD_CLUBS.find(c => c.id === opponentId)
        if (!worldClub) return null
        get().ensureWorldClubSquad(opponentId)
        const squad = get().worldClubSquads[opponentId] || []
        return { ...worldClub, squad }
      },

      playPreseasonFriendlyQuick(opponentId) {
        const { screen, currentJob, clubs, preseasonFriendlyResults } = get()
        if (screen !== 'preseason' || !currentJob) return
        if ((preseasonFriendlyResults || []).length >= 3) return
        const myClub = clubs.find(c => c.id === currentJob.clubId)
        const opponent = get()._resolveFriendlyOpponent(opponentId)
        if (!myClub || !opponent) return

        const { homeGoals, awayGoals } = simulateMatch(myClub, opponent)
        const moraleDelta = homeGoals > awayGoals ? 4 : homeGoals === awayGoals ? 1 : -5
        const result = { id: Date.now(), opponentId, opponentName: opponent.name, homeGoals, awayGoals }
        set({
          clubs: get().clubs.map(c => c.id === myClub.id ? { ...c, morale: clamp(c.morale + moraleDelta, 20, 100) } : c),
          preseasonFriendlyResults: [...(preseasonFriendlyResults || []), result],
        })
      },

      startPreseasonFriendlyLive(opponentId) {
        const { screen, currentJob, clubs, preseasonFriendlyResults } = get()
        if (screen !== 'preseason' || !currentJob) return
        if ((preseasonFriendlyResults || []).length >= 3) return
        const myClub = clubs.find(c => c.id === currentJob.clubId)
        const opponent = get()._resolveFriendlyOpponent(opponentId)
        if (!myClub || !opponent) return

        const base = createLiveMatch(myClub, opponent, true)
        set({ liveMatch: { ...base, homeClubId: myClub.id, awayClubId: opponent.id, kind: 'friendly' } })
      },

      commitPreseasonFriendly() {
        const { liveMatch, currentJob, preseasonFriendlyResults } = get()
        if (!liveMatch || !liveMatch.finished || !currentJob || liveMatch.kind !== 'friendly') return
        const { homeGoals, awayGoals, awayClubId } = liveMatch
        const opponent = get()._resolveFriendlyOpponent(awayClubId)
        const moraleDelta = homeGoals > awayGoals ? 4 : homeGoals === awayGoals ? 1 : -5
        const result = { id: Date.now(), opponentId: awayClubId, opponentName: opponent?.name || '', homeGoals, awayGoals }
        set({
          liveMatch: null,
          clubs: get().clubs.map(c => c.id === currentJob.clubId ? { ...c, morale: clamp(c.morale + moraleDelta, 20, 100) } : c),
          preseasonFriendlyResults: [...(preseasonFriendlyResults || []), result],
        })
      },

      initWorld() {
        if (get().worldInitialized) return
        set({ worldLeagues: buildWorldLeagueState(), worldInitialized: true, detailedCountryId: 'argentina' })
      },

      // ── Planteles de clubes del mundo (bajo demanda) ─────────────────────────
      // No genera nada de más: si ya está en caché, no-op. El seed combina
      // worldSeed (fijo por partida) + hash del clubId, así el plantel de cada
      // club es estable dentro de esta partida pero distinto entre partidas.
      ensureWorldClubSquad(clubId) {
        const { worldClubSquads, worldSeed } = get()
        if (worldClubSquads[clubId]) return
        const worldClub = WORLD_CLUBS.find(c => c.id === clubId)
        if (!worldClub) return
        const rand = rng(worldSeed + hashClubId(clubId))
        const squad = generateSquad(clubId, worldClub.prestige, rand, worldClub.countryId)
        set({ worldClubSquads: { ...worldClubSquads, [clubId]: squad } })
      },

      // Igual que ensureWorldClubSquad pero para TODOS los clubes de una liga
      // en un solo set() — evita el O(n²) de armar el spread de worldClubSquads
      // club por club (usado por los filtros de Fichar y por el selector de
      // goleadores al elegir una liga del mundo). Determinístico e idéntico
      // en resultado a llamar ensureWorldClubSquad club por club.
      ensureWorldLeagueSquads(leagueId) {
        const { worldClubSquads, worldSeed } = get()
        const lgClubs = WORLD_CLUBS.filter(c => c.leagueId === leagueId)
        const missing = lgClubs.filter(c => !worldClubSquads[c.id])
        if (!missing.length) return
        const additions = {}
        missing.forEach(c => {
          const rand = rng(worldSeed + hashClubId(c.id))
          additions[c.id] = generateSquad(c.id, c.prestige, rand, c.countryId)
        })
        set({ worldClubSquads: { ...worldClubSquads, ...additions } })
      },

      buyPlayer(playerId) {
        const { clubs, freeAgents, currentJob, leagues, foreignLeague } = get()
        if (!currentJob) return
        const clubIdx = clubs.findIndex(c => c.id === currentJob.clubId)
        if (clubIdx === -1) return
        const club = clubs[clubIdx]
        const activeLg = foreignLeague || leagues[club.leagueId]
        if (activeLg) {
          const win = getTransferWindow(activeLg.currentMatchday, activeLg.totalMatchdays)
          if (!win.open) { set({ events: [{ id: Date.now(), text: 'El mercado está cerrado', type: 'warn' }] }); return }
        }
        const player = freeAgents.find(p => p.id === playerId)
        if (!player) return
        if (club.budget < player.value || club.budget < 0) return

        const signedPlayer = { ...player, clubId: club.id, contract: assignInitialContract(player) }
        const updatedClubs = clubs.map(c =>
          c.id === currentJob.clubId
            ? { ...c, budget: c.budget - player.value, squad: [...c.squad, signedPlayer] }
            : c
        )
        const updatedFree = freeAgents.filter(p => p.id !== playerId)
        set({ clubs: updatedClubs, freeAgents: updatedFree })
      },

      sellPlayer(playerId) {
        const { clubs, freeAgents, currentJob } = get()
        if (!currentJob) return
        const clubIdx = clubs.findIndex(c => c.id === currentJob.clubId)
        if (clubIdx === -1) return
        const club = clubs[clubIdx]
        const player = club.squad.find(p => p.id === playerId)
        if (!player) return
        if (club.squad.length <= 14) return // min squad size

        const updatedClubs = clubs.map(c =>
          c.id === currentJob.clubId
            ? {
                ...c,
                budget: c.budget + player.value,
                squad: c.squad.filter(p => p.id !== playerId),
                starters: (c.starters || []).filter(id => id !== playerId),
              }
            : c
        )
        const releasedPlayer = { ...player, clubId: null }
        set({ clubs: updatedClubs, freeAgents: [...freeAgents, releasedPlayer] })
      },

      // ── Transfer market actions ──────────────────────────────────────────────

      makeTransferOffer(targetClubId, playerId, amount) {
        const { clubs, freeAgents, currentJob, leagues, foreignLeague, season, transferOffers, worldClubSquads } = get()
        if (!currentJob) return
        const myClub = clubs.find(c => c.id === currentJob.clubId)
        if (!myClub) return

        const activeLg = foreignLeague || leagues[myClub.leagueId]
        if (!activeLg) return
        const win = getTransferWindow(activeLg.currentMatchday, activeLg.totalMatchdays)
        if (!win.open) {
          set({ events: [{ id: Date.now(), text: 'El mercado está cerrado', type: 'warn' }] }); return
        }
        if (myClub.budget < amount) {
          set({ events: [{ id: Date.now(), text: 'Presupuesto insuficiente', type: 'warn' }] }); return
        }

        const { club: sellerClub, isWorld } = resolveMarketSeller(targetClubId, clubs, worldClubSquads)
        if (!sellerClub) return
        const player = sellerClub.squad.find(p => p.id === playerId)
        if (!player) return

        const { decision, counterAmount, reason } = computeAIResponse(player, sellerClub, myClub, amount)

        if (decision === 'accepted') {
          const result = isWorld
            ? doTransferFromWorld(clubs, worldClubSquads, currentJob.clubId, targetClubId, player, amount)
            : { clubs: doTransfer(clubs, currentJob.clubId, targetClubId, player, amount), worldClubSquads }
          set({
            clubs: result.clubs,
            worldClubSquads: result.worldClubSquads,
            events: [{ id: Date.now(), text: `¡Fichaje cerrado! ${player.name} llega por $${Math.round(amount / 1000)}k`, type: 'success' }],
          })
        } else if (decision === 'rejected') {
          const msg = reason === 'plantel mínimo'
            ? `${sellerClub.name} no puede vender — plantel mínimo`
            : reason === 'oferta irrisoria'
            ? `${sellerClub.name} rechazó la oferta — demasiado baja`
            : `${sellerClub.name} rechazó la oferta por ${player.name}`
          set({ events: [{ id: Date.now(), text: msg, type: 'warn' }] })
        } else {
          const offer = {
            id: `out-${Date.now()}`,
            type: 'outgoing',
            fromClubId: currentJob.clubId,
            toClubId: targetClubId,
            toClubName: sellerClub.name,
            playerId,
            playerName: player.name,
            playerSkill: player.skill,
            playerPos: player.position,
            amount,
            counterAmount,
            status: 'countered',
            round: 1,
            season,
          }
          set({
            transferOffers: [...transferOffers, offer],
            events: [{ id: Date.now(), text: `${sellerClub.name} pide $${Math.round(counterAmount / 1000)}k por ${player.name}`, type: 'info' }],
          })
        }
      },

      respondToOutgoingOffer(offerId, decision, newAmount) {
        const { transferOffers, clubs, currentJob, season, worldClubSquads } = get()
        const offer = transferOffers.find(o => o.id === offerId)
        if (!offer || offer.type !== 'outgoing') return
        const remove = () => set({ transferOffers: transferOffers.filter(o => o.id !== offerId) })

        if (decision === 'accept') {
          const myClub = clubs.find(c => c.id === currentJob?.clubId)
          if (!myClub || myClub.budget < offer.counterAmount) {
            set({ events: [{ id: Date.now(), text: 'Presupuesto insuficiente para aceptar', type: 'warn' }] }); return
          }
          const { club: sellerClub, isWorld } = resolveMarketSeller(offer.toClubId, clubs, worldClubSquads)
          const player = sellerClub?.squad.find(p => p.id === offer.playerId)
          if (!player) { remove(); return }
          const result = isWorld
            ? doTransferFromWorld(clubs, worldClubSquads, currentJob.clubId, offer.toClubId, player, offer.counterAmount)
            : { clubs: doTransfer(clubs, currentJob.clubId, offer.toClubId, player, offer.counterAmount), worldClubSquads }
          set({
            clubs: result.clubs,
            worldClubSquads: result.worldClubSquads,
            transferOffers: transferOffers.filter(o => o.id !== offerId),
            events: [{ id: Date.now(), text: `¡Fichaje cerrado! ${offer.playerName} por $${Math.round(offer.counterAmount / 1000)}k`, type: 'success' }],
          })
        } else if (decision === 'reject') {
          remove()
        } else if (decision === 'counter' && newAmount) {
          if (offer.round >= 3) {
            remove()
            set({ events: [{ id: Date.now(), text: 'Límite de rondas alcanzado — negociación cerrada', type: 'warn' }] }); return
          }
          const myClub = clubs.find(c => c.id === currentJob?.clubId)
          if (!myClub || myClub.budget < newAmount) {
            set({ events: [{ id: Date.now(), text: 'Presupuesto insuficiente', type: 'warn' }] }); return
          }
          const { club: sellerClub, isWorld } = resolveMarketSeller(offer.toClubId, clubs, worldClubSquads)
          const player = sellerClub?.squad.find(p => p.id === offer.playerId)
          if (!player || !sellerClub) { remove(); return }

          const { decision: aiDecision, counterAmount: newCounter } = computeAIResponse(player, sellerClub, myClub, newAmount)
          const finalRound = offer.round >= 2

          if (aiDecision === 'accepted' || (finalRound && aiDecision === 'countered')) {
            const finalAmount = aiDecision === 'accepted' ? newAmount : (newCounter || newAmount)
            if (myClub.budget < finalAmount) {
              set({ events: [{ id: Date.now(), text: 'Presupuesto insuficiente', type: 'warn' }] }); return
            }
            const result = isWorld
              ? doTransferFromWorld(clubs, worldClubSquads, currentJob.clubId, offer.toClubId, player, finalAmount)
              : { clubs: doTransfer(clubs, currentJob.clubId, offer.toClubId, player, finalAmount), worldClubSquads }
            set({
              clubs: result.clubs,
              worldClubSquads: result.worldClubSquads,
              transferOffers: transferOffers.filter(o => o.id !== offerId),
              events: [{ id: Date.now(), text: `¡Fichaje cerrado! ${offer.playerName} por $${Math.round(finalAmount / 1000)}k`, type: 'success' }],
            })
          } else if (aiDecision === 'rejected') {
            set({
              transferOffers: transferOffers.filter(o => o.id !== offerId),
              events: [{ id: Date.now(), text: `${sellerClub.name} rechazó definitivamente la oferta`, type: 'warn' }],
            })
          } else {
            set({
              transferOffers: transferOffers.map(o => o.id !== offerId ? o : { ...o, amount: newAmount, counterAmount: newCounter, round: o.round + 1 }),
              events: [{ id: Date.now(), text: `${sellerClub.name} pide $${Math.round(newCounter / 1000)}k`, type: 'info' }],
            })
          }
        }
      },

      respondToIncomingOffer(offerId, decision, newAmount) {
        const { transferOffers, clubs, currentJob } = get()
        const offer = transferOffers.find(o => o.id === offerId)
        if (!offer || offer.type !== 'incoming') return
        const remove = () => set({ transferOffers: transferOffers.filter(o => o.id !== offerId) })

        if (decision === 'accept') {
          const myClub = clubs.find(c => c.id === currentJob?.clubId)
          if (!myClub) return
          if (myClub.squad.length <= 14) {
            set({ events: [{ id: Date.now(), text: 'No podés vender — plantel mínimo 14', type: 'warn' }] }); return
          }
          const player = myClub.squad.find(p => p.id === offer.playerId)
          if (!player) { remove(); return }
          set({
            clubs: doTransfer(clubs, offer.fromClubId, currentJob.clubId, player, offer.amount),
            transferOffers: transferOffers.filter(o => o.id !== offerId),
            events: [{ id: Date.now(), text: `${offer.playerName} vendido a ${offer.fromClubName} por $${Math.round(offer.amount / 1000)}k`, type: 'success' }],
          })
        } else if (decision === 'reject') {
          remove()
        } else if (decision === 'counter' && newAmount) {
          const myClub = clubs.find(c => c.id === currentJob?.clubId)
          const player = myClub?.squad.find(p => p.id === offer.playerId)
          const buyerClub = clubs.find(c => c.id === offer.fromClubId)
          if (!player) { remove(); return }

          const value = calcTransferValue(player)
          const ratio = newAmount / value
          const buyerCanAfford = !buyerClub || buyerClub.budget >= newAmount
          const aiAccepts = buyerCanAfford && (
            ratio <= 1.10 ? Math.random() < 0.70 :
            ratio <= 1.25 ? Math.random() < 0.30 :
            Math.random() < 0.08
          )

          if (aiAccepts) {
            if (!myClub || myClub.squad.length <= 14) { remove(); return }
            set({
              clubs: doTransfer(clubs, offer.fromClubId, currentJob.clubId, player, newAmount),
              transferOffers: transferOffers.filter(o => o.id !== offerId),
              events: [{ id: Date.now(), text: `${offer.playerName} vendido por $${Math.round(newAmount / 1000)}k`, type: 'success' }],
            })
          } else {
            const reason = !buyerCanAfford ? 'no tiene presupuesto' : 'rechazó tu precio'
            set({
              transferOffers: transferOffers.filter(o => o.id !== offerId),
              events: [{ id: Date.now(), text: `${offer.fromClubName || 'El club'} ${reason} — negociación cerrada`, type: 'warn' }],
            })
          }
        }
      },

      dismissOffer(offerId) {
        set({ transferOffers: get().transferOffers.filter(o => o.id !== offerId) })
      },

      // ── Vender al exterior — oferta simple (sin rondas de negociación) ───────
      // Reutiliza la MISMA heurística de aceptación que respondToIncomingOffer
      // usa para decidir si el comprador acepta tu contraoferta (ratio precio/
      // valor). Los clubes del mundo no tienen presupuesto simulado, así que
      // no se chequea si "pueden pagar" — siempre pueden, como cualquier rival
      // de mundo hoy (solo tienen .strength, no finanzas propias).
      offerPlayerToWorldClub(playerId, targetClubId, amount) {
        const { clubs, currentJob, leagues, foreignLeague, worldClubSquads } = get()
        if (!currentJob) return
        const myClub = clubs.find(c => c.id === currentJob.clubId)
        if (!myClub) return
        if (myClub.squad.length <= 14) {
          set({ events: [{ id: Date.now(), text: 'No podés vender — plantel mínimo 14', type: 'warn' }] }); return
        }
        const activeLg = foreignLeague || leagues[myClub.leagueId]
        if (!activeLg) return
        const win = getTransferWindow(activeLg.currentMatchday, activeLg.totalMatchdays)
        if (!win.open) {
          set({ events: [{ id: Date.now(), text: 'El mercado está cerrado', type: 'warn' }] }); return
        }
        const player = myClub.squad.find(p => p.id === playerId)
        if (!player) return
        const worldClub = WORLD_CLUBS.find(c => c.id === targetClubId)
        if (!worldClub) return

        const value = calcTransferValue(player)
        const ratio = amount / value
        const aiAccepts = ratio <= 1.10 ? Math.random() < 0.70
          : ratio <= 1.25 ? Math.random() < 0.30
          : Math.random() < 0.08

        if (!aiAccepts) {
          set({ events: [{ id: Date.now(), text: `${worldClub.name} rechazó tu oferta por ${player.name}`, type: 'warn' }] })
          return
        }

        const updatedClubs = clubs.map(c =>
          c.id === currentJob.clubId
            ? {
                ...c,
                budget: c.budget + amount,
                squad: c.squad.filter(p => p.id !== playerId),
                starters: (c.starters || []).filter(id => id !== playerId),
              }
            : c
        )
        // Si el plantel del club comprador ya está cacheado (lo miraste o le
        // compraste algo), sumamos el jugador ahí para que quede consistente
        // si volvés a mirarlo. Si nunca se generó, no lo forzamos.
        const existingWorldSquad = worldClubSquads[targetClubId]
        const updatedWorldClubSquads = existingWorldSquad
          ? { ...worldClubSquads, [targetClubId]: [...existingWorldSquad, { ...player, clubId: targetClubId }] }
          : worldClubSquads

        set({
          clubs: updatedClubs,
          worldClubSquads: updatedWorldClubSquads,
          events: [{ id: Date.now(), text: `¡Venta cerrada! ${player.name} a ${worldClub.name} por $${Math.round(amount / 1000)}k`, type: 'success' }],
        })
      },

      // ────────────────────────────────────────────────────────────────────────

      // liveResult: optional { homeGoals, awayGoals, cardEvents } for the player's
      // own fixture, already decided by a live-match session (see commitLiveMatch).
      // When null (the default — "Simular rápido"), behavior is 100% unchanged.
      simulateMatchday(liveResult = null) {
        let { clubs, leagues, coach, currentJob, season, foreignLeague } = get()
        const repBeforeMatchday = coach.reputation
        const { freeAgents, transferWindowRan, transferOffers, aiTransferLog, notifications, coachInterest } = get()
        const { marketRumors, pendingMarketIntentions } = get()
        const newNotifications = []
        let newCoachInterest = coachInterest
        let queuedMarketEvents = [] // pedidos de salida generados por rumores que maduran (mezclados en newLifeEvents más abajo)

        // ── Transfer window check (runs AI market + possibly queues an incoming offer) ──
        let updFreeAgents = freeAgents
        let updTransferWindowRan = { ...transferWindowRan }
        let updTransferOffers = [...transferOffers]
        let updAiTransferLog = [...aiTransferLog]
        let updMarketRumors = [...marketRumors]
        let updPendingIntentions = [...pendingMarketIntentions]
        let incomingOfferEvent = null

        if (currentJob) {
          const myClub = clubs.find(c => c.id === currentJob.clubId)
          if (myClub) {
            const activeLg = foreignLeague || leagues[myClub.leagueId]
            if (activeLg && !activeLg.completed) {
              const win = getTransferWindow(activeLg.currentMatchday, activeLg.totalMatchdays)
              const curMd = activeLg.currentMatchday

              // ── Rumores del mundo — se anuncian 1 jornada antes de que abra la ventana ──
              if (!win.open && win.nextOpensAt !== null && curMd === win.nextOpensAt - 1) {
                const aiClubs = clubs.filter(c => c.id !== currentJob.clubId && c.managerId !== 'player' && (c.squad?.length || 0) > 15)
                if (aiClubs.length >= 2 && Math.random() < 0.55) {
                  const buyer = aiClubs[Math.floor(Math.random() * aiClubs.length)]
                  const seller = aiClubs.filter(c => c.id !== buyer.id)[Math.floor(Math.random() * (aiClubs.length - 1))]
                  if (seller) {
                    const bySkill = [...seller.squad].sort((a, b) => b.skill - a.skill)
                    const lo = Math.min(3, bySkill.length - 1)
                    const hi = Math.min(9, bySkill.length - 1)
                    const target = lo <= hi ? bySkill[lo + Math.floor(Math.random() * (hi - lo + 1))] : null
                    if (target && buyer.budget > calcTransferValue(target) * 0.5) {
                      updPendingIntentions = [...updPendingIntentions, {
                        id: `intent-${Date.now()}`, buyerClubId: buyer.id, sellerClubId: seller.id, playerId: target.id, resolveSeason: season,
                      }]
                      updMarketRumors = [{
                        id: `rumor-${Date.now()}-w`, kind: 'world_move',
                        text: `${buyer.name} prepara una oferta por ${target.name} (${seller.name})`,
                        playerId: target.id, playerName: target.name, buyerClubId: buyer.id, buyerClubName: buyer.name,
                        season, matchday: curMd, status: 'pending',
                      }, ...updMarketRumors].slice(0, 30)
                    }
                  }
                }
                // "Jugador pidió salir" — puro condimento, sin decisión (no es tu plantel)
                if (aiClubs.length && Math.random() < 0.35) {
                  const flavorClub = aiClubs[Math.floor(Math.random() * aiClubs.length)]
                  const flavorEvt = generateMarketExitEvent(flavorClub)
                  if (flavorEvt) {
                    updMarketRumors = [{
                      id: `rumor-${Date.now()}-x`, kind: 'world_exit',
                      text: `${flavorEvt.subjectPlayerName} pidió salir de ${flavorClub.name}`,
                      playerId: flavorEvt.subjectPlayerId, playerName: flavorEvt.subjectPlayerName,
                      buyerClubId: null, buyerClubName: null,
                      season, matchday: curMd, status: 'confirmed',
                    }, ...updMarketRumors].slice(0, 30)
                  }
                }
              }

              if (win.open && !updTransferWindowRan[win.type]) {
                const relevantIntentions = updPendingIntentions.filter(i => i.resolveSeason === season)
                const result = runAITransfers(clubs, freeAgents, currentJob.clubId, relevantIntentions)
                clubs = result.updatedClubs
                updFreeAgents = result.updatedFreeAgents
                updTransferWindowRan[win.type] = true
                updAiTransferLog = [...result.log.map(text => ({ text, season })), ...updAiTransferLog].slice(0, 20)

                const consumedIds = new Set(result.consumedIntentions.map(c => c.id))
                updPendingIntentions = updPendingIntentions.filter(i => !consumedIds.has(i.id))
                updMarketRumors = updMarketRumors.map(r => {
                  if (r.kind !== 'world_move' || r.status !== 'pending') return r
                  const match = result.consumedIntentions.find(c => c.playerId === r.playerId && c.buyerClubId === r.buyerClubId)
                  if (!match) return r
                  return match.status === 'confirmed'
                    ? { ...r, status: 'confirmed' }
                    : { ...r, status: 'faded', text: `El interés de ${r.buyerClubName} en ${r.playerName} se enfrió` }
                })

                newNotifications.push({
                  id: Date.now() + newNotifications.length + 1,
                  category: 'market',
                  text: win.type === 'verano'
                    ? 'Mercado de verano abierto — podés fichar y vender jugadores'
                    : 'Mercado de invierno abierto — podés fichar y vender jugadores',
                  read: false, season, matchday: curMd,
                })
              }

              // ── Rumor sobre MIS jugadores: aviso previo, después madura en oferta real ──
              const pendingMine = updMarketRumors.filter(r => r.kind === 'interest_mine' && r.status === 'pending' && r.forClubId === currentJob.clubId)
              if (win.open && pendingMine.length === 0 && myClub.squad.length > 14 && Math.random() < 0.20) {
                const potBuyers = clubs.filter(c => c.id !== currentJob.clubId && c.managerId !== 'player' && c.budget > 100000)
                if (potBuyers.length) {
                  const buyer = potBuyers[Math.floor(Math.random() * potBuyers.length)]
                  const freshClub = clubs.find(c => c.id === currentJob.clubId)
                  const top5 = [...(freshClub?.squad || [])].sort((a, b) => b.skill - a.skill).slice(0, 5)
                  if (top5.length) {
                    const target = top5[Math.floor(Math.random() * top5.length)]
                    const value = calcTransferValue(target)
                    const estAmount = Math.round(value * (0.80 + Math.random() * 0.40))
                    if (buyer.budget >= estAmount) {
                      updMarketRumors = [{
                        id: `rumor-${Date.now()}-m`, kind: 'interest_mine',
                        text: `${buyer.name} sigue de cerca a ${target.name}`,
                        playerId: target.id, playerName: target.name, playerPos: target.position,
                        buyerClubId: buyer.id, buyerClubName: buyer.name, estAmount,
                        forClubId: currentJob.clubId,
                        season, matchday: curMd,
                        resolveAtMatchday: curMd + 2 + Math.floor(Math.random() * 3),
                        resolveSeason: season,
                        status: 'pending',
                      }, ...updMarketRumors].slice(0, 30)
                      newNotifications.push({
                        id: Date.now() + newNotifications.length + 800,
                        category: 'transfer',
                        text: `${buyer.name} sigue de cerca a ${target.name}`,
                        read: false, season, matchday: curMd,
                      })
                    }
                  }
                }
              }

              // ── Maduración: el rumor se vuelve oferta real (o se enfría) ──────────
              updMarketRumors = updMarketRumors.map(r => {
                if (r.kind !== 'interest_mine' || r.status !== 'pending' || r.forClubId !== currentJob.clubId) return r
                if (r.resolveSeason !== season || curMd < r.resolveAtMatchday) return r

                const buyer = clubs.find(c => c.id === r.buyerClubId)
                const freshClub = clubs.find(c => c.id === currentJob.clubId)
                const target = freshClub?.squad.find(p => p.id === r.playerId)
                // NO exigir win.open acá — el rumor ya trae su propio plazo
                // (resolveAtMatchday, 2-4 jornadas después de creado) que a
                // menudo cae después de que la ventana cierra (solo dura 3
                // jornadas), así que exigirlo hacía que casi todo rumor se
                // enfriara sin excepción salvo el creado el primer día de la
                // ventana. La maduración se resuelve sola, como el deadline day.
                const matures = buyer && target && buyer.budget >= r.estAmount && Math.random() < 0.65

                if (!matures) {
                  newNotifications.push({
                    id: Date.now() + newNotifications.length + 801,
                    category: 'transfer',
                    text: `El interés de ${r.buyerClubName} en ${r.playerName} se enfrió`,
                    read: false, season, matchday: curMd,
                  })
                  return { ...r, status: 'faded', text: `El interés de ${r.buyerClubName} en ${r.playerName} se enfrió` }
                }

                // A veces el propio jugador usa la oferta como palanca para pedir salir
                const dramaRoll = !target.promise && Math.random() < 0.30
                if (dramaRoll) {
                  const exitEvt = buildExitOfferEvent(target, buyer, r.estAmount)
                  if (exitEvt) queuedMarketEvents.push(exitEvt)
                } else {
                  const alreadyPendingIn = updTransferOffers.some(o => o.type === 'incoming' && o.status === 'pending')
                  if (!alreadyPendingIn) {
                    updTransferOffers = [...updTransferOffers, {
                      id: `in-${Date.now()}`,
                      type: 'incoming',
                      fromClubId: buyer.id,
                      fromClubName: buyer.name,
                      toClubId: currentJob.clubId,
                      playerId: target.id,
                      playerName: target.name,
                      playerSkill: target.skill,
                      playerPos: target.position,
                      amount: r.estAmount,
                      counterAmount: null,
                      status: 'pending',
                      round: 1,
                      season,
                    }]
                    incomingOfferEvent = { id: Date.now() + 888, text: `${buyer.name} formalizó una oferta de $${Math.round(r.estAmount / 1000)}k por ${target.name}`, type: 'info' }
                    newNotifications.push({
                      id: Date.now() + newNotifications.length + 802,
                      category: 'transfer',
                      text: `${buyer.name} ofrece $${Math.round(r.estAmount / 1000)}k por ${target.name}`,
                      read: false, season, matchday: curMd,
                    })
                  }
                }
                return { ...r, status: 'confirmed' }
              })
            }
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        const clubsMap = getClubsMap(clubs)

        // Tick injury/suspension counters before the match (expire one jornada)
        let tickedSquad = null
        if (currentJob) {
          const pc = clubsMap[currentJob.clubId]
          if (pc?.squad?.length) {
            const playerLeague = foreignLeague || leagues[pc.leagueId]
            if (playerLeague && !playerLeague.completed) {
              tickedSquad = tickDownStatus(pc.squad)
              clubsMap[currentJob.clubId] = { ...pc, squad: tickedSquad }
            }
          }
        }

        // Find the league with the lowest current matchday that isn't completed
        // Simulate ONE matchday across ALL leagues simultaneously
        const newLeagues = { ...leagues }
        const allResults = []
        let playerMatchResult = null
        let repDelta = 0
        let confDelta = 0
        let allLeaguesDone = true
        const pendingGoalEvents = []

        for (const leagueId of Object.keys(newLeagues)) {
          const lg = newLeagues[leagueId]
          if (lg.completed) continue
          allLeaguesDone = false

          const nextMd = lg.currentMatchday
          if (nextMd >= lg.schedule.length) {
            newLeagues[leagueId] = { ...lg, completed: true }
            continue
          }

          const fixtures = lg.schedule[nextMd]
          const leagueName = LEAGUES.find(l => l.id === leagueId)?.name
          const playedFixtures = fixtures.map(fixture => {
            const homeClub = clubsMap[fixture.homeId]
            const awayClub = clubsMap[fixture.awayId]
            if (!homeClub || !awayClub) return fixture

            // typeof homeGoals === 'number' (no solo `liveResult` truthy) — evita que
            // un liveResult mal formado (ej. un evento de React pasado por error a un
            // onClick) corrompa el resultado del partido con homeGoals/awayGoals undefined.
            const isLiveFixture = typeof liveResult?.homeGoals === 'number' && typeof liveResult?.awayGoals === 'number' && currentJob &&
              (fixture.homeId === currentJob.clubId || fixture.awayId === currentJob.clubId)
            const { homeGoals, awayGoals } = isLiveFixture
              ? { homeGoals: liveResult.homeGoals, awayGoals: liveResult.awayGoals }
              : simulateMatch(homeClub, awayClub)
            const result = { ...fixture, homeGoals, awayGoals }

            // ── Goleadores/asistencias (no afecta homeGoals/awayGoals) ──────────
            const goalAttribution = isLiveFixture
              ? { homeScorers: scorersFromLiveResult(liveResult, 'home'), awayScorers: scorersFromLiveResult(liveResult, 'away') }
              : attributeMatchGoals(homeClub, awayClub, homeGoals, awayGoals)
            const goalCtx = { season, competitionId: leagueId, competitionName: leagueName }
            goalAttribution.homeScorers.forEach(ev => pendingGoalEvents.push({ ...goalCtx, clubId: fixture.homeId, clubName: homeClub.name, ...ev }))
            goalAttribution.awayScorers.forEach(ev => pendingGoalEvents.push({ ...goalCtx, clubId: fixture.awayId, clubName: awayClub.name, ...ev }))
            // ─────────────────────────────────────────────────────────────────

            allResults.push({
              leagueId,
              homeId: fixture.homeId,
              awayId: fixture.awayId,
              homeName: homeClub.name,
              awayName: awayClub.name,
              homeGoals,
              awayGoals,
            })

            // Track player's match
            if (currentJob) {
              const isPlayerMatch =
                fixture.homeId === currentJob.clubId || fixture.awayId === currentJob.clubId

              if (isPlayerMatch) {
                const homeStr = calcStrength(homeClub)
                const awayStr = calcStrength(awayClub)
                const delta = calcRepDelta(
                  currentJob.clubId, fixture.homeId, homeGoals, awayGoals, homeStr, awayStr
                )
                repDelta += delta

                const isHome = fixture.homeId === currentJob.clubId
                const pg = isHome ? homeGoals : awayGoals
                const og = isHome ? awayGoals : homeGoals
                confDelta += calcConfidenceDelta(pg, og)

                playerMatchResult = {
                  homeId: fixture.homeId,
                  awayId: fixture.awayId,
                  homeName: homeClub.name,
                  awayName: awayClub.name,
                  homeGoals,
                  awayGoals,
                  isHome,
                  playerGoals: pg,
                  opponentGoals: og,
                }
              }
            }

            return result
          })

          // Update schedule
          const newSchedule = lg.schedule.map((md, i) => i === nextMd ? playedFixtures : md)
          const isDone = nextMd + 1 >= lg.totalMatchdays
          newLeagues[leagueId] = {
            ...lg,
            schedule: newSchedule,
            currentMatchday: nextMd + 1,
            completed: isDone,
          }
        }

        // ── Foreign league simulation (when player manages a world club) ────────
        let newForeignLeague = foreignLeague

        if (foreignLeague && !foreignLeague.completed && currentJob) {
          const nextMd = foreignLeague.currentMatchday
          if (nextMd < foreignLeague.schedule.length) {
            // WORLD_CLUBS primero: si tu club (con plantel real) comparte id con
            // un stub de WORLD_CLUBS, tu versión con squad debe ganar la resolución
            // — así tu plantel real importa en la fuerza de la liga extranjera.
            const allWorldMap = Object.fromEntries([...WORLD_CLUBS, ...clubs].map(c => [c.id, c]))
            const flLeagueName = WORLD_LEAGUES.find(l => l.id === foreignLeague.leagueId)?.name
            const playedFixtures = foreignLeague.schedule[nextMd].map(fixture => {
              const hc = allWorldMap[fixture.homeId]
              const ac = allWorldMap[fixture.awayId]
              if (!hc || !ac) return fixture
              const isLiveFixture = liveResult && currentJob &&
                (fixture.homeId === currentJob.clubId || fixture.awayId === currentJob.clubId)
              const { homeGoals, awayGoals } = isLiveFixture
                ? { homeGoals: liveResult.homeGoals, awayGoals: liveResult.awayGoals }
                : simulateMixedMatch(hc, ac)

              // ── Goleadores/asistencias — no-op gratis para los rivales sin plantel ──
              // clubsMap (armado solo desde `clubs`, sin el shadowing de allWorldMap)
              // es la fuente correcta para el plantel real de mi propio club acá.
              const homeSquadClub = clubsMap[fixture.homeId] || hc
              const awaySquadClub = clubsMap[fixture.awayId] || ac
              const goalAttribution = isLiveFixture
                ? { homeScorers: scorersFromLiveResult(liveResult, 'home'), awayScorers: scorersFromLiveResult(liveResult, 'away') }
                : attributeMatchGoals(homeSquadClub, awaySquadClub, homeGoals, awayGoals)
              const goalCtx = { season, competitionId: foreignLeague.leagueId, competitionName: flLeagueName }
              goalAttribution.homeScorers.forEach(ev => pendingGoalEvents.push({ ...goalCtx, clubId: fixture.homeId, clubName: hc.name, ...ev }))
              goalAttribution.awayScorers.forEach(ev => pendingGoalEvents.push({ ...goalCtx, clubId: fixture.awayId, clubName: ac.name, ...ev }))
              // ─────────────────────────────────────────────────────────────────

              allResults.push({
                leagueId: foreignLeague.leagueId,
                homeId: fixture.homeId, awayId: fixture.awayId,
                homeName: hc.name, awayName: ac.name, homeGoals, awayGoals,
              })
              if (fixture.homeId === currentJob.clubId || fixture.awayId === currentJob.clubId) {
                const homeStr = hc.squad?.length ? calcStrength(hc) : (hc.strength || 40)
                const awayStr = ac.squad?.length ? calcStrength(ac) : (ac.strength || 40)
                repDelta += calcRepDelta(currentJob.clubId, fixture.homeId, homeGoals, awayGoals, homeStr, awayStr)
                const isHome = fixture.homeId === currentJob.clubId
                const pg = isHome ? homeGoals : awayGoals
                const og = isHome ? awayGoals : homeGoals
                confDelta += calcConfidenceDelta(pg, og)
                playerMatchResult = {
                  homeId: fixture.homeId, awayId: fixture.awayId,
                  homeName: hc.name, awayName: ac.name, homeGoals, awayGoals,
                  isHome, playerGoals: pg, opponentGoals: og,
                }
              }
              return { ...fixture, homeGoals, awayGoals }
            })
            const newSchedule = foreignLeague.schedule.map((md, i) => i === nextMd ? playedFixtures : md)
            const isDone = nextMd + 1 >= foreignLeague.totalMatchdays
            newForeignLeague = { ...foreignLeague, schedule: newSchedule, currentMatchday: nextMd + 1, completed: isDone }
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Matchday number for tagging notifications
        const _playerLeagueId = currentJob ? clubs.find(c => c.id === currentJob.clubId)?.leagueId : null
        const notifMd = newForeignLeague
          ? newForeignLeague.currentMatchday
          : (_playerLeagueId ? newLeagues[_playerLeagueId]?.currentMatchday || 0 : 0)

        // Update morale based on results
        const moraleChanges = {}
        allResults.forEach(r => {
          const hd = r.homeGoals > r.awayGoals ? 8 : r.homeGoals === r.awayGoals ? 2 : -10
          const ad = r.awayGoals > r.homeGoals ? 6 : r.awayGoals === r.homeGoals ? 2 : -8
          moraleChanges[r.homeId] = (moraleChanges[r.homeId] || 0) + hd
          moraleChanges[r.awayId] = (moraleChanges[r.awayId] || 0) + ad
        })

        // Update morale + track AI club losses for potential sackings
        const aiLossStreak = {}
        allResults.forEach(r => {
          // Track consecutive losses for AI-managed clubs
          ;[
            { id: r.homeId, lost: r.homeGoals < r.awayGoals },
            { id: r.awayId, lost: r.awayGoals < r.homeGoals },
          ].forEach(({ id, lost }) => {
            if (lost) aiLossStreak[id] = (aiLossStreak[id] || 0) + 1
          })
        })

        // ── Finance processing (player's club only) ───────────────────────────
        let playerFinanceDelta = 0
        let playerFinanceUpdate = {}
        let extraConfDelta = 0
        let financeEvent = null

        if (playerMatchResult && currentJob) {
          const playerClub = clubsMap[currentJob.clubId]
          const leagueId = playerClub.leagueId
          const finLeagueId = resolveFinanceLeagueId(leagueId)
          const newLg = newLeagues[leagueId] || newForeignLeague

          // Season-start injection on the first matchday of the season
          if (newLg && newLg.currentMatchday === 1) {
            const tvRev = FINANCE.TV_REVENUE[finLeagueId] || 0
            const sponsorRev = calcSponsorRevenue(playerClub.prestige, finLeagueId)
            const boardInv = calcBoardInvestment(currentJob.boardConfidence, finLeagueId)
            const maint = FINANCE.MAINTENANCE[finLeagueId] || 0
            playerFinanceDelta += tvRev + sponsorRev + boardInv - maint
            playerFinanceUpdate = {
              ...playerFinanceUpdate,
              tvRevenue: tvRev,
              sponsorRevenue: sponsorRev,
              boardInvestment: boardInv,
              maintenancePaid: maint,
            }
          }

          // Wages deducted every matchday
          const wageThisMd = playerClub.squad.reduce((s, p) => s + (p.contract?.wage ?? calcPlayerWage(p.skill)), 0)
          playerFinanceDelta -= wageThisMd
          playerFinanceUpdate = {
            ...playerFinanceUpdate,
            wagesPaid: (playerClub.finances?.wagesPaid || 0) + wageThisMd,
          }

          // Negative balance penalty
          if (playerClub.budget + playerFinanceDelta < 0) {
            extraConfDelta = FINANCE.NEG_BALANCE_CF_PENALTY
            if (playerClub.budget >= 0) {
              financeEvent = { id: Date.now() + 2, text: '⚠ El club entró en déficit financiero', type: 'warn' }
            }
          }

          // Ticket revenue for home matches
          if (playerMatchResult.isHome) {
            const scheduleForForm = foreignLeague ? (newForeignLeague?.schedule || []) : leagues[leagueId].schedule
            const formScore = calcFormScore(scheduleForForm, currentJob.clubId)
            const ticketRev = calcTicketRevenue(finLeagueId, formScore)
            playerFinanceDelta += ticketRev
            playerFinanceUpdate = {
              ...playerFinanceUpdate,
              ticketRevenue: (playerClub.finances?.ticketRevenue || 0) + ticketRev,
            }
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        let updatedClubs = clubs.map(c => {
          const mc = moraleChanges[c.id] || 0
          const newMorale = clamp(c.morale + mc, 20, 100)
          let managerId = c.managerId

          // AI clubs with very low morale (bad run) have a 30% chance to sack their manager
          if (managerId && managerId !== 'player' && newMorale < 35 && Math.random() < 0.30) {
            managerId = null
          }
          if (currentJob && c.id === currentJob.clubId && playerFinanceDelta !== 0) {
            return {
              ...c,
              squad: tickedSquad || c.squad,
              morale: newMorale,
              managerId,
              budget: c.budget + playerFinanceDelta,
              finances: { ...(c.finances || {}), ...playerFinanceUpdate },
            }
          }
          if (currentJob && c.id === currentJob.clubId) {
            return { ...c, squad: tickedSquad || c.squad, morale: newMorale, managerId }
          }
          return { ...c, morale: newMorale, managerId }
        })

        // ── Generate and apply match events (injuries, cards) ─────────────────
        const matchEventNotifs = []
        if (playerMatchResult && currentJob && tickedSquad) {
          const playerClubPost = updatedClubs.find(c => c.id === currentJob.clubId)
          const effectiveStarters = getEffectiveStarters(playerClubPost)
          const injuryMultExtra = playerClubPost.trainingFocus?.type === 'fisico' ? 0.8 : 1
          const { injuries, yellows, reds } = liveResult?.cardEvents
            ? liveResult.cardEvents
            : generateMatchEvents(effectiveStarters, playerClubPost.tactics, injuryMultExtra)

          if (injuries.length || yellows.length || reds.length) {
            updatedClubs = updatedClubs.map(c => {
              if (c.id !== currentJob.clubId) return c
              const newSquad = c.squad.map(p => {
                let np = { ...p }
                const inj = injuries.find(e => e.playerId === p.id)
                if (inj) {
                  np.injuredFor = (np.injuredFor || 0) + inj.matchdays
                  if (p.skill >= 65) matchEventNotifs.push({ id: Date.now() + matchEventNotifs.length + 100, text: `${p.name} se lesionó — fuera ${inj.matchdays}J`, type: 'warn' })
                  newNotifications.push({ id: Date.now() + newNotifications.length + 100, category: 'player', text: `${p.name} se lesionó — fuera ${inj.matchdays} jornada${inj.matchdays !== 1 ? 's' : ''}`, read: false, season, matchday: notifMd })
                }
                const yellow = yellows.find(e => e.playerId === p.id)
                if (yellow) {
                  const newYellows = (np.yellowCards || 0) + 1
                  np.yellowCards = newYellows
                  if (newYellows >= 5 && newYellows % 5 === 0) {
                    np.suspendedFor = (np.suspendedFor || 0) + 1
                    if (p.skill >= 65) matchEventNotifs.push({ id: Date.now() + matchEventNotifs.length + 120, text: `${p.name} — 5 amarillas, suspendido 1J`, type: 'warn' })
                    newNotifications.push({ id: Date.now() + newNotifications.length + 120, category: 'player', text: `${p.name} acumuló 5 amarillas — suspendido 1 jornada`, read: false, season, matchday: notifMd })
                  }
                }
                const red = reds.find(e => e.playerId === p.id)
                if (red) {
                  np.suspendedFor = (np.suspendedFor || 0) + red.matchdays
                  if (p.skill >= 60) matchEventNotifs.push({ id: Date.now() + matchEventNotifs.length + 140, text: `${p.name} vio la roja — suspendido ${red.matchdays}J`, type: 'warn' })
                  newNotifications.push({ id: Date.now() + newNotifications.length + 140, category: 'player', text: `${p.name} vio la roja — suspendido ${red.matchdays} jornada${red.matchdays !== 1 ? 's' : ''}`, read: false, season, matchday: notifMd })
                }
                return np
              })
              return { ...c, squad: newSquad }
            })
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Bench tracking (update per-player bench counter) ─────────────────
        // Uses getEffectiveStarters (same source the match simulation itself reads)
        // instead of the club's raw `starters` field, which setFormation clears to
        // `[]` until the user re-confirms a lineup — reading it directly used to
        // freeze every player's benchMatchdays count for as long as `starters` was
        // empty, even though the match was simulated fine via its own auto-fallback.
        if (currentJob) {
          const pcBench = updatedClubs.find(c => c.id === currentJob.clubId)
          if (pcBench && pcBench.squad?.length) {
            const starterSet = new Set(getEffectiveStarters(pcBench).map(p => p.id))
            updatedClubs = updatedClubs.map(c => {
              if (c.id !== currentJob.clubId) return c
              return {
                ...c,
                squad: c.squad.map(p => {
                  const unavailable = (p.injuredFor || 0) > 0 || (p.suspendedFor || 0) > 0
                  if (unavailable) return p
                  return starterSet.has(p.id)
                    ? { ...p, benchMatchdays: 0 }
                    : { ...p, benchMatchdays: (p.benchMatchdays || 0) + 1 }
                }),
              }
            })
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Low-morale streak (feeds pedido_salida_descontento) ──────────────
        if (currentJob) {
          updatedClubs = updatedClubs.map(c => {
            if (c.id !== currentJob.clubId) return c
            return {
              ...c,
              squad: c.squad.map(p => ({
                ...p,
                lowMoraleStreak: (p.morale ?? 70) < 45 ? (p.lowMoraleStreak || 0) + 1 : 0,
              })),
            }
          })
        }
        // ─────────────────────────────────────────────────────────────────────

        // Update coach stats + board confidence
        let newCoach = { ...coach }
        let newJob = currentJob ? { ...currentJob } : null

        if (playerMatchResult && currentJob) {
          const { playerGoals, opponentGoals } = playerMatchResult
          if (playerGoals > opponentGoals) {
            newCoach.totalWins++
            newCoach.totalMatches++
          } else if (playerGoals === opponentGoals) {
            newCoach.totalDraws++
            newCoach.totalMatches++
          } else {
            newCoach.totalLosses++
            newCoach.totalMatches++
          }
          newCoach.reputation = clamp(newCoach.reputation + repDelta, 0, 100)
          newCoach.money += newJob.salary

          newJob.boardConfidence = clamp(newJob.boardConfidence + confDelta + extraConfDelta, 0, 100)

          // Board confidence threshold notifications
          const prevConf = currentJob.boardConfidence
          const nextConf = newJob.boardConfidence
          if (nextConf < 30 && prevConf >= 30) {
            newNotifications.push({ id: Date.now() + newNotifications.length + 50, category: 'board', text: 'La dirigencia está muy preocupada — tu puesto corre riesgo', read: false, season, matchday: notifMd })
          } else if (nextConf >= 70 && prevConf < 70) {
            newNotifications.push({ id: Date.now() + newNotifications.length + 50, category: 'board', text: 'La dirigencia está muy conforme con el rendimiento del equipo', read: false, season, matchday: notifMd })
          }
        }

        // Check mid-season firing
        let newScreen = get().screen
        let firedEvent = null
        if (newJob && newJob.boardConfidence < 15) {
          const club = updatedClubs.find(c => c.id === newJob.clubId)
          updatedClubs = updatedClubs.map(c =>
            c.id === newJob.clubId ? { ...c, managerId: null } : c
          )
          if (foreignLeague) {
            updatedClubs = updatedClubs.filter(c => c.id !== newJob.clubId)
            newForeignLeague = null
          }
          newCoach.reputation = clamp(newCoach.reputation - 8, 0, 100)
          newCoach.jobHistory = [
            ...newCoach.jobHistory,
            { clubId: newJob.clubId, clubName: club?.name, season, fired: true },
          ]
          newJob = null
          newScreen = 'unemployed'
          firedEvent = { id: Date.now(), text: `Fuiste despedido por mal rendimiento`, type: 'danger' }
        }

        // ── Press system ──────────────────────────────────────────────────────
        const { pressHeadlines, lastConferenceMd, lifeEvents, lastLifeEventMd } = get()
        const { worldHistory, lastDtMesMd, celebrations } = get()
        let newPressConference = get().pressConference
        let newLastConferenceMd = lastConferenceMd
        let newLifeEvents = [...lifeEvents, ...queuedMarketEvents]
        let newLastLifeEventMd = lastLifeEventMd
        let newPressHeadlines = pressHeadlines
        let newWorldHistory = { ...worldHistory, records: addScorerEvents(worldHistory.records, pendingGoalEvents) }
        let newLastDtMesMd = lastDtMesMd
        let newCelebrations = [...celebrations]

        if (playerMatchResult && currentJob) {
          const pressClub = clubsMap[currentJob.clubId]
          const pressLeagueId = pressClub?.leagueId
          const updatedSchedule = newForeignLeague
            ? (newForeignLeague.schedule || [])
            : (newLeagues[pressLeagueId]?.schedule || [])
          const currentMdNum = newForeignLeague
            ? newForeignLeague.currentMatchday
            : (newLeagues[pressLeagueId]?.currentMatchday || 0)

          const streak = calcStreak(updatedSchedule, currentJob.clubId)

          if (streak.count === 5) {
            const milestoneText = streak.type === 'win'
              ? '¡Racha de 5 victorias consecutivas! El equipo está en llamas'
              : streak.type === 'loss'
              ? 'Racha de 5 derrotas seguidas — situación crítica'
              : 'Racha de 5 empates consecutivos'
            newNotifications.push({ id: Date.now() + newNotifications.length + 200, category: 'milestone', text: milestoneText, read: false, season, matchday: notifMd })
          }

          // ── Historia: récord de racha propia + DT del Mes ───────────────────
          newWorldHistory = {
            ...newWorldHistory,
            records: updateWinStreakRecord(newWorldHistory.records, streak, coach.name, pressClub?.name, season),
          }
          const mesAward = checkDtDelMes(streak, pressClub?.name, season, currentMdNum, newLastDtMesMd)
          if (mesAward) {
            newWorldHistory = { ...newWorldHistory, awards: [...newWorldHistory.awards, mesAward] }
            newLastDtMesMd = currentMdNum
            newNotifications.push({
              id: Date.now() + newNotifications.length + 210, category: 'award',
              text: `🏅 DT del Mes: ${mesAward.reason}`, read: false, season, matchday: notifMd,
            })
            newCelebrations = [...newCelebrations, makeCelebration({
              type: 'dt-mes', icon: '📅',
              title: 'DT del Mes',
              subtitle: pressClub?.name || '',
              detail: `${mesAward.reason} · Temporada ${season}`,
            })]
          }
          // ────────────────────────────────────────────────────────────────────

          // Media pressure: extra conf/morale delta from streak
          let pressureCf = 0
          let pressureMorale = 0
          if (streak.type === 'loss' && streak.count >= 3) { pressureCf = -2; pressureMorale = -2 }
          if (streak.type === 'win'  && streak.count >= 3) { pressureCf =  1; pressureMorale =  1 }
          if (newJob && pressureCf !== 0) {
            newJob = { ...newJob, boardConfidence: clamp(newJob.boardConfidence + pressureCf, 0, 100) }
          }
          if (pressureMorale !== 0) {
            updatedClubs = updatedClubs.map(c =>
              c.id === currentJob.clubId
                ? { ...c, morale: clamp(c.morale + pressureMorale, 20, 100) }
                : c
            )
          }

          // Generate headlines
          const pressClubIds = newForeignLeague
            ? WORLD_CLUBS.filter(c => c.leagueId === pressLeagueId).map(c => c.id)
            : (newLeagues[pressLeagueId]?.clubIds || [])
          const updatedStandings = calcStandings(pressClubIds, updatedSchedule)
          const freshLines = generateMatchdayHeadlines(
            playerMatchResult, allResults, currentJob.clubId, pressClub?.name || '',
            updatedStandings, currentMdNum, updatedSchedule
          )
          newPressHeadlines = [
            ...pressHeadlines,
            ...freshLines.map((h, i) => ({
              id: Date.now() + i, text: h.text, type: h.type,
              matchday: currentMdNum, season,
            })),
          ].slice(-10)

          // Trigger press conference (only if none pending and player still employed)
          if (!newPressConference && newJob) {
            const goalDiff = playerMatchResult.playerGoals - playerMatchResult.opponentGoals
            const confType = triggerPressConference(
              streak, goalDiff, newJob.boardConfidence, lastConferenceMd, currentMdNum
            )
            if (confType) {
              newPressConference = { type: confType }
              newLastConferenceMd = currentMdNum
            }
          }

          // ── Coach interest from other clubs ──────────────────────────────────
          if (newJob) {
            const myClubForInt = updatedClubs.find(c => c.id === currentJob.clubId)
            const repNow = newCoach.reputation
            const goodForm = streak.type === 'win' && streak.count >= 3
            const meetsInt = repNow >= 55 && (goodForm || (repNow >= 70 && streak.type === 'win'))
            // Una vez que el rumor existe, YA NO hace falta sostener la racha
            // que lo disparó matchday a matchday — alcanza con no entrar en
            // una racha de derrotas ni desplomarse en reputación. Antes, un
            // empate aislado bastaba para borrar el rumor recién creado, lo
            // que en la práctica exigía una racha de 6+ victorias SIN CORTES
            // para llegar a ver la oferta formal (3 para disparar el rumor +
            // 3 más para que madure) — casi nunca pasaba.
            const interestCollapsed = streak.type === 'loss' && streak.count >= 2

            if (newCoachInterest && (repNow < 45 || interestCollapsed)) {
              newCoachInterest = null
            } else if (!newCoachInterest && meetsInt) {
              // No rumor yet — chance to generate one
              const myPrestige = myClubForInt?.prestige || 0
              const candidatesAbove = margin => clubs.filter(c =>
                c.id !== currentJob.clubId &&
                c.managerId !== 'player' &&
                c.prestige > myPrestige + margin &&
                canApplyToClub(repNow, c.prestige)
              )
              const worldCandidatesAbove = margin => WORLD_CLUBS.filter(c =>
                c.prestige > myPrestige + margin &&
                canApplyToClub(repNow, c.prestige)
              )
              let argCandidates = candidatesAbove(8)
              let worldCandidates = worldCandidatesAbove(8)
              // El prestigio máximo de cualquier club del juego ronda 95-98, así
              // que un DT que ya dirige un club de elite (prestigio ~90+) nunca
              // encuentra un club "+8 más grande" — quedaba sin ofertas para
              // siempre a partir de ahí (bug). Si no hay ningún candidato más
              // grande, se relaja a clubes de prestigio similar (laterales entre
              // grandes, algo real en la carrera de un DT ya consagrado).
              if (argCandidates.length + worldCandidates.length === 0) {
                argCandidates = candidatesAbove(-10)
                worldCandidates = worldCandidatesAbove(-10)
              }
              const allCandidates = [...argCandidates, ...worldCandidates]
              if (allCandidates.length && Math.random() < 0.18) {
                const interested = allCandidates[Math.floor(Math.random() * allCandidates.length)]
                const offerSalary = Math.floor(interested.prestige * 900 + 6000)
                newCoachInterest = {
                  clubId: interested.id,
                  clubName: interested.name,
                  prestige: interested.prestige,
                  salary: offerSalary,
                  rumorMatchday: notifMd,
                  rumorSeason: season,
                }
                newNotifications.push({
                  id: Date.now() + newNotifications.length + 500,
                  category: 'interest',
                  text: `Rumor: ${interested.name} estaría interesado en vos como técnico`,
                  read: false,
                  season,
                  matchday: notifMd,
                })
              }
            } else if (newCoachInterest) {
              // Existing rumor — escalate if 3+ matchdays have passed in the same season
              const rumorExpired = newCoachInterest.rumorSeason < season
              const matchdaysPassed = rumorExpired ? 99 : notifMd - newCoachInterest.rumorMatchday
              if (rumorExpired || matchdaysPassed >= 3) {
                if (!rumorExpired) {
                  newNotifications.push({
                    id: Date.now() + newNotifications.length + 600,
                    category: 'interest',
                    text: `${newCoachInterest.clubName} te hace una oferta formal para ser su técnico`,
                    read: false,
                    requiresAction: true,
                    actionType: 'coachOffer',
                    actionPayload: {
                      clubId: newCoachInterest.clubId,
                      clubName: newCoachInterest.clubName,
                      salary: newCoachInterest.salary,
                      prestige: newCoachInterest.prestige,
                    },
                    season,
                    matchday: notifMd,
                  })
                }
                newCoachInterest = null
              }
            }
          } else {
            // Player was fired — clear any interest
            newCoachInterest = null
          }
          // ────────────────────────────────────────────────────────────────────

          // ── Promesas vencidas (mercado) — corre siempre, no comparte cooldown ──
          if (newJob) {
            const pcPromise = updatedClubs.find(c => c.id === currentJob.clubId)
            const brokenOrKept = pcPromise ? checkPromiseDeadlines(pcPromise, notifMd, season) : []
            if (brokenOrKept.length) {
              updatedClubs = updatedClubs.map(c => {
                if (c.id !== currentJob.clubId) return c
                let clubMoraleDelta = 0
                const squad = c.squad.map(p => {
                  const res = brokenOrKept.find(r => r.playerId === p.id)
                  if (!res) return p
                  const delta = res.fulfilled ? 4 : -18
                  const resolved = resolveLifeEventEffects({ playerMorale: delta }, { subjectPlayerId: p.id, squad: c.squad })
                  clubMoraleDelta += resolved.clubMoraleDelta
                  newNotifications.push({
                    id: Date.now() + newNotifications.length + 850,
                    category: 'player',
                    text: res.fulfilled
                      ? `Cumpliste lo que le prometiste a ${res.playerName} — lo nota`
                      : `No cumpliste tu promesa a ${res.playerName} — está furioso`,
                    read: false, season, matchday: notifMd,
                  })
                  return { ...p, morale: clamp((p.morale ?? 70) + delta, 0, 100), promise: null }
                })
                return { ...c, squad, morale: clamp(c.morale + clubMoraleDelta, 20, 100) }
              })
            }
          }
          // ────────────────────────────────────────────────────────────────────

          // ── Vestuario / carrera / mercado events (life-event system — src/data/lifeEvents.js) ──
          // Carrera va entre mercado (rarísimo) y vestuario (frecuente) para
          // que tenga una chance real de ganar la cadena sin apagar vestuario.
          if (newJob && !newPressConference && notifMd - lastLifeEventMd >= 3) {
            const pcEvt = updatedClubs.find(c => c.id === currentJob.clubId)
            const playerGoalDiff = playerMatchResult.playerGoals - playerMatchResult.opponentGoals
            const careerCtx = {
              allClubs: updatedClubs, repNow: newCoach.reputation, boardConfidence: newJob.boardConfidence,
              contractEndSeason: currentJob.contractEndSeason, season, hasActiveInterest: !!newCoachInterest,
            }
            const prensaCtx = { repNow: newCoach.reputation, boardConfidence: newJob.boardConfidence, playerGoalDiff }
            const legacyCtx = { seasonsManaged: newCoach.seasonsManaged, trophiesCount: newCoach.trophies.length, streak }
            const newEvent = pcEvt ? (
              generateMarketExitEvent(pcEvt) ||
              generateCareerEvent(pcEvt, careerCtx) ||
              generatePrensaEvent(pcEvt, prensaCtx) ||
              generateLegacyEvent(pcEvt, legacyCtx) ||
              generateVestuarioEvent(pcEvt, { playerGoalDiff })
            ) : null

            if (newEvent) {
              newLifeEvents = [...newLifeEvents, newEvent]
              newLastLifeEventMd = notifMd
              // Reset the subject's bench counter so the same trigger doesn't fire again immediately
              // — except for the two bench-driven vestuario types, which need benchMatchdays to keep
              // climbing past their own threshold (3) so pedido_salida_protagonismo (6) can escalate
              // once the complaint keeps getting ignored.
              const BENCH_ESCALATING_TYPES = new Set(['referente_protagonismo', 'jugador_descontento_banco'])
              if (newEvent.subjectPlayerId && !BENCH_ESCALATING_TYPES.has(newEvent.type)) {
                updatedClubs = updatedClubs.map(c =>
                  c.id !== currentJob.clubId ? c : {
                    ...c,
                    squad: c.squad.map(p =>
                      p.id === newEvent.subjectPlayerId ? { ...p, benchMatchdays: 0 } : p
                    ),
                  }
                )
              }
            }
          }
          // ────────────────────────────────────────────────────────────────────
        }
        // ─────────────────────────────────────────────────────────────────────

        // Check if all leagues done → season end
        const allDone = Object.values(newLeagues).every(l => l.completed) &&
          (!newForeignLeague || newForeignLeague.completed)

        // Simulate world leagues (one matchday each)
        if (!get().worldInitialized) get().initWorld()
        const { worldClubSquads } = get()
        const newWorldLeagues = { ...get().worldLeagues }
        // Array aparte de pendingGoalEvents a propósito: pendingGoalEvents ya
        // se volcó a newWorldHistory.records más arriba (addScorerEvents es un
        // incremento, no un set — reusar el mismo array acá duplicaría los
        // goles de liga/copa ya contados). Se vuelca una sola vez, después de
        // este loop, antes de que las copas sigan encadenando sobre records.
        const pendingWorldLeagueGoalEvents = []
        for (const leagueId of Object.keys(newWorldLeagues)) {
          const lg = newWorldLeagues[leagueId]
          if (lg.completed) continue
          const clubsById = WORLD_CLUBS_BY_LEAGUE[leagueId] || {}
          const worldLeagueName = WORLD_LEAGUES.find(l => l.id === leagueId)?.name
          const fixtures = getLightweightFixtures(lg.clubIds, lg.currentMatchday)
          let newStandings = { ...lg.standings }
          fixtures.forEach(({ homeId, awayId }) => {
            const hc = clubsById[homeId]; const ac = clubsById[awayId]
            if (!hc || !ac) return
            const { homeGoals, awayGoals } = simulateLightweightMatch(hc, ac)
            newStandings = applyLightweightFixture(newStandings, homeId, awayId, homeGoals, awayGoals)

            // ── Goleadores/asistencias — best-effort, no-op gratis para el lado
            // sin plantel cacheado (mismo patrón que copas/liga extranjera:
            // attributeMatchGoals nunca cambia homeGoals/awayGoals, solo
            // reparte los que ya decidió simulateLightweightMatch arriba).
            // La mayoría de los ~2500 clubes del mundo no tienen plantel
            // generado, así que la mayoría de las fechas no aportan nada acá
            // — se va completando a medida que el jugador explora el mercado,
            // juega amistosos, o mira Récords y dispara ensureWorldLeagueSquads.
            if (worldClubSquads[homeId] || worldClubSquads[awayId]) {
              const homeSquadClub = worldClubSquads[homeId] ? { ...hc, squad: worldClubSquads[homeId] } : hc
              const awaySquadClub = worldClubSquads[awayId] ? { ...ac, squad: worldClubSquads[awayId] } : ac
              const goalAttribution = attributeMatchGoals(homeSquadClub, awaySquadClub, homeGoals, awayGoals)
              const goalCtx = { season, competitionId: leagueId, competitionName: worldLeagueName }
              goalAttribution.homeScorers.forEach(ev => pendingWorldLeagueGoalEvents.push({ ...goalCtx, clubId: homeId, clubName: hc.name, ...ev }))
              goalAttribution.awayScorers.forEach(ev => pendingWorldLeagueGoalEvents.push({ ...goalCtx, clubId: awayId, clubName: ac.name, ...ev }))
            }
            // ─────────────────────────────────────────────────────────────────
          })
          const nextMd = lg.currentMatchday + 1
          const isDone = nextMd >= lg.totalMatchdays
          newWorldLeagues[leagueId] = {
            ...lg,
            standings: newStandings,
            currentMatchday: nextMd,
            completed: isDone,
            champion: isDone ? getLeagueChampion(newStandings) : lg.champion,
          }
        }
        newWorldHistory = { ...newWorldHistory, records: addScorerEvents(newWorldHistory.records, pendingWorldLeagueGoalEvents) }

        // ── Copas continentales + Mundial de Clubes ─────────────────────────────
        // pendingCupResult: partido de copa del jugador ya jugado (rápido o en
        // vivo, ver getPendingCupMatch/startCupLiveMatch/commitCupLiveMatch) —
        // se consume acá una única vez y se limpia del store al final.
        const { pendingCupResult } = get()
        const cupResult = advanceContinentalCups(
          get().continentalCups, get().worldCup, updatedClubs, newCoach, season, newJob?.clubId || null, newWorldHistory.records, pendingCupResult,
        )
        updatedClubs = cupResult.clubs
        newCoach = cupResult.coach
        const newContinentalCups = cupResult.continentalCups
        const newWorldCup = cupResult.worldCup
        newNotifications.push(...cupResult.notifications)
        newCelebrations = [...newCelebrations, ...cupResult.celebrations]
        newWorldHistory = { ...newWorldHistory, records: cupResult.records }

        // Lesiones/tarjetas del partido de copa EN VIVO — partido real aparte
        // del de liga, con su propia tirada (mismo bloque que usa liveResult
        // más abajo, pero aplicado independientemente: un jugador puede
        // lesionarse en los dos partidos de la misma semana).
        if (pendingCupResult?.cardEvents && newJob) {
          const { injuries, yellows, reds } = pendingCupResult.cardEvents
          if (injuries.length || yellows.length || reds.length) {
            updatedClubs = updatedClubs.map(c => {
              if (c.id !== newJob.clubId) return c
              const newSquad = c.squad.map(p => {
                let np = { ...p }
                const inj = injuries.find(e => e.playerId === p.id)
                if (inj) {
                  np.injuredFor = (np.injuredFor || 0) + inj.matchdays
                  const cupName = CONTINENTAL_CUP_CONFIG[pendingCupResult.continentId]?.name || 'la copa'
                  newNotifications.push({ id: Date.now() + newNotifications.length + 160, category: 'player', text: `${p.name} se lesionó jugando la ${cupName} — fuera ${inj.matchdays} jornada${inj.matchdays !== 1 ? 's' : ''}`, read: false, season, matchday: notifMd })
                }
                const yellow = yellows.find(e => e.playerId === p.id)
                if (yellow) {
                  const newYellows = (np.yellowCards || 0) + 1
                  np.yellowCards = newYellows
                  if (newYellows >= 5 && newYellows % 5 === 0) {
                    np.suspendedFor = (np.suspendedFor || 0) + 1
                    newNotifications.push({ id: Date.now() + newNotifications.length + 170, category: 'player', text: `${p.name} acumuló 5 amarillas — suspendido 1 jornada`, read: false, season, matchday: notifMd })
                  }
                }
                const red = reds.find(e => e.playerId === p.id)
                if (red) {
                  np.suspendedFor = (np.suspendedFor || 0) + red.matchdays
                  newNotifications.push({ id: Date.now() + newNotifications.length + 180, category: 'player', text: `${p.name} vio la roja — suspendido ${red.matchdays} jornada${red.matchdays !== 1 ? 's' : ''}`, read: false, season, matchday: notifMd })
                }
                return np
              })
              return { ...c, squad: newSquad }
            })
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Subida de tier de reputación (post-partido, post-Copa) ──────────────
        const repTierCelebration = checkRepTierUp(repBeforeMatchday, newCoach.reputation)
        if (repTierCelebration) newCelebrations = [...newCelebrations, repTierCelebration]
        // ─────────────────────────────────────────────────────────────────────

        let newEvents = firedEvent ? [firedEvent]
          : cupResult.toastEvent ? [cupResult.toastEvent]
          : financeEvent ? [financeEvent]
          : matchEventNotifs.length > 0 ? [matchEventNotifs[0]]
          : []
        if (incomingOfferEvent && newEvents.length === 0) newEvents = [incomingOfferEvent]

        set({
          clubs: updatedClubs,
          freeAgents: updFreeAgents,
          leagues: newLeagues,
          worldLeagues: newWorldLeagues,
          continentalCups: newContinentalCups,
          pendingCupResult: null,
          worldCup: newWorldCup,
          foreignLeague: newForeignLeague,
          coach: newCoach,
          currentJob: newJob,
          screen: allDone ? 'season-end' : newScreen,
          activeTab: 'home',
          matchReport: allResults,
          events: newEvents,
          notifications: [...notifications, ...newNotifications].slice(-60),
          coachInterest: newCoachInterest,
          lifeEvents: newLifeEvents,
          lastLifeEventMd: newLastLifeEventMd,
          pressHeadlines: newPressHeadlines,
          pressConference: newPressConference,
          lastConferenceMd: newLastConferenceMd,
          transferOffers: updTransferOffers,
          transferWindowRan: updTransferWindowRan,
          aiTransferLog: updAiTransferLog,
          seasonEndData: allDone ? buildSeasonEndData(updatedClubs, newLeagues, newWorldLeagues, newCoach, newJob, season, newForeignLeague) : null,
          marketRumors: updMarketRumors,
          pendingMarketIntentions: updPendingIntentions,
          worldHistory: newWorldHistory,
          lastDtMesMd: newLastDtMesMd,
          celebrations: newCelebrations,
        })
      },

      processSeasonEnd() {
        const { clubs, leagues, coach, currentJob, season, seasonEndData, notifications, continentalCups, worldCup, worldHistory, celebrations } = get()
        const repBeforeSeasonEnd = coach.reputation
        const { foreignLeague } = get()
        const postNotifications = []

        // Detect if player is managing a world club
        const playerClubPre = currentJob ? clubs.find(c => c.id === currentJob.clubId) : null
        const isWorldJob = !!foreignLeague && playerClubPre && !LEAGUES.find(l => l.id === playerClubPre.leagueId)

        // Promotion / relegation (Argentine clubs only)
        const promotions = {}
        const relegations = {}

        // ── Historia: campeones de las ligas argentinas de esta temporada ────────
        const seasonTitles = []

        LEAGUES.forEach(league => {
          const lg = leagues[league.id]
          if (!lg) return
          const standings = calcStandings(lg.clubIds, lg.schedule)

          if (league.promoteSlots > 0) {
            const targetLeague = LEAGUES.find(l => l.tier === league.tier - 1)
            if (targetLeague) {
              standings.slice(0, league.promoteSlots).forEach(s => {
                promotions[s.clubId] = targetLeague.id
              })
            }
          }

          if (league.relegateSlots > 0) {
            const targetLeague = LEAGUES.find(l => l.tier === league.tier + 1)
            if (targetLeague) {
              standings.slice(-league.relegateSlots).forEach(s => {
                relegations[s.clubId] = targetLeague.id
              })
            }
          }

          const championId = standings[0]?.clubId
          if (championId) {
            const championClub = clubs.find(c => c.id === championId)
            const runnerUpClub = clubs.find(c => c.id === standings[1]?.clubId)
            seasonTitles.push({
              id: `title-${league.id}-${season}`, season,
              competitionId: league.id, competitionName: league.name,
              competitionType: 'league', scope: 'club',
              countryId: 'argentina', tier: league.tier,
              winnerId: championId, winnerName: championClub?.name || championId,
              runnerUpId: runnerUpClub?.id || null, runnerUpName: runnerUpClub?.name || null,
            })
          }
        })

        // ── Historia: ascensos/descensos de esta temporada ───────────────────────
        const seasonMovements = []
        Object.entries(promotions).forEach(([clubId, toLeagueId]) => {
          const club = clubs.find(c => c.id === clubId)
          if (!club) return
          seasonMovements.push({
            id: `mv-${clubId}-${season}-up`, season, clubId, clubName: club.name,
            fromLeagueId: club.leagueId, fromLeagueName: LEAGUES.find(l => l.id === club.leagueId)?.name,
            toLeagueId, toLeagueName: LEAGUES.find(l => l.id === toLeagueId)?.name,
            direction: 'up',
          })
        })
        Object.entries(relegations).forEach(([clubId, toLeagueId]) => {
          const club = clubs.find(c => c.id === clubId)
          if (!club) return
          seasonMovements.push({
            id: `mv-${clubId}-${season}-down`, season, clubId, clubName: club.name,
            fromLeagueId: club.leagueId, fromLeagueName: LEAGUES.find(l => l.id === club.leagueId)?.name,
            toLeagueId, toLeagueName: LEAGUES.find(l => l.id === toLeagueId)?.name,
            direction: 'down',
          })
        })

        // ── Historia: copas continentales + Mundial de Clubes (las que ya terminaron esta temporada) ──
        // Scoped por copa — mismo criterio que advanceSingleCup/advanceWorldCup,
        // para no dejar que un club argentino homónimo (ej. "pumas-fc") le
        // tape el nombre a un club del mundo real en otra copa.
        const cupTitles = []
        Object.entries(continentalCups).forEach(([continentId, cCup]) => {
          if (!cCup || cCup.phase !== 'done' || !cCup.champion) return
          const config = CONTINENTAL_CUP_CONFIG[continentId]
          const cupClubById = Object.fromEntries(
            [...WORLD_CLUBS, ...clubs.filter(c => cCup.argentineTeamIds?.includes(c.id))].map(c => [c.id, c]),
          )
          const finalRound = cCup.knockout[cCup.knockout.length - 1]
          const finalTie = finalRound?.ties?.[0]
          const runnerUpId = finalTie
            ? (finalTie.homeId === cCup.champion ? finalTie.awayId : finalTie.homeId)
            : null
          cupTitles.push({
            id: `title-${continentId}-${season}`, season,
            competitionId: `copa-${continentId}`, competitionName: config.name,
            competitionType: 'continental-cup', scope: 'club',
            countryId: null, tier: null,
            winnerId: cCup.champion, winnerName: cupClubById[cCup.champion]?.name || cCup.champion,
            runnerUpId, runnerUpName: runnerUpId ? (cupClubById[runnerUpId]?.name || runnerUpId) : null,
          })
        })
        let worldCupTitle = null
        if (worldCup?.phase === 'done' && worldCup.champion) {
          const wcArgentineChampionIds = worldCup.champions.filter(c => c.isArgentine).map(c => c.clubId)
          const wcClubById = Object.fromEntries(
            [...WORLD_CLUBS, ...clubs.filter(c => wcArgentineChampionIds.includes(c.id))].map(c => [c.id, c]),
          )
          const wcStandings = Object.values(worldCup.table).sort((a, b) =>
            b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
          )
          const runnerUpId = wcStandings.find(s => s.clubId !== worldCup.champion)?.clubId || null
          worldCupTitle = {
            id: `title-mundial-${season}`, season,
            competitionId: 'mundial-de-clubes', competitionName: 'Mundial de Clubes',
            competitionType: 'world-cup', scope: 'club',
            countryId: null, tier: null,
            winnerId: worldCup.champion, winnerName: wcClubById[worldCup.champion]?.name || worldCup.champion,
            runnerUpId, runnerUpName: runnerUpId ? (wcClubById[runnerUpId]?.name || runnerUpId) : null,
          }
        }

        let seasonAward = null
        const seasonCelebrations = []

        // Capture player's current league before promotions/relegations are applied
        const playerOriginalLeagueId = currentJob
          ? clubs.find(c => c.id === currentJob.clubId)?.leagueId
          : null

        // Apply promotions/relegations (only Argentine clubs have leagueId in LEAGUES)
        let updatedClubs = clubs.map(c => {
          if (promotions[c.id]) return { ...c, leagueId: promotions[c.id] }
          if (relegations[c.id]) return { ...c, leagueId: relegations[c.id] }
          return c
        })

        // Update AI manager assignments (randomize some changes)
        const rand = rng(Date.now())
        updatedClubs = updatedClubs.map(c => {
          if (c.managerId === 'player') return c
          if (rand() < 0.2) {
            const formations = ['4-4-2','4-3-3','4-2-3-1','3-5-2','5-3-2']
            return { ...c, formation: formations[Math.floor(rand() * formations.length)], morale: 60 + Math.floor(rand() * 30) }
          }
          return { ...c, morale: clamp(c.morale + Math.floor((rand() - 0.5) * 20), 40, 90) }
        })

        // Seasonal turnover: ~20% of AI-managed Argentine clubs lose their manager at season end
        // This guarantees a steady flow of vacancies every season
        const rand2 = rng(Date.now() + (season + 1) * 31)
        updatedClubs = updatedClubs.map(c => {
          if (c.managerId === 'player' || c.managerId === null) return c
          if (!LEAGUES.find(l => l.id === c.leagueId)) return c  // skip world clubs
          return rand2() < 0.20 ? { ...c, managerId: null } : c
        })

        // Handle player job status
        let newCoach = { ...coach, seasonsManaged: coach.seasonsManaged + 1 }
        let newJob = currentJob
        let newScreen = 'unemployed'
        let jobEvents = []
        let newForeignLeague = null

        if (currentJob) {
          const club = updatedClubs.find(c => c.id === currentJob.clubId)
          const leagueId = club?.leagueId

          // Standings calculation: use foreignLeague for world clubs, leagues for Argentine
          let standings
          if (isWorldJob && foreignLeague) {
            const flIds = WORLD_CLUBS.filter(c => c.leagueId === leagueId).map(c => c.id)
            standings = calcStandings(flIds, foreignLeague.schedule)
          } else {
            const lg = leagues[leagueId]
            standings = lg ? calcStandings(lg.clubIds, lg.schedule) : []
          }
          const pos = standings.findIndex(s => s.clubId === currentJob.clubId) + 1

          const objectiveMet = checkObjective(pos, currentJob.objective)
          const repBonus = objectiveRepBonus(objectiveMet, currentJob.objective)
          newCoach.reputation = clamp(newCoach.reputation + repBonus, 0, 100)

          const won = pos === 1
          if (won) {
            newCoach.trophies = [
              ...newCoach.trophies,
              { season, leagueId, clubId: club.id, clubName: club.name },
            ]
            postNotifications.push({ id: Date.now() + postNotifications.length, category: 'milestone', text: `¡Campeón! Ganaste la liga con ${club?.name} en la Temporada ${season}`, read: false, season, matchday: null })
            const leagueName = isWorldJob
              ? WORLD_LEAGUES.find(l => l.id === leagueId)?.name
              : LEAGUES.find(l => l.id === leagueId)?.name
            seasonCelebrations.push(makeCelebration({
              type: 'league-title', icon: '🏆',
              title: '¡CAMPEÓN!',
              subtitle: leagueName || '',
              detail: `${club?.name} · Temporada ${season}`,
            }))
          }

          const promoted = !isWorldJob && !!promotions[currentJob.clubId]
          if (promoted) {
            seasonCelebrations.push(makeCelebration({
              type: 'promotion', icon: '⬆️',
              title: '¡ASCENSO!',
              subtitle: LEAGUES.find(l => l.id === leagueId)?.name || '',
              detail: `${club?.name} · Temporada ${season}`,
            }))
          }

          seasonAward = checkDtDelAnio(season, club?.name, {
            won, objectiveMet, promoted,
            prestige: club?.prestige || 0, pos, totalTeams: standings.length,
          })
          if (seasonAward) {
            postNotifications.push({
              id: Date.now() + postNotifications.length + 5, category: 'award',
              text: `🏅 DT del Año: ${seasonAward.reason}`, read: false, season, matchday: null,
            })
            seasonCelebrations.push(makeCelebration({
              type: 'dt-anio', icon: '🏅',
              title: 'DT del Año',
              subtitle: club?.name || '',
              detail: `${seasonAward.reason} · Temporada ${season}`,
            }))
          }

          // Prize money and bonuses
          if (playerOriginalLeagueId) {
            const finLeagueId = resolveFinanceLeagueId(playerOriginalLeagueId)
            let prizeStandings
            if (isWorldJob && foreignLeague) {
              const flIds = WORLD_CLUBS.filter(c => c.leagueId === playerOriginalLeagueId).map(c => c.id)
              prizeStandings = calcStandings(flIds, foreignLeague.schedule)
            } else {
              const origLg = leagues[playerOriginalLeagueId]
              prizeStandings = origLg ? calcStandings(origLg.clubIds, origLg.schedule) : []
            }
            const prizePos = prizeStandings.findIndex(s => s.clubId === currentJob.clubId) + 1
            const prize = calcPrizeMoney(finLeagueId, prizePos)
            const titleBonus = prizePos === 1 ? (FINANCE.TITLE_BONUS[finLeagueId] || 0) : 0
            const promoBonus = !isWorldJob && promotions[currentJob.clubId]
              ? (FINANCE.PROMOTION_BONUS[finLeagueId] || 0) : 0
            const totalBonus = prize + titleBonus + promoBonus

            if (totalBonus > 0) {
              updatedClubs = updatedClubs.map(c =>
                c.id === currentJob.clubId
                  ? { ...c, budget: c.budget + totalBonus, finances: { ...(c.finances || {}), prizeRevenue: prize, promotionBonus: promoBonus } }
                  : c
              )
              if (prize > 0) jobEvents.push({ id: Date.now() + 10, text: `Premio de liga: ${fmtK(prize)}`, type: 'info' })
              if (titleBonus > 0) jobEvents.push({ id: Date.now() + 11, text: `¡Campeón! Bonus extra: ${fmtK(titleBonus)}`, type: 'success' })
              if (promoBonus > 0) {
                jobEvents.push({ id: Date.now() + 12, text: `¡Ascenso! Bonus: ${fmtK(promoBonus)}`, type: 'success' })
                postNotifications.push({ id: Date.now() + postNotifications.length + 10, category: 'milestone', text: `¡Ascenso! ${club?.name} sube de categoría la próxima temporada`, read: false, season, matchday: null })
              }
              if (!isWorldJob && relegations[currentJob.clubId]) {
                postNotifications.push({ id: Date.now() + postNotifications.length + 20, category: 'milestone', text: `Descenso — ${club?.name} baja de categoría la próxima temporada`, read: false, season, matchday: null })
              }
            }
          }

          // Contract renewal check
          if (objectiveMet || currentJob.boardConfidence >= 55) {
            const renewedClub = updatedClubs.find(c => c.id === currentJob.clubId)
            const renewedLeagueId = renewedClub?.leagueId
            const newWorldLeagueInfo = isWorldJob
              ? { ...WORLD_LEAGUES.find(l => l.id === renewedLeagueId), teams: WORLD_CLUBS.filter(c => c.leagueId === renewedLeagueId).length }
              : null
            newJob = {
              ...currentJob,
              boardConfidence: 60,
              contractEndSeason: season + 2,
              objective: getObjective(renewedClub, renewedLeagueId, newWorldLeagueInfo),
            }
            updatedClubs = updatedClubs.map(c =>
              c.id === currentJob.clubId ? { ...c, managerId: 'player' } : c
            )
            newScreen = 'dashboard'
            // Regenerate foreign league schedule for the new season
            if (isWorldJob && renewedLeagueId) {
              const flIds = WORLD_CLUBS.filter(c => c.leagueId === renewedLeagueId).map(c => c.id)
              const newSchedule = generateSchedule(flIds)
              newForeignLeague = { leagueId: renewedLeagueId, schedule: newSchedule, currentMatchday: 0, totalMatchdays: newSchedule.length, completed: false }
            }
            jobEvents.push({
              id: Date.now(),
              text: objectiveMet
                ? `¡Objetivo cumplido! Contrato renovado en ${club?.name}`
                : `Contrato renovado en ${club?.name}`,
              type: 'success',
            })
            postNotifications.push({
              id: Date.now() + postNotifications.length + 30,
              category: 'board',
              text: objectiveMet
                ? `La dirigencia renovó tu contrato tras cumplir el objetivo en ${club?.name}`
                : `La dirigencia renovó tu contrato en ${club?.name} por buen rendimiento`,
              read: false, season, matchday: null,
            })
          } else {
            // Fired at season end
            if (isWorldJob) updatedClubs = updatedClubs.filter(c => c.id !== currentJob.clubId)
            else updatedClubs = updatedClubs.map(c => c.id === currentJob.clubId ? { ...c, managerId: null } : c)
            newCoach.reputation = clamp(newCoach.reputation - 5, 0, 100)
            newCoach.jobHistory = [
              ...newCoach.jobHistory,
              { clubId: currentJob.clubId, clubName: club?.name, season, fired: true, pos },
            ]
            newJob = null
            newScreen = 'unemployed'
            jobEvents.push({
              id: Date.now(),
              text: `No renovaron tu contrato en ${club?.name}`,
              type: 'danger',
            })
            postNotifications.push({
              id: Date.now() + postNotifications.length + 40,
              category: 'board',
              text: `La dirigencia de ${club?.name} decidió no renovar tu contrato`,
              read: false, season, matchday: null,
            })
          }
        }

        // Fast-forward any world leagues that haven't finished yet
        const currentWorldLeagues = get().worldLeagues
        const completedWorldLeagues = { ...currentWorldLeagues }
        for (const [leagueId, lg] of Object.entries(completedWorldLeagues)) {
          if (lg.completed) continue
          const clubsById = WORLD_CLUBS_BY_LEAGUE[leagueId] || {}
          let newStandings = { ...lg.standings }
          let matchday = lg.currentMatchday
          while (matchday < lg.totalMatchdays) {
            getLightweightFixtures(lg.clubIds, matchday).forEach(({ homeId, awayId }) => {
              const hc = clubsById[homeId]; const ac = clubsById[awayId]
              if (!hc || !ac) return
              const { homeGoals, awayGoals } = simulateLightweightMatch(hc, ac)
              newStandings = applyLightweightFixture(newStandings, homeId, awayId, homeGoals, awayGoals)
            })
            matchday++
          }
          completedWorldLeagues[leagueId] = {
            ...lg,
            standings: newStandings,
            currentMatchday: matchday,
            completed: true,
            champion: getLeagueChampion(newStandings),
          }
        }

        // ── Historia: campeones de las ligas del mundo de esta temporada ─────────
        const worldTitles = []
        WORLD_LEAGUES.forEach(league => {
          const lg = completedWorldLeagues[league.id]
          if (!lg?.champion) return
          const sorted = Object.values(lg.standings).sort((a, b) =>
            b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga)
          )
          const runnerUpId = sorted[1]?.clubId || null
          const clubsById = WORLD_CLUBS_BY_LEAGUE[league.id] || {}
          worldTitles.push({
            id: `title-${league.id}-${season}`, season,
            competitionId: league.id, competitionName: league.name,
            competitionType: 'league', scope: 'club',
            countryId: league.countryId, tier: league.tier,
            winnerId: lg.champion, winnerName: clubsById[lg.champion]?.name || lg.champion,
            runnerUpId, runnerUpName: runnerUpId ? (clubsById[runnerUpId]?.name || runnerUpId) : null,
          })
        })

        const newWorldHistory = {
          titles: [...worldHistory.titles, ...seasonTitles, ...worldTitles, ...cupTitles, ...(worldCupTitle ? [worldCupTitle] : [])],
          movements: [...worldHistory.movements, ...seasonMovements],
          awards: [...worldHistory.awards, ...(seasonAward ? [seasonAward] : [])],
          records: worldHistory.records,
        }

        // Age up all players and apply skill evolution for the new season.
        // También cuenta regresiva de contrato: mi club (newJob?.clubId) es
        // el único que pierde jugadores de verdad al vencer (expired); el
        // resto se auto-renueva en silencio (ver developPlayers en sim.js).
        const devResult = developPlayers(updatedClubs, newJob?.clubId ?? null)
        updatedClubs = devResult.clubs

        let departingContractPlayers = []
        if (newJob && devResult.expired.length) {
          const expiredIds = new Set(devResult.expired.map(e => e.playerId))
          const myClub = updatedClubs.find(c => c.id === newJob.clubId)
          departingContractPlayers = (myClub?.squad || [])
            .filter(p => expiredIds.has(p.id))
            .map(p => ({ ...p, clubId: null, contract: null }))
          updatedClubs = updatedClubs.map(c =>
            c.id === newJob.clubId
              ? {
                  ...c,
                  squad: c.squad.filter(p => !expiredIds.has(p.id)),
                  starters: (c.starters || []).filter(id => !expiredIds.has(id)),
                }
              : c
          )
          departingContractPlayers.forEach(p => {
            postNotifications.push({
              id: Date.now() + postNotifications.length + 95,
              category: 'player',
              text: `${p.name} se fue libre — no renovaste su contrato a tiempo`,
              read: false, season: season + 1, matchday: null,
            })
          })
        }
        if (newJob && devResult.expiringSoon.length) {
          const soonIds = new Set(devResult.expiringSoon.map(e => e.playerId))
          const myClub = updatedClubs.find(c => c.id === newJob.clubId)
          ;(myClub?.squad || []).filter(p => soonIds.has(p.id)).forEach(p => {
            postNotifications.push({
              id: Date.now() + postNotifications.length + 96,
              category: 'player',
              text: `${p.name} entra al último año de contrato — renoválo o se va libre`,
              read: false, season: season + 1, matchday: null,
            })
          })
        }

        // Peak / decline notifications (after developPlayers aged everyone up)
        if (newJob) {
          const devClub = updatedClubs.find(c => c.id === newJob.clubId)
          devClub?.squad.forEach(p => {
            if (p.age === 29 && p.skill >= 70 && p.skill >= (p.potential || p.skill) - 2) {
              postNotifications.push({
                id: Date.now() + postNotifications.length + 60,
                category: 'player',
                text: `${p.name} (${p.age} años, ${p.skill}) está en su techo — sacá lo mejor de él ahora`,
                read: false, season: season + 1, matchday: null,
              })
            }
            if (p.age === 33 && p.skill >= 62) {
              postNotifications.push({
                id: Date.now() + postNotifications.length + 70,
                category: 'player',
                text: `${p.name} (${p.age} años) empieza a declinar — pensá en la renovación del plantel`,
                read: false, season: season + 1, matchday: null,
              })
            }
          })
        }

        // ── Cantera: nueva camada de juveniles (solo el club del jugador) ────
        if (newJob) {
          const youthClub = updatedClubs.find(c => c.id === newJob.clubId)
          if (youthClub) {
            const rand = rng(Date.now() + hashClubId(youthClub.id) + season)
            const { players: newYouths, gemsFound, nextCounter } = generateYouthIntake(youthClub, rand)
            updatedClubs = updatedClubs.map(c =>
              c.id === newJob.clubId
                ? { ...c, youthSquad: [...(c.youthSquad || []), ...newYouths], youthCounter: nextCounter }
                : c
            )
            newYouths.forEach(p => {
              postNotifications.push({
                id: Date.now() + postNotifications.length + 90,
                category: 'player',
                text: `Nuevo juvenil en la cantera: ${p.name} (${p.position}, ${p.age} años) — ${p.scoutLabel}`,
                read: false, season: season + 1, matchday: null,
              })
            })
            if (gemsFound > 0) {
              const gem = newYouths.find(p => p.isGem) || newYouths[0]
              seasonCelebrations.push(makeCelebration({
                type: 'academy-gem', icon: '💎',
                title: '¡Joya de la cantera!',
                subtitle: gem.name,
                detail: `${gem.position} · ${gem.age} años · ${gem.scoutLabel}`,
              }))
            }
          }
        }

        // Reset finances ledger and prep the squad for preseason: cura lesiones y
        // suspensiones (antes quedaban colgadas de la temporada anterior — bug),
        // resetea contadores, y empuja la moral hacia un punto medio en vez de
        // arrastrar un extremo injusto de la temporada que terminó.
        if (newJob) {
          updatedClubs = updatedClubs.map(c =>
            c.id === newJob.clubId
              ? {
                  ...c,
                  finances: blankFinances(season + 1),
                  morale: clamp(Math.round((c.morale + 70) / 2), 50, 90),
                  trainingFocus: null,
                  squad: c.squad.map(p => ({
                    ...p,
                    yellowCards: 0,
                    benchMatchdays: 0,
                    injuredFor: 0,
                    suspendedFor: 0,
                    lowMoraleStreak: 0,
                    morale: clamp(Math.round(((p.morale ?? 70) + 70) / 2), 50, 90),
                  })),
                }
              : c
          )
        }

        const newSeason = season + 1
        // buildLeagueState only includes Argentine clubs; world club is not in LEAGUES
        const newLeagueState = buildLeagueState(updatedClubs.filter(c => LEAGUES.find(l => l.id === c.leagueId)))
        const newFreeAgents = [...generateFreeAgents(Date.now(), 35), ...departingContractPlayers]

        // ── Subida de tier de reputación (fin de temporada) ──────────────────────
        const repTierCelebration = checkRepTierUp(repBeforeSeasonEnd, newCoach.reputation)
        if (repTierCelebration) seasonCelebrations.push(repTierCelebration)
        // ─────────────────────────────────────────────────────────────────────

        set({
          season: newSeason,
          clubs: updatedClubs,
          freeAgents: newFreeAgents,
          leagues: newLeagueState,
          worldLeagues: buildWorldLeagueState(),
          continentalCups: { europa: null, sudamerica: null, norteamerica: null },
          worldCup: null,
          foreignLeague: newForeignLeague,
          coach: newCoach,
          currentJob: newJob,
          screen: newJob ? 'preseason' : newScreen,
          activeTab: 'home',
          matchReport: null,
          liveMatch: null,
          pendingCupResult: null,
          seasonEndData: null,
          preseasonFriendlyResults: [],
          preseasonFocusDraft: 'ninguno',
          pressHeadlines: [],
          pressConference: null,
          lastConferenceMd: 0,
          transferOffers: [],
          aiTransferLog: [],
          transferWindowRan: { verano: false, invierno: false },
          contractNegotiation: null,
          marketRumors: [],
          pendingMarketIntentions: [],
          worldHistory: newWorldHistory,
          events: jobEvents,
          notifications: [...notifications, ...postNotifications].slice(-60),
          coachInterest: null,
          lifeEvents: [],
          lastLifeEventMd: 0,
          celebrations: [...celebrations, ...seasonCelebrations],
        })
      },

      // ── Pretemporada ──────────────────────────────────────────────────────
      // Confirma las decisiones de pretemporada (foco de entrenamiento) y
      // recién ahí manda al jugador al Dashboard. Los amistosos ya se aplican
      // en el momento en que se juegan (playPreseasonFriendlyQuick/
      // commitPreseasonFriendly), no acá.
      setPreseasonFocusDraft(focus) {
        set({ preseasonFocusDraft: focus })
      },

      finishPreseason(trainingFocus) {
        const { screen, currentJob, clubs, season, preseasonFocusDraft } = get()
        if (screen !== 'preseason' || !currentJob) return
        const chosen = trainingFocus ?? preseasonFocusDraft ?? 'ninguno'
        const focus = chosen && chosen !== 'ninguno' ? chosen : null
        const updatedClubs = clubs.map(c => {
          if (c.id !== currentJob.clubId) return c
          const next = { ...c, trainingFocus: focus ? { type: focus, season } : null }
          if (focus === 'juveniles') next.youthSquad = applyYouthCamp(c.youthSquad)
          return next
        })
        set({ clubs: updatedClubs, screen: 'dashboard', preseasonFocusDraft: 'ninguno' })
      },

      setScreen(screen, tab) {
        set({ screen, activeTab: tab || 'home' })
      },

      setTab(tab) {
        set({ activeTab: tab })
      },

      clearEvents() {
        set({ events: [] })
      },

      markNotificationsRead() {
        set({ notifications: get().notifications.map(n => ({ ...n, read: true })) })
      },

      dismissNotification(id) {
        set({ notifications: get().notifications.filter(n => n.id !== id) })
      },

      // ── Life events (generic — see src/data/lifeEvents.js) ────────────────────

      respondToLifeEvent(optionIndex) {
        const { lifeEvents, currentJob, clubs, coach, leagues, foreignLeague, season, notifications } = get()
        const event = lifeEvents[0]
        if (!event) return
        const remaining = lifeEvents.slice(1)
        const opt = event.options[optionIndex]
        if (!opt || !currentJob) { set({ lifeEvents: remaining }); return }

        const club = clubs.find(c => c.id === currentJob.clubId)
        const squad = club?.squad || []
        const effects = opt.effects || {}

        // ── "Vender" on a live offer (mercado > pedido_salida_oferta) — closes
        // the transfer right now instead of applying morale/board deltas.
        if (effects.sellFor) {
          const { amount, buyerClubId } = effects.sellFor
          const player = squad.find(p => p.id === event.subjectPlayerId)
          if (!player) { set({ lifeEvents: remaining }); return }
          set({
            clubs: doTransfer(clubs, buyerClubId, currentJob.clubId, player, amount),
            lifeEvents: remaining,
            events: [{ id: Date.now(), text: `¡Fichaje cerrado! ${player.name} sale por $${Math.round(amount / 1000)}k`, type: 'success' }],
          })
          return
        }

        const { playerMoraleDelta, clubMoraleDelta, boardConfidenceDelta, reputationDelta } =
          resolveLifeEventEffects(effects, { subjectPlayerId: event.subjectPlayerId, squad })

        // ── "Convencer" — track a verifiable deadline, checked every matchday
        // via checkPromiseDeadlines (src/data/lifeEvents.js).
        let promise = null
        if (effects.promise) {
          const activeLg = foreignLeague || leagues[club?.leagueId]
          const currentMd = activeLg?.currentMatchday || 0
          const totalMd = activeLg?.totalMatchdays || 34
          const deadlineMatchday = effects.promise.type === 'sell_next_window'
            ? getNextWindowCloseMatchday(currentMd, totalMd)
            : effects.promise.type === 'more_minutes' ? currentMd + 3 : currentMd + 4
          promise = { type: effects.promise.type, deadlineMatchday, deadlineSeason: season }
        }

        const updatedClubs = clubs.map(c => {
          if (c.id !== currentJob.clubId) return c
          return {
            ...c,
            morale: clamp(c.morale + clubMoraleDelta, 20, 100),
            squad: c.squad.map(p => {
              if (p.id !== event.subjectPlayerId) return p
              return {
                ...p,
                morale: clamp((p.morale ?? 70) + playerMoraleDelta, 0, 100),
                ...(promise ? { promise } : {}),
                ...(effects.transferListed ? { transferListed: true } : {}),
              }
            }),
          }
        })
        // ── "Firmar" en carrera_contrato_presion — extiende el contrato actual.
        const newJob = {
          ...currentJob,
          boardConfidence: clamp(currentJob.boardConfidence + boardConfidenceDelta, 0, 100),
          ...(effects.contractYears ? { contractEndSeason: currentJob.contractEndSeason + effects.contractYears } : {}),
        }
        const newCoach = reputationDelta !== 0
          ? { ...coach, reputation: clamp(coach.reputation + reputationDelta, 0, 100) }
          : coach

        // ── "Escuchar" en carrera_tentacion_secreta / carrera_club_historico_crisis
        // — siembra un rumor de interés real (mismo shape que el sistema pasivo
        // de coachInterest en simulateMatchday); la escalada a oferta formal la
        // sigue manejando ese código sin cambios.
        let newCoachInterest = get().coachInterest
        let newNotifications = notifications
        if (effects.startCoachInterest) {
          const { clubId, prestige } = effects.startCoachInterest
          const suitor = clubs.find(c => c.id === clubId)
          const activeLg = foreignLeague || leagues[club?.leagueId]
          newCoachInterest = {
            clubId,
            clubName: suitor?.name || 'el club interesado',
            prestige: prestige ?? suitor?.prestige ?? 0,
            salary: Math.floor((prestige ?? suitor?.prestige ?? 0) * 900 + 6000),
            rumorMatchday: activeLg?.currentMatchday || 0,
            rumorSeason: season,
          }
          newNotifications = [...notifications, {
            id: Date.now() + 700,
            category: 'interest',
            text: `Dejaste la puerta abierta con ${newCoachInterest.clubName} — a ver qué pasa`,
            read: false, season, matchday: activeLg?.currentMatchday || 0,
          }]
        }

        const parts = []
        if (playerMoraleDelta > 0) parts.push(`Ánimo +${playerMoraleDelta}`)
        if (playerMoraleDelta < 0) parts.push(`Ánimo ${playerMoraleDelta}`)
        if (clubMoraleDelta > 0) parts.push(`Moral plantel +${clubMoraleDelta}`)
        if (clubMoraleDelta < 0) parts.push(`Moral plantel ${clubMoraleDelta}`)
        if (boardConfidenceDelta > 0) parts.push(`Confianza +${boardConfidenceDelta}`)
        if (boardConfidenceDelta < 0) parts.push(`Confianza ${boardConfidenceDelta}`)
        if (reputationDelta > 0) parts.push(`Reputación +${reputationDelta}`)
        if (reputationDelta < 0) parts.push(`Reputación ${reputationDelta}`)
        if (promise) parts.push('Promesa pendiente')
        if (effects.transferListed) parts.push('Transferible')
        if (effects.contractYears) parts.push(`Contrato +${effects.contractYears} años`)
        if (effects.startCoachInterest) parts.push('Diálogo abierto')
        const evText = parts.join(' · ') || 'Conversación sin efecto inmediato'
        const netDelta = playerMoraleDelta + clubMoraleDelta
        const evType = netDelta > 0 ? 'success' : netDelta < 0 ? 'danger' : 'info'

        set({
          clubs: updatedClubs,
          currentJob: newJob,
          coach: newCoach,
          coachInterest: newCoachInterest,
          notifications: newNotifications,
          lifeEvents: remaining,
          events: [{ id: Date.now(), text: evText, type: evType }],
        })
      },

      startCharla(playerId, charlaType) {
        const { currentJob, clubs, lifeEvents } = get()
        if (!currentJob || lifeEvents.length > 0) return
        const club = clubs.find(c => c.id === currentJob.clubId)
        const player = club?.squad.find(p => p.id === playerId)
        if (!player) return
        const event = getCharlaEvent(charlaType, player)
        if (!event) return
        set({ lifeEvents: [...lifeEvents, event] })
      },

      respondToCoachOffer(notifId, accept) {
        const { notifications, currentJob, clubs, coach, season, foreignLeague } = get()
        const notif = notifications.find(n => n.id === notifId)
        if (!notif || notif.actionType !== 'coachOffer') return

        const cleanedNotifs = notifications.filter(n => n.id !== notifId)

        if (!accept) {
          set({ notifications: cleanedNotifs, coachInterest: null })
          return
        }

        const { clubId, clubName } = notif.actionPayload

        // Update coach: +3 rep for being headhunted, log previous job
        let newCoach = { ...coach, reputation: clamp(coach.reputation + 3, 0, 100) }
        if (currentJob) {
          const prevClub = clubs.find(c => c.id === currentJob.clubId)
          newCoach.jobHistory = [
            ...newCoach.jobHistory,
            { clubId: currentJob.clubId, clubName: prevClub?.name, season, leftForBetterOffer: true },
          ]
        }

        // Free the current club
        let updatedClubs = currentJob
          ? clubs.map(c => c.id === currentJob.clubId ? { ...c, managerId: null } : c)
          : [...clubs]
        let clearedForeignLeague = foreignLeague
        if (foreignLeague && currentJob) {
          updatedClubs = updatedClubs.filter(c => c.id !== currentJob.clubId)
          clearedForeignLeague = null
        }

        set({
          clubs: updatedClubs,
          foreignLeague: clearedForeignLeague,
          currentJob: null,
          coach: newCoach,
          notifications: cleanedNotifs,
          coachInterest: null,
          events: [{ id: Date.now(), text: `Aceptaste la oferta de ${clubName} — ¡nueva aventura!`, type: 'success' }],
        })

        // acceptJob reads the already-updated clubs from the store
        get().acceptJob(clubId)
      },

      dismissMatchReport() {
        set({ matchReport: null })
      },

      dismissCelebration() {
        set({ celebrations: get().celebrations.slice(1) })
      },

      resetGame() {
        set({
          hasGame: false,
          screen: 'main-menu',
          coach: null,
          clubs: [],
          freeAgents: [],
          leagues: {},
          worldLeagues: {},
          worldInitialized: false,
          detailedCountryId: 'argentina',
          continentalCups: { europa: null, sudamerica: null, norteamerica: null },
          worldCup: null,
          currentJob: null,
          foreignLeague: null,
          events: [],
          notifications: [],
          coachInterest: null,
          lifeEvents: [],
          lastLifeEventMd: 0,
          matchReport: null,
          liveMatch: null,
          pendingCupResult: null,
          seasonEndData: null,
          preseasonFriendlyResults: [],
          preseasonFocusDraft: 'ninguno',
          celebrations: [],
          pressHeadlines: [],
          pressConference: null,
          lastConferenceMd: 0,
          transferOffers: [],
          aiTransferLog: [],
          transferWindowRan: { verano: false, invierno: false },
          contractNegotiation: null,
          marketRumors: [],
          pendingMarketIntentions: [],
          worldHistory: { titles: [], movements: [], awards: [], records: {} },
          lastDtMesMd: 0,
          worldClubSquads: {},
          worldSeed: 0,
          season: 1,
        })
      },

      // ── Selectors (derived state helpers) ──────────────────────────────────
      getClub(id) {
        return get().clubs.find(c => c.id === id)
      },

      getPlayerClub() {
        const { clubs, currentJob } = get()
        if (!currentJob) return null
        return clubs.find(c => c.id === currentJob.clubId) || null
      },

      getLeagueStandings(leagueId) {
        const { leagues, foreignLeague } = get()
        if (foreignLeague?.leagueId === leagueId) {
          const ids = WORLD_CLUBS.filter(c => c.leagueId === leagueId).map(c => c.id)
          return calcStandings(ids, foreignLeague.schedule)
        }
        const lg = leagues[leagueId]
        if (!lg) return []
        return calcStandings(lg.clubIds, lg.schedule)
      },

      getLeagueForClub(clubId) {
        const { clubs } = get()
        const club = clubs.find(c => c.id === clubId)
        return club?.leagueId || null
      },

      getAvailableJobs() {
        const { clubs, coach, season } = get()
        return makeAvailableJobs(clubs, coach?.reputation || 0, coach?.jobHistory, season)
      },

      getUpcomingMatches(clubId, count = 5) {
        const { clubs, leagues, foreignLeague } = get()
        const club = clubs.find(c => c.id === clubId)
        if (!club) return []
        const lg = (foreignLeague?.leagueId === club.leagueId ? foreignLeague : null) || leagues[club.leagueId]
        if (!lg) return []
        const upcoming = []
        for (let i = lg.currentMatchday; i < lg.schedule.length && upcoming.length < count; i++) {
          const match = lg.schedule[i].find(m => m.homeId === clubId || m.awayId === clubId)
          if (match) upcoming.push({ ...match, matchday: i + 1 })
        }
        return upcoming
      },

      // Peeks at whether the NEXT simulateMatchday() call would resolve a
      // continental-cup OR Mundial-de-Clubes fixture involving the player's
      // club — without touching any randomness. Used to gate the Dashboard:
      // show a dedicated cup-match card (rápido/en vivo) instead of silently
      // letting the cup/Mundial auto-resolve. Returns null once this turn's
      // fixture is already staged in pendingCupResult (nothing left to peek
      // at for this turn).
      getPendingCupMatch() {
        const { continentalCups, worldCup, currentJob, clubs, pendingCupResult } = get()
        const playerClubId = currentJob?.clubId
        if (!playerClubId || pendingCupResult) return null

        for (const continentId of Object.keys(CONTINENTAL_CUP_CONFIG)) {
          const cup = continentalCups[continentId]
          if (!cup || cup.phase === 'done') continue
          if (!cup.teamIds?.includes(playerClubId)) continue
          if (cup.tickCount % 2 !== 0) continue // this cup won't advance on the next call

          let homeId, awayId
          let roundSize = null
          if (cup.phase === 'groups') {
            const group = cup.groups.find(g => g.clubIds.includes(playerClubId))
            if (!group) continue
            const fixture = getGroupMatchdayFixtures(group, cup.groupMd).find(f => f.homeId === playerClubId || f.awayId === playerClubId)
            if (!fixture) continue
            homeId = fixture.homeId; awayId = fixture.awayId
          } else if (cup.phase === 'knockout' && cup.pendingBracket) {
            const idx = cup.pendingBracket.indexOf(playerClubId)
            if (idx === -1) continue
            const pairIdx = idx % 2 === 0 ? idx : idx - 1
            homeId = cup.pendingBracket[pairIdx]; awayId = cup.pendingBracket[pairIdx + 1]
            roundSize = cup.pendingBracket.length
            if (!awayId) continue
          } else {
            continue
          }

          const opponentId = homeId === playerClubId ? awayId : homeId
          const opponentClub = resolveLiveClub(opponentId, clubs)
          return {
            continentId,
            competitionName: CONTINENTAL_CUP_CONFIG[continentId].name,
            phase: cup.phase,
            homeId, awayId, opponentId,
            isPlayerHome: homeId === playerClubId,
            opponentName: opponentClub?.name || opponentId,
            opponentColor: opponentClub?.color || '#888',
            roundName: roundSize ? (CUP_ROUND_NAME[roundSize] || `Ronda de ${roundSize}`) : null,
          }
        }

        // Mundial de Clubes — misma mecánica que las copas continentales de
        // arriba (mismo gating por tickCount, mismo getPendingCupMatch/
        // startCupLiveMatch/commitCupLiveMatch), usando 'mundial' como
        // continentId sentinel para que pendingCupResult sepa a cuál de las
        // 4 competencias (3 continentales + Mundial) ruteárselo.
        if (worldCup && worldCup.phase !== 'done' && worldCup.tickCount % 2 === 0) {
          const fixture = worldCup.fixtures[worldCup.nextFixtureIdx]
          if (fixture && (fixture.homeId === playerClubId || fixture.awayId === playerClubId)) {
            const opponentId = fixture.homeId === playerClubId ? fixture.awayId : fixture.homeId
            const opponentClub = resolveLiveClub(opponentId, clubs)
            return {
              continentId: 'mundial',
              competitionName: 'Mundial de Clubes',
              phase: 'mundial',
              homeId: fixture.homeId, awayId: fixture.awayId, opponentId,
              isPlayerHome: fixture.homeId === playerClubId,
              opponentName: opponentClub?.name || opponentId,
              opponentColor: opponentClub?.color || '#888',
              roundName: null,
            }
          }
        }
        return null
      },

      getRecentResults(clubId, count = 5) {
        const { clubs, leagues, foreignLeague } = get()
        const club = clubs.find(c => c.id === clubId)
        if (!club) return []
        const lg = (foreignLeague?.leagueId === club.leagueId ? foreignLeague : null) || leagues[club.leagueId]
        if (!lg) return []
        const played = []
        lg.schedule.forEach(md => {
          md.forEach(m => {
            if ((m.homeId === clubId || m.awayId === clubId) && m.homeGoals !== null) {
              played.push(m)
            }
          })
        })
        return played.slice(-count)
      },

      getWorldStandings(leagueId) {
        const { worldLeagues } = get()
        const lg = worldLeagues[leagueId]
        if (!lg) return []
        return Object.values(lg.standings).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          const gdA = a.gf - a.ga, gdB = b.gf - b.ga
          if (gdB !== gdA) return gdB - gdA
          return b.gf - a.gf
        })
      },

      getCurrentMatchday() {
        const { currentJob, clubs, leagues, foreignLeague } = get()
        if (!currentJob) return { current: 0, total: 0 }
        const club = clubs.find(c => c.id === currentJob.clubId)
        if (!club) return { current: 0, total: 0 }
        if (foreignLeague) return { current: foreignLeague.currentMatchday, total: foreignLeague.totalMatchdays }
        const lg = leagues[club.leagueId]
        if (!lg) return { current: 0, total: 0 }
        return { current: lg.currentMatchday, total: lg.totalMatchdays }
      },

      getInternationalOffers() {
        const { coach, season } = get()
        const rep = coach?.reputation || 0
        const rand = rng(season * 97 + Math.floor(rep * 13))
        const eligible = WORLD_CLUBS
          .filter(c => canApplyToClub(rep, c.prestige))
          .filter(c => !isClubOnCooldown(c.id, coach?.jobHistory, season))
        if (!eligible.length) return []
        const shuffled = [...eligible].sort(() => rand() - 0.5)
        return shuffled.slice(0, 5).map(c => ({
          clubId: c.id,
          salary: Math.floor(c.prestige * 850 + 5000),
        }))
      },
    }),
    {
      name: 'dt-career-save',
      version: 18,
      migrate(state, version) {
        let s = state
        if (version < 2) {
          s = {
            ...s,
            worldLeagues: buildWorldLeagueState(),
            worldInitialized: true,
            detailedCountryId: 'argentina',
          }
        }
        if (version < 3) {
          const addPotential = p => p.potential != null ? p : { ...p, potential: assignPotential(p) }
          s = {
            ...s,
            clubs: (s.clubs || []).map(c => ({
              ...c,
              squad: (c.squad || []).map(addPotential),
            })),
            freeAgents: (s.freeAgents || []).map(addPotential),
          }
        }
        if (version < 4) {
          const currentJob = s.currentJob
          let clubs = (s.clubs || []).map(c => ({
            ...c,
            finances: c.finances || blankFinances(s.season || 1),
          }))
          // For mid-season saves, inject season-start revenues that weren't tracked before
          if (currentJob) {
            const playerClub = clubs.find(c => c.id === currentJob.clubId)
            const leagueId = playerClub?.leagueId
            const lg = s.leagues?.[leagueId]
            if (playerClub && lg && lg.currentMatchday > 0) {
              const tvRev = FINANCE.TV_REVENUE[leagueId] || 0
              const sponsorRev = calcSponsorRevenue(playerClub.prestige, leagueId)
              const boardInv = calcBoardInvestment(currentJob.boardConfidence, leagueId)
              const maint = FINANCE.MAINTENANCE[leagueId] || 0
              clubs = clubs.map(c =>
                c.id === currentJob.clubId
                  ? {
                      ...c,
                      budget: c.budget + tvRev + sponsorRev + boardInv - maint,
                      finances: { ...c.finances, tvRevenue: tvRev, sponsorRevenue: sponsorRev, boardInvestment: boardInv, maintenancePaid: maint },
                    }
                  : c
              )
            }
          }
          s = { ...s, clubs }
        }
        if (version < 5) {
          s = { ...s, foreignLeague: s.foreignLeague || null }
        }
        if (version < 6) {
          s = { ...s, pressHeadlines: [], pressConference: null, lastConferenceMd: 0 }
        }
        if (version < 7) {
          s = { ...s, notifications: [] }
        }
        if (version < 8) {
          s = { ...s, coachInterest: null }
        }
        if (version < 9) {
          s = { ...s, playerDiscontent: null }
        }
        if (version < 10) {
          s = { ...s, lifeEvents: [], lastLifeEventMd: 0 }
        }
        if (version < 11) {
          s = { ...s, marketRumors: [], pendingMarketIntentions: [] }
        }
        if (version < 12) {
          s = { ...s, worldHistory: { titles: [], movements: [], awards: [], records: {} }, lastDtMesMd: 0 }
        }
        if (version < 13) {
          s = { ...s, worldClubSquads: {}, worldSeed: Date.now() }
        }
        if (version < 14) {
          // La vieja Copa Internacional única se reemplaza por 3 copas
          // continentales + Mundial — un torneo en curso no migra limpio a la
          // nueva forma, así que arranca de cero la próxima vez que se llame
          // a simulateMatchday (mismo criterio que otros resets de temporada).
          // El campo `cup` viejo queda huérfano en el save — nada lo lee más.
          s = { ...s, continentalCups: { europa: null, sudamerica: null, norteamerica: null }, worldCup: null }
        }
        if (version < 15) {
          // Estilo de juego (Mentalidad/Presión/Ritmo/Ataque) — clubes de
          // saves viejos no tienen `.tactics`; se backfillea con el default
          // neutro (mismo comportamiento que tenían antes de este cambio).
          s = { ...s, clubs: s.clubs.map(c => ({ ...c, tactics: c.tactics || { ...DEFAULT_TACTICS } })) }
        }
        if (version < 16) {
          // Cantera — clubes de saves viejos no tienen youthSquad/youthCounter.
          s = { ...s, clubs: s.clubs.map(c => ({ ...c, youthSquad: c.youthSquad || [], youthCounter: c.youthCounter || 0 })) }
        }
        if (version < 17) {
          // generateFreeAgents reciclaba ids `fa-0`..`fa-N` en cada temporada
          // (bug, ver gameData.js). Un jugador fichado/liberado en una
          // temporada vieja podía terminar con el mismo id que un agente
          // libre nuevo de una temporada posterior, generando ids duplicados
          // dentro del plantel de un club o de `freeAgents` — eso rompía las
          // keys de React y hacía que listas filtradas (ej. Mercado) parecieran
          // no actualizarse. Estos saves ya tienen la corrupción guardada, así
          // que se limpia acá una sola vez (se queda con la primera aparición).
          const dedupeById = list => {
            const seen = new Set()
            return list.filter(p => {
              if (seen.has(p.id)) return false
              seen.add(p.id)
              return true
            })
          }
          s = {
            ...s,
            clubs: (s.clubs || []).map(c => ({ ...c, squad: dedupeById(c.squad || []) })),
            freeAgents: dedupeById(s.freeAgents || []),
          }
        }
        if (version < 18) {
          // Sistema de contratos — jugadores de saves viejos no tienen
          // `.contract`. Se les asigna uno (años restantes al azar, sueldo
          // igual al que ya se les venía pagando vía calcPlayerWage) para
          // que la cuenta regresiva arranque sin romper la partida.
          s = {
            ...s,
            clubs: (s.clubs || []).map(c => ({
              ...c,
              squad: (c.squad || []).map(p => p.contract ? p : { ...p, contract: assignInitialContract(p) }),
            })),
          }
        }
        return s
      },
    }
  )
)

function buildSeasonEndData(clubs, leagues, worldLeagues, coach, currentJob, season, foreignLeague = null) {
  const data = { season, leagueResults: [], worldChampions: [], playerResult: null }

  const clubsById = Object.fromEntries(clubs.map(c => [c.id, c]))
  const worldClubsById = Object.fromEntries(WORLD_CLUBS.map(c => [c.id, c]))

  LEAGUES.forEach(league => {
    const lg = leagues[league.id]
    if (!lg) return
    const standings = calcStandings(lg.clubIds, lg.schedule).map(s => ({
      ...s,
      clubName: clubsById[s.clubId]?.name || s.clubId,
    }))
    data.leagueResults.push({
      leagueId: league.id,
      leagueName: league.name,
      standings: standings.slice(0, 5),
      champion: standings[0],
    })
  })

  // World champions (top league per country, tier 1)
  WORLD_LEAGUES.filter(l => l.tier === 1).forEach(league => {
    const lg = worldLeagues[league.id]
    if (!lg?.champion) return
    const club = worldClubsById[lg.champion]
    data.worldChampions.push({
      leagueId: league.id,
      leagueName: league.name,
      countryId: league.countryId,
      champion: lg.champion,
      championName: club?.name || lg.champion,
    })
  })

  if (currentJob) {
    const club = clubs.find(c => c.id === currentJob.clubId)
    const leagueId = club?.leagueId
    let standings
    if (foreignLeague?.leagueId === leagueId) {
      const flIds = WORLD_CLUBS.filter(c => c.leagueId === leagueId).map(c => c.id)
      standings = calcStandings(flIds, foreignLeague.schedule)
    } else {
      const lg = leagues[leagueId]
      standings = lg ? calcStandings(lg.clubIds, lg.schedule) : []
    }
    const pos = standings.findIndex(s => s.clubId === currentJob.clubId) + 1
    const objectiveMet = checkObjective(pos, currentJob.objective)
    data.playerResult = {
      clubName: club?.name,
      leagueId,
      position: pos,
      total: standings.length,
      objective: currentJob.objective,
      objectiveMet,
    }
  }

  return data
}

export default useGame
