import { useState, useMemo, useEffect } from 'react'
import useGame from '../store/useGame.js'
import { COUNTRIES, WORLD_LEAGUES, WORLD_CLUBS } from '../data/worldData.js'
import { LEAGUES } from '../data/gameData.js'

const CLUBS_BY_ID = Object.fromEntries(WORLD_CLUBS.map(c => [c.id, c]))

function StandingsTable({ standings, clubsById, promoteSlots, relegateSlots, currentJobClubId }) {
  if (!standings.length) return <p className="text-pitch-600 text-sm py-4 text-center">Sin datos</p>

  return (
    <div className="space-y-0.5">
      {standings.map((row, i) => {
        const club = clubsById[row.clubId]
        const isPlayer = row.clubId === currentJobClubId
        const isPromote = promoteSlots > 0 && i < promoteSlots
        const isRelegate = relegateSlots > 0 && i >= standings.length - relegateSlots
        return (
          <div
            key={row.clubId}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
              isPlayer ? 'bg-gold-400/10 border border-gold-400/30' : 'bg-pitch-800/60'
            }`}
          >
            <span className={`w-5 text-center font-bold shrink-0 ${
              isPromote ? 'text-emerald-400' : isRelegate ? 'text-red-400' : 'text-pitch-500'
            }`}>{i + 1}</span>
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: club?.color || '#555' }}
            />
            <span className={`flex-1 truncate font-medium ${isPlayer ? 'text-gold-400' : 'text-white'}`}>
              {club?.name || row.clubId}
            </span>
            <span className="text-pitch-500 w-5 text-center">{row.played}</span>
            <span className="text-white font-bold w-6 text-center">{row.points}</span>
            <span className="text-pitch-600 w-10 text-right">{row.gf}–{row.ga}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function WorldScreen() {
  const [selectedCountry, setSelectedCountry] = useState('argentina')
  const [selectedLeague, setSelectedLeague] = useState('liga-premier')

  const getWorldStandings = useGame(s => s.getWorldStandings)
  const getLeagueStandings = useGame(s => s.getLeagueStandings)
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const worldLeagues = useGame(s => s.worldLeagues)

  const worldInitialized = useGame(s => s.worldInitialized)
  const initWorld = useGame(s => s.initWorld)
  useEffect(() => { if (!worldInitialized) initWorld() }, [worldInitialized, initWorld])

  const countryLeagues = useMemo(() => {
    if (selectedCountry === 'argentina') return LEAGUES
    return WORLD_LEAGUES.filter(l => l.countryId === selectedCountry)
  }, [selectedCountry])

  // Keep selected league in sync when country changes
  const effectiveLeague = countryLeagues.find(l => l.id === selectedLeague)
    ? selectedLeague
    : countryLeagues[0]?.id

  const isArgentina = selectedCountry === 'argentina'

  const standings = useMemo(() => {
    if (!effectiveLeague) return []
    if (isArgentina) {
      return getLeagueStandings(effectiveLeague)
    }
    return getWorldStandings(effectiveLeague)
  }, [effectiveLeague, isArgentina, getLeagueStandings, getWorldStandings, worldLeagues])

  const leagueMeta = useMemo(() => {
    if (!effectiveLeague) return null
    if (isArgentina) return LEAGUES.find(l => l.id === effectiveLeague)
    return WORLD_LEAGUES.find(l => l.id === effectiveLeague)
  }, [effectiveLeague, isArgentina])

  const clubsById = useMemo(() => {
    if (isArgentina) return Object.fromEntries(clubs.map(c => [c.id, c]))
    return CLUBS_BY_ID
  }, [isArgentina, clubs])

  const currentJobClubId = currentJob?.clubId

  const wlg = effectiveLeague ? worldLeagues[effectiveLeague] : null

  return (
    <div className="px-4 py-4 pb-24 space-y-4">
      {/* Country selector */}
      <div>
        <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-2">País</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {COUNTRIES.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCountry(c.id)
                const leagues = c.id === 'argentina' ? LEAGUES : WORLD_LEAGUES.filter(l => l.countryId === c.id)
                setSelectedLeague(leagues[0]?.id || '')
              }}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
                selectedCountry === c.id
                  ? 'bg-gold-400/20 border-gold-400/50 text-gold-400'
                  : 'bg-pitch-800 border-pitch-700 text-pitch-400 active:border-pitch-600'
              }`}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* League selector */}
      <div className="flex gap-2 border-b border-pitch-800 -mx-4 px-4">
        {countryLeagues.map(l => (
          <button
            key={l.id}
            onClick={() => setSelectedLeague(l.id)}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
              effectiveLeague === l.id
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-pitch-500 active:text-pitch-400'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {leagueMeta && !isArgentina && wlg && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-pitch-500 text-xs">Jornada {wlg.currentMatchday}/{wlg.totalMatchdays}</span>
            {wlg.champion && (
              <span className="text-gold-400 text-xs font-semibold">
                🏆 {CLUBS_BY_ID[wlg.champion]?.name || wlg.champion}
              </span>
            )}
          </div>
          <div className="h-1 rounded-full bg-pitch-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gold-400/60 transition-all duration-500"
              style={{ width: `${(wlg.currentMatchday / wlg.totalMatchdays) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Standings header */}
      <div className="flex items-center gap-2 px-2 text-[10px] text-pitch-600 font-semibold uppercase tracking-wide">
        <span className="w-5">#</span>
        <span className="w-2.5" />
        <span className="flex-1">Club</span>
        <span className="w-5 text-center">PJ</span>
        <span className="w-6 text-center">Pts</span>
        <span className="w-10 text-right">GF–GC</span>
      </div>

      <StandingsTable
        standings={standings}
        clubsById={clubsById}
        promoteSlots={leagueMeta?.promoteSlots || 0}
        relegateSlots={leagueMeta?.relegateSlots || 0}
        currentJobClubId={currentJobClubId}
      />

      {standings.length === 0 && (
        <p className="text-pitch-600 text-sm text-center py-6">
          La temporada aún no comenzó
        </p>
      )}
    </div>
  )
}
