import useGame from '../store/useGame.js'
import { getRepLabel, LEAGUES } from '../data/gameData.js'

export default function HistoryScreen() {
  const coach = useGame(s => s.coach)
  const season = useGame(s => s.season)

  if (!coach) return null

  const repInfo = getRepLabel(coach.reputation)
  const total = coach.totalMatches
  const wr = total > 0 ? Math.round((coach.totalWins / total) * 100) : 0

  return (
    <div className="px-4 py-4 pb-24 space-y-4">
      {/* Coach profile */}
      <div className="rounded-2xl bg-pitch-800 border border-pitch-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-pitch-700 flex items-center justify-center text-3xl">
            🧠
          </div>
          <div>
            <p className="text-white font-bold text-base">{coach.name}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: repInfo.color }}>
              {repInfo.label}
            </p>
            <p className="text-pitch-600 text-xs">Temporada {season}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-pitch-700/50 rounded-xl p-3 text-center">
            <p className="text-gold-400 font-bold text-xl">{coach.reputation}</p>
            <p className="text-pitch-500 text-xs">Reputación</p>
          </div>
          <div className="bg-pitch-700/50 rounded-xl p-3 text-center">
            <p className="text-white font-bold text-xl">{coach.seasonsManaged}</p>
            <p className="text-pitch-500 text-xs">Temporadas</p>
          </div>
          <div className="bg-pitch-700/50 rounded-xl p-3 text-center">
            <p className="text-emerald-400 font-bold text-xl">{wr}%</p>
            <p className="text-pitch-500 text-xs">% victorias</p>
          </div>
          <div className="bg-pitch-700/50 rounded-xl p-3 text-center">
            <p className="text-gold-400 font-bold text-xl">{coach.trophies.length}</p>
            <p className="text-pitch-500 text-xs">Títulos</p>
          </div>
        </div>
      </div>

      {/* Match record */}
      <div className="rounded-2xl bg-pitch-800 border border-pitch-700 p-4">
        <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-3">Récord</p>
        <div className="flex gap-2">
          {[
            { label: 'V', value: coach.totalWins,   color: '#34d399' },
            { label: 'E', value: coach.totalDraws,   color: '#f0b429' },
            { label: 'D', value: coach.totalLosses,  color: '#f87171' },
          ].map(r => (
            <div key={r.label} className="flex-1 text-center bg-pitch-700/50 rounded-xl py-3">
              <p className="font-bold text-lg" style={{ color: r.color }}>{r.value}</p>
              <p className="text-pitch-500 text-xs">{r.label}</p>
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="mt-3 flex h-2 rounded-full overflow-hidden gap-0.5">
            <div style={{ width: `${wr}%`, background: '#34d399' }} />
            <div style={{ width: `${total > 0 ? Math.round(coach.totalDraws/total*100) : 0}%`, background: '#f0b429' }} />
            <div style={{ flex: 1, background: '#f87171' }} />
          </div>
        )}
      </div>

      {/* Trophies */}
      {coach.trophies.length > 0 && (
        <div className="rounded-2xl bg-pitch-800 border border-pitch-700 p-4">
          <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Títulos 🏆
          </p>
          <div className="space-y-2">
            {coach.trophies.map((t, i) => {
              const league = LEAGUES.find(l => l.id === t.leagueId)
              return (
                <div key={i} className="flex items-center gap-2 bg-gold-400/10 border border-gold-400/20 rounded-xl px-3 py-2">
                  <span className="text-lg">🏆</span>
                  <div>
                    <p className="text-gold-400 font-semibold text-sm">{league?.name || t.leagueId}</p>
                    <p className="text-pitch-600 text-xs">{t.clubName} · T{t.season}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Job history */}
      {coach.jobHistory.length > 0 && (
        <div className="rounded-2xl bg-pitch-800 border border-pitch-700 p-4">
          <p className="text-pitch-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Historial laboral
          </p>
          <div className="space-y-2">
            {[...coach.jobHistory].reverse().map((j, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-pitch-700 last:border-0">
                <span className={`text-lg ${j.fired ? '' : ''}`}>
                  {j.fired ? '🔴' : '🟡'}
                </span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{j.clubName}</p>
                  <p className="text-pitch-600 text-xs">T{j.season}</p>
                </div>
                <span className={`text-xs font-medium ${j.fired ? 'text-red-400' : 'text-gold-400'}`}>
                  {j.fired ? 'Despedido' : 'Renunció'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {coach.jobHistory.length === 0 && coach.trophies.length === 0 && (
        <div className="rounded-2xl bg-pitch-800 border border-pitch-700 p-6 text-center">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-pitch-600 text-sm">Tu carrera está recién empezando...</p>
        </div>
      )}
    </div>
  )
}
