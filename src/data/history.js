import { getRepLabel } from './gameData.js'

// ─── Historia del mundo / palmarés ──────────────────────────────────────────
// Funciones puras que alimentan `worldHistory` en el store. El shape de
// `worldHistory` está pensado para crecer sin rehacerse:
//   titles:    { season, competitionId, competitionName, competitionType, scope,
//                countryId, tier, winnerId, winnerName, runnerUpId, runnerUpName }
//     - competitionType: 'league' | 'international-cup' hoy; 'national-team' el
//       día que se sumen selecciones (Mundial, Copa América, Eurocopa) — mismo
//       array, mismo shape, sin tocar esta lista.
//   movements: ascensos/descensos de clubes argentinos
//   awards:    premios individuales del DT (dt-mes, dt-anio)
//   records:   objeto con clave por récord — se suma una key nueva sin migrar
//              las existentes (ej. topScorer cuando haya datos de goleadores)

function hashStr(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  return h >>> 0
}

// ── Salón de la fama ─────────────────────────────────────────────────────────
// Los clubes IA no tienen manager con nombre/stats propias — solo un id. Para
// que el salón de la fama tenga sentido ("quiero poder escalar posiciones"),
// generamos un puñado de DTs rivales ficticios con una carrera plausible,
// derivada de forma determinística del nombre (mismo resultado siempre, no
// depende de Math.random ni de guardarse en el store). El día que haya DTs de
// IA simulados de verdad, este pool se reemplaza sin tocar la UI que lo consume.
const HALL_OF_FAME_RIVALS = [
  'Hernán Cardoso', 'Marcelo Bielsa Jr.', 'Ricardo Fontán', 'Diego Sorrentino',
  'Claudio Manzano', 'Osvaldo Pereyra', 'Fabián Roldán', 'Sergio Villalba',
  'Norberto Aquino', 'Raúl Gimenez', 'Alberto Suñé', 'Ítalo Ferrando',
]

function rivalProfile(name) {
  const seed = hashStr(name)
  const r = (seed % 1000) / 1000
  const seasonsManaged = 8 + Math.floor(r * 18)          // 8–25 temporadas
  const titles = Math.floor(r * seasonsManaged * 0.35)    // carrera plausible
  const reputation = 50 + Math.floor(((seed >> 3) % 1000) / 1000 * 50) // 50–99
  const score = titles * 100 + seasonsManaged * 1 + reputation * 2
  return { name, seasonsManaged, titles, reputation, score }
}

// Ranking estable: mismo pool de rivales siempre, tu entrada se recalcula cada vez.
export function getHallOfFame(coach) {
  const rivals = HALL_OF_FAME_RIVALS.map(rivalProfile)
  const mine = {
    name: coach.name,
    seasonsManaged: coach.seasonsManaged || 0,
    titles: coach.trophies?.length || 0,
    reputation: coach.reputation,
    score: (coach.trophies?.length || 0) * 100 + (coach.seasonsManaged || 0) * 1 + coach.reputation * 2,
    isPlayer: true,
  }
  return [...rivals, mine]
    .sort((a, b) => b.score - a.score)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))
}

// ── DT del Mes ───────────────────────────────────────────────────────────────
// Chequeo oportunista, mismo estilo que las conferencias de prensa / rumores de
// interés en un DT: se llama una vez por jornada desde simulateMatchday.
export function checkDtDelMes(streak, clubName, season, matchday, lastAwardMd) {
  if (matchday - lastAwardMd < 4) return null
  if (streak.type !== 'win' || streak.count < 4) return null
  return {
    id: `award-${Date.now()}-mes`,
    season, matchday, type: 'dt-mes',
    clubName,
    reason: `Racha de ${streak.count} victorias consecutivas`,
  }
}

// ── DT del Año ───────────────────────────────────────────────────────────────
// Se llama una vez en processSeasonEnd, con los resultados ya conocidos.
export function checkDtDelAnio(season, clubName, { won, objectiveMet, promoted, prestige, pos, totalTeams }) {
  const reasons = []
  if (won) reasons.push('Campeón de liga')
  if (promoted) reasons.push('Logró el ascenso')
  if (!won && objectiveMet && prestige <= 40 && totalTeams > 0 && pos <= Math.ceil(totalTeams / 2)) {
    reasons.push('Superó ampliamente las expectativas con un plantel humilde')
  }
  if (!reasons.length) return null
  return {
    id: `award-${Date.now()}-anio`,
    season, matchday: null, type: 'dt-anio',
    clubName,
    reason: reasons.join(' · '),
  }
}

// ── Récords del mundo ────────────────────────────────────────────────────────
// Por ahora solo la racha ganadora propia (lo que el motor permite hoy sin
// simular managers de IA jornada a jornada). `records` es un objeto con clave
// por récord para poder sumar `topScorer` u otros el día que haya datos.
export function updateWinStreakRecord(records, streak, coachName, clubName, season) {
  if (streak.type !== 'win') return records
  const current = records.longestWinStreak
  if (current && current.value >= streak.count) return records
  return {
    ...records,
    longestWinStreak: { value: streak.count, holderName: coachName, clubName, season },
  }
}

// ── Goleadores / asistencias ────────────────────────────────────────────────
// `records.scorers` es un array plano, una entrada por jugador+competencia+
// temporada (mismo espíritu que `titles`). Se incrementa partido a partido a
// medida que se atribuyen goles (ver attributeMatchGoals/assignGoalScorers en
// sim.js) — no se recalcula al final de temporada, vive actualizado siempre.
// `events`: [{ season, competitionId, competitionName, clubId, clubName,
//              scorerId, scorerName, assistId, assistName }]
export function addScorerEvents(records, events) {
  if (!events?.length) return records
  const scorers = [...(records.scorers || [])]
  const indexByKey = new Map(scorers.map((s, i) => [`${s.season}|${s.competitionId}|${s.playerId}`, i]))

  const bump = (playerId, playerName, field, ctx) => {
    const key = `${ctx.season}|${ctx.competitionId}|${playerId}`
    const idx = indexByKey.get(key)
    if (idx != null) {
      const entry = scorers[idx]
      scorers[idx] = { ...entry, [field]: entry[field] + 1, clubId: ctx.clubId, clubName: ctx.clubName }
    } else {
      const entry = {
        season: ctx.season, competitionId: ctx.competitionId, competitionName: ctx.competitionName,
        playerId, playerName, clubId: ctx.clubId, clubName: ctx.clubName, goals: 0, assists: 0,
      }
      entry[field] = 1
      scorers.push(entry)
      indexByKey.set(key, scorers.length - 1)
    }
  }

  events.forEach(ev => {
    if (ev.scorerId) bump(ev.scorerId, ev.scorerName, 'goals', ev)
    if (ev.assistId) bump(ev.assistId, ev.assistName, 'assists', ev)
  })

  return { ...records, scorers }
}

// ── Festejos ──────────────────────────────────────────────────────────────────
// `celebrations` en el store es una cola (mismo patrón que `lifeEvents`), se
// consume de a una vía CelebrationModal. Cualquier hito importante (título,
// ascenso, Copa, subida de tier, premio de DT) empuja uno de estos objetos.
let celebrationSeq = 0
export function makeCelebration({ type, icon, title, subtitle, detail }) {
  celebrationSeq++
  return { id: `cel-${Date.now()}-${celebrationSeq}`, type, icon, title, subtitle, detail }
}

// Compara el tier de reputación (REP_TIERS en gameData.js) antes/después de un
// cambio — null si no se cruzó ningún escalón hacia arriba.
export function checkRepTierUp(oldRep, newRep) {
  const oldTier = getRepLabel(oldRep)
  const newTier = getRepLabel(newRep)
  if (newTier.min <= oldTier.min) return null
  return makeCelebration({
    type: 'rep-tier',
    icon: newTier.icon,
    title: `¡Ahora sos ${newTier.label}!`,
    subtitle: 'Reconocimiento',
    detail: `Reputación ${newRep}/100`,
  })
}
