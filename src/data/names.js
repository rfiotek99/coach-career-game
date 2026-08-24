// ── Per-country name pools ──────────────────────────────────────────────────
// Fictional but locally-authentic first/last names, keyed by countryId (see
// COUNTRIES in worldData.js). Used to generate players (and AI coaches) whose
// names match the nationality of the club they play for, instead of every
// player in the world sounding Argentine/Spanish.

export const NAME_POOLS = {
  argentina: {
    first: [
      'Carlos','Diego','Andrés','Pablo','Rodrigo','Nicolás','Lucas','Matías',
      'Federico','Sebastián','Joaquín','Gonzalo','Emiliano','Marcos','Alejandro',
      'Gabriel','Tomás','Cristian','Hernán','Roberto','Fabián','Leonardo','Damián',
      'Ignacio','Fernando','Raúl','Víctor','Miguel','Agustín','Julio','Oscar',
      'Leandro','Maximiliano','Ezequiel','Claudio','Eduardo','Gustavo','Sergio',
      'Javier','Adrián','Iván','Walter','Ariel','Néstor','Ramiro',
      'Franco','Thiago','Bruno','Lautaro','Enzo','Facundo','Nahuel','Martín',
    ],
    last: [
      'González','Rodríguez','García','López','Martínez','Fernández','Pérez',
      'Sánchez','Romero','Torres','Ramírez','Flores','Morales','Jiménez','Díaz',
      'Vargas','Castro','Ramos','Ortiz','Herrera','Medina','Santos','Reyes',
      'Álvarez','Navarro','Gómez','Molina','Ruiz','Cabrera','Mendoza','Vega',
      'Suárez','Carrillo','Delgado','Salazar','Bravo','Fuentes','Guerrero',
      'Lara','Muñoz','Ríos','Silva','Tapia','Zamora','Acosta','Aguirre',
      'Benítez','Cardozo','Domínguez','Escobar','Figueroa','Hidalgo','Ibáñez',
    ],
  },

  spain: {
    first: [
      'Javier','Alejandro','Daniel','Pablo','Adrián','Álvaro','Diego','Sergio',
      'Rubén','Iván','Carlos','Raúl','Óscar','Jorge','Marcos','Guillermo',
      'Rodrigo','Hugo','Mario','Enrique','Ignacio','Ángel','Vicente','Manuel',
      'Antonio','Francisco','Iker','Unai','Aitor','Jon','Xabier','Gorka',
      'Asier','Josu','Eneko','Íñigo','Rafael','Emilio','Salvador','Andrés',
    ],
    last: [
      'García','Fernández','González','Rodríguez','López','Martínez','Sánchez',
      'Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno',
      'Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez',
      'Vázquez','Ramos','Gil','Serrano','Blanco','Suárez','Molina','Ortega',
      'Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Iglesias','Núñez',
      'Medina','Garrido',
    ],
  },

  england: {
    first: [
      'James','Harry','Jack','Oliver','George','Charlie','Thomas','William',
      'Jacob','Alfie','Freddie','Archie','Joshua','Henry','Ethan','Daniel',
      'Callum','Ryan','Connor','Liam','Lewis','Jamie','Adam','Aaron','Luke',
      'Ben','Sam','Dylan','Owen','Toby','Max','Leo','Finley','Reece','Kyle',
      'Nathan','Elliot','Jordan','Marcus','Terry','Gary','Steven','Kevin',
      'Anthony','Craig','Wayne','Darren','Barry','Alistair','Nigel',
    ],
    last: [
      'Smith','Jones','Taylor','Brown','Wilson','Evans','Thomas','Roberts',
      'Johnson','Walker','Wright','Robinson','Thompson','White','Hughes',
      'Edwards','Green','Hall','Wood','Harris','Clarke','Turner','Cooper',
      'Ward','Baker','Morris','Cook','Bell','Bailey','Kelly','Carter',
      'Foster','Hunt','Chapman','Marsh','Fox','Grant','Doyle','Barrett',
      'Sharp','Fletcher','Holt','Dawson','Sinclair','Ashworth','Mercer',
      'Kirkland','Whitfield','Pritchard','Bramwell',
    ],
  },

  germany: {
    first: [
      'Lukas','Finn','Jonas','Leon','Paul','Felix','Maximilian','Moritz',
      'Jan','Tim','Niklas','Tobias','Sebastian','Florian','Simon','Julian',
      'Fabian','Marcel','Daniel','Christian','Stefan','Michael','Andreas',
      'Thomas','Markus','Matthias','Benjamin','Philipp','Dominik','Kevin',
      'Patrick','Alexander','Martin','Jens','Frank','Oliver','Rene','Marco',
      'Dennis','Sven','Erik','Nils','Henrik','Bastian','Timo','Kai',
    ],
    last: [
      'Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner',
      'Becker','Schulz','Hoffmann','Koch','Bauer','Richter','Klein','Wolf',
      'Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann',
      'Lange','Schmitt','Werner','Krause','Meier','Lehmann','Huber','Mayer',
      'Herrmann','König','Walter','Franke','Peters','Kaiser','Fuchs','Vogel',
      'Jung','Beck','Böhm','Winkler','Berger','Sommer','Graf','Winter',
      'Horn','Albrecht','Brandt',
    ],
  },

  italy: {
    first: [
      'Marco','Luca','Andrea','Matteo','Francesco','Alessandro','Davide',
      'Simone','Federico','Riccardo','Lorenzo','Gabriele','Stefano','Giuseppe',
      'Antonio','Giovanni','Roberto','Paolo','Fabio','Emanuele','Nicola',
      'Salvatore','Vincenzo','Alberto','Claudio','Massimo','Pietro','Michele',
      'Daniele','Filippo','Leonardo','Enrico','Angelo','Sergio','Domenico',
      'Mauro','Tommaso','Edoardo','Gianluca','Raffaele',
    ],
    last: [
      'Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo',
      'Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini',
      'Costa','Giordano','Rizzo','Lombardi','Moretti','Barbieri','Fontana',
      'Santoro','Mariani','Rinaldi','Caruso','Ferrara','Galli','Martini',
      'Leone','Longo','Gentile','Martinelli','Vitale','Villa','Serra',
      'Coppola','De Santis','Marchetti','Parisi','Ferraro','Sartori','Grasso',
      'Valentini','Messina','Monti','Bianco','Testa',
    ],
  },

  france: {
    first: [
      'Lucas','Enzo','Louis','Gabriel','Léo','Nathan','Hugo','Arthur','Adam',
      'Raphaël','Jules','Maxime','Antoine','Thomas','Baptiste','Théo','Mathis',
      'Clément','Julien','Nicolas','Alexandre','Romain','Kevin','Florian',
      'Benjamin','Guillaume','Vincent','Damien','Cédric','Fabien','Yohan',
      'Bruno','Olivier','Sébastien','Christophe','Franck','Pascal','Laurent',
      'Grégory','Mickaël',
    ],
    last: [
      'Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand',
      'Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','Garcia','David',
      'Bertrand','Roux','Vincent','Fournier','Morel','Girard','André',
      'Lambert','Bonnet','François','Legrand','Garnier','Faure','Rousseau',
      'Blanc','Guerin','Muller','Henry','Roussel','Perrin','Morin','Mathieu',
      'Gauthier','Dumont','Marchand','Renard','Chevalier','Robin','Masson',
      'Gerard',
    ],
  },

  brazil: {
    first: [
      'Gabriel','Lucas','Matheus','Rafael','Bruno','Thiago','Rodrigo','Felipe',
      'Guilherme','Pedro','Gustavo','André','Diego','Vinícius','Eduardo',
      'Leonardo','Carlos','Wesley','Alan','Anderson','Everton','Wellington',
      'Jonathan','Fábio','Renato','Marcelo','Ricardo','Adriano','Cléber',
      'Vagner','Douglas','Robson','Jefferson','Elias','Fabrício','Maicon',
      'Reinaldo','Nathan','Igor','Emerson',
    ],
    last: [
      'Silva','Souza','Santos','Oliveira','Pereira','Costa','Rodrigues',
      'Almeida','Nascimento','Carvalho','Araújo','Ribeiro','Barbosa','Freitas',
      'Barros','Mendes','Cardoso','Correia','Teixeira','Gomes','Lima','Vieira',
      'Moraes','Rocha','Dias','Nunes','Monteiro','Farias','Cavalcanti','Pinto',
      'Machado','Fernandes','Xavier','Azevedo','Moura','Duarte','Batista',
      'Campos','Tavares','Andrade',
    ],
  },

  mexico: {
    first: [
      'José','Luis','Carlos','Jesús','Juan','Miguel','Alejandro','Francisco',
      'Antonio','Manuel','Ricardo','Jorge','Alberto','Roberto','Arturo',
      'Sergio','Rubén','Israel','Édgar','Ángel','Iván','Erick','Gerardo',
      'Rodolfo','Salvador','Gustavo','Emmanuel','Fernando','Omar','Raúl',
      'Cristian','Jonathan','Alan','Uriel','Marco','Efraín','Guillermo',
      'Adrián','Hugo','Octavio',
    ],
    last: [
      'Hernández','García','Martínez','López','González','Pérez','Sánchez',
      'Ramírez','Cruz','Flores','Gómez','Díaz','Reyes','Morales','Jiménez',
      'Álvarez','Ruiz','Ramos','Vázquez','Castillo','Ortiz','Chávez',
      'Mendoza','Aguilar','Guzmán','Rangel','Zúñiga','Cervantes','Salazar',
      'Vega','Herrera','Contreras','Domínguez','Espinoza','Rosales','Delgado',
      'Bautista','Cabrera','Cortés','Villareal',
    ],
  },

  colombia: {
    first: [
      'Andrés','Camilo','Santiago','Julián','Fabián','Jhon','Duván','Óscar',
      'Kevin','Wilson','Cristian','Jefferson','Edwin','Rafael','Harold',
      'Elkin','Brayan','Yesid','Frank','Cristhian','Alexis','Marlon','Steven',
      'Diego','Mateo','Sebastián','Nicolás','Esteban','Yeferson','Anderson',
      'Wilder','Yorman','Breiner','Farid','Miguel','Jose Luis','Carlos Andrés',
    ],
    last: [
      'Ramírez','Rodríguez','Gómez','Martínez','López','García','Hernández',
      'Torres','Moreno','Muñoz','Vargas','Castro','Rojas','Suárez','Romero',
      'Ortiz','Mesa','Restrepo','Zapata','Arias','Cardona','Gaviria','Osorio',
      'Bedoya','Marín','Valencia','Salazar','Quintero','Palacios','Mosquera',
      'Cuesta','Perea','Aguilar','Preciado','Angulo','Riascos','Copete',
      'Murillo',
    ],
  },

  uruguay: {
    first: [
      'Nicolás','Federico','Diego','Matías','Rodrigo','Sebastián','Bruno',
      'Gonzalo','Maximiliano','Facundo','Agustín','Gastón','Martín','Leonardo',
      'Álvaro','Cristian','Fernando','Ignacio','Joaquín','Emiliano','Franco',
      'Lucas','Santiago','Andrés','Pablo','Marcelo','Walter','Danilo','Ramiro',
      'Guzmán',
    ],
    last: [
      'Rodríguez','Fernández','González','Pérez','Sosa','Silva','Pereira',
      'Acosta','Ferreira','Machado','Correa','Olivera','Cáceres','Viera',
      'Píriz','Methol','Umpierrez','Cardozo','Techera','Delgado','Bermúdez',
      'Zunino','Andrada','Coronel','Da Silva','Ramos','Fagúndez','Núñez',
    ],
  },
}

export function randomNameForCountry(rand, countryId) {
  const pool = NAME_POOLS[countryId] || NAME_POOLS.argentina
  const fn = pool.first[Math.floor(rand() * pool.first.length)]
  const ln = pool.last[Math.floor(rand() * pool.last.length)]
  return `${fn} ${ln}`
}

// Nationality mix for the free-agent pool (no club/country of their own) —
// weighted so Argentina/Sudamérica still dominate but the market shows
// variety. Weights don't need to sum to 100.
const FREE_AGENT_COUNTRY_WEIGHTS = [
  ['argentina', 28], ['uruguay', 9], ['brazil', 12], ['colombia', 10],
  ['mexico', 8], ['spain', 9], ['england', 7], ['germany', 6], ['italy', 6],
  ['france', 5],
]

export function randomCountryForFreeAgent(rand) {
  const total = FREE_AGENT_COUNTRY_WEIGHTS.reduce((sum, [, w]) => sum + w, 0)
  let r = rand() * total
  for (const [id, w] of FREE_AGENT_COUNTRY_WEIGHTS) {
    if (r < w) return id
    r -= w
  }
  return 'argentina'
}
