// ── Streak helper ─────────────────────────────────────────────────────────────
export function calcStreak(schedule, clubId) {
  const played = schedule.flat().filter(
    m => m.homeGoals != null && (m.homeId === clubId || m.awayId === clubId)
  )
  if (!played.length) return { type: 'none', count: 0 }
  const last = played[played.length - 1]
  const ih = last.homeId === clubId
  const pg = ih ? last.homeGoals : last.awayGoals
  const og = ih ? last.awayGoals : last.homeGoals
  const lastType = pg > og ? 'win' : pg < og ? 'loss' : 'draw'
  let count = 0
  for (let i = played.length - 1; i >= 0; i--) {
    const m = played[i]
    const h = m.homeId === clubId
    const p = h ? m.homeGoals : m.awayGoals
    const o = h ? m.awayGoals : m.homeGoals
    const t = p > o ? 'win' : p < o ? 'loss' : 'draw'
    if (t !== lastType) break
    count++
  }
  return { type: lastType, count }
}

// ── Headline templates ────────────────────────────────────────────────────────
const TEMPLATES = {
  win_streak: [
    '{club} hila {n} triunfos y pone primera en la temporada',
    '{club} imparable: {n} victorias seguidas y el grupo vibra',
    'Racha de {n}: {club} no para de ganar',
  ],
  loss_streak: [
    'Crisis en {club}: {n} derrotas seguidas y la dirigencia observa',
    '{club} no encuentra la vuelta — {n} caídas al hilo',
    'Alarma en {club}: {n} partidos sin ganar generan dudas',
  ],
  big_win: [
    '{club} golea a {rival} y da un golpe de autoridad',
    'Noche perfecta: {club} aplasta a {rival} con un {score} contundente',
    '{club} demuestra jerarquía y humilla a {rival}',
  ],
  big_loss: [
    'Noche negra: {rival} aplasta a {club} con un {score}',
    'Goleada histórica — {club} se hunde ante {rival}',
    '{club} no pudo con {rival}: {score} que duele',
  ],
  top_table: [
    '{club} se afianza en lo alto de la tabla en la jornada {md}',
    'Líderes: {club} no cede la punta en la fecha {md}',
    '{club} arriba de todo — la racha manda',
  ],
  relegation_zone: [
    'Alerta roja en {club}: zona de descenso en la jornada {md}',
    '{club} en el fondo de la tabla — el tiempo corre',
    'Peligro: {club} no escapa del descenso en la fecha {md}',
  ],
  player_win: [
    '{club} suma de a tres y mantiene el rumbo',
    'Victoria importante de {club} que sigue en carrera',
    'Tres puntos de oro para {club}',
  ],
  player_loss: [
    'Derrota de {club} abre interrogantes en el cuerpo técnico',
    '{club} cae y cede terreno en la tabla',
    'Tropiezo de {club} — el rival aprovechó cada error',
  ],
  player_draw: [
    'Empate de {club} — un punto que sabe a poco',
    '{club} no pudo con el rival y repartió puntos',
    'Sin ganador: {club} divide en un partido parejo',
  ],
}

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length]
}

function fill(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? k)
}

export function generateHeadline(scenario, vars, seed = Date.now()) {
  const arr = TEMPLATES[scenario]
  if (!arr) return null
  return fill(pick(arr, seed), vars)
}

// ── Headline type helper ──────────────────────────────────────────────────────
function headlineType(scenario) {
  if (['win_streak','big_win','top_table','player_win'].includes(scenario)) return 'positive'
  if (['loss_streak','big_loss','relegation_zone','player_loss'].includes(scenario)) return 'negative'
  if (scenario === 'player_draw') return 'neutral'
  return 'neutral'
}

// ── Main generator called after each matchday ─────────────────────────────────
// Returns array of { text, type }
export function generateMatchdayHeadlines(
  playerResult,   // { homeId, awayId, homeName, awayName, homeGoals, awayGoals, isHome, playerGoals, opponentGoals }
  allResults,     // all results this matchday
  playerClubId,
  playerClubName,
  standings,      // current standings after matchday
  currentMd,
  schedule,       // full schedule used to compute streak
) {
  const headlines = []
  const seed = currentMd * 37 + playerClubId.charCodeAt(0)

  // 1. Player match result headline
  if (playerResult) {
    const pg = playerResult.playerGoals
    const og = playerResult.opponentGoals
    const diff = pg - og
    const opponentName = playerResult.isHome ? playerResult.awayName : playerResult.homeName
    const score = `${pg}-${og}`

    if (diff >= 4) {
      headlines.push({ text: generateHeadline('big_win', { club: playerClubName, rival: opponentName, score }, seed), type: 'positive' })
    } else if (diff <= -4) {
      headlines.push({ text: generateHeadline('big_loss', { club: playerClubName, rival: opponentName, score }, seed), type: 'negative' })
    } else if (diff > 0) {
      headlines.push({ text: generateHeadline('player_win', { club: playerClubName }, seed), type: 'positive' })
    } else if (diff < 0) {
      headlines.push({ text: generateHeadline('player_loss', { club: playerClubName }, seed), type: 'negative' })
    } else {
      headlines.push({ text: generateHeadline('player_draw', { club: playerClubName }, seed), type: 'neutral' })
    }
  }

  // 2. Streak headline (only if streak is exactly 3, to avoid spamming)
  if (schedule && playerClubId) {
    const streak = calcStreak(schedule, playerClubId)
    if (streak.count === 3 && streak.type === 'win') {
      headlines.push({ text: generateHeadline('win_streak', { club: playerClubName, n: streak.count }, seed + 1), type: 'positive' })
    } else if (streak.count === 3 && streak.type === 'loss') {
      headlines.push({ text: generateHeadline('loss_streak', { club: playerClubName, n: streak.count }, seed + 1), type: 'negative' })
    } else if (streak.count >= 5) {
      const scenario = streak.type === 'win' ? 'win_streak' : 'loss_streak'
      const type = streak.type === 'win' ? 'positive' : 'negative'
      headlines.push({ text: generateHeadline(scenario, { club: playerClubName, n: streak.count }, seed + 1), type })
    }
  }

  // 3. Table position headline (only at certain matchdays)
  if (standings && currentMd > 0 && currentMd % 3 === 0) {
    const pos = standings.findIndex(s => s.clubId === playerClubId) + 1
    const total = standings.length
    if (pos === 1) {
      headlines.push({ text: generateHeadline('top_table', { club: playerClubName, md: currentMd }, seed + 2), type: 'positive' })
    } else if (pos >= total - 2 && total > 5) {
      headlines.push({ text: generateHeadline('relegation_zone', { club: playerClubName, md: currentMd }, seed + 2), type: 'negative' })
    }
  }

  return headlines.filter(h => h.text)
}

// ── Press conference definitions ──────────────────────────────────────────────
export const PRESS_CONFERENCES = {
  racha_negativa: {
    title: 'Rueda de Prensa — Crisis de resultados',
    context: 'Tres derrotas seguidas. Los medios quieren saber qué está pasando.',
    options: [
      {
        text: 'El grupo está unido. Esto se da vuelta trabajando.',
        hint: 'Moral plantel +3 · Confianza −1',
        boardConfidenceDelta: -1,
        moraleDelta: 3,
        reputationDelta: 0,
      },
      {
        text: 'Cometimos errores. Los estamos analizando y corrigiendo.',
        hint: 'Confianza dirigencia +4 · Moral −2',
        boardConfidenceDelta: 4,
        moraleDelta: -2,
        reputationDelta: 0,
      },
      {
        text: 'Necesitamos más apoyo del club para revertir esto.',
        hint: 'Confianza −6 · Reputación −1',
        boardConfidenceDelta: -6,
        moraleDelta: 0,
        reputationDelta: -1,
      },
    ],
  },

  racha_positiva: {
    title: 'Rueda de Prensa — Buen momento',
    context: 'Tres victorias seguidas. El ambiente es de fiesta y todos quieren escucharte.',
    options: [
      {
        text: 'El mérito es del grupo. Nadie se relaja, seguimos.',
        hint: 'Moral +3 · Confianza +2',
        boardConfidenceDelta: 2,
        moraleDelta: 3,
        reputationDelta: 0,
      },
      {
        text: 'Vamos a pelear hasta el final por los objetivos.',
        hint: 'Confianza +5 · Reputación +1',
        boardConfidenceDelta: 5,
        moraleDelta: 0,
        reputationDelta: 1,
      },
      {
        text: 'Buen resultado, pero aún hay mucho margen de mejora.',
        hint: 'Confianza +2 · Moral −1',
        boardConfidenceDelta: 2,
        moraleDelta: -1,
        reputationDelta: 0,
      },
    ],
  },

  goleada_en_contra: {
    title: 'Rueda de Prensa — Goleada recibida',
    context: 'Paliza histórica. Los medios exigen explicaciones y los hinchas están indignados.',
    options: [
      {
        text: 'No fue aceptable. Pido disculpas a los hinchas.',
        hint: 'Confianza +3 · Moral −5',
        boardConfidenceDelta: 3,
        moraleDelta: -5,
        reputationDelta: 0,
      },
      {
        text: 'Hay situaciones que se analizan internamente.',
        hint: 'Confianza +1 · Moral −1',
        boardConfidenceDelta: 1,
        moraleDelta: -1,
        reputationDelta: 0,
      },
      {
        text: 'El marcador no refleja el partido que hicimos.',
        hint: 'Moral +2 · Confianza −5',
        boardConfidenceDelta: -5,
        moraleDelta: 2,
        reputationDelta: 0,
      },
    ],
  },

  goleada_a_favor: {
    title: 'Rueda de Prensa — Goleada a favor',
    context: 'El mejor partido de la temporada. Todos quieren saber si puede repetirse.',
    options: [
      {
        text: 'Fue una actuación de equipo perfecta. Así es como queremos jugar.',
        hint: 'Moral +5 · Confianza +1',
        boardConfidenceDelta: 1,
        moraleDelta: 5,
        reputationDelta: 0,
      },
      {
        text: 'El rival fue débil. No nos confiemos de cara a lo que viene.',
        hint: 'Confianza +3 · Moral +2',
        boardConfidenceDelta: 3,
        moraleDelta: 2,
        reputationDelta: 0,
      },
      {
        text: 'Esto es lo mínimo que esperamos de este plantel.',
        hint: 'Reputación +1 · Moral −2',
        boardConfidenceDelta: 0,
        moraleDelta: -2,
        reputationDelta: 1,
      },
    ],
  },

  presion_alta: {
    title: 'Rueda de Prensa — Presión máxima',
    context: 'La dirigencia está al límite de la paciencia. Hay que dar la cara.',
    options: [
      {
        text: 'Garantizo resultados antes de que termine la temporada.',
        hint: 'Confianza +8 · Reputación −2',
        boardConfidenceDelta: 8,
        moraleDelta: 0,
        reputationDelta: -2,
      },
      {
        text: 'Necesito tiempo y confianza del club para construir.',
        hint: 'Confianza +4 · Reputación +1',
        boardConfidenceDelta: 4,
        moraleDelta: 0,
        reputationDelta: 1,
      },
      {
        text: 'Entiendo la presión. Los resultados van a llegar.',
        hint: 'Confianza +5',
        boardConfidenceDelta: 5,
        moraleDelta: 0,
        reputationDelta: 0,
      },
    ],
  },
}

// ── Trigger logic ─────────────────────────────────────────────────────────────
// Returns conference type string or null
export function triggerPressConference(
  streak,             // { type, count }
  playerGoalDiff,     // this matchday: playerGoals - opponentGoals
  boardConfidence,
  lastConferenceMd,   // matchday of last triggered conference (or 0)
  currentMd,
) {
  // presion_alta: max once every 5 matchdays
  if (boardConfidence < 30 && currentMd - lastConferenceMd >= 5) {
    return 'presion_alta'
  }
  // goleada_en_contra
  if (playerGoalDiff <= -4) return 'goleada_en_contra'
  // racha_negativa — exactly 3rd loss
  if (streak.type === 'loss' && streak.count === 3) return 'racha_negativa'
  // goleada_a_favor
  if (playerGoalDiff >= 4) return 'goleada_a_favor'
  // racha_positiva — exactly 3rd win
  if (streak.type === 'win' && streak.count === 3) return 'racha_positiva'
  return null
}
