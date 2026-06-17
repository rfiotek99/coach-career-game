import useGame from '../store/useGame.js'
import { PRESS_CONFERENCES } from '../data/pressData.js'

export default function PressConferenceModal() {
  const pressConference = useGame(s => s.pressConference)
  const respondPressConference = useGame(s => s.respondPressConference)

  if (!pressConference) return null

  const conf = PRESS_CONFERENCES[pressConference.type]
  if (!conf) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(7,26,14,0.90)' }}>
      <div
        className="w-full bg-pitch-900 rounded-t-2xl p-5 slide-up"
        style={{ maxWidth: 480 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">📰</span>
          <span className="text-gold-400 text-xs font-bold uppercase tracking-wider">{conf.title}</span>
        </div>
        <p className="text-pitch-400 text-sm mb-5 leading-relaxed">{conf.context}</p>

        {/* Options */}
        <div className="space-y-2.5">
          {conf.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => respondPressConference(i)}
              className="w-full text-left rounded-xl bg-pitch-800 border border-pitch-700
                         px-4 py-3 active:bg-pitch-700 transition-colors"
            >
              <p className="text-white text-sm font-medium leading-snug mb-1.5">
                "{opt.text}"
              </p>
              <div className="flex flex-wrap gap-1.5">
                {opt.hint.split(' · ').map((h, j) => {
                  const isNeg = h.startsWith('-') || h.includes('−')
                  const isPos = h.startsWith('+')
                  return (
                    <span
                      key={j}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                        isPos ? 'bg-emerald-500/20 text-emerald-400' :
                        isNeg ? 'bg-red-500/20 text-red-400' :
                        'bg-pitch-700 text-pitch-500'
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

        <p className="text-pitch-700 text-[10px] text-center mt-4">
          Elegí con cuidado — esta decisión tiene consecuencias reales
        </p>
      </div>
    </div>
  )
}
