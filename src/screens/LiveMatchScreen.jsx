import { useEffect, useState } from 'react'
import useGame from '../store/useGame.js'
import { WORLD_CLUBS } from '../data/worldData.js'
import { FORMATION_SLOTS } from '../data/gameData.js'
import { getBenchIds, MAX_SUBS, MENTALITY_LABELS } from '../engine/liveMatch.js'
import { PRESSING_LABELS, TEMPO_LABELS, ATTACK_LABELS } from '../data/tactics.js'

const POS_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#60a5fa', LI: '#60a5fa',
  MCD: '#22c55e', MCC: '#4ade80', MCO: '#86efac', EXT: '#a3e635',
  DEL: '#ef4444',
}

const EVENT_ICON = {
  goal: '⚽', chance: '👀', yellow: '🟨', red: '🟥', injury: '🚑', sub: '🔄', tactic: '🎯', kickoff: '🏁',
}

function resolveClub(id, clubs) {
  return clubs.find(c => c.id === id) || WORLD_CLUBS.find(c => c.id === id)
}

function EventRow({ event }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="font-data text-ink-faint text-[11px] font-bold w-8 shrink-0 text-right">
        {event.type === 'kickoff' ? '' : `${event.minute}'`}
      </span>
      <span className="text-sm shrink-0">{EVENT_ICON[event.type] || '•'}</span>
      <p className={`text-xs leading-relaxed ${event.type === 'goal' ? 'text-volt font-semibold' : 'text-ink-dim'}`}>
        {event.text}
      </p>
    </div>
  )
}

function SubSheet({ playerClub, lineup, subsLeft, onClose, onConfirm }) {
  const [outId, setOutId] = useState(null)
  const slots = FORMATION_SLOTS[playerClub.formation] || FORMATION_SLOTS['4-4-2']
  const squadMap = Object.fromEntries(playerClub.squad.map(p => [p.id, p]))
  const bench = getBenchIds(playerClub, lineup).map(id => squadMap[id]).filter(Boolean)
  const onPitch = lineup.filter(id => id != null).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(11,12,14,0.82)' }} />
      <div
        className="relative bg-carbon border-t border-line rounded-t-2xl flex flex-col slide-up"
        style={{ maxHeight: '75vh', maxWidth: 480, width: '100%', margin: '0 auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <p className="font-title text-ink text-base leading-none">Cambio ({subsLeft} disponibles)</p>
          <button onClick={onClose} className="text-ink-faint text-xl leading-none px-2 active:text-ink">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          <div>
            <p className="section-label mb-2">
              Sale{onPitch < 11 && <span className="text-magenta normal-case font-normal"> · jugando con {onPitch}</span>}
            </p>
            <div className="space-y-1.5">
              {lineup.map((id, i) => {
                const p = squadMap[id]
                if (!p) return null
                const slotPos = slots[i]
                return (
                  <button
                    key={id}
                    onClick={() => setOutId(id)}
                    className={`w-full rounded-lg px-3 py-2 text-left flex items-center gap-2 transition-all border ${
                      outId === id
                        ? 'bg-magenta-dim border-magenta'
                        : 'bg-carbon-raised border-line active:border-ink-faint'
                    }`}
                  >
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: (POS_COLORS[slotPos] || '#888') + '22', color: POS_COLORS[slotPos] || '#888' }}
                    >
                      {slotPos}
                    </span>
                    <span className="text-ink text-sm flex-1 truncate">{p.name}</span>
                    <span className="font-data text-ink-faint text-xs">{p.skill}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {outId && (
            <div>
              <p className="section-label mb-2">Entra</p>
              <div className="space-y-1.5">
                {bench.length === 0 && <p className="font-data text-ink-faint text-sm py-2">No hay suplentes disponibles</p>}
                {bench.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onConfirm(outId, p.id); onClose() }}
                    className="w-full rounded-lg px-3 py-2 text-left flex items-center gap-2 bg-carbon-raised border border-line active:border-volt"
                  >
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: (POS_COLORS[p.position] || '#888') + '22', color: POS_COLORS[p.position] || '#888' }}
                    >
                      {p.position}
                    </span>
                    <span className="text-ink text-sm flex-1 truncate">{p.name}</span>
                    <span className="font-data text-volt text-sm font-bold">{p.skill}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LiveMatchScreen() {
  const liveMatch = useGame(s => s.liveMatch)
  const clubs = useGame(s => s.clubs)
  const currentJob = useGame(s => s.currentJob)
  const tickLiveMatch = useGame(s => s.tickLiveMatch)
  const applyLiveSub = useGame(s => s.applyLiveSub)
  const setLiveMentality = useGame(s => s.setLiveMentality)
  const commitLiveMatch = useGame(s => s.commitLiveMatch)
  const commitCupLiveMatch = useGame(s => s.commitCupLiveMatch)
  const commitPreseasonFriendly = useGame(s => s.commitPreseasonFriendly)

  const [paused, setPaused] = useState(false)
  const [subSheetOpen, setSubSheetOpen] = useState(false)

  const finished = !!liveMatch?.finished

  useEffect(() => {
    if (!liveMatch || finished || paused || subSheetOpen) return
    const t = setInterval(() => { tickLiveMatch(1) }, 350)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, paused, subSheetOpen, !!liveMatch])

  if (!liveMatch || !currentJob) return null

  const homeClub = resolveClub(liveMatch.homeClubId, clubs)
  const awayClub = resolveClub(liveMatch.awayClubId, clubs)
  const playerClub = clubs.find(c => c.id === currentJob.clubId)
  if (!homeClub || !awayClub || !playerClub) return null

  const playerLineup = liveMatch.playerSide === 'home' ? liveMatch.homeLineup : liveMatch.awayLineup
  const playerMentality = liveMatch.playerSide === 'home' ? liveMatch.homeMentality : liveMatch.awayMentality
  const playerTactics = liveMatch.playerSide === 'home' ? liveMatch.homeTactics : liveMatch.awayTactics
  const orderedEvents = [...liveMatch.events].reverse()
  const subsLeft = MAX_SUBS - liveMatch.subsUsed
  const isCup = liveMatch.kind === 'cup'
  const isFriendly = liveMatch.kind === 'friendly'
  const commit = isCup ? commitCupLiveMatch : isFriendly ? commitPreseasonFriendly : commitLiveMatch

  return (
    <div className="flex flex-col min-h-dvh bg-carbon mx-auto" style={{ maxWidth: 430 }}>
      {/* Scoreboard */}
      <div className="px-4 pt-5 pb-3 border-b border-line">
        {isCup && (
          <p className="font-data text-volt text-[11px] font-bold uppercase tracking-wide text-center mb-1.5">
            🏆 {liveMatch.competitionName}
          </p>
        )}
        {isFriendly && (
          <p className="font-data text-ink-faint text-[11px] font-bold uppercase tracking-wide text-center mb-1.5">
            🏕️ Amistoso de pretemporada
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-title text-ink text-sm flex-1 truncate">{homeClub.name}</span>
          <div className="px-4 text-center shrink-0">
            <p className="font-data text-ink font-black text-2xl">{liveMatch.homeGoals}-{liveMatch.awayGoals}</p>
            <p className="font-data text-volt text-xs font-bold">{finished ? 'FINAL' : `${liveMatch.minute}'`}</p>
          </div>
          <span className="font-title text-ink text-sm flex-1 truncate text-right">{awayClub.name}</span>
        </div>
        {playerTactics && (
          <p className="font-data text-ink-faint text-[10px] text-center mt-1.5">
            Presión: {PRESSING_LABELS[playerTactics.pressing]} · Ritmo: {TEMPO_LABELS[playerTactics.tempo]} · Ataque: {ATTACK_LABELS[playerTactics.attack]}
          </p>
        )}
      </div>

      {/* Event feed */}
      <div className="flex-1 overflow-y-auto px-4 py-2 scrollable">
        {orderedEvents.map((ev, i) => <EventRow key={i} event={ev} />)}
      </div>

      {/* Controls */}
      <div className="form-bar space-y-2 px-4 py-3">
        {!finished && (
          <>
            <div className="flex rounded-lg overflow-hidden border border-line">
              {['defensivo', 'equilibrado', 'ofensivo'].map(m => (
                <button
                  key={m}
                  onClick={() => setLiveMentality(m)}
                  className={`flex-1 py-2 font-data text-xs font-semibold transition-colors ${
                    playerMentality === m ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-dim active:text-ink'
                  }`}
                >
                  {MENTALITY_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSubSheetOpen(true)}
                disabled={subsLeft <= 0}
                className="flex-1 py-3 rounded-lg bg-carbon-raised border border-line text-ink font-data text-sm font-semibold active:border-ink-faint disabled:opacity-40"
              >
                🔄 Cambios ({subsLeft})
              </button>
              <button
                onClick={() => setPaused(p => !p)}
                className="px-4 py-3 rounded-lg bg-carbon-raised border border-line text-ink font-data text-sm font-semibold active:border-ink-faint"
              >
                {paused ? '▶' : '⏸'}
              </button>
              <button
                onClick={() => tickLiveMatch(90 - liveMatch.minute)}
                className="flex-1 py-3 rounded-lg bg-carbon-high text-ink font-data text-sm font-semibold active:bg-line"
              >
                ⏩ Saltar al resultado
              </button>
            </div>
          </>
        )}
        {finished && (
          <button
            onClick={commit}
            className="btn-volt clip-cut w-full py-4 text-base shadow-lg active:opacity-90"
          >
            Continuar
          </button>
        )}
      </div>

      {subSheetOpen && (
        <SubSheet
          playerClub={playerClub}
          lineup={playerLineup}
          subsLeft={subsLeft}
          onClose={() => setSubSheetOpen(false)}
          onConfirm={(outId, inId) => applyLiveSub(outId, inId)}
        />
      )}
    </div>
  )
}
