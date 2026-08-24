import { useState } from 'react'
import useGame from '../store/useGame.js'
import { findLeague } from '../data/worldData.js'

function HeadlineRow({ headline }) {
  const dotColor =
    headline.type === 'positive' ? 'bg-volt' :
    headline.type === 'negative' ? 'bg-magenta' : 'bg-ink-faint'
  const textColor =
    headline.type === 'positive' ? 'text-ink-dim' :
    headline.type === 'negative' ? 'text-ink-dim' : 'text-ink-faint'
  return (
    <div className="flex items-start gap-2">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
      <p className={`font-data text-xs leading-relaxed ${textColor}`}>{headline.text}</p>
    </div>
  )
}

function ResultBadge({ match, clubId }) {
  if (match.homeGoals === null) return null
  const isHome = match.homeId === clubId
  const pg = isHome ? match.homeGoals : match.awayGoals
  const og = isHome ? match.awayGoals : match.homeGoals
  if (pg > og) return <span className="w-5 h-5 rounded-full bg-volt flex items-center justify-center text-carbon font-data text-[10px] font-extrabold">V</span>
  if (pg < og) return <span className="w-5 h-5 rounded-full bg-magenta flex items-center justify-center text-ink font-data text-[10px] font-extrabold">D</span>
  return <span className="w-5 h-5 rounded-full border border-ink-faint flex items-center justify-center text-ink-dim font-data text-[10px] font-extrabold">E</span>
}

function ObjectiveCard({ obj, myPos, currentMd, totalMd }) {
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
    <div className={`card-broadcast border p-4 ${met ? 'border-volt' : seasonLate ? 'border-magenta' : 'border-line'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">🎯 Objetivo de temporada</span>
        <span className={`font-data text-[11px] font-extrabold px-2 py-0.5 clip-cut-sm ${
          met ? 'bg-volt-dim text-volt' : 'bg-magenta-dim text-magenta'
        }`}>
          {met ? '✓ EN CAMINO' : '✗ EN RIESGO'}
        </span>
      </div>
      <p className="text-ink font-semibold text-sm mb-1.5">{obj.text}</p>
      <p className="font-data text-ink-dim text-xs leading-relaxed">{progressText}</p>
      {!met && seasonLate && (
        <p className="font-data text-magenta text-[11px] mt-2">
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
  const startLiveMatch = useGame(s => s.startLiveMatch)
  const startCupLiveMatch = useGame(s => s.startCupLiveMatch)
  const getPendingCupMatch = useGame(s => s.getPendingCupMatch)
  const resignJob = useGame(s => s.resignJob)
  const getLeagueStandings = useGame(s => s.getLeagueStandings)
  const getUpcomingMatches = useGame(s => s.getUpcomingMatches)
  const getRecentResults = useGame(s => s.getRecentResults)
  const getCurrentMatchday = useGame(s => s.getCurrentMatchday)
  const leagues = useGame(s => s.leagues)
  const pressHeadlines = useGame(s => s.pressHeadlines)
  const pressConference = useGame(s => s.pressConference)
  const setTab = useGame(s => s.setTab)
  const season = useGame(s => s.season)

  // Partido de copa del jugador pendiente esta jornada — se muestra su propia
  // tarjeta (rápido/en vivo) en vez de dejar que se resuelva solo. "Simular
  // rápido" no toca el store (el partido se resuelve recién cuando se llama a
  // simulateMatchday más abajo), así que se guarda solo la IDENTIDAD del
  // fixture elegido — comparándola contra la del fixture actual en cada
  // render deja de mostrar la tarjeta sin necesitar un efecto.
  const pendingCupMatch = getPendingCupMatch()
  const pendingCupKey = pendingCupMatch ? `${pendingCupMatch.continentId}:${pendingCupMatch.phase}:${pendingCupMatch.opponentId}` : null
  const [cupQuickChosenKey, setCupQuickChosenKey] = useState(null)
  const cupQuickChosen = pendingCupKey !== null && cupQuickChosenKey === pendingCupKey

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
      <div className="card-broadcast border border-line overflow-hidden">
        <div className="flex items-center justify-between px-4 py-1.5 bg-carbon-high border-b border-line">
          <span className="section-label text-volt">Club</span>
          <span className="font-data text-[10px] text-ink-faint tracking-wider">TEMP {season}</span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 shrink-0"
                  style={{ background: club.color, clipPath: 'polygon(0 0, 100% 0, 100% 65%, 65% 100%, 0 100%)' }}
                />
                <span className="font-title text-ink text-xl leading-none">{club.name}</span>
              </div>
              <p className="font-data text-ink-faint text-xs">{leagueName} · {club.city}</p>
            </div>
            <div className="text-right">
              <span className="font-data text-ink font-extrabold text-2xl">{myPos || '—'}</span>
              <span className="font-data text-ink-faint text-xs">°</span>
              <p className="font-data text-ink-faint text-[10px] uppercase tracking-wide">puesto</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="font-data text-volt font-extrabold text-lg">{myStanding?.points ?? 0}</p>
              <p className="font-data text-ink-faint text-[10px] uppercase tracking-wide">puntos</p>
            </div>
            <div>
              <p className="font-data text-ink font-extrabold text-lg">{currentMd}/{totalMd}</p>
              <p className="font-data text-ink-faint text-[10px] uppercase tracking-wide">jornadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Objective card */}
      <ObjectiveCard
        obj={obj}
        myPos={myPos}
        currentMd={currentMd}
        totalMd={totalMd}
      />

      {/* Board confidence */}
      <div className="card-broadcast border border-line p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="section-label">Confianza de la dirigencia</span>
          <span className={`font-data text-sm font-extrabold ${
            currentJob.boardConfidence >= 60 ? 'text-volt' :
            currentJob.boardConfidence >= 35 ? 'text-warn' : 'text-magenta'
          }`}>{currentJob.boardConfidence}%</span>
        </div>
        <div className="h-2 rounded-sm bg-carbon-high overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${currentJob.boardConfidence}%`,
              background: currentJob.boardConfidence >= 60 ? 'var(--color-volt)' :
                          currentJob.boardConfidence >= 35 ? 'var(--color-warn)' : 'var(--color-magenta)',
            }}
          />
        </div>
        {currentJob.boardConfidence < 25 && (
          <p className="font-data text-magenta text-xs mt-1.5 pulse-gold">⚠ Tu puesto está en riesgo</p>
        )}
      </div>

      {/* Recent form */}
      {recentResults.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Forma reciente</p>
          <div className="flex gap-2">
            {recentResults.map((m, i) => (
              <ResultBadge key={i} match={m} clubId={club.id} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Próximos partidos</p>
          <div className="space-y-2">
            {upcomingMatches.map((m, i) => {
              const isHome = m.homeId === club.id
              const opponentId = isHome ? m.awayId : m.homeId
              const opponent = clubs.find(c => c.id === opponentId)
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-data text-ink-faint text-xs w-16">J{m.matchday}</span>
                  <span className={`font-data text-xs ${isHome ? 'text-volt' : 'text-ink-faint'}`}>
                    {isHome ? 'Local' : 'Visitante'}
                  </span>
                  <span className="text-ink text-xs font-medium flex-1 text-right truncate ml-2">
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
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">📰 Prensa</p>
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
          <div className="card-broadcast border border-warn px-4 py-3">
            <p className="font-data text-warn text-xs leading-relaxed">
              ⚠ {unavailable.length} jugador{unavailable.length > 1 ? 'es' : ''} no disponible{unavailable.length > 1 ? 's' : ''}
              {affectedStarters.length > 0 && ` · ${affectedStarters.length} titular${affectedStarters.length > 1 ? 'es' : ''} reemplazado${affectedStarters.length > 1 ? 's' : ''} automáticamente`}
            </p>
          </div>
        )
      })()}

      {/* Contract expiry warning */}
      {(() => {
        const expiring = club.squad?.filter(p => (p.contract?.yearsLeft ?? 99) <= 1) || []
        if (!expiring.length) return null
        return (
          <button
            onClick={() => setTab('squad')}
            className="w-full text-left card-broadcast border border-warn px-4 py-3 active:bg-carbon-high"
          >
            <p className="font-data text-warn text-xs leading-relaxed">
              📝 {expiring.length} contrato{expiring.length > 1 ? 's' : ''} por vencer — renovalo{expiring.length > 1 ? 's' : ''} antes de perderlo{expiring.length > 1 ? 's' : ''} gratis
            </p>
          </button>
        )
      })()}

      {/* Simulate button */}
      <div className="space-y-2">
        {pressConference ? (
          <div className="card-broadcast border border-warn p-4">
            <p className="font-data text-warn text-sm font-bold mb-1">📰 Rueda de prensa pendiente</p>
            <p className="font-data text-ink-dim text-xs mb-3">
              Los medios esperan tus declaraciones. Respondé antes de continuar.
            </p>
            <button
              onClick={() => setTab('home')}
              className="btn-volt clip-cut w-full py-3 text-sm active:opacity-90"
            >
              Atender rueda de prensa →
            </button>
          </div>
        ) : pendingCupMatch && !cupQuickChosen ? (
          <div className="card-broadcast border border-warn p-4">
            <p className="font-data text-warn text-xs font-extrabold uppercase tracking-wide mb-1">
              🏆 {pendingCupMatch.competitionName}{pendingCupMatch.roundName ? ` — ${pendingCupMatch.roundName}` : ''}
            </p>
            <p className="text-ink text-sm font-semibold mb-3">
              Jugás de {pendingCupMatch.isPlayerHome ? 'local' : 'visitante'} vs{' '}
              <span style={{ color: pendingCupMatch.opponentColor }}>{pendingCupMatch.opponentName}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCupQuickChosenKey(pendingCupKey)}
                className="btn-volt clip-cut py-4 text-sm shadow-lg active:opacity-90"
              >
                ⏩ Simular rápido
              </button>
              <button
                onClick={startCupLiveMatch}
                className="btn-magenta clip-cut py-4 text-sm shadow-lg active:opacity-90"
              >
                🔴 Ver en vivo
              </button>
            </div>
          </div>
        ) : !isMyLeagueDone ? (
          <div>
            <p className="font-data text-ink-faint text-xs text-center mb-2">Jornada {currentMd + 1}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => simulateMatchday()}
                className="btn-volt clip-cut py-4 text-sm shadow-lg active:opacity-90"
              >
                ⏩ Simular rápido
              </button>
              <button
                onClick={startLiveMatch}
                className="btn-magenta clip-cut py-4 text-sm shadow-lg active:opacity-90"
              >
                🔴 Ver en vivo
              </button>
            </div>
          </div>
        ) : isMyLeagueDone && !allLeaguesDone ? (
          <button
            onClick={() => simulateMatchday()}
            className="card-broadcast border border-line clip-cut w-full py-4 font-data text-ink font-extrabold uppercase tracking-wide text-base active:bg-carbon-high"
          >
            ⏩ Avanzar otras ligas
          </button>
        ) : null}

        <button
          onClick={resignJob}
          className="w-full py-3 rounded-xl bg-transparent font-data text-ink-faint text-sm active:text-magenta border border-line"
        >
          Renunciar al cargo
        </button>
      </div>
    </div>
  )
}
