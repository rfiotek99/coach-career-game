import {
  Home, Users, Sprout, Target, ListOrdered, Repeat2, Wallet, Globe, Trophy, History, ClipboardList,
} from 'lucide-react'
import useGame from '../store/useGame.js'

const EMPLOYED_TABS = [
  { id: 'home',      Icon: Home,         label: 'Inicio'   },
  { id: 'squad',     Icon: Users,        label: 'Plantel'  },
  { id: 'academy',   Icon: Sprout,       label: 'Cantera'  },
  { id: 'tactics',   Icon: Target,       label: 'Táctica'  },
  { id: 'standings', Icon: ListOrdered,  label: 'Liga'     },
  { id: 'market',    Icon: Repeat2,      label: 'Mercado'  },
  { id: 'finance',   Icon: Wallet,       label: 'Finanzas' },
  { id: 'world',     Icon: Globe,        label: 'Mundo'    },
  { id: 'cup',       Icon: Trophy,       label: 'Copa'     },
  { id: 'history',   Icon: History,      label: 'Historia' },
]

const UNEMPLOYED_TABS = [
  { id: 'home',    Icon: ClipboardList, label: 'Ofertas'  },
  { id: 'history', Icon: History,       label: 'Historial'},
  { id: 'world',   Icon: Globe,         label: 'Mundo'    },
]

// Guía de primeros pasos (ver TutorialGuide.jsx) — solo los pasos 2 y 3
// mapean 1 a 1 con una pestaña concreta (paso 1 son varios botones "Aceptar
// Cargo", paso 4 es un botón dentro de Inicio, en la pestaña donde ya estás).
const STEP_TARGET_TAB = { 2: 'squad', 3: 'tactics' }

export default function BottomNav() {
  const activeTab = useGame(s => s.activeTab)
  const currentJob = useGame(s => s.currentJob)
  const setTab = useGame(s => s.setTab)
  const screen = useGame(s => s.screen)
  const transferOffers = useGame(s => s.transferOffers)
  const onboarding = useGame(s => s.onboarding)

  if (!['dashboard','unemployed'].includes(screen)) return null

  const tabs = currentJob ? EMPLOYED_TABS : UNEMPLOYED_TABS
  const pendingOffers = (transferOffers || []).filter(o => o.status === 'pending' || o.status === 'countered').length
  const guidedTab = onboarding.tutorialActive ? STEP_TARGET_TAB[onboarding.tutorialStep] : null

  return (
    <nav className="form-bar">
      <div className="flex">
        {tabs.map(tab => {
          const active = activeTab === tab.id
          const showBadge = tab.id === 'market' && pendingOffers > 0
          const isGuided = guidedTab === tab.id && !active
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? 'text-volt' : 'text-ink-faint active:text-ink-dim'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 2} className={isGuided ? 'pulse-gold' : ''} />
              {showBadge && (
                <span className="absolute top-1.5 right-[18%] min-w-[14px] h-[14px] rounded-full bg-magenta text-ink font-data text-[8px] font-bold flex items-center justify-center px-0.5">
                  {pendingOffers}
                </span>
              )}
              {isGuided && (
                <span className="absolute top-1.5 right-[18%] w-2 h-2 rounded-full bg-volt pulse-gold" />
              )}
              <span className={`font-data text-[9px] font-semibold ${active ? 'text-volt' : isGuided ? 'text-volt' : 'text-ink-faint'}`}>
                {tab.label}
              </span>
              {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-volt" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
