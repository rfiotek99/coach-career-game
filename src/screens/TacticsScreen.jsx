import { useState } from 'react'
import useGame from '../store/useGame.js'
import { FORMATIONS, FORMATION_VISUALS } from '../data/gameData.js'
import { calcStrength } from '../engine/sim.js'
import {
  DEFAULT_TACTICS, MENTALITY_LABELS, PRESSING_LABELS, TEMPO_LABELS, ATTACK_LABELS,
} from '../data/tactics.js'
import LineupScreen from './LineupScreen.jsx'

// Field-diagram chip colors — deliberately not brand tokens: this renders a
// literal grass pitch, so it keeps its own football-shirt-style palette
// regardless of the app theme.
const POS_COLORS = {
  POR: '#f59e0b', CAR: '#3b82f6', LD: '#60a5fa', LI: '#60a5fa',
  MCD: '#22c55e', MCC: '#4ade80', MCO: '#86efac', EXT: '#a3e635',
  DEL: '#ef4444',
}

export function FormationField({ formation }) {
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

// Cada eje afecta la simulación por una vía distinta (ver src/data/tactics.js)
// — el texto de abajo es la versión humana de esos multiplicadores.
const TACTIC_AXES = [
  {
    key: 'mentality', title: 'Mentalidad', labels: MENTALITY_LABELS,
    desc: {
      defensivo: 'Más sólido atrás, menos generación ofensiva.',
      equilibrado: 'Sin sesgo — ni bonus ni costo.',
      ofensivo: 'Más ataque, pero te deja más expuesto atrás.',
    },
  },
  {
    key: 'pressing', title: 'Presión', labels: PRESSING_LABELS,
    desc: {
      baja: 'Sólido atrás, pero le das tiempo y espacio de salida al rival.',
      media: 'Sin sesgo — ni bonus ni costo.',
      alta: 'Ahoga la salida rival, pero te deja expuesto atrás (y arriesgás más tarjetas).',
    },
  },
  {
    key: 'tempo', title: 'Ritmo', labels: TEMPO_LABELS,
    desc: {
      pausado: 'Menos ocasiones, pero menos lesiones y desgaste.',
      equilibrado: 'Sin sesgo — ni bonus ni costo.',
      vertiginoso: 'Más generación ofensiva, pero más lesiones y desgaste físico.',
    },
  },
  {
    key: 'attack', title: 'Ataque', labels: ATTACK_LABELS,
    desc: {
      bandas: 'Potencia el ataque si tus laterales/extremos rinden más que tu mediocampo central — resta algo de def.',
      equilibrado: 'Sin sesgo — ni bonus ni costo.',
      centro: 'Potencia el ataque si tu mediocampo/delanteros rinden más que tus bandas — resta algo de def.',
    },
  },
]

function TacticRow({ axis, value, onChange }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-ink font-semibold text-sm mb-2.5">{axis.title}</p>
      <div className="flex rounded-lg overflow-hidden border border-line mb-2">
        {Object.entries(axis.labels).map(([optValue, label]) => (
          <button
            key={optValue}
            onClick={() => onChange(optValue)}
            className={`flex-1 py-2.5 font-data text-xs font-semibold transition-colors ${
              value === optValue ? 'bg-volt text-carbon' : 'bg-carbon-raised text-ink-dim active:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="font-data text-ink-faint text-[11px] leading-relaxed">{axis.desc[value]}</p>
    </div>
  )
}

export default function TacticsScreen() {
  const currentJob = useGame(s => s.currentJob)
  const clubs = useGame(s => s.clubs)
  const setFormation = useGame(s => s.setFormation)
  const setTactics = useGame(s => s.setTactics)
  const [tacticsTab, setTacticsTab] = useState('formation')

  if (!currentJob) return null
  const club = clubs.find(c => c.id === currentJob.clubId)
  if (!club) return null

  const strength = Math.round(calcStrength(club))
  const current = club.formation
  const tactics = club.tactics || DEFAULT_TACTICS

  return (
    <div className="flex flex-col">
      {/* Internal tab switcher */}
      <div className="flex border-b border-line px-4 pt-4">
        {[['formation', 'Formación'], ['lineup', 'Alineación'], ['estilo', 'Estilo']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTacticsTab(key)}
            className={`px-4 py-2.5 font-data text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tacticsTab === key
                ? 'border-volt text-volt'
                : 'border-transparent text-ink-faint active:text-ink-dim'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Formación tab */}
      <div className={tacticsTab === 'formation' ? 'block' : 'hidden'}>
        <div className="px-4 py-4 pb-24">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-title text-ink text-lg leading-none">Táctica</p>
              <p className="font-data text-ink-faint text-xs mt-1.5">
                Formación actual: <span className="text-volt font-semibold">{current}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-data text-volt font-extrabold text-xl">{strength}</p>
              <p className="font-data text-ink-faint text-xs">poder del equipo</p>
            </div>
          </div>

          <div className="mb-5">
            <FormationField formation={current} />
          </div>

          <p className="section-label mb-3">
            Cambiar formación
          </p>
          <div className="space-y-2.5">
            {Object.entries(FORMATIONS).map(([key, f]) => {
              const isActive = current === key
              const tempClub = { ...club, formation: key }
              const tempStrength = Math.round(calcStrength(tempClub))

              return (
                <button
                  key={key}
                  onClick={() => setFormation(key)}
                  className={`w-full rounded-lg px-4 py-3.5 text-left transition-all border ${
                    isActive
                      ? 'bg-volt-dim border-volt'
                      : 'bg-carbon-raised border-line active:border-ink-faint'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-data font-bold text-sm ${isActive ? 'text-volt' : 'text-ink'}`}>
                        {key}
                      </span>
                      <div className="flex gap-3 mt-1">
                        <span className={`font-data text-[11px] ${f.atkBonus > 0 ? 'text-volt' : f.atkBonus < 0 ? 'text-magenta' : 'text-ink-faint'}`}>
                          ATK {f.atkBonus > 0 ? '+' : ''}{f.atkBonus}
                        </span>
                        <span className={`font-data text-[11px] ${f.defBonus > 0 ? 'text-volt' : f.defBonus < 0 ? 'text-magenta' : 'text-ink-faint'}`}>
                          DEF {f.defBonus > 0 ? '+' : ''}{f.defBonus}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-data text-base font-extrabold ${isActive ? 'text-volt' : 'text-ink-dim'}`}>
                        {tempStrength}
                      </span>
                      {isActive && <span className="text-volt text-xs">✓</span>}
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

      {/* Estilo tab — instrucciones tácticas persistentes. Presión/Ritmo/
          Ataque se fijan acá y no se tocan durante el partido; Mentalidad
          además se puede seguir ajustando en vivo (arranca en lo que ya
          tenías configurado acá, en vez de resetear a "equilibrado"). */}
      <div className={tacticsTab === 'estilo' ? 'block' : 'hidden'}>
        <div className="px-4 py-4 pb-24">
          <p className="font-title text-ink text-lg leading-none mb-1.5">Estilo de juego</p>
          <p className="font-data text-ink-faint text-xs mb-5">
            Cada instrucción tiene un trade-off real — ninguna es "la mejor" en abstracto.
          </p>
          {TACTIC_AXES.map(axis => (
            <TacticRow
              key={axis.key}
              axis={axis}
              value={tactics[axis.key]}
              onChange={val => setTactics({ [axis.key]: val })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
