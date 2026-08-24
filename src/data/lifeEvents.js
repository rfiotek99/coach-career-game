// ─── Sistema de eventos de vida del DT ─────────────────────────────────────
// Cola de eventos que aparecen entre jornadas: cada uno tiene una categoría,
// un texto de situación y 2-3 opciones con consecuencias. "Vestuario" es el
// primer tipo — sumar uno nuevo (vida personal, prensa, hinchada) es agregar
// entradas a EVENT_CATEGORIES/LIFE_EVENT_TYPES y, si hace falta, un generador
// de eventos automáticos propio; el motor genérico (la cola, el modal, y
// resolveLifeEventEffects) no cambia.

import { canApplyToClub } from './gameData.js'

export const EVENT_CATEGORIES = {
  vestuario: { label: 'Vestuario', icon: '🧤' },
  mercado: { label: 'Mercado', icon: '💰' },
  carrera: { label: 'Tu carrera', icon: '🧭' },
  'prensa-personal': { label: 'La prensa', icon: '🎙️' },
  legado: { label: 'Legado', icon: '🎖️' },
}

const LEADER_COUNT = 3

// Los líderes de vestuario son los jugadores de más nivel del plantel — su
// ánimo pesa más sobre la moral del grupo (ver resolveLifeEventEffects).
export function getLeaders(squad) {
  return [...squad].sort((a, b) => b.skill - a.skill).slice(0, LEADER_COUNT).map(p => p.id)
}

export function isLeader(player, squad) {
  return getLeaders(squad).includes(player.id)
}

// ── Catálogo de tipos de evento ──────────────────────────────────────────────
// Cada entrada: categoría, texto (con variables), y opciones con `effects`
// en el vocabulario genérico { playerMorale, clubMorale, boardConfidence, reputation }.
export const LIFE_EVENT_TYPES = {
  jugador_descontento_banco: {
    category: 'vestuario',
    buildText: ({ player, n }) => `${player} lleva ${n} jornadas en el banco y pide una explicación.`,
    options: [
      { text: 'Prometele más oportunidades — lo vas a rotar en los próximos partidos', hint: '+5 Ánimo · -1 Confianza dirigencia', effects: { playerMorale: 5, boardConfidence: -1 } },
      { text: 'Hablar con honestidad — el equipo necesita lo mejor del colectivo', hint: '+2 Ánimo · +3 Confianza dirigencia', effects: { playerMorale: 2, boardConfidence: 3 } },
      { text: 'Ignorar — el técnico decide quién juega, sin excepciones', hint: '-8 Ánimo · -3 Moral plantel', effects: { playerMorale: -8, clubMorale: -3 } },
    ],
  },

  referente_protagonismo: {
    category: 'vestuario',
    buildText: ({ player, n }) => `${player}, uno de los referentes del plantel, lleva ${n} jornadas sin ser titular y pide hablar con vos.`,
    options: [
      { text: 'Va a volver a tener protagonismo pronto, es clave para el equipo', hint: '+8 Ánimo · +4 Moral plantel', effects: { playerMorale: 8, clubMorale: 4 } },
      { text: 'Explicarle el plan táctico y por qué no está jugando', hint: '+3 Ánimo · +2 Confianza dirigencia', effects: { playerMorale: 3, boardConfidence: 2 } },
      { text: 'El puesto se gana entrenando, no reclamando', hint: '-6 Ánimo · -5 Moral plantel', effects: { playerMorale: -6, clubMorale: -5 } },
    ],
  },

  pelea_vestuario: {
    category: 'vestuario',
    buildText: ({ player, rival }) => `${player} y ${rival} tuvieron un cruce fuerte en el entrenamiento. El plantel está dividido.`,
    options: [
      { text: 'Reunir al plantel y hablar las cosas de frente', hint: '+4 Moral plantel', effects: { clubMorale: 4 } },
      { text: 'Sancionar a los dos por igual', hint: '+2 Confianza dirigencia · -3 Moral plantel', effects: { boardConfidence: 2, clubMorale: -3 } },
      { text: 'Dejar que se arreglen solos', hint: '-5 Moral plantel', effects: { clubMorale: -5 } },
    ],
  },

  juvenil_debut: {
    category: 'vestuario',
    buildText: ({ player }) => `${player}, la joven promesa del club, te pide minutos — siente que está listo para dar el salto.`,
    options: [
      { text: 'Prometerle minutos en los próximos partidos', hint: '+8 Ánimo · +3 Moral plantel', effects: { playerMorale: 8, clubMorale: 3 } },
      { text: 'Explicarle el proceso — todavía necesita tiempo', hint: '+2 Ánimo · +2 Confianza dirigencia', effects: { playerMorale: 2, boardConfidence: 2 } },
      { text: 'Decirle que no está listo, sin vueltas', hint: '-6 Ánimo', effects: { playerMorale: -6 } },
    ],
  },

  tension_post_goleada: {
    category: 'vestuario',
    buildText: () => 'El vestuario quedó golpeado después de la goleada. El ambiente está tenso.',
    options: [
      { text: 'Reunión de equipo para bajar la tensión', hint: '+5 Moral plantel', effects: { clubMorale: 5 } },
      { text: 'Sesión extra de entrenamiento para corregir errores', hint: '+2 Moral plantel · +2 Confianza dirigencia', effects: { clubMorale: 2, boardConfidence: 2 } },
      { text: 'Dejar pasar la página, ya fue', hint: '-2 Moral plantel', effects: { clubMorale: -2 } },
    ],
  },

  // ── Charlas proactivas (el usuario elige jugador + tipo desde el Plantel) ──
  charla_motivar: {
    category: 'vestuario',
    buildText: ({ player }) => `Vas a hablar con ${player} para motivarlo después de su mal momento.`,
    options: [
      { text: 'Charla individual — recordarle su valor para el equipo', hint: '+6 Ánimo', effects: { playerMorale: 6 } },
      { text: 'Mostrarle videos de sus mejores jugadas', hint: '+4 Ánimo · +1 Moral plantel', effects: { playerMorale: 4, clubMorale: 1 } },
    ],
  },
  charla_felicitar: {
    category: 'vestuario',
    buildText: ({ player }) => `Vas a felicitar a ${player} por su gran momento.`,
    options: [
      { text: 'Felicitarlo en público, delante del plantel', hint: '+5 Ánimo · +2 Moral plantel', effects: { playerMorale: 5, clubMorale: 2 } },
      { text: 'Felicitarlo en privado, para no generar celos', hint: '+6 Ánimo', effects: { playerMorale: 6 } },
    ],
  },
  charla_calmar: {
    category: 'vestuario',
    buildText: ({ player }) => `${player} no está conforme con su situación en el club. Vas a hablar con él.`,
    options: [
      { text: 'Escuchar sus reclamos y comprometerte a mejorar su situación', hint: '+10 Ánimo · -1 Confianza dirigencia', effects: { playerMorale: 10, boardConfidence: -1 } },
      { text: 'Pedirle paciencia y compromiso con el proyecto', hint: '+4 Ánimo', effects: { playerMorale: 4 } },
    ],
  },

  // ── Pedidos de salida (mercado) — el jugador fuerza el planteo ─────────────
  pedido_salida_protagonismo: {
    category: 'mercado',
    buildText: ({ player }) => `${player} te para en el pasillo: lleva jornadas sin sumar minutos y ya no quiere esperar. Te pide salir del club.`,
    options: [
      { text: 'Transferirlo — lo ponemos en vidriera para la próxima ventana', hint: '+6 Ánimo · listado para vender', effects: { playerMorale: 6, transferListed: true } },
      { text: 'Convencerlo — prometerle minutos en los próximos partidos', hint: '+9 Ánimo · promesa pendiente', effects: { playerMorale: 9, promise: { type: 'more_minutes' } } },
      { text: 'Negarme — acá se queda, juegue o no', hint: '-14 Ánimo · riesgo de contagio', effects: { playerMorale: -14 } },
    ],
  },

  pedido_salida_descontento: {
    category: 'mercado',
    buildText: ({ player }) => `${player} ya no da más. Viene golpeado hace rato y te pide hablar en serio: quiere irse del club.`,
    options: [
      { text: 'Transferirlo — lo ponemos en vidriera para la próxima ventana', hint: '+6 Ánimo · listado para vender', effects: { playerMorale: 6, transferListed: true } },
      { text: 'Convencerlo — comprometerte a resolver su situación', hint: '+8 Ánimo · promesa pendiente', effects: { playerMorale: 8, promise: { type: 'improve_mood' } } },
      { text: 'Negarme — no hay salida posible ahora', hint: '-12 Ánimo · riesgo de contagio', effects: { playerMorale: -12 } },
    ],
  },

  pedido_salida_ambicion: {
    category: 'mercado',
    buildText: ({ player }) => `${player} siente que le queda chico este club. Te dice que quiere dar el salto mientras está en su mejor momento.`,
    options: [
      { text: 'Transferirlo — lo ponemos en vidriera para la próxima ventana', hint: '+5 Ánimo · listado para vender', effects: { playerMorale: 5, transferListed: true } },
      { text: 'Convencerlo — prometerle que sale la próxima ventana si sigue así', hint: '+8 Ánimo · promesa pendiente', effects: { playerMorale: 8, promise: { type: 'sell_next_window' } } },
      { text: 'Negarme — todavía te necesita el equipo', hint: '-10 Ánimo · riesgo de contagio', effects: { playerMorale: -10 } },
    ],
  },

  pedido_salida_oferta: {
    category: 'mercado',
    buildText: ({ player, suitor, amount }) =>
      `${player} te para en el pasillo: "${suitor} me quiere, y yo me quiero ir." Sobre la mesa hay una oferta de $${Math.round(amount / 1000)}k.`,
    buildOptions: ({ amount, suitorClubId }) => [
      { text: `Vender — cerrar la salida por $${Math.round(amount / 1000)}k`, hint: `+$${Math.round(amount / 1000)}k`, effects: { sellFor: { amount, buyerClubId: suitorClubId } } },
      { text: 'Convencerlo — prometerle que sale la próxima ventana si no mejora la oferta', hint: '+10 Ánimo · promesa pendiente', effects: { playerMorale: 10, promise: { type: 'sell_next_window' } } },
      { text: 'Negarme — se queda, le guste o no', hint: '-16 Ánimo · riesgo de contagio', effects: { playerMorale: -16 } },
    ],
  },

  // ── Decisiones de carrera — sobre el propio camino del DT, no del plantel ──
  carrera_tentacion_secreta: {
    category: 'carrera',
    buildText: ({ club, suitor }) =>
      `${suitor} te tentó por lo bajo: te quieren como técnico, aunque tu contrato con ${club} sigue vigente. Todavía nadie lo sabe.`,
    buildOptions: ({ suitorClubId, suitorPrestige }) => [
      { text: 'Ser leal — cortarla de raíz y avisarle a la dirigencia', hint: '+8 Confianza dirigencia · +1 Reputación', effects: { boardConfidence: 8, reputation: 1 } },
      { text: 'Escuchar la propuesta, sin comprometerte a nada', hint: '-3 Confianza dirigencia · abre diálogo', effects: { boardConfidence: -3, startCoachInterest: { clubId: suitorClubId, prestige: suitorPrestige } } },
    ],
  },

  carrera_contrato_presion: {
    category: 'carrera',
    buildText: ({ club }) =>
      `La dirigencia de ${club} quiere atarte a un contrato más largo — pero con exigencias bastante más altas.`,
    options: [
      { text: 'Firmar — más años, más presión', hint: '+2 años de contrato · -5 Confianza dirigencia · +2 Reputación', effects: { contractYears: 2, boardConfidence: -5, reputation: 2 } },
      { text: 'Rechazar — preferís ir temporada a temporada', hint: '+2 Confianza dirigencia', effects: { boardConfidence: 2 } },
    ],
  },

  carrera_club_historico_crisis: {
    category: 'carrera',
    buildText: ({ suitor }) =>
      `${suitor}, un histórico en crisis, te sondea para hacerte cargo — necesitan un salvador y pensaron en vos.`,
    buildOptions: ({ suitorClubId, suitorPrestige }) => [
      { text: 'Escuchar — un desafío así no aparece siempre', hint: '+1 Reputación · abre diálogo', effects: { reputation: 1, startCoachInterest: { clubId: suitorClubId, prestige: suitorPrestige } } },
      { text: 'Declinar — no es el momento', hint: '+2 Confianza dirigencia', effects: { boardConfidence: 2 } },
    ],
  },

  carrera_prioridad_copa: {
    category: 'carrera',
    buildText: ({ club }) =>
      `La dirigencia de ${club} te pide que priorices la copa por encima de la liga esta temporada — quieren un título internacional.`,
    options: [
      { text: 'Aceptar — la copa es la prioridad', hint: '+6 Confianza dirigencia', effects: { boardConfidence: 6 } },
      { text: 'Negarte — la liga es la base del proyecto', hint: '-3 Confianza dirigencia · +2 Reputación', effects: { boardConfidence: -3, reputation: 2 } },
    ],
  },

  // ── Prensa en persona — más allá de las ruedas de prensa post-partido ─────
  prensa_provocacion: {
    category: 'prensa-personal',
    buildText: () =>
      'Un periodista te busca la respuesta filosa en plena conferencia: "¿No cree que el equipo juega mejor sin usted en el banco?"',
    options: [
      { text: 'Responder con calma, sin caer en la trampa', hint: '+2 Reputación', effects: { reputation: 2 } },
      { text: 'Contraatacar con dureza — que se haga cargo de lo que dice', hint: '+4 Moral plantel · -3 Reputación', effects: { clubMorale: 4, reputation: -3 } },
    ],
  },

  prensa_critica_publica: {
    category: 'prensa-personal',
    buildText: () =>
      'Un colega del ambiente te cuestionó públicamente por tu manejo del plantel. Los micrófonos esperan tu respuesta.',
    options: [
      { text: 'Ignorar el comentario — no le das entidad', hint: '+3 Reputación', effects: { reputation: 3 } },
      { text: 'Responder con contundencia, defendiendo tu trabajo', hint: '+5 Confianza dirigencia · -2 Reputación', effects: { boardConfidence: 5, reputation: -2 } },
    ],
  },

  prensa_defender_jugador: {
    category: 'prensa-personal',
    buildText: ({ player }) =>
      `La prensa castiga a ${player} por su bajo nivel reciente. Te preguntan si todavía confiás en él.`,
    options: [
      { text: 'Defenderlo públicamente — tiene todo mi respaldo', hint: '+8 Ánimo · +2 Moral plantel', effects: { playerMorale: 8, clubMorale: 2 } },
      { text: 'Dejarlo solo — que responda con juego', hint: '-6 Ánimo · +2 Reputación', effects: { playerMorale: -6, reputation: 2 } },
    ],
  },

  prensa_criticar_arbitro: {
    category: 'prensa-personal',
    buildText: () =>
      'Te preguntan por el arbitraje después de la derrota. Todo el mundo espera que digas lo que piensa la hinchada.',
    options: [
      { text: 'Cuestionar el arbitraje sin filtro', hint: '+5 Moral plantel · -2 Reputación (riesgo de sanción)', effects: { clubMorale: 5, reputation: -2 } },
      { text: 'No victimizarse — el resultado fue nuestro', hint: '+3 Reputación', effects: { reputation: 3 } },
    ],
  },

  // ── Legado y presión — hitos de carrera y momentos de estrés en rachas
  // negativas. Narrativos, impacto acotado a propósito (dan color, no giran
  // la partida).
  legado_aniversario: {
    category: 'legado',
    buildText: ({ years }) =>
      `Se cumplen ${years} años desde que arrancaste como técnico. Mirás para atrás y pensás en todo lo que cambió.`,
    options: [
      { text: 'Celebrarlo con el plantel', hint: '+3 Moral plantel', effects: { clubMorale: 3 } },
      { text: 'Seguir de largo — hay trabajo que hacer', hint: '+1 Reputación', effects: { reputation: 1 } },
    ],
  },

  legado_hito_titulos: {
    category: 'legado',
    buildText: ({ n }) =>
      `Con ${n} título${n > 1 ? 's' : ''} en tu carrera, la gente empieza a hablar de vos como un ganador. ¿Cómo lo llevás?`,
    options: [
      { text: 'Con humildad — esto recién empieza', hint: '+2 Confianza dirigencia', effects: { boardConfidence: 2 } },
      { text: 'Con orgullo — te lo ganaste', hint: '+2 Reputación', effects: { reputation: 2 } },
    ],
  },

  legado_reflexion: {
    category: 'legado',
    buildText: ({ club }) =>
      `Una noche tranquila te agarra pensando en el legado que querés dejar en ${club}.`,
    options: [
      { text: 'Pensar en los títulos que todavía faltan', hint: '+1 Reputación', effects: { reputation: 1 } },
      { text: 'Pensar en la gente que formaste en el camino', hint: '+2 Moral plantel', effects: { clubMorale: 2 } },
    ],
  },

  legado_presion_racha: {
    category: 'legado',
    buildText: () =>
      'Las noches sin dormir se acumulan. La racha te pesa más de lo que admitís en público.',
    options: [
      { text: 'Tomarte un respiro y confiar en el proceso', hint: '+3 Moral plantel', effects: { clubMorale: 3 } },
      { text: 'Redoblar la exigencia con vos mismo', hint: '+2 Reputación · -2 Moral plantel', effects: { reputation: 2, clubMorale: -2 } },
    ],
  },
}

export const CHARLA_TYPES = {
  motivar:   { eventType: 'charla_motivar',   label: 'Motivar',   icon: '💪' },
  felicitar: { eventType: 'charla_felicitar', label: 'Felicitar', icon: '🎉' },
  calmar:    { eventType: 'charla_calmar',    label: 'Calmar',    icon: '🤝' },
}

let eventSeq = 0
// `optionVars` lets an event build options dynamically (e.g. a concrete transfer
// amount) instead of using the type's static `options` array — see buildOptions
// on pedido_salida_oferta below. Defaults to `vars` when omitted.
function buildEvent(typeKey, vars, subjectPlayer, optionVars) {
  const def = LIFE_EVENT_TYPES[typeKey]
  if (!def) return null
  eventSeq += 1
  return {
    id: `${typeKey}-${Date.now()}-${eventSeq}`,
    type: typeKey,
    category: def.category,
    subjectPlayerId: subjectPlayer?.id ?? null,
    subjectPlayerName: subjectPlayer?.name ?? null,
    subjectPlayerSkill: subjectPlayer?.skill ?? null,
    subjectPlayerPos: subjectPlayer?.position ?? null,
    text: def.buildText(vars),
    options: def.buildOptions ? def.buildOptions(optionVars || vars) : def.options,
  }
}

// ── Proactive charlas (user-initiated from SquadScreen) ────────────────────
export function getCharlaEvent(charlaType, player) {
  const def = CHARLA_TYPES[charlaType]
  if (!def || !player) return null
  return buildEvent(def.eventType, { player: player.name }, player)
}

// ── Automatic "vestuario" events ─────────────────────────────────────────────
// Pure — checks conditions in priority order (same style as triggerPressConference
// in pressData.js) and returns at most one new event, or null.
export function generateVestuarioEvent(club, ctx) {
  const { playerGoalDiff = null, hadPressConference = false } = ctx || {}
  const squad = club.squad || []
  if (!squad.length) return null
  const leaders = new Set(getLeaders(squad))
  const available = p => (p.injuredFor || 0) === 0 && (p.suspendedFor || 0) === 0

  // 1. Team-wide tension after a heavy loss — skip if press already covered it
  if (!hadPressConference && playerGoalDiff !== null && playerGoalDiff <= -4) {
    return buildEvent('tension_post_goleada', {}, null)
  }

  // 2. Locker room fight — low random chance, higher when club morale is already bad
  const fightChance = 0.02 + (club.morale < 40 ? 0.05 : 0)
  const fightPool = squad.filter(available)
  if (fightPool.length >= 2 && Math.random() < fightChance) {
    const shuffled = [...fightPool].sort(() => Math.random() - 0.5)
    const [a, b] = shuffled
    return buildEvent('pelea_vestuario', { player: a.name, rival: b.name }, a)
  }

  // 3-5. "Alguien en el banco quiere hablar" — tres motivos independientes que
  // antes se evaluaban en cascada con prioridad fija (líder > juvenil > resto),
  // lo que en la práctica hacía que un líder rotado tapara siempre a los otros
  // dos (es determinístico, sin dado, y en cualquier plantel con rotación normal
  // casi siempre hay uno elegible). Ahora se junta a los que están habilitados
  // esa jornada y se sortea cuál dispara, para que cada motivo tenga una chance
  // real sin tocar el cooldown global de 3 jornadas entre eventos.
  const candidates = []

  // Leader benched 3+ matchdays wants more protagonism
  const benchedLeader = squad.find(p => leaders.has(p.id) && (p.benchMatchdays || 0) >= 3 && available(p))
  if (benchedLeader) {
    candidates.push(() => buildEvent('referente_protagonismo', { player: benchedLeader.name, n: benchedLeader.benchMatchdays }, benchedLeader))
  }

  // Promising youngster benched 3+ matchdays wants a chance
  const prospect = squad.find(p =>
    p.age <= 20 && ((p.potential ?? p.skill) - p.skill) >= 10 &&
    (p.benchMatchdays || 0) >= 3 && available(p)
  )
  if (prospect) {
    candidates.push(() => buildEvent('juvenil_debut', { player: prospect.name }, prospect))
  }

  // Any other skilled, non-leader player benched 3+ matchdays (the old "discontent" case)
  const discontent = squad.find(p =>
    !leaders.has(p.id) && p.skill >= 70 && (p.benchMatchdays || 0) >= 3 && available(p)
  )
  if (discontent) {
    candidates.push(() => buildEvent('jugador_descontento_banco', { player: discontent.name, n: discontent.benchMatchdays }, discontent))
  }

  if (candidates.length) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    return pick()
  }

  return null
}

// ── Automatic "mercado" events — a player forces the exit conversation ─────
// Same style/priority-order as generateVestuarioEvent, but for players who
// want OUT rather than just an explanation. Skips anyone already mid-promise
// (no piling on) — that gets resolved first via checkPromiseDeadlines.
export function generateMarketExitEvent(club) {
  const squad = club.squad || []
  if (!squad.length) return null
  const available = p => (p.injuredFor || 0) === 0 && (p.suspendedFor || 0) === 0 && !p.promise

  // 1. Skilled player ignored on the bench way past the vestuario threshold
  const frustrated = squad.find(p => available(p) && p.skill >= 65 && (p.benchMatchdays || 0) >= 6)
  if (frustrated) return buildEvent('pedido_salida_protagonismo', { player: frustrated.name }, frustrated)

  // 2. Sustained low individual morale (see lowMoraleStreak, ticked in the store)
  const heartbroken = squad.find(p => available(p) && (p.lowMoraleStreak || 0) >= 4)
  if (heartbroken) return buildEvent('pedido_salida_descontento', { player: heartbroken.name }, heartbroken)

  // 3. Ambition — young, high ceiling, already outgrew the club's level
  const ambitious = squad.filter(p =>
    available(p) && p.age <= 23 && ((p.potential ?? p.skill) - p.skill) >= 12 && p.skill >= club.prestige * 0.55
  )
  if (ambitious.length && Math.random() < 0.05) {
    const pick = ambitious[Math.floor(Math.random() * ambitious.length)]
    return buildEvent('pedido_salida_ambicion', { player: pick.name }, pick)
  }

  return null
}

// ── Automatic "carrera" events — sobre el propio camino del DT ─────────────
// Mismo estilo/prioridad que generateVestuarioEvent/generateMarketExitEvent:
// evalúa condiciones en orden y devuelve a lo sumo un evento. `ctx`:
// { allClubs, repNow, boardConfidence, contractEndSeason, season, hasActiveInterest }
export function generateCareerEvent(myClub, ctx) {
  if (!myClub || !ctx) return null
  const { allClubs = [], repNow = 0, boardConfidence = 0, contractEndSeason, season, hasActiveInterest = false } = ctx

  // 1. Tentación secreta de un club más grande — no dispara si ya hay un
  // rumor de interés activo (evita pisar al sistema pasivo de coachInterest).
  if (!hasActiveInterest) {
    const biggerSuitors = allClubs.filter(c =>
      c.id !== myClub.id && c.managerId !== 'player' &&
      c.prestige > myClub.prestige + 10 && canApplyToClub(repNow, c.prestige)
    )
    if (biggerSuitors.length && Math.random() < 0.10) {
      const suitor = biggerSuitors[Math.floor(Math.random() * biggerSuitors.length)]
      return buildEvent(
        'carrera_tentacion_secreta', { club: myClub.name, suitor: suitor.name }, null,
        { suitorClubId: suitor.id, suitorPrestige: suitor.prestige }
      )
    }
  }

  // 2. Contrato más largo, con más presión — solo si el contrato actual está
  // por vencer pronto y la dirigencia confía lo suficiente para ofrecerlo.
  if (contractEndSeason != null && season != null && (contractEndSeason - season) <= 2 && boardConfidence >= 55) {
    if (Math.random() < 0.10) {
      return buildEvent('carrera_contrato_presion', { club: myClub.name }, null)
    }
  }

  // 3. Un histórico en crisis (prestigio alto, moral de club baja) te sondea.
  if (!hasActiveInterest) {
    const historicInCrisis = allClubs.filter(c =>
      c.id !== myClub.id && c.managerId !== 'player' &&
      c.prestige >= 80 && c.morale < 45 && canApplyToClub(repNow, c.prestige)
    )
    if (historicInCrisis.length && Math.random() < 0.12) {
      const suitor = historicInCrisis[Math.floor(Math.random() * historicInCrisis.length)]
      return buildEvent(
        'carrera_club_historico_crisis', { suitor: suitor.name }, null,
        { suitorClubId: suitor.id, suitorPrestige: suitor.prestige }
      )
    }
  }

  // 4. La dirigencia pide priorizar la copa — solo clubes de primera.
  if (myClub.leagueId === 'liga-premier' && Math.random() < 0.08) {
    return buildEvent('carrera_prioridad_copa', { club: myClub.name }, null)
  }

  return null
}

// ── Automatic "prensa-personal" events — declaraciones/polémicas fuera de las
// ruedas de prensa post-partido (esas viven en pressData.js/triggerPressConference,
// no se tocan). Mismo estilo/prioridad que los demás generadores automáticos.
// `ctx`: { repNow, boardConfidence, playerGoalDiff }
export function generatePrensaEvent(myClub, ctx) {
  if (!myClub || !ctx) return null
  const { repNow = 0, boardConfidence = 100, playerGoalDiff = null } = ctx
  const squad = myClub.squad || []

  // 1. Provocación de un periodista — cualquier DT con algo de prensa encima.
  if (repNow >= 20 && Math.random() < 0.10) {
    return buildEvent('prensa_provocacion', {}, null)
  }

  // 2. Crítica pública de un colega — más probable bajo presión de la dirigencia.
  if (boardConfidence < 60 && Math.random() < 0.09) {
    return buildEvent('prensa_critica_publica', {}, null)
  }

  // 3. La prensa castiga a un jugador de bajo ánimo — necesita un candidato.
  const criticized = squad.find(p =>
    (p.morale ?? 70) < 40 && (p.injuredFor || 0) === 0 && (p.suspendedFor || 0) === 0
  )
  if (criticized && Math.random() < 0.10) {
    return buildEvent('prensa_defender_jugador', { player: criticized.name }, criticized)
  }

  // 4. Arbitraje cuestionado — solo tras una derrota dura reciente.
  if (playerGoalDiff !== null && playerGoalDiff < 0 && Math.random() < 0.10) {
    return buildEvent('prensa_criticar_arbitro', {}, null)
  }

  return null
}

// ── Automatic "legado" events — hitos de carrera y presión en rachas negativas.
// `ctx`: { seasonsManaged, trophiesCount, streak }
export function generateLegacyEvent(myClub, ctx) {
  if (!myClub || !ctx) return null
  const { seasonsManaged = 0, trophiesCount = 0, streak = { type: 'none', count: 0 } } = ctx

  // 1. Aniversario — cada 5 temporadas dirigiendo.
  if (seasonsManaged > 0 && seasonsManaged % 5 === 0 && Math.random() < 0.08) {
    return buildEvent('legado_aniversario', { years: seasonsManaged }, null)
  }

  // 2. Hito de títulos — 1, 3, 5 o 10 en la carrera.
  if ([1, 3, 5, 10].includes(trophiesCount) && Math.random() < 0.08) {
    return buildEvent('legado_hito_titulos', { n: trophiesCount }, null)
  }

  // 3. Presión en racha negativa — mismo umbral que la rueda de prensa
  // "racha_negativa" (pressData.js), pero es un momento aparte, más íntimo.
  if (streak.type === 'loss' && streak.count >= 3 && Math.random() < 0.10) {
    return buildEvent('legado_presion_racha', {}, null)
  }

  // 4. Reflexión ambiental — solo con algo de trayectoria en el cargo.
  if (seasonsManaged >= 2 && Math.random() < 0.07) {
    return buildEvent('legado_reflexion', { club: myClub.name }, null)
  }

  return null
}

// A suitor club's interest matured into a real offer, and the player himself
// is using it as leverage — built by the store once a market rumor resolves
// (see useGame.simulateMatchday). Kept separate from generateMarketExitEvent
// because the trigger here isn't detected by scanning the squad — it comes
// from the transfer-rumor pipeline.
export function buildExitOfferEvent(player, suitorClub, amount) {
  return buildEvent(
    'pedido_salida_oferta',
    { player: player.name, suitor: suitorClub.name, amount },
    player,
    { amount, suitorClubId: suitorClub.id, suitorClubName: suitorClub.name }
  )
}

// ── Promise deadlines (from the "Convencer" option above) ──────────────────
// Pure check — the store applies morale/notification consequences and clears
// `player.promise`. Runs every matchday regardless of the vestuario/mercado
// event cooldown, since a promise breaking is a consequence, not a new prompt.
export function checkPromiseDeadlines(club, currentMatchday, season) {
  const squad = club.squad || []
  const results = []
  squad.forEach(p => {
    if (!p.promise) return
    const { type, deadlineMatchday, deadlineSeason } = p.promise
    const expired = season > deadlineSeason || (season === deadlineSeason && currentMatchday > deadlineMatchday)
    if (!expired) return
    let fulfilled = false
    if (type === 'more_minutes') fulfilled = (p.benchMatchdays || 0) === 0
    else if (type === 'improve_mood') fulfilled = (p.morale ?? 70) >= 55
    // 'sell_next_window': if we're still scanning him in this squad past the
    // deadline, he wasn't sold — always broken. If he WAS sold, he's simply
    // not in `squad` anymore, so this branch never runs for him.
    results.push({ playerId: p.id, playerName: p.name, type, fulfilled })
  })
  return results
}

// ── Generic consequence resolution (shared by every event type/category) ──
// Turns an option's `effects` into concrete deltas; the store applies them.
// Leaders' individual mood swings also nudge club morale — "manejar bien a
// los líderes mantiene el vestuario sano" without any per-event special-casing.
export function resolveLifeEventEffects(effects, { subjectPlayerId, squad }) {
  const playerMoraleDelta = effects.playerMorale || 0
  let clubMoraleDelta = effects.clubMorale || 0

  if (playerMoraleDelta && subjectPlayerId && squad) {
    const subject = squad.find(p => p.id === subjectPlayerId)
    if (subject && isLeader(subject, squad)) {
      clubMoraleDelta += Math.round(playerMoraleDelta * 0.3)
    }
  }

  return {
    playerMoraleDelta,
    clubMoraleDelta,
    boardConfidenceDelta: effects.boardConfidence || 0,
    reputationDelta: effects.reputation || 0,
  }
}
