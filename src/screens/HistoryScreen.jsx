import { useState } from 'react'
import useGame from '../store/useGame.js'
import { getRepLabel, REP_TIERS, LEAGUES } from '../data/gameData.js'
import { getHallOfFame } from '../data/history.js'
import { COUNTRIES, getCountryLeagues } from '../data/worldData.js'

// Nombres de copas para trofeos/leyendas — incluye 'copa-internacional' por
// compatibilidad con partidas guardadas antes del rediseño por continentes.
const CUP_NAMES = {
  'copa-europa': 'Copa Europea',
  'copa-sudamerica': 'Copa Sudamericana',
  'copa-norteamerica': 'Copa Norteamericana',
  'mundial-de-clubes': 'Mundial de Clubes',
  'copa-internacional': 'Copa Internacional',
}

// ── Mi Carrera ────────────────────────────────────────────────────────────────
function RepLadder({ reputation }) {
  return (
    <div className="card-broadcast border border-line p-4">
      <p className="section-label mb-3">
        Camino de reconocimiento
      </p>
      <div className="space-y-2">
        {[...REP_TIERS].reverse().map(tier => {
          const reached = reputation >= tier.min
          return (
            <div
              key={tier.label}
              className="flex items-center gap-3 rounded-lg px-3 py-2"
              style={{
                background: reached ? tier.color + '15' : 'transparent',
                border: `1px solid ${reached ? tier.color + '40' : 'transparent'}`,
                opacity: reached ? 1 : 0.45,
              }}
            >
              <span className="text-base">{tier.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: reached ? tier.color : 'var(--color-ink-faint)' }}>
                  {tier.label}
                </p>
                <p className="font-data text-ink-faint text-[10px]">Rep {tier.min}+</p>
              </div>
              {reached && <span className="text-xs" style={{ color: tier.color }}>✓</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CareerTab({ coach, season, awards }) {
  const repInfo = getRepLabel(coach.reputation)
  const total = coach.totalMatches
  const wr = total > 0 ? Math.round((coach.totalWins / total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="card-broadcast border border-line p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-carbon-high flex items-center justify-center text-3xl">
            🧠
          </div>
          <div>
            <p className="font-title text-ink text-lg leading-none">{coach.name}</p>
            <p className="text-xs font-semibold mt-1.5" style={{ color: repInfo.color }}>
              {repInfo.icon} {repInfo.label}
            </p>
            <p className="font-data text-ink-faint text-xs mt-0.5">Temporada {season}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-carbon-high rounded-lg p-3 text-center">
            <p className="font-data text-volt font-extrabold text-xl">{coach.reputation}</p>
            <p className="font-data text-ink-faint text-xs">Reputación</p>
          </div>
          <div className="bg-carbon-high rounded-lg p-3 text-center">
            <p className="font-data text-ink font-extrabold text-xl">{coach.seasonsManaged}</p>
            <p className="font-data text-ink-faint text-xs">Temporadas</p>
          </div>
          <div className="bg-carbon-high rounded-lg p-3 text-center">
            <p className="font-data text-volt font-extrabold text-xl">{wr}%</p>
            <p className="font-data text-ink-faint text-xs">% victorias</p>
          </div>
          <div className="bg-carbon-high rounded-lg p-3 text-center">
            <p className="font-data text-volt font-extrabold text-xl">{coach.trophies.length}</p>
            <p className="font-data text-ink-faint text-xs">Títulos</p>
          </div>
        </div>
      </div>

      <div className="card-broadcast border border-line p-4">
        <p className="section-label mb-3">Récord</p>
        <div className="flex gap-2">
          {[
            { label: 'V', value: coach.totalWins,  color: 'var(--color-volt)' },
            { label: 'E', value: coach.totalDraws, color: 'var(--color-warn)' },
            { label: 'D', value: coach.totalLosses, color: 'var(--color-magenta)' },
          ].map(r => (
            <div key={r.label} className="flex-1 text-center bg-carbon-high rounded-lg py-3">
              <p className="font-data font-extrabold text-lg" style={{ color: r.color }}>{r.value}</p>
              <p className="font-data text-ink-faint text-xs">{r.label}</p>
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="mt-3 flex h-2 rounded-full overflow-hidden gap-0.5">
            <div style={{ width: `${wr}%`, background: 'var(--color-volt)' }} />
            <div style={{ width: `${total > 0 ? Math.round(coach.totalDraws / total * 100) : 0}%`, background: 'var(--color-warn)' }} />
            <div style={{ flex: 1, background: 'var(--color-magenta)' }} />
          </div>
        )}
      </div>

      <RepLadder reputation={coach.reputation} />

      {awards.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Premios 🏅</p>
          <div className="space-y-2">
            {[...awards].reverse().map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-volt-dim border border-volt rounded-lg px-3 py-2">
                <span className="text-lg">{a.type === 'dt-anio' ? '🏅' : '📅'}</span>
                <div>
                  <p className="text-volt font-semibold text-sm">
                    {a.type === 'dt-anio' ? 'DT del Año' : 'DT del Mes'}
                  </p>
                  <p className="font-data text-ink-faint text-xs">{a.reason} · {a.clubName} · T{a.season}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {coach.trophies.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Títulos 🏆</p>
          <div className="space-y-2">
            {coach.trophies.map((t, i) => {
              const league = LEAGUES.find(l => l.id === t.leagueId)
              const name = CUP_NAMES[t.leagueId] || league?.name || t.leagueId
              const isWorldCupTrophy = t.leagueId === 'mundial-de-clubes'
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    isWorldCupTrophy ? 'bg-volt-dim border-2 border-volt' : 'bg-volt-dim border border-volt'
                  }`}
                >
                  <span className="text-lg">{isWorldCupTrophy ? '🌍' : '🏆'}</span>
                  <div>
                    <p className="text-volt font-semibold text-sm">{name}</p>
                    <p className="font-data text-ink-faint text-xs">{t.clubName} · T{t.season}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {coach.jobHistory.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Historial laboral</p>
          <div className="space-y-2">
            {[...coach.jobHistory].reverse().map((j, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-line last:border-0">
                <span className="text-lg">{j.fired ? '🔴' : '🟡'}</span>
                <div className="flex-1">
                  <p className="text-ink text-sm font-medium">{j.clubName}</p>
                  <p className="font-data text-ink-faint text-xs">T{j.season}</p>
                </div>
                <span className={`font-data text-xs font-medium ${j.fired ? 'text-magenta' : 'text-volt'}`}>
                  {j.fired ? 'Despedido' : 'Renunció'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {coach.jobHistory.length === 0 && coach.trophies.length === 0 && (
        <div className="card-broadcast border border-line p-6 text-center">
          <p className="text-4xl mb-2">📋</p>
          <p className="font-data text-ink-faint text-sm">Tu carrera está recién empezando...</p>
        </div>
      )}
    </div>
  )
}

// ── Mundo ─────────────────────────────────────────────────────────────────────
const TITLE_ICON = { 'international-cup': '🌐', 'continental-cup': '🌎', 'world-cup': '🌍' }

function TitleRow({ title }) {
  return (
    <div className="flex items-center gap-2.5 bg-carbon-high rounded-lg px-3 py-2">
      <span className="text-base shrink-0">{TITLE_ICON[title.competitionType] || '🏆'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-ink text-sm font-medium truncate">{title.winnerName}</p>
        <p className="font-data text-ink-faint text-[10px] truncate">
          {title.competitionName}{title.runnerUpName ? ` · vs ${title.runnerUpName}` : ''}
        </p>
      </div>
    </div>
  )
}

function MundoTab({ worldHistory }) {
  const seasons = [...new Set(worldHistory.titles.map(t => t.season))].sort((a, b) => b - a)
  const [selected, setSelected] = useState(seasons[0] ?? null)
  const season = selected ?? seasons[0] ?? null

  if (!season) {
    return (
      <div className="card-broadcast border border-line p-6 text-center">
        <p className="text-4xl mb-2">🌍</p>
        <p className="font-data text-ink-faint text-sm">Todavía no se definió ningún campeón — jugá una temporada completa</p>
      </div>
    )
  }

  const titlesThisSeason = worldHistory.titles.filter(t => t.season === season)
  const movementsThisSeason = worldHistory.movements.filter(m => m.season === season)

  const legacyCup = titlesThisSeason.find(t => t.competitionType === 'international-cup')
  const worldCupTitle = titlesThisSeason.find(t => t.competitionType === 'world-cup')
  const continentalCupTitles = titlesThisSeason.filter(t => t.competitionType === 'continental-cup')
  const argTitles = titlesThisSeason.filter(t => t.countryId === 'argentina').sort((a, b) => a.tier - b.tier)
  const worldTitles = titlesThisSeason.filter(t => t.competitionType === 'league' && t.countryId !== 'argentina')
  const byCountry = {}
  worldTitles.forEach(t => {
    if (!byCountry[t.countryId]) byCountry[t.countryId] = []
    byCountry[t.countryId].push(t)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {seasons.map(s => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className={`shrink-0 px-3 py-1.5 rounded-lg font-data text-xs font-semibold ${
              s === season ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint border border-line'
            }`}
          >
            T{s}
          </button>
        ))}
      </div>

      {worldCupTitle && (
        <div className="card-broadcast border-2 border-volt p-4">
          <p className="font-data text-volt text-xs font-bold uppercase tracking-wider mb-2">🌍 Mundial de Clubes</p>
          <p className="font-title text-ink text-lg leading-none">{worldCupTitle.winnerName}</p>
          {worldCupTitle.runnerUpName && <p className="font-data text-ink-faint text-xs mt-1.5">venció a {worldCupTitle.runnerUpName}</p>}
        </div>
      )}

      {continentalCupTitles.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Copas continentales</p>
          <div className="space-y-2">
            {continentalCupTitles.map(t => <TitleRow key={t.id} title={t} />)}
          </div>
        </div>
      )}

      {legacyCup && (
        <div className="card-broadcast border border-volt p-4">
          <p className="font-data text-volt text-xs font-bold uppercase tracking-wider mb-2">🌐 Copa Internacional</p>
          <p className="text-ink font-bold">{legacyCup.winnerName}</p>
          {legacyCup.runnerUpName && <p className="font-data text-ink-faint text-xs mt-1.5">venció a {legacyCup.runnerUpName} en la final</p>}
        </div>
      )}

      {argTitles.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Argentina</p>
          <div className="space-y-2">
            {argTitles.map(t => <TitleRow key={t.id} title={t} />)}
          </div>
        </div>
      )}

      {Object.keys(byCountry).length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Mundo</p>
          <div className="space-y-2">
            {Object.values(byCountry).flat()
              .sort((a, b) => a.tier - b.tier)
              .map(t => <TitleRow key={t.id} title={t} />)}
          </div>
        </div>
      )}

      {movementsThisSeason.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Ascensos y descensos</p>
          <div className="space-y-1.5">
            {movementsThisSeason.map(m => (
              <div key={m.id} className="flex items-center gap-2 font-data text-xs">
                <span className={m.direction === 'up' ? 'text-volt' : 'text-magenta'}>
                  {m.direction === 'up' ? '▲' : '▼'}
                </span>
                <span className="text-ink flex-1 truncate">{m.clubName}</span>
                <span className="text-ink-faint">{m.fromLeagueName} → {m.toLeagueName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Récords: goleadores/asistencias ─────────────────────────────────────────
// Orden preferido: ligas argentinas por tier, después Copa, después el resto
// (ligas extranjeras donde el jugador dirigió — datos parciales, solo su plantel).
const COMPETITION_ORDER = [
  'liga-premier', 'liga-nacional', 'liga-regional',
  'copa-europa', 'copa-sudamerica', 'copa-norteamerica', 'mundial-de-clubes',
  'copa-internacional', // legacy, partidas guardadas antes del rediseño por continentes
]

function ScorerRow({ entry, rank, isMyClub }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-data text-ink-faint text-xs w-4 shrink-0">{rank}°</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isMyClub ? 'text-volt' : 'text-ink'}`}>
          {entry.playerName}
        </p>
        <p className="font-data text-ink-faint text-[10px] truncate mt-0.5">{entry.clubName}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="font-data text-volt text-lg font-extrabold">{entry.goals}</span>
        <span className="font-data text-ink-faint text-[10px]"> G</span>
        {entry.assists > 0 && (
          <span className="font-data text-ink-faint text-[10px] ml-1.5">{entry.assists} A</span>
        )}
      </div>
    </div>
  )
}

function ScorersCompetitionCard({ competitionName, entries, myClubId }) {
  const top = [...entries]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 8)
  return (
    <div className="card-broadcast border border-line p-4">
      <p className="section-label mb-3">{competitionName}</p>
      <div className="space-y-2">
        {top.map((e, i) => (
          <ScorerRow key={e.playerId} entry={e} rank={i + 1} isMyClub={e.clubId === myClubId} />
        ))}
      </div>
    </div>
  )
}

function scopeChipClass(active) {
  return `shrink-0 px-2.5 py-1.5 rounded-lg font-data text-xs font-semibold whitespace-nowrap ${
    active ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint border border-line'
  }`
}

// Selector país/liga — 'Todas' (default) preserva el comportamiento de
// siempre (todas las competencias con datos ese season). Elegir una liga
// puntual filtra a esa sola competencia, con estado vacío si todavía no
// tiene goleadores (la mayoría de las ligas del mundo, hasta que el jugador
// explore el mercado/amistosos o elija esa liga acá — ver ensureWorldLeagueSquads).
function ScorersLeagueSelector({ countryId, setCountryId, leagueId, setLeagueId, ensureWorldLeagueSquads }) {
  const countryLeagues = countryId ? getCountryLeagues(countryId) : []
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => { setCountryId(null); setLeagueId(null) }}
          className={scopeChipClass(countryId === null)}
        >
          Todas
        </button>
        {COUNTRIES.map(c => (
          <button
            key={c.id}
            onClick={() => { setCountryId(c.id); setLeagueId(null) }}
            className={scopeChipClass(countryId === c.id)}
          >
            {c.flag} {c.name}
          </button>
        ))}
      </div>
      {countryId && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {countryLeagues.map(lg => (
            <button
              key={lg.id}
              onClick={() => {
                setLeagueId(lg.id)
                if (countryId !== 'argentina') ensureWorldLeagueSquads?.(lg.id)
              }}
              className={scopeChipClass(leagueId === lg.id)}
            >
              {lg.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ScorersSection({ scorers, myClubId, ensureWorldLeagueSquads }) {
  const seasons = [...new Set(scorers.map(s => s.season))].sort((a, b) => b - a)
  const [selected, setSelected] = useState(seasons[0] ?? null)
  const season = selected ?? seasons[0] ?? null

  const [countryId, setCountryId] = useState(null)
  const [leagueId, setLeagueId] = useState(null)

  if (!season) {
    return (
      <div className="card-broadcast border border-line p-6 text-center">
        <p className="text-4xl mb-2">⚽</p>
        <p className="font-data text-ink-faint text-sm">Todavía no hay goles registrados — jugá algunas jornadas</p>
      </div>
    )
  }

  const byCompetition = {}
  scorers.filter(s => s.season === season).forEach(s => {
    if (!byCompetition[s.competitionId]) byCompetition[s.competitionId] = { name: s.competitionName, entries: [] }
    byCompetition[s.competitionId].entries.push(s)
  })
  const competitionIds = Object.keys(byCompetition).sort((a, b) => {
    const ia = COMPETITION_ORDER.indexOf(a), ib = COMPETITION_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return (byCompetition[a].name || a).localeCompare(byCompetition[b].name || b)
  })

  const selectedLeagueName = leagueId ? (getCountryLeagues(countryId).find(l => l.id === leagueId)?.name || leagueId) : null
  const leagueEntries = leagueId ? scorers.filter(s => s.season === season && s.competitionId === leagueId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {seasons.map(s => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className={`shrink-0 px-3 py-1.5 rounded-lg font-data text-xs font-semibold ${
              s === season ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint border border-line'
            }`}
          >
            T{s}
          </button>
        ))}
      </div>

      <ScorersLeagueSelector
        countryId={countryId} setCountryId={setCountryId}
        leagueId={leagueId} setLeagueId={setLeagueId}
        ensureWorldLeagueSquads={ensureWorldLeagueSquads}
      />

      {leagueId ? (
        leagueEntries.length > 0 ? (
          <ScorersCompetitionCard competitionName={selectedLeagueName} entries={leagueEntries} myClubId={myClubId} />
        ) : (
          <div className="card-broadcast border border-line p-6 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="font-data text-ink-dim text-sm">Sin goleadores registrados en {selectedLeagueName} todavía</p>
            <p className="font-data text-ink-faint text-xs mt-1">
              {countryId === 'argentina'
                ? 'Jugá alguna jornada de esta liga para que aparezcan datos'
                : 'Los clubes del exterior recién generaron plantel — esperá unas fechas para que se completen los datos'}
            </p>
          </div>
        )
      ) : (
        competitionIds.map(cid => (
          <ScorersCompetitionCard
            key={cid}
            competitionName={byCompetition[cid].name || cid}
            entries={byCompetition[cid].entries}
            myClubId={myClubId}
          />
        ))
      )}
    </div>
  )
}

// ── Récords ───────────────────────────────────────────────────────────────────
function RecordsTab({ worldHistory, myClubId, ensureWorldLeagueSquads }) {
  const streak = worldHistory.records.longestWinStreak

  const winsByClub = {}
  worldHistory.titles.forEach(t => {
    winsByClub[t.winnerName] = (winsByClub[t.winnerName] || 0) + 1
  })
  const topClubs = Object.entries(winsByClub)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="card-broadcast border border-line p-4">
        <p className="section-label mb-3">Racha ganadora récord</p>
        {streak ? (
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="font-title text-ink text-lg leading-none">{streak.value} victorias seguidas</p>
              <p className="font-data text-ink-faint text-xs mt-1.5">{streak.holderName} · {streak.clubName} · T{streak.season}</p>
            </div>
          </div>
        ) : (
          <p className="font-data text-ink-faint text-sm">Todavía no hay racha registrada</p>
        )}
      </div>

      {topClubs.length > 0 && (
        <div className="card-broadcast border border-line p-4">
          <p className="section-label mb-3">Clubes más campeones</p>
          <div className="space-y-2">
            {topClubs.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-2.5">
                <span className="font-data text-ink-faint text-xs w-4">{i + 1}°</span>
                <span className="text-ink text-sm flex-1 truncate">{name}</span>
                <span className="font-data text-volt text-sm font-bold">{count} 🏆</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="section-label mb-3 px-1">
          Máximos goleadores
        </p>
        <ScorersSection scorers={worldHistory.records.scorers || []} myClubId={myClubId} ensureWorldLeagueSquads={ensureWorldLeagueSquads} />
      </div>
    </div>
  )
}

// ── Salón de la Fama ────────────────────────────────────────────────────────────
function FameTab({ coach }) {
  const ranked = getHallOfFame(coach)
  return (
    <div className="card-broadcast border border-line p-4">
      <p className="section-label mb-3.5">Salón de la Fama</p>
      <div className="space-y-2">
        {ranked.map(e => (
          <div
            key={e.name}
            className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 ${
              e.isPlayer ? 'bg-volt-dim border border-volt' : 'bg-carbon-high'
            }`}
          >
            <span className={`font-data text-sm font-extrabold w-6 shrink-0 ${e.isPlayer ? 'text-volt' : 'text-ink-faint'}`}>
              {e.rank}°
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${e.isPlayer ? 'text-volt' : 'text-ink'}`}>
                {e.name}{e.isPlayer ? ' (vos)' : ''}
              </p>
              <p className="font-data text-ink-faint text-[10px]">{e.titles} títulos · {e.seasonsManaged} temporadas</p>
            </div>
          </div>
        ))}
      </div>
      <p className="font-data text-ink-faint text-[10px] text-center mt-3">
        Ranking estimado — los rivales son referencia, todavía no hay DTs de IA simulados
      </p>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const [tab, setTab] = useState('carrera')
  const coach = useGame(s => s.coach)
  const season = useGame(s => s.season)
  const worldHistory = useGame(s => s.worldHistory)
  const currentJob = useGame(s => s.currentJob)
  const ensureWorldLeagueSquads = useGame(s => s.ensureWorldLeagueSquads)

  if (!coach) return null

  const awards = worldHistory.awards

  return (
    <div className="px-4 py-4 pb-24 space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-line">
        {[
          { id: 'carrera', label: 'Mi Carrera' },
          { id: 'mundo',   label: 'Mundo' },
          { id: 'records', label: 'Récords' },
          { id: 'fama',    label: 'Fama' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 font-data text-xs font-semibold transition-colors ${tab === t.id ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint active:bg-carbon-high'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'carrera' && <CareerTab coach={coach} season={season} awards={awards} />}
      {tab === 'mundo'   && <MundoTab worldHistory={worldHistory} />}
      {tab === 'records' && <RecordsTab worldHistory={worldHistory} myClubId={currentJob?.clubId} ensureWorldLeagueSquads={ensureWorldLeagueSquads} />}
      {tab === 'fama'    && <FameTab coach={coach} />}
    </div>
  )
}
