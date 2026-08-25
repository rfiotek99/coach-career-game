import { useState, useMemo } from 'react'
import useGame from '../store/useGame.js'
import { FORMATION_SLOTS, FORMATION_VISUALS, POSITION_ROLE } from '../data/gameData.js'
import { getPositionPenalty } from '../engine/sim.js'

// Field-diagram chip colors — deliberately not brand tokens, see TacticsScreen.jsx.
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

  // armedSlot: index of a filled slot tapped once — resaltado, esperando un
  // segundo toque (otro slot -> swap, el mismo -> abrir picker, banco -> reemplazar).
  const [armedSlot, setArmedSlot] = useState(null)
  // pickerSlot: index into slots array when the full "Elegir jugador" modal is open
  const [pickerSlot, setPickerSlot] = useState(null)
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
      setArmedSlot(null)
      return
    }
    if (armedSlot === null) {
      // Nada armado todavía: un slot vacío no tiene con quién intercambiar,
      // así que abre directo el picker de siempre. Un slot con jugador se arma.
      if (localStarters[slotIndex]) setArmedSlot(slotIndex)
      else setPickerSlot(slotIndex)
      return
    }
    if (armedSlot === slotIndex) {
      // Tocar el mismo jugador de nuevo abre el picker completo para ese slot.
      setPickerSlot(slotIndex)
      setArmedSlot(null)
      return
    }
    // Tocar otro slot (con jugador o vacío) intercambia las dos posiciones.
    swapSlots(armedSlot, slotIndex)
    setArmedSlot(null)
  }

  function swapSlots(a, b) {
    setLocalStarters(prev => {
      const next = [...prev]
      ;[next[a], next[b]] = [next[b], next[a]]
      return next
    })
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
    if (armedSlot !== null) {
      assignBenchToSlot(playerId, armedSlot)
      setArmedSlot(null)
      setSelectedBench(null)
      return
    }
    setSelectedBench(prev => (prev === playerId ? null : playerId))
  }

  function handlePickPlayer(playerId) {
    setLocalStarters(prev => {
      const next = [...prev]
      const existingIdx = next.indexOf(playerId)
      if (existingIdx !== -1) next[existingIdx] = null
      next[pickerSlot] = playerId
      return next
    })
    setPickerSlot(null)
  }

  function handleAutoComplete() {
    setLocalStarters(autoComplete(club.squad, club.formation))
    setSelectedBench(null)
    setArmedSlot(null)
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

    const isSelectedSlot = armedSlot === slotIndex
    const isBenchMode = selectedBench !== null
    const isSwapMode = armedSlot !== null

    let borderColor = POS_COLORS[slotPos] + '55'
    if (isSelectedSlot) borderColor = '#c8ff32'
    else if (isBenchMode) borderColor = '#ff2ec488'
    else if (isSwapMode) borderColor = '#c8ff3260'

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
                <span className="text-white/50 line-through text-[9px] leading-none">{player.skill}</span>
                <span className="text-orange-400 text-[9px] font-bold leading-none">{effectiveSkill}</span>
              </span>
            ) : (
              <span className="text-[#c8ff32] text-[9px] font-bold leading-none mt-0.5">{player.skill}</span>
            )}
          </>
        ) : (
          <span className="text-white/40 text-[9px] leading-tight text-center">
            {isBenchMode || isSwapMode ? 'asignar' : 'vacío'}
          </span>
        )}
      </button>
    )
  }

  // ── Picker modal player list ──────────────────────────────────────────────────

  const pickerPlayers = useMemo(() => {
    if (pickerSlot === null) return []
    const slotPos = slots[pickerSlot]
    const slotRole = POSITION_ROLE[slotPos]
    return club.squad
      .filter(p => p.id === localStarters[pickerSlot] || !starterSet.has(p.id))
      .map(p => ({
        ...p,
        penalty: getPositionPenalty(p.position, slotPos),
        effectiveSkill: Math.round(p.skill * getPositionPenalty(p.position, slotPos)),
        sameRole: POSITION_ROLE[p.position] === slotRole,
      }))
      .sort((a, b) => (b.sameRole ? 1 : 0) - (a.sameRole ? 1 : 0) || b.effectiveSkill - a.effectiveSkill)
  }, [pickerSlot, club.squad, localStarters, starterSet, slots])

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
      <p className="section-label mb-2.5">
        Alineación — {club.formation}
        {armedSlot !== null && (
          <span className="text-volt ml-2 normal-case font-normal">
            — tocá otro puesto para intercambiar
          </span>
        )}
      </p>

      {/* Field */}
      <div
        className="rounded-xl overflow-hidden mb-4"
        style={{ background: 'linear-gradient(180deg, #166534 0%, #15803d 50%, #166534 100%)' }}
      >
        <div className="p-2 space-y-1">
          {fieldContent}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5 mb-5">
        <button
          onClick={handleAutoComplete}
          className="flex-1 rounded-lg py-2.5 font-data text-sm font-semibold bg-carbon-raised border border-line text-ink-dim active:border-ink-faint"
        >
          Auto-completar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isComplete || !isDirty}
          className={`flex-1 rounded-lg py-2.5 font-data text-sm font-semibold transition-all border ${
            isComplete && isDirty
              ? 'bg-volt-dim border-volt text-volt'
              : 'bg-carbon-raised border-line text-ink-faint'
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
      <p className="section-label mb-2.5">
        Banco de suplentes
        {selectedBench && (
          <span className="text-magenta ml-2 normal-case font-normal">
            — tocá un puesto en el campo
          </span>
        )}
      </p>
      <div className="space-y-2">
        {bench.map(player => {
          const isUnavailable = (player.injuredFor || 0) > 0 || (player.suspendedFor || 0) > 0
          return (
            <button
              key={player.id}
              onClick={() => !isUnavailable && handleBenchClick(player.id)}
              className={`w-full rounded-lg px-3.5 py-2.5 text-left transition-all border ${
                isUnavailable
                  ? 'bg-carbon border-line opacity-60 cursor-default'
                  : selectedBench === player.id
                  ? 'bg-magenta-dim border-magenta'
                  : 'bg-carbon-raised border-line active:border-ink-faint'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: (POS_COLORS[player.position] || '#888') + '22',
                    color: POS_COLORS[player.position] || '#888',
                  }}
                >
                  {player.position}
                </span>
                <span className="text-ink text-sm flex-1 truncate">{player.name}</span>
                <span className="font-data text-ink-faint text-xs shrink-0">{player.age}a</span>
                {isUnavailable ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">
                    {(player.injuredFor || 0) > 0 ? `🤕 ${player.injuredFor}J` : 'SUSP'}
                  </span>
                ) : (
                  <span className="font-data text-volt text-base font-extrabold shrink-0">{player.skill}</span>
                )}
              </div>
            </button>
          )
        })}
        {bench.length === 0 && (
          <p className="font-data text-ink-faint text-sm text-center py-2">Todos los jugadores son titulares</p>
        )}
      </div>

      {/* Player picker modal */}
      {pickerSlot !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setPickerSlot(null)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(11,12,14,0.82)' }} />
          <div
            className="relative bg-carbon border-t border-line rounded-t-2xl flex flex-col slide-up"
            style={{ maxHeight: '70vh', maxWidth: 480, width: '100%', margin: '0 auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <div>
                <p className="font-title text-ink text-base leading-none">Elegir jugador</p>
                <p className="font-data text-ink-faint text-xs mt-1">
                  Puesto:{' '}
                  <span className="font-bold" style={{ color: POS_COLORS[slots[pickerSlot]] }}>
                    {slots[pickerSlot]}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setPickerSlot(null)}
                className="text-ink-faint text-xl leading-none px-2 active:text-ink"
              >
                ×
              </button>
            </div>

            {/* Player list */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {pickerPlayers.map(player => {
                const isCurrentInSlot = player.id === localStarters[pickerSlot]
                const isUnavailable = (player.injuredFor || 0) > 0 || (player.suspendedFor || 0) > 0
                const hasPenalty = player.penalty < 1.0
                const penaltyPct = Math.round((1 - player.penalty) * 100)

                return (
                  <button
                    key={player.id}
                    onClick={() => !isUnavailable && handlePickPlayer(player.id)}
                    className={`w-full rounded-lg px-3.5 py-3 text-left transition-all border ${
                      isUnavailable
                        ? 'bg-carbon border-line opacity-60 cursor-default'
                        : isCurrentInSlot
                        ? 'bg-volt-dim border-volt'
                        : 'bg-carbon-raised border-line active:border-ink-faint'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: (POS_COLORS[player.position] || '#888') + '22',
                          color: POS_COLORS[player.position] || '#888',
                        }}
                      >
                        {player.position}
                      </span>
                      <span className="text-ink text-sm flex-1 truncate">{player.name}</span>
                      <span className="font-data text-ink-faint text-xs shrink-0">{player.age}a</span>
                      {isUnavailable ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">
                          {(player.injuredFor || 0) > 0 ? `🤕 ${player.injuredFor}J` : 'SUSP'}
                        </span>
                      ) : (
                        <span className="font-data flex items-center gap-1.5 shrink-0">
                          {hasPenalty ? (
                            <>
                              <span className="text-ink-faint line-through text-xs">{player.skill}</span>
                              <span className="text-orange-400 text-base font-extrabold">{player.effectiveSkill}</span>
                              <span className="text-magenta text-[10px]">-{penaltyPct}%</span>
                            </>
                          ) : (
                            <span className="text-volt text-base font-extrabold">{player.skill}</span>
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
