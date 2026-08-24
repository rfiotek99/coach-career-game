import { useState, useMemo, useEffect } from 'react'
import useGame from '../store/useGame.js'
import { COUNTRIES, WORLD_LEAGUES, WORLD_CLUBS } from '../data/worldData.js'
import { LEAGUES } from '../data/gameData.js'

const CLUBS_BY_ID = Object.fromEntries(WORLD_CLUBS.map(c => [c.id, c]))

function StandingsTable({ standings, clubsById, promoteSlots, relegateSlots, currentJobClubId }) {
  if (!standings.length) return <p className="font-data text-ink-faint text-sm py-4 text-center">Sin datos</p>

  return (
    <div className="space-y-1.5">
      {standings.map((row, i) => {
        const club = clubsById[row.clubId]
        const isPlayer = row.clubId === currentJobClubId
        const isPromote = promoteSlots > 0 && i < promoteSlots
        const isRelegate = relegateSlots > 0 && i >= standings.length - relegateSlots
        return (
          <div
            key={row.clubId}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs border-l-2 ${
              isPlayer ? 'bg-volt-dim border-volt' :
              isPromote ? 'bg-carbon-high border-volt-mid' :
              isRelegate ? 'bg-carbon-high border-magenta-mid' : 'bg-carbon-raised border-transparent'
            }`}
          >
            <span className={`font-data w-5 text-center font-bold shrink-0 ${
              isPromote ? 'text-volt' : isRelegate ? 'text-magenta' : 'text-ink-faint'
            }`}>{i + 1}</span>
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: club?.color || '#555' }}
            />
            <span className={`flex-1 truncate text-sm ${isPlayer ? 'text-volt font-bold' : 'text-ink font-medium'}`}>
              {club?.name || row.clubId}
            </span>
            <span className="font-data text-ink-faint w-5 text-center">{row.played}</span>
            <span className="font-data text-ink text-sm font-extrabold w-7 text-center">{row.points}</span>
            <span className="font-data text-ink-faint w-10 text-right">{row.gf}–{row.ga}</span>
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
    <div className="px-4 py-4 pb-24 space-y-5">
      {/* Country selector */}
      <div>
        <p className="section-label mb-2.5">País</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {COUNTRIES.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCountry(c.id)
                const leagues = c.id === 'argentina' ? LEAGUES : WORLD_LEAGUES.filter(l => l.countryId === c.id)
                setSelectedLeague(leagues[0]?.id || '')
              }}
              className={`shrink-0 rounded-xl px-3.5 py-2.5 font-data text-xs font-semibold border transition-all ${
                selectedCountry === c.id
                  ? 'bg-volt-dim border-volt text-volt'
                  : 'bg-carbon-raised border-line text-ink-dim active:border-ink-faint'
              }`}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* League selector */}
      <div className="flex gap-2 border-b border-line -mx-4 px-4">
        {countryLeagues.map(l => (
          <button
            key={l.id}
            onClick={() => setSelectedLeague(l.id)}
            className={`pb-2 font-data text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
              effectiveLeague === l.id
                ? 'border-volt text-volt'
                : 'border-transparent text-ink-faint active:text-ink-dim'
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
            <span className="font-data text-ink-faint text-xs">Jornada {wlg.currentMatchday}/{wlg.totalMatchdays}</span>
            {wlg.champion && (
              <span className="font-data text-volt text-xs font-semibold">
                🏆 {CLUBS_BY_ID[wlg.champion]?.name || wlg.champion}
              </span>
            )}
          </div>
          <div className="h-1 rounded-full bg-carbon-high overflow-hidden">
            <div
              className="h-full rounded-full bg-volt transition-all duration-500"
              style={{ width: `${(wlg.currentMatchday / wlg.totalMatchdays) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Standings header */}
      <div className="flex items-center gap-2.5 px-3 font-data text-[10px] text-ink-faint font-bold uppercase tracking-wider">
        <span className="w-5">#</span>
        <span className="w-2.5" />
        <span className="flex-1">Club</span>
        <span className="w-5 text-center">PJ</span>
        <span className="w-7 text-center">Pts</span>
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
        <p className="font-data text-ink-faint text-sm text-center py-6">
          La temporada aún no comenzó
        </p>
      )}
    </div>
  )
}
