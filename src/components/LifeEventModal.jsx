import useGame from '../store/useGame.js'
import { EVENT_CATEGORIES } from '../data/lifeEvents.js'

const POS_LABEL = {
  POR: 'Arquero', CAR: 'Marcador Central', LD: 'Lateral Der.', LI: 'Lateral Izq.',
  MCD: 'Mediocampista Def.', MCC: 'Mediocampista', MCO: 'Mediocampista Of.',
  EXT: 'Extremo', DEL: 'Delantero',
}

// Tarjeta de "sujeto" cuando el evento no tiene un jugador puntual — por
// categoría, para que no diga siempre "El plantel" en un evento de carrera.
const NO_SUBJECT_CARD = {
  vestuario: { icon: '🧤', label: 'El plantel' },
  carrera: { icon: '🧭', label: 'Tu carrera' },
  'prensa-personal': { icon: '🎙️', label: 'La prensa' },
  legado: { icon: '🎖️', label: 'Tu legado' },
}

// Las categorías 'carrera'/'prensa-personal' se pintan con más peso que el
// resto — son decisiones sobre el propio DT o su imagen pública, no charlas
// de rutina con el plantel. 'legado' queda con el acento neutro (volt) —
// son momentos narrativos, no decisiones de alto impacto.
const CATEGORY_ACCENT = {
  carrera: { border: 'border-magenta', label: 'text-magenta' },
  'prensa-personal': { border: 'border-warn', label: 'text-warn' },
}
const DEFAULT_ACCENT = { border: 'border-line', label: 'text-volt' }

const FOOTER_TEXT = {
  carrera: 'Tu respuesta puede definir el rumbo de tu carrera',
  'prensa-personal': 'Tu respuesta puede definir tu imagen pública',
  legado: 'Un momento para vos — el impacto es leve',
}
const DEFAULT_FOOTER = 'Tu respuesta afecta el ánimo del plantel y la confianza de la dirigencia'

export default function LifeEventModal() {
  const lifeEvents = useGame(s => s.lifeEvents)
  const respondToLifeEvent = useGame(s => s.respondToLifeEvent)

  const event = lifeEvents[0]
  if (!event) return null

  const category = EVENT_CATEGORIES[event.category] || { label: 'Evento', icon: '📋' }
  const posLabel = event.subjectPlayerPos ? (POS_LABEL[event.subjectPlayerPos] || event.subjectPlayerPos) : null
  const accent = CATEGORY_ACCENT[event.category] || DEFAULT_ACCENT
  const noSubject = NO_SUBJECT_CARD[event.category] || NO_SUBJECT_CARD.vestuario

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(11,12,14,0.90)' }}>
      <div className={`w-full bg-carbon border-t-2 ${accent.border} rounded-t-2xl p-5 slide-up`} style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{category.icon}</span>
          <span className={`font-data ${accent.label} text-xs font-bold uppercase tracking-wider`}>{category.label}</span>
        </div>

        {/* Subject — a specific player, or a category-appropriate fallback */}
        {event.subjectPlayerId ? (
          <div className="flex items-center gap-3 mb-3.5 p-3.5 rounded-lg bg-carbon-raised border border-line">
            <div className="w-11 h-11 rounded-full bg-carbon-high border border-line flex items-center justify-center text-lg shrink-0">
              ⚽
            </div>
            <div>
              <p className="text-ink font-semibold text-sm">{event.subjectPlayerName}</p>
              <p className="font-data text-ink-faint text-xs mt-0.5">{posLabel} · Habilidad {event.subjectPlayerSkill}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-3.5 p-3.5 rounded-lg bg-carbon-raised border border-line">
            <div className="w-11 h-11 rounded-full bg-carbon-high border border-line flex items-center justify-center text-lg shrink-0">
              {noSubject.icon}
            </div>
            <p className="text-ink font-semibold text-sm">{noSubject.label}</p>
          </div>
        )}

        <p className="font-data text-ink-dim text-sm mb-5 leading-relaxed">{event.text}</p>

        {/* Options */}
        <div className="space-y-3">
          {event.options.map((opt, i) => {
            const hintParts = opt.hint.split(' · ')
            return (
              <button
                key={i}
                onClick={() => respondToLifeEvent(i)}
                className="w-full text-left rounded-lg bg-carbon-raised border border-line
                           px-4 py-3.5 active:bg-carbon-high transition-colors"
              >
                <p className="text-ink text-sm font-medium leading-snug mb-2">
                  "{opt.text}"
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {hintParts.map((h, j) => {
                    const isNeg = h.startsWith('-')
                    const isPos = h.startsWith('+')
                    return (
                      <span
                        key={j}
                        className={`font-data text-[10px] font-bold px-2 py-1 rounded-md ${
                          isPos ? 'bg-volt-dim text-volt' :
                          isNeg ? 'bg-magenta-dim text-magenta' :
                          'bg-carbon-high text-ink-faint'
                        }`}
                      >
                        {h}
                      </span>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>

        <p className="font-data text-ink-faint text-[10px] text-center mt-5">
          {FOOTER_TEXT[event.category] || DEFAULT_FOOTER}
        </p>
      </div>
    </div>
  )
}
