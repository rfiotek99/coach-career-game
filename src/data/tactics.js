// ── Instrucciones tácticas ───────────────────────────────────────────────────
// Cada eje afecta la simulación por una vía distinta, para que no se sientan
// 3 copias del mismo slider:
//  - Mentalidad: tu propio atq/def.
//  - Presión: tu propia def + suprime el atq del RIVAL (ver el término cruzado
//    en simulateMatch/computeLiveLambdas, que necesita AMBOS clubes).
//  - Ritmo: tu propio atq + riesgo de lesión/fatiga.
//  - Ataque (bandas/equilibrado/centro): tu propio atq/def según el fit entre
//    el canal elegido y la fuerza real de tu plantel en esas posiciones.
// Sin import de sim.js/liveMatch.js acá — evita ciclos (ambos importan de este
// archivo, no al revés).

export const DEFAULT_TACTICS = {
  mentality: 'equilibrado',
  pressing: 'media',
  tempo: 'equilibrado',
  attack: 'equilibrado',
}

export const MENTALITY_MODS = {
  defensivo:   { atk: 0.88, def: 1.12 },
  equilibrado: { atk: 1.00, def: 1.00 },
  ofensivo:    { atk: 1.12, def: 0.88 },
}
export const MENTALITY_LABELS = { defensivo: 'Defensivo', equilibrado: 'Equilibrado', ofensivo: 'Ofensivo' }

// ownDef: tu propia def. suppressOppAtk: cuánto reduce (o aumenta, en "baja")
// el atq del RIVAL — se aplica cruzado, no acá mismo (ver simulateMatch).
// cardMult: escala la tasa de amarillas/rojas (presión alta = juego más físico).
export const PRESSING_MODS = {
  baja:  { ownDef: 1.05, suppressOppAtk: 1.05, cardMult: 0.85 },
  media: { ownDef: 1.00, suppressOppAtk: 1.00, cardMult: 1.00 },
  alta:  { ownDef: 0.92, suppressOppAtk: 0.90, cardMult: 1.25 },
}
export const PRESSING_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta' }

// injuryMult/fatigueMult solo tienen efecto donde ya existe ese concepto:
// injuryMult escala la tasa de lesión (sim.js y liveMatch.js); fatigueMult
// escala la penalización por fatiga acumulada (solo existe en liveMatch.js,
// la simulación rápida no modela fatiga para nadie).
export const TEMPO_MODS = {
  pausado:     { atk: 0.95, injuryMult: 0.85, fatigueMult: 0.90 },
  equilibrado: { atk: 1.00, injuryMult: 1.00, fatigueMult: 1.00 },
  vertiginoso: { atk: 1.08, injuryMult: 1.20, fatigueMult: 1.15 },
}
export const TEMPO_LABELS = { pausado: 'Pausado', equilibrado: 'Equilibrado', vertiginoso: 'Vertiginoso' }

export const ATTACK_LABELS = { bandas: 'Por las bandas', equilibrado: 'Equilibrado', centro: 'Por el medio' }

// ── Plan de entrenamiento de pretemporada ────────────────────────────────────
// Elegido una vez por temporada (PreseasonScreen → finishPreseason), queda
// guardado en club.trainingFocus = { type, season } hasta la próxima
// pretemporada (se limpia en processSeasonEnd). atk/def se leen en
// calcStrength/calcDefStrength igual que MENTALITY_MODS/TEMPO_MODS — 'fisico'
// y 'juveniles' no tocan la fuerza del equipo, su efecto vive en otro lado
// (injuryMultExtra de generateMatchEvents / applyYouthCamp).
export const TRAINING_MODS = {
  ninguno:  { atk: 1.00, def: 1.00 },
  ataque:   { atk: 1.04, def: 0.98 },
  defensa:  { atk: 0.98, def: 1.04 },
  fisico:   { atk: 1.00, def: 1.00 },
  juveniles:{ atk: 1.00, def: 1.00 },
}
export const TRAINING_LABELS = {
  ninguno: 'Ninguno', ataque: 'Ataque', defensa: 'Defensa', fisico: 'Físico', juveniles: 'Juveniles',
}
export const TRAINING_DESCRIPTIONS = {
  ninguno: 'Sin foco especial esta temporada — ni bonus ni costo.',
  ataque: 'Más potencia ofensiva toda la temporada, a costa de algo de solidez defensiva.',
  defensa: 'Más solidez defensiva toda la temporada, a costa de algo de ataque.',
  fisico: 'Menos probabilidad de lesión en los partidos de liga durante toda la temporada — no suma ataque ni defensa.',
  juveniles: 'Entrenamiento intensivo para la cantera: cada juvenil pega un salto de nivel ahora mismo — no ayuda al primer equipo.',
}

const WIDE_POS = new Set(['EXT', 'LD', 'LI'])
const CENTRAL_POS = new Set(['MCC', 'MCO', 'MCD', 'DEL'])

// starters: array de {position, effectiveSkill} — mismo shape que ya devuelven
// getEffectiveStarters() (sim.js) y liveEffectiveStarters() (liveMatch.js), así
// que no hace falta recalcular nada, solo pasar lo que ya existe.
// "equilibrado" es neutro (0 bonus, 0 costo) — comprometerse a un canal siempre
// resta un poco de def (sos más previsible), y el bonus/malus de atq depende de
// si tu plantel realmente rinde más en ese canal o no.
export function attackChannelMods(starters, attack) {
  if (attack === 'equilibrado' || !starters?.length) return { atk: 1, def: 1 }
  const avg = arr => (arr.length ? arr.reduce((s, p) => s + p.effectiveSkill, 0) / arr.length : null)
  const wideAvg = avg(starters.filter(p => WIDE_POS.has(p.position)))
  const centralAvg = avg(starters.filter(p => CENTRAL_POS.has(p.position)))
  if (wideAvg == null || centralAvg == null) return { atk: 1, def: 1 }
  const channelAvg = attack === 'bandas' ? wideAvg : centralAvg
  const fitBonus = Math.max(-0.08, Math.min(0.08, (channelAvg - (wideAvg + centralAvg) / 2) / 100))
  return { atk: 1 + fitBonus, def: 0.97 }
}
