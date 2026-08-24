import useGame from '../store/useGame.js'
import { getRepLabel, canApplyToClub } from '../data/gameData.js'
import { WORLD_CLUBS, WORLD_LEAGUES, COUNTRIES, findLeague } from '../data/worldData.js'
import { calcStandings } from '../engine/sim.js'

function JobCard({ club, job, onAccept }) {
  const league = findLeague(club.leagueId)
  const tierLabel = ['', '1ª', '2ª', '3ª'][league?.tier || 1]
  const salary = job.salary.toLocaleString('es-AR')
  const stars = Math.ceil(club.prestige / 20)

  return (
    <div className="card-broadcast border border-line p-4 slide-up">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: club.color }} />
            <span className="font-title text-ink text-sm truncate">{club.name}</span>
          </div>
          <p className="font-data text-ink-faint text-xs mt-1">{club.city} · {league?.name} ({tierLabel} división)</p>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="flex gap-0.5 justify-end mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`text-xs ${i < stars ? 'text-volt' : 'text-ink-faint'}`}>★</span>
            ))}
          </div>
          <p className="font-data text-ink-faint text-[11px]">prestigio {club.prestige}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-carbon-high rounded-lg px-2 py-1.5">
          <p className="font-data text-ink-faint text-[11px]">Objetivo</p>
          <p className="text-ink font-medium">{getObjectiveText(club)}</p>
        </div>
        <div className="bg-carbon-high rounded-lg px-2 py-1.5">
          <p className="font-data text-ink-faint text-[11px]">Salario/jornada</p>
          <p className="font-data text-volt font-semibold">${salary}</p>
        </div>
      </div>

      <button
        onClick={onAccept}
        className="btn-volt clip-cut w-full py-2.5 text-sm active:opacity-90"
      >
        Aceptar Cargo
      </button>
    </div>
  )
}

function IntlJobCard({ worldClub, job, country, league, onAccept }) {
  const tierLabel = league?.tier === 1 ? '1ª div.' : '2ª div.'
  const salary = job.salary.toLocaleString('es-AR')
  const stars = Math.ceil(worldClub.prestige / 20)
  const objectiveText = getWorldObjectiveText(worldClub, league)

  return (
    <div className="card-broadcast border border-line p-4 slide-up">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: worldClub.color }} />
            <span className="font-title text-ink text-sm truncate">{worldClub.name}</span>
          </div>
          <p className="font-data text-ink-faint text-xs mt-1">
            {country?.flag} {country?.name} · {league?.name} ({tierLabel})
          </p>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="flex gap-0.5 justify-end mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`text-xs ${i < stars ? 'text-volt' : 'text-ink-faint'}`}>★</span>
            ))}
          </div>
          <p className="font-data text-ink-faint text-[11px]">prestige {worldClub.prestige}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-carbon-high rounded-lg px-2 py-1.5">
          <p className="font-data text-ink-faint text-[11px]">Objetivo</p>
          <p className="text-ink font-medium">{objectiveText}</p>
        </div>
        <div className="bg-carbon-high rounded-lg px-2 py-1.5">
          <p className="font-data text-ink-faint text-[11px]">Salario/jornada</p>
          <p className="font-data text-volt font-semibold">${salary}</p>
        </div>
      </div>

      <button
        onClick={onAccept}
        className="btn-volt clip-cut w-full py-2.5 text-sm active:opacity-90"
      >
        Aceptar Cargo Internacional
      </button>
    </div>
  )
}

function getObjectiveText(club) {
  const prestige = club.prestige
  const leagueId = club.leagueId
  if (leagueId === 'liga-premier') {
    if (prestige >= 90) return 'Ganar el título'
    if (prestige >= 82) return 'Top 4'
    if (prestige >= 76) return 'Top 6'
    return 'No descender'
  }
  if (leagueId === 'liga-nacional') {
    if (prestige >= 68) return 'Ascender'
    if (prestige >= 58) return 'Top 5'
    return 'No descender'
  }
  if (prestige >= 44) return 'Ascender'
  return 'No descender'
}

function getWorldObjectiveText(club, league) {
  if (!league) return 'Sin objetivo'
  if (league.tier === 1) {
    if (club.prestige >= 90) return 'Ganar el título'
    if (club.prestige >= 80) return 'Top 4'
    return 'Mantener categoría'
  }
  return club.prestige >= 55 ? 'Ascender' : 'Mantener categoría'
}

export default function Unemployed() {
  const coach = useGame(s => s.coach)
  const clubs = useGame(s => s.clubs)
  const leagues = useGame(s => s.leagues)
  const acceptJob = useGame(s => s.acceptJob)
  const simulateMatchday = useGame(s => s.simulateMatchday)
  const getAvailableJobs = useGame(s => s.getAvailableJobs)
  const getInternationalOffers = useGame(s => s.getInternationalOffers)

  const jobs = getAvailableJobs()
  const intlJobs = getInternationalOffers()
  const repInfo = getRepLabel(coach?.reputation || 0)

  // Find any league that still has matchdays left
  const allLeaguesDone = Object.values(leagues).every(l => l.completed)
  const leagueProgress = Object.values(leagues).map(l => ({
    current: l.currentMatchday, total: l.totalMatchdays, done: l.completed,
  }))[0]

  const allVacancies = clubs.filter(c => c.managerId === null)
  const lockedJobs = allVacancies.filter(c => !canApplyToClub(coach?.reputation || 0, c.prestige))

  return (
    <div className="px-4 py-4 pb-24">
      {/* Status card */}
      <div className="card-broadcast border border-line p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-carbon-high flex items-center justify-center text-2xl">
            🕵️
          </div>
          <div>
            <p className="font-title text-ink text-base leading-none">{coach?.name}</p>
            <p className="text-xs mt-1.5" style={{ color: repInfo.color }}>
              {repInfo.label} · Rep {coach?.reputation}/100
            </p>
            <p className="font-data text-ink-faint text-xs mt-0.5">Sin trabajo</p>
          </div>
        </div>
      </div>

      {/* Advance time button */}
      {!allLeaguesDone && (
        <div className="card-broadcast border border-line p-4 mb-4">
          <p className="text-ink font-semibold text-sm mb-1">Avanzar el mundo</p>
          <p className="font-data text-ink-dim text-xs mb-3">
            Simulá jornadas para que los clubes despidan técnicos y aparezcan vacantes.
            {leagueProgress && ` Jornada ${leagueProgress.current}/${leagueProgress.total}.`}
          </p>
          <button
            onClick={() => simulateMatchday()}
            className="w-full py-3 rounded-lg bg-carbon-high text-ink font-data font-semibold text-sm active:bg-line border border-line"
          >
            ⏩ Simular siguiente jornada
          </button>
        </div>
      )}

      {/* Argentine job offers */}
      <p className="section-label mb-3">
        Ofertas disponibles ({jobs.length})
      </p>

      {jobs.length === 0 && lockedJobs.length === 0 && (
        <div className="card-broadcast border border-line p-6 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="text-ink font-semibold">No hay vacantes</p>
          <p className="font-data text-ink-faint text-sm mt-1">
            Todos los clubes tienen técnico. Avanzá la temporada para que aparezcan vacantes.
          </p>
        </div>
      )}

      {jobs.length === 0 && lockedJobs.length > 0 && (
        <div className="card-broadcast border border-line p-6 text-center mb-4">
          <p className="text-3xl mb-2">🔒</p>
          <p className="text-ink font-semibold text-sm">Sin ofertas para tu reputación</p>
          <p className="font-data text-ink-faint text-xs mt-1">
            Hay {lockedJobs.length} vacantes pero requieren más reputación.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map(job => {
          const club = clubs.find(c => c.id === job.clubId)
          if (!club) return null
          return (
            <JobCard
              key={job.clubId}
              club={club}
              job={job}
              onAccept={() => acceptJob(job.clubId)}
            />
          )
        })}
      </div>

      {/* Locked vacancies */}
      {lockedJobs.length > 0 && jobs.length > 0 && (
        <div className="mt-4">
          <p className="font-data text-ink-faint text-xs font-semibold uppercase tracking-wider mb-2">
            Bloqueados por reputación ({lockedJobs.length})
          </p>
          <div className="space-y-2">
            {lockedJobs.slice(0, 3).map(club => (
              <div key={club.id} className="rounded-lg bg-carbon border border-line px-3 py-2.5 flex items-center gap-2 opacity-60">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: club.color }} />
                <span className="text-ink-faint text-sm flex-1">{club.name}</span>
                <span className="font-data text-ink-faint text-xs">🔒 Rep {club.prestige >= 90 ? 60 : club.prestige >= 80 ? 45 : club.prestige >= 70 ? 30 : 15}+</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* International offers */}
      {intlJobs.length > 0 && (
        <div className="mt-5">
          <p className="section-label mb-3">
            Ofertas internacionales ({intlJobs.length})
          </p>
          <div className="space-y-3">
            {intlJobs.map(job => {
              const wc = WORLD_CLUBS.find(c => c.id === job.clubId)
              if (!wc) return null
              const country = COUNTRIES.find(c => c.id === wc.countryId)
              const league = WORLD_LEAGUES.find(l => l.id === wc.leagueId)
              return (
                <IntlJobCard
                  key={job.clubId}
                  worldClub={wc}
                  job={job}
                  country={country}
                  league={league}
                  onAccept={() => acceptJob(job.clubId)}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
