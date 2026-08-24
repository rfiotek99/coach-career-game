import { useEffect } from 'react'
import useGame from '../store/useGame.js'

const CATEGORY_META = {
  board:     { icon: '🏢', label: 'Dirigencia',  color: '#3b82f6' },
  transfer:  { icon: '💰', label: 'Mercado',     color: '#c8ff32' },
  player:    { icon: '🩹', label: 'Jugadores',   color: '#f97316' },
  market:    { icon: '🏪', label: 'Ventana',     color: '#c8ff32' },
  milestone: { icon: '🏆', label: 'Hito',        color: '#c8ff32' },
  interest:  { icon: '👀', label: 'Interés',     color: '#a78bfa' },
  award:     { icon: '🏅', label: 'Premio',      color: '#c8ff32' },
}

function fmtSalary(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(n / 1_000)}k`
}

function ActionButtons({ notif, onRespond, onDismiss }) {
  if (notif.actionType === 'coachOffer') {
    const { clubName, salary, prestige } = notif.actionPayload || {}
    return (
      <div className="mt-3.5 space-y-2.5">
        <div className="flex items-center gap-2 font-data text-xs text-ink-faint">
          <span>Salario: <span className="text-volt font-bold">{fmtSalary(salary)}/jornada</span></span>
          <span>·</span>
          <span>Prestigio: <span className="text-ink font-semibold">{prestige}</span></span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(notif.id, true)}
            className="flex-1 py-2.5 rounded-lg bg-volt-dim border border-volt text-volt font-data text-xs font-semibold active:opacity-80"
          >
            ✓ Aceptar oferta
          </button>
          <button
            onClick={() => onRespond(notif.id, false)}
            className="flex-1 py-2.5 rounded-lg bg-carbon-high border border-line text-ink-dim font-data text-xs font-semibold active:bg-line"
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
      className={`px-4 py-3.5 border-b border-line ${hasAction ? 'bg-carbon-raised' : ''}`}
      style={{ opacity: notif.read && !hasAction ? 0.65 : 1 }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base mt-0.5"
          style={{ background: meta.color + '22', border: `1px solid ${meta.color}44` }}
        >
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className="font-data text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: meta.color + '22', color: meta.color }}
            >
              {meta.label}
            </span>
            {notif.matchday && (
              <span className="font-data text-ink-faint text-[10px]">J{notif.matchday} · T{notif.season}</span>
            )}
            {!notif.matchday && (
              <span className="font-data text-ink-faint text-[10px]">T{notif.season}</span>
            )}
            {hasAction && (
              <span className="font-data text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-volt-dim text-volt ml-auto">
                Requiere decisión
              </span>
            )}
            {!hasAction && !notif.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-volt shrink-0 ml-auto" />
            )}
          </div>
          <p className="text-ink text-sm leading-relaxed">{notif.text}</p>

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
            className="text-ink-faint text-sm active:text-ink-dim shrink-0 mt-0.5"
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
        className="bg-carbon border-t border-line rounded-t-2xl slide-up flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <span className="font-title text-ink text-base leading-none">Notificaciones</span>
            {notifications.length > 0 && (
              <span className="font-data text-ink-faint text-xs">({notifications.length})</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint text-sm active:text-ink w-8 h-8 flex items-center justify-center rounded-full bg-carbon-raised"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <span className="text-4xl mb-3">🔕</span>
              <p className="font-data text-ink-dim text-sm">Sin notificaciones todavía</p>
              <p className="font-data text-ink-faint text-xs mt-1">
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
          <div className="px-4 py-3 border-t border-line shrink-0">
            <button
              onClick={() => sorted.filter(n => !n.requiresAction).forEach(n => dismissNotification(n.id))}
              className="w-full py-2.5 rounded-lg bg-carbon-raised border border-line text-ink-faint font-data text-xs active:text-ink"
            >
              Limpiar notificaciones informativas
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
