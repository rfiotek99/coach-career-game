import useGame from '../store/useGame.js'
import { PRESS_CONFERENCES } from '../data/pressData.js'

export default function PressConferenceModal() {
  const pressConference = useGame(s => s.pressConference)
  const respondPressConference = useGame(s => s.respondPressConference)

  if (!pressConference) return null

  const conf = PRESS_CONFERENCES[pressConference.type]
  if (!conf) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(11,12,14,0.90)' }}>
      <div
        className="w-full bg-carbon border-t border-line rounded-t-2xl p-5 slide-up"
        style={{ maxWidth: 480 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">📰</span>
          <span className="font-data text-volt text-xs font-bold uppercase tracking-wider">{conf.title}</span>
        </div>
        <p className="font-data text-ink-dim text-sm mb-5 leading-relaxed">{conf.context}</p>

        {/* Options */}
        <div className="space-y-3">
          {conf.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => respondPressConference(i)}
              className="w-full text-left rounded-lg bg-carbon-raised border border-line
                         px-4 py-3.5 active:bg-carbon-high transition-colors"
            >
              <p className="text-ink text-sm font-medium leading-snug mb-2">
                "{opt.text}"
              </p>
              <div className="flex flex-wrap gap-1.5">
                {opt.hint.split(' · ').map((h, j) => {
                  const isNeg = h.startsWith('-') || h.includes('−')
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
          ))}
        </div>

        <p className="font-data text-ink-faint text-[10px] text-center mt-5">
          Elegí con cuidado — esta decisión tiene consecuencias reales
        </p>
      </div>
    </div>
  )
}
