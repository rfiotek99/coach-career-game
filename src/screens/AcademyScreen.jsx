import useGame from '../store/useGame.js'

const POS_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#3b82f6', LI: '#3b82f6',
  MCD: '#22c55e', MCC: '#22c55e', MCO: '#22c55e', EXT: '#22c55e',
  DEL: '#ef4444',
}

// El potencial real queda oculto mientras el juvenil está en la cantera —
// solo se ve esta valoración de ojeador (ruidosa, fija al generarse). El
// número real recién se ve cuando se promueve al primer equipo.
const SCOUT_TIER = {
  'Del montón':          { rank: 0, color: '#6b7280' },
  'Con futuro':          { rank: 1, color: '#60a5fa' },
  'Promesa interesante': { rank: 2, color: '#a78bfa' },
  'Puede ser especial':  { rank: 3, color: '#c8ff32' },
}

function SkillBar({ value }) {
  const color = value >= 75 ? '#34d399' : value >= 55 ? '#f0b429' : value >= 40 ? '#f97316' : '#ef4444'
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 rounded-full bg-carbon-high overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-data text-base font-extrabold w-6 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

export default function AcademyScreen() {
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const promoteYouthPlayer = useGame(s => s.promoteYouthPlayer)

  if (!currentJob) return null
  const club = clubs.find(c => c.id === currentJob.clubId)
  if (!club) return null

  const youthSquad = [...(club.youthSquad || [])].sort((a, b) =>
    (SCOUT_TIER[b.scoutLabel]?.rank ?? 0) - (SCOUT_TIER[a.scoutLabel]?.rank ?? 0) || b.skill - a.skill
  )

  return (
    <div className="px-4 py-4 pb-24">
      <div className="mb-4">
        <p className="font-title text-ink text-lg leading-none">Cantera de {club.name}</p>
        <p className="font-data text-ink-faint text-xs mt-1">
          {youthSquad.length === 0 ? 'Sin juveniles todavía' : `${youthSquad.length} juvenil${youthSquad.length > 1 ? 'es' : ''} en desarrollo`}
        </p>
      </div>

      {youthSquad.length === 0 ? (
        <div className="card-broadcast border border-line px-4 py-8 text-center">
          <p className="text-3xl mb-2">🌱</p>
          <p className="font-data text-ink-dim text-sm">
            Todavía no hay juveniles en la cantera.
          </p>
          <p className="font-data text-ink-faint text-xs mt-1">
            Aparecen jugadores nuevos al terminar cada temporada — de vez en cuando, alguno especial.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {youthSquad.map(player => {
            const tier = SCOUT_TIER[player.scoutLabel] || SCOUT_TIER['Del montón']
            return (
              <div key={player.id} className="rounded-lg border px-3.5 py-3 bg-carbon-raised border-line">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      background: (POS_COLORS[player.position] || '#888') + '22',
                      color: POS_COLORS[player.position] || '#888',
                    }}
                  >
                    {player.position}
                  </span>
                  <span className="text-ink text-sm font-semibold flex-1 truncate">{player.name}</span>
                  <span className="font-data text-ink-faint text-xs shrink-0">{player.age} años</span>
                </div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="flex-1">
                    <SkillBar value={player.skill} />
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: tier.color + '22', color: tier.color }}
                  >
                    {player.scoutLabel}
                  </span>
                </div>
                <button
                  onClick={() => promoteYouthPlayer(player.id)}
                  className="w-full py-2 rounded-lg bg-volt-dim border border-volt text-volt font-data text-xs font-semibold active:opacity-80"
                >
                  ⬆ Subir al primer equipo
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
