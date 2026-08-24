import useGame from '../store/useGame.js'
import { TRAINING_LABELS, TRAINING_DESCRIPTIONS } from '../data/tactics.js'

const TRAINING_ICONS = { ninguno: '➖', ataque: '⚔️', defensa: '🛡️', fisico: '💪', juveniles: '🌱' }
const FOCUS_ORDER = ['ninguno', 'ataque', 'defensa', 'fisico', 'juveniles']

function TrainingCard({ focus, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(focus)}
      className={`w-full text-left rounded-lg p-4 border transition-all ${
        selected ? 'bg-volt-dim border-volt' : 'bg-carbon-raised border-line active:bg-carbon-high'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">{TRAINING_ICONS[focus]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-ink font-bold text-sm">{TRAINING_LABELS[focus]}</span>
            {selected && <span className="text-volt text-xs">✓</span>}
          </div>
          <p className="font-data text-ink-faint text-xs leading-relaxed">{TRAINING_DESCRIPTIONS[focus]}</p>
        </div>
      </div>
    </button>
  )
}

function FriendlyResultRow({ result }) {
  const outcome = result.homeGoals > result.awayGoals ? 'V' : result.homeGoals < result.awayGoals ? 'D' : 'E'
  const color = outcome === 'V' ? 'text-volt' : outcome === 'D' ? 'text-magenta' : 'text-warn'
  return (
    <div className="flex items-center gap-2.5 bg-carbon-high rounded-lg px-3.5 py-2.5">
      <span className={`font-data text-xs font-bold w-5 shrink-0 ${color}`}>{outcome}</span>
      <span className="text-ink text-sm flex-1 truncate">vs {result.opponentName}</span>
      <span className="font-data text-ink font-extrabold text-base">{result.homeGoals}-{result.awayGoals}</span>
    </div>
  )
}

export default function PreseasonScreen() {
  const season = useGame(s => s.season)
  const coach = useGame(s => s.coach)
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const preseasonFriendlyResults = useGame(s => s.preseasonFriendlyResults) || []
  const focus = useGame(s => s.preseasonFocusDraft) || 'ninguno'
  const setFocus = useGame(s => s.setPreseasonFocusDraft)
  const finishPreseason = useGame(s => s.finishPreseason)
  const getPreseasonFriendlyOpponents = useGame(s => s.getPreseasonFriendlyOpponents)
  const playPreseasonFriendlyQuick = useGame(s => s.playPreseasonFriendlyQuick)
  const startPreseasonFriendlyLive = useGame(s => s.startPreseasonFriendlyLive)

  if (!coach || !currentJob) return null

  const club = clubs.find(c => c.id === currentJob.clubId)
  if (!club) return null

  const playedIds = new Set(preseasonFriendlyResults.map(r => r.opponentId))
  const opponents = getPreseasonFriendlyOpponents().filter(o => !playedIds.has(o.id))
  const friendliesLeft = 3 - preseasonFriendlyResults.length

  return (
    <div className="px-4 py-6 pb-24 min-h-screen space-y-5">
      <div className="text-center">
        <div className="text-5xl mb-3">🏕️</div>
        <h1 className="font-title text-ink text-2xl leading-none">Pretemporada</h1>
        <p className="font-data text-ink-faint text-sm mt-2">{club.name} · Temporada {season}</p>
      </div>

      <div className="rounded-lg bg-volt-dim border border-volt p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-volt font-bold text-sm">Plantel recuperado</p>
            <p className="font-data text-ink-dim text-xs mt-1">
              Todos los jugadores llegan sanos — sin lesiones ni suspensiones arrastradas.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="section-label mb-2 px-1">
          Plan de entrenamiento
        </p>
        <div className="space-y-2.5">
          {FOCUS_ORDER.map(f => (
            <TrainingCard key={f} focus={f} selected={focus === f} onSelect={setFocus} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="section-label">
            Amistosos de pretemporada
          </p>
          <span className="font-data text-ink-faint text-xs">{preseasonFriendlyResults.length}/3</span>
        </div>

        {preseasonFriendlyResults.length > 0 && (
          <div className="space-y-2 mb-2.5">
            {preseasonFriendlyResults.map(r => <FriendlyResultRow key={r.id} result={r} />)}
          </div>
        )}

        {friendliesLeft > 0 && opponents.length > 0 && (
          <div className="space-y-2.5">
            {opponents.slice(0, 3).map(opp => (
              <div key={opp.id} className="flex items-center gap-2.5 bg-carbon-raised border border-line rounded-lg px-3.5 py-3">
                <span className="text-ink text-sm flex-1 truncate">{opp.name}</span>
                <button
                  onClick={() => playPreseasonFriendlyQuick(opp.id)}
                  className="px-3 py-1.5 rounded-lg bg-carbon-high text-ink-dim font-data text-xs font-semibold active:text-ink"
                >
                  ⏩ Simular
                </button>
                <button
                  onClick={() => startPreseasonFriendlyLive(opp.id)}
                  className="px-3 py-1.5 rounded-lg bg-volt-dim border border-volt text-volt font-data text-xs font-semibold active:opacity-80"
                >
                  ▶ En vivo
                </button>
              </div>
            ))}
          </div>
        )}

        {friendliesLeft <= 0 && (
          <p className="font-data text-ink-faint text-xs text-center py-2">Ya jugaste los 3 amistosos disponibles</p>
        )}

        <p className="font-data text-ink-faint text-[10px] text-center mt-2">
          No suman puntos ni afectan la liga — son opcionales
        </p>
      </div>

      <button
        onClick={() => finishPreseason(focus)}
        className="btn-volt clip-cut w-full py-4 text-base shadow-lg active:opacity-90"
      >
        Comenzar Temporada {season} →
      </button>
    </div>
  )
}
