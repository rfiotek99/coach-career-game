import { useState, useMemo } from 'react'
import useGame from '../store/useGame.js'
import { FORMATION_SLOTS, FORMATION_VISUALS, POSITION_ROLE } from '../data/gameData.js'
import { getPositionPenalty } from '../engine/sim.js'

const POS_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#60a5fa', LI: '#60a5fa',
  MCD: '#22c55e', MCC: '#4ade80', MCO: '#86efac', EXT: '#a3e635',
  DEL: '#ef4444',
}

const ROLE_ORDER = { gk: 0, def: 1, mid: 2, fwd: 3 }

function autoComplete(squad, formation) {
  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2']
  const remaining = squad.filter(p => !(p.injuredFor > 0) && !(p.suspendedFor > 0))
  const result = Array(11).fill(null)

  // Process GK slots first, then def, mid, fwd so critical roles are filled before spilling over
  const slotsIndexed = slots.map((pos, i) => ({ pos, i, role: POSITION_ROLE[pos] || 'mid' }))
  const sorted = [...slotsIndexed].sort((a, b) =>
    (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2)
  )

  for (const { pos, i } of sorted) {
    const slotRole = POSITION_ROLE[pos]
    const candidates = remaining
      .map(p => ({
        p,
        sameRole: POSITION_ROLE[p.position] === slotRole,
        effectiveSkill: Math.round(p.skill * getPositionPenalty(p.position, pos)),
      }))
      .sort((a, b) => (b.sameRole ? 1 : 0) - (a.sameRole ? 1 : 0) || b.effectiveSkill - a.effectiveSkill)

    if (candidates.length > 0) {
      result[i] = candidates[0].p.id
      const idx = remaining.findIndex(p => p.id === candidates[0].p.id)
      remaining.splice(idx, 1)
    }
  }

  return result
}

export default function LineupScreen({ club }) {
  const setLineup = useGame(s => s.setLineup)

  const slots = FORMATION_SLOTS[club.formation] || FORMATION_SLOTS['4-4-2']
  const rows = FORMATION_VISUALS[club.formation] || FORMATION_VISUALS['4-4-2']

  const [localStarters, setLocalStarters] = useState(() => {
    const saved = club.starters || []
    const validIds = new Set(club.squad.map(p => p.id))
    const valid = saved.filter(id => id && validIds.has(id))
    return valid.length === 11 ? valid : Array(11).fill(null)
  })

  // selectedSlot: index into slots array when picker is open
  const [selectedSlot, setSelectedSlot] = useState(null)
  // selectedBench: player ID tapped on bench (waiting to be placed in a slot)
  const [selectedBench, setSelectedBench] = useState(null)

  const squadMap = useMemo(
    () => Object.fromEntries(club.squad.map(p => [p.id, p])),
    [club.squad]
  )

  const starterSet = useMemo(() => new Set(localStarters.filter(Boolean)), [localStarters])

  const bench = useMemo(
    () =>
      club.squad
        .filter(p => !starterSet.has(p.id))
        .sort((a, b) =>
          (ROLE_ORDER[POSITION_ROLE[a.position]] ?? 2) - (ROLE_ORDER[POSITION_ROLE[b.position]] ?? 2) ||
          b.skill - a.skill
        ),
    [club.squad, starterSet]
  )

  const filledCount = localStarters.filter(Boolean).length
  const isComplete = filledCount === 11
  const savedStarters = club.starters || []
  const isDirty = localStarters.some((id, i) => id !== (savedStarters[i] ?? null))

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleSlotClick(slotIndex) {
    if (selectedBench) {
      assignBenchToSlot(selectedBench, slotIndex)
      setSelectedBench(null)
    } else {
      setSelectedSlot(slotIndex)
    }
  }

  function assignBenchToSlot(playerId, slotIndex) {
    setLocalStarters(prev => {
      const next = [...prev]
      // If this player is already in another slot, clear that slot
      const existingIdx = next.indexOf(playerId)
      if (existingIdx !== -1) next[existingIdx] = null
      next[slotIndex] = playerId
      return next
    })
  }

  function handleBenchClick(playerId) {
    setSelectedBench(prev => (prev === playerId ? null : playerId))
    setSelectedSlot(null)
  }

  function handlePickPlayer(playerId) {
    setLocalStarters(prev => {
      const next = [...prev]
      const existingIdx = next.indexOf(playerId)
      if (existingIdx !== -1) next[existingIdx] = null
      next[selectedSlot] = playerId
      return next
    })
    setSelectedSlot(null)
  }

  function handleAutoComplete() {
    setLocalStarters(autoComplete(club.squad, club.formation))
    setSelectedBench(null)
  }

  function handleConfirm() {
    if (isComplete) setLineup(localStarters)
  }

  // ── Field slot renderer ───────────────────────────────────────────────────────

  function renderSlot(slotPos, slotIndex) {
    const playerId = localStarters[slotIndex]
    const player = playerId ? squadMap[playerId] : null
    const penalty = player ? getPositionPenalty(player.position, slotPos) : 1.0
    const effectiveSkill = player ? Math.round(player.skill * penalty) : null
    const hasPenalty = penalty < 1.0
    const isSlotUnavailable = player && ((player.injuredFor || 0) > 0 || (player.suspendedFor || 0) > 0)

    const isSelectedSlot = selectedSlot === slotIndex
    const isBenchMode = selectedBench !== null

    let borderColor = POS_COLORS[slotPos] + '55'
    if (isSelectedSlot) borderColor = '#f0b429'
    else if (isBenchMode) borderColor = '#60a5fa88'

    return (
      <button
        key={slotIndex}
        onClick={() => handleSlotClick(slotIndex)}
        className="flex flex-col items-center justify-center rounded-lg px-0.5 py-1 flex-1 min-w-0 transition-all"
        style={{
          background: player ? POS_COLORS[slotPos] + '28' : POS_COLORS[slotPos] + '12',
          border: `1.5px solid ${borderColor}`,
          maxWidth: 88,
          minHeight: 54,
        }}
      >
        <span className="text-[9px] font-bold leading-none mb-0.5" style={{ color: POS_COLORS[slotPos] }}>
          {slotPos}
        </span>
        {player ? (
          <>
            <span className="text-white text-[10px] font-medium leading-tight w-full text-center truncate px-0.5">
              {player.name.split(' ').pop()}
            </span>
            {isSlotUnavailable ? (
              <span className="text-red-400 text-[8px] font-bold leading-none mt-0.5">
                {(player.injuredFor || 0) > 0 ? `🤕${player.injuredFor}J` : 'SUSP'}
              </span>
            ) : hasPenalty ? (
              <span className="flex items-center gap-0.5 mt-0.5">
                <span className="text-pitch-500 line-through text-[9px] leading-none">{player.skill}</span>
                <span className="text-orange-400 text-[9px] font-bold leading-none">{effectiveSkill}</span>
              </span>
            ) : (
              <span className="text-emerald-400 text-[9px] font-bold leading-none mt-0.5">{player.skill}</span>
            )}
          </>
        ) : (
          <span className="text-pitch-600 text-[9px] leading-tight text-center">
            {isBenchMode ? 'asignar' : 'vacío'}
          </span>
        )}
      </button>
    )
  }

  // ── Picker modal player list ──────────────────────────────────────────────────

  const pickerPlayers = useMemo(() => {
    if (selectedSlot === null) return []
    const slotPos = slots[selectedSlot]
    const slotRole = POSITION_ROLE[slotPos]
    return club.squad
      .filter(p => p.id === localStarters[selectedSlot] || !starterSet.has(p.id))
      .map(p => ({
        ...p,
        penalty: getPositionPenalty(p.position, slotPos),
        effectiveSkill: Math.round(p.skill * getPositionPenalty(p.position, slotPos)),
        sameRole: POSITION_ROLE[p.position] === slotRole,
      }))
      .sort((a, b) => (b.sameRole ? 1 : 0) - (a.sameRole ? 1 : 0) || b.effectiveSkill - a.effectiveSkill)
  }, [selectedSlot, club.squad, localStarters, starterSet, slots])

  // ── Render ────────────────────────────────────────────────────────────────────

  // Traverse rows and track global slot index
  let slotIdx = 0
  const fieldContent = rows.map((row, ri) => {
    const cells = row.map(slotPos => {
      const el = renderSlot(slotPos, slotIdx)
      slotIdx++
      return el
    })
    return (
      <div key={ri} className="flex justify-center gap-1">
        {cells}
      </div>
    )
  })

  return (
    <div className="px-4 py-3 pb-24">
      <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-2">
        Alineación — {club.formation}
      </p>

      {/* Field */}
      <div
        className="rounded-xl overflow-hidden mb-3"
        style={{ background: 'linear-gradient(180deg, #166534 0%, #15803d 50%, #166534 100%)' }}
      >
        <div className="p-2 space-y-1">
          {fieldContent}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAutoComplete}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-pitch-800 border border-pitch-700 text-pitch-400 active:border-pitch-600"
        >
          Auto-completar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isComplete || !isDirty}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            isComplete && isDirty
              ? 'bg-gold-400/20 border border-gold-400/50 text-gold-400'
              : 'bg-pitch-800 border border-pitch-800 text-pitch-600'
          }`}
        >
          {!isComplete
            ? `Faltan ${11 - filledCount}`
            : isDirty
            ? 'Guardar XI'
            : 'Guardado ✓'}
        </button>
      </div>

      {/* Bench */}
      <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-2">
        Banco de suplentes
        {selectedBench && (
          <span className="text-blue-400 ml-2 normal-case font-normal">
            — tocá un puesto en el campo
          </span>
        )}
      </p>
      <div className="space-y-1.5">
        {bench.map(player => {
          const isUnavailable = (player.injuredFor || 0) > 0 || (player.suspendedFor || 0) > 0
          return (
            <button
              key={player.id}
              onClick={() => !isUnavailable && handleBenchClick(player.id)}
              className={`w-full rounded-xl px-3 py-2 text-left transition-all ${
                isUnavailable
                  ? 'bg-pitch-900/60 border border-pitch-800/60 opacity-60 cursor-default'
                  : selectedBench === player.id
                  ? 'bg-blue-500/20 border border-blue-400/50'
                  : 'bg-pitch-800 border border-pitch-700 active:border-pitch-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: (POS_COLORS[player.position] || '#888') + '22',
                    color: POS_COLORS[player.position] || '#888',
                  }}
                >
                  {player.position}
                </span>
                <span className="text-white text-sm flex-1 truncate">{player.name}</span>
                <span className="text-pitch-500 text-xs shrink-0">{player.age}a</span>
                {isUnavailable ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">
                    {(player.injuredFor || 0) > 0 ? `🤕 ${player.injuredFor}J` : 'SUSP'}
                  </span>
                ) : (
                  <span className="text-emerald-400 text-sm font-bold shrink-0">{player.skill}</span>
                )}
              </div>
            </button>
          )
        })}
        {bench.length === 0 && (
          <p className="text-pitch-600 text-sm text-center py-2">Todos los jugadores son titulares</p>
        )}
      </div>

      {/* Player picker modal */}
      {selectedSlot !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setSelectedSlot(null)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(7,26,14,0.80)' }} />
          <div
            className="relative bg-pitch-900 border-t border-pitch-700 rounded-t-2xl flex flex-col slide-up"
            style={{ maxHeight: '70vh', maxWidth: 480, width: '100%', margin: '0 auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-pitch-800">
              <div>
                <p className="text-white font-bold text-sm">Elegir jugador</p>
                <p className="text-pitch-500 text-xs">
                  Puesto:{' '}
                  <span className="font-bold" style={{ color: POS_COLORS[slots[selectedSlot]] }}>
                    {slots[selectedSlot]}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-pitch-500 text-xl leading-none px-2 active:text-white"
              >
                ×
              </button>
            </div>

            {/* Player list */}
            <div className="overflow-y-auto flex-1 px-4 py-2 space-y-1.5">
              {pickerPlayers.map(player => {
                const isCurrentInSlot = player.id === localStarters[selectedSlot]
                const isUnavailable = (player.injuredFor || 0) > 0 || (player.suspendedFor || 0) > 0
                const hasPenalty = player.penalty < 1.0
                const penaltyPct = Math.round((1 - player.penalty) * 100)

                return (
                  <button
                    key={player.id}
                    onClick={() => !isUnavailable && handlePickPlayer(player.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-all ${
                      isUnavailable
                        ? 'bg-pitch-900/60 border border-pitch-800/60 opacity-60 cursor-default'
                        : isCurrentInSlot
                        ? 'bg-gold-400/20 border border-gold-400/40'
                        : 'bg-pitch-800 border border-pitch-700 active:border-pitch-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: (POS_COLORS[player.position] || '#888') + '22',
                          color: POS_COLORS[player.position] || '#888',
                        }}
                      >
                        {player.position}
                      </span>
                      <span className="text-white text-sm flex-1 truncate">{player.name}</span>
                      <span className="text-pitch-500 text-xs shrink-0">{player.age}a</span>
                      {isUnavailable ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">
                          {(player.injuredFor || 0) > 0 ? `🤕 ${player.injuredFor}J` : 'SUSP'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 shrink-0">
                          {hasPenalty ? (
                            <>
                              <span className="text-pitch-500 line-through text-xs">{player.skill}</span>
                              <span className="text-orange-400 text-sm font-bold">{player.effectiveSkill}</span>
                              <span className="text-red-400 text-[10px]">-{penaltyPct}%</span>
                            </>
                          ) : (
                            <span className="text-emerald-400 text-sm font-bold">{player.skill}</span>
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
