import { useEffect } from 'react'
import useGame from './store/useGame.js'

import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import MatchReportModal from './components/MatchReportModal.jsx'
import PressConferenceModal from './components/PressConferenceModal.jsx'
import PlayerDiscontentModal from './components/PlayerDiscontentModal.jsx'

import MainMenu from './screens/MainMenu.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Unemployed from './screens/Unemployed.jsx'
import SquadScreen from './screens/SquadScreen.jsx'
import TacticsScreen from './screens/TacticsScreen.jsx'
import StandingsScreen from './screens/StandingsScreen.jsx'
import MarketScreen from './screens/MarketScreen.jsx'
import FinanceScreen from './screens/FinanceScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import SeasonEndScreen from './screens/SeasonEndScreen.jsx'
import WorldScreen from './screens/WorldScreen.jsx'

function Toast() {
  const events = useGame(s => s.events)
  const clearEvents = useGame(s => s.clearEvents)

  useEffect(() => {
    if (events.length > 0) {
      const t = setTimeout(clearEvents, 3500)
      return () => clearTimeout(t)
    }
  }, [events, clearEvents])

  if (!events.length) return null

  const ev = events[0]
  const colors = {
    success: 'bg-emerald-500/90 text-white',
    danger:  'bg-red-500/90 text-white',
    warn:    'bg-gold-400/90 text-pitch-950',
    info:    'bg-pitch-700/95 text-white',
  }

  return (
    <div
      className={`fixed top-16 left-1/2 z-50 slide-up rounded-xl px-4 py-3 text-sm font-semibold shadow-xl
        ${colors[ev.type] || colors.info}`}
      style={{ transform: 'translateX(-50%)', maxWidth: 320 }}
    >
      {ev.text}
    </div>
  )
}

function TabContent({ screen, activeTab, currentJob }) {
  if (screen === 'season-end') return <SeasonEndScreen />

  if (screen === 'unemployed') {
    if (activeTab === 'history') return <HistoryScreen />
    if (activeTab === 'world')   return <WorldScreen />
    return <Unemployed />
  }

  if (screen === 'dashboard') {
    if (!currentJob) return <Unemployed />
    switch (activeTab) {
      case 'home':      return <Dashboard />
      case 'squad':     return <SquadScreen />
      case 'tactics':   return <TacticsScreen />
      case 'standings': return <StandingsScreen />
      case 'market':    return <MarketScreen />
      case 'finance':   return <FinanceScreen />
      case 'world':     return <WorldScreen />
      default:          return <Dashboard />
    }
  }

  return null
}

export default function App() {
  const screen = useGame(s => s.screen)
  const activeTab = useGame(s => s.activeTab)
  const currentJob = useGame(s => s.currentJob)
  const matchReport = useGame(s => s.matchReport)
  const pressConference = useGame(s => s.pressConference)
  const playerDiscontent = useGame(s => s.playerDiscontent)

  if (screen === 'main-menu') {
    return <MainMenu />
  }

  return (
    <div className="flex flex-col min-h-dvh bg-pitch-900">
      <Header />
      <main className="flex-1 overflow-y-auto scrollable">
        <TabContent screen={screen} activeTab={activeTab} currentJob={currentJob} />
      </main>
      <BottomNav />
      <Toast />
      {matchReport && <MatchReportModal />}
      {!matchReport && pressConference && <PressConferenceModal />}
      {!matchReport && !pressConference && playerDiscontent && <PlayerDiscontentModal />}
    </div>
  )
}
