import useGame from '../store/useGame.js'

export default function WelcomeModal() {
  const dismissWelcome = useGame(s => s.dismissWelcome)
  const skipTutorial = useGame(s => s.skipTutorial)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(11,12,14,0.92)' }}
    >
      <div
        className="w-full rounded-2xl border border-volt p-8 text-center slide-up"
        style={{ maxWidth: 400, background: 'radial-gradient(circle at 50% 0%, var(--color-volt-dim), #0b0c0e 70%)' }}
      >
        <div className="text-6xl mb-5">⚽</div>
        <p className="font-title text-volt text-2xl leading-tight mb-4">
          Bienvenido, DT
        </p>
        <p className="text-ink text-sm leading-relaxed mb-2">
          Sos un entrenador de fútbol. Empezás desde abajo y tu objetivo es llegar a ser una leyenda:
          dirigí clubes, ganá títulos y formá jugadores.
        </p>
        <p className="font-data text-ink-dim text-xs mb-6">
          Te mostramos los primeros pasos — el resto lo vas descubriendo vos.
        </p>
        <button
          onClick={() => dismissWelcome(true)}
          className="btn-volt clip-cut w-full py-3.5 text-base shadow-lg active:opacity-90"
        >
          Empezar
        </button>
        <button
          onClick={skipTutorial}
          className="mt-4 font-data text-ink-faint text-xs underline active:text-ink-dim"
        >
          Saltar tutorial
        </button>
      </div>
    </div>
  )
}
