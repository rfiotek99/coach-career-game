// ── Cantera / inferiores ─────────────────────────────────────────────────────
// Genera la camada de juveniles de cada temporada (solo para el club del
// jugador — ver processSeasonEnd en useGame.js). La mayoría son del montón;
// de vez en cuando aparece una "joya" de potencial altísimo. El potencial
// real queda oculto mientras el juvenil está en la cantera — lo único visible
// es una valoración de ojeador ruidosa (scoutLabel), fija al generarse.
import { randomNameForCountry } from './names.js'

const YOUTH_POS_POOL = ['POR', 'CAR', 'CAR', 'LI', 'LD', 'MCD', 'MCC', 'MCC', 'MCO', 'EXT', 'EXT', 'DEL', 'DEL']

const GEM_CHANCE = 0.08

// 8% de los juveniles nuevos son una "joya": potencial 85-97 sin importar su
// habilidad actual (crudos, casi todos arrancan igual de flojos). El resto
// tiene un techo modesto o prometedor, relativo a su propia habilidad.
export function rollYouthPotential(rand, skill) {
  if (rand() < GEM_CHANCE) {
    return { potential: 85 + Math.floor(rand() * 13), isGem: true } // 85–97
  }
  const gap = 10 + Math.floor(rand() * 31) // 10–40
  return { potential: Math.min(97, skill + gap), isGem: false }
}

// Valoración de ojeador: una lectura RUIDOSA del potencial real (±8), fija al
// generarse — puede subestimar una joya o sobrestimar a uno del montón, a
// propósito (la incertidumbre es el punto).
export function scoutLabel(potential, rand) {
  const perceived = potential + (-8 + rand() * 16)
  if (perceived >= 88) return 'Puede ser especial'
  if (perceived >= 75) return 'Promesa interesante'
  if (perceived >= 60) return 'Con futuro'
  return 'Del montón'
}

// Genera 1-2 juveniles nuevos para `club`. `club.youthCounter` es el próximo
// índice libre para el id `${club.id}-y${n}` — nunca se resetea, así que
// nunca puede colisionar ni con `-p{i}` (plantel original) ni con un `-y{n}`
// de una temporada anterior (mismo criterio que `-p{i}`, que tampoco se
// recicla al vender un jugador).
export function generateYouthIntake(club, rand) {
  const count = 1 + Math.floor(rand() * 2) // 1–2
  const players = []
  let gemsFound = 0
  for (let i = 0; i < count; i++) {
    const position = YOUTH_POS_POOL[Math.floor(rand() * YOUTH_POS_POOL.length)]
    const age = 16 + Math.floor(rand() * 3) // 16–18
    const skill = 15 + Math.floor(rand() * 21) // 15–35, crudo a propósito
    const { potential, isGem } = rollYouthPotential(rand, skill)
    if (isGem) gemsFound++
    players.push({
      id: `${club.id}-y${club.youthCounter + i}`,
      name: randomNameForCountry(rand, club.countryId),
      position, skill, age, potential,
      clubId: club.id,
      value: Math.floor(skill * skill * 80),
      morale: 70,
      isYouth: true,
      isGem,
      scoutLabel: scoutLabel(potential, rand),
    })
  }
  return { players, gemsFound, nextCounter: club.youthCounter + count }
}
