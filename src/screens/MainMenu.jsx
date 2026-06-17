import { useState } from 'react'
import useGame from '../store/useGame.js'
import { STARTING_PROFILES } from '../data/gameData.js'

function ProfileCard({ profile, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(profile.id)}
      className={`w-full text-left rounded-2xl p-4 border transition-all ${
        selected
          ? 'bg-pitch-700 border-gold-400'
          : 'bg-pitch-800 border-pitch-700 active:bg-pitch-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{profile.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-bold text-sm">{profile.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              selected ? 'bg-gold-400 text-pitch-950' : 'bg-pitch-700 text-pitch-400'
            }`}>
              Rep {profile.startRep} · {profile.repLabel}
            </span>
          </div>
          <p className="text-pitch-500 text-xs leading-relaxed">{profile.description}</p>
          <p className="text-pitch-600 text-[10px] mt-1.5">Acceso: {profile.unlocks}</p>
        </div>
        {selected && (
          <span className="text-gold-400 text-base shrink-0">✓</span>
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
      <div className="flex flex-col min-h-screen px-6 bg-pitch-900 py-8">
        <div className="w-full max-w-sm mx-auto slide-up">
          <button
            onClick={() => { setPhase('menu'); setName(''); setSelectedProfile(null) }}
            className="text-pitch-600 text-sm mb-6 flex items-center gap-1 active:text-white"
          >
            ← Volver
          </button>

          <div className="text-center mb-6">
            <div className="text-4xl mb-2">⚽</div>
            <h1 className="text-white text-2xl font-bold">Nueva Carrera</h1>
          </div>

          {/* Name input */}
          <div className="mb-5">
            <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-2">
              Tu nombre como técnico
            </p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              placeholder="Ej: Carlos García"
              maxLength={28}
              className="w-full px-4 py-3 rounded-xl text-white text-sm font-semibold
                         bg-pitch-800 border border-pitch-700 focus:border-gold-400 transition-colors
                         placeholder-pitch-600"
              autoFocus
            />
          </div>

          {/* Profile selection */}
          <div className="mb-6">
            <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-2">
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
            className="w-full py-4 rounded-xl font-bold text-base transition-all
                       bg-gold-400 text-pitch-950 active:bg-gold-500
                       disabled:opacity-40 disabled:pointer-events-none"
          >
            Empezar Carrera
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-pitch-900">
      <div className="w-full max-w-sm slide-up text-center">
        <div className="mb-10">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-white text-3xl font-extrabold tracking-tight">DT Career</h1>
          <p className="text-pitch-600 text-sm mt-2">El juego del técnico de fútbol</p>
        </div>

        <div className="flex flex-col gap-3">
          {hasGame && coach && (
            <button
              onClick={() => setScreen(useGame.getState().currentJob ? 'dashboard' : 'unemployed')}
              className="w-full py-4 rounded-xl bg-gold-400 text-pitch-950 font-bold text-base active:bg-gold-500"
            >
              Continuar como {coach.name}
            </button>
          )}
          <button
            onClick={() => hasGame ? setConfirmTarget('new-game') : setPhase('new-game')}
            className={`w-full py-4 rounded-xl font-bold text-base
              ${hasGame
                ? 'bg-pitch-800 text-white border border-pitch-700 active:bg-pitch-700'
                : 'bg-gold-400 text-pitch-950 active:bg-gold-500'
              }`}
          >
            Nueva Carrera
          </button>
          {hasGame && (
            <button
              onClick={() => setConfirmTarget('reset')}
              className="w-full py-3 rounded-xl bg-transparent text-pitch-600 text-sm active:text-white"
            >
              Borrar partida guardada
            </button>
          )}
        </div>

        <div className="mt-12 text-pitch-800 text-xs space-y-1">
          <p>3 ligas · 36 clubes · Resultados simulados</p>
          <p>Guardado automático · Sin internet</p>
        </div>
      </div>
    </div>

    {confirmTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-900/90 px-6">
        <div className="w-full max-w-sm bg-pitch-800 rounded-2xl border border-pitch-700 p-6 slide-up">
          <h2 className="text-white font-bold text-lg mb-2">
            {confirmTarget === 'reset' ? '¿Borrar partida?' : '¿Nueva carrera?'}
          </h2>
          <p className="text-pitch-500 text-sm mb-6">
            {confirmTarget === 'reset'
              ? 'Se borrará todo el progreso. Esta acción no se puede deshacer.'
              : `Se perderá la carrera actual de ${coach?.name}. ¿Continuar?`}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-xl bg-red-500 text-white font-bold active:bg-red-600"
            >
              Confirmar
            </button>
            <button
              onClick={() => setConfirmTarget(null)}
              className="w-full py-3 rounded-xl bg-pitch-700 text-white font-semibold active:bg-pitch-600"
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
