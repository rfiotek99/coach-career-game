import { useState } from 'react'
import useGame from '../store/useGame.js'
import { LEAGUES, POSITION_ROLE } from '../data/gameData.js'
import { getTransferWindow, calcTransferValue } from '../engine/sim.js'
import { COUNTRIES, getCountryLeagues, getWorldClubsByLeague } from '../data/worldData.js'
import ScreenTip from '../components/ScreenTip.jsx'

const POS_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#60a5fa', LI: '#60a5fa',
  MCD: '#22c55e', MCC: '#4ade80', MCO: '#86efac', EXT: '#a3e635',
  DEL: '#ef4444',
}

// ── Filtros de búsqueda (pestaña Fichar) ──────────────────────────────────────
// Categorías amplias reusando POSITION_ROLE (POR→gk, CAR/LD/LI→def,
// MCD/MCC/MCO/EXT→mid, DEL→fwd) — el mismo mapeo que ya usa el motor de
// simulación, no inventamos una segunda clasificación.
const POSITION_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'gk',    label: 'Arquero' },
  { id: 'def',   label: 'Defensor' },
  { id: 'mid',   label: 'Mediocampista' },
  { id: 'fwd',   label: 'Delantero' },
]

const AGE_FILTERS = [
  { id: 'todas', label: 'Todas', test: () => true },
  { id: 'sub21', label: '≤21',   test: age => age <= 21 },
  { id: '22-28', label: '22-28', test: age => age >= 22 && age <= 28 },
  { id: '29+',   label: '29+',   test: age => age >= 29 },
]

const VALUE_FILTERS = [
  { id: 'todos', label: 'Todos',       test: () => true },
  { id: 'bajo',  label: '< $150k',     test: v => v < 150_000 },
  { id: 'medio', label: '$150k-500k',  test: v => v >= 150_000 && v < 500_000 },
  { id: 'alto',  label: '$500k-1.2M',  test: v => v >= 500_000 && v < 1_200_000 },
  { id: 'top',   label: '> $1.2M',     test: v => v >= 1_200_000 },
]

const SORT_OPTIONS = [
  { id: 'skill', label: 'Habilidad' },
  { id: 'value', label: 'Valor' },
]

function fmtK(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  return `${sign}$${Math.round(abs / 1_000)}k`
}

// ── Amount stepper: reemplaza el slider de "arrastrar" por −/+ al estilo
// FIFA — arranca en el valor de referencia (lo decide cada caller), suma o
// resta `step` por toque, y el número del medio se puede tocar para escribir
// un monto a mano si hace falta algo muy puntual. Misma lógica de bounds que
// antes (min/max los sigue calculando cada caller, acá solo se respetan).
function AmountStepper({ value, onChange, min, max, step }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const clamp = n => Math.max(min, Math.min(max, n))

  const startEdit = () => {
    setDraft(String(value))
    setEditing(true)
  }
  const commitEdit = () => {
    const parsed = Math.round(Number(draft))
    onChange(clamp(Number.isFinite(parsed) ? parsed : value))
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="w-10 h-10 shrink-0 rounded-lg bg-carbon-high text-ink-dim font-data text-lg font-bold active:bg-line disabled:opacity-30"
      >
        −
      </button>
      {editing ? (
        <input
          type="number"
          autoFocus
          inputMode="numeric"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="flex-1 min-w-0 text-center bg-carbon-raised border border-volt rounded-lg py-2 font-data text-ink font-bold text-base"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="flex-1 min-w-0 text-center font-data text-ink font-bold text-base py-2 rounded-lg bg-carbon-raised border border-line active:bg-carbon-high"
        >
          {fmtK(value)}
        </button>
      )}
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="w-10 h-10 shrink-0 rounded-lg bg-carbon-high text-ink-dim font-data text-lg font-bold active:bg-line disabled:opacity-30"
      >
        +
      </button>
    </div>
  )
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

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-2.5 py-1 rounded-lg font-data text-[11px] font-semibold whitespace-nowrap ${
        active ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint border border-line'
      }`}
    >
      {children}
    </button>
  )
}

// ── Barra de filtros de búsqueda ──────────────────────────────────────────────
function FilterBar({ position, setPosition, age, setAge, value, setValue, sortBy, sortDir, onSort }) {
  return (
    <div className="space-y-2 rounded-lg bg-carbon-raised border border-line p-2.5">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {POSITION_FILTERS.map(f => (
          <Chip key={f.id} active={position === f.id} onClick={() => setPosition(f.id)}>{f.label}</Chip>
        ))}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="font-data text-ink-faint text-[10px] shrink-0 w-9">Edad</span>
        {AGE_FILTERS.map(f => (
          <Chip key={f.id} active={age === f.id} onClick={() => setAge(f.id)}>{f.label}</Chip>
        ))}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="font-data text-ink-faint text-[10px] shrink-0 w-9">Valor</span>
        {VALUE_FILTERS.map(f => (
          <Chip key={f.id} active={value === f.id} onClick={() => setValue(f.id)}>{f.label}</Chip>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-data text-ink-faint text-[10px] shrink-0 w-9">Orden</span>
        {SORT_OPTIONS.map(s => (
          <Chip key={s.id} active={sortBy === s.id} onClick={() => onSort(s.id)}>
            {s.label} {sortBy === s.id ? (sortDir === 'desc' ? '▼' : '▲') : ''}
          </Chip>
        ))}
      </div>
    </div>
  )
}

// ── Fila de jugador en la lista plana filtrada (muestra el club, a diferencia
// de las filas dentro de ClubRow que ya están agrupadas por club) ────────────
function FlatPlayerRow({ player, club, myBudget, isWindowOpen, onSelectPlayer }) {
  const tv = calcTransferValue(player)
  const canAfford = myBudget >= tv * 0.50
  const isUnavail = (player.injuredFor || 0) > 0 || (player.suspendedFor || 0) > 0
  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-lg bg-carbon-raised border border-line ${isUnavail ? 'opacity-50' : ''}`}>
      <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: club.color || '#888' }} />
      <PosBadge pos={player.position} />
      <div className="flex-1 min-w-0">
        <p className="text-ink text-sm font-medium truncate">{player.name}</p>
        <p className="font-data text-ink-faint text-[10px] truncate mt-0.5">{club.name}</p>
      </div>
      <span className="font-data text-ink-faint text-[10px] shrink-0">{player.age}a</span>
      <span className="font-data text-volt text-base font-extrabold shrink-0 w-7 text-center">{player.skill}</span>
      <span className="font-data text-ink-faint text-[10px] shrink-0 w-16 text-right">{fmtK(tv)}</span>
      {isWindowOpen ? (
        <button
          onClick={() => onSelectPlayer(player, club)}
          disabled={!canAfford}
          className="font-data text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 bg-volt-dim text-volt border border-volt active:opacity-70 disabled:opacity-30"
        >
          Ofertar
        </button>
      ) : (
        <span className="font-data text-ink-faint text-[10px] shrink-0 w-14 text-right">Cerrado</span>
      )}
    </div>
  )
}

// ── Transfer window status banner ─────────────────────────────────────────────
function WindowBanner({ league }) {
  if (!league) return null
  if (league.completed) {
    return (
      <div className="rounded-lg bg-carbon-raised border border-line px-3 py-2.5 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-ink-faint shrink-0" />
        <p className="font-data text-ink-dim text-xs font-semibold">Temporada finalizada</p>
      </div>
    )
  }
  const win = getTransferWindow(league.currentMatchday, league.totalMatchdays)
  if (win.open) {
    return (
      <div className="rounded-lg bg-volt-dim border border-volt px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-volt shrink-0 animate-pulse" />
          <p className="font-data text-volt text-xs font-semibold">
            Ventana {win.type === 'verano' ? 'VERANO' : 'INVIERNO'} abierta
          </p>
        </div>
        <p className="font-data text-volt text-[10px] mt-0.5 ml-4 opacity-70">
          JD actual: {league.currentMatchday} · cierra después de JD {win.closesAfterMd}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-lg bg-carbon-raised border border-line px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-ink-faint shrink-0" />
        <p className="font-data text-ink-dim text-xs font-semibold">Mercado cerrado</p>
      </div>
      {win.nextOpensAt !== null && (
        <p className="font-data text-ink-faint text-[10px] mt-0.5 ml-4">
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
  const ratioColor = ratio < 0.65 ? 'text-magenta'
    : ratio < 0.80 ? 'text-warn'
    : ratio < 0.95 ? 'text-warn'
    : 'text-volt'

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[480px] mx-auto bg-carbon border-t border-line rounded-t-2xl px-4 pt-4 pb-8 z-10">
        <div className="w-8 h-1 bg-line rounded-full mx-auto mb-4" />
        <div className="flex items-start gap-3 mb-5">
          <PosBadge pos={player.position} />
          <div className="flex-1 min-w-0">
            <p className="text-ink font-semibold text-sm truncate">{player.name}</p>
            <p className="font-data text-ink-faint text-[10px] truncate">{club.name} · {player.age}a · Habilidad {player.skill}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-data text-volt text-sm font-bold">{fmtK(value)}</p>
            <p className="font-data text-ink-faint text-[10px]">valor est.</p>
          </div>
        </div>
        <div className="mb-5">
          <span className="font-data text-ink-dim text-xs mb-2 block">Tu oferta</span>
          <AmountStepper
            value={amount}
            onChange={setAmount}
            min={minOffer}
            max={Math.max(minOffer, maxOffer)}
            step={step}
          />
          <div className="flex justify-between mt-1.5">
            <span className="font-data text-ink-faint text-[10px]">{fmtK(minOffer)}</span>
            <span className={`font-data text-[10px] font-semibold ${ratioColor}`}>
              {Math.round(ratio * 100)}% — {ratioLabel}
            </span>
            <span className="font-data text-ink-faint text-[10px]">{fmtK(maxOffer)}</span>
          </div>
        </div>
        <button
          onClick={() => onSubmit(amount)}
          disabled={amount > myBudget || myBudget <= 0}
          className="btn-volt clip-cut w-full py-3 text-sm active:opacity-80 disabled:opacity-30"
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
// `onExpand` (opcional): se dispara al abrir por primera vez — lo usan los
// clubes del mundo para generar su plantel bajo demanda (ver ensureWorldClubSquad).
// `onSellHere` (opcional, solo Mundo): abre el flujo de "ofrecer uno de mis
// jugadores a este club" — oferta simple, sin rondas de negociación.
function ClubRow({ club, myBudget, isWindowOpen, onSelectPlayer, onExpand, onSellHere, canSellHere }) {
  const [expanded, setExpanded] = useState(false)
  const squad = club.squad || []
  const bySkill = [...squad].sort((a, b) => b.skill - a.skill)

  return (
    <div className="rounded-lg bg-carbon-raised border border-line overflow-hidden">
      <button
        onClick={() => { if (!expanded) onExpand?.(); setExpanded(e => !e) }}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 active:bg-carbon-high"
      >
        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: club.color || '#555' }} />
        <span className="text-ink text-sm font-semibold flex-1 text-left truncate">{club.name}</span>
        <span className="font-data text-ink-faint text-xs shrink-0">
          {bySkill.length ? `${bySkill.length} jug` : `⭐ ${club.prestige}`}
        </span>
        <span className="font-data text-ink-dim text-[11px] ml-1">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && bySkill.length === 0 && (
        <div className="border-t border-line px-3.5 py-3.5 text-center">
          <p className="font-data text-ink-faint text-xs">Sin plantel disponible</p>
        </div>
      )}
      {expanded && bySkill.length > 0 && (
        <div className="border-t border-line divide-y divide-line">
          {bySkill.map(player => {
            const tv = calcTransferValue(player)
            const canAfford = myBudget >= tv * 0.50
            const isUnavail = (player.injuredFor || 0) > 0 || (player.suspendedFor || 0) > 0
            return (
              <div key={player.id} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${isUnavail ? 'opacity-50' : ''}`}>
                <PosBadge pos={player.position} />
                <span className="text-ink text-sm flex-1 truncate">{player.name}</span>
                <span className="font-data text-ink-faint text-[10px] shrink-0">{player.age}a</span>
                <span className="font-data text-volt text-sm font-extrabold shrink-0 w-7 text-center">{player.skill}</span>
                <span className="font-data text-ink-faint text-[10px] shrink-0 w-16 text-right">{fmtK(tv)}</span>
                {isWindowOpen ? (
                  <button
                    onClick={() => onSelectPlayer(player, club)}
                    disabled={!canAfford}
                    className="font-data text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 bg-volt-dim text-volt border border-volt active:opacity-70 disabled:opacity-30"
                  >
                    Ofertar
                  </button>
                ) : (
                  <span className="font-data text-ink-faint text-[10px] shrink-0 w-14 text-right">Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      )}
      {expanded && onSellHere && isWindowOpen && canSellHere && (
        <button
          onClick={() => onSellHere(club)}
          className="w-full text-center font-data text-xs font-semibold text-volt py-2.5 border-t border-line active:bg-carbon-high"
        >
          Ofrecer uno de mis jugadores acá →
        </button>
      )}
    </div>
  )
}

// ── Sell-to-world-club sheet: pick one of my players, then set an asking
// price. Oferta simple — el club acepta o rechaza en el momento, sin rondas.
function SellToWorldClubSheet({ club, mySquad, onSubmit, onClose }) {
  const [player, setPlayer] = useState(null)
  const [amount, setAmount] = useState(0)

  const value = player ? calcTransferValue(player) : 0
  const minAmount = Math.round(value * 0.50)
  const maxAmount = Math.round(value * 1.80)
  const step = Math.max(5000, Math.round(value * 0.04))

  const pickPlayer = p => {
    setPlayer(p)
    setAmount(Math.round(calcTransferValue(p) * 1.0))
  }

  if (!player) {
    const sorted = [...mySquad].sort((a, b) => b.skill - a.skill)
    return (
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <div className="relative w-full max-w-[480px] mx-auto bg-carbon border-t border-line rounded-t-2xl px-4 pt-4 pb-8 z-10 max-h-[75vh] overflow-y-auto">
          <div className="w-8 h-1 bg-line rounded-full mx-auto mb-4" />
          <p className="text-ink font-semibold text-sm mb-1">Ofrecer un jugador a {club.name}</p>
          <p className="font-data text-ink-faint text-xs mb-4">Elegí quién sale de tu plantel</p>
          <div className="space-y-1.5">
            {sorted.map(p => (
              <button
                key={p.id}
                onClick={() => pickPlayer(p)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-carbon-raised border border-line active:bg-carbon-high"
              >
                <PosBadge pos={p.position} />
                <span className="text-ink text-xs flex-1 text-left truncate">{p.name}</span>
                <span className="font-data text-ink-faint text-[10px] shrink-0">{p.age}a</span>
                <span className="font-data text-volt text-xs font-semibold shrink-0">{p.skill}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const ratio = value > 0 ? amount / value : 1
  const chanceLabel = ratio <= 1.10 ? 'buena chance' : ratio <= 1.25 ? 'chance media' : 'chance baja'
  const chanceColor = ratio <= 1.10 ? 'text-volt' : ratio <= 1.25 ? 'text-warn' : 'text-magenta'

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[480px] mx-auto bg-carbon border-t border-line rounded-t-2xl px-4 pt-4 pb-8 z-10">
        <div className="w-8 h-1 bg-line rounded-full mx-auto mb-4" />
        <div className="flex items-start gap-3 mb-5">
          <PosBadge pos={player.position} />
          <div className="flex-1 min-w-0">
            <p className="text-ink font-semibold text-sm truncate">{player.name}</p>
            <p className="font-data text-ink-faint text-[10px] truncate">a {club.name} · {player.age}a · Habilidad {player.skill}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-data text-volt text-sm font-bold">{fmtK(value)}</p>
            <p className="font-data text-ink-faint text-[10px]">valor est.</p>
          </div>
        </div>
        <div className="mb-5">
          <span className="font-data text-ink-dim text-xs mb-2 block">Tu precio</span>
          <AmountStepper
            value={amount}
            onChange={setAmount}
            min={minAmount}
            max={maxAmount}
            step={step}
          />
          <div className="flex justify-between mt-1.5">
            <span className="font-data text-ink-faint text-[10px]">{fmtK(minAmount)}</span>
            <span className={`font-data text-[10px] font-semibold ${chanceColor}`}>
              {Math.round(ratio * 100)}% — {chanceLabel}
            </span>
            <span className="font-data text-ink-faint text-[10px]">{fmtK(maxAmount)}</span>
          </div>
        </div>
        <button
          onClick={() => onSubmit(player.id, amount)}
          className="btn-volt clip-cut w-full py-3 text-sm active:opacity-80"
        >
          Ofrecer por {fmtK(amount)}
        </button>
      </div>
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
    <div className="rounded-lg bg-carbon-raised border border-warn px-4 py-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <PosBadge pos={offer.playerPos} />
            <span className="text-ink text-sm font-semibold truncate">{offer.playerName}</span>
          </div>
          <p className="font-data text-ink-faint text-xs">{offer.fromClubName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-data text-volt text-lg font-extrabold">{fmtK(offer.amount)}</p>
          <p className="font-data text-ink-faint text-[10px]">ofrecen</p>
        </div>
      </div>
      {!canSell && <p className="font-data text-magenta text-[10px] mb-2 opacity-70">Plantel mínimo — no podés vender</p>}
      {mode === 'idle' ? (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(offer.id, 'accept')}
            disabled={!canSell}
            className="flex-1 py-1.5 rounded-lg bg-volt-dim text-volt font-data text-xs font-semibold border border-volt active:opacity-70 disabled:opacity-30"
          >
            Vender
          </button>
          <button
            onClick={() => setMode('counter')}
            className="flex-1 py-1.5 rounded-lg bg-warn-dim text-warn font-data text-xs font-semibold border border-warn active:opacity-70"
          >
            Pedir más
          </button>
          <button
            onClick={() => onRespond(offer.id, 'reject')}
            className="flex-1 py-1.5 rounded-lg bg-magenta-dim text-magenta font-data text-xs font-semibold border border-magenta active:opacity-70"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <div>
          <span className="font-data text-ink-dim text-xs mb-1.5 block">Pedís</span>
          <AmountStepper
            value={counterAmt}
            onChange={setCounterAmt}
            min={minCounter}
            max={maxCounter}
            step={step}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { onRespond(offer.id, 'counter', counterAmt); setMode('idle') }}
              className="flex-1 py-1.5 rounded-lg bg-volt text-carbon font-data text-xs font-bold active:opacity-70"
            >
              Negociar {fmtK(counterAmt)}
            </button>
            <button onClick={() => setMode('idle')} className="py-1.5 px-3 rounded-lg bg-carbon-high text-ink-dim font-data text-xs active:opacity-70">
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
    <div className="rounded-lg bg-carbon-raised border border-warn px-4 py-4">
      <div className="flex items-start gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <PosBadge pos={offer.playerPos} />
            <span className="text-ink text-sm font-semibold truncate">{offer.playerName}</span>
          </div>
          <p className="font-data text-ink-faint text-xs truncate">{offer.toClubName}</p>
        </div>
        <span className="ml-1 shrink-0 font-data text-[10px] bg-warn-dim text-warn border border-warn rounded px-1.5 py-0.5 font-semibold">
          Ronda {offer.round}/3
        </span>
      </div>
      <div className="flex items-center justify-between text-xs mb-3.5 bg-carbon-high rounded-lg px-3 py-2.5">
        <span className="font-data text-ink-faint">Tu oferta: <span className="text-ink font-semibold">{fmtK(offer.amount)}</span></span>
        <span className="font-data text-warn text-sm font-bold">Piden: {fmtK(offer.counterAmount)}</span>
      </div>
      {mode === 'idle' ? (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(offer.id, 'accept')}
            disabled={!canAccept}
            className="flex-1 py-1.5 rounded-lg bg-volt-dim text-volt font-data text-xs font-semibold border border-volt active:opacity-70 disabled:opacity-30"
          >
            Aceptar {fmtK(offer.counterAmount)}
          </button>
          {offer.round < 3 && (
            <button
              onClick={() => setMode('rebid')}
              className="flex-1 py-1.5 rounded-lg bg-warn-dim text-warn font-data text-xs font-semibold border border-warn active:opacity-70"
            >
              Contraofertar
            </button>
          )}
          <button
            onClick={() => onRespond(offer.id, 'reject')}
            className="flex-1 py-1.5 rounded-lg bg-magenta-dim text-magenta font-data text-xs font-semibold border border-magenta active:opacity-70"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div>
          <span className="font-data text-ink-dim text-xs mb-1.5 block">Tu nueva oferta</span>
          <AmountStepper
            value={Math.min(bidAmt, maxBid)}
            onChange={setBidAmt}
            min={offer.amount}
            max={Math.max(offer.amount, maxBid)}
            step={step}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { onRespond(offer.id, 'counter', bidAmt); setMode('idle') }}
              disabled={bidAmt > myBudget}
              className="flex-1 py-1.5 rounded-lg bg-volt text-carbon font-data text-xs font-bold active:opacity-70 disabled:opacity-30"
            >
              Enviar {fmtK(bidAmt)}
            </button>
            <button onClick={() => setMode('idle')} className="py-1.5 px-3 rounded-lg bg-carbon-high text-ink-dim font-data text-xs active:opacity-70">
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
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [expandedWorldLeague, setExpandedWorldLeague] = useState(null)
  const [sellTarget, setSellTarget] = useState(null)

  // ── Búsqueda con filtros (pestaña Fichar) ───────────────────────────────────
  // 'browse' = acordeón liga/club de siempre (sin cambios). 'buscar' = lista
  // plana filtrada/ordenada. filterCountry: null = Nacional, o un id de
  // COUNTRIES para buscar dentro de ese país del Mundo.
  const [ficharMode, setFicharMode] = useState('browse')
  const [filterCountry, setFilterCountry] = useState(null)
  const [posFilter, setPosFilter] = useState('todos')
  const [ageFilter, setAgeFilter] = useState('todas')
  const [valueFilter, setValueFilter] = useState('todos')
  const [sortBy, setSortBy] = useState('skill')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (id) => {
    if (sortBy === id) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(id); setSortDir('desc') }
  }

  const currentJob    = useGame(s => s.currentJob)
  const clubs         = useGame(s => s.clubs)
  const freeAgents    = useGame(s => s.freeAgents)
  const leagues       = useGame(s => s.leagues)
  const foreignLeague = useGame(s => s.foreignLeague)
  const transferOffers = useGame(s => s.transferOffers)
  const aiTransferLog  = useGame(s => s.aiTransferLog)
  const marketRumors   = useGame(s => s.marketRumors)
  const worldClubSquads = useGame(s => s.worldClubSquads)

  const buyPlayer            = useGame(s => s.buyPlayer)
  const sellPlayer           = useGame(s => s.sellPlayer)
  const makeTransferOffer    = useGame(s => s.makeTransferOffer)
  const respondToOutgoingOffer = useGame(s => s.respondToOutgoingOffer)
  const respondToIncomingOffer = useGame(s => s.respondToIncomingOffer)
  const ensureWorldClubSquad   = useGame(s => s.ensureWorldClubSquad)
  const ensureWorldLeagueSquads = useGame(s => s.ensureWorldLeagueSquads)
  const offerPlayerToWorldClub = useGame(s => s.offerPlayerToWorldClub)

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

  // ── Pool para "Buscar con filtros" ──────────────────────────────────────────
  // Nacional: argClubs ya tienen plantel real siempre cargado. Mundo: clubes
  // del país elegido, con el plantel que haya en worldClubSquads (el chip de
  // país ya dispara ensureWorldLeagueSquads para todas sus ligas al elegirlo).
  const searchClubs = filterCountry === null
    ? argClubs
    : getCountryLeagues(filterCountry).flatMap(lg => getWorldClubsByLeague(lg.id)).filter(c => c.id !== currentJob.clubId)

  const searchClubsWithSquad = filterCountry === null
    ? searchClubs
    : searchClubs.map(c => ({ ...c, squad: worldClubSquads[c.id] || [] }))

  const ageTest = AGE_FILTERS.find(f => f.id === ageFilter)?.test || (() => true)
  const valueTest = VALUE_FILTERS.find(f => f.id === valueFilter)?.test || (() => true)

  const filteredPlayers = searchClubsWithSquad.flatMap(club =>
    (club.squad || [])
      .filter(p => posFilter === 'todos' || POSITION_ROLE[p.position] === posFilter)
      .filter(p => ageTest(p.age))
      .filter(p => valueTest(calcTransferValue(p)))
      .map(p => ({ player: p, club }))
  )
  const sortMult = sortDir === 'desc' ? -1 : 1
  filteredPlayers.sort((a, b) => {
    const va = sortBy === 'skill' ? a.player.skill : calcTransferValue(a.player)
    const vb = sortBy === 'skill' ? b.player.skill : calcTransferValue(b.player)
    return (va - vb) * sortMult
  })

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      <ScreenTip screenKey="market">
        El mercado de pases: fichá agentes libres o negociá con otros clubes para reforzar tu plantel.
      </ScreenTip>
      <WindowBanner league={activeLg} />

      {/* Budget */}
      <div className="flex items-center justify-between">
        <p className="font-data text-ink-faint text-xs">Presupuesto disponible</p>
        <p className={`font-data text-sm font-bold ${myClub.budget < 0 ? 'text-magenta' : 'text-volt'}`}>
          {fmtK(myClub.budget)}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-lg overflow-hidden border border-line">
        {[
          { id: 'agentes', label: 'Agentes' },
          { id: 'fichar',  label: 'Fichar'  },
          { id: 'ofertas', label: 'Ofertas', badge: pending.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex-1 py-2 font-data text-xs font-semibold ${activeTab === t.id ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint'}`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className={`absolute top-1 right-1.5 min-w-[15px] h-[15px] rounded-full font-data text-[9px] font-bold flex items-center justify-center px-0.5 ${activeTab === t.id ? 'bg-carbon text-volt' : 'bg-magenta text-ink'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Agentes ─────────────────────────────────────────────────────────── */}
      {activeTab === 'agentes' && (
        <div className="space-y-2.5">
          {/* Free agents (window-gated) */}
          <p className="section-label">
            Agentes libres ({freeAgents.length})
          </p>
          {!isWindowOpen ? (
            <div className="rounded-lg bg-carbon-raised border border-line px-4 py-5 text-center">
              <p className="font-data text-ink-dim text-sm">Mercado cerrado</p>
              {winStatus?.nextOpensAt != null
                ? <p className="font-data text-ink-faint text-xs mt-1">Podés contratar libres desde JD {winStatus.nextOpensAt}</p>
                : <p className="font-data text-ink-faint text-xs mt-1">Esperá la próxima temporada</p>
              }
            </div>
          ) : freeAgents.length === 0 ? (
            <div className="rounded-lg bg-carbon-raised border border-line px-4 py-5 text-center">
              <p className="font-data text-ink-faint text-sm">No hay agentes disponibles</p>
            </div>
          ) : (
            [...freeAgents].sort((a, b) => b.skill - a.skill).map(player => {
              const tv = calcTransferValue(player)
              const canAfford = myClub.budget >= tv && myClub.budget > 0
              return (
                <div key={player.id} className="rounded-lg bg-carbon-raised border border-line px-3.5 py-3">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <PosBadge pos={player.position} />
                    <span className="text-ink text-sm font-medium flex-1 truncate">{player.name}</span>
                    <span className="font-data text-ink-faint text-xs shrink-0">{player.age}a</span>
                    <span className="font-data text-volt text-lg font-extrabold shrink-0">{player.skill}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-data text-ink-faint text-xs">{fmtK(tv)}</span>
                    <button
                      onClick={() => buyPlayer(player.id)}
                      disabled={!canAfford}
                      className="font-data text-xs font-semibold px-3 py-1.5 rounded-lg active:opacity-70 bg-volt-dim text-volt border border-volt disabled:opacity-30"
                    >
                      {canAfford ? 'Contratar' : 'Sin presupuesto'}
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* My squad - always visible, release always allowed */}
          <p className="section-label mt-5">
            Tu plantel ({myClub.squad.length} jugadores)
          </p>
          {[...myClub.squad].sort((a, b) => a.skill - b.skill).map(player => (
            <div key={player.id} className="rounded-lg bg-carbon-raised border border-line px-3.5 py-3">
              <div className="flex items-center gap-2.5 mb-2.5">
                <PosBadge pos={player.position} />
                <span className="text-ink text-sm font-medium flex-1 truncate">{player.name}</span>
                <span className="font-data text-ink-faint text-xs shrink-0">{player.age}a</span>
                <span className="font-data text-volt text-lg font-extrabold shrink-0">{player.skill}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-data text-ink-faint text-xs">{fmtK(calcTransferValue(player))}</span>
                <button
                  onClick={() => sellPlayer(player.id)}
                  disabled={myClub.squad.length <= 14}
                  className="font-data text-xs font-semibold px-3 py-1.5 rounded-lg active:opacity-70 bg-magenta-dim text-magenta border border-magenta disabled:opacity-30"
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
            <div className="rounded-lg bg-carbon-raised border border-line px-4 py-4 text-center">
              <p className="font-data text-ink-dim text-sm">Mercado cerrado</p>
              <p className="font-data text-ink-faint text-xs mt-1">Podés ver planteles pero no hacer ofertas</p>
            </div>
          )}

          <div className="flex rounded-lg overflow-hidden border border-line">
            {[
              { id: 'browse', label: 'Explorar por club' },
              { id: 'buscar', label: '🔍 Buscar con filtros' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setFicharMode(m.id)}
                className={`flex-1 py-2 font-data text-xs font-semibold ${ficharMode === m.id ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {ficharMode === 'buscar' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Chip active={filterCountry === null} onClick={() => setFilterCountry(null)}>Nacional</Chip>
                {COUNTRIES.filter(c => c.id !== 'argentina').map(c => (
                  <Chip
                    key={c.id}
                    active={filterCountry === c.id}
                    onClick={() => {
                      setFilterCountry(c.id)
                      getCountryLeagues(c.id).forEach(lg => ensureWorldLeagueSquads(lg.id))
                    }}
                  >
                    {c.flag} {c.name}
                  </Chip>
                ))}
              </div>

              <FilterBar
                position={posFilter} setPosition={setPosFilter}
                age={ageFilter} setAge={setAgeFilter}
                value={valueFilter} setValue={setValueFilter}
                sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
              />

              <p className="font-data text-ink-faint text-[10px] px-1">
                {filteredPlayers.length} jugador{filteredPlayers.length !== 1 ? 'es' : ''} encontrado{filteredPlayers.length !== 1 ? 's' : ''}
              </p>

              {filteredPlayers.length === 0 ? (
                <div className="rounded-lg bg-carbon-raised border border-line px-4 py-6 text-center">
                  <p className="font-data text-ink-dim text-sm">Ningún jugador coincide con estos filtros</p>
                  {filterCountry !== null && (
                    <p className="font-data text-ink-faint text-xs mt-1">Si el país recién se generó, esperá un instante o probá otros filtros</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPlayers.map(({ player, club }) => (
                    <FlatPlayerRow
                      key={`${club.id}-${player.id}`}
                      player={player}
                      club={club}
                      myBudget={myClub.budget}
                      isWindowOpen={isWindowOpen}
                      onSelectPlayer={(p, c) => setOfferTarget({ player: p, club: c })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {ficharMode === 'browse' && <>
          {LEAGUES.map(lg => {
            const lgClubs = argClubs.filter(c => c.leagueId === lg.id)
            const isExpanded = expandedLeague === lg.id
            return (
              <div key={lg.id}>
                <button
                  onClick={() => setExpandedLeague(isExpanded ? null : lg.id)}
                  className="w-full flex items-center justify-between mb-2 py-1"
                >
                  <p className="section-label">{lg.name}</p>
                  <span className="font-data text-ink-faint text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="space-y-2.5">
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

          {/* ── Mundo: 9 países, planteles generados bajo demanda ──────────── */}
          <div className="pt-2">
            <p className="section-label mb-2">Mundo</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-2">
              {COUNTRIES.filter(c => c.id !== 'argentina').map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCountry(sc => sc === c.id ? null : c.id)
                    setExpandedWorldLeague(null)
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg font-data text-xs font-semibold ${
                    selectedCountry === c.id ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-faint border border-line'
                  }`}
                >
                  {c.flag} {c.name}
                </button>
              ))}
            </div>
            {selectedCountry && getCountryLeagues(selectedCountry).map(lg => {
              const lgClubs = getWorldClubsByLeague(lg.id)
              const isExpanded = expandedWorldLeague === lg.id
              return (
                <div key={lg.id} className="mb-2">
                  <button
                    onClick={() => setExpandedWorldLeague(isExpanded ? null : lg.id)}
                    className="w-full flex items-center justify-between mb-2 py-1"
                  >
                    <p className="section-label">{lg.name}</p>
                    <span className="font-data text-ink-faint text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-2">
                      {lgClubs.map(club => (
                        <ClubRow
                          key={club.id}
                          club={{ ...club, squad: worldClubSquads[club.id] }}
                          myBudget={myClub.budget}
                          isWindowOpen={isWindowOpen}
                          onSelectPlayer={(player, club) => setOfferTarget({ player, club })}
                          onExpand={() => ensureWorldClubSquad(club.id)}
                          onSellHere={c => setSellTarget(c)}
                          canSellHere={myClub.squad.length > 14}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </>}
        </div>
      )}

      {/* ── Ofertas ─────────────────────────────────────────────────────────── */}
      {activeTab === 'ofertas' && (
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div className="space-y-2">
              <p className="section-label">
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
              <p className="section-label">
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
            <div className="card-broadcast border border-line px-4 py-6 text-center">
              <p className="font-data text-ink-dim text-sm">Sin ofertas activas</p>
              <p className="font-data text-ink-faint text-xs mt-1">
                {isWindowOpen
                  ? 'Hacé una oferta desde la pestaña Fichar o esperá que te contacten'
                  : 'Las ofertas aparecen cuando el mercado está abierto'}
              </p>
            </div>
          )}

          {marketRumors.length > 0 && (
            <div className="space-y-2 mt-2">
              <p className="section-label">
                Rumores y novelas
              </p>
              <div className="rounded-lg bg-carbon-raised border border-line px-3 py-2.5 space-y-2 max-h-52 overflow-y-auto">
                {marketRumors.slice(0, 15).map(r => (
                  <div key={r.id} className="flex items-start gap-2">
                    <span
                      className={`font-data text-[9px] font-bold shrink-0 mt-0.5 px-1.5 py-0.5 rounded-full ${
                        r.status === 'pending' ? 'bg-warn-dim text-warn'
                        : r.status === 'confirmed' ? 'bg-volt-dim text-volt'
                        : 'bg-carbon-high text-ink-faint'
                      }`}
                    >
                      {r.status === 'pending' ? 'RUMOR' : r.status === 'confirmed' ? 'CONFIRMADO' : 'SE ENFRIÓ'}
                    </span>
                    <p className={`font-data text-[10px] leading-relaxed ${r.status === 'faded' ? 'text-ink-faint line-through' : 'text-ink-dim'}`}>
                      {r.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiTransferLog.length > 0 && (
            <div className="space-y-2 mt-2">
              <p className="section-label">
                Movimientos del mercado
              </p>
              <div className="rounded-lg bg-carbon-raised border border-line px-3 py-2.5 space-y-2 max-h-52 overflow-y-auto">
                {aiTransferLog.slice(0, 15).map((entry, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-data text-ink-faint text-[9px] shrink-0 mt-0.5 w-6">T{entry.season}</span>
                    <p className="font-data text-ink-dim text-[10px] leading-relaxed">{entry.text}</p>
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

      {/* Sell-to-world-club sheet (oferta simple, sin negociación) */}
      {sellTarget && (
        <SellToWorldClubSheet
          club={sellTarget}
          mySquad={myClub.squad}
          onSubmit={(playerId, amount) => {
            offerPlayerToWorldClub(playerId, sellTarget.id, amount)
            setSellTarget(null)
          }}
          onClose={() => setSellTarget(null)}
        />
      )}
    </div>
  )
}
