import useGame from '../store/useGame.js'
import { FINANCE, calcPlayerWage, calcTicketRevenue, calcPrizeMoney } from '../data/gameData.js'
import { WORLD_CLUBS, resolveFinanceLeagueId } from '../data/worldData.js'
import { calcStandings } from '../engine/sim.js'

function fmt(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
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

function countRemainingHomeMatches(lg, clubId) {
  let count = 0
  for (let i = lg.currentMatchday; i < lg.schedule.length; i++) {
    if (lg.schedule[i].some(m => m.homeId === clubId)) count++
  }
  return count
}

function LedgerRow({ label, value, positive }) {
  const color = value === 0
    ? 'text-pitch-600'
    : positive ? 'text-emerald-400' : 'text-red-400'
  return (
    <div className="flex justify-between items-center">
      <span className="text-pitch-400 text-xs">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>
        {value === 0 ? '—' : (positive ? '+' : '-') + fmt(Math.abs(value))}
      </span>
    </div>
  )
}

function StatCell({ label, value, span2 }) {
  return (
    <div className={`bg-pitch-900/50 rounded-xl p-2.5 ${span2 ? 'col-span-2' : ''}`}>
      <p className="text-pitch-500 text-[10px]">{label}</p>
      <p className="text-white text-sm font-semibold">{value}</p>
    </div>
  )
}

function ProjRow({ label, value, sub, neg }) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className="text-pitch-400 text-xs">{label}</span>
        {sub && <span className="text-pitch-600 text-[10px] ml-1">({sub})</span>}
      </div>
      <span className={`text-xs font-semibold ${neg ? 'text-red-400' : 'text-emerald-400'}`}>{value}</span>
    </div>
  )
}

export default function FinanceScreen() {
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const leagues = useGame(s => s.leagues)
  const foreignLeague = useGame(s => s.foreignLeague)

  if (!currentJob) return null
  const club = clubs.find(c => c.id === currentJob.clubId)
  if (!club) return null

  const leagueId = club.leagueId
  const finLeagueId = resolveFinanceLeagueId(leagueId)
  const lg = leagues[leagueId] || (foreignLeague?.leagueId === leagueId ? foreignLeague : null)
  const finances = club.finances || {}

  // Wage bill
  const wagePerMatchday = club.squad.reduce((s, p) => s + calcPlayerWage(p.skill), 0)
  const remainingMatchdays = lg ? Math.max(0, lg.totalMatchdays - lg.currentMatchday) : 0
  const estimatedRemainingWages = wagePerMatchday * remainingMatchdays

  // Current standing position — for world clubs use foreignLeague schedule
  let standings
  if (foreignLeague?.leagueId === leagueId && foreignLeague.schedule) {
    standings = calcStandings(WORLD_CLUBS.filter(c => c.leagueId === leagueId).map(c => c.id), foreignLeague.schedule)
  } else {
    standings = lg ? calcStandings(lg.clubIds, lg.schedule) : []
  }
  const currentPos = Math.max(1, standings.findIndex(s => s.clubId === club.id) + 1)

  // Season projection
  const remainingHomeMatches = lg ? countRemainingHomeMatches(lg, club.id) : 0
  const formScore = lg ? calcFormScore(lg.schedule, club.id) : 0.5
  const projectedRemainingTickets = calcTicketRevenue(finLeagueId, formScore) * remainingHomeMatches
  const projectedPrize = calcPrizeMoney(finLeagueId, currentPos)
  const projectedBalance = club.budget + projectedRemainingTickets + projectedPrize - estimatedRemainingWages

  // Season ledger totals
  const totalRevenue = (finances.tvRevenue || 0) + (finances.sponsorRevenue || 0) +
    (finances.boardInvestment || 0) + (finances.ticketRevenue || 0) +
    (finances.prizeRevenue || 0) + (finances.promotionBonus || 0)
  const totalExpenses = (finances.wagesPaid || 0) + (finances.maintenancePaid || 0)
  const netSeason = totalRevenue - totalExpenses

  // Top 5 most expensive players
  const topWage = [...club.squad]
    .map(p => ({ ...p, wage: calcPlayerWage(p.skill) }))
    .sort((a, b) => b.wage - a.wage)
    .slice(0, 5)

  const isNegative = club.budget < 0

  return (
    <div className="px-4 py-4 pb-24 space-y-4">

      {/* Balance actual */}
      <div>
        <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-2">Finanzas del Club</p>
        <div className={`rounded-2xl p-4 border ${isNegative ? 'bg-red-900/20 border-red-700/40' : 'bg-pitch-800 border-pitch-700'}`}>
          <p className="text-pitch-500 text-xs mb-1">Balance actual</p>
          <p className={`text-3xl font-bold ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
            {fmt(club.budget)}
          </p>
          {isNegative && (
            <p className="text-red-400 text-xs mt-2">
              ⚠ Balance negativo — compras bloqueadas, confianza cae
            </p>
          )}
        </div>
      </div>

      {/* Temporada actual */}
      <div className="rounded-2xl bg-pitch-800 border border-pitch-700 p-4">
        <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-3">Temporada actual</p>
        <div className="space-y-2">
          <LedgerRow label="Derechos de TV" value={finances.tvRevenue || 0} positive />
          <LedgerRow label="Patrocinador" value={finances.sponsorRevenue || 0} positive />
          <LedgerRow label="Inversión dirigencia" value={finances.boardInvestment || 0} positive />
          <LedgerRow label="Taquilla (acumulado)" value={finances.ticketRevenue || 0} positive />
          {((finances.prizeRevenue || 0) + (finances.promotionBonus || 0)) > 0 && (
            <LedgerRow label="Premios" value={(finances.prizeRevenue || 0) + (finances.promotionBonus || 0)} positive />
          )}
          <div className="border-t border-pitch-700 my-1" />
          <LedgerRow label="Salarios pagados" value={finances.wagesPaid || 0} positive={false} />
          <LedgerRow label="Mantenimiento" value={finances.maintenancePaid || 0} positive={false} />
          <div className="border-t border-pitch-700 my-1" />
          <div className="flex justify-between items-center">
            <span className="text-white text-xs font-semibold">Neto temporada</span>
            <span className={`text-sm font-bold ${netSeason >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netSeason >= 0 ? '+' : ''}{fmt(netSeason)}
            </span>
          </div>
        </div>
      </div>

      {/* Planilla salarial */}
      <div className="rounded-2xl bg-pitch-800 border border-pitch-700 p-4">
        <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-3">Planilla salarial</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StatCell label="Por jornada" value={fmt(wagePerMatchday)} />
          <StatCell label="Jornadas restantes" value={remainingMatchdays} />
          <StatCell label="Costo salarial estimado restante" value={fmt(estimatedRemainingWages)} span2 />
        </div>
        <p className="text-pitch-500 text-[10px] uppercase font-semibold mb-2">Top 5 más costosos</p>
        <div className="space-y-1.5">
          {topWage.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="text-white text-xs truncate flex-1">{p.name}</span>
              <span className="text-pitch-500 text-[10px] mx-2">skl {p.skill}</span>
              <span className="text-gold-400 text-xs font-semibold">{fmt(p.wage)}/jor</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proyección */}
      <div className="rounded-2xl bg-pitch-800 border border-pitch-700 p-4">
        <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-3">Proyección fin de temporada</p>
        <div className="space-y-2 mb-3">
          <ProjRow label="Taquilla estimada" value={fmt(projectedRemainingTickets)} sub="forma reciente" />
          <ProjRow label={`Premio (pos. ${currentPos})`} value={fmt(projectedPrize)} sub="posición actual" />
          <ProjRow label="Salarios restantes" value={`-${fmt(estimatedRemainingWages)}`} neg />
        </div>
        <div className={`rounded-xl p-3 border ${projectedBalance >= 0 ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-red-900/20 border-red-700/30'}`}>
          <p className="text-pitch-500 text-xs mb-1">Balance proyectado al final</p>
          <p className={`text-xl font-bold ${projectedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(projectedBalance)}
          </p>
        </div>
        <p className="text-pitch-600 text-[10px] mt-2">* Proyección basada en forma reciente, posición actual y sin premios por ascenso.</p>
      </div>

    </div>
  )
}
