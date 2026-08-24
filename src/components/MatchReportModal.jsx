import useGame from '../store/useGame.js'
import { findLeague } from '../data/worldData.js'

function Score({ home, away, homeGoals, awayGoals, isPlayerHome, isPlayerAway }) {
  const playerWon = isPlayerHome ? homeGoals > awayGoals : awayGoals > homeGoals
  const draw = homeGoals === awayGoals
  const color = draw ? 'text-warn' : playerWon ? 'text-volt' : 'text-magenta'
  const isPlayer = isPlayerHome || isPlayerAway

  return (
    <div className={`flex items-center justify-between px-3.5 py-3 rounded-lg mb-2 ${
      isPlayer ? 'bg-carbon-raised border border-line' : 'bg-carbon'
    }`}>
      <span className={`text-xs flex-1 text-right truncate ${isPlayerHome ? 'text-ink font-semibold' : 'text-ink-faint'}`}>
        {home}
      </span>
      <span className={`font-data text-base font-extrabold mx-3 ${isPlayer ? color : 'text-ink-faint'}`}>
        {homeGoals} - {awayGoals}
      </span>
      <span className={`text-xs flex-1 text-left truncate ${isPlayerAway ? 'text-ink font-semibold' : 'text-ink-faint'}`}>
        {away}
      </span>
    </div>
  )
}

// Hero card for the player's own match — big, emotional, protagonist
function HeroMatch({ match, isHome }) {
  const pg = isHome ? match.homeGoals : match.awayGoals
  const og = isHome ? match.awayGoals : match.homeGoals
  const won = pg > og
  const draw = pg === og

  const verdict = won ? '¡VICTORIA!' : draw ? 'EMPATE' : 'DERROTA'
  const verdictColor = won ? 'text-volt' : draw ? 'text-warn' : 'text-magenta'
  const borderColor = won ? 'border-volt' : draw ? 'border-warn' : 'border-magenta'
  const glowBg = won ? 'var(--color-volt-dim)' : draw ? 'var(--color-warn-dim)' : 'var(--color-magenta-dim)'

  return (
    <div className={`rounded-lg border ${borderColor} p-4 mb-4`} style={{ background: glowBg }}>
      <p className={`text-center font-data text-xs font-bold uppercase tracking-widest mb-3 ${verdictColor}`}>
        {verdict}
      </p>
      <div className="flex items-center justify-between">
        <span className="font-title text-ink text-sm flex-1 text-right truncate pr-3">
          {match.homeName}
        </span>
        <span className={`font-data text-3xl font-black ${verdictColor}`}>
          {match.homeGoals}-{match.awayGoals}
        </span>
        <span className="font-title text-ink text-sm flex-1 text-left truncate pl-3">
          {match.awayName}
        </span>
      </div>
      <p className="text-center font-data text-ink-faint text-[11px] mt-2">
        {isHome ? 'De local' : 'De visitante'}
      </p>
    </div>
  )
}

export default function MatchReportModal() {
  const matchReport = useGame(s => s.matchReport)
  const currentJob = useGame(s => s.currentJob)
  const foreignLeague = useGame(s => s.foreignLeague)
  const dismissMatchReport = useGame(s => s.dismissMatchReport)

  if (!matchReport) return null

  const playerClubId = currentJob?.clubId

  // Find the player's own match to feature it
  let myMatch = null
  let myMatchIsHome = false
  for (const r of matchReport) {
    if (r.homeId === playerClubId) { myMatch = r; myMatchIsHome = true; break }
    if (r.awayId === playerClubId) { myMatch = r; myMatchIsHome = false; break }
  }

  const grouped = {}
  matchReport.forEach(r => {
    if (r === myMatch) return
    if (!grouped[r.leagueId]) grouped[r.leagueId] = []
    grouped[r.leagueId].push(r)
  })

  const orderedLeagueIds = [
    ...(foreignLeague && grouped[foreignLeague.leagueId] ? [foreignLeague.leagueId] : []),
    ...['liga-premier','liga-nacional','liga-regional'].filter(lid => grouped[lid]),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(11,12,14,0.85)' }}
      onClick={dismissMatchReport}
    >
      <div
        className="w-full bg-carbon border-t border-line rounded-t-2xl p-4 slide-up max-h-[85vh] overflow-y-auto"
        style={{ maxWidth: 480 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-title text-ink text-base leading-none">Resultados de la Jornada</h2>
          <button
            onClick={dismissMatchReport}
            className="text-ink-faint text-2xl leading-none active:text-ink"
          >×</button>
        </div>

        {/* YOUR match — featured on top */}
        {myMatch && <HeroMatch match={myMatch} isHome={myMatchIsHome} />}

        {/* Rest of the matches */}
        {orderedLeagueIds.map(lid => {
          const results = grouped[lid]
          if (!results?.length) return null
          return (
            <div key={lid} className="mb-4">
              <p className="font-data text-volt text-xs font-semibold uppercase tracking-wider mb-2">
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
          className="w-full py-3 rounded-lg bg-carbon-high text-ink font-data font-semibold text-sm active:bg-line mt-2"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
