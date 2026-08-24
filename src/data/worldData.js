import { LEAGUES } from './gameData.js'

// Agrupación continental — usada por las copas continentales (ver cup.js /
// useGame.js). Argentina cuenta como Sudamérica: si tu club argentino
// clasifica, juega la Copa Sudamericana igual que un club brasileño/
// uruguayo/colombiano (ver selectContinentalCupTeams's `extraCandidates`).
export const CONTINENTS = [
  { id: 'europa',       name: 'Europa' },
  { id: 'sudamerica',   name: 'Sudamérica' },
  { id: 'norteamerica', name: 'Norteamérica' },
]

export const COUNTRIES = [
  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', continentId: 'sudamerica' },
  { id: 'spain',     name: 'España',    flag: '🇪🇸', continentId: 'europa' },
  { id: 'england',   name: 'Inglaterra',flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', continentId: 'europa' },
  { id: 'germany',   name: 'Alemania',  flag: '🇩🇪', continentId: 'europa' },
  { id: 'italy',     name: 'Italia',    flag: '🇮🇹', continentId: 'europa' },
  { id: 'france',    name: 'Francia',   flag: '🇫🇷', continentId: 'europa' },
  { id: 'brazil',    name: 'Brasil',    flag: '🇧🇷', continentId: 'sudamerica' },
  { id: 'mexico',    name: 'México',    flag: '🇲🇽', continentId: 'norteamerica' },
  { id: 'colombia',  name: 'Colombia',  flag: '🇨🇴', continentId: 'sudamerica' },
  { id: 'uruguay',   name: 'Uruguay',   flag: '🇺🇾', continentId: 'sudamerica' },
]

// Países del mundo (WORLD_CLUBS) de un continente — excluye Argentina a
// propósito, porque sus clubes no viven en WORLD_CLUBS (ver `clubs` en el
// store); quien arma el pool de una copa continental la suma aparte.
export function getCountriesByContinent(continentId) {
  return COUNTRIES.filter(c => c.continentId === continentId && c.id !== 'argentina').map(c => c.id)
}

export const WORLD_LEAGUES = [
  // ── Spain ────────────────────────────────────────────────────────────────────
  { id: 'spain-primera',      countryId: 'spain',    name: 'Liga Primera',     tier: 1, promoteSlots: 0, relegateSlots: 3 },
  { id: 'spain-segunda',      countryId: 'spain',    name: 'Liga Segunda',     tier: 2, promoteSlots: 3, relegateSlots: 0 },
  // ── England ──────────────────────────────────────────────────────────────────
  { id: 'england-premier',    countryId: 'england',  name: 'Premier League',   tier: 1, promoteSlots: 0, relegateSlots: 3 },
  { id: 'england-championship', countryId: 'england', name: 'Championship',   tier: 2, promoteSlots: 3, relegateSlots: 0 },
  // ── Germany ──────────────────────────────────────────────────────────────────
  { id: 'germany-bundesliga',  countryId: 'germany', name: 'Bundesliga',       tier: 1, promoteSlots: 0, relegateSlots: 3 },
  { id: 'germany-bundesliga2', countryId: 'germany', name: 'Bundesliga 2',     tier: 2, promoteSlots: 3, relegateSlots: 0 },
  // ── Italy ────────────────────────────────────────────────────────────────────
  { id: 'italy-seriea',       countryId: 'italy',    name: 'Serie A',          tier: 1, promoteSlots: 0, relegateSlots: 3 },
  { id: 'italy-serieb',       countryId: 'italy',    name: 'Serie B',          tier: 2, promoteSlots: 3, relegateSlots: 0 },
  // ── France ───────────────────────────────────────────────────────────────────
  { id: 'france-ligue1',      countryId: 'france',   name: 'Ligue 1',          tier: 1, promoteSlots: 0, relegateSlots: 3 },
  { id: 'france-ligue2',      countryId: 'france',   name: 'Ligue 2',          tier: 2, promoteSlots: 3, relegateSlots: 0 },
  // ── Brazil ───────────────────────────────────────────────────────────────────
  { id: 'brazil-seriea',      countryId: 'brazil',   name: 'Série A',          tier: 1, promoteSlots: 0, relegateSlots: 4 },
  { id: 'brazil-serieb',      countryId: 'brazil',   name: 'Série B',          tier: 2, promoteSlots: 4, relegateSlots: 0 },
  // ── Mexico ───────────────────────────────────────────────────────────────────
  { id: 'mexico-ligamx',      countryId: 'mexico',   name: 'Liga MX',          tier: 1, promoteSlots: 0, relegateSlots: 2 },
  { id: 'mexico-ascenso',     countryId: 'mexico',   name: 'Ascenso MX',       tier: 2, promoteSlots: 2, relegateSlots: 0 },
  // ── Colombia ─────────────────────────────────────────────────────────────────
  { id: 'colombia-liga',      countryId: 'colombia', name: 'Liga BetPlay',     tier: 1, promoteSlots: 0, relegateSlots: 2 },
  { id: 'colombia-primera-b', countryId: 'colombia', name: 'Primera B',        tier: 2, promoteSlots: 2, relegateSlots: 0 },
  // ── Uruguay ──────────────────────────────────────────────────────────────────
  { id: 'uruguay-primera',    countryId: 'uruguay',  name: 'Primera División', tier: 1, promoteSlots: 0, relegateSlots: 2 },
  { id: 'uruguay-segunda',    countryId: 'uruguay',  name: 'Segunda División', tier: 2, promoteSlots: 2, relegateSlots: 0 },
]

// strength = Math.round(prestige * 0.8)
export const WORLD_CLUBS = [
  // ════════════════════════════════════════════════════════════════════════════
  // SPAIN — Liga Primera (18)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'real-madrena',     name: 'Real Madrena CF',       city: 'Madrid',          prestige: 95, color: '#D4AF37', leagueId: 'spain-primera', countryId: 'spain',   strength: 76 },
  { id: 'fc-barcelo',       name: 'FC Barceló',            city: 'Barcelona',       prestige: 93, color: '#A50044', leagueId: 'spain-primera', countryId: 'spain',   strength: 74 },
  { id: 'atletico-mares',   name: 'Atlético de Mares',     city: 'Madrid',          prestige: 88, color: '#CE3524', leagueId: 'spain-primera', countryId: 'spain',   strength: 70 },
  { id: 'sevilia-fc',       name: 'Sevilia FC',            city: 'Sevilla',         prestige: 82, color: '#D81920', leagueId: 'spain-primera', countryId: 'spain',   strength: 66 },
  { id: 'valencia-sur',     name: 'Valencia Sur',          city: 'Valencia',        prestige: 78, color: '#F47B20', leagueId: 'spain-primera', countryId: 'spain',   strength: 62 },
  { id: 'villarrosa-cf',    name: 'Villarrosa CF',         city: 'Villarreal',      prestige: 76, color: '#F5D400', leagueId: 'spain-primera', countryId: 'spain',   strength: 61 },
  { id: 'betis-balon',      name: 'Real Betis Balón',      city: 'Sevilla',         prestige: 74, color: '#00A650', leagueId: 'spain-primera', countryId: 'spain',   strength: 59 },
  { id: 'athletic-vasco',   name: 'Athletic Vasco',        city: 'Bilbao',          prestige: 72, color: '#EE2523', leagueId: 'spain-primera', countryId: 'spain',   strength: 58 },
  { id: 'sociedad-norte',   name: 'Real Sociedad Norte',   city: 'San Sebastián',   prestige: 70, color: '#0070B8', leagueId: 'spain-primera', countryId: 'spain',   strength: 56 },
  { id: 'osasuna-real',     name: 'Osasuna Real',          city: 'Pamplona',        prestige: 65, color: '#BB2649', leagueId: 'spain-primera', countryId: 'spain',   strength: 52 },
  { id: 'celta-vigon',      name: 'Celta de Vigón',        city: 'Vigo',            prestige: 63, color: '#5BA4CF', leagueId: 'spain-primera', countryId: 'spain',   strength: 50 },
  { id: 'rayo-vallekano',   name: 'Rayo Vallekano',        city: 'Madrid',          prestige: 60, color: '#E53935', leagueId: 'spain-primera', countryId: 'spain',   strength: 48 },
  { id: 'espanyola-rcd',    name: 'RCD Espanyola',         city: 'Barcelona',       prestige: 60, color: '#0055A5', leagueId: 'spain-primera', countryId: 'spain',   strength: 48 },
  { id: 'getafe-sur',       name: 'Getafe Sur FC',         city: 'Getafe',          prestige: 58, color: '#003DA5', leagueId: 'spain-primera', countryId: 'spain',   strength: 46 },
  { id: 'girona-norte',     name: 'Girona Norte',          city: 'Girona',          prestige: 58, color: '#CC0000', leagueId: 'spain-primera', countryId: 'spain',   strength: 46 },
  { id: 'alaves-real',      name: 'Alavés Real',           city: 'Vitoria',         prestige: 57, color: '#003C87', leagueId: 'spain-primera', countryId: 'spain',   strength: 46 },
  { id: 'mallorca-isla',    name: 'Mallorca Isla',         city: 'Palma',           prestige: 56, color: '#C41E3A', leagueId: 'spain-primera', countryId: 'spain',   strength: 45 },
  { id: 'cadiz-bahia',      name: 'Cádiz Bahía',           city: 'Cádiz',           prestige: 55, color: '#FAD000', leagueId: 'spain-primera', countryId: 'spain',   strength: 44 },

  // SPAIN — Liga Segunda (18)
  { id: 'sporting-gijona',  name: 'Sporting Gijona',       city: 'Gijón',           prestige: 65, color: '#E32015', leagueId: 'spain-segunda', countryId: 'spain',   strength: 52 },
  { id: 'zaragoza-real',    name: 'Zaragoza Real',         city: 'Zaragoza',        prestige: 62, color: '#CC0001', leagueId: 'spain-segunda', countryId: 'spain',   strength: 50 },
  { id: 'valladolid-ud',    name: 'Valladolid UD',         city: 'Valladolid',      prestige: 60, color: '#7B1FA2', leagueId: 'spain-segunda', countryId: 'spain',   strength: 48 },
  { id: 'tenerife-cf',      name: 'Tenerife CF',           city: 'Santa Cruz',      prestige: 58, color: '#003DA5', leagueId: 'spain-segunda', countryId: 'spain',   strength: 46 },
  { id: 'levante-sur',      name: 'Levante Sur',           city: 'Valencia',        prestige: 55, color: '#4169E1', leagueId: 'spain-segunda', countryId: 'spain',   strength: 44 },
  { id: 'elche-palmera',    name: 'Elche Palmera',         city: 'Elche',           prestige: 54, color: '#009900', leagueId: 'spain-segunda', countryId: 'spain',   strength: 43 },
  { id: 'almeria-solar',    name: 'Almería Solar',         city: 'Almería',         prestige: 52, color: '#CC2233', leagueId: 'spain-segunda', countryId: 'spain',   strength: 42 },
  { id: 'eibar-norte',      name: 'Eibar Norte',           city: 'Eibar',           prestige: 51, color: '#CC0000', leagueId: 'spain-segunda', countryId: 'spain',   strength: 41 },
  { id: 'burgos-real',      name: 'Burgos Real',           city: 'Burgos',          prestige: 50, color: '#000080', leagueId: 'spain-segunda', countryId: 'spain',   strength: 40 },
  { id: 'racing-santandeno',name: 'Racing Santandeño',     city: 'Santander',       prestige: 50, color: '#006600', leagueId: 'spain-segunda', countryId: 'spain',   strength: 40 },
  { id: 'huesca-sd',        name: 'Huesca SD',             city: 'Huesca',          prestige: 48, color: '#0033CC', leagueId: 'spain-segunda', countryId: 'spain',   strength: 38 },
  { id: 'mirandes-cf',      name: 'Mirandés CF',           city: 'Miranda de Ebro', prestige: 47, color: '#CC0000', leagueId: 'spain-segunda', countryId: 'spain',   strength: 38 },
  { id: 'lugo-norte',       name: 'Lugo Norte',            city: 'Lugo',            prestige: 46, color: '#660000', leagueId: 'spain-segunda', countryId: 'spain',   strength: 37 },
  { id: 'andorra-fc',       name: 'Andorra FC',            city: 'Andorra',         prestige: 45, color: '#FFCC00', leagueId: 'spain-segunda', countryId: 'spain',   strength: 36 },
  { id: 'ponferradina-real',name: 'Ponferradina Real',     city: 'Ponferrada',      prestige: 44, color: '#CC0033', leagueId: 'spain-segunda', countryId: 'spain',   strength: 35 },
  { id: 'cartagena-sur',    name: 'Cartagena Sur',         city: 'Cartagena',       prestige: 44, color: '#FF6600', leagueId: 'spain-segunda', countryId: 'spain',   strength: 35 },
  { id: 'ibiza-isla',       name: 'Ibiza Isla',            city: 'Ibiza',           prestige: 43, color: '#0066CC', leagueId: 'spain-segunda', countryId: 'spain',   strength: 34 },
  { id: 'leganes-fc',       name: 'Leganés FC',            city: 'Leganés',         prestige: 42, color: '#003DA5', leagueId: 'spain-segunda', countryId: 'spain',   strength: 34 },

  // ════════════════════════════════════════════════════════════════════════════
  // ENGLAND — Premier League (20)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'man-azul-fc',      name: 'Man Blues FC',          city: 'Manchester',      prestige: 95, color: '#6CABDD', leagueId: 'england-premier', countryId: 'england', strength: 76 },
  { id: 'mersey-reds-fc',   name: 'Mersey Reds FC',        city: 'Liverpool',       prestige: 93, color: '#C8102E', leagueId: 'england-premier', countryId: 'england', strength: 74 },
  { id: 'arsenal-norte-fc', name: 'North Bank Gunners FC', city: 'London',          prestige: 90, color: '#EF0107', leagueId: 'england-premier', countryId: 'england', strength: 72 },
  { id: 'chelsea-kings-fc', name: 'Chelsea Kings FC',      city: 'London',          prestige: 88, color: '#034694', leagueId: 'england-premier', countryId: 'england', strength: 70 },
  { id: 'man-rojo-fc',      name: 'Man Reds FC',           city: 'Manchester',      prestige: 86, color: '#DA291C', leagueId: 'england-premier', countryId: 'england', strength: 69 },
  { id: 'tottenham-fc',     name: 'Tottenham FC',          city: 'London',          prestige: 83, color: '#132257', leagueId: 'england-premier', countryId: 'england', strength: 66 },
  { id: 'newcastle-tyne',   name: 'Newcastle Tyne FC',     city: 'Newcastle',       prestige: 80, color: '#241F20', leagueId: 'england-premier', countryId: 'england', strength: 64 },
  { id: 'villa-aston-fc',   name: 'Villa Aston FC',        city: 'Birmingham',      prestige: 78, color: '#95BFE5', leagueId: 'england-premier', countryId: 'england', strength: 62 },
  { id: 'brighton-albion',  name: 'Brighton Albion FC',    city: 'Brighton',        prestige: 76, color: '#0057B8', leagueId: 'england-premier', countryId: 'england', strength: 61 },
  { id: 'west-hammers-fc',  name: 'West Hammers FC',       city: 'London',          prestige: 74, color: '#7A263A', leagueId: 'england-premier', countryId: 'england', strength: 59 },
  { id: 'brentford-west',   name: 'Brentford West FC',     city: 'London',          prestige: 70, color: '#E30613', leagueId: 'england-premier', countryId: 'england', strength: 56 },
  { id: 'fulham-thames',    name: 'Fulham Thames FC',      city: 'London',          prestige: 68, color: '#CC0000', leagueId: 'england-premier', countryId: 'england', strength: 54 },
  { id: 'wolverhampton-fc', name: 'Wolverhampton FC',      city: 'Wolverhampton',   prestige: 67, color: '#FDB913', leagueId: 'england-premier', countryId: 'england', strength: 54 },
  { id: 'palace-fc',        name: 'Palace FC',             city: 'London',          prestige: 65, color: '#1B458F', leagueId: 'england-premier', countryId: 'england', strength: 52 },
  { id: 'everton-blues',    name: 'Everton Blues FC',      city: 'Liverpool',       prestige: 65, color: '#003399', leagueId: 'england-premier', countryId: 'england', strength: 52 },
  { id: 'nottingham-fc',    name: 'Nottingham FC',         city: 'Nottingham',      prestige: 63, color: '#E53935', leagueId: 'england-premier', countryId: 'england', strength: 50 },
  { id: 'leicester-foxes',  name: 'Leicester Foxes FC',    city: 'Leicester',       prestige: 62, color: '#003090', leagueId: 'england-premier', countryId: 'england', strength: 50 },
  { id: 'bournemouth-fc',   name: 'Bournemouth FC',        city: 'Bournemouth',     prestige: 60, color: '#DA291C', leagueId: 'england-premier', countryId: 'england', strength: 48 },
  { id: 'sheffield-blades', name: 'Sheffield Blades FC',   city: 'Sheffield',       prestige: 58, color: '#EE2523', leagueId: 'england-premier', countryId: 'england', strength: 46 },
  { id: 'burnley-fc',       name: 'Burnley FC',            city: 'Burnley',         prestige: 56, color: '#6C1D45', leagueId: 'england-premier', countryId: 'england', strength: 45 },

  // ENGLAND — Championship (20)
  { id: 'leeds-united-fc',  name: 'Leeds United FC',       city: 'Leeds',           prestige: 65, color: '#FFCD00', leagueId: 'england-championship', countryId: 'england', strength: 52 },
  { id: 'sunderland-fc',    name: 'Sunderland FC',         city: 'Sunderland',      prestige: 62, color: '#EB172B', leagueId: 'england-championship', countryId: 'england', strength: 50 },
  { id: 'middlesbrough-fc', name: 'Middlesbrough FC',      city: 'Middlesbrough',   prestige: 60, color: '#EF3340', leagueId: 'england-championship', countryId: 'england', strength: 48 },
  { id: 'coventry-city',    name: 'Coventry City FC',      city: 'Coventry',        prestige: 58, color: '#59CBF0', leagueId: 'england-championship', countryId: 'england', strength: 46 },
  { id: 'west-brom-fc',     name: 'West Brom FC',          city: 'West Bromwich',   prestige: 57, color: '#122F67', leagueId: 'england-championship', countryId: 'england', strength: 46 },
  { id: 'qpr-fc',           name: 'QPR FC',                city: 'London',          prestige: 56, color: '#1D5BA4', leagueId: 'england-championship', countryId: 'england', strength: 45 },
  { id: 'hull-city-fc',     name: 'Hull City FC',          city: 'Hull',            prestige: 55, color: '#F5A12D', leagueId: 'england-championship', countryId: 'england', strength: 44 },
  { id: 'swansea-city-fc',  name: 'Swansea City FC',       city: 'Swansea',         prestige: 54, color: '#121212', leagueId: 'england-championship', countryId: 'england', strength: 43 },
  { id: 'bristol-city-fc',  name: 'Bristol City FC',       city: 'Bristol',         prestige: 53, color: '#E23115', leagueId: 'england-championship', countryId: 'england', strength: 42 },
  { id: 'cardiff-city-fc',  name: 'Cardiff City FC',       city: 'Cardiff',         prestige: 52, color: '#0070B8', leagueId: 'england-championship', countryId: 'england', strength: 42 },
  { id: 'plymouth-argyle',  name: 'Plymouth Argyle FC',    city: 'Plymouth',        prestige: 51, color: '#007B5F', leagueId: 'england-championship', countryId: 'england', strength: 41 },
  { id: 'ipswich-fc',       name: 'Ipswich FC',            city: 'Ipswich',         prestige: 50, color: '#003B88', leagueId: 'england-championship', countryId: 'england', strength: 40 },
  { id: 'preston-fc',       name: 'Preston FC',            city: 'Preston',         prestige: 49, color: '#3A3A8C', leagueId: 'england-championship', countryId: 'england', strength: 39 },
  { id: 'oxford-utd-fc',    name: 'Oxford Utd FC',         city: 'Oxford',          prestige: 48, color: '#F5BD1F', leagueId: 'england-championship', countryId: 'england', strength: 38 },
  { id: 'norwich-city-fc',  name: 'Norwich City FC',       city: 'Norwich',         prestige: 48, color: '#00A650', leagueId: 'england-championship', countryId: 'england', strength: 38 },
  { id: 'millwall-fc',      name: 'Millwall FC',           city: 'London',          prestige: 47, color: '#001D5E', leagueId: 'england-championship', countryId: 'england', strength: 38 },
  { id: 'blackburn-fc',     name: 'Blackburn FC',          city: 'Blackburn',       prestige: 46, color: '#009EE0', leagueId: 'england-championship', countryId: 'england', strength: 37 },
  { id: 'watford-fc',       name: 'Watford FC',            city: 'Watford',         prestige: 45, color: '#F00000', leagueId: 'england-championship', countryId: 'england', strength: 36 },
  { id: 'stoke-city-fc',    name: 'Stoke City FC',         city: 'Stoke-on-Trent',  prestige: 44, color: '#E03A3E', leagueId: 'england-championship', countryId: 'england', strength: 35 },
  { id: 'derby-county-fc',  name: 'Derby County FC',       city: 'Derby',           prestige: 43, color: '#231F20', leagueId: 'england-championship', countryId: 'england', strength: 34 },

  // ════════════════════════════════════════════════════════════════════════════
  // GERMANY — Bundesliga (18)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'fc-bavaros',       name: 'FC Bávaros',            city: 'Munich',          prestige: 95, color: '#DC052D', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 76 },
  { id: 'borussia-westfalia',name:'Borussia Westfalia',    city: 'Dortmund',        prestige: 88, color: '#FDE100', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 70 },
  { id: 'leverkusener-fc',  name: 'Leverkusener FC',       city: 'Leverkusen',      prestige: 83, color: '#E32221', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 66 },
  { id: 'leipzig-fc',       name: 'Leipzig FC',            city: 'Leipzig',         prestige: 80, color: '#DD0741', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 64 },
  { id: 'borusia-gladbach',  name: 'Borussia Gladbach',    city: 'Mönchengladbach', prestige: 76, color: '#000000', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 61 },
  { id: 'frankfurt-einheit',name: 'Frankfurt Einheit FC',  city: 'Frankfurt',       prestige: 74, color: '#E1000F', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 59 },
  { id: 'union-berlin-fc',  name: 'Union Berlin FC',       city: 'Berlin',          prestige: 71, color: '#EB1923', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 57 },
  { id: 'sc-friburgo',      name: 'SC Freiburg',           city: 'Freiburg',        prestige: 70, color: '#E8000D', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 56 },
  { id: 'wolfsberg-vfl',    name: 'Wolfsberg VfL',         city: 'Wolfsburg',       prestige: 68, color: '#65B32E', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 54 },
  { id: 'hoffenheim-tsg',   name: 'Hoffenheim TSG',        city: 'Hoffenheim',      prestige: 67, color: '#1961AB', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 54 },
  { id: 'colonia-fc',       name: 'FC Cologne',            city: 'Cologne',         prestige: 65, color: '#EF4135', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 52 },
  { id: 'maguncia-fc',      name: 'Mainz FC',              city: 'Mainz',        prestige: 63, color: '#C01724', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 50 },
  { id: 'augsburgo-fc',     name: 'Augsburg FC',           city: 'Augsburg',       prestige: 61, color: '#BA3733', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 49 },
  { id: 'stuttgart-vfb',    name: 'Stuttgart VfB',         city: 'Stuttgart',       prestige: 60, color: '#E32219', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 48 },
  { id: 'bremen-werder',    name: 'Bremen Werder FC',      city: 'Bremen',          prestige: 60, color: '#1D7F3C', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 48 },
  { id: 'bochum-fc',        name: 'Bochum FC',             city: 'Bochum',          prestige: 57, color: '#2348A1', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 46 },
  { id: 'heidenheim-fc',    name: 'Heidenheim FC',         city: 'Heidenheim',      prestige: 55, color: '#CF3E22', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 44 },
  { id: 'kiel-holstein',    name: 'Kiel Holstein FC',      city: 'Kiel',            prestige: 54, color: '#1A3A5C', leagueId: 'germany-bundesliga', countryId: 'germany', strength: 43 },

  // GERMANY — Bundesliga 2 (18)
  { id: 'hamburgo-fc',      name: 'Hamburgo FC',           city: 'Hamburgo',        prestige: 65, color: '#005CA9', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 52 },
  { id: 'hannover-fc',      name: 'Hannover FC',           city: 'Hannover',        prestige: 63, color: '#007A3A', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 50 },
  { id: 'lautern-fc',       name: 'Lautern FC',            city: 'Kaiserslautern',  prestige: 60, color: '#E8000D', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 48 },
  { id: 'schalke-fc',       name: 'Schalke FC',            city: 'Gelsenkirchen',   prestige: 60, color: '#034EA2', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 48 },
  { id: 'furth-fc',         name: 'Fürth FC',              city: 'Fürth',           prestige: 55, color: '#06A139', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 44 },
  { id: 'karlsruhe-sc',     name: 'Karlsruhe SC',          city: 'Karlsruhe',       prestige: 53, color: '#1F4E9C', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 42 },
  { id: 'nurnberg-fc',      name: 'Nürnberg FC',           city: 'Nürnberg',        prestige: 52, color: '#C2051B', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 42 },
  { id: 'dusseldorf-fc',    name: 'Düsseldorf FC',         city: 'Düsseldorf',      prestige: 52, color: '#DE2119', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 42 },
  { id: 'braunschweig-fc',  name: 'Braunschweig FC',       city: 'Braunschweig',    prestige: 49, color: '#EDBD1D', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 39 },
  { id: 'osnabruck-fc',     name: 'Osnabrück FC',          city: 'Osnabrück',       prestige: 48, color: '#1A3A5C', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 38 },
  { id: 'hertha-fc',        name: 'Hertha FC',             city: 'Berlin',          prestige: 48, color: '#015CA1', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 38 },
  { id: 'paderborn-fc',     name: 'Paderborn FC',          city: 'Paderborn',       prestige: 47, color: '#005CA9', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 38 },
  { id: 'regensburg-fc',    name: 'Regensburg FC',         city: 'Regensburg',      prestige: 46, color: '#E10019', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 37 },
  { id: 'bielefeld-fc',     name: 'Bielefeld FC',          city: 'Bielefeld',       prestige: 45, color: '#005CA9', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 36 },
  { id: 'elversberg-fc',    name: 'Elversberg FC',         city: 'Elversberg',      prestige: 44, color: '#1A3A5C', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 35 },
  { id: 'rostock-fc',       name: 'Rostock FC',            city: 'Rostock',         prestige: 44, color: '#00639A', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 35 },
  { id: 'magdeburg-fc',     name: 'Magdeburg FC',          city: 'Magdeburg',       prestige: 43, color: '#005CA9', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 34 },
  { id: 'wiesbaden-fc',     name: 'Wiesbaden FC',          city: 'Wiesbaden',       prestige: 42, color: '#1A3A5C', leagueId: 'germany-bundesliga2', countryId: 'germany', strength: 34 },

  // ════════════════════════════════════════════════════════════════════════════
  // ITALY — Serie A (18)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'inter-fc',         name: 'Inter FC',              city: 'Milán',           prestige: 93, color: '#010E80', leagueId: 'italy-seriea', countryId: 'italy', strength: 74 },
  { id: 'juventos-fc',      name: 'Piemonte FC',           city: 'Turin',           prestige: 90, color: '#1A1A2E', leagueId: 'italy-seriea', countryId: 'italy', strength: 72 },
  { id: 'milano-ac',        name: 'Milano AC',             city: 'Milán',           prestige: 88, color: '#FB090B', leagueId: 'italy-seriea', countryId: 'italy', strength: 70 },
  { id: 'napoli-fc',        name: 'Napoli Azzurra FC',     city: 'Naples',         prestige: 86, color: '#087AC5', leagueId: 'italy-seriea', countryId: 'italy', strength: 69 },
  { id: 'roma-as',          name: 'Roma AS',               city: 'Roma',            prestige: 82, color: '#8E1F2F', leagueId: 'italy-seriea', countryId: 'italy', strength: 66 },
  { id: 'lazio-fc',         name: 'Lazio FC',              city: 'Roma',            prestige: 78, color: '#87C8EB', leagueId: 'italy-seriea', countryId: 'italy', strength: 62 },
  { id: 'atalanta-fc',      name: 'Atalanta FC',           city: 'Bergamo',         prestige: 77, color: '#1C78C0', leagueId: 'italy-seriea', countryId: 'italy', strength: 62 },
  { id: 'la-fiorentina',    name: 'Toscana FC',            city: 'Florence',       prestige: 74, color: '#9B2335', leagueId: 'italy-seriea', countryId: 'italy', strength: 59 },
  { id: 'torino-fc',        name: 'Torino FC',             city: 'Turin',           prestige: 70, color: '#811E18', leagueId: 'italy-seriea', countryId: 'italy', strength: 56 },
  { id: 'bolonia-fc',       name: 'Bolonia FC',            city: 'Bolonia',         prestige: 70, color: '#0E3D77', leagueId: 'italy-seriea', countryId: 'italy', strength: 56 },
  { id: 'udinese-fc',       name: 'Udinese FC',            city: 'Udine',           prestige: 65, color: '#3A3A3A', leagueId: 'italy-seriea', countryId: 'italy', strength: 52 },
  { id: 'sassuolo-fc',      name: 'Sassuolo FC',           city: 'Sassuolo',        prestige: 62, color: '#1A7B30', leagueId: 'italy-seriea', countryId: 'italy', strength: 50 },
  { id: 'monza-ac',         name: 'Monza AC',              city: 'Monza',           prestige: 61, color: '#E2001A', leagueId: 'italy-seriea', countryId: 'italy', strength: 49 },
  { id: 'lecce-fc',         name: 'Lecce FC',              city: 'Lecce',           prestige: 60, color: '#FFCC00', leagueId: 'italy-seriea', countryId: 'italy', strength: 48 },
  { id: 'verona-hellas',    name: 'Verona Hellas',         city: 'Verona',          prestige: 58, color: '#004B87', leagueId: 'italy-seriea', countryId: 'italy', strength: 46 },
  { id: 'cagliari-fc',      name: 'Cagliari FC',           city: 'Cagliari',        prestige: 57, color: '#CB2528', leagueId: 'italy-seriea', countryId: 'italy', strength: 46 },
  { id: 'empoli-fc',        name: 'Empoli FC',             city: 'Empoli',          prestige: 55, color: '#007FBE', leagueId: 'italy-seriea', countryId: 'italy', strength: 44 },
  { id: 'frosinone-fc',     name: 'Frosinone FC',          city: 'Frosinone',       prestige: 53, color: '#FFCC00', leagueId: 'italy-seriea', countryId: 'italy', strength: 42 },

  // ITALY — Serie B (18)
  { id: 'palermo-fc',       name: 'Palermo FC',            city: 'Palermo',         prestige: 65, color: '#C0388B', leagueId: 'italy-serieb', countryId: 'italy', strength: 52 },
  { id: 'sampdoria-fc',     name: 'Sampdoria FC',          city: 'Genoa',          prestige: 63, color: '#0E47A1', leagueId: 'italy-serieb', countryId: 'italy', strength: 50 },
  { id: 'genova-fc',        name: 'Genoa FC',              city: 'Genoa',          prestige: 62, color: '#C00303', leagueId: 'italy-serieb', countryId: 'italy', strength: 50 },
  { id: 'catanzaro-fc',     name: 'Catanzaro FC',          city: 'Catanzaro',       prestige: 58, color: '#FFCC00', leagueId: 'italy-serieb', countryId: 'italy', strength: 46 },
  { id: 'cremonese-fc',     name: 'Cremonese FC',          city: 'Cremona',         prestige: 55, color: '#8B1A1A', leagueId: 'italy-serieb', countryId: 'italy', strength: 44 },
  { id: 'bari-fc',          name: 'Bari FC',               city: 'Bari',            prestige: 53, color: '#DA1C2C', leagueId: 'italy-serieb', countryId: 'italy', strength: 42 },
  { id: 'venezia-fc',       name: 'Venezia FC',            city: 'Venecia',         prestige: 52, color: '#F49F0A', leagueId: 'italy-serieb', countryId: 'italy', strength: 42 },
  { id: 'cittadella-fc',    name: 'Cittadella FC',         city: 'Cittadella',      prestige: 51, color: '#7A0012', leagueId: 'italy-serieb', countryId: 'italy', strength: 41 },
  { id: 'pisa-fc',          name: 'Pisa FC',               city: 'Pisa',            prestige: 50, color: '#0B2F7A', leagueId: 'italy-serieb', countryId: 'italy', strength: 40 },
  { id: 'spezia-fc',        name: 'Spezia FC',             city: 'La Spezia',       prestige: 49, color: '#005C9B', leagueId: 'italy-serieb', countryId: 'italy', strength: 39 },
  { id: 'modena-fc',        name: 'Modena FC',             city: 'Modena',          prestige: 48, color: '#FFCC00', leagueId: 'italy-serieb', countryId: 'italy', strength: 38 },
  { id: 'sudtirol-fc',      name: 'Sudtirol FC',           city: 'Bolzano',         prestige: 47, color: '#CC0000', leagueId: 'italy-serieb', countryId: 'italy', strength: 38 },
  { id: 'brescia-fc',       name: 'Brescia FC',            city: 'Brescia',         prestige: 47, color: '#003DA5', leagueId: 'italy-serieb', countryId: 'italy', strength: 38 },
  { id: 'cosenza-fc',       name: 'Cosenza FC',            city: 'Cosenza',         prestige: 46, color: '#CC0000', leagueId: 'italy-serieb', countryId: 'italy', strength: 37 },
  { id: 'ternana-fc',       name: 'Ternana FC',            city: 'Terni',           prestige: 45, color: '#CC0000', leagueId: 'italy-serieb', countryId: 'italy', strength: 36 },
  { id: 'reggiana-fc',      name: 'Reggiana FC',           city: 'Reggio Emilia',   prestige: 44, color: '#D60404', leagueId: 'italy-serieb', countryId: 'italy', strength: 35 },
  { id: 'ascoli-fc',        name: 'Ascoli FC',             city: 'Ascoli Piceno',   prestige: 43, color: '#3A3A3A', leagueId: 'italy-serieb', countryId: 'italy', strength: 34 },
  { id: 'feralpi-fc',       name: 'Feralpi FC',            city: 'Salò',            prestige: 42, color: '#008000', leagueId: 'italy-serieb', countryId: 'italy', strength: 34 },

  // ════════════════════════════════════════════════════════════════════════════
  // FRANCE — Ligue 1 (18)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'paris-royal-fc',   name: 'Paris Royal FC',        city: 'París',           prestige: 95, color: '#004170', leagueId: 'france-ligue1', countryId: 'france', strength: 76 },
  { id: 'marsella-fc',      name: 'Marseille FC',          city: 'Marseille',        prestige: 85, color: '#2EB6E1', leagueId: 'france-ligue1', countryId: 'france', strength: 68 },
  { id: 'monaco-as',        name: 'Monaco AS',             city: 'Monaco',          prestige: 82, color: '#DA121A', leagueId: 'france-ligue1', countryId: 'france', strength: 66 },
  { id: 'lyon-ol',          name: 'Lyon OL',               city: 'Lyon',            prestige: 80, color: '#0066CC', leagueId: 'france-ligue1', countryId: 'france', strength: 64 },
  { id: 'nice-fc',          name: 'Nice FC',               city: 'Nice',            prestige: 76, color: '#002D6A', leagueId: 'france-ligue1', countryId: 'france', strength: 61 },
  { id: 'lens-fc',          name: 'Lens FC',               city: 'Lens',            prestige: 74, color: '#E30613', leagueId: 'france-ligue1', countryId: 'france', strength: 59 },
  { id: 'lille-fc',         name: 'Lille FC',              city: 'Lille',           prestige: 73, color: '#CC0000', leagueId: 'france-ligue1', countryId: 'france', strength: 58 },
  { id: 'rennes-fc',        name: 'Rennes FC',             city: 'Rennes',          prestige: 71, color: '#CC0000', leagueId: 'france-ligue1', countryId: 'france', strength: 57 },
  { id: 'nantes-fc',        name: 'Nantes FC',             city: 'Nantes',          prestige: 68, color: '#F7BC00', leagueId: 'france-ligue1', countryId: 'france', strength: 54 },
  { id: 'estrasburgo-fc',   name: 'Strasbourg FC',         city: 'Strasbourg',     prestige: 65, color: '#0B4EA2', leagueId: 'france-ligue1', countryId: 'france', strength: 52 },
  { id: 'montpellier-fc',   name: 'Montpellier FC',        city: 'Montpellier',     prestige: 63, color: '#F97B00', leagueId: 'france-ligue1', countryId: 'france', strength: 50 },
  { id: 'brest-fc',         name: 'Brest FC',              city: 'Brest',           prestige: 62, color: '#DA121A', leagueId: 'france-ligue1', countryId: 'france', strength: 50 },
  { id: 'reims-fc',         name: 'Reims FC',              city: 'Reims',           prestige: 61, color: '#DA121A', leagueId: 'france-ligue1', countryId: 'france', strength: 49 },
  { id: 'toulouse-fc',      name: 'Toulouse FC',           city: 'Toulouse',        prestige: 60, color: '#7C32B4', leagueId: 'france-ligue1', countryId: 'france', strength: 48 },
  { id: 'lorient-fc',       name: 'Lorient FC',            city: 'Lorient',         prestige: 58, color: '#DA121A', leagueId: 'france-ligue1', countryId: 'france', strength: 46 },
  { id: 'clermont-fc',      name: 'Clermont FC',           city: 'Clermont-Ferrand',prestige: 57, color: '#D21E1B', leagueId: 'france-ligue1', countryId: 'france', strength: 46 },
  { id: 'metz-fc',          name: 'Metz FC',               city: 'Metz',            prestige: 55, color: '#D21E1B', leagueId: 'france-ligue1', countryId: 'france', strength: 44 },
  { id: 'le-havre-fc',      name: 'Le Havre FC',           city: 'Le Havre',        prestige: 54, color: '#1D6FA4', leagueId: 'france-ligue1', countryId: 'france', strength: 43 },

  // FRANCE — Ligue 2 (18)
  { id: 'bordeaux-fc',      name: 'Bordeaux FC',           city: 'Bordeaux',         prestige: 65, color: '#003DAA', leagueId: 'france-ligue2', countryId: 'france', strength: 52 },
  { id: 'guingamp-fc',      name: 'Guingamp FC',           city: 'Guingamp',        prestige: 60, color: '#DA121A', leagueId: 'france-ligue2', countryId: 'france', strength: 48 },
  { id: 'laval-fc',         name: 'Laval FC',              city: 'Laval',           prestige: 57, color: '#CC0000', leagueId: 'france-ligue2', countryId: 'france', strength: 46 },
  { id: 'amiens-fc',        name: 'Amiens FC',             city: 'Amiens',          prestige: 55, color: '#1D6FA4', leagueId: 'france-ligue2', countryId: 'france', strength: 44 },
  { id: 'grenoble-fc',      name: 'Grenoble FC',           city: 'Grenoble',        prestige: 53, color: '#0B4EA2', leagueId: 'france-ligue2', countryId: 'france', strength: 42 },
  { id: 'bastia-fc',        name: 'Bastia FC',             city: 'Bastia',          prestige: 52, color: '#1D6FA4', leagueId: 'france-ligue2', countryId: 'france', strength: 42 },
  { id: 'troyes-fc',        name: 'Troyes FC',             city: 'Troyes',          prestige: 51, color: '#003DA5', leagueId: 'france-ligue2', countryId: 'france', strength: 41 },
  { id: 'saint-etienne-fc', name: 'Saint-Étienne FC',      city: 'Saint-Étienne',   prestige: 51, color: '#007F3F', leagueId: 'france-ligue2', countryId: 'france', strength: 41 },
  { id: 'valenciennes-fc',  name: 'Valenciennes FC',       city: 'Valenciennes',    prestige: 49, color: '#DA121A', leagueId: 'france-ligue2', countryId: 'france', strength: 39 },
  { id: 'angers-fc',        name: 'Angers FC',             city: 'Angers',          prestige: 49, color: '#DA121A', leagueId: 'france-ligue2', countryId: 'france', strength: 39 },
  { id: 'pau-fc',           name: 'Pau FC',                city: 'Pau',             prestige: 47, color: '#003DA5', leagueId: 'france-ligue2', countryId: 'france', strength: 38 },
  { id: 'caen-fc',          name: 'Caen FC',               city: 'Caen',            prestige: 46, color: '#003DA5', leagueId: 'france-ligue2', countryId: 'france', strength: 37 },
  { id: 'rouen-fc',         name: 'Rouen FC',              city: 'Rouen',            prestige: 45, color: '#1D6FA4', leagueId: 'france-ligue2', countryId: 'france', strength: 36 },
  { id: 'dunkerque-fc',     name: 'Dunkerque FC',          city: 'Dunkerque',       prestige: 44, color: '#003DA5', leagueId: 'france-ligue2', countryId: 'france', strength: 35 },
  { id: 'niort-fc',         name: 'Niort FC',              city: 'Niort',           prestige: 43, color: '#006600', leagueId: 'france-ligue2', countryId: 'france', strength: 34 },
  { id: 'rodez-fc',         name: 'Rodez FC',              city: 'Rodez',           prestige: 43, color: '#CC0000', leagueId: 'france-ligue2', countryId: 'france', strength: 34 },
  { id: 'concarneau-fc',    name: 'Concarneau FC',         city: 'Concarneau',      prestige: 42, color: '#0B4EA2', leagueId: 'france-ligue2', countryId: 'france', strength: 34 },
  { id: 'martigues-fc',     name: 'Martigues FC',          city: 'Martigues',       prestige: 41, color: '#DA121A', leagueId: 'france-ligue2', countryId: 'france', strength: 33 },

  // ════════════════════════════════════════════════════════════════════════════
  // BRAZIL — Série A (20)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'flamingo-rj',      name: 'Guanabara EC',          city: 'Río de Janeiro',  prestige: 92, color: '#E60000', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 74 },
  { id: 'palmeiras-sp',     name: 'Ipiranga EC',           city: 'São Paulo',       prestige: 88, color: '#006437', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 70 },
  { id: 'fluminense-fc',    name: 'Tijuca FC',             city: 'Río de Janeiro',  prestige: 85, color: '#8B0000', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 68 },
  { id: 'corinthos-sc',     name: 'Bandeirantes SC',       city: 'São Paulo',       prestige: 83, color: '#1A1A1A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 66 },
  { id: 'sao-paulo-fc',     name: 'Paulista EC',           city: 'São Paulo',       prestige: 81, color: '#DA0A0A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 65 },
  { id: 'atletico-mineiro', name: 'Inconfidência EC',      city: 'Belo Horizonte',  prestige: 79, color: '#1A1A1A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 63 },
  { id: 'cruzeiro-ec',      name: 'Serra Azul EC',         city: 'Belo Horizonte',  prestige: 77, color: '#003780', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 62 },
  { id: 'internacional-rs', name: 'Gaúcho EC',             city: 'Porto Alegre',    prestige: 76, color: '#DA0A0A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 61 },
  { id: 'gremio-fc',        name: 'Tricolor Sul FC',       city: 'Porto Alegre',    prestige: 75, color: '#1E4D90', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 60 },
  { id: 'santos-fc',        name: 'Baixada Santista FC',   city: 'Santos',          prestige: 73, color: '#1A1A1A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 58 },
  { id: 'botafogo-rj',      name: 'Copacabana EC',         city: 'Río de Janeiro',  prestige: 71, color: '#1A1A1A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 57 },
  { id: 'atletico-pr',      name: 'Paraná Central FC',     city: 'Curitiba',        prestige: 70, color: '#CC0000', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 56 },
  { id: 'vasco-da-gama',    name: 'Lusitano RJ FC',        city: 'Río de Janeiro',  prestige: 68, color: '#1A1A1A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 54 },
  { id: 'bahia-ec',         name: 'Salvador Atlântico EC', city: 'Salvador',        prestige: 66, color: '#0038A8', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 53 },
  { id: 'fortaleza-ec',     name: 'Iracema EC',            city: 'Fortaleza',       prestige: 64, color: '#005CA9', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 51 },
  { id: 'sport-recife',     name: 'Pernambuco EC',         city: 'Recife',          prestige: 62, color: '#CC0000', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 50 },
  { id: 'ceara-sc',         name: 'Jangada SC',            city: 'Fortaleza',       prestige: 60, color: '#1A1A1A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 48 },
  { id: 'goias-ec',         name: 'Cerrado EC',            city: 'Goiânia',         prestige: 58, color: '#007A3A', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 46 },
  { id: 'red-bragantino',   name: 'Bragança EC',           city: 'Bragança Paulista',prestige: 57, color: '#CC0000', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 46 },
  { id: 'cuiaba-ec',        name: 'Pantanal EC',           city: 'Cuiabá',          prestige: 55, color: '#FAD000', leagueId: 'brazil-seriea', countryId: 'brazil', strength: 44 },

  // BRAZIL — Série B (20)
  { id: 'criciuma-ec',      name: 'Carvão EC',             city: 'Criciúma',        prestige: 64, color: '#FFD700', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 51 },
  { id: 'sampaio-fc',       name: 'Maranhão FC',           city: 'São Luís',        prestige: 60, color: '#DA0A0A', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 48 },
  { id: 'ituano-fc',        name: 'Itu Colonial FC',       city: 'Itu',             prestige: 57, color: '#C80000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 46 },
  { id: 'vila-nova-fc',     name: 'Goiânia Central FC',    city: 'Goiânia',         prestige: 53, color: '#CC0000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 42 },
  { id: 'america-mg',       name: 'Sabará EC',             city: 'Belo Horizonte',  prestige: 52, color: '#008000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 42 },
  { id: 'ponte-preta',      name: 'Campinas Central EC',   city: 'Campinas',        prestige: 51, color: '#1A1A1A', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 41 },
  { id: 'abc-fc',           name: 'Potiguar FC',           city: 'Natal',           prestige: 50, color: '#CC0000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 40 },
  { id: 'chapecoense-fc',   name: 'Oeste Catarinense FC',  city: 'Chapecó',         prestige: 49, color: '#008000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 39 },
  { id: 'atletico-go',      name: 'Anápolis FC',           city: 'Goiânia',         prestige: 48, color: '#CC0000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 38 },
  { id: 'guarani-fc',       name: 'Campinas Verde FC',     city: 'Campinas',        prestige: 48, color: '#006600', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 38 },
  { id: 'mirassol-fc',      name: 'Mirassol Rural FC',     city: 'Mirassol',        prestige: 47, color: '#CC0000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 38 },
  { id: 'novorizontino-fc', name: 'Horizonte Novo FC',     city: 'Novo Horizonte',  prestige: 46, color: '#CC0000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 37 },
  { id: 'paysandu-sc',      name: 'Belém Norte FC',        city: 'Belém',           prestige: 45, color: '#003DA5', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 36 },
  { id: 'remo-fc',          name: 'Guamá FC',              city: 'Belém',           prestige: 44, color: '#003DA5', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 35 },
  { id: 'botafogo-sp',      name: 'Ribeirão Central FC',   city: 'Ribeirão Preto',  prestige: 43, color: '#1A1A1A', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 34 },
  { id: 'coritiba-fc',      name: 'Curitiba Pinhais FC',   city: 'Curitiba',        prestige: 43, color: '#008000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 34 },
  { id: 'oeste-fc',         name: 'Itápolis Oeste FC',     city: 'Itápolis',        prestige: 42, color: '#CC0000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 34 },
  { id: 'figueirense-fc',   name: 'Ilha FC',               city: 'Florianópolis',   prestige: 41, color: '#1A1A1A', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 33 },
  { id: 'crb-fc',           name: 'Alagoas FC',            city: 'Maceió',          prestige: 40, color: '#CC0000', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 32 },
  { id: 'confianca-fc',     name: 'Sergipe FC',            city: 'Aracaju',         prestige: 40, color: '#003DA5', leagueId: 'brazil-serieb', countryId: 'brazil', strength: 32 },

  // ════════════════════════════════════════════════════════════════════════════
  // MEXICO — Liga MX (18)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'america-cf',       name: 'Aztecas FC',            city: 'Ciudad de México',prestige: 90, color: '#FFD700', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 72 },
  { id: 'guadalajara-fc',   name: 'Jalisco FC',            city: 'Guadalajara',     prestige: 86, color: '#CC0000', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 69 },
  { id: 'cruz-azul-fc',     name: 'Hidalgo Central FC',    city: 'Ciudad de México',prestige: 82, color: '#003DA5', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 66 },
  { id: 'tigres-fc',        name: 'Regio Felinos FC',      city: 'Monterrey',       prestige: 81, color: '#FF8C00', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 65 },
  { id: 'monterrey-fc',     name: 'Sierra Madre FC',       city: 'Monterrey',       prestige: 79, color: '#003DA5', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 63 },
  { id: 'pumas-fc',         name: 'Capital Felinos FC',    city: 'Ciudad de México',prestige: 76, color: '#FFD700', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 61 },
  { id: 'necaxa-fc',        name: 'Aguascalientes FC',     city: 'Aguascalientes',  prestige: 72, color: '#CC0000', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 58 },
  { id: 'toluca-fc',        name: 'Nevado FC',             city: 'Toluca',          prestige: 71, color: '#CC0000', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 57 },
  { id: 'leon-fc',          name: 'Bajío FC',              city: 'León',            prestige: 70, color: '#008000', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 56 },
  { id: 'santos-laguna',    name: 'Laguna FC',             city: 'Torreón',         prestige: 68, color: '#008000', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 54 },
  { id: 'atlas-fc',         name: 'Zapopan FC',            city: 'Guadalajara',     prestige: 66, color: '#CC0000', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 53 },
  { id: 'queretaro-fc',     name: 'Querétaro Colonial FC', city: 'Querétaro',       prestige: 64, color: '#003DA5', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 51 },
  { id: 'mazatlan-fc',      name: 'Pacífico FC',           city: 'Mazatlán',        prestige: 62, color: '#9900CC', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 50 },
  { id: 'juarez-fc',        name: 'Frontera FC',           city: 'Ciudad Juárez',   prestige: 61, color: '#CC0000', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 49 },
  { id: 'tijuana-fc',       name: 'Baja FC',               city: 'Tijuana',         prestige: 60, color: '#1A1A1A', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 48 },
  { id: 'puebla-fc',        name: 'Angelópolis FC',        city: 'Puebla',          prestige: 59, color: '#003DA5', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 47 },
  { id: 'pachuca-fc',       name: 'Hidalgo Minero FC',     city: 'Pachuca',         prestige: 58, color: '#1A5276', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 46 },
  { id: 'san-luis-fc',      name: 'Potosino FC',           city: 'San Luis Potosí', prestige: 56, color: '#CC0000', leagueId: 'mexico-ligamx', countryId: 'mexico', strength: 45 },

  // MEXICO — Ascenso MX (18)
  { id: 'oaxaca-fc',        name: 'Oaxaca Valles FC',      city: 'Oaxaca',          prestige: 55, color: '#FF6600', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 44 },
  { id: 'cancun-fc',        name: 'Caribe FC',             city: 'Cancún',          prestige: 52, color: '#003DA5', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 42 },
  { id: 'leones-fc',        name: 'Tapatío Felinos FC',    city: 'Guadalajara',     prestige: 51, color: '#1A1A1A', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 41 },
  { id: 'tampico-fc',       name: 'Tamaulipas FC',         city: 'Tampico',         prestige: 49, color: '#CC0000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 39 },
  { id: 'celaya-fc',        name: 'Bajío Celaya FC',       city: 'Celaya',          prestige: 48, color: '#CC0000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 38 },
  { id: 'zacatecas-fc',     name: 'Zacatecas Minero FC',   city: 'Zacatecas',       prestige: 47, color: '#666666', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 38 },
  { id: 'sonora-fc',        name: 'Desierto FC',           city: 'Hermosillo',      prestige: 46, color: '#CC0000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 37 },
  { id: 'atlante-fc',       name: 'Quintana Roo FC',       city: 'Cancún',          prestige: 46, color: '#003DA5', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 37 },
  { id: 'venados-fc',       name: 'Yucatán FC',            city: 'Mérida',          prestige: 45, color: '#008000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 36 },
  { id: 'dorados-fc',       name: 'Sinaloa FC',            city: 'Culiacán',        prestige: 44, color: '#FFD700', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 35 },
  { id: 'tapatio-fc',       name: 'Jalisco Joven FC',      city: 'Guadalajara',     prestige: 44, color: '#CC0000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 35 },
  { id: 'correcaminos-fc',  name: 'Tamaulipas Sur FC',     city: 'Victoria',        prestige: 43, color: '#CC0000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 34 },
  { id: 'cafetaleros-fc',   name: 'Soconusco FC',          city: 'Tapachula',       prestige: 42, color: '#008000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 34 },
  { id: 'raya-fc',          name: 'Nayarit FC',            city: 'Tepic',           prestige: 41, color: '#CC0000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 33 },
  { id: 'lobos-fc',         name: 'Puebla Sierra FC',      city: 'Puebla',          prestige: 41, color: '#003DA5', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 33 },
  { id: 'murciélagos-fc',   name: 'Valle Mexicali FC',     city: 'Mexicali',        prestige: 40, color: '#660066', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 32 },
  { id: 'pioneros-fc',      name: 'Riviera Maya FC',       city: 'Cancún',          prestige: 40, color: '#003DA5', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 32 },
  { id: 'reboceros-fc',     name: 'Michoacán FC',          city: 'La Piedad',       prestige: 40, color: '#CC0000', leagueId: 'mexico-ascenso', countryId: 'mexico', strength: 32 },

  // ════════════════════════════════════════════════════════════════════════════
  // COLOMBIA — Liga BetPlay (18)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'nacional-fc',      name: 'Paisa EC',              city: 'Medellín',        prestige: 85, color: '#008000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 68 },
  { id: 'millonarios-fc',   name: 'Sabana FC',             city: 'Bogotá',          prestige: 82, color: '#003DA5', leagueId: 'colombia-liga', countryId: 'colombia', strength: 66 },
  { id: 'dim-fc',           name: 'Medellín Poblado FC',   city: 'Medellín',        prestige: 78, color: '#CC0000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 62 },
  { id: 'santa-fe-fc',      name: 'Bogotá Capital FC',     city: 'Bogotá',          prestige: 76, color: '#CC0000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 61 },
  { id: 'america-cali',     name: 'Valle FC',              city: 'Cali',            prestige: 74, color: '#CC0000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 59 },
  { id: 'cali-fc',          name: 'Cañaveral FC',          city: 'Cali',            prestige: 72, color: '#008000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 58 },
  { id: 'junior-fc',        name: 'Barranquilla Atlántico FC', city: 'Barranquilla', prestige: 71, color: '#CC0000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 57 },
  { id: 'pasto-fc',         name: 'Volcán Galeras FC',     city: 'Pasto',           prestige: 65, color: '#CC0000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 52 },
  { id: 'tolima-fc',        name: 'Tolima Musical FC',     city: 'Ibagué',          prestige: 64, color: '#CC0000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 51 },
  { id: 'once-caldas-fc',   name: 'Caldas Cafetero FC',    city: 'Manizales',       prestige: 63, color: '#FFD700', leagueId: 'colombia-liga', countryId: 'colombia', strength: 50 },
  { id: 'quindio-fc',       name: 'Eje Cafetero FC',       city: 'Armenia',         prestige: 61, color: '#FFD700', leagueId: 'colombia-liga', countryId: 'colombia', strength: 49 },
  { id: 'alianza-fc',       name: 'Magdalena Medio FC',    city: 'Barrancabermeja', prestige: 59, color: '#008000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 47 },
  { id: 'envigado-fc',      name: 'Envigado Sur FC',       city: 'Envigado',        prestige: 58, color: '#CC0000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 46 },
  { id: 'bucaramanga-fc',   name: 'Santander FC',          city: 'Bucaramanga',     prestige: 57, color: '#FFD700', leagueId: 'colombia-liga', countryId: 'colombia', strength: 46 },
  { id: 'jaguares-fc',      name: 'Sinú FC',               city: 'Montería',        prestige: 56, color: '#FFD700', leagueId: 'colombia-liga', countryId: 'colombia', strength: 45 },
  { id: 'patriotas-fc',     name: 'Boyacá Alto FC',        city: 'Tunja',           prestige: 55, color: '#003DA5', leagueId: 'colombia-liga', countryId: 'colombia', strength: 44 },
  { id: 'orsomarso-fc',     name: 'Palmira Valle FC',      city: 'Palmira',         prestige: 53, color: '#008000', leagueId: 'colombia-liga', countryId: 'colombia', strength: 42 },
  { id: 'llaneros-fc',      name: 'Meta FC',               city: 'Villavicencio',   prestige: 52, color: '#FFD700', leagueId: 'colombia-liga', countryId: 'colombia', strength: 42 },

  // COLOMBIA — Primera B (18)
  { id: 'cucuta-fc',        name: 'Norte Santander FC',    city: 'Cúcuta',          prestige: 52, color: '#003DA5', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 42 },
  { id: 'rionegro-fc',      name: 'Oriente Antioqueño FC', city: 'Rionegro',        prestige: 50, color: '#008000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 40 },
  { id: 'barranquilla-fc',  name: 'Curramba FC',           city: 'Barranquilla',    prestige: 48, color: '#003DA5', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 38 },
  { id: 'tulua-fc',         name: 'Valle Central FC',      city: 'Tuluá',           prestige: 46, color: '#CC0000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 37 },
  { id: 'popayan-fc',       name: 'Cauca FC',              city: 'Popayán',         prestige: 44, color: '#8B0000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 35 },
  { id: 'cartagena-fc',     name: 'Heroica FC',            city: 'Cartagena',       prestige: 43, color: '#FFD700', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 34 },
  { id: 'manizales-fc',     name: 'Manizales Andino FC',   city: 'Manizales',       prestige: 42, color: '#CC0000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 34 },
  { id: 'pereira-fc',       name: 'Risaralda FC',          city: 'Pereira',         prestige: 41, color: '#CC0000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 33 },
  { id: 'tigres-col',       name: 'Llanos Orientales FC',  city: 'Villavicencio',   prestige: 41, color: '#FF8C00', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 33 },
  { id: 'boyaca-fc',        name: 'Boyacá Central FC',     city: 'Tunja',           prestige: 40, color: '#CC0000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },
  { id: 'huila-fc',         name: 'Opita FC',              city: 'Neiva',           prestige: 40, color: '#CC0000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },
  { id: 'nariño-fc',        name: 'Nariño FC',             city: 'Pasto',           prestige: 40, color: '#FFD700', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },
  { id: 'atlantic-col',     name: 'Atlántico FC',          city: 'Barranquilla',    prestige: 40, color: '#003DA5', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },
  { id: 'caldas-fc',        name: 'Ruiz FC',               city: 'Manizales',       prestige: 40, color: '#FF8C00', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },
  { id: 'cordoba-fc',       name: 'Córdoba FC',            city: 'Montería',        prestige: 40, color: '#CC0000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },
  { id: 'medellin-fc',      name: 'Medellín FC',           city: 'Medellín',        prestige: 40, color: '#CC0000', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },
  { id: 'cali-verde-fc',    name: 'Cali Verde FC',         city: 'Cali',            prestige: 40, color: '#009900', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },
  { id: 'bogota-fc',        name: 'Bogotá FC',             city: 'Bogotá',          prestige: 40, color: '#003DA5', leagueId: 'colombia-primera-b', countryId: 'colombia', strength: 32 },

  // ════════════════════════════════════════════════════════════════════════════
  // URUGUAY — Primera División (16)
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'peñarol-fc',       name: 'Rambla FC',             city: 'Montevideo',      prestige: 85, color: '#FFD700', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 68 },
  { id: 'nacional-uru',     name: 'Ciudad Vieja FC',       city: 'Montevideo',      prestige: 83, color: '#DA121A', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 66 },
  { id: 'danubio-fc',       name: 'Malvín FC',             city: 'Montevideo',      prestige: 68, color: '#003DA5', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 54 },
  { id: 'defensor-fc',      name: 'Pocitos FC',            city: 'Montevideo',      prestige: 66, color: '#7B00D4', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 53 },
  { id: 'rentistas-fc',     name: 'Belvedere FC',          city: 'Montevideo',      prestige: 62, color: '#000080', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 50 },
  { id: 'river-uru-fc',     name: 'Ceibo FC',              city: 'Montevideo',      prestige: 60, color: '#CC0000', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 48 },
  { id: 'liverpool-uru',    name: 'Punta Carretas FC',     city: 'Montevideo',      prestige: 58, color: '#1A1A1A', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 46 },
  { id: 'fenix-fc',         name: 'Capurro FC',            city: 'Montevideo',      prestige: 57, color: '#8B0000', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 46 },
  { id: 'racing-uru',       name: 'Cordón FC',             city: 'Montevideo',      prestige: 56, color: '#003DA5', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 45 },
  { id: 'cerro-fc',         name: 'Bahía FC',              city: 'Montevideo',      prestige: 55, color: '#008000', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 44 },
  { id: 'miramar-fc',       name: 'Costa Este FC',         city: 'Montevideo',      prestige: 53, color: '#003DA5', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 42 },
  { id: 'sud-america-fc',   name: 'Prado FC',              city: 'Montevideo',      prestige: 52, color: '#CC0000', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 42 },
  { id: 'plaza-colonia',    name: 'Colonia Este FC',       city: 'Colonia',         prestige: 51, color: '#CC0000', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 41 },
  { id: 'boston-fc',        name: 'Nuevo Paris FC',        city: 'Montevideo',      prestige: 50, color: '#003DA5', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 40 },
  { id: 'torque-fc',        name: 'Carrasco FC',           city: 'Montevideo',      prestige: 49, color: '#008000', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 39 },
  { id: 'maldonado-fc',     name: 'Maldonado Este FC',     city: 'Maldonado',       prestige: 48, color: '#003DA5', leagueId: 'uruguay-primera', countryId: 'uruguay', strength: 38 },

  // URUGUAY — Segunda División (16)
  { id: 'rampla-fc',        name: 'Aguada FC',             city: 'Montevideo',      prestige: 48, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 38 },
  { id: 'bella-vista-fc',   name: 'Reducto FC',            city: 'Montevideo',      prestige: 47, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 38 },
  { id: 'villa-española',   name: 'Villa Muñoz FC',        city: 'Montevideo',      prestige: 46, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 37 },
  { id: 'central-español',  name: 'Barrio Sur FC',         city: 'Montevideo',      prestige: 45, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 36 },
  { id: 'la-luz-fc',        name: 'Piedras Blancas FC',    city: 'Montevideo',      prestige: 44, color: '#FFD700', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 35 },
  { id: 'cerro-largo-fc',   name: 'Melo Fronterizo FC',    city: 'Melo',            prestige: 43, color: '#008000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 34 },
  { id: 'tacuarembo-fc',    name: 'Tacuarembó Norte FC',   city: 'Tacuarembó',      prestige: 43, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 34 },
  { id: 'atenas-fc',        name: 'San Carlos Este FC',    city: 'San Carlos',      prestige: 42, color: '#003DA5', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 34 },
  { id: 'progreso-fc',      name: 'Casavalle FC',          city: 'Montevideo',      prestige: 42, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 34 },
  { id: 'las-piedras-fc',   name: 'Canelones Central FC',  city: 'Las Piedras',     prestige: 41, color: '#003DA5', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 33 },
  { id: 'fray-bentos-fc',   name: 'Río Uruguay FC',        city: 'Fray Bentos',     prestige: 41, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 33 },
  { id: 'albion-uru',       name: 'Cerrito FC',            city: 'Montevideo',      prestige: 40, color: '#003DA5', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 32 },
  { id: 'rivera-fc',        name: 'Frontera Norte FC',     city: 'Rivera',          prestige: 40, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 32 },
  { id: 'artigas-fc',       name: 'Artigas FC',            city: 'Artigas',         prestige: 40, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 32 },
  { id: 'salto-fc',         name: 'Salto FC',              city: 'Salto',           prestige: 40, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 32 },
  { id: 'treinta-fc',       name: 'Treinta FC',            city: 'Treinta y Tres',  prestige: 40, color: '#CC0000', leagueId: 'uruguay-segunda', countryId: 'uruguay', strength: 32 },
]

export function findLeague(id) {
  return LEAGUES.find(l => l.id === id) || WORLD_LEAGUES.find(l => l.id === id) || null
}

export function getWorldClubsByLeague(leagueId) {
  return WORLD_CLUBS.filter(c => c.leagueId === leagueId)
}

export function getCountryLeagues(countryId) {
  if (countryId === 'argentina') return LEAGUES
  return WORLD_LEAGUES.filter(l => l.countryId === countryId)
}

export function resolveFinanceLeagueId(leagueId) {
  const wl = WORLD_LEAGUES.find(l => l.id === leagueId)
  if (!wl) return leagueId
  return wl.tier === 1 ? 'liga-premier' : 'liga-nacional'
}
