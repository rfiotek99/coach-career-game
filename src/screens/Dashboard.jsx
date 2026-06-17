import useGame from '../store/useGame.js'
import { findLeague } from '../data/worldData.js'

function HeadlineRow({ headline }) {
  const dotColor =
    headline.type === 'positive' ? 'bg-emerald-400' :
    headline.type === 'negative' ? 'bg-red-400' : 'bg-pitch-600'
  const textColor =
    headline.type === 'positive' ? 'text-pitch-300' :
    headline.type === 'negative' ? 'text-pitch-300' : 'text-pitch-500'
  return (
    <div className="flex items-start gap-2">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
      <p className={`text-xs leading-relaxed ${textColor}`}>{headline.text}</p>
    </div>
  )
}

function ResultBadge({ match, clubId }) {
  if (match.homeGoals === null) return null
  const isHome = match.homeId === clubId
  const pg = isHome ? match.homeGoals : match.awayGoals
  const og = isHome ? match.awayGoals : match.homeGoals
  if (pg > og) return <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">V</span>
  if (pg < og) return <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">D</span>
  return <span className="w-5 h-5 rounded-full bg-gold-400 flex items-center justify-center text-pitch-950 text-[10px] font-bold">E</span>
}

function ObjectiveCard({ obj, myPos, totalClubs, currentMd, totalMd }) {
  if (!myPos) return null

  const met =
    obj.type === 'champion' ? myPos === 1 :
    myPos <= obj.target

  const progressPct = totalMd > 0 ? currentMd / totalMd : 0
  const seasonLate = progressPct >= 0.6

  let progressText
  if (obj.type === 'champion') {
    progressText = myPos === 1
      ? 'Sos el líder — mantené el nivel'
      : `Estás ${myPos}° — necesitás ser el primero`
  } else if (obj.type === 'promote') {
    progressText = met
      ? `Estás ${myPos}° — en zona de ascenso (top ${obj.target})`
      : `Estás ${myPos}° — fuera de zona de ascenso (top ${obj.target})`
  } else if (obj.type === 'top') {
    progressText = met
      ? `Estás ${myPos}° — dentro del objetivo (top ${obj.target})`
      : `Estás ${myPos}° — necesitás subir al top ${obj.target}`
  } else {
    progressText = met
      ? `Estás ${myPos}° — en zona segura (se desciende desde el ${obj.target + 1}°)`
      : `Estás ${myPos}° — en zona de descenso (salvarse: top ${obj.target})`
  }

  return (
    <div className={`rounded-2xl bg-pitch-800 p-4 border ${met ? 'border-emerald-500/30' : seasonLate ? 'border-red-500/40' : 'border-pitch-700'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-pitch-500 text-xs font-medium uppercase tracking-wide">🎯 Objetivo de temporada</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          met ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {met ? '✓ En camino' : '✗ En riesgo'}
        </span>
      </div>
      <p className="text-white font-semibold text-sm mb-1.5">{obj.text}</p>
      <p className="text-pitch-500 text-xs leading-relaxed">{progressText}</p>
      {!met && seasonLate && (
        <p className="text-red-400 text-[11px] mt-2">
          ⚠ Fallar el objetivo afectará la confianza de la dirigencia y tu continuidad
        </p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const simulateMatchday = useGame(s => s.simulateMatchday)
  const resignJob = useGame(s => s.resignJob)
  const getLeagueStandings = useGame(s => s.getLeagueStandings)
  const getUpcomingMatches = useGame(s => s.getUpcomingMatches)
  const getRecentResults = useGame(s => s.getRecentResults)
  const getCurrentMatchday = useGame(s => s.getCurrentMatchday)
  const leagues = useGame(s => s.leagues)
  const pressHeadlines = useGame(s => s.pressHeadlines)
  const pressConference = useGame(s => s.pressConference)
  const setTab = useGame(s => s.setTab)

  if (!currentJob) return null

  const club = clubs.find(c => c.id === currentJob.clubId)
  if (!club) return null

  const leagueName = findLeague(club.leagueId)?.name || ''
  const standings = getLeagueStandings(club.leagueId)
  const myStanding = standings.find(s => s.clubId === currentJob.clubId)
  const myPos = standings.findIndex(s => s.clubId === currentJob.clubId) + 1

  const upcomingMatches = getUpcomingMatches(club.id, 3)
  const recentResults = getRecentResults(club.id, 5)
  const { current: currentMd, total: totalMd } = getCurrentMatchday()

  const obj = currentJob.objective

  const isMyLeagueDone = currentMd >= totalMd
  const allLeaguesDone = Object.values(leagues).every(l => l.completed)

  return (
    <div className="px-4 py-4 pb-24 space-y-4">
      {/* Club card */}
      <div className="rounded-2xl bg-pitch-800 p-4 border border-pitch-700">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: club.color }} />
              <span className="text-white font-bold text-base">{club.name}</span>
            </div>
            <p className="text-pitch-600 text-xs">{leagueName} · {club.city}</p>
          </div>
          <div className="text-right">
            <span className="text-white font-bold text-lg">{myPos || '—'}</span>
            <span className="text-pitch-600 text-xs">°</span>
            <p className="text-pitch-600 text-xs">puesto</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-pitch-700 grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-gold-400 font-bold">{myStanding?.points ?? 0}</p>
            <p className="text-pitch-600 text-[11px]">puntos</p>
          </div>
          <div>
            <p className="text-white font-bold">{currentMd}/{totalMd}</p>
            <p className="text-pitch-600 text-[11px]">jornadas</p>
          </div>
        </div>
      </div>

      {/* Objective card */}
      <ObjectiveCard
        obj={obj}
        myPos={myPos}
        totalClubs={standings.length}
        currentMd={currentMd}
        totalMd={totalMd}
      />

      {/* Board confidence */}
      <div className="rounded-2xl bg-pitch-800 p-4 border border-pitch-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-pitch-500 text-xs font-medium uppercase tracking-wide">Confianza de la dirigencia</span>
          <span className={`text-sm font-bold ${
            currentJob.boardConfidence >= 60 ? 'text-emerald-400' :
            currentJob.boardConfidence >= 35 ? 'text-gold-400' : 'text-red-400'
          }`}>{currentJob.boardConfidence}%</span>
        </div>
        <div className="h-2 rounded-full bg-pitch-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${currentJob.boardConfidence}%`,
              background: currentJob.boardConfidence >= 60 ? '#34d399' :
                          currentJob.boardConfidence >= 35 ? '#f0b429' : '#f87171',
            }}
          />
        </div>
        {currentJob.boardConfidence < 25 && (
          <p className="text-red-400 text-xs mt-1.5 pulse-gold">⚠ Tu puesto está en riesgo</p>
        )}
      </div>

      {/* Recent form */}
      {recentResults.length > 0 && (
        <div className="rounded-2xl bg-pitch-800 p-4 border border-pitch-700">
          <p className="text-pitch-500 text-xs font-medium uppercase tracking-wide mb-3">Forma reciente</p>
          <div className="flex gap-2">
            {recentResults.map((m, i) => (
              <ResultBadge key={i} match={m} clubId={club.id} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <div className="rounded-2xl bg-pitch-800 p-4 border border-pitch-700">
          <p className="text-pitch-500 text-xs font-medium uppercase tracking-wide mb-3">Próximos partidos</p>
          <div className="space-y-2">
            {upcomingMatches.map((m, i) => {
              const isHome = m.homeId === club.id
              const opponentId = isHome ? m.awayId : m.homeId
              const opponent = clubs.find(c => c.id === opponentId)
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-pitch-500 text-xs w-16">J{m.matchday}</span>
                  <span className={`text-xs ${isHome ? 'text-emerald-400' : 'text-pitch-500'}`}>
                    {isHome ? 'Local' : 'Visitante'}
                  </span>
                  <span className="text-white text-xs font-medium flex-1 text-right truncate ml-2">
                    {opponent?.name || 'Desconocido'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Press feed */}
      {pressHeadlines.length > 0 && (
        <div className="rounded-2xl bg-pitch-800 p-4 border border-pitch-700">
          <p className="text-pitch-500 text-xs font-medium uppercase tracking-wide mb-3">📰 Prensa</p>
          <div className="space-y-2">
            {[...pressHeadlines].reverse().slice(0, 4).map(h => (
              <HeadlineRow key={h.id} headline={h} />
            ))}
          </div>
        </div>
      )}

      {/* Unavailability warning */}
      {(() => {
        const unavailable = club.squad?.filter(p => (p.injuredFor || 0) > 0 || (p.suspendedFor || 0) > 0) || []
        const affectedStarters = club.starters?.length === 11
          ? club.starters.filter(sid => {
              const p = club.squad?.find(pl => pl.id === sid)
              return p && ((p.injuredFor || 0) > 0 || (p.suspendedFor || 0) > 0)
            })
          : []
        if (!unavailable.length) return null
        return (
          <div className="rounded-2xl bg-pitch-800 border border-orange-500/25 px-4 py-3">
            <p className="text-orange-400 text-xs leading-relaxed">
              ⚠ {unavailable.length} jugador{unavailable.length > 1 ? 'es' : ''} no disponible{unavailable.length > 1 ? 's' : ''}
              {affectedStarters.length > 0 && ` · ${affectedStarters.length} titular${affectedStarters.length > 1 ? 'es' : ''} reemplazado${affectedStarters.length > 1 ? 's' : ''} automáticamente`}
            </p>
          </div>
        )
      })()}

      {/* Simulate button */}
      <div className="space-y-2">
        {pressConference ? (
          <div className="rounded-2xl bg-pitch-800 border border-gold-400/40 p-4">
            <p className="text-gold-400 text-sm font-semibold mb-1">📰 Rueda de prensa pendiente</p>
            <p className="text-pitch-500 text-xs mb-3">
              Los medios esperan tus declaraciones. Respondé antes de continuar.
            </p>
            <button
              onClick={() => setTab('home')}
              className="w-full py-3 rounded-xl bg-gold-400 text-pitch-950 font-bold text-sm active:bg-gold-500"
            >
              Atender rueda de prensa →
            </button>
          </div>
        ) : !isMyLeagueDone ? (
          <button
            onClick={simulateMatchday}
            className="w-full py-4 rounded-2xl bg-gold-400 text-pitch-950 font-bold text-base active:bg-gold-500 shadow-lg"
          >
            ⚽ Simular Jornada {currentMd + 1}
          </button>
        ) : isMyLeagueDone && !allLeaguesDone ? (
          <button
            onClick={simulateMatchday}
            className="w-full py-4 rounded-2xl bg-pitch-700 text-white font-bold text-base active:bg-pitch-600 border border-pitch-600"
          >
            ⏩ Avanzar otras ligas
          </button>
        ) : null}

        <button
          onClick={resignJob}
          className="w-full py-3 rounded-xl bg-transparent text-pitch-600 text-sm active:text-red-400 border border-pitch-800"
        >
          Renunciar al cargo
        </button>
      </div>
    </div>
  )
}
