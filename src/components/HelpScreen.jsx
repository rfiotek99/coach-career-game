import { useRef, useState } from 'react'

// Reglamento y Ayuda — texto 100% en criollo, sin jerga técnica, pero los
// números que aparecen acá son los reales que usa el motor (ver PLAN de esta
// tarea para la trazabilidad contra el código). Es una pantalla de solo
// lectura: no toca el store ni ningún sistema del juego.

const SECTIONS = [
  { id: 'inicio', icon: '🚪', title: 'Cómo empezar' },
  { id: 'simulacion', icon: '⚽', title: 'La simulación' },
  { id: 'tactica', icon: '🎯', title: 'Táctica y estilo' },
  { id: 'plantel', icon: '👥', title: 'El plantel' },
  { id: 'cantera', icon: '🌱', title: 'La cantera' },
  { id: 'mercado', icon: '🔄', title: 'El mercado' },
  { id: 'finanzas', icon: '💰', title: 'Finanzas' },
  { id: 'competiciones', icon: '🏆', title: 'Competiciones' },
  { id: 'carrera', icon: '📈', title: 'Tu carrera' },
  { id: 'vestuario', icon: '🧤', title: 'Vestuario' },
  { id: 'consejos', icon: '💡', title: 'Consejos de estrategia' },
]

function Tip({ children }) {
  return (
    <div className="flex items-start gap-2.5 bg-volt-dim border border-volt rounded-lg p-3.5">
      <span className="text-sm shrink-0">💡</span>
      <p className="font-data text-volt text-xs leading-relaxed">{children}</p>
    </div>
  )
}

function P({ children }) {
  return <p className="text-ink-dim text-sm leading-relaxed">{children}</p>
}

function List({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-ink-dim text-sm leading-relaxed">
          <span className="text-volt shrink-0 mt-0.5">•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

function SubTitle({ children }) {
  return (
    <p className="section-label">
      {children}
    </p>
  )
}

// ── Contenido de cada sección ────────────────────────────────────────────────

function InicioContent() {
  return (
    <div className="space-y-3.5">
      <P>
        Antes de arrancar elegís un perfil de técnico. Eso define cuánta reputación
        y plata tenés al principio, y qué tan grandes son los clubes que te van a
        abrir la puerta.
      </P>
      <List
        items={[
          '🎽 Don Nadie — arrancás de cero (reputación 5, $8.000). Solo te contratan clubes chicos de la Liga Regional, con algo garantizado en la Nacional.',
          '📋 Ayudante de Campo — ya tenés experiencia (reputación 18, $20.000). Te abre toda la Liga Regional y toda la Liga Nacional.',
          '⭐ Ex-jugador — tu nombre pesa (reputación 38, $40.000). Además de Regional y Nacional, ya podés golpear la puerta de algún club chico de la Liga Premier.',
        ]}
      />
      <SubTitle>Cómo conseguís tu primer club</SubTitle>
      <P>
        En la pantalla de Ofertas ves los clubes vacantes que te pueden contratar.
        Elegís uno y tocás "Aceptar Cargo" — no hay negociación, es inmediato.
      </P>
      <SubTitle>Reputación: la puerta de entrada a los clubes grandes</SubTitle>
      <P>
        Tu reputación (de 0 a 100) determina qué tan grande puede ser el club que
        te contrate. Cuanto más prestigioso es el club, más reputación te pide:
      </P>
      <List
        items={[
          'Clubes con prestigio menor a 40 te toman sin pedirte nada.',
          'Prestigio 40 a 54 → necesitás al menos 5 de reputación.',
          'Prestigio 55 a 69 → necesitás al menos 15.',
          'Prestigio 70 a 79 → necesitás al menos 30.',
          'Prestigio 80 a 89 → necesitás al menos 48.',
          'Prestigio 90 o más (los gigantes) → necesitás al menos 68.',
        ]}
      />
      <Tip>
        No te frustres si al principio solo podés dirigir equipos chicos: ganá
        partidos que nadie esperaba, cumplí objetivos y salí campeón, y con eso se
        te abren clubes cada vez más grandes. Aguantar temporadas sin ganar nada
        no te sube: la reputación refleja lo que lográs, no cuánto llevás.
      </Tip>
    </div>
  )
}

function SimulacionContent() {
  return (
    <div className="space-y-3.5">
      <P>
        Cada partido se decide calculando qué tan "fuerte" es tu equipo en ataque
        y en defensa, comparándolo contra el rival, y con eso se sortean los goles.
      </P>
      <SubTitle>¿De qué depende tu fuerza?</SubTitle>
      <List
        items={[
          'El nivel promedio de tus 11 titulares (no de todo el plantel — solo los que ponés a jugar).',
          'La formación que elegiste (algunas suman ataque a costa de defensa, y viceversa).',
          'La moral del plantel y el ánimo individual de cada jugador.',
          'Tus instrucciones de estilo (mentalidad, presión, ritmo y ataque).',
        ]}
      />
      <Tip>
        Jugar de local te da una ventaja real: tu ataque rinde más y tu defensa
        también, solo por jugar en tu cancha.
      </Tip>
      <SubTitle>Simular rápido vs. ver en vivo</SubTitle>
      <P>
        "Simular rápido" te tira el resultado final al toque. "Ver en vivo" reparte
        ese mismo resultado minuto a minuto en la pantalla — si no tocás nada
        durante el partido, el marcador final termina siendo exactamente el mismo
        que si lo hubieras simulado rápido.
      </P>
      <P>
        La diferencia real aparece si intervenís: si hacés un cambio de jugador o
        cambiás la mentalidad durante el partido en vivo, el tiempo que queda se
        vuelve a calcular con la alineación nueva — ahí sí podés torcer el resultado
        para bien o para mal. El modo en vivo también es el único que hace que tus
        jugadores se cansen con el correr de los minutos.
      </P>
    </div>
  )
}

function TacticaContent() {
  return (
    <div className="space-y-3.5">
      <SubTitle>Formaciones</SubTitle>
      <P>
        Cada formación es un canje entre ataque y defensa. No hay una "mejor" —
        depende de tu plantel y de a quién enfrentás:
      </P>
      <List
        items={[
          '4-4-2 — equilibrada, no suma ni resta nada.',
          '4-3-3 — la más ofensiva: bastante más ataque, bastante menos defensa.',
          '4-2-3-1 — un poco más de ataque, un poco menos de defensa.',
          '3-5-2 — parecida a la anterior, algo más de ataque a cambio de algo de defensa.',
          '5-3-2 — la más defensiva: mucha más solidez atrás, pero generás bastante menos ataque.',
        ]}
      />
      <SubTitle>Jugar en tu puesto natural importa, y mucho</SubTitle>
      <P>
        Cada jugador tiene un puesto natural (arquero, defensor, mediocampista o
        delantero). Si lo ponés a jugar en su puesto, rinde al 100% de su nivel.
        Si lo ponés en un puesto cercano (por ejemplo un defensor de mediocampista)
        rinde al 90%. Si lo ponés en un puesto lejano (un defensor de delantero, o
        un delantero de defensor) rinde apenas al 75% — tres cuartas partes de lo
        que realmente vale.
      </P>
      <Tip>
        Armá siempre la alineación respetando el puesto natural de cada uno. Un
        buen jugador fuera de puesto rinde peor que un jugador mediocre bien
        ubicado.
      </Tip>
      <SubTitle>Instrucciones de estilo</SubTitle>
      <List
        items={[
          'Mentalidad: Defensivo (más sólido atrás, menos ataque) · Equilibrado (neutro) · Ofensivo (más ataque, pero quedás más expuesto atrás).',
          'Presión: Baja (le das tiempo y espacio al rival, pero arriesgás menos tarjetas) · Media (neutro) · Alta (ahogás la salida del rival, pero quedás expuesto atrás y te arriesgás a más tarjetas).',
          'Ritmo: Pausado (menos ocasiones, pero menos lesiones) · Equilibrado (neutro) · Vertiginoso (más ataque, pero más lesiones y más desgaste físico).',
          'Ataque: Bandas, Equilibrado o Centro — elegir un lado siempre te resta algo de defensa a cambio de potenciar el ataque, pero solo funciona si tus jugadores de esa zona realmente rinden mejor que el resto del equipo.',
        ]}
      />
    </div>
  )
}

function PlantelContent() {
  return (
    <div className="space-y-3.5">
      <SubTitle>Edad, potencial y las flechas</SubTitle>
      <P>
        Cada jugador tiene un techo de nivel (su potencial) que no se muestra
        directamente. En su lugar, la ficha del jugador te muestra una flecha que
        resume hacia dónde va: ↑ si todavía tiene margen de mejora (normalmente
        jugadores jóvenes), → si está estable, y ↓ si ya tiene 30 años o más.
      </P>
      <SubTitle>Cómo crecen (o bajan) con el tiempo</SubTitle>
      <List
        items={[
          'Hasta los 20 años: crecen fuerte cada temporada.',
          'De 21 a 23: siguen creciendo, pero más despacio.',
          'De 24 a 28: se estabilizan — rara vez suben, salvo que les quede mucho potencial sin explotar.',
          'A los 29-30: empiezan a aflojar — hay bastante chance de que pierdan algo de nivel.',
          'De 31 en adelante: la baja ya es segura, y cada vez más marcada con la edad.',
        ]}
      />
      <Tip>
        Los jugadores de 30 años o más te conviene venderlos antes de que empiecen
        a perder valor — arrancan a bajar apenas pasan los 31.
      </Tip>
      <SubTitle>Moral: dos cosas distintas</SubTitle>
      <P>
        El ánimo individual de cada jugador se maneja con charlas y eventos del
        vestuario. La moral del plantel es otra cosa: sube y baja con los
        resultados de los partidos (bastante con una victoria, se derrumba con una
        racha de derrotas), y afecta el rendimiento de todo el equipo — mucho más
        que el ánimo individual de un solo jugador.
      </P>
      <SubTitle>Lesiones y suspensiones</SubTitle>
      <P>
        En cada partido, cualquiera de tus titulares se puede lesionar (es poco
        probable, pero pasa). La mayoría de las lesiones son cortas, aunque a veces
        te puede tocar una larga. Con las tarjetas amarillas es simple: si un
        jugador acumula 5 amarillas, se pierde la fecha siguiente automáticamente
        (el contador se reinicia cada temporada nueva).
      </P>
      <SubTitle>Contratos</SubTitle>
      <P>
        Cada jugador de tu plantel tiene años de contrato restantes, que bajan uno
        por temporada. Cuando le queda el último año, la ficha lo marca en
        naranja y te avisamos en Inicio — si la temporada termina sin que lo
        renueves, se va libre y no recuperás nada de plata por él.
      </P>
      <P>
        Podés renovar en cualquier momento desde el botón "Renovar" de cada
        jugador, no hace falta esperar al último año. El jugador te hace un
        pedido de sueldo y duración acorde a su nivel, edad y moral — podés
        aceptarlo, contraofertar (hasta 3 rondas) o cortar la negociación. El
        sueldo que acuerden reemplaza al de mercado y es el que realmente se
        descuenta de tus finanzas cada jornada.
      </P>
    </div>
  )
}

function CanteraContent() {
  return (
    <div className="space-y-3.5">
      <P>
        Cada temporada aparecen 1 o 2 juveniles nuevos en tu cantera, de entre 16 y
        18 años. Arrancan con nivel bajo a propósito — son materia prima, no
        jugadores listos.
      </P>
      <SubTitle>La etiqueta del ojeador puede fallar</SubTitle>
      <P>
        Cada juvenil viene con una etiqueta orientativa ("Puede ser especial",
        "Promesa interesante", "Con futuro" o "Del montón"). Es una pista, no una
        garantía: el ojeador se puede equivocar para bien o para mal, así que no
        descartes a un juvenil solo porque la etiqueta sea floja.
      </P>
      <Tip>
        Aproximadamente 1 de cada 12 juveniles es una verdadera "joya" con un
        techo altísimo, aunque arranque pareciendo del montón. Vale la pena darles
        minutos antes de descartarlos.
      </Tip>
      <SubTitle>Promoción al primer equipo</SubTitle>
      <P>
        Subir a un juvenil al primer equipo es gratis e inmediato — no tiene
        costo ni requisitos. Y si todavía no lo necesitás, podés dejarlo madurando
        en la cantera: ahí también sigue creciendo con el paso de las temporadas,
        sin ningún apuro.
      </P>
    </div>
  )
}

function MercadoContent() {
  return (
    <div className="space-y-3.5">
      <SubTitle>Ventanas de pases</SubTitle>
      <P>
        Solo podés fichar y vender en dos momentos de la temporada: la ventana de
        verano (las primeras dos fechas) y la ventana de invierno (tres fechas
        alrededor de la mitad de la temporada). El resto del año el mercado está
        cerrado.
      </P>
      <SubTitle>Cómo fichar</SubTitle>
      <P>
        Le hacés una oferta al club dueño del jugador. Si ofrecés muy poco (menos
        de dos tercios de lo que realmente vale) te rechazan directo. Si te acercás
        o superás su valor real, tenés bastante más chance de que acepten o te
        hagan una contraoferta — podés negociar hasta un par de idas y vueltas.
      </P>
      <List
        items={[
          'Clubes del exterior no tienen límite de presupuesto, así que fichar de afuera casi nunca se traba por plata de su lado.',
          'Si vos les querés vender un jugador tuyo a un club del exterior, es una oferta única — o la aceptan o la rechazan, sin ida y vuelta.',
        ]}
      />
      <SubTitle>Ofertas por tus jugadores</SubTitle>
      <P>
        Mientras el mercado esté abierto, de tanto en tanto algún club se puede
        interesar en uno de tus mejores jugadores y hacerte una oferta. Podés
        aceptarla, rechazarla o contraofertar.
      </P>
      <SubTitle>Cuando un jugador quiere irse</SubTitle>
      <P>
        Un jugador te puede pedir la salida en tres situaciones: si es bueno y lo
        tenés mucho tiempo en el banco, si tiene la moral por el piso durante
        varias fechas seguidas, o si es joven, promete mucho y ya le queda chico tu
        club. Negarte a dejarlo ir es una opción, pero le golpea fuerte el ánimo —
        y ese golpe se puede contagiar a los jugadores más importantes del plantel.
      </P>
    </div>
  )
}

function FinanzasContent() {
  return (
    <div className="space-y-3.5">
      <SubTitle>De dónde sale la plata</SubTitle>
      <List
        items={[
          'Ingresos fijos al principio de cada temporada: derechos de TV, sponsors, y un aporte extra de la dirigencia si tenés su confianza.',
          'Ingreso por cada partido que jugás de local, que mejora si venís con buena racha.',
          'Premios por la posición final en la liga, por ascender, por salir campeón, y por avanzar en las copas.',
        ]}
      />
      <SubTitle>En qué se te va</SubTitle>
      <P>
        El gasto fijo más importante son los sueldos de todo tu plantel, que se
        pagan fecha a fecha — cuanto más grande y mejor pago sea tu plantel, más
        te cuesta sostenerlo.
      </P>
      <SubTitle>Si te quedás sin plata</SubTitle>
      <P>
        Si tu presupuesto queda en rojo, no te funden ni te sacan el club. Pero
        mientras sigas en negativo perdés confianza de la dirigencia cada fecha, y
        no vas a poder fichar a nadie nuevo hasta salir del pozo.
      </P>
      <Tip>
        Si ves que el presupuesto empieza a quedar negativo, priorizá vender algún
        jugador que no uses antes de que la confianza de la dirigencia se te caiga
        del todo.
      </Tip>
    </div>
  )
}

function CompeticionesContent() {
  return (
    <div className="space-y-3.5">
      <SubTitle>Las tres ligas argentinas</SubTitle>
      <List
        items={[
          'Liga Premier (10 equipos) — la elite. Los últimos 2 descienden a la Nacional.',
          'Liga Nacional (12 equipos) — los primeros 2 ascienden a la Premier, los últimos 2 descienden a la Regional.',
          'Liga Regional (14 equipos) — los primeros 2 ascienden a la Nacional. Acá nadie desciende, es el punto de partida.',
        ]}
      />
      <SubTitle>Copas continentales</SubTitle>
      <P>
        Se juegan entre los clubes de mayor prestigio de distintos países,
        agrupados según el continente. Arrancan con una fase de grupos (donde los
        dos mejores de cada grupo avanzan) y siguen con eliminación directa hasta
        la final.
      </P>
      <SubTitle>Mundial de Clubes</SubTitle>
      <P>
        Es el torneo más exclusivo: solo entran los tres campeones de las copas
        continentales, y se juega todos contra todos para definir al campeón
        mundial.
      </P>
    </div>
  )
}

function CarreraContent() {
  return (
    <div className="space-y-3.5">
      <P>
        Tu reputación (0 a 100) es tu carta de presentación como técnico. Va
        subiendo de escalón: Desconocido → Regional → Nacional → Reconocido →
        Elite → Leyenda. Cuanto más alta, a clubes más grandes podés aspirar.
      </P>
      <List
        items={[
          'Sube fuerte cuando salís campeón, ascendés de categoría, ganás una copa continental o el Mundial, o dirigís clubes de primera. Los saltos grandes vienen de los logros grandes.',
          'Sube de a poco cuando ganás partidos que no se esperaban de vos. Ganar o empatar lo que se esperaba no mueve la aguja.',
          'Baja cuando perdés partidos que deberías haber ganado, cuando descendés o no cumplís un objetivo ambicioso, o si te despiden.',
          'Cada fin de temporada la reputación tiende a la que te corresponde por tu palmarés: varias temporadas sin ganar nada la van bajando. Sobrevivir en el ascenso no te hace leyenda.',
          'Lo que lográs pesa más si es en una división más alta: campeón de la Liga Premier vale más que campeón de la Regional.',
        ]}
      />
      <SubTitle>La confianza de la dirigencia</SubTitle>
      <P>
        Cada club te pone un objetivo de temporada (según lo grande que sea) y va
        siguiendo tu gestión con un puntaje de confianza que arranca en 60. Si esa
        confianza se derrumba en medio de la temporada, te echan ahí mismo. Si
        llegás a fin de temporada sin cumplir el objetivo y con la confianza baja,
        también te echan — pero si la cumpliste, o la confianza se mantuvo, te
        renuevan el contrato.
      </P>
      <SubTitle>Otros clubes se pueden fijar en vos</SubTitle>
      <P>
        Si venís con buena reputación y una racha ganadora, otros clubes (incluso
        más grandes que el tuyo) se pueden empezar a interesar en vos. Con el
        tiempo eso se puede convertir en una oferta formal para cambiarte de club
        sin esperar a que te echen o te vayas por tu cuenta.
      </P>
      <Tip>
        Aceptar una oferta de otro club mientras estás bien no tiene penalidad de
        reputación — al contrario, te suma. Renunciar por tu cuenta a un club sin
        que te llegue una oferta sí te la baja un poco.
      </Tip>
      <SubTitle>Premios, récords e historia</SubTitle>
      <P>
        Si venís con una buena racha o hacés una gran temporada podés ganarte
        premios como "DT del Mes" o "DT del Año". Todo tu recorrido — récords,
        goleadores de tus equipos, y tu lugar entre los grandes técnicos — queda
        guardado en la pantalla de Historia.
      </P>
    </div>
  )
}

function VestuarioContent() {
  return (
    <div className="space-y-3.5">
      <P>
        Desde el plantel podés hablar con tus jugadores en cualquier momento:
        motivarlos, felicitarlos o calmarlos. Estas charlas siempre suman ánimo,
        no tienen riesgo de salir mal.
      </P>
      <SubTitle>Eventos espontáneos</SubTitle>
      <P>
        De vez en cuando van a surgir situaciones solas, sin que vos hagas nada:
        una pelea en el vestuario (mucho más probable si la moral del plantel está
        baja), o un jugador importante que quiere hablar con vos porque lo tenés
        mucho tiempo sin jugar.
      </P>
      <SubTitle>Los líderes del plantel</SubTitle>
      <P>
        Tus tres jugadores de mayor nivel actúan como líderes silenciosos del
        grupo, aunque no haya una cinta de capitán de por medio: lo que les pasa a
        ellos anímicamente arrastra un poco la moral de todo el equipo.
      </P>
      <Tip>
        Si le hacés una promesa a un jugador (por ejemplo, "te prometo más
        minutos"), cumplila. Romper una promesa golpea muy fuerte su ánimo — mucho
        más de lo que suma cualquier charla.
      </Tip>
    </div>
  )
}

function ConsejosContent() {
  return (
    <div className="space-y-3.5">
      <Tip>
        Si tenés extremos y laterales buenos, jugá con "Ataque por bandas". Si tus
        mejores jugadores son los mediocampistas ofensivos y los delanteros, jugá
        con "Ataque por el centro". Si no tenés una ventaja clara de un lado,
        dejalo en "Equilibrado" — así no perdés nada.
      </Tip>
      <Tip>
        Elegí la formación según tu plantel: si es parejo, el 4-4-2 no te arriesga
        nada. Si te sobra gol pero te falta fondo atrás, el 4-3-3 te suma bastante
        ataque y rinde bien visitando rivales flojos. Si te falta nivel general, el
        5-3-2 te blinda la defensa para bancar los partidos difíciles.
      </Tip>
      <Tip>
        La Presión alta te sirve para ahogar a rivales más flojos, donde te podés
        dar el lujo de arriesgarte a alguna tarjeta de más. Contra rivales fuertes
        o en partidos clave, bajala — te conviene no quedar expuesto atrás.
      </Tip>
      <Tip>
        Armá siempre la alineación respetando el puesto natural de cada jugador.
        Un buen jugador jugando fuera de puesto rinde peor que uno mediocre bien
        ubicado.
      </Tip>
      <Tip>
        Vendé a tus jugadores de 30 años o más antes de que empiecen a perder
        valor. En cambio, los pibes con potencial alto se revalorizan rápido —
        conviene ficharlos jóvenes en vez de esperar a que exploten (y cuesten
        mucho más).
      </Tip>
      <Tip>
        No dejes a un jugador bueno demasiado tiempo en el banco: puede terminar
        pidiéndote la salida, y ahí perdés margen de negociación.
      </Tip>
      <Tip>
        Si tu presupuesto queda en rojo, resolvelo rápido — mientras estés en
        negativo no podés fichar a nadie y perdés confianza de la dirigencia cada
        fecha que pasa.
      </Tip>
    </div>
  )
}

const SECTION_CONTENT = {
  inicio: InicioContent,
  simulacion: SimulacionContent,
  tactica: TacticaContent,
  plantel: PlantelContent,
  cantera: CanteraContent,
  mercado: MercadoContent,
  finanzas: FinanzasContent,
  competiciones: CompeticionesContent,
  carrera: CarreraContent,
  vestuario: VestuarioContent,
  consejos: ConsejosContent,
}

// ── Shell: índice + acordeón ─────────────────────────────────────────────────

function AccordionSection({ section, isOpen, onToggle, sectionRef }) {
  const Content = SECTION_CONTENT[section.id]
  return (
    <div ref={sectionRef} className="card-broadcast border border-line overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-carbon-high"
      >
        <span className="text-lg shrink-0">{section.icon}</span>
        <span className="flex-1 text-ink font-semibold text-sm">{section.title}</span>
        <span className={`text-ink-faint text-xs transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1">
          <Content />
        </div>
      )}
    </div>
  )
}

export default function HelpScreen({ onClose }) {
  const [openId, setOpenId] = useState(SECTIONS[0].id)
  const sectionRefs = useRef({})

  function handleChipClick(id) {
    setOpenId(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleToggle(id) {
    setOpenId(prev => (prev === id ? null : id))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-carbon"
      style={{ maxWidth: 430, left: '50%', transform: 'translateX(-50%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
        <button
          onClick={onClose}
          className="font-data text-ink-dim text-sm active:text-ink shrink-0 flex items-center gap-1"
        >
          ← Volver
        </button>
        <span className="font-title text-ink text-sm flex-1 text-center pr-8 leading-none">
          📖 Reglamento y Ayuda
        </span>
      </div>

      {/* Índice de chips */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3.5 border-b border-line shrink-0">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => handleChipClick(s.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-data text-xs font-semibold whitespace-nowrap transition-colors ${
              openId === s.id
                ? 'bg-volt text-carbon'
                : 'bg-carbon-raised text-ink-faint border border-line active:bg-carbon-high'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      {/* Secciones */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-3">
        {SECTIONS.map(s => (
          <AccordionSection
            key={s.id}
            section={s}
            isOpen={openId === s.id}
            onToggle={() => handleToggle(s.id)}
            sectionRef={el => { sectionRefs.current[s.id] = el }}
          />
        ))}
      </div>
    </div>
  )
}
