import useGame from '../store/useGame.js'

const OPTIONS = [
  {
    text: 'Prometele más oportunidades — lo vas a rotar en los próximos partidos',
    hint: '+5 Moral · -1 Confianza dirigencia',
    hintType: 'mixed',
  },
  {
    text: 'Hablar con honestidad — el equipo necesita lo mejor del colectivo',
    hint: '+2 Moral · +3 Confianza dirigencia',
    hintType: 'positive',
  },
  {
    text: 'Ignorar — el técnico decide quién juega, sin excepciones',
    hint: '-8 Moral · -3 Confianza dirigencia',
    hintType: 'negative',
  },
]

const POS_LABEL = {
  POR: 'Arquero', CAR: 'Marcador Central', LD: 'Lateral Der.', LI: 'Lateral Izq.',
  MCD: 'Mediocampista Def.', MCC: 'Mediocampista', MCO: 'Mediocampista Of.',
  EXT: 'Extremo', DEL: 'Delantero',
}

export default function PlayerDiscontentModal() {
  const playerDiscontent = useGame(s => s.playerDiscontent)
  const respondToPlayerDiscontent = useGame(s => s.respondToPlayerDiscontent)

  if (!playerDiscontent) return null

  const { playerName, playerSkill, playerPos, matchdaysOnBench } = playerDiscontent
  const posLabel = POS_LABEL[playerPos] || playerPos

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(7,26,14,0.90)' }}>
      <div
        className="w-full bg-pitch-900 rounded-t-2xl p-5 slide-up"
        style={{ maxWidth: 480 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">😤</span>
          <span className="text-gold-400 text-xs font-bold uppercase tracking-wider">Jugador descontento</span>
        </div>

        {/* Player info */}
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-pitch-800 border border-pitch-700">
          <div className="w-10 h-10 rounded-full bg-pitch-700 border border-pitch-600 flex items-center justify-center text-lg">
            ⚽
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{playerName}</p>
            <p className="text-pitch-500 text-xs">{posLabel} · Habilidad {playerSkill}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-orange-400 font-bold text-sm">{matchdaysOnBench}J</p>
            <p className="text-pitch-600 text-[10px]">en el banco</p>
          </div>
        </div>

        <p className="text-pitch-400 text-sm mb-5 leading-relaxed">
          {playerName} lleva {matchdaysOnBench} jornada{matchdaysOnBench !== 1 ? 's' : ''} en el banco y pide una explicación.
          ¿Cómo manejás la situación?
        </p>

        {/* Options */}
        <div className="space-y-2.5">
          {OPTIONS.map((opt, i) => {
            const hintParts = opt.hint.split(' · ')
            return (
              <button
                key={i}
                onClick={() => respondToPlayerDiscontent(i)}
                className="w-full text-left rounded-xl bg-pitch-800 border border-pitch-700
                           px-4 py-3 active:bg-pitch-700 transition-colors"
              >
                <p className="text-white text-sm font-medium leading-snug mb-1.5">
                  "{opt.text}"
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {hintParts.map((h, j) => {
                    const isNeg = h.startsWith('-')
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
            )
          })}
        </div>

        <p className="text-pitch-700 text-[10px] text-center mt-4">
          Tu respuesta afecta la moral del equipo y la confianza de la dirigencia
        </p>
      </div>
    </div>
  )
}
