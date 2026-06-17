import { useState } from 'react'
import useGame from '../store/useGame.js'
import { LEAGUES } from '../data/gameData.js'
import { WORLD_CLUBS, WORLD_LEAGUES } from '../data/worldData.js'
import { calcStandings } from '../engine/sim.js'

function StandingRow({ standing, pos, club, isPlayer, isPromotion, isRelegation }) {
  const gd = standing.gf - standing.ga
  return (
    <div className={`flex items-center px-2 py-2 rounded-lg ${
      isPlayer ? 'bg-gold-400/15 border border-gold-400/30' :
      isPromotion ? 'bg-emerald-500/10' :
      isRelegation ? 'bg-red-500/10' : ''
    }`}>
      <span className={`w-6 text-center text-xs font-bold ${
        isPlayer ? 'text-gold-400' : 'text-pitch-600'
      }`}>{pos}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 mx-1">
        {club && <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: club.color }} />}
        <span className={`text-xs truncate ${isPlayer ? 'text-white font-bold' : 'text-pitch-400'}`}>
          {club?.name || standing.clubId}
        </span>
      </div>
      <span className="text-pitch-600 text-xs w-6 text-center">{standing.played}</span>
      <span className="text-pitch-600 text-xs w-6 text-center">{standing.won}</span>
      <span className="text-pitch-600 text-xs w-6 text-center">{standing.drawn}</span>
      <span className="text-pitch-600 text-xs w-6 text-center">{standing.lost}</span>
      <span className={`text-xs w-6 text-center ${gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-red-400' : 'text-pitch-600'}`}>
        {gd > 0 ? '+' : ''}{gd}
      </span>
      <span className={`text-xs font-bold w-7 text-right ${isPlayer ? 'text-gold-400' : 'text-white'}`}>
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
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {displayTabs.map(l => (
          <button
            key={l.id}
            onClick={() => setSelectedLeague(l.id)}
            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              selectedLeague === l.id
                ? 'bg-gold-400 text-pitch-950'
                : 'bg-pitch-800 text-pitch-500 active:bg-pitch-700'
            }`}
          >
            {l.name.replace('Liga ', 'L.')}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center px-2 mb-1">
        <span className="w-6" />
        <span className="flex-1 text-pitch-700 text-[10px] uppercase mx-1">Club</span>
        <span className="text-pitch-700 text-[10px] w-6 text-center">PJ</span>
        <span className="text-pitch-700 text-[10px] w-6 text-center">G</span>
        <span className="text-pitch-700 text-[10px] w-6 text-center">E</span>
        <span className="text-pitch-700 text-[10px] w-6 text-center">P</span>
        <span className="text-pitch-700 text-[10px] w-6 text-center">DG</span>
        <span className="text-pitch-700 text-[10px] w-7 text-right">Pts</span>
      </div>

      {/* Standings */}
      <div className="space-y-0.5">
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
        <div className="mt-4 flex gap-4 text-xs">
          {leagueInfo.promoteSlots > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-emerald-500/40" />
              <span className="text-pitch-600">Ascenso</span>
            </div>
          )}
          {leagueInfo.relegateSlots > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-red-500/40" />
              <span className="text-pitch-600">Descenso</span>
            </div>
          )}
        </div>
      )}

      {/* Matchday info */}
      {lgForInfo && (
        <p className="text-pitch-700 text-xs text-center mt-4">
          Jornada {lgForInfo.currentMatchday} de {lgForInfo.totalMatchdays}
          {lgForInfo.completed && ' · Temporada finalizada'}
        </p>
      )}
    </div>
  )
}
