import { useState } from 'react'
import useGame from '../store/useGame.js'
import { LEAGUES } from '../data/gameData.js'
import { getTransferWindow, calcTransferValue } from '../engine/sim.js'

const POS_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#60a5fa', LI: '#60a5fa',
  MCD: '#22c55e', MCC: '#4ade80', MCO: '#86efac', EXT: '#a3e635',
  DEL: '#ef4444',
}

function fmtK(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  return `${sign}$${Math.round(abs / 1_000)}k`
}

function PosBadge({ pos }) {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
      style={{ background: (POS_COLORS[pos] || '#888') + '22', color: POS_COLORS[pos] || '#888' }}
    >
      {pos}
    </span>
  )
}

// ── Transfer window status banner ─────────────────────────────────────────────
function WindowBanner({ league }) {
  if (!league) return null
  if (league.completed) {
    return (
      <div className="rounded-xl bg-pitch-800 border border-pitch-700 px-3 py-2.5 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-pitch-600 shrink-0" />
        <p className="text-pitch-500 text-xs font-semibold">Temporada finalizada</p>
      </div>
    )
  }
  const win = getTransferWindow(league.currentMatchday, league.totalMatchdays)
  if (win.open) {
    return (
      <div className="rounded-xl bg-emerald-950/60 border border-emerald-600/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <p className="text-emerald-400 text-xs font-semibold">
            Ventana {win.type === 'verano' ? 'VERANO' : 'INVIERNO'} abierta
          </p>
        </div>
        <p className="text-emerald-700 text-[10px] mt-0.5 ml-4">
          JD actual: {league.currentMatchday} · cierra después de JD {win.closesAfterMd}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-pitch-800 border border-pitch-700 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-pitch-600 shrink-0" />
        <p className="text-pitch-500 text-xs font-semibold">Mercado cerrado</p>
      </div>
      {win.nextOpensAt !== null && (
        <p className="text-pitch-600 text-[10px] mt-0.5 ml-4">
          Próxima ventana: JD {win.nextOpensAt}
        </p>
      )}
    </div>
  )
}

// ── Offer sheet: bottom panel to place a bid ─────────────────────────────────
function OfferSheet({ player, club, myBudget, onSubmit, onClose }) {
  const value = calcTransferValue(player)
  const maxOffer = Math.max(0, Math.min(myBudget, Math.round(value * 1.50)))
  const minOffer = Math.round(value * 0.50)
  const [amount, setAmount] = useState(Math.min(Math.round(value * 0.90), maxOffer || minOffer))
  const ratio = value > 0 ? amount / value : 1
  const step = Math.max(5000, Math.round(value * 0.04))

  const ratioLabel = ratio < 0.65 ? 'rechazo seguro'
    : ratio < 0.80 ? 'probable rechazo'
    : ratio < 0.95 ? 'posible acuerdo'
    : 'buena oferta'
  const ratioColor = ratio < 0.65 ? 'text-red-400'
    : ratio < 0.80 ? 'text-orange-400'
    : ratio < 0.95 ? 'text-yellow-400'
    : 'text-emerald-400'

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[480px] mx-auto bg-pitch-900 border-t border-pitch-700 rounded-t-2xl px-4 pt-4 pb-8 z-10">
        <div className="w-8 h-1 bg-pitch-700 rounded-full mx-auto mb-4" />
        <div className="flex items-start gap-3 mb-5">
          <PosBadge pos={player.position} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{player.name}</p>
            <p className="text-pitch-500 text-[10px] truncate">{club.name} · {player.age}a · Habilidad {player.skill}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-gold-400 text-sm font-bold">{fmtK(value)}</p>
            <p className="text-pitch-600 text-[10px]">valor est.</p>
          </div>
        </div>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-pitch-400 text-xs">Tu oferta</span>
            <span className="text-white font-bold">{fmtK(amount)}</span>
          </div>
          <input
            type="range"
            min={minOffer}
            max={Math.max(minOffer, maxOffer)}
            step={step}
            value={Math.max(minOffer, Math.min(amount, maxOffer || minOffer))}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full accent-gold-400"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-pitch-600 text-[10px]">{fmtK(minOffer)}</span>
            <span className={`text-[10px] font-semibold ${ratioColor}`}>
              {Math.round(ratio * 100)}% — {ratioLabel}
            </span>
            <span className="text-pitch-600 text-[10px]">{fmtK(maxOffer)}</span>
          </div>
        </div>
        <button
          onClick={() => onSubmit(amount)}
          disabled={amount > myBudget || myBudget <= 0}
          className="w-full py-3 rounded-xl bg-gold-400 text-pitch-950 font-bold text-sm active:opacity-80 disabled:opacity-30"
        >
          {myBudget <= 0 ? 'Sin presupuesto'
            : amount > myBudget ? `Falta ${fmtK(amount - myBudget)}`
            : 'Enviar oferta'}
        </button>
      </div>
    </div>
  )
}

// ── Club row with expandable squad in "Fichar" tab ───────────────────────────
function ClubRow({ club, myBudget, isWindowOpen, onSelectPlayer }) {
  const [expanded, setExpanded] = useState(false)
  if (!club.squad?.length) return null
  const bySkill = [...club.squad].sort((a, b) => b.skill - a.skill)

  return (
    <div className="rounded-xl bg-pitch-800 border border-pitch-700 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 active:bg-pitch-750"
      >
        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: club.color || '#555' }} />
        <span className="text-white text-sm font-medium flex-1 text-left truncate">{club.name}</span>
        <span className="text-pitch-600 text-xs shrink-0">{bySkill.length} jug</span>
        <span className="text-pitch-500 text-[11px] ml-1">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-pitch-700 divide-y divide-pitch-700/40">
          {bySkill.map(player => {
            const tv = calcTransferValue(player)
            const canAfford = myBudget >= tv * 0.50
            const isUnavail = (player.injuredFor || 0) > 0 || (player.suspendedFor || 0) > 0
            return (
              <div key={player.id} className={`flex items-center gap-2 px-3 py-2 ${isUnavail ? 'opacity-50' : ''}`}>
                <PosBadge pos={player.position} />
                <span className="text-white text-xs flex-1 truncate">{player.name}</span>
                <span className="text-pitch-600 text-[10px] shrink-0">{player.age}a</span>
                <span className="text-gold-400 text-xs font-semibold shrink-0 w-6 text-center">{player.skill}</span>
                <span className="text-pitch-500 text-[10px] shrink-0 w-16 text-right">{fmtK(tv)}</span>
                {isWindowOpen ? (
                  <button
                    onClick={() => onSelectPlayer(player, club)}
                    disabled={!canAfford}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 active:opacity-70 disabled:opacity-30"
                  >
                    Ofertar
                  </button>
                ) : (
                  <span className="text-pitch-700 text-[10px] shrink-0 w-14 text-right">Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Incoming offer card (AI wants to buy one of my players) ──────────────────
function IncomingCard({ offer, mySquadSize, onRespond }) {
  const [mode, setMode] = useState('idle')
  const [counterAmt, setCounterAmt] = useState(Math.round(offer.amount * 1.20))
  const minCounter = Math.round(offer.amount * 1.01)
  const maxCounter = Math.round(offer.amount * 2.00)
  const step = Math.max(5000, Math.round(offer.amount * 0.05))
  const canSell = mySquadSize > 14

  return (
    <div className="rounded-xl bg-pitch-800 border border-orange-500/30 px-3 py-3">
      <div className="flex items-start gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <PosBadge pos={offer.playerPos} />
            <span className="text-white text-sm font-semibold truncate">{offer.playerName}</span>
          </div>
          <p className="text-pitch-500 text-xs">{offer.fromClubName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-gold-400 font-bold">{fmtK(offer.amount)}</p>
          <p className="text-pitch-600 text-[10px]">ofrecen</p>
        </div>
      </div>
      {!canSell && <p className="text-red-400/60 text-[10px] mb-2">Plantel mínimo — no podés vender</p>}
      {mode === 'idle' ? (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(offer.id, 'accept')}
            disabled={!canSell}
            className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 active:opacity-70 disabled:opacity-30"
          >
            Vender
          </button>
          <button
            onClick={() => setMode('counter')}
            className="flex-1 py-1.5 rounded-lg bg-gold-400/15 text-gold-400 text-xs font-semibold border border-gold-400/25 active:opacity-70"
          >
            Pedir más
          </button>
          <button
            onClick={() => onRespond(offer.id, 'reject')}
            className="flex-1 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold border border-red-500/25 active:opacity-70"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-pitch-400 text-xs">Pedís</span>
            <span className="text-white font-bold">{fmtK(counterAmt)}</span>
          </div>
          <input
            type="range"
            min={minCounter}
            max={maxCounter}
            step={step}
            value={counterAmt}
            onChange={e => setCounterAmt(Number(e.target.value))}
            className="w-full accent-gold-400"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { onRespond(offer.id, 'counter', counterAmt); setMode('idle') }}
              className="flex-1 py-1.5 rounded-lg bg-gold-400 text-pitch-950 text-xs font-bold active:opacity-70"
            >
              Negociar {fmtK(counterAmt)}
            </button>
            <button onClick={() => setMode('idle')} className="py-1.5 px-3 rounded-lg bg-pitch-700 text-pitch-400 text-xs active:opacity-70">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Outgoing offer card (AI countered my bid) ────────────────────────────────
function OutgoingCard({ offer, myBudget, onRespond }) {
  const [mode, setMode] = useState('idle')
  const base = offer.counterAmount || offer.amount
  const [bidAmt, setBidAmt] = useState(base)
  const maxBid = Math.min(myBudget, Math.round(base * 1.25))
  const step = Math.max(5000, Math.round(base * 0.04))
  const canAccept = myBudget >= (offer.counterAmount || 0)

  return (
    <div className="rounded-xl bg-pitch-800 border border-blue-500/30 px-3 py-3">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <PosBadge pos={offer.playerPos} />
            <span className="text-white text-sm font-semibold truncate">{offer.playerName}</span>
          </div>
          <p className="text-pitch-500 text-xs truncate">{offer.toClubName}</p>
        </div>
        <span className="ml-1 shrink-0 text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded px-1.5 py-0.5 font-semibold">
          Ronda {offer.round}/3
        </span>
      </div>
      <div className="flex items-center justify-between text-xs mb-3 bg-pitch-900/60 rounded-lg px-2.5 py-2">
        <span className="text-pitch-500">Tu oferta: <span className="text-white font-semibold">{fmtK(offer.amount)}</span></span>
        <span className="text-orange-400 font-semibold">Piden: {fmtK(offer.counterAmount)}</span>
      </div>
      {mode === 'idle' ? (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(offer.id, 'accept')}
            disabled={!canAccept}
            className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 active:opacity-70 disabled:opacity-30"
          >
            Aceptar {fmtK(offer.counterAmount)}
          </button>
          {offer.round < 3 && (
            <button
              onClick={() => setMode('rebid')}
              className="flex-1 py-1.5 rounded-lg bg-gold-400/15 text-gold-400 text-xs font-semibold border border-gold-400/25 active:opacity-70"
            >
              Contraofertar
            </button>
          )}
          <button
            onClick={() => onRespond(offer.id, 'reject')}
            className="flex-1 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold border border-red-500/25 active:opacity-70"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-pitch-400 text-xs">Tu nueva oferta</span>
            <span className="text-white font-bold">{fmtK(bidAmt)}</span>
          </div>
          <input
            type="range"
            min={offer.amount}
            max={Math.max(offer.amount, maxBid)}
            step={step}
            value={Math.min(bidAmt, maxBid)}
            onChange={e => setBidAmt(Number(e.target.value))}
            className="w-full accent-gold-400"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { onRespond(offer.id, 'counter', bidAmt); setMode('idle') }}
              disabled={bidAmt > myBudget}
              className="flex-1 py-1.5 rounded-lg bg-gold-400 text-pitch-950 text-xs font-bold active:opacity-70 disabled:opacity-30"
            >
              Enviar {fmtK(bidAmt)}
            </button>
            <button onClick={() => setMode('idle')} className="py-1.5 px-3 rounded-lg bg-pitch-700 text-pitch-400 text-xs active:opacity-70">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MarketScreen() {
  const [activeTab, setActiveTab] = useState('agentes')
  const [expandedLeague, setExpandedLeague] = useState('liga-premier')
  const [offerTarget, setOfferTarget] = useState(null)

  const currentJob    = useGame(s => s.currentJob)
  const clubs         = useGame(s => s.clubs)
  const freeAgents    = useGame(s => s.freeAgents)
  const leagues       = useGame(s => s.leagues)
  const foreignLeague = useGame(s => s.foreignLeague)
  const transferOffers = useGame(s => s.transferOffers)
  const aiTransferLog  = useGame(s => s.aiTransferLog)

  const buyPlayer            = useGame(s => s.buyPlayer)
  const sellPlayer           = useGame(s => s.sellPlayer)
  const makeTransferOffer    = useGame(s => s.makeTransferOffer)
  const respondToOutgoingOffer = useGame(s => s.respondToOutgoingOffer)
  const respondToIncomingOffer = useGame(s => s.respondToIncomingOffer)

  if (!currentJob) return null
  const myClub = clubs.find(c => c.id === currentJob.clubId)
  if (!myClub) return null

  const activeLg    = foreignLeague || leagues[myClub.leagueId]
  const winStatus   = activeLg ? getTransferWindow(activeLg.currentMatchday, activeLg.totalMatchdays) : null
  const isWindowOpen = !!(winStatus?.open && !activeLg?.completed)

  const pending   = transferOffers.filter(o => o.status === 'pending' || o.status === 'countered')
  const incoming  = pending.filter(o => o.type === 'incoming')
  const outgoing  = pending.filter(o => o.type === 'outgoing')

  const argClubs = clubs.filter(c => LEAGUES.some(l => l.id === c.leagueId) && c.id !== currentJob.clubId)

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      <WindowBanner league={activeLg} />

      {/* Budget */}
      <div className="flex items-center justify-between">
        <p className="text-pitch-500 text-xs">Presupuesto disponible</p>
        <p className={`text-sm font-bold ${myClub.budget < 0 ? 'text-red-400' : 'text-gold-400'}`}>
          {fmtK(myClub.budget)}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl overflow-hidden border border-pitch-700">
        {[
          { id: 'agentes', label: 'Agentes' },
          { id: 'fichar',  label: 'Fichar'  },
          { id: 'ofertas', label: 'Ofertas', badge: pending.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex-1 py-2 text-xs font-semibold ${activeTab === t.id ? 'bg-gold-400 text-pitch-950' : 'bg-pitch-800 text-pitch-500'}`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className={`absolute top-1 right-1.5 min-w-[15px] h-[15px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 ${activeTab === t.id ? 'bg-pitch-950 text-gold-400' : 'bg-red-500 text-white'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Agentes ─────────────────────────────────────────────────────────── */}
      {activeTab === 'agentes' && (
        <div className="space-y-2">
          {/* Free agents (window-gated) */}
          <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider">
            Agentes libres ({freeAgents.length})
          </p>
          {!isWindowOpen ? (
            <div className="rounded-xl bg-pitch-800 border border-pitch-700 px-4 py-5 text-center">
              <p className="text-pitch-500 text-sm">Mercado cerrado</p>
              {winStatus?.nextOpensAt != null
                ? <p className="text-pitch-600 text-xs mt-1">Podés contratar libres desde JD {winStatus.nextOpensAt}</p>
                : <p className="text-pitch-600 text-xs mt-1">Esperá la próxima temporada</p>
              }
            </div>
          ) : freeAgents.length === 0 ? (
            <div className="rounded-xl bg-pitch-800 border border-pitch-700 px-4 py-5 text-center">
              <p className="text-pitch-600 text-sm">No hay agentes disponibles</p>
            </div>
          ) : (
            [...freeAgents].sort((a, b) => b.skill - a.skill).map(player => {
              const tv = calcTransferValue(player)
              const canAfford = myClub.budget >= tv && myClub.budget > 0
              return (
                <div key={player.id} className="rounded-xl bg-pitch-800 border border-pitch-700 px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <PosBadge pos={player.position} />
                    <span className="text-white text-sm font-medium flex-1 truncate">{player.name}</span>
                    <span className="text-pitch-600 text-xs shrink-0">{player.age}a</span>
                    <span className="text-gold-400 text-xs font-semibold shrink-0">{player.skill}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-pitch-500 text-xs">{fmtK(tv)}</span>
                    <button
                      onClick={() => buyPlayer(player.id)}
                      disabled={!canAfford}
                      className="text-xs font-semibold px-3 py-1 rounded-lg active:opacity-70 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 disabled:opacity-30"
                    >
                      {canAfford ? 'Contratar' : 'Sin presupuesto'}
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* My squad - always visible, release always allowed */}
          <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mt-4">
            Tu plantel ({myClub.squad.length} jugadores)
          </p>
          {[...myClub.squad].sort((a, b) => a.skill - b.skill).map(player => (
            <div key={player.id} className="rounded-xl bg-pitch-800 border border-pitch-700 px-3 py-2.5">
              <div className="flex items-center gap-2 mb-2">
                <PosBadge pos={player.position} />
                <span className="text-white text-sm font-medium flex-1 truncate">{player.name}</span>
                <span className="text-pitch-600 text-xs shrink-0">{player.age}a</span>
                <span className="text-gold-400 text-xs font-semibold shrink-0">{player.skill}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-pitch-500 text-xs">{fmtK(calcTransferValue(player))}</span>
                <button
                  onClick={() => sellPlayer(player.id)}
                  disabled={myClub.squad.length <= 14}
                  className="text-xs font-semibold px-3 py-1 rounded-lg active:opacity-70 bg-red-500/15 text-red-400 border border-red-500/20 disabled:opacity-30"
                >
                  Liberar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Fichar ──────────────────────────────────────────────────────────── */}
      {activeTab === 'fichar' && (
        <div className="space-y-3">
          {!isWindowOpen && (
            <div className="rounded-xl bg-pitch-800 border border-pitch-700 px-4 py-4 text-center">
              <p className="text-pitch-500 text-sm">Mercado cerrado</p>
              <p className="text-pitch-600 text-xs mt-1">Podés ver planteles pero no hacer ofertas</p>
            </div>
          )}
          {LEAGUES.map(lg => {
            const lgClubs = argClubs.filter(c => c.leagueId === lg.id)
            const isExpanded = expandedLeague === lg.id
            return (
              <div key={lg.id}>
                <button
                  onClick={() => setExpandedLeague(isExpanded ? null : lg.id)}
                  className="w-full flex items-center justify-between mb-2 py-1"
                >
                  <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider">{lg.name}</p>
                  <span className="text-pitch-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="space-y-2">
                    {lgClubs.map(club => (
                      <ClubRow
                        key={club.id}
                        club={club}
                        myBudget={myClub.budget}
                        isWindowOpen={isWindowOpen}
                        onSelectPlayer={(player, club) => setOfferTarget({ player, club })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Ofertas ─────────────────────────────────────────────────────────── */}
      {activeTab === 'ofertas' && (
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider">
                Ofertas por tus jugadores ({incoming.length})
              </p>
              {incoming.map(offer => (
                <IncomingCard
                  key={offer.id}
                  offer={offer}
                  mySquadSize={myClub.squad.length}
                  onRespond={respondToIncomingOffer}
                />
              ))}
            </div>
          )}

          {outgoing.length > 0 && (
            <div className="space-y-2">
              <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider">
                Negociaciones en curso ({outgoing.length})
              </p>
              {outgoing.map(offer => (
                <OutgoingCard
                  key={offer.id}
                  offer={offer}
                  myBudget={myClub.budget}
                  onRespond={respondToOutgoingOffer}
                />
              ))}
            </div>
          )}

          {pending.length === 0 && (
            <div className="rounded-2xl bg-pitch-800 border border-pitch-700 px-4 py-6 text-center">
              <p className="text-pitch-500 text-sm">Sin ofertas activas</p>
              <p className="text-pitch-600 text-xs mt-1">
                {isWindowOpen
                  ? 'Hacé una oferta desde la pestaña Fichar o esperá que te contacten'
                  : 'Las ofertas aparecen cuando el mercado está abierto'}
              </p>
            </div>
          )}

          {aiTransferLog.length > 0 && (
            <div className="space-y-2 mt-2">
              <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider">
                Movimientos del mercado
              </p>
              <div className="rounded-xl bg-pitch-800 border border-pitch-700 px-3 py-2.5 space-y-2 max-h-52 overflow-y-auto">
                {aiTransferLog.slice(0, 15).map((entry, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-pitch-600 text-[9px] shrink-0 mt-0.5 w-6">T{entry.season}</span>
                    <p className="text-pitch-400 text-[10px] leading-relaxed">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offer sheet (modal bottom sheet) */}
      {offerTarget && (
        <OfferSheet
          player={offerTarget.player}
          club={offerTarget.club}
          myBudget={myClub.budget}
          onSubmit={(amount) => {
            makeTransferOffer(offerTarget.club.id, offerTarget.player.id, amount)
            setOfferTarget(null)
            setActiveTab('ofertas')
          }}
          onClose={() => setOfferTarget(null)}
        />
      )}
    </div>
  )
}
