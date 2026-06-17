import { useState } from 'react'
import useGame from '../store/useGame.js'
import { getRepLabel } from '../data/gameData.js'
import NotificationCenter from './NotificationCenter.jsx'

export default function Header() {
  const coach = useGame(s => s.coach)
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const season = useGame(s => s.season)
  const setScreen = useGame(s => s.setScreen)
  const notifications = useGame(s => s.notifications)

  const [showNotifs, setShowNotifs] = useState(false)

  if (!coach) return null

  const repInfo = getRepLabel(coach.reputation)
  const club = currentJob ? clubs.find(c => c.id === currentJob.clubId) : null
  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      <header className="sticky top-0 z-40 bg-pitch-900 border-b border-pitch-800 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm truncate">{coach.name}</span>
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: repInfo.color + '22', color: repInfo.color, border: `1px solid ${repInfo.color}44` }}
              >
                {repInfo.label}
              </span>
            </div>
            {club && (
              <p className="text-pitch-600 text-xs mt-0.5 truncate">
                <span style={{ color: club.color }}>■</span> {club.name} · T{season}
              </p>
            )}
            {!club && (
              <p className="text-pitch-600 text-xs mt-0.5">Sin equipo · Temporada {season}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-gold-400 text-xs font-bold">{coach.reputation}</span>
                <span className="text-pitch-600 text-xs">/100</span>
              </div>
              <div className="rep-bar w-20">
                <div className="rep-fill" style={{ width: `${coach.reputation}%` }} />
              </div>
            </div>

            {/* Bell */}
            <button
              onClick={() => setShowNotifs(true)}
              className="relative w-8 h-8 rounded-full bg-pitch-800 border border-pitch-700
                         flex items-center justify-center text-pitch-400 active:text-white text-base"
              aria-label="Notificaciones"
            >
              🔔
              {unread > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500
                             flex items-center justify-center text-white font-bold"
                  style={{ fontSize: 9, padding: '0 3px' }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            <button
              onClick={() => setScreen('main-menu')}
              className="w-8 h-8 rounded-full bg-pitch-800 border border-pitch-700
                         flex items-center justify-center text-pitch-500 active:text-white text-base"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {showNotifs && <NotificationCenter onClose={() => setShowNotifs(false)} />}
    </>
  )
}
