import { useState } from 'react'
import { Bell, HelpCircle, Menu } from 'lucide-react'
import useGame from '../store/useGame.js'
import { getRepLabel } from '../data/gameData.js'
import NotificationCenter from './NotificationCenter.jsx'
import HelpScreen from './HelpScreen.jsx'

export default function Header() {
  const coach = useGame(s => s.coach)
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const season = useGame(s => s.season)
  const setScreen = useGame(s => s.setScreen)
  const notifications = useGame(s => s.notifications)

  const [showNotifs, setShowNotifs] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  if (!coach) return null

  const repInfo = getRepLabel(coach.reputation)
  const club = currentJob ? clubs.find(c => c.id === currentJob.clubId) : null
  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      <header className="sticky top-0 z-40 bg-carbon border-b border-line px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-title text-ink text-sm truncate">{coach.name}</span>
              <span
                className="font-data text-xs font-semibold px-1.5 py-0.5 clip-cut-sm shrink-0"
                style={{ background: repInfo.color + '22', color: repInfo.color, border: `1px solid ${repInfo.color}44` }}
              >
                {repInfo.label}
              </span>
            </div>
            {club && (
              <p className="font-data text-ink-faint text-xs mt-0.5 truncate">
                <span style={{ color: club.color }}>■</span> {club.name} · T{season}
              </p>
            )}
            {!club && (
              <p className="font-data text-ink-faint text-xs mt-0.5">Sin equipo · Temporada {season}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-data text-volt text-xs font-extrabold">{coach.reputation}</span>
                <span className="font-data text-ink-faint text-xs">/100</span>
              </div>
              <div className="rep-bar w-20">
                <div className="rep-fill" style={{ width: `${coach.reputation}%` }} />
              </div>
            </div>

            {/* Bell */}
            <button
              onClick={() => setShowNotifs(true)}
              className="relative w-8 h-8 rounded-full bg-carbon-raised border border-line
                         flex items-center justify-center text-ink-dim active:text-ink"
              aria-label="Notificaciones"
            >
              <Bell size={16} strokeWidth={2} />
              {unread > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-magenta
                             flex items-center justify-center text-ink font-data font-bold"
                  style={{ fontSize: 9, padding: '0 3px' }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowHelp(true)}
              className="w-8 h-8 rounded-full bg-carbon-raised border border-line
                         flex items-center justify-center text-ink-faint active:text-ink"
              aria-label="Ayuda"
            >
              <HelpCircle size={16} strokeWidth={2} />
            </button>

            <button
              onClick={() => setScreen('main-menu')}
              className="w-8 h-8 rounded-full bg-carbon-raised border border-line
                         flex items-center justify-center text-ink-faint active:text-ink"
              aria-label="Menú"
            >
              <Menu size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {showNotifs && <NotificationCenter onClose={() => setShowNotifs(false)} />}
      {showHelp && <HelpScreen onClose={() => setShowHelp(false)} />}
    </>
  )
}
