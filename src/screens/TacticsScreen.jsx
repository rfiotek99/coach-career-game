import { useState } from 'react'
import useGame from '../store/useGame.js'
import { FORMATIONS, FORMATION_VISUALS } from '../data/gameData.js'
import { calcStrength } from '../engine/sim.js'
import LineupScreen from './LineupScreen.jsx'

const POS_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#60a5fa', LI: '#60a5fa',
  MCD: '#22c55e', MCC: '#4ade80', MCO: '#86efac', EXT: '#a3e635',
  DEL: '#ef4444',
}

function FormationField({ formation }) {
  const rows = FORMATION_VISUALS[formation] || []
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #166534 0%, #15803d 50%, #166534 100%)' }}
    >
      <div className="relative p-3" style={{ minHeight: 200 }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <div className="w-20 h-20 rounded-full border-2 border-white" />
        </div>
        <div className="absolute left-3 right-3 top-1/2 h-px bg-white/10" />
        <div className="relative flex flex-col gap-2 h-full">
          {rows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-2">
              {row.map((pos, pi) => (
                <div
                  key={pi}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md border border-white/20"
                  style={{ background: POS_COLORS[pos] || '#888' }}
                >
                  {pos}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TacticsScreen() {
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const setFormation = useGame(s => s.setFormation)
  const [tacticsTab, setTacticsTab] = useState('formation')

  if (!currentJob) return null
  const club = clubs.find(c => c.id === currentJob.clubId)
  if (!club) return null

  const strength = Math.round(calcStrength(club))
  const current = club.formation

  return (
    <div className="flex flex-col">
      {/* Internal tab switcher */}
      <div className="flex border-b border-pitch-800 px-4 pt-4">
        {[['formation', 'Formación'], ['lineup', 'Alineación']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTacticsTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tacticsTab === key
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-pitch-500 active:text-pitch-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Formación tab */}
      <div className={tacticsTab === 'formation' ? 'block' : 'hidden'}>
        <div className="px-4 py-4 pb-24">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-bold">Táctica</p>
              <p className="text-pitch-600 text-xs">
                Formación actual: <span className="text-gold-400 font-semibold">{current}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-gold-400 font-bold">{strength}</p>
              <p className="text-pitch-600 text-xs">poder del equipo</p>
            </div>
          </div>

          <div className="mb-4">
            <FormationField formation={current} />
          </div>

          <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Cambiar formación
          </p>
          <div className="space-y-2">
            {Object.entries(FORMATIONS).map(([key, f]) => {
              const isActive = current === key
              const tempClub = { ...club, formation: key }
              const tempStrength = Math.round(calcStrength(tempClub))

              return (
                <button
                  key={key}
                  onClick={() => setFormation(key)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-gold-400/20 border border-gold-400/50'
                      : 'bg-pitch-800 border border-pitch-700 active:border-pitch-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-bold text-sm ${isActive ? 'text-gold-400' : 'text-white'}`}>
                        {key}
                      </span>
                      <div className="flex gap-3 mt-0.5">
                        <span className={`text-[11px] ${f.atkBonus > 0 ? 'text-emerald-400' : f.atkBonus < 0 ? 'text-red-400' : 'text-pitch-600'}`}>
                          ATK {f.atkBonus > 0 ? '+' : ''}{f.atkBonus}
                        </span>
                        <span className={`text-[11px] ${f.defBonus > 0 ? 'text-emerald-400' : f.defBonus < 0 ? 'text-red-400' : 'text-pitch-600'}`}>
                          DEF {f.defBonus > 0 ? '+' : ''}{f.defBonus}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isActive ? 'text-gold-400' : 'text-pitch-500'}`}>
                        {tempStrength}
                      </span>
                      {isActive && <span className="text-gold-400 text-xs">✓</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Alineación tab — key on formation so it re-mounts when formation changes */}
      <div className={tacticsTab === 'lineup' ? 'block' : 'hidden'}>
        <LineupScreen key={club.formation} club={club} />
      </div>
    </div>
  )
}
