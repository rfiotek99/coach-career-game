import { useState } from 'react'
import useGame from '../store/useGame.js'
import { WORLD_CLUBS } from '../data/worldData.js'
import ScreenTip from '../components/ScreenTip.jsx'

const CONTINENT_META = {
  europa:       { flag: '🌍', name: 'Europa' },
  sudamerica:   { flag: '🌎', name: 'Sudamérica' },
  norteamerica: { flag: '🌎', name: 'Norteamérica' },
}

function clubName(clubById, id) { return clubById[id]?.name || id }
function clubColor(clubById, id) { return clubById[id]?.color || '#888' }

// Solo mezclamos clubes argentinos que participan de ESTA copa/liguilla — un
// id de CLUB_TEMPLATES puede coincidir por casualidad con uno de WORLD_CLUBS
// (ej. "pumas-fc" existe en ambos lados); sin acotar, un club argentino ajeno
// podría taparle el nombre/color a un club del mundo real.
function buildClubById(clubs, relevantIds) {
  const byId = {}
  WORLD_CLUBS.forEach(c => { byId[c.id] = c })
  clubs.forEach(c => { if (relevantIds.includes(c.id)) byId[c.id] = c })
  return byId
}

function TeamChip({ clubById, id, isPlayer }) {
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: clubColor(clubById, id) }} />
      <span className={`text-sm truncate ${isPlayer ? 'text-volt font-bold' : 'text-ink-dim font-medium'}`}>
        {clubName(clubById, id)}
      </span>
    </span>
  )
}

function GroupTable({ clubById, group, playerClubId }) {
  return (
    <div className="card-broadcast border border-line p-4">
      <div className="flex items-center gap-2 mb-3.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-volt-dim text-volt font-data text-xs font-extrabold shrink-0">
          {group.letter}
        </span>
        <span className="font-data text-ink-faint text-[11px] font-bold uppercase tracking-wider">Grupo {group.letter}</span>
      </div>
      <div className="space-y-1">
        {group.table.map((row, i) => (
          <div key={row.clubId} className={`flex items-center px-2.5 py-2.5 rounded-lg border-l-2 ${
            row.clubId === playerClubId ? 'bg-volt-dim border-volt' :
            i < 2 ? 'bg-carbon-high border-volt-mid' : 'border-transparent'
          }`}>
            <span className="font-data w-5 text-center text-xs font-bold text-ink-faint">{i + 1}</span>
            <div className="flex-1 min-w-0 mx-2">
              <TeamChip clubById={clubById} id={row.clubId} isPlayer={row.clubId === playerClubId} />
            </div>
            <span className="font-data text-ink-faint text-xs w-12 text-center">{row.gf}-{row.ga}</span>
            <span className="font-data text-ink text-sm font-extrabold w-7 text-right">{row.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ROUND_NAMES = { 16: 'Octavos', 8: 'Cuartos', 4: 'Semifinal', 2: 'Final' }

function KnockoutTie({ clubById, tie, playerClubId }) {
  const isPlayerTie = tie.homeId === playerClubId || tie.awayId === playerClubId
  return (
    <div className={`card-broadcast border px-4 py-4 mb-2.5 ${isPlayerTie ? 'border-volt' : 'border-line'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <TeamChip clubById={clubById} id={tie.homeId} isPlayer={tie.homeId === playerClubId} />
        </div>
        <span className="font-data text-2xl font-black text-ink bg-carbon-high rounded-lg px-3 py-1 shrink-0 tracking-tight">
          {tie.homeGoals}-{tie.awayGoals}
        </span>
        <div className="flex-1 min-w-0 flex justify-end">
          <TeamChip clubById={clubById} id={tie.awayId} isPlayer={tie.awayId === playerClubId} />
        </div>
      </div>
    </div>
  )
}

// ── Una copa continental (grupos + eliminación) ──────────────────────────────
function ContinentalCupView({ clubs, cup, playerClubId }) {
  if (!cup) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="font-data text-ink-dim text-sm">Todavía no arrancó esta copa.</p>
      </div>
    )
  }

  const clubById = buildClubById(clubs, cup.argentineTeamIds || [])
  const playerInCup = cup.teamIds.includes(playerClubId)

  return (
    <div className="space-y-6">
      {cup.champion && (
        <div className="card-broadcast border border-volt p-6 text-center">
          <p className="font-data text-volt text-xs font-bold uppercase tracking-widest mb-3">🏆 Campeón</p>
          <div className="flex items-center justify-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-sm" style={{ background: clubColor(clubById, cup.champion) }} />
            <span className="font-title text-ink text-xl leading-none">{clubName(clubById, cup.champion)}</span>
          </div>
        </div>
      )}

      {playerInCup && (
        <div className="rounded-lg bg-volt-dim border border-volt px-4 py-3">
          <p className="font-data text-volt text-xs font-semibold">⭐ Tu club está clasificado a esta copa</p>
        </div>
      )}

      {cup.knockout && cup.knockout.length > 0 && (
        <div>
          <p className="font-title text-ink text-lg leading-none mb-3.5">Fase eliminatoria</p>
          {cup.knockout.map((round, i) => (
            <div key={i} className="mb-5 last:mb-0">
              <p className="section-label mb-2.5">
                {ROUND_NAMES[round.size] || `Ronda de ${round.size}`}
              </p>
              {round.ties.map((tie, j) => (
                <KnockoutTie key={j} clubById={clubById} tie={tie} playerClubId={playerClubId} />
              ))}
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="font-title text-ink text-lg leading-none mb-3.5">Fase de grupos</p>
        <div className="space-y-3">
          {cup.groups.map(g => (
            <GroupTable key={g.letter} clubById={clubById} group={g} playerClubId={playerClubId} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Mundial de Clubes: liguilla entre los campeones continentales ───────────
function WorldCupView({ clubs, worldCup, playerClubId }) {
  if (!worldCup) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="font-data text-ink-dim text-sm">
          El Mundial de Clubes arranca cuando las 3 copas continentales terminen.
        </p>
      </div>
    )
  }

  const clubById = buildClubById(clubs, worldCup.champions.filter(c => c.isArgentine).map(c => c.clubId))

  const standings = Object.values(worldCup.table).sort((a, b) =>
    b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  )
  const playerInWorldCup = worldCup.champions.some(c => c.clubId === playerClubId)

  return (
    <div className="space-y-6">
      {worldCup.champion && (
        <div className="card-broadcast border-2 border-volt p-6 text-center">
          <p className="font-data text-volt text-xs font-bold uppercase tracking-widest mb-3">🌍 Campeón del Mundo</p>
          <div className="flex items-center justify-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-sm" style={{ background: clubColor(clubById, worldCup.champion) }} />
            <span className="font-title text-ink text-2xl leading-none">{clubName(clubById, worldCup.champion)}</span>
          </div>
        </div>
      )}

      {playerInWorldCup && (
        <div className="rounded-lg bg-volt-dim border border-volt px-4 py-3">
          <p className="font-data text-volt text-xs font-semibold">⭐ Tu club está en el Mundial de Clubes</p>
        </div>
      )}

      <div className="card-broadcast border border-line p-4">
        <p className="font-data text-ink-faint text-[11px] font-bold uppercase tracking-wider mb-3.5">Liguilla — campeones continentales</p>
        <div className="space-y-1.5">
          {standings.map((row, i) => {
            const champ = worldCup.champions.find(c => c.clubId === row.clubId)
            return (
              <div key={row.clubId} className={`flex items-center px-3 py-2.5 rounded-lg border-l-2 ${
                row.clubId === playerClubId ? 'bg-volt-dim border-volt' :
                i === 0 ? 'bg-carbon-high border-volt-mid' : 'bg-carbon-high border-transparent'
              }`}>
                <span className="font-data w-5 text-center text-xs font-bold text-ink-faint">{i + 1}</span>
                <div className="flex-1 min-w-0 mx-2">
                  <TeamChip clubById={clubById} id={row.clubId} isPlayer={row.clubId === playerClubId} />
                  <p className="font-data text-ink-faint text-[10px] ml-[18px] mt-0.5">{CONTINENT_META[champ?.continentId]?.name || champ?.continentId}</p>
                </div>
                <span className="font-data text-ink-faint text-xs w-12 text-center">{row.gf}-{row.ga}</span>
                <span className="font-data text-ink text-sm font-extrabold w-7 text-right">{row.pts}</span>
              </div>
            )
          })}
        </div>
      </div>

      {worldCup.results.length > 0 && (
        <div>
          <p className="font-title text-ink text-lg leading-none mb-3.5">Resultados</p>
          {worldCup.results.map((r, i) => (
            <KnockoutTie key={i} clubById={clubById} tie={{ ...r, winner: null }} playerClubId={playerClubId} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
const CONTINENT_ORDER = ['europa', 'sudamerica', 'norteamerica']

export default function CupScreen() {
  const continentalCups = useGame(s => s.continentalCups)
  const worldCup = useGame(s => s.worldCup)
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const playerClubId = currentJob?.clubId

  // Si mi club está en alguna copa/el Mundial, esa es la pestaña inicial
  const myContinent = CONTINENT_ORDER.find(cid => continentalCups[cid]?.teamIds?.includes(playerClubId))
  const initialTab = myContinent || (worldCup?.champions?.some(c => c.clubId === playerClubId) ? 'mundial' : CONTINENT_ORDER[0])
  const [tab, setTab] = useState(initialTab)

  const allContinentalDone = CONTINENT_ORDER.every(cid => continentalCups[cid]?.phase === 'done')

  return (
    <div className="px-4 py-4 pb-24 space-y-6">
      <ScreenTip screenKey="cup">
        Acá seguís la Copa continental y el Mundial de Clubes si tu club clasifica — se juegan en paralelo a la liga.
      </ScreenTip>
      <div className="flex rounded-xl overflow-hidden border border-line">
        {CONTINENT_ORDER.map(cid => (
          <button
            key={cid}
            onClick={() => setTab(cid)}
            className={`flex-1 py-2.5 font-data text-xs font-semibold transition-colors ${tab === cid ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint active:bg-carbon-high'}`}
          >
            {CONTINENT_META[cid].flag} {CONTINENT_META[cid].name}
          </button>
        ))}
        <button
          onClick={() => setTab('mundial')}
          className={`flex-1 py-2.5 font-data text-xs font-semibold relative transition-colors ${tab === 'mundial' ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint active:bg-carbon-high'}`}
        >
          🌍 Mundial
          {allContinentalDone && !worldCup?.champion && (
            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-magenta" />
          )}
        </button>
      </div>

      {tab === 'mundial'
        ? <WorldCupView clubs={clubs} worldCup={worldCup} playerClubId={playerClubId} />
        : <ContinentalCupView clubs={clubs} cup={continentalCups[tab]} playerClubId={playerClubId} />
      }
    </div>
  )
}
