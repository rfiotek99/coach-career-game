// ── Static game data ────────────────────────────────────────────────────────

import { randomNameForCountry, randomCountryForFreeAgent } from './names.js'
import { DEFAULT_TACTICS } from './tactics.js'

export const LEAGUES = [
  { id: 'liga-premier',   name: 'Liga Premier',   tier: 1, teams: 10, promoteSlots: 0, relegateSlots: 2, countryId: 'argentina' },
  { id: 'liga-nacional',  name: 'Liga Nacional',  tier: 2, teams: 12, promoteSlots: 2, relegateSlots: 2, countryId: 'argentina' },
  { id: 'liga-regional',  name: 'Liga Regional',  tier: 3, teams: 14, promoteSlots: 2, relegateSlots: 0, countryId: 'argentina' },
]

export const FORMATIONS = {
  '4-4-2':   { name: '4-4-2',   gk: 1, def: 4, mid: 4, fwd: 2, atkBonus: 0,  defBonus: 0  },
  '4-3-3':   { name: '4-3-3',   gk: 1, def: 4, mid: 3, fwd: 3, atkBonus: 6,  defBonus: -5 },
  '4-2-3-1': { name: '4-2-3-1', gk: 1, def: 4, mid: 5, fwd: 1, atkBonus: 3,  defBonus: -2 },
  '3-5-2':   { name: '3-5-2',   gk: 1, def: 3, mid: 5, fwd: 2, atkBonus: 2,  defBonus: -3 },
  '5-3-2':   { name: '5-3-2',   gk: 1, def: 5, mid: 3, fwd: 2, atkBonus: -5, defBonus: 8  },
}

// Field-order and display color for each position — shared by SquadScreen,
// TacticsScreen's player list and the Dashboard's compact plantel table.
export const POSITION_ORDER = { POR: 0, CAR: 1, LD: 2, LI: 3, MCD: 4, MCC: 5, MCO: 6, EXT: 7, DEL: 8 }
export const POSITION_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#3b82f6', LI: '#3b82f6',
  MCD: '#22c55e', MCC: '#22c55e', MCO: '#22c55e', EXT: '#22c55e',
  DEL: '#ef4444',
}

// Maps each position abbreviation to its tactical role group
export const POSITION_ROLE = {
  POR: 'gk',
  CAR: 'def', LD: 'def', LI: 'def',
  MCD: 'mid', MCC: 'mid', MCO: 'mid', EXT: 'mid',
  DEL: 'fwd',
}

// Skill multiplier when a player's role != slot's role
// ROLE_PENALTY[playerRole][slotRole]
export const ROLE_PENALTY = {
  gk:  { gk: 1.00, def: 0.75, mid: 0.75, fwd: 0.75 },
  def: { gk: 0.75, def: 1.00, mid: 0.90, fwd: 0.75 },
  mid: { gk: 0.75, def: 0.90, mid: 1.00, fwd: 0.90 },
  fwd: { gk: 0.75, def: 0.75, mid: 0.90, fwd: 1.00 },
}

// Flat ordered slot positions for each formation (top-to-bottom, left-to-right)
// Must stay in sync with FORMATION_VISUALS
export const FORMATION_SLOTS = {
  '4-4-2':   ['DEL','DEL','EXT','MCC','MCC','EXT','LD','CAR','CAR','LI','POR'],
  '4-3-3':   ['EXT','DEL','EXT','MCC','MCC','MCC','LD','CAR','CAR','LI','POR'],
  '4-2-3-1': ['DEL','EXT','MCO','EXT','MCD','MCD','LD','CAR','CAR','LI','POR'],
  '3-5-2':   ['DEL','DEL','EXT','MCO','MCC','MCD','EXT','CAR','CAR','CAR','POR'],
  '5-3-2':   ['DEL','DEL','MCC','MCC','MCC','LI','CAR','CAR','CAR','LD','POR'],
}

// Row-by-row field layout for rendering (matches FORMATION_SLOTS ordering)
export const FORMATION_VISUALS = {
  '4-4-2':   [['DEL','DEL'],['EXT','MCC','MCC','EXT'],['LD','CAR','CAR','LI'],['POR']],
  '4-3-3':   [['EXT','DEL','EXT'],['MCC','MCC','MCC'],['LD','CAR','CAR','LI'],['POR']],
  '4-2-3-1': [['DEL'],['EXT','MCO','EXT'],['MCD','MCD'],['LD','CAR','CAR','LI'],['POR']],
  '3-5-2':   [['DEL','DEL'],['EXT','MCO','MCC','MCD','EXT'],['CAR','CAR','CAR'],['POR']],
  '5-3-2':   [['DEL','DEL'],['MCC','MCC','MCC'],['LI','CAR','CAR','CAR','LD'],['POR']],
}

const POSITIONS_BY_ROLE = {
  gk:  ['POR'],
  def: ['CAR','CAR','LI','LD'],
  mid: ['MCD','MCC','MCC','MCO','EXT'],
  fwd: ['DEL','EXT'],
}

const ALL_POS = ['POR','CAR','LI','LD','MCD','MCC','MCO','EXT','DEL']

export function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function randomName(rand, countryId = 'argentina') {
  return randomNameForCountry(rand, countryId)
}

export function generateSquad(clubId, prestige, rand, countryId = 'argentina') {
  const skillMin = Math.max(20, Math.floor(prestige * 0.45))
  const skillMax = Math.min(97, Math.floor(prestige * 0.92))
  const roles = ['gk','gk','def','def','def','def','def','def','mid','mid','mid','mid','mid','mid','fwd','fwd','fwd','fwd','fwd','def']

  return roles.map((role, i) => {
    const posPool = POSITIONS_BY_ROLE[role] || ALL_POS
    const pos = posPool[Math.floor(rand() * posPool.length)]
    const skill = skillMin + Math.floor(rand() * (skillMax - skillMin + 1))
    const age = 18 + Math.floor(rand() * 15)
    const potGap = age <= 21 ? 20 + Math.floor(rand() * 16)
                 : age <= 24 ? 10 + Math.floor(rand() * 11)
                 : age <= 28 ? 3  + Math.floor(rand() * 8)
                 : age <= 30 ? Math.floor(rand() * 6)
                 : 0
    const potential = Math.min(97, skill + potGap)
    const value = Math.floor(skill * skill * 80 * (1 + rand() * 0.4))
    const player = {
      id: `${clubId}-p${i}`,
      name: randomNameForCountry(rand, countryId),
      position: pos,
      skill,
      age,
      potential,
      clubId,
      value,
      morale: 70,
    }
    return { ...player, contract: assignInitialContract(player, rand) }
  })
}

export const CLUB_TEMPLATES = [
  // Liga Premier – Tier 1 (10 clubs, prestige 75-98)
  { id:'atl-union',   name:'Atlético Unión',       city:'Buenos Aires', leagueId:'liga-premier',  prestige:98, color:'#CC0000', budget:5000000, countryId:'argentina' },
  { id:'dep-central', name:'Deportivo Central',     city:'Rosario',      leagueId:'liga-premier',  prestige:94, color:'#003DA5', budget:4500000, countryId:'argentina' },
  { id:'racing-norte',name:'Racing del Norte',      city:'Córdoba',      leagueId:'liga-premier',  prestige:90, color:'#87CEEB', budget:4000000, countryId:'argentina' },
  { id:'san-martin',  name:'Club San Martín',       city:'Mendoza',      leagueId:'liga-premier',  prestige:87, color:'#228B22', budget:3500000, countryId:'argentina' },
  { id:'indep-fc',    name:'Independiente FC',      city:'La Plata',     leagueId:'liga-premier',  prestige:84, color:'#DC143C', budget:3200000, countryId:'argentina' },
  { id:'velez-occ',   name:'Vélez Occidental',      city:'San Juan',     leagueId:'liga-premier',  prestige:82, color:'#1E90FF', budget:2900000, countryId:'argentina' },
  { id:'ferro-sur',   name:'Ferro del Sur',         city:'Tucumán',      leagueId:'liga-premier',  prestige:80, color:'#2E8B57', budget:2700000, countryId:'argentina' },
  { id:'sp-nacional', name:'Sportivo Nacional',     city:'Santa Fe',     leagueId:'liga-premier',  prestige:78, color:'#FF8C00', budget:2500000, countryId:'argentina' },
  { id:'olimpia',     name:'Club Olimpia',          city:'Paraná',       leagueId:'liga-premier',  prestige:76, color:'#6A0DAD', budget:2300000, countryId:'argentina' },
  { id:'banfield',    name:'Banfield United',       city:'Mar del Plata',leagueId:'liga-premier',  prestige:75, color:'#006400', budget:2100000, countryId:'argentina' },

  // Liga Nacional – Tier 2 (12 clubs, prestige 50-73)
  { id:'defensores',  name:'Defensores del Valle',  city:'Valle Hermoso',leagueId:'liga-nacional', prestige:73, color:'#8B4513', budget:1400000, countryId:'argentina' },
  { id:'estudiantes', name:'Estudiantes FC',        city:'Corrientes',   leagueId:'liga-nacional', prestige:70, color:'#4169E1', budget:1300000, countryId:'argentina' },
  { id:'gimnasia',    name:'Gimnasia y Esgrima',    city:'Neuquén',      leagueId:'liga-nacional', prestige:67, color:'#00008B', budget:1200000, countryId:'argentina' },
  { id:'talleres',    name:'Club Talleres',         city:'Salta',        leagueId:'liga-nacional', prestige:65, color:'#4B0082', budget:1100000, countryId:'argentina' },
  { id:'riestra',     name:'Riestra Sporting',      city:'Jujuy',        leagueId:'liga-nacional', prestige:63, color:'#8B0000', budget:1000000, countryId:'argentina' },
  { id:'san-telmo',   name:'San Telmo FC',          city:'Río Negro',    leagueId:'liga-nacional', prestige:61, color:'#2F4F4F', budget: 900000, countryId:'argentina' },
  { id:'colon',       name:'Club Colón',            city:'Chaco',        leagueId:'liga-nacional', prestige:58, color:'#FF4500', budget: 850000, countryId:'argentina' },
  { id:'almagro',     name:'Almagro Athletic',      city:'Formosa',      leagueId:'liga-nacional', prestige:56, color:'#B22222', budget: 800000, countryId:'argentina' },
  { id:'los-andes',   name:'Los Andes FC',          city:'Misiones',     leagueId:'liga-nacional', prestige:54, color:'#3CB371', budget: 750000, countryId:'argentina' },
  { id:'platense',    name:'Platense United',       city:'Chubut',       leagueId:'liga-nacional', prestige:52, color:'#00CED1', budget: 700000, countryId:'argentina' },
  { id:'huracan',     name:'Club Huracán',          city:'Santa Cruz',   leagueId:'liga-nacional', prestige:51, color:'#FF6347', budget: 650000, countryId:'argentina' },
  { id:'quilmes',     name:'Quilmes Sporting',      city:'San Luis',     leagueId:'liga-nacional', prestige:50, color:'#9370DB', budget: 600000, countryId:'argentina' },

  // Liga Regional – Tier 3 (14 clubs, prestige 25-48)
  { id:'union-norte', name:'Unión del Norte',       city:'La Rioja',     leagueId:'liga-regional', prestige:48, color:'#8B0000', budget:380000, countryId:'argentina' },
  { id:'dep-cat',     name:'Deportes Catamarca',    city:'Catamarca',    leagueId:'liga-regional', prestige:46, color:'#006400', budget:360000, countryId:'argentina' },
  { id:'atl-santiago',name:'Atlético Santiago',     city:'Sgo. del Est.',leagueId:'liga-regional', prestige:44, color:'#00008B', budget:340000, countryId:'argentina' },
  { id:'racing-este', name:'Racing del Este',       city:'Posadas',      leagueId:'liga-regional', prestige:42, color:'#228B22', budget:320000, countryId:'argentina' },
  { id:'central-oeste',name:'Central Oeste',        city:'San Rafael',   leagueId:'liga-regional', prestige:40, color:'#FF6347', budget:300000, countryId:'argentina' },
  { id:'dep-pat',     name:'Deportivo Patagonia',   city:'Bariloche',    leagueId:'liga-regional', prestige:38, color:'#20B2AA', budget:280000, countryId:'argentina' },
  { id:'san-jorge',   name:'San Jorge FC',          city:'Villa C. Paz', leagueId:'liga-regional', prestige:36, color:'#8B4513', budget:260000, countryId:'argentina' },
  { id:'river-norte', name:'River del Norte',       city:'Resistencia',  leagueId:'liga-regional', prestige:34, color:'#FF0000', budget:240000, countryId:'argentina' },
  { id:'atl-cuyo',    name:'Atlético Cuyo',         city:'San Luis',     leagueId:'liga-regional', prestige:32, color:'#9400D3', budget:220000, countryId:'argentina' },
  { id:'belgrano-r',  name:'Club Belgrano',         city:'Paraná',       leagueId:'liga-regional', prestige:30, color:'#1C1C8B', budget:200000, countryId:'argentina' },
  { id:'sp-pampa',    name:'Sportivo Pampa',        city:'Gral. Pico',   leagueId:'liga-regional', prestige:28, color:'#B8860B', budget:185000, countryId:'argentina' },
  { id:'litoral',     name:'Club Litoral',          city:'Goya',         leagueId:'liga-regional', prestige:27, color:'#008B8B', budget:175000, countryId:'argentina' },
  { id:'union-sur',   name:'Unión Sureña',          city:'Río Gallegos', leagueId:'liga-regional', prestige:26, color:'#556B2F', budget:165000, countryId:'argentina' },
  { id:'pumas-fc',    name:'Los Pumas FC',          city:'San Salvador', leagueId:'liga-regional', prestige:25, color:'#808000', budget:155000, countryId:'argentina' },
]

export function initClubs(seed) {
  const rand = rng(seed)
  const formations = Object.keys(FORMATIONS)
  return CLUB_TEMPLATES.map(t => ({
    ...t,
    squad: generateSquad(t.id, t.prestige, rand, t.countryId),
    formation: formations[Math.floor(rand() * formations.length)],
    morale: 55 + Math.floor(rand() * 35),
    managerId: null,
    aiCoachName: randomNameForCountry(rand, t.countryId),
    starters: [],
    tactics: { ...DEFAULT_TACTICS },
    youthSquad: [],
    youthCounter: 0,
  }))
}

export function generateFreeAgents(seed, count = 30) {
  const rand = rng(seed + 9999)
  return Array.from({ length: count }, (_, i) => {
    const countryId = randomCountryForFreeAgent(rand)
    return {
      // El id incluye `seed` (siempre distinto entre partidas y entre
      // temporadas — ver los call sites en useGame.js) para que nunca
      // colisione con agentes libres de una tanda anterior. Antes era solo
      // `fa-${i}`, que se reiniciaba en cada temporada: un jugador fichado
      // o liberado en la temporada 3 podía terminar con el mismo id que un
      // agente libre nuevo de la temporada 9, generando keys duplicadas de
      // React y listas que parecían no actualizarse con los filtros.
      id: `fa-${seed}-${i}`,
      name: randomNameForCountry(rand, countryId),
      position: ALL_POS[Math.floor(rand() * ALL_POS.length)],
      skill: 25 + Math.floor(rand() * 45),
      age: 20 + Math.floor(rand() * 16),
      clubId: null,
      value: 0,
      morale: 60,
    }
  }).map(p => {
    const potGap = p.age <= 21 ? 20 + Math.floor(rand() * 16)
                 : p.age <= 24 ? 10 + Math.floor(rand() * 11)
                 : p.age <= 28 ? 3  + Math.floor(rand() * 8)
                 : p.age <= 30 ? Math.floor(rand() * 6)
                 : 0
    return { ...p, potential: Math.min(97, p.skill + potGap), value: Math.floor(p.skill * p.skill * 70) }
  })
}

export function getObjective(club, leagueId, overrideLeague = null) {
  const league = overrideLeague || LEAGUES.find(l => l.id === leagueId)
  if (!league) return { text: 'Sin objetivo', target: 999, type: 'survive' }
  const total = league.teams
  const relZone = total - league.relegateSlots + 1

  if (league.tier === 1) {
    if (club.prestige >= 90) return { text: 'Ganar el título', target: 1, type: 'champion' }
    if (club.prestige >= 82) return { text: 'Top 4', target: 4, type: 'top' }
    if (club.prestige >= 76) return { text: 'Top 6', target: 6, type: 'top' }
    return { text: 'Mantener categoría', target: relZone - 1, type: 'survive' }
  }
  if (league.tier === 2) {
    if (club.prestige >= 68) return { text: 'Ascender', target: league.promoteSlots, type: 'promote' }
    if (club.prestige >= 58) return { text: 'Top 5', target: 5, type: 'top' }
    return { text: 'Mantener categoría', target: relZone - 1, type: 'survive' }
  }
  // tier 3
  if (club.prestige >= 44) return { text: 'Ascender', target: league.promoteSlots, type: 'promote' }
  return { text: 'Mantener categoría', target: relZone - 1, type: 'survive' }
}

// Camino de reconocimiento del DT — cada escalón es un hito de reputación.
// getRepLabel deriva de esta misma lista para que UI (Header, HistoryScreen)
// y lógica compartan una única fuente de verdad.
// Umbrales pensados para que el tiempo NO sea un camino a la gloria: con la
// reputación gravitando hacia baseRepFromCareer (ver useGame.js), llegar a
// "Elite" ya implica una carrera sólida en primera, y "Leyenda" exige varios
// títulos/ascensos o una copa continental + gestión en la elite.
export const REP_TIERS = [
  { min: 0,  label: 'Desconocido', color: '#9ca3af', icon: '❓' },
  { min: 12, label: 'Regional',    color: '#60a5fa', icon: '📍' },
  { min: 28, label: 'Nacional',    color: '#34d399', icon: '🏟️' },
  { min: 48, label: 'Reconocido',  color: '#f0b429', icon: '⭐' },
  { min: 70, label: 'Elite',       color: '#f97316', icon: '🔥' },
  { min: 90, label: 'Leyenda',     color: '#ec4899', icon: '👑' },
]

export function getRepLabel(rep) {
  let tier = REP_TIERS[0]
  for (const t of REP_TIERS) {
    if (rep >= t.min) tier = t
    else break
  }
  return tier
}

export function canApplyToClub(coachRep, clubPrestige) {
  if (clubPrestige >= 90) return coachRep >= 68
  if (clubPrestige >= 80) return coachRep >= 48
  if (clubPrestige >= 70) return coachRep >= 30
  if (clubPrestige >= 55) return coachRep >= 15
  if (clubPrestige >= 40) return coachRep >= 5
  return true
}

export const STARTING_PROFILES = [
  {
    id: 'rookie',
    name: 'Don Nadie',
    icon: '🎽',
    description: 'Recién comenzás. Sin nombre ni historial. Solo los clubes más chicos te abren la puerta.',
    startRep: 5,
    startMoney: 8000,
    repLabel: 'Desconocido',
    unlocks: 'Liga Regional + fondo del Nacional',
    guaranteePrestigeMax: 35,
    guaranteeCount: 3,
  },
  {
    id: 'assistant',
    name: 'Ayudante de Campo',
    icon: '📋',
    description: 'Trabajaste años como segundo. Tenés contactos y los clubes de segunda te conocen.',
    startRep: 18,
    startMoney: 20000,
    repLabel: 'Regional',
    unlocks: 'Liga Regional + Liga Nacional completa',
    guaranteePrestigeMax: 50,
    guaranteeCount: 3,
  },
  {
    id: 'explayer',
    name: 'Ex-jugador',
    icon: '⭐',
    description: 'Tu nombre abre puertas. Jugaste en primera y la prensa te conoce desde el día uno.',
    startRep: 38,
    startMoney: 40000,
    repLabel: 'Nacional',
    unlocks: 'Regional + Nacional + fondo del Premier',
    guaranteePrestigeMax: 60,
    guaranteeCount: 3,
  },
]

// ── Finance system ────────────────────────────────────────────────────────────

export const FINANCE = {
  TV_REVENUE: {
    'liga-premier':  150_000,
    'liga-nacional':  70_000,
    'liga-regional':  22_000,
  },
  SPONSOR_BASE: {
    'liga-premier':  20_000,
    'liga-nacional':   8_000,
    'liga-regional':   2_000,
  },
  SPONSOR_SCALE: {
    'liga-premier':  900,
    'liga-nacional':  550,
    'liga-regional':  300,
  },
  TICKET_BASE: {
    'liga-premier':  8_000,
    'liga-nacional':  3_000,
    'liga-regional':    800,
  },
  TICKET_BONUS: {
    'liga-premier':  8_000,
    'liga-nacional':  4_000,
    'liga-regional':  1_500,
  },
  BOARD_INVEST_MAX: {
    'liga-premier': 120_000,
    'liga-nacional':  45_000,
    'liga-regional':  15_000,
  },
  BOARD_INVEST_MIN_CF: 40,
  MAINTENANCE: {
    'liga-premier':  80_000,
    'liga-nacional':  55_000,
    'liga-regional':  35_000,
  },
  PRIZE_MONEY: {
    'liga-premier':  [200_000, 120_000, 80_000, 40_000, 40_000, 40_000, 20_000, 20_000, 10_000, 10_000],
    'liga-nacional': [ 80_000,  45_000, 28_000, 15_000, 15_000,  7_000,  7_000,  7_000,  7_000,  7_000,  7_000,  7_000],
    'liga-regional': [ 25_000,  15_000, 10_000,  3_000,  3_000,  3_000,  3_000,  3_000,  3_000,  3_000,  3_000,  3_000,  3_000,  3_000],
  },
  PROMOTION_BONUS: {
    'liga-regional':  50_000,
    'liga-nacional': 150_000,
  },
  TITLE_BONUS: {
    'liga-premier':  80_000,
    'liga-nacional':  40_000,
    'liga-regional':  15_000,
  },
  NEG_BALANCE_CF_PENALTY: -2,
}

export function calcPlayerWage(skill) {
  return Math.max(50, skill * 12)
}

// Contrato inicial para un jugador que entra a un plantel (generación de
// mundo, fichaje, cantera promovida, migración de saves viejos). `rand` es
// el generador determinístico de turno (rng(seed) o Math.random según el
// call site) — mantiene consistencia con el resto de gameData.js.
export function assignInitialContract(player, rand = Math.random) {
  return { yearsLeft: 1 + Math.floor(rand() * 4), wage: calcPlayerWage(player.skill) }
}

// Sueldo que pide un jugador al renovar — parte del sueldo de mercado
// (calcPlayerWage) y lo ajusta por edad (pico de carrera pide más, veteranos
// piden menos) y moral como proxy de rendimiento/actitud (no hay stats de
// partido por jugador). Nunca pide bajar de su sueldo actual.
export function calcAskingWage(player) {
  const base = calcPlayerWage(player.skill)
  let mult = 1
  if (player.age >= 24 && player.age <= 29) mult *= 1.15
  else if (player.age <= 21 && (player.potential ?? player.skill) - player.skill > 10) mult *= 1.10
  else if (player.age >= 32) mult *= 0.85

  const morale = player.morale ?? 70
  if (morale < 50) mult *= 1.10
  else if (morale >= 80) mult *= 0.95

  const asked = Math.round((base * mult) / 10) * 10
  const floor = Math.round((player.contract?.wage ?? base) * 0.9)
  return Math.max(asked, floor)
}

// Duración que pide un jugador al renovar — cuanto más joven, más años.
export function calcAskingYears(player) {
  if (player.age <= 23) return 4
  if (player.age <= 28) return 3
  if (player.age <= 31) return 2
  return 1
}

export function calcSponsorRevenue(prestige, leagueId) {
  return Math.floor((FINANCE.SPONSOR_BASE[leagueId] || 0) + prestige * (FINANCE.SPONSOR_SCALE[leagueId] || 0))
}

export function calcTicketRevenue(leagueId, formScore) {
  return Math.floor((FINANCE.TICKET_BASE[leagueId] || 0) + formScore * (FINANCE.TICKET_BONUS[leagueId] || 0))
}

export function calcBoardInvestment(boardConfidence, leagueId) {
  if (boardConfidence < FINANCE.BOARD_INVEST_MIN_CF) return 0
  return Math.floor((boardConfidence / 100) * (FINANCE.BOARD_INVEST_MAX[leagueId] || 0))
}

export function calcPrizeMoney(leagueId, position) {
  return (FINANCE.PRIZE_MONEY[leagueId] || [])[position - 1] || 0
}
