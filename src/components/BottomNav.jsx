import useGame from '../store/useGame.js'

const EMPLOYED_TABS = [
  { id: 'home',      icon: '🏠', label: 'Inicio'   },
  { id: 'squad',     icon: '👥', label: 'Plantel'  },
  { id: 'tactics',   icon: '🎯', label: 'Táctica'  },
  { id: 'standings', icon: '📊', label: 'Liga'     },
  { id: 'market',    icon: '🔄', label: 'Mercado'  },
  { id: 'finance',   icon: '💰', label: 'Finanzas' },
  { id: 'world',     icon: '🌍', label: 'Mundo'    },
]

const UNEMPLOYED_TABS = [
  { id: 'home',    icon: '📋', label: 'Ofertas'  },
  { id: 'history', icon: '📜', label: 'Historial'},
  { id: 'world',   icon: '🌍', label: 'Mundo'    },
]

export default function BottomNav() {
  const activeTab = useGame(s => s.activeTab)
  const currentJob = useGame(s => s.currentJob)
  const setTab = useGame(s => s.setTab)
  const screen = useGame(s => s.screen)
  const transferOffers = useGame(s => s.transferOffers)

  if (!['dashboard','unemployed'].includes(screen)) return null

  const tabs = currentJob ? EMPLOYED_TABS : UNEMPLOYED_TABS
  const pendingOffers = (transferOffers || []).filter(o => o.status === 'pending' || o.status === 'countered').length

  return (
    <nav className="form-bar">
      <div className="flex">
        {tabs.map(tab => {
          const active = activeTab === tab.id
          const showBadge = tab.id === 'market' && pendingOffers > 0
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center py-2 transition-colors ${
                active ? 'text-gold-400' : 'text-pitch-600 active:text-pitch-500'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {showBadge && (
                <span className="absolute top-1 right-[18%] min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                  {pendingOffers}
                </span>
              )}
              <span className={`text-[9px] mt-0.5 font-medium ${active ? 'text-gold-400' : 'text-pitch-600'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
