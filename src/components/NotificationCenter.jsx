import { useEffect } from 'react'
import useGame from '../store/useGame.js'

const CATEGORY_META = {
  board:     { icon: '🏢', label: 'Dirigencia',  color: '#3b82f6' },
  transfer:  { icon: '💰', label: 'Mercado',     color: '#f0b429' },
  player:    { icon: '🩹', label: 'Jugadores',   color: '#f97316' },
  market:    { icon: '🏪', label: 'Ventana',     color: '#34d399' },
  milestone: { icon: '🏆', label: 'Hito',        color: '#fcd34d' },
  interest:  { icon: '👀', label: 'Interés',     color: '#a78bfa' },
}

function fmtSalary(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(n / 1_000)}k`
}

function ActionButtons({ notif, onRespond, onDismiss }) {
  if (notif.actionType === 'coachOffer') {
    const { clubName, salary, prestige } = notif.actionPayload || {}
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-pitch-500 mb-1">
          <span>Salario: <span className="text-gold-400 font-bold">{fmtSalary(salary)}/jornada</span></span>
          <span>·</span>
          <span>Prestigio: <span className="text-white">{prestige}</span></span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(notif.id, true)}
            className="flex-1 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold active:bg-emerald-500/30"
          >
            ✓ Aceptar oferta
          </button>
          <button
            onClick={() => onRespond(notif.id, false)}
            className="flex-1 py-2 rounded-lg bg-pitch-700 border border-pitch-600 text-pitch-400 text-xs font-semibold active:bg-pitch-600"
          >
            ✕ Rechazar
          </button>
        </div>
      </div>
    )
  }
  return null
}

function NotifRow({ notif, onDismiss, onRespondCoachOffer }) {
  const meta = CATEGORY_META[notif.category] || CATEGORY_META.board
  const hasAction = notif.requiresAction

  return (
    <div
      className={`px-4 py-3 border-b border-pitch-800 ${hasAction ? 'bg-pitch-800/60' : ''}`}
      style={{ opacity: notif.read && !hasAction ? 0.65 : 1 }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm mt-0.5"
          style={{ background: meta.color + '22', border: `1px solid ${meta.color}44` }}
        >
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: meta.color + '22', color: meta.color }}
            >
              {meta.label}
            </span>
            {notif.matchday && (
              <span className="text-pitch-700 text-[10px]">J{notif.matchday} · T{notif.season}</span>
            )}
            {!notif.matchday && (
              <span className="text-pitch-700 text-[10px]">T{notif.season}</span>
            )}
            {hasAction && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gold-400/20 text-gold-400 ml-auto">
                Requiere decisión
              </span>
            )}
            {!hasAction && !notif.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0 ml-auto" />
            )}
          </div>
          <p className="text-white text-xs leading-relaxed">{notif.text}</p>

          {hasAction && (
            <ActionButtons
              notif={notif}
              onRespond={onRespondCoachOffer}
              onDismiss={onDismiss}
            />
          )}
        </div>
        {!hasAction && (
          <button
            onClick={() => onDismiss(notif.id)}
            className="text-pitch-700 text-sm active:text-pitch-400 shrink-0 mt-0.5"
            aria-label="Descartar"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export default function NotificationCenter({ onClose }) {
  const notifications = useGame(s => s.notifications)
  const markNotificationsRead = useGame(s => s.markNotificationsRead)
  const dismissNotification = useGame(s => s.dismissNotification)
  const respondToCoachOffer = useGame(s => s.respondToCoachOffer)

  useEffect(() => {
    markNotificationsRead()
  }, [markNotificationsRead])

  const sorted = [...notifications].reverse()

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ maxWidth: 480, left: '50%', transform: 'translateX(-50%)' }}
    >
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Panel */}
      <div
        className="bg-pitch-900 border-t border-pitch-700 rounded-t-2xl slide-up flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-pitch-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <span className="text-white font-semibold text-sm">Notificaciones</span>
            {notifications.length > 0 && (
              <span className="text-pitch-600 text-xs">({notifications.length})</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-pitch-500 text-sm active:text-white w-8 h-8 flex items-center justify-center rounded-full bg-pitch-800"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <span className="text-4xl mb-3">🔕</span>
              <p className="text-pitch-500 text-sm">Sin notificaciones todavía</p>
              <p className="text-pitch-700 text-xs mt-1">
                Acá vas a ver avisos de lesiones, mercado, dirigencia y más
              </p>
            </div>
          ) : (
            sorted.map(n => (
              <NotifRow
                key={n.id}
                notif={n}
                onDismiss={dismissNotification}
                onRespondCoachOffer={respondToCoachOffer}
              />
            ))
          )}
        </div>

        {/* Clear all (only non-action notifications) */}
        {sorted.some(n => !n.requiresAction) && (
          <div className="px-4 py-3 border-t border-pitch-800 shrink-0">
            <button
              onClick={() => sorted.filter(n => !n.requiresAction).forEach(n => dismissNotification(n.id))}
              className="w-full py-2.5 rounded-xl bg-pitch-800 border border-pitch-700 text-pitch-500 text-xs active:text-white"
            >
              Limpiar notificaciones informativas
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
