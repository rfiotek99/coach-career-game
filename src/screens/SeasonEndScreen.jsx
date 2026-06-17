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
        <h1 className="text-white text-2xl font-extrabold">Temporada {season} finalizada</h1>
        <p className="text-pitch-500 text-sm mt-1">Todos los partidos se jugaron</p>
      </div>

      {/* Player result */}
      {playerResult && (
        <div className={`rounded-2xl border p-4 mb-4 ${
          playerResult.objectiveMet
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-bold text-base">{playerResult.clubName}</p>
              <p className="text-pitch-500 text-xs">{findLeague(playerResult.leagueId)?.name}</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-extrabold ${
                playerResult.objectiveMet ? 'text-emerald-400' : 'text-red-400'
              }`}>{playerResult.position}°</p>
              <p className="text-pitch-600 text-xs">de {playerResult.total}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            <span className={`text-lg ${playerResult.objectiveMet ? '' : ''}`}>
              {playerResult.objectiveMet ? '✅' : '❌'}
            </span>
            <div>
              <p className={`text-sm font-semibold ${
                playerResult.objectiveMet ? 'text-emerald-400' : 'text-red-400'
              }`}>
                Objetivo: {playerResult.objective.text}
              </p>
              <p className="text-pitch-600 text-xs">
                {playerResult.objectiveMet ? 'Cumplido' : 'No cumplido'}
              </p>
            </div>
          </div>
          <p className="text-pitch-500 text-xs mt-2">
            Reputación actual: <span className="text-gold-400 font-bold">{coach?.reputation}/100</span>
          </p>
        </div>
      )}

      {/* League champions */}
      <div className="space-y-3 mb-6">
        {leagueResults.map(lr => (
          <div key={lr.leagueId} className="rounded-2xl bg-pitch-800 border border-pitch-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-pitch-400 text-xs font-semibold uppercase tracking-wider">{lr.leagueName}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm">🏆</span>
                <span className="text-gold-400 text-xs font-bold truncate max-w-[140px]">{lr.champion?.clubName || lr.champion?.clubId}</span>
              </div>
            </div>
            <div className="space-y-1">
              {lr.standings.map((s, i) => (
                <div key={s.clubId} className="flex items-center gap-2 text-xs">
                  <span className="text-pitch-600 w-4">{i + 1}</span>
                  <span className={`flex-1 truncate ${
                    s.clubId === lr.champion?.clubId ? 'text-gold-400 font-bold' : 'text-pitch-400'
                  }`}>{s.clubName || s.clubId}</span>
                  <span className="text-white font-bold">{s.points}</span>
                  <span className="text-pitch-600">pts</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={processSeasonEnd}
        className="w-full py-4 rounded-2xl bg-gold-400 text-pitch-950 font-bold text-base active:bg-gold-500 shadow-lg"
      >
        Comenzar Temporada {season + 1} →
      </button>

      <p className="text-center text-pitch-700 text-xs mt-3">
        Se aplicarán ascensos, descensos y ofertas de trabajo
      </p>
    </div>
  )
}
