import useGame from '../store/useGame.js'

const STEP_COPY = {
  1: "Elegí tu primer club: mirá las ofertas abajo y tocá 'Aceptar Cargo'.",
  2: 'Mirá tu plantel: conocé a tus jugadores en la pestaña Plantel.',
  3: 'Armá tu once titular en la pestaña Táctica.',
  4: 'Simulá tu primer partido.',
}

const TOTAL_STEPS = 4

export default function TutorialGuide() {
  const onboarding = useGame(s => s.onboarding)
  const screen = useGame(s => s.screen)
  const skipTutorial = useGame(s => s.skipTutorial)

  if (!onboarding.tutorialActive) return null
  if (!['unemployed', 'dashboard'].includes(screen)) return null

  const step = onboarding.tutorialStep
  const text = STEP_COPY[step]
  if (!text) return null

  return (
    <div className="px-4 pt-3 shrink-0">
      <div className="card-broadcast border border-volt clip-cut px-3.5 py-3 flex items-center gap-3 slide-up">
        <div className="flex-1 min-w-0">
          <p className="section-label text-volt mb-1">Paso {step} de {TOTAL_STEPS}</p>
          <p className="text-ink text-sm leading-snug">{text}</p>
        </div>
        <button
          onClick={skipTutorial}
          className="font-data text-ink-faint text-[10px] underline shrink-0 active:text-ink-dim"
        >
          Saltar
        </button>
      </div>
    </div>
  )
}
