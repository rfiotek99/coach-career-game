import useGame from '../store/useGame.js'
import { findLeague } from '../data/worldData.js'

function Score({ home, away, homeGoals, awayGoals, isPlayerHome, isPlayerAway }) {
  const playerWon = isPlayerHome
    ? homeGoals > awayGoals
    : awayGoals > homeGoals
  const draw = homeGoals === awayGoals

  const color = draw ? 'text-gold-400' : playerWon ? 'text-emerald-400' : 'text-red-400'
  const isPlayer = isPlayerHome || isPlayerAway

  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg mb-2 ${
      isPlayer ? 'bg-pitch-800 border border-pitch-700' : 'bg-pitch-950'
    }`}>
      <span className={`text-xs flex-1 text-right truncate ${isPlayerHome ? 'text-white font-semibold' : 'text-pitch-500'}`}>
        {home}
      </span>
      <span className={`text-sm font-bold mx-3 tabular-nums ${isPlayer ? color : 'text-pitch-500'}`}>
        {homeGoals} - {awayGoals}
      </span>
      <span className={`text-xs flex-1 text-left truncate ${isPlayerAway ? 'text-white font-semibold' : 'text-pitch-500'}`}>
        {away}
      </span>
    </div>
  )
}

export default function MatchReportModal() {
  const matchReport = useGame(s => s.matchReport)
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const foreignLeague = useGame(s => s.foreignLeague)
  const dismissMatchReport = useGame(s => s.dismissMatchReport)

  if (!matchReport) return null

  const grouped = {}
  matchReport.forEach(r => {
    if (!grouped[r.leagueId]) grouped[r.leagueId] = []
    grouped[r.leagueId].push(r)
  })

  const playerClubId = currentJob?.clubId
  const orderedLeagueIds = [
    ...(foreignLeague && grouped[foreignLeague.leagueId] ? [foreignLeague.leagueId] : []),
    ...['liga-premier','liga-nacional','liga-regional'].filter(lid => grouped[lid]),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(7,26,14,0.85)' }}
      onClick={dismissMatchReport}
    >
      <div
        className="w-full max-w-480 bg-pitch-900 rounded-t-2xl p-4 slide-up max-h-[85vh] overflow-y-auto"
        style={{ maxWidth: 480 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-base">Resultados de la Jornada</h2>
          <button
            onClick={dismissMatchReport}
            className="text-pitch-600 text-2xl leading-none active:text-white"
          >×</button>
        </div>

        {orderedLeagueIds.map(lid => {
          const results = grouped[lid]
          if (!results?.length) return null
          return (
            <div key={lid} className="mb-4">
              <p className="text-gold-400 text-xs font-semibold uppercase tracking-wider mb-2">
                {findLeague(lid)?.name || lid}
              </p>
              {results.map((r, i) => (
                <Score
                  key={i}
                  home={r.homeName}
                  away={r.awayName}
                  homeGoals={r.homeGoals}
                  awayGoals={r.awayGoals}
                  isPlayerHome={r.homeId === playerClubId}
                  isPlayerAway={r.awayId === playerClubId}
                />
              ))}
            </div>
          )
        })}

        <button
          onClick={dismissMatchReport}
          className="w-full py-3 rounded-xl bg-pitch-700 text-white font-semibold text-sm active:bg-pitch-600 mt-2"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
