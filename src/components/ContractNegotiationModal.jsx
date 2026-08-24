import { useState } from 'react'
import useGame from '../store/useGame.js'
import { POSITION_COLORS as POS_COLORS } from '../data/gameData.js'

function fmtK(n) {
  return n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`
}

export default function ContractNegotiationModal() {
  const contractNegotiation = useGame(s => s.contractNegotiation)
  const clubs = useGame(s => s.clubs)
  const currentJob = useGame(s => s.currentJob)
  const respondContractNegotiation = useGame(s => s.respondContractNegotiation)

  const club = clubs.find(c => c.id === currentJob?.clubId)
  const player = club?.squad.find(p => p.id === contractNegotiation?.playerId)

  const [offerWage, setOfferWage] = useState(null)
  const [offerYears, setOfferYears] = useState(null)

  if (!contractNegotiation || !player) return null

  const { askWage, askYears, round, maxRounds } = contractNegotiation
  const wage = offerWage ?? askWage
  const years = offerYears ?? askYears
  const lastRound = round >= maxRounds
  const minWage = Math.round(player.contract.wage * 0.8)
  const maxWage = Math.round(askWage * 1.3)
  const step = Math.max(10, Math.round(askWage * 0.05))

  function respond(action) {
    respondContractNegotiation(action, wage, years)
    setOfferWage(null)
    setOfferYears(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(11,12,14,0.90)' }}>
      <div className="w-full bg-carbon border-t border-warn rounded-t-2xl p-5 slide-up" style={{ maxWidth: 480 }}>
        {/* Header — tenso, énfasis warn/magenta */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <span className="font-data text-warn text-xs font-bold uppercase tracking-wider">Negociación de contrato</span>
          </div>
          <span className={`font-data text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            lastRound ? 'bg-magenta-dim text-magenta border-magenta' : 'bg-warn-dim text-warn border-warn'
          }`}>
            {lastRound ? 'ÚLTIMA RONDA' : `RONDA ${round}/${maxRounds}`}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-4 mt-3">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: (POS_COLORS[player.position] || '#888') + '22',
              color: POS_COLORS[player.position] || '#888',
            }}
          >
            {player.position}
          </span>
          <span className="text-ink text-base font-semibold flex-1 truncate">{player.name}</span>
          <span className="font-data text-ink-faint text-xs">{player.age}a · skl {player.skill}</span>
        </div>

        <div className="flex items-center justify-between text-xs mb-4 bg-carbon-high rounded-lg px-3 py-2.5">
          <span className="font-data text-ink-faint">
            Contrato actual: <span className="text-ink font-semibold">{player.contract.yearsLeft}a · {fmtK(player.contract.wage)}/jor</span>
          </span>
          <span className="font-data text-magenta text-sm font-bold">Pide: {fmtK(askWage)}/jor · {askYears}a</span>
        </div>

        {/* Oferta */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-data text-ink-dim text-xs">Tu oferta</span>
          <span className="font-data text-ink font-bold">{fmtK(wage)}/jor · {years}a</span>
        </div>
        <input
          type="range"
          min={minWage}
          max={maxWage}
          step={step}
          value={Math.min(wage, maxWage)}
          onChange={e => setOfferWage(Number(e.target.value))}
          className="w-full accent-[#c8ff32]"
        />
        <div className="flex items-center justify-center gap-3 mt-2 mb-4">
          <button
            onClick={() => setOfferYears(Math.max(1, years - 1))}
            className="w-9 h-9 rounded-lg bg-carbon-high text-ink-dim font-data text-base font-bold active:bg-line"
          >
            −
          </button>
          <span className="font-data text-ink text-sm w-16 text-center">{years} año{years > 1 ? 's' : ''}</span>
          <button
            onClick={() => setOfferYears(Math.min(5, years + 1))}
            className="w-9 h-9 rounded-lg bg-carbon-high text-ink-dim font-data text-base font-bold active:bg-line"
          >
            +
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => respond('accept')}
            className="flex-1 py-2 rounded-lg bg-volt-dim text-volt font-data text-xs font-semibold border border-volt active:opacity-70"
          >
            Aceptar pedido
          </button>
          <button
            onClick={() => respond('counter')}
            disabled={lastRound}
            className="flex-1 py-2 rounded-lg bg-warn text-carbon font-data text-xs font-bold active:opacity-70 disabled:opacity-30"
          >
            Ofrecer {fmtK(wage)}
          </button>
          <button
            onClick={() => respond('reject')}
            className="flex-1 py-2 rounded-lg bg-magenta-dim text-magenta font-data text-xs font-semibold border border-magenta active:opacity-70"
          >
            Cortar
          </button>
        </div>

        {lastRound && (
          <p className="font-data text-magenta text-[10px] text-center mt-3">
            Última ronda — si no aceptás, {player.name.split(' ')[0]} se levanta de la mesa
          </p>
        )}
      </div>
    </div>
  )
}
