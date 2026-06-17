import useGame from '../store/useGame.js'

const POS_ORDER = { POR: 0, CAR: 1, LD: 2, LI: 3, MCD: 4, MCC: 5, MCO: 6, EXT: 7, DEL: 8 }
const POS_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#3b82f6', LI: '#3b82f6',
  MCD: '#22c55e', MCC: '#22c55e', MCO: '#22c55e', EXT: '#22c55e',
  DEL: '#ef4444',
}

function getTrend(player) {
  const { age, skill, potential } = player
  if (age >= 30) return { arrow: '↓', color: '#f97316' }
  const gap = (potential ?? skill) - skill
  if (age <= 23 || gap > 5) return { arrow: '↑', color: '#4ade80' }
  return { arrow: '→', color: '#6b7280' }
}

function SkillBar({ value }) {
  const color = value >= 75 ? '#34d399' : value >= 55 ? '#f0b429' : value >= 40 ? '#f97316' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-pitch-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}

export default function SquadScreen() {
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const sellPlayer = useGame(s => s.sellPlayer)

  if (!currentJob) return null
  const club = clubs.find(c => c.id === currentJob.clubId)
  if (!club) return null

  const squad = [...club.squad].sort((a, b) =>
    (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9) ||
    b.skill - a.skill
  )

  const avgSkill = Math.round(squad.reduce((s, p) => s + p.skill, 0) / squad.length)

  return (
    <div className="px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-bold">{club.name}</p>
          <p className="text-pitch-600 text-xs">{squad.length} jugadores · Media {avgSkill}</p>
        </div>
        <div className="text-right">
          <p className="text-gold-400 font-bold text-sm">${(club.budget / 1000000).toFixed(1)}M</p>
          <p className="text-pitch-600 text-xs">presupuesto</p>
        </div>
      </div>

      <div className="space-y-2">
        {squad.map(player => {
          const trend = getTrend(player)
          return (
          <div key={player.id} className={`rounded-xl border px-3 py-2.5 ${
            (player.injuredFor || 0) > 0 ? 'bg-red-950/30 border-red-800/40' :
            (player.suspendedFor || 0) > 0 ? 'bg-orange-950/30 border-orange-800/40' :
            'bg-pitch-800 border-pitch-700'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{
                  background: (POS_COLORS[player.position] || '#888') + '22',
                  color: POS_COLORS[player.position] || '#888',
                }}
              >
                {player.position}
              </span>
              <span className="text-white text-sm font-medium flex-1 truncate">{player.name}</span>
              {(player.injuredFor || 0) > 0 && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">
                  🤕 {player.injuredFor}J
                </span>
              )}
              {(player.suspendedFor || 0) > 0 && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-400/20 text-orange-400 shrink-0">
                  SUSP
                </span>
              )}
              {(player.yellowCards || 0) >= 3 && (player.injuredFor || 0) === 0 && (player.suspendedFor || 0) === 0 && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400 shrink-0">
                  🟨 {player.yellowCards}/5
                </span>
              )}
              <span className="text-xs shrink-0 flex items-center gap-0.5">
                <span className="text-pitch-600">{player.age}a</span>
                <span style={{ color: trend.color }}>{trend.arrow}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SkillBar value={player.skill} />
              </div>
              <span className="text-pitch-600 text-[11px] shrink-0">
                ${(player.value / 1000).toFixed(0)}k
              </span>
              <button
                onClick={() => sellPlayer(player.id)}
                disabled={squad.length <= 14}
                className="text-pitch-700 text-[11px] active:text-red-400 disabled:opacity-30 shrink-0"
              >
                Vender
              </button>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
