import { useEffect } from 'react'
import useGame from './store/useGame.js'

import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import MatchReportModal from './components/MatchReportModal.jsx'
import PressConferenceModal from './components/PressConferenceModal.jsx'
import LifeEventModal from './components/LifeEventModal.jsx'
import CelebrationModal from './components/CelebrationModal.jsx'
import ContractNegotiationModal from './components/ContractNegotiationModal.jsx'

import MainMenu from './screens/MainMenu.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Unemployed from './screens/Unemployed.jsx'
import SquadScreen from './screens/SquadScreen.jsx'
import AcademyScreen from './screens/AcademyScreen.jsx'
import TacticsScreen from './screens/TacticsScreen.jsx'
import StandingsScreen from './screens/StandingsScreen.jsx'
import MarketScreen from './screens/MarketScreen.jsx'
import FinanceScreen from './screens/FinanceScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import SeasonEndScreen from './screens/SeasonEndScreen.jsx'
import PreseasonScreen from './screens/PreseasonScreen.jsx'
import WorldScreen from './screens/WorldScreen.jsx'
import CupScreen from './screens/CupScreen.jsx'
import LiveMatchScreen from './screens/LiveMatchScreen.jsx'

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
    success: 'bg-volt text-carbon',
    danger:  'bg-magenta text-ink',
    warn:    'bg-warn text-carbon',
    info:    'bg-carbon-raised border border-line text-ink',
  }

  return (
    <div
      className={`fixed top-16 left-1/2 z-50 slide-up clip-cut px-4 py-3 font-data text-sm font-bold shadow-xl
        ${colors[ev.type] || colors.info}`}
      style={{ transform: 'translateX(-50%)', maxWidth: 320 }}
    >
      {ev.text}
    </div>
  )
}

function TabContent({ screen, activeTab, currentJob }) {
  if (screen === 'season-end') return <SeasonEndScreen />
  if (screen === 'preseason') return <PreseasonScreen />

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
      case 'academy':   return <AcademyScreen />
      case 'tactics':   return <TacticsScreen />
      case 'standings': return <StandingsScreen />
      case 'market':    return <MarketScreen />
      case 'finance':   return <FinanceScreen />
      case 'world':     return <WorldScreen />
      case 'cup':       return <CupScreen />
      case 'history':   return <HistoryScreen />
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
  const lifeEvents = useGame(s => s.lifeEvents)
  const liveMatch = useGame(s => s.liveMatch)
  const celebrations = useGame(s => s.celebrations)
  const contractNegotiation = useGame(s => s.contractNegotiation)

  if (screen === 'main-menu') {
    return <MainMenu />
  }

  if (liveMatch) {
    return <LiveMatchScreen />
  }

  return (
    <div className="flex flex-col min-h-dvh bg-carbon mx-auto" style={{ maxWidth: 430 }}>
      <Header />
      <main className="flex-1 overflow-y-auto scrollable">
        <TabContent screen={screen} activeTab={activeTab} currentJob={currentJob} />
      </main>
      <BottomNav />
      <Toast />
      {matchReport && <MatchReportModal />}
      {!matchReport && celebrations.length > 0 && <CelebrationModal />}
      {!matchReport && celebrations.length === 0 && pressConference && <PressConferenceModal />}
      {!matchReport && celebrations.length === 0 && !pressConference && lifeEvents.length > 0 && <LifeEventModal />}
      {contractNegotiation && <ContractNegotiationModal />}
    </div>
  )
}
