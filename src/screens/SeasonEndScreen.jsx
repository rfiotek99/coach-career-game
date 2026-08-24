import useGame from '../store/useGame.js'
import { findLeague } from '../data/worldData.js'

export default function SeasonEndScreen() {
  const seasonEndData = useGame(s => s.seasonEndData)
  const season = useGame(s => s.season)
  const processSeasonEnd = useGame(s => s.processSeasonEnd)
  const coach = useGame(s => s.coach)

  if (!seasonEndData) return null

  const { playerResult, leagueResults } = seasonEndData

  return (
    <div className="px-4 py-6 pb-24 min-h-screen">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🏁</div>
        <h1 className="font-title text-ink text-2xl leading-none">Temporada {season} finalizada</h1>
        <p className="font-data text-ink-faint text-sm mt-2">Todos los partidos se jugaron</p>
      </div>

      {/* Player result */}
      {playerResult && (
        <div className={`card-broadcast border p-4 mb-4 ${
          playerResult.objectiveMet
            ? 'border-volt'
            : 'border-magenta'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-title text-ink text-base leading-none">{playerResult.clubName}</p>
              <p className="font-data text-ink-faint text-xs mt-1.5">{findLeague(playerResult.leagueId)?.name}</p>
            </div>
            <div className="text-right">
              <p className={`font-data text-3xl font-extrabold ${
                playerResult.objectiveMet ? 'text-volt' : 'text-magenta'
              }`}>{playerResult.position}°</p>
              <p className="font-data text-ink-faint text-xs">de {playerResult.total}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line flex items-center gap-2">
            <span className="text-lg">
              {playerResult.objectiveMet ? '✅' : '❌'}
            </span>
            <div>
              <p className={`text-sm font-semibold ${
                playerResult.objectiveMet ? 'text-volt' : 'text-magenta'
              }`}>
                Objetivo: {playerResult.objective.text}
              </p>
              <p className="font-data text-ink-faint text-xs">
                {playerResult.objectiveMet ? 'Cumplido' : 'No cumplido'}
              </p>
            </div>
          </div>
          <p className="font-data text-ink-faint text-xs mt-2">
            Reputación actual: <span className="text-volt font-bold">{coach?.reputation}/100</span>
          </p>
        </div>
      )}

      {/* League champions */}
      <div className="space-y-3 mb-6">
        {leagueResults.map(lr => (
          <div key={lr.leagueId} className="card-broadcast border border-line p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-data text-ink-dim text-xs font-semibold uppercase tracking-wider">{lr.leagueName}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm">🏆</span>
                <span className="font-data text-volt text-xs font-bold truncate max-w-[140px]">{lr.champion?.clubName || lr.champion?.clubId}</span>
              </div>
            </div>
            <div className="space-y-1">
              {lr.standings.map((s, i) => (
                <div key={s.clubId} className="flex items-center gap-2 font-data text-xs">
                  <span className="text-ink-faint w-4">{i + 1}</span>
                  <span className={`flex-1 truncate ${
                    s.clubId === lr.champion?.clubId ? 'text-volt font-bold' : 'text-ink-dim'
                  }`}>{s.clubName || s.clubId}</span>
                  <span className="text-ink font-bold">{s.points}</span>
                  <span className="text-ink-faint">pts</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={processSeasonEnd}
        className="btn-volt clip-cut w-full py-4 text-base shadow-lg active:opacity-90"
      >
        Comenzar Temporada {season + 1} →
      </button>

      <p className="text-center font-data text-ink-faint text-xs mt-3">
        Se aplicarán ascensos, descensos y ofertas de trabajo — después, pretemporada
      </p>
    </div>
  )
}
