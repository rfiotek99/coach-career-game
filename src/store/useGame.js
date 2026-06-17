import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  LEAGUES, CLUB_TEMPLATES, initClubs, generateFreeAgents,
  getObjective, canApplyToClub, randomName, rng,
  FINANCE, calcPlayerWage, calcSponsorRevenue, calcTicketRevenue,
  calcBoardInvestment, calcPrizeMoney, generateSquad,
  STARTING_PROFILES,
} from '../data/gameData.js'
import { WORLD_CLUBS, WORLD_LEAGUES, resolveFinanceLeagueId } from '../data/worldData.js'
import {
  generateSchedule, calcStandings, simulateMatch,
  calcStrength, calcRepDelta, calcConfidenceDelta,
  checkObjective, objectiveRepBonus,
  simulateLightweightMatch, getLightweightFixtures,
  simulateMixedMatch,
  assignPotential, developPlayers,
  getEffectiveStarters, tickDownStatus, generateMatchEvents,
  calcTransferValue, getTransferWindow, runAITransfers,
} from '../engine/sim.js'
import {
  calcStreak, generateMatchdayHeadlines, triggerPressConference, PRESS_CONFERENCES,
} from '../data/pressData.js'

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

function makeAvailableJobs(clubs, coachRep) {
  return clubs
    .filter(c => c.managerId === null)
    .filter(c => canApplyToClub(coachRep, c.prestige))
    .map(c => ({
      clubId: c.id,
      salary: Math.floor(c.prestige * 850 + 5000),
    }))
}

function getClubsMap(clubs) {
  return Object.fromEntries(clubs.map(c => [c.id, c]))
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

function doTransfer(clubs, buyerClubId, sellerClubId, player, amount) {
  return clubs.map(c => {
    if (c.id === buyerClubId) {
      return { ...c, budget: c.budget - amount, squad: [...c.squad, { ...player, clubId: buyerClubId }] }
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

      // Job
      currentJob: null,  // { clubId, objective, boardConfidence, salary, contractEndSeason }
      foreignLeague: null, // { leagueId, schedule, currentMatchday, totalMatchdays, completed }

      // Events / notifications
      events: [],        // { id, text, type } – shown as toast or log
      notifications: [], // { id, category, text, read, season, matchday, requiresAction, actionType, actionPayload } – persistent history
      coachInterest: null,    // { clubId, clubName, prestige, salary, rumorMatchday, rumorSeason } | null
      playerDiscontent: null, // { playerId, playerName, playerSkill, playerPos, matchdaysOnBench } | null
      matchReport: null, // last simulated matchday's results

      // Season end data
      seasonEndData: null,

      // Press system
      pressHeadlines: [],    // { id, text, type, matchday, season }
      pressConference: null, // active press conference | null
      lastConferenceMd: 0,   // matchday when last conference was triggered

      // Transfer market
      transferOffers: [],    // { id, type, fromClubId, toClubId, playerId, playerName, ... }
      aiTransferLog: [],     // [ { text, season } ] — log of AI market activity
      transferWindowRan: { verano: false, invierno: false },

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
          currentJob: null,
          foreignLeague: null,
          events: [],
          notifications: [],
          coachInterest: null,
          playerDiscontent: null,
          matchReport: null,
          seasonEndData: null,
          pressHeadlines: [],
          pressConference: null,
          lastConferenceMd: 0,
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
        const squad = generateSquad(clubId, worldClub.prestige, rand)

        const wl = WORLD_LEAGUES.find(l => l.id === worldClub.leagueId)
        const tierMult = wl?.tier === 1 ? 2.5 : 1.0
        const budget = Math.floor(worldClub.prestige * 2000 * tierMult + 200_000)

        const fullWorldClub = {
          ...worldClub, squad,
          formation: '4-4-2', morale: 65,
          managerId: 'player', starters: [],
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

        const newRep = clamp(coach.reputation - 4, 0, 100)

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

      initWorld() {
        if (get().worldInitialized) return
        set({ worldLeagues: buildWorldLeagueState(), worldInitialized: true, detailedCountryId: 'argentina' })
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

        const updatedClubs = clubs.map(c =>
          c.id === currentJob.clubId
            ? { ...c, budget: c.budget - player.value, squad: [...c.squad, { ...player, clubId: c.id }] }
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
        const { clubs, freeAgents, currentJob, leagues, foreignLeague, season, transferOffers } = get()
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

        const sellerClub = clubs.find(c => c.id === targetClubId)
        if (!sellerClub) return
        const player = sellerClub.squad.find(p => p.id === playerId)
        if (!player) return

        const { decision, counterAmount, reason } = computeAIResponse(player, sellerClub, myClub, amount)

        if (decision === 'accepted') {
          set({
            clubs: doTransfer(clubs, currentJob.clubId, targetClubId, player, amount),
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
        const { transferOffers, clubs, currentJob, season } = get()
        const offer = transferOffers.find(o => o.id === offerId)
        if (!offer || offer.type !== 'outgoing') return
        const remove = () => set({ transferOffers: transferOffers.filter(o => o.id !== offerId) })

        if (decision === 'accept') {
          const myClub = clubs.find(c => c.id === currentJob?.clubId)
          if (!myClub || myClub.budget < offer.counterAmount) {
            set({ events: [{ id: Date.now(), text: 'Presupuesto insuficiente para aceptar', type: 'warn' }] }); return
          }
          const sellerClub = clubs.find(c => c.id === offer.toClubId)
          const player = sellerClub?.squad.find(p => p.id === offer.playerId)
          if (!player) { remove(); return }
          set({
            clubs: doTransfer(clubs, currentJob.clubId, offer.toClubId, player, offer.counterAmount),
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
          const sellerClub = clubs.find(c => c.id === offer.toClubId)
          const player = sellerClub?.squad.find(p => p.id === offer.playerId)
          if (!player || !sellerClub) { remove(); return }

          const { decision: aiDecision, counterAmount: newCounter } = computeAIResponse(player, sellerClub, myClub, newAmount)
          const finalRound = offer.round >= 2

          if (aiDecision === 'accepted' || (finalRound && aiDecision === 'countered')) {
            const finalAmount = aiDecision === 'accepted' ? newAmount : (newCounter || newAmount)
            if (myClub.budget < finalAmount) {
              set({ events: [{ id: Date.now(), text: 'Presupuesto insuficiente', type: 'warn' }] }); return
            }
            set({
              clubs: doTransfer(clubs, currentJob.clubId, offer.toClubId, player, finalAmount),
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

      // ────────────────────────────────────────────────────────────────────────

      simulateMatchday() {
        let { clubs, leagues, coach, currentJob, season, foreignLeague } = get()
        const { freeAgents, transferWindowRan, transferOffers, aiTransferLog, notifications, coachInterest } = get()
        const newNotifications = []
        let newCoachInterest = coachInterest
        let newPlayerDiscontent = null

        // ── Transfer window check (runs AI market + possibly queues an incoming offer) ──
        let updFreeAgents = freeAgents
        let updTransferWindowRan = { ...transferWindowRan }
        let updTransferOffers = [...transferOffers]
        let updAiTransferLog = [...aiTransferLog]
        let incomingOfferEvent = null

        if (currentJob) {
          const myClub = clubs.find(c => c.id === currentJob.clubId)
          if (myClub) {
            const activeLg = foreignLeague || leagues[myClub.leagueId]
            if (activeLg && !activeLg.completed) {
              const win = getTransferWindow(activeLg.currentMatchday, activeLg.totalMatchdays)

              if (win.open && !updTransferWindowRan[win.type]) {
                const result = runAITransfers(clubs, freeAgents, currentJob.clubId)
                clubs = result.updatedClubs
                updFreeAgents = result.updatedFreeAgents
                updTransferWindowRan[win.type] = true
                updAiTransferLog = [...result.log.map(text => ({ text, season })), ...updAiTransferLog].slice(0, 20)
                newNotifications.push({
                  id: Date.now() + newNotifications.length + 1,
                  category: 'market',
                  text: win.type === 'verano'
                    ? 'Mercado de verano abierto — podés fichar y vender jugadores'
                    : 'Mercado de invierno abierto — podés fichar y vender jugadores',
                  read: false, season, matchday: activeLg.currentMatchday,
                })
              }

              const pendingIn = updTransferOffers.filter(o => o.type === 'incoming' && o.status === 'pending')
              if (win.open && pendingIn.length === 0 && myClub.squad.length > 14 && Math.random() < 0.15) {
                const potBuyers = clubs.filter(c => c.id !== currentJob.clubId && c.managerId !== 'player' && c.budget > 100000)
                if (potBuyers.length) {
                  const buyer = potBuyers[Math.floor(Math.random() * potBuyers.length)]
                  const freshClub = clubs.find(c => c.id === currentJob.clubId)
                  const top5 = [...(freshClub?.squad || [])].sort((a, b) => b.skill - a.skill).slice(0, 5)
                  if (top5.length) {
                    const target = top5[Math.floor(Math.random() * top5.length)]
                    const value = calcTransferValue(target)
                    const amount = Math.round(value * (0.80 + Math.random() * 0.40))
                    if (buyer.budget >= amount) {
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
                        amount,
                        counterAmount: null,
                        status: 'pending',
                        round: 1,
                        season,
                      }]
                      incomingOfferEvent = { id: Date.now() + 888, text: `${buyer.name} ofrece $${Math.round(amount / 1000)}k por ${target.name}`, type: 'info' }
                      newNotifications.push({
                        id: Date.now() + newNotifications.length + 800,
                        category: 'transfer',
                        text: `${buyer.name} ofrece $${Math.round(amount / 1000)}k por ${target.name}`,
                        read: false, season, matchday: activeLg.currentMatchday,
                      })
                    }
                  }
                }
              }
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
          const playedFixtures = fixtures.map(fixture => {
            const homeClub = clubsMap[fixture.homeId]
            const awayClub = clubsMap[fixture.awayId]
            if (!homeClub || !awayClub) return fixture

            const { homeGoals, awayGoals } = simulateMatch(homeClub, awayClub)
            const result = { ...fixture, homeGoals, awayGoals }

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
            const allWorldMap = Object.fromEntries([...clubs, ...WORLD_CLUBS].map(c => [c.id, c]))
            const playedFixtures = foreignLeague.schedule[nextMd].map(fixture => {
              const hc = allWorldMap[fixture.homeId]
              const ac = allWorldMap[fixture.awayId]
              if (!hc || !ac) return fixture
              const { homeGoals, awayGoals } = simulateMixedMatch(hc, ac)
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
          const wageThisMd = playerClub.squad.reduce((s, p) => s + calcPlayerWage(p.skill), 0)
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
          const { injuries, yellows, reds } = generateMatchEvents(effectiveStarters)

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
        if (currentJob) {
          const pcBench = updatedClubs.find(c => c.id === currentJob.clubId)
          if (pcBench && pcBench.starters?.length === 11) {
            const starterSet = new Set(pcBench.starters)
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
        const { pressHeadlines, lastConferenceMd } = get()
        let newPressConference = get().pressConference
        let newLastConferenceMd = lastConferenceMd
        let newPressHeadlines = pressHeadlines

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

            if (!meetsInt) {
              // Conditions lost — drop any pending rumor
              if (newCoachInterest) newCoachInterest = null
            } else if (!newCoachInterest) {
              // No rumor yet — chance to generate one
              const myPrestige = myClubForInt?.prestige || 0
              const argCandidates = clubs.filter(c =>
                c.id !== currentJob.clubId &&
                c.managerId !== 'player' &&
                c.prestige > myPrestige + 8 &&
                canApplyToClub(repNow, c.prestige)
              )
              const worldCandidates = WORLD_CLUBS.filter(c =>
                c.prestige > myPrestige + 8 &&
                canApplyToClub(repNow, c.prestige)
              )
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
            } else {
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

          // ── Player discontent check ───────────────────────────────────────
          if (newJob && !newPressConference) {
            const pcDisc = updatedClubs.find(c => c.id === currentJob.clubId)
            const discontentPlayer = pcDisc?.squad
              .filter(p =>
                p.skill >= 70 &&
                (p.benchMatchdays || 0) >= 3 &&
                (p.injuredFor || 0) === 0 &&
                (p.suspendedFor || 0) === 0
              )
              .sort((a, b) => b.skill - a.skill)[0]

            if (discontentPlayer) {
              newPlayerDiscontent = {
                playerId: discontentPlayer.id,
                playerName: discontentPlayer.name,
                playerSkill: discontentPlayer.skill,
                playerPos: discontentPlayer.position,
                matchdaysOnBench: discontentPlayer.benchMatchdays || 0,
              }
              // Reset counter so it doesn't fire again immediately after responding
              updatedClubs = updatedClubs.map(c =>
                c.id !== currentJob.clubId ? c : {
                  ...c,
                  squad: c.squad.map(p =>
                    p.id === discontentPlayer.id ? { ...p, benchMatchdays: 0 } : p
                  ),
                }
              )
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
        const newWorldLeagues = { ...get().worldLeagues }
        for (const leagueId of Object.keys(newWorldLeagues)) {
          const lg = newWorldLeagues[leagueId]
          if (lg.completed) continue
          const clubsById = WORLD_CLUBS_BY_LEAGUE[leagueId] || {}
          const fixtures = getLightweightFixtures(lg.clubIds, lg.currentMatchday)
          let newStandings = { ...lg.standings }
          fixtures.forEach(({ homeId, awayId }) => {
            const hc = clubsById[homeId]; const ac = clubsById[awayId]
            if (!hc || !ac) return
            const { homeGoals, awayGoals } = simulateLightweightMatch(hc, ac)
            newStandings = applyLightweightFixture(newStandings, homeId, awayId, homeGoals, awayGoals)
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

        let newEvents = firedEvent ? [firedEvent]
          : financeEvent ? [financeEvent]
          : matchEventNotifs.length > 0 ? [matchEventNotifs[0]]
          : []
        if (incomingOfferEvent && newEvents.length === 0) newEvents = [incomingOfferEvent]

        set({
          clubs: updatedClubs,
          freeAgents: updFreeAgents,
          leagues: newLeagues,
          worldLeagues: newWorldLeagues,
          foreignLeague: newForeignLeague,
          coach: newCoach,
          currentJob: newJob,
          screen: allDone ? 'season-end' : newScreen,
          activeTab: 'home',
          matchReport: allResults,
          events: newEvents,
          notifications: [...notifications, ...newNotifications].slice(-60),
          coachInterest: newCoachInterest,
          playerDiscontent: newPlayerDiscontent,
          pressHeadlines: newPressHeadlines,
          pressConference: newPressConference,
          lastConferenceMd: newLastConferenceMd,
          transferOffers: updTransferOffers,
          transferWindowRan: updTransferWindowRan,
          aiTransferLog: updAiTransferLog,
          seasonEndData: allDone ? buildSeasonEndData(updatedClubs, newLeagues, newWorldLeagues, newCoach, newJob, season, newForeignLeague) : null,
        })
      },

      processSeasonEnd() {
        const { clubs, leagues, coach, currentJob, season, seasonEndData, notifications } = get()
        const { foreignLeague } = get()
        const postNotifications = []

        // Detect if player is managing a world club
        const playerClubPre = currentJob ? clubs.find(c => c.id === currentJob.clubId) : null
        const isWorldJob = !!foreignLeague && playerClubPre && !LEAGUES.find(l => l.id === playerClubPre.leagueId)

        // Promotion / relegation (Argentine clubs only)
        const promotions = {}
        const relegations = {}

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
        })

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

        // Age up all players and apply skill evolution for the new season
        updatedClubs = developPlayers(updatedClubs)

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

        // Reset finances ledger, yellow cards and bench counters for the new season
        if (newJob) {
          updatedClubs = updatedClubs.map(c =>
            c.id === newJob.clubId
              ? {
                  ...c,
                  finances: blankFinances(season + 1),
                  squad: c.squad.map(p => ({ ...p, yellowCards: 0, benchMatchdays: 0 })),
                }
              : c
          )
        }

        const newSeason = season + 1
        // buildLeagueState only includes Argentine clubs; world club is not in LEAGUES
        const newLeagueState = buildLeagueState(updatedClubs.filter(c => LEAGUES.find(l => l.id === c.leagueId)))
        const newFreeAgents = generateFreeAgents(Date.now(), 35)

        set({
          season: newSeason,
          clubs: updatedClubs,
          freeAgents: newFreeAgents,
          leagues: newLeagueState,
          worldLeagues: buildWorldLeagueState(),
          foreignLeague: newForeignLeague,
          coach: newCoach,
          currentJob: newJob,
          screen: newScreen,
          activeTab: 'home',
          matchReport: null,
          seasonEndData: null,
          pressHeadlines: [],
          pressConference: null,
          lastConferenceMd: 0,
          transferOffers: [],
          aiTransferLog: [],
          transferWindowRan: { verano: false, invierno: false },
          events: jobEvents,
          notifications: [...notifications, ...postNotifications].slice(-60),
          coachInterest: null,
          playerDiscontent: null,
        })
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

      respondToPlayerDiscontent(optionIndex) {
        const OPTS = [
          { moraleDelta:  5, confidenceDelta: -1 }, // Prometé más minutos
          { moraleDelta:  2, confidenceDelta:  3 }, // Hablar con honestidad
          { moraleDelta: -8, confidenceDelta: -3 }, // Ignorar
        ]
        const opt = OPTS[optionIndex]
        if (!opt) return
        const { currentJob, clubs, playerDiscontent } = get()
        if (!currentJob || !playerDiscontent) { set({ playerDiscontent: null }); return }

        const updatedClubs = clubs.map(c => {
          if (c.id !== currentJob.clubId) return c
          return {
            ...c,
            morale: clamp(c.morale + opt.moraleDelta, 20, 100),
            // keep benchMatchdays already reset to 0 by the check
          }
        })
        const newJob = {
          ...currentJob,
          boardConfidence: clamp(currentJob.boardConfidence + opt.confidenceDelta, 0, 100),
        }

        const parts = []
        if (opt.moraleDelta > 0) parts.push(`Moral +${opt.moraleDelta}`)
        if (opt.moraleDelta < 0) parts.push(`Moral ${opt.moraleDelta}`)
        if (opt.confidenceDelta > 0) parts.push(`Confianza +${opt.confidenceDelta}`)
        if (opt.confidenceDelta < 0) parts.push(`Confianza ${opt.confidenceDelta}`)
        const evText = parts.join(' · ') || 'Conversación sin efecto inmediato'
        const evType = opt.moraleDelta >= 5 ? 'success' : opt.moraleDelta < 0 ? 'danger' : 'info'

        set({
          clubs: updatedClubs,
          currentJob: newJob,
          playerDiscontent: null,
          events: [{ id: Date.now(), text: evText, type: evType }],
        })
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
          currentJob: null,
          foreignLeague: null,
          events: [],
          notifications: [],
          coachInterest: null,
          playerDiscontent: null,
          matchReport: null,
          seasonEndData: null,
          pressHeadlines: [],
          pressConference: null,
          lastConferenceMd: 0,
          transferOffers: [],
          aiTransferLog: [],
          transferWindowRan: { verano: false, invierno: false },
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
        const { clubs, coach } = get()
        return makeAvailableJobs(clubs, coach?.reputation || 0)
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
        const eligible = WORLD_CLUBS.filter(c => canApplyToClub(rep, c.prestige))
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
      version: 9,
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
