import useGame from '../store/useGame.js'

// Todos los festejos comparten el mismo acento volt — es el color de "logro"
// de la identidad de marca. El Mundial de Clubes (el título máximo) se
// distingue con un borde más grueso y un glow más intenso, no con otro color.
const TYPE_STYLE = {
  'league-title':          { glow: 'var(--color-volt-dim)', ring: 'border-volt' },
  'promotion':             { glow: 'var(--color-volt-dim)', ring: 'border-volt' },
  'cup-title':             { glow: 'var(--color-volt-dim)', ring: 'border-volt' },
  'continental-cup-title': { glow: 'var(--color-volt-dim)', ring: 'border-volt' },
  // El máximo título — el brillo más intenso de todos los festejos.
  'world-cup-title':       { glow: 'var(--color-volt-dim)', ring: 'border-volt', thick: true },
  'rep-tier':              { glow: 'var(--color-magenta-dim)', ring: 'border-magenta' },
  'dt-mes':                { glow: 'var(--color-volt-dim)', ring: 'border-volt' },
  'dt-anio':               { glow: 'var(--color-volt-dim)', ring: 'border-volt', thick: true },
  'academy-gem':           { glow: 'var(--color-volt-dim)', ring: 'border-volt' },
}

export default function CelebrationModal() {
  const celebrations = useGame(s => s.celebrations)
  const dismissCelebration = useGame(s => s.dismissCelebration)

  const event = celebrations[0]
  if (!event) return null

  const style = TYPE_STYLE[event.type] || TYPE_STYLE['league-title']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(11,12,14,0.92)' }}
    >
      <div
        className={`w-full rounded-2xl border ${style.thick ? 'border-2' : ''} ${style.ring} p-8 text-center slide-up`}
        style={{ maxWidth: 400, background: `radial-gradient(circle at 50% 0%, ${style.glow}, #0b0c0e 70%)` }}
      >
        <div className="text-7xl mb-5 pulse-gold">{event.icon}</div>
        <p className="font-title text-volt text-3xl leading-tight mb-3">
          {event.title}
        </p>
        {event.subtitle && (
          <p className="text-ink text-base font-semibold mb-1.5">{event.subtitle}</p>
        )}
        {event.detail && (
          <p className="font-data text-ink-dim text-sm mb-6">{event.detail}</p>
        )}
        <button
          onClick={dismissCelebration}
          className="btn-volt clip-cut w-full py-3.5 text-base shadow-lg active:opacity-90 mt-2"
        >
          ¡Genial!
        </button>
      </div>
    </div>
  )
}
