import { useState } from 'react'
import useGame from '../store/useGame.js'
import { CHARLA_TYPES } from '../data/lifeEvents.js'
import { POSITION_ORDER as POS_ORDER, POSITION_COLORS as POS_COLORS } from '../data/gameData.js'

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
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 rounded-full bg-carbon-high overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-data text-base font-extrabold w-6 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

function MoraleBar({ value }) {
  const color = value >= 70 ? '#60a5fa' : value >= 40 ? '#a78bfa' : '#f87171'
  return (
    <div className="flex items-center gap-1.5" title="Ánimo individual">
      <span className="text-[10px]">🙂</span>
      <div className="h-1.5 w-10 rounded-full bg-carbon-high overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

const CHARLA_ORDER = ['motivar', 'felicitar', 'calmar']

export default function SquadScreen() {
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const sellPlayer = useGame(s => s.sellPlayer)
  const startCharla = useGame(s => s.startCharla)
  const lifeEvents = useGame(s => s.lifeEvents)
  const openContractRenewal = useGame(s => s.openContractRenewal)
  const [talkingTo, setTalkingTo] = useState(null)

  if (!currentJob) return null
  const club = clubs.find(c => c.id === currentJob.clubId)
  if (!club) return null

  function handleCharla(playerId, type) {
    startCharla(playerId, type)
    setTalkingTo(null)
  }

  const squad = [...club.squad].sort((a, b) =>
    (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9) ||
    b.skill - a.skill
  )

  const avgSkill = Math.round(squad.reduce((s, p) => s + p.skill, 0) / squad.length)
  const expiringCount = squad.filter(p => (p.contract?.yearsLeft ?? 99) <= 1).length

  return (
    <div className="px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-title text-ink text-lg leading-none">{club.name}</p>
          <p className="font-data text-ink-faint text-xs mt-1">{squad.length} jugadores · Media {avgSkill}</p>
        </div>
        <div className="text-right">
          <p className="font-data text-volt font-extrabold text-sm">${(club.budget / 1000000).toFixed(1)}M</p>
          <p className="font-data text-ink-faint text-xs">presupuesto</p>
        </div>
      </div>

      {expiringCount > 0 && (
        <div className="card-broadcast border border-warn px-4 py-2.5 mb-4">
          <p className="font-data text-warn text-xs font-semibold">
            📝 {expiringCount} contrato{expiringCount > 1 ? 's' : ''} vence{expiringCount > 1 ? 'n' : ''} este año — renovalo{expiringCount > 1 ? 's' : ''} o se van libres
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {squad.map(player => {
          const trend = getTrend(player)
          return (
          <div key={player.id} className={`rounded-lg border px-3.5 py-3 ${
            (player.injuredFor || 0) > 0 ? 'bg-red-950/30 border-red-800/40' :
            (player.suspendedFor || 0) > 0 ? 'bg-orange-950/30 border-orange-800/40' :
            'bg-carbon-raised border-line'
          }`}>
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
              {player.contract && (
                player.contract.yearsLeft <= 1 ? (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-warn-dim text-warn border border-warn shrink-0">
                    ÚLTIMO AÑO
                  </span>
                ) : (
                  <span className="font-data text-ink-faint text-[10px] shrink-0">
                    {player.contract.yearsLeft}a contrato
                  </span>
                )
              )}
              <span className="font-data text-xs shrink-0 flex items-center gap-0.5">
                <span className="text-ink-faint">{player.age}a</span>
                <span style={{ color: trend.color }}>{trend.arrow}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SkillBar value={player.skill} />
              </div>
              <MoraleBar value={player.morale ?? 70} />
              <span className="font-data text-ink-faint text-[11px] shrink-0">
                ${(player.value / 1000).toFixed(0)}k
              </span>
              <button
                onClick={() => setTalkingTo(talkingTo === player.id ? null : player.id)}
                disabled={lifeEvents.length > 0}
                className="font-data text-ink-faint text-[11px] active:text-volt disabled:opacity-30 shrink-0"
              >
                💬 Hablar
              </button>
              <button
                onClick={() => sellPlayer(player.id)}
                disabled={squad.length <= 14}
                className="font-data text-ink-faint text-[11px] active:text-magenta disabled:opacity-30 shrink-0"
              >
                Vender
              </button>
              <button
                onClick={() => openContractRenewal(player.id)}
                className={`font-data text-[11px] shrink-0 ${
                  player.contract && player.contract.yearsLeft <= 1 ? 'text-warn font-bold' : 'text-ink-faint active:text-warn'
                }`}
              >
                Renovar
              </button>
            </div>
            {talkingTo === player.id && (
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-line">
                {CHARLA_ORDER.map(type => (
                  <button
                    key={type}
                    onClick={() => handleCharla(player.id, type)}
                    className="flex-1 rounded-lg py-1.5 font-data text-[11px] font-semibold bg-carbon-high text-ink-dim active:bg-line"
                  >
                    {CHARLA_TYPES[type].icon} {CHARLA_TYPES[type].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
