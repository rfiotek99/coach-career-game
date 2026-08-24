import { useState } from 'react'
import useGame from '../store/useGame.js'
import { LEAGUES } from '../data/gameData.js'
import { WORLD_CLUBS, WORLD_LEAGUES } from '../data/worldData.js'
import { calcStandings } from '../engine/sim.js'

function StandingRow({ standing, pos, club, isPlayer, isPromotion, isRelegation }) {
  const gd = standing.gf - standing.ga
  return (
    <div className={`flex items-center px-3 py-3 rounded-lg border-l-2 ${
      isPlayer ? 'bg-volt-dim border-volt' :
      isPromotion ? 'bg-carbon-high border-volt-mid' :
      isRelegation ? 'bg-carbon-high border-magenta-mid' : 'border-transparent'
    }`}>
      <span className={`font-data w-6 text-center text-xs font-bold ${
        isPlayer ? 'text-volt' : 'text-ink-faint'
      }`}>{pos}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0 mx-1.5">
        {club && <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: club.color }} />}
        <span className={`text-sm truncate ${isPlayer ? 'text-ink font-bold' : 'text-ink-dim font-medium'}`}>
          {club?.name || standing.clubId}
        </span>
      </div>
      <span className="font-data text-ink-faint text-xs w-6 text-center">{standing.played}</span>
      <span className="font-data text-ink-faint text-xs w-6 text-center">{standing.won}</span>
      <span className="font-data text-ink-faint text-xs w-6 text-center">{standing.drawn}</span>
      <span className="font-data text-ink-faint text-xs w-6 text-center">{standing.lost}</span>
      <span className={`font-data text-xs w-7 text-center ${gd > 0 ? 'text-volt' : gd < 0 ? 'text-magenta' : 'text-ink-faint'}`}>
        {gd > 0 ? '+' : ''}{gd}
      </span>
      <span className={`font-data text-base font-extrabold w-8 text-right ${isPlayer ? 'text-volt' : 'text-ink'}`}>
        {standing.points}
      </span>
    </div>
  )
}

export default function StandingsScreen() {
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const leagues = useGame(s => s.leagues)
  const foreignLeague = useGame(s => s.foreignLeague)

  const isWorldJob = !!foreignLeague && !!currentJob

  // Determine which league to show by default
  let defaultLeague = isWorldJob ? foreignLeague.leagueId : 'liga-premier'
  if (currentJob && !isWorldJob) {
    const club = clubs.find(c => c.id === currentJob.clubId)
    if (club) defaultLeague = club.leagueId
  }

  const [selectedLeague, setSelectedLeague] = useState(defaultLeague)

  // Build display tabs: foreign league first (if world job), then Argentine leagues
  const displayTabs = isWorldJob
    ? [
        { id: foreignLeague.leagueId, name: WORLD_LEAGUES.find(l => l.id === foreignLeague.leagueId)?.name || 'Mi Liga' },
        ...LEAGUES,
      ]
    : LEAGUES

  // Determine if currently viewing the foreign league
  const isFL = isWorldJob && selectedLeague === foreignLeague?.leagueId

  // Get standings
  let standings
  if (isFL) {
    const flIds = WORLD_CLUBS.filter(c => c.leagueId === selectedLeague).map(c => c.id)
    standings = calcStandings(flIds, foreignLeague.schedule)
  } else {
    const lg = leagues[selectedLeague]
    standings = lg ? calcStandings(lg.clubIds, lg.schedule) : []
  }

  const leagueInfo = isFL
    ? WORLD_LEAGUES.find(l => l.id === selectedLeague)
    : LEAGUES.find(l => l.id === selectedLeague)

  const leagueTeams = isFL
    ? WORLD_CLUBS.filter(c => c.leagueId === selectedLeague).length
    : (leagueInfo?.teams || standings.length)

  const lgForInfo = isFL ? foreignLeague : leagues[selectedLeague]

  const playerClubId = currentJob?.clubId

  return (
    <div className="px-4 py-4 pb-24">
      {/* League tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {displayTabs.map(l => (
          <button
            key={l.id}
            onClick={() => setSelectedLeague(l.id)}
            className={`shrink-0 px-3.5 py-2.5 rounded-xl font-data text-xs font-semibold transition-colors ${
              selectedLeague === l.id
                ? 'bg-volt text-carbon'
                : 'bg-carbon-raised text-ink-faint active:bg-carbon-high'
            }`}
          >
            {l.name.replace('Liga ', 'L.')}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center px-3 mb-2.5">
        <span className="w-6" />
        <span className="flex-1 font-data text-ink-faint text-[10px] font-bold uppercase tracking-wider mx-1.5">Club</span>
        <span className="font-data text-ink-faint text-[10px] font-bold w-6 text-center">PJ</span>
        <span className="font-data text-ink-faint text-[10px] font-bold w-6 text-center">G</span>
        <span className="font-data text-ink-faint text-[10px] font-bold w-6 text-center">E</span>
        <span className="font-data text-ink-faint text-[10px] font-bold w-6 text-center">P</span>
        <span className="font-data text-ink-faint text-[10px] font-bold w-7 text-center">DG</span>
        <span className="font-data text-ink-faint text-[10px] font-bold w-8 text-right">Pts</span>
      </div>

      {/* Standings */}
      <div className="space-y-1.5">
        {standings.map((s, i) => {
          const club = clubs.find(c => c.id === s.clubId) || WORLD_CLUBS.find(c => c.id === s.clubId)
          const isPlayer = s.clubId === playerClubId
          const isPromotion = !isFL && leagueInfo && i < leagueInfo.promoteSlots && leagueInfo.promoteSlots > 0
          const isRelegation = !isFL && leagueInfo && i >= leagueTeams - leagueInfo.relegateSlots && leagueInfo.relegateSlots > 0

          return (
            <StandingRow
              key={s.clubId}
              standing={s}
              pos={i + 1}
              club={club}
              isPlayer={isPlayer}
              isPromotion={isPromotion}
              isRelegation={isRelegation}
            />
          )
        })}
      </div>

      {/* Legend */}
      {leagueInfo && !isFL && (
        <div className="mt-5 flex gap-5 font-data text-xs">
          {leagueInfo.promoteSlots > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-volt" />
              <span className="text-ink-faint">Ascenso</span>
            </div>
          )}
          {leagueInfo.relegateSlots > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-magenta" />
              <span className="text-ink-faint">Descenso</span>
            </div>
          )}
        </div>
      )}

      {/* Matchday info */}
      {lgForInfo && (
        <p className="font-data text-ink-faint text-xs text-center mt-5">
          Jornada {lgForInfo.currentMatchday} de {lgForInfo.totalMatchdays}
          {lgForInfo.completed && ' · Temporada finalizada'}
        </p>
      )}
    </div>
  )
}
