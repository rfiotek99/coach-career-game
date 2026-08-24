import { useState } from 'react'
import useGame from '../store/useGame.js'
import { STARTING_PROFILES } from '../data/gameData.js'

function ProfileCard({ profile, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(profile.id)}
      className={`w-full text-left rounded-lg p-4 border transition-all ${
        selected
          ? 'bg-volt-dim border-volt'
          : 'bg-carbon-raised border-line active:bg-carbon-high'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{profile.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-ink font-bold text-sm">{profile.name}</span>
            <span className={`font-data text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              selected ? 'bg-volt text-carbon' : 'bg-carbon-high text-ink-dim'
            }`}>
              Rep {profile.startRep} · {profile.repLabel}
            </span>
          </div>
          <p className="font-data text-ink-faint text-xs leading-relaxed">{profile.description}</p>
          <p className="font-data text-ink-faint text-[10px] mt-1.5 opacity-70">Acceso: {profile.unlocks}</p>
        </div>
        {selected && (
          <span className="text-volt text-base shrink-0">✓</span>
        )}
      </div>
    </button>
  )
}

export default function MainMenu() {
  const [name, setName] = useState('')
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [phase, setPhase] = useState('menu') // 'menu' | 'new-game'
  const [confirmTarget, setConfirmTarget] = useState(null) // 'new-game' | 'reset'
  const hasGame = useGame(s => s.hasGame)
  const coach = useGame(s => s.coach)
  const startNewGame = useGame(s => s.startNewGame)
  const setScreen = useGame(s => s.setScreen)
  const resetGame = useGame(s => s.resetGame)

  function handleStart() {
    const trimmed = name.trim()
    if (!trimmed || !selectedProfile) return
    startNewGame(trimmed, selectedProfile)
  }

  function handleConfirm() {
    if (confirmTarget === 'reset') { resetGame(); setConfirmTarget(null) }
    else { setConfirmTarget(null); setPhase('new-game') }
  }

  if (phase === 'new-game') {
    return (
      <div className="flex flex-col min-h-screen px-6 bg-carbon py-8">
        <div className="w-full max-w-sm mx-auto slide-up">
          <button
            onClick={() => { setPhase('menu'); setName(''); setSelectedProfile(null) }}
            className="font-data text-ink-faint text-sm mb-6 flex items-center gap-1 active:text-ink"
          >
            ← Volver
          </button>

          <div className="text-center mb-6">
            <div className="text-4xl mb-2">⚽</div>
            <h1 className="font-title text-ink text-2xl leading-none">Nueva Carrera</h1>
          </div>

          {/* Name input */}
          <div className="mb-5">
            <p className="section-label mb-2">
              Tu nombre como técnico
            </p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              placeholder="Ej: Carlos García"
              maxLength={28}
              className="w-full px-4 py-3 rounded-lg text-ink text-sm font-semibold
                         bg-carbon-raised border border-line focus:border-volt transition-colors
                         placeholder-ink-faint"
              autoFocus
            />
          </div>

          {/* Profile selection */}
          <div className="mb-6">
            <p className="section-label mb-2">
              Perfil de inicio
            </p>
            <div className="space-y-2">
              {STARTING_PROFILES.map(p => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  selected={selectedProfile === p.id}
                  onSelect={setSelectedProfile}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!name.trim() || !selectedProfile}
            className="btn-volt clip-cut w-full py-4 text-base transition-all
                       active:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
          >
            Empezar Carrera
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-carbon">
      <div className="w-full max-w-sm slide-up text-center">
        <div className="mb-10">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="font-title text-ink text-4xl leading-none">DT Career</h1>
          <p className="font-data text-ink-faint text-sm mt-3">El juego del técnico de fútbol</p>
        </div>

        <div className="flex flex-col gap-3">
          {hasGame && coach && (
            <button
              onClick={() => setScreen(useGame.getState().currentJob ? 'dashboard' : 'unemployed')}
              className="btn-volt clip-cut w-full py-4 text-base active:opacity-90"
            >
              Continuar como {coach.name}
            </button>
          )}
          <button
            onClick={() => hasGame ? setConfirmTarget('new-game') : setPhase('new-game')}
            className={`w-full py-4 rounded-lg font-data font-bold text-base
              ${hasGame
                ? 'bg-carbon-raised text-ink border border-line active:bg-carbon-high'
                : 'btn-volt clip-cut active:opacity-90'
              }`}
          >
            Nueva Carrera
          </button>
          {hasGame && (
            <button
              onClick={() => setConfirmTarget('reset')}
              className="w-full py-3 rounded-lg bg-transparent font-data text-ink-faint text-sm active:text-ink"
            >
              Borrar partida guardada
            </button>
          )}
        </div>

        <div className="mt-12 font-data text-ink-faint text-xs space-y-1 opacity-60">
          <p>3 ligas · 36 clubes · Resultados simulados</p>
          <p>Guardado automático · Sin internet</p>
        </div>
      </div>
    </div>

    {confirmTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
        <div className="w-full max-w-sm bg-carbon-raised rounded-lg border border-line p-6 slide-up">
          <h2 className="font-title text-ink text-lg leading-none mb-3">
            {confirmTarget === 'reset' ? '¿Borrar partida?' : '¿Nueva carrera?'}
          </h2>
          <p className="font-data text-ink-dim text-sm mb-6">
            {confirmTarget === 'reset'
              ? 'Se borrará todo el progreso. Esta acción no se puede deshacer.'
              : `Se perderá la carrera actual de ${coach?.name}. ¿Continuar?`}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-lg bg-magenta text-ink font-data font-bold active:opacity-90"
            >
              Confirmar
            </button>
            <button
              onClick={() => setConfirmTarget(null)}
              className="w-full py-3 rounded-lg bg-carbon-high text-ink font-data font-semibold active:bg-line"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
