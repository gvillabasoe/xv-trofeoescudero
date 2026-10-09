/**
 * Datos de partida del seed (Entrega 3).
 *
 * - Textos: copy semilla aprobado en fase-1/direccion-creativa.md §4–§5, literal.
 * - Hechos: información v3, «Fecha del Trofeo», tipos de patrocinio y confirmaciones de la organización.
 * - No hay datos inventados ni de prospección. Lo que no se conoce queda vacío u oculto:
 *   contacto (P1), titular legal (P2), horarios (P7), campo de los hoyos (P8), edad de Nacho.
 * - Las categorías de marca no constan en las fuentes: todas van a «Sin categoría», salvo
 *   Castillo de Cuzcurrita (bodega / vino, confirmado por la organización).
 */

export const SITIO = {
  siteName: "Trofeo Escudero",
  editionLabel: "XV Edición",
  editionNumber: 15,
  eventDate: new Date("2027-08-03T00:00:00.000Z"),
  venueName: "Golf El Rompido",
  location: "El Rompido",
  afterPartyName: "Luz de Mar El Rompido",
  seoTitle: "Trofeo Escudero · XV Edición",
  seoDescription:
    "Empezó como una pachanga. Quince años después, el Trofeo Escudero reúne a tres generaciones y a unos 220 jugadores en los dos campos de El Rompido.",
} as const;

export const BLOQUES = [
  { key: "HERO", indexLabel: "01 / Inicio", sortOrder: 1 },
  { key: "FAMILIA", indexLabel: "02 / La familia", sortOrder: 2 },
  { key: "EL_DIA", indexLabel: "03 / El día", sortOrder: 3 },
  { key: "COLABORAR", indexLabel: "04 / Colaborar", sortOrder: 4 },
  { key: "CIERRE", indexLabel: "05 / No es nuestra primera ronda", sortOrder: 5 },
] as const;

export const HERO = {
  eyebrow: "XV Edición · 3 de agosto de 2027 · Golf El Rompido",
  titleLine1: "Empezó como una pachanga.",
  titleLine2: "Ahora necesitamos dos campos.",
  lead: "Cada agosto, la familia Escudero reúne a unas 220 personas, tres generaciones y alguna que otra rivalidad que lleva demasiado tiempo abierta. El 3 de agosto de 2027 volvemos a jugar.",
  primaryCtaLabel: "Ver oportunidades",
  secondaryCtaLabel: "Proponer colaboración",
  brandCardTitle: "Para marcas con algo mejor que un logo.",
  brandCardText:
    "Buscamos producto que se use, premios que apetezca ganar y experiencias que sigan dando conversación después del torneo.",
  brandCardLinkLabel: "Ver dónde puede entrar tu marca",
} as const;

/** `internalSource` es privado: documenta de dónde sale la cifra y nunca se publica. */
export const CIFRAS = [
  { label: "Años", value: "15", caption: "desde la primera pachanga", internalSource: "Información v3" },
  { label: "Participantes", value: "~220", caption: "jugadores, aproximadamente", internalSource: "Información v3" },
  { label: "Campos", value: "2", caption: "Norte y Sur, a la vez", internalSource: "Información v3" },
  { label: "3ª Generación", value: "80", caption: "jugadores en la última edición", internalSource: "Información v3" },
  {
    label: "Después del 18",
    value: "Luz de Mar",
    caption: "AfterParty oficial en Luz de Mar El Rompido",
    internalSource: "Información v3",
  },
] as const;

export const FAMILIA = {
  title: "La familia se reúne. La rivalidad viene sola.",
  secondGenerationLabel: "Los que lo continuaron",
  secondGenerationText:
    "Pedro, Mariana, Jaime y «Cuco». La segunda generación: responsables de que la pachanga no se quedara en anécdota.",
  thirdGenerationLabel: "Los que ahora quieren ganarlo",
  thirdGenerationText:
    "Gonzalo, Ignacio, Lucas y Asís lideran la 3ª Generación. Ya no vienen a acompañar. Tienen campo propio.",
  thirdGenerationCaption: "La 3ª Generación, fingiendo que solo ha venido a participar.",
} as const;

/** Sin edad: es un campo editorial manual y opcional que queda vacío. */
export const MIEMBROS = [
  {
    name: "Nacho Escudero",
    generation: "PRIMERA",
    text: "Nacho Escudero sigue compitiendo desde barras amarillas y, según una fuente nada imparcial, conserva el swing más bonito de España.",
    caption: "Desde amarillas. Sin negociaciones.",
  },
  {
    name: "Luz",
    generation: "PRIMERA",
    text: "A su lado está Luz. No juega al golf. Hace algo bastante más complicado: conseguir que todo esto ocurra cada verano.",
    caption: "Luz. No juega. Organiza.",
  },
] as const;

export const DIA = {
  title: "Dos campos. Nadie ha venido a dejarse ganar.",
  lead: "El Trofeo se juega a la vez en los dos campos de El Rompido: la 3ª Generación en el Norte y el resto de participantes en el Sur.",
  northLabel: "Campo Norte · 3ª Generación",
  northTitle: "La tercera generación ya no viene de acompañante.",
  northText:
    "Son los nietos y los amigos de los nietos de quienes empezaron el torneo. En la última edición fueron 80. Tienen su propio recorrido y bastantes ganas de que deje de llamarse «la categoría de los jóvenes».",
  northHighlight: "Nacidos entre 1999 y 2009. Un mismo campo.",
  northBridge:
    "Para una marca, eso significa algo bastante sencillo: aquí el producto no acaba en un expositor. Acaba en una bolsa, en un premio, en una fotografía o en una conversación entre jugadores.",
  southLabel: "Campo Sur",
  southTitle: "Aquí juega el resto del Trofeo.",
  southText: "La experiencia cuenta. El hándicap también. Las excusas después de la vuelta, algo menos.",
  afterLabel: "Hoyo 19",
  afterTitle: "El golf termina. La jornada, no.",
  afterText: "Entrega, conversación y AfterParty oficial en Luz de Mar El Rompido.",
} as const;

/** Sin horarios (P7): la hora queda vacía y oculta. */
export const RECORRIDO = ["Llegada", "Salida", "18 hoyos", "Premios", "Luz de Mar"] as const;

export const COLABORAR = {
  titleLine1: "No buscamos marcas para rellenar una lona.",
  titleLine2: "Buscamos marcas que entren en el día.",
  lead: "Una bebida cuando hace falta. Una gorra que alguien quiera ponerse. Un premio por el que merezca la pena acercar la bola. Un polo que siga saliendo del armario después de agosto.",
  closingLine: "Menos «presencia de marca». Más cosas que la gente use, gane o recuerde.",
  holesLabel: "Concursos en el recorrido",
  holesTitle: "Cinco hoyos ya tienen concurso.",
  holesLead: "Cada uno necesita un premio a la altura y una marca que lo entregue.",
  holesModelsText: "Bola más cercana: una marca para los cuatro pares 3, o una distinta en cada hoyo.",
  holesNamingText:
    "«Drive más largo, presentado por [tu marca]» · «Bola más cercana del hoyo 12, presentada por [tu marca]»",
  holesCtaLabel: "Proponer un premio",
  allHolesTitle: "Y los 18 pueden llevar nombre.",
  allHolesText:
    "Cualquiera de los 18 hoyos puede asociarse a una marca en los materiales digitales del torneo: «Hoyo 7, presentado por…». Es un nombre en la tarjeta, no un cartel: no incluye presencia física en el campo.",
  /** Texto literal aprobado (D4). */
  transparencyNote:
    "Sin promesas infladas: no vendemos cifras que no podamos demostrar ni datos de participantes. Cualquier activación dentro del campo se acuerda primero con el club.",
} as const;

export const CIERRE = {
  historyTitle: "No es nuestra primera ronda.",
  historyText:
    "Por el Trofeo han pasado grandes compañías, marcas de golf, negocios locales y proyectos que tenían algo que aportar al día.",
  wallLabel: "Patrocinadores y colaboradores de ediciones anteriores",
  charityTitle: "En la X edición jugamos también por algo más.",
  charityText:
    "El Trofeo colaboró de forma especial con dalecandELA, asociación vinculada a Getxo que da visibilidad a la ELA, recauda fondos para investigación y acompaña a las personas afectadas y a sus familias.",
  charityVisible: true,
  closingTitleLine1: "Hay sitio para una buena marca.",
  closingTitleLine2: "No para cualquier logo.",
  closingText:
    "Si tienes un producto que se pueda usar, un premio que merezca ganarse o una idea que mejore el día, hablemos. Nosotros ponemos el torneo. Tú dinos dónde tiene sentido entrar.",
  closingMicrocopy:
    "Sin paquetes cerrados de oro, plata y bronce. Primero vemos si encaja. Luego construimos algo que tenga sentido.",
  closingCtaLabel: "Proponer colaboración",
} as const;

type TipoElemento = "NECESITAMOS" | "PUEDES_APORTAR" | "RECIBES" | "CONDICION" | "EJEMPLO";

export const VIAS: ReadonlyArray<{
  key: "PECHO" | "BOLSA" | "JUEGO" | "DESPUES";
  number: number;
  title: string;
  subtitle: string;
  cardCopy: string;
  ctaLabel: string;
  formType: "PATROCINADOR_PRINCIPAL_POLO" | "WELCOME_PACK" | "PREMIO_CONCURSO" | "SORTEO_EXPERIENCIA";
  items: ReadonlyArray<readonly [TipoElemento, string]>;
}> = [
  {
    key: "PECHO",
    number: 1,
    title: "En el pecho",
    subtitle: "Patrocinador principal y polo oficial",
    cardCopy: "Un patrocinador principal. Dos logos en el frontal. Ningún árbol de Navidad.",
    ctaLabel: "Vestir la XV edición",
    formType: "PATROCINADOR_PRINCIPAL_POLO",
    items: [
      ["NECESITAMOS", "Un patrocinador principal para el Trofeo y su polo oficial. Uno solo."],
      [
        "PUEDES_APORTAR",
        "Dinero, producto, premios o una combinación. Por ejemplo, financiar total o parcialmente los polos, producirlos o suministrarlos, hacer una aportación general al torneo o cubrir premios y welcome packs además del polo.",
      ],
      ["RECIBES", "Tu logo en un lado del pecho del polo oficial; el del Trofeo, en el otro."],
      ["RECIBES", "La denominación «Patrocinador Principal del Trofeo Escudero»."],
      ["RECIBES", "Presencia prioritaria en las comunicaciones y materiales digitales del torneo."],
      ["RECIBES", "Mención destacada en la presentación y la entrega de premios."],
      ["RECIBES", "La opción de asociar tu nombre a uno de los premios principales."],
      ["RECIBES", "Tu producto en el welcome pack, cuando tenga sentido."],
      ["RECIBES", "Fotografía y vídeo del torneo, según disponibilidad y derechos de imagen."],
      ["CONDICION", "En el frontal del polo solo hay dos logos, el tuyo y el del Trofeo."],
      ["CONDICION", "Intentamos que no coincidas con competidores directos de tu categoría."],
      ["CONDICION", "El tamaño, el color y la técnica de marcaje dependen del diseño y del fabricante."],
      ["CONDICION", "Necesitamos el logo en un formato apto para bordado, serigrafía o transferencia."],
      ["CONDICION", "La organización aprueba el diseño final."],
    ],
  },
  {
    key: "BOLSA",
    number: 2,
    title: "En la bolsa",
    subtitle: "Welcome pack",
    cardCopy:
      "Bolas, tees, gorra, bebida o una bolsa que alguien quiera volver a usar. Producto útil, no un folleto olvidado en el coche.",
    ctaLabel: "Entrar en el welcome pack",
    formType: "WELCOME_PACK",
    items: [
      [
        "NECESITAMOS",
        "El contenido de la bolsa de bienvenida de cada jugador: una bolsa ligera, una gorra, un pack de tees, un pack de bolas y una bebida.",
      ],
      ["PUEDES_APORTAR", "El welcome pack completo o solo uno de sus componentes."],
      [
        "PUEDES_APORTAR",
        "Bolsa: se ve desde la recepción de jugadores. Puede llevar tu logo si la producción y el presupuesto lo permiten, o ser una bolsa estándar de tu marca.",
      ],
      [
        "PUEDES_APORTAR",
        "Gorra: una por jugador o, si no es posible, unas cuantas para premios y sorteos. Aparece durante la jornada y en las fotos.",
      ],
      [
        "PUEDES_APORTAR",
        "Tees: un pack por jugador, de uso directo en el recorrido. Personalizables si el proveedor lo permite.",
      ],
      [
        "PUEDES_APORTAR",
        "Bolas: un pack de una, dos o tres bolas por jugador, según la aportación y el número final de jugadores. Se juega con ellas.",
      ],
      [
        "PUEDES_APORTAR",
        "Bebida: agua, isotónica, funcional, refresco sin alcohol o café frío, en el pack o en la recepción, la salida o la llegada. Se prueba de verdad.",
      ],
      [
        "RECIBES",
        "Tu producto se entrega y se usa durante la jornada. La presencia se ajusta al número real de unidades aportadas.",
      ],
      [
        "RECIBES",
        "Según el componente, puedes presentarte como bebida oficial, hidratación oficial o bebida colaboradora, o como bola oficial o colaboradora.",
      ],
      ["CONDICION", "La personalización depende de cantidades mínimas, plazos y costes de producción."],
      ["CONDICION", "Las bebidas alcohólicas no forman parte de esta vía."],
    ],
  },
  {
    key: "JUEGO",
    number: 3,
    title: "En juego",
    subtitle: "Concursos y premios",
    cardCopy: "Buscamos producto, experiencias o regalos que duela un poco no ganar.",
    ctaLabel: "Poner algo en juego",
    formType: "PREMIO_CONCURSO",
    items: [
      ["NECESITAMOS", "El premio del drive más largo (hoyo 4)."],
      ["NECESITAMOS", "Hasta cuatro premios de bola más cercana (hoyos 3, 6, 12 y 16)."],
      ["NECESITAMOS", "Los premios para los ganadores hándicap y scratch."],
      [
        "PUEDES_APORTAR",
        "Producto, experiencia, vale, material deportivo, prenda o complemento, sesión de fitting o simulador, comida o estancia. Algo que duela un poco no ganar.",
      ],
      [
        "RECIBES",
        "La denominación del premio, por ejemplo: «Premio al Drive Más Largo presentado por [tu marca]», «Bola Más Cercana del Hoyo 12, presentada por [tu marca]», «Premio al Ganador Hándicap presentado por [tu marca]» o «Premio al Ganador Scratch presentado por [tu marca]».",
      ],
      ["RECIBES", "Tu nombre en la comunicación del concurso y en la entrega del premio."],
      ["CONDICION", "Bola más cercana: una marca para los cuatro pares 3, o una distinta en cada hoyo."],
      ["CONDICION", "El premio del hoyo 4 y el nombre del hoyo pueden ir juntos o por separado."],
      ["CONDICION", "Las banderas del campo no se personalizan."],
    ],
  },
  {
    key: "DESPUES",
    number: 4,
    title: "Después del 18",
    subtitle: "Sorteos y experiencias",
    cardCopy: "El golf reparte la clasificación. El sorteo reparte algo de justicia.",
    ctaLabel: "Proponer una experiencia",
    formType: "SORTEO_EXPERIENCIA",
    items: [
      [
        "NECESITAMOS",
        "Varios premios para uno o más sorteos entre los participantes. Así, quien no gana una categoría también puede llevarse algo.",
      ],
      [
        "PUEDES_APORTAR",
        "Ropa y complementos, gafas de sol, mochilas o bolsas, material deportivo, una comida, una estancia, ocio, una experiencia deportiva, una tarjeta regalo, cuidado personal, tecnología, sesiones de simulador o fitting, o alimentación y bebidas sin alcohol.",
      ],
      ["RECIBES", "El premio o el sorteo, con tu nombre."],
      ["RECIBES", "Una mención en la entrega."],
      ["RECIBES", "Tu marca en el listado de colaboradores."],
      ["RECIBES", "Una fotografía del ganador con tu producto, cuando sea posible."],
      [
        "CONDICION",
        "Preferimos varios premios de valor medio antes que uno solo, salvo que la experiencia lo merezca.",
      ],
    ],
  },
];

/** Concursos de los tipos de patrocinio. El campo (Norte, Sur o ambos) no se conoce: queda vacío y oculto (P8). */
export const CONCURSOS: Readonly<Record<number, { contestType: "BOLA_MAS_CERCANA" | "DRIVE_MAS_LARGO"; par: number | null }>> = {
  3: { contestType: "BOLA_MAS_CERCANA", par: 3 },
  4: { contestType: "DRIVE_MAS_LARGO", par: null },
  6: { contestType: "BOLA_MAS_CERCANA", par: 3 },
  12: { contestType: "BOLA_MAS_CERCANA", par: 3 },
  16: { contestType: "BOLA_MAS_CERCANA", par: 3 },
};

/** Inventario comercial (tipos de patrocinio). El estado es privado y empieza en DISPONIBLE, sin publicar. */
export const OPORTUNIDADES: ReadonlyArray<{
  key: string;
  route: "PECHO" | "BOLSA" | "JUEGO" | "DESPUES";
  name: string;
  hole?: number;
  maxSponsors?: number;
}> = [
  { key: "patrocinador-principal", route: "PECHO", name: "Patrocinador principal y polo oficial", maxSponsors: 1 },
  { key: "welcome-pack-completo", route: "BOLSA", name: "Welcome pack completo" },
  { key: "welcome-pack-bolsa", route: "BOLSA", name: "Bolsa" },
  { key: "welcome-pack-gorra", route: "BOLSA", name: "Gorra" },
  { key: "welcome-pack-tees", route: "BOLSA", name: "Tees" },
  { key: "welcome-pack-bolas", route: "BOLSA", name: "Bolas" },
  { key: "welcome-pack-bebida", route: "BOLSA", name: "Bebida" },
  { key: "drive-mas-largo-hoyo-4", route: "JUEGO", name: "Drive más largo · hoyo 4", hole: 4 },
  ...[3, 6, 12, 16].map((hoyo) => ({
    key: `bola-mas-cercana-hoyo-${hoyo}`,
    route: "JUEGO" as const,
    name: `Bola más cercana · hoyo ${hoyo}`,
    hole: hoyo,
  })),
  { key: "premio-ganador-handicap", route: "JUEGO", name: "Premio al ganador hándicap" },
  { key: "premio-ganador-scratch", route: "JUEGO", name: "Premio al ganador scratch" },
  ...Array.from({ length: 18 }, (_, indice) => ({
    key: `nombre-hoyo-${indice + 1}`,
    route: "JUEGO" as const,
    name: `Nombre del hoyo ${indice + 1}`,
    hole: indice + 1,
  })),
  { key: "premios-sorteo", route: "DESPUES", name: "Premios para sorteos" },
];

export const CATEGORIAS = [
  { slug: "sin-categoria", name: "Sin categoría", requiresLegalReview: false, sortOrder: 0 },
  { slug: "bodega-vino", name: "Bodega / vino", requiresLegalReview: true, sortOrder: 1 },
] as const;

/** Los 17 patrocinadores y colaboradores históricos de la información v3, en su orden. */
const MARCAS_V3 = [
  ["Google", "google"],
  ["Repsol", "repsol"],
  ["ABANCA", "abanca"],
  ["¡HOLA!", "hola"],
  ["Bergé", "berge"],
  ["Astara", "astara"],
  ["Brother", "brother"],
  ["Helly Hansen", "helly-hansen"],
  ["Callaway", "callaway"],
  ["Julius Bär", "julius-bar"],
  ["Horcher", "horcher"],
  ["Luz de Mar", "luz-de-mar"],
  ["Oceánico El Rompido", "oceanico-el-rompido"],
  ["Perfumería Piccola", "perfumeria-piccola"],
  ["Abracolors", "abracolors"],
  ["dalecandELA", "dalecandela"],
  ["Aon", "aon"],
] as const;

export const PATROCINADORES = [
  ...MARCAS_V3.map(([name, slug], indice) => ({
    name,
    slug,
    relationshipType:
      slug === "dalecandela" ? ("COLABORACION_SOLIDARIA" as const) : ("PATROCINADOR_O_COLABORADOR" as const),
    source: "INFO_V3" as const,
    sourceNote: "Información v3: patrocinadores y colaboradores históricos",
    categorySlug: "sin-categoria",
    // Nombre en tipografía, como en el copy aprobado del muro. El logo sigue pendiente de permiso.
    publicVisibility: true,
    legalReview: "NO_REQUERIDA" as const,
    sortOrder: indice + 1,
  })),
  {
    name: "Castillo de Cuzcurrita",
    slug: "castillo-de-cuzcurrita",
    relationshipType: "PATROCINADOR" as const,
    source: "ORGANIZACION" as const,
    sourceNote: "Confirmación directa de la organización: patrocinador de una edición anterior",
    categorySlug: "bodega-vino",
    // Hecho histórico confirmado; exposición pública desactivada hasta la revisión jurídica (C5).
    publicVisibility: false,
    legalReview: "PENDIENTE" as const,
    sortOrder: MARCAS_V3.length + 1,
  },
];

export const PAGINAS_LEGALES = [
  { slug: "privacidad", title: "Política de privacidad" },
  { slug: "aviso-legal", title: "Aviso legal" },
] as const;

/**
 * Solo en NONPROD: datos ficticios para probar la bandeja de propuestas.
 * Dominios example.com (reservados para ejemplos) y ninguna marca ni persona real.
 */
export const VERSION_LEGAL_SINTETICA = {
  versionLabel: "sintetica-1",
  body: "Texto sintético para pruebas en el entorno no productivo. No es la política de privacidad del Trofeo Escudero.",
} as const;

export const TEXTO_CONSENTIMIENTO = "He leído y acepto la política de privacidad.";

export const PROPUESTAS_FICTICIAS = [
  {
    name: "Persona de Prueba Uno",
    company: "Empresa Ficticia Uno (prueba)",
    email: "prueba.uno@example.com",
    jobTitle: "Cargo ficticio",
    collaborationType: "PATROCINADOR_PRINCIPAL_POLO",
    originRouteKey: "PECHO",
    originHoleNumber: null,
    formOrigin: "via:PECHO · tipo:PATROCINADOR_PRINCIPAL_POLO",
    status: "NUEVA",
    archivada: false,
    leida: false,
    nota: null,
  },
  {
    name: "Persona de Prueba Dos",
    company: "Empresa Ficticia Dos (prueba)",
    email: "prueba.dos@example.com",
    jobTitle: null,
    collaborationType: "WELCOME_PACK",
    originRouteKey: "BOLSA",
    originHoleNumber: null,
    formOrigin: "via:BOLSA · tipo:WELCOME_PACK",
    status: "REVISADA",
    archivada: false,
    leida: true,
    nota: null,
  },
  {
    name: "Persona de Prueba Tres",
    company: "Empresa Ficticia Tres (prueba)",
    email: "prueba.tres@example.com",
    jobTitle: "Cargo ficticio",
    collaborationType: "HOYO",
    originRouteKey: "JUEGO",
    originHoleNumber: 12,
    formOrigin: "via:JUEGO · hoyo:12 · tipo:HOYO",
    status: "EN_CONVERSACION",
    archivada: false,
    leida: true,
    nota: "Nota ficticia de prueba.",
  },
  {
    name: "Persona de Prueba Cuatro",
    company: "Empresa Ficticia Cuatro (prueba)",
    email: "prueba.cuatro@example.com",
    jobTitle: null,
    collaborationType: "OTRA",
    originRouteKey: null,
    originHoleNumber: null,
    formOrigin: "directo · tipo:OTRA",
    status: "DESCARTADA",
    archivada: true,
    leida: true,
    nota: null,
  },
] as const;

export const MENSAJE_FICTICIO =
  "Propuesta ficticia generada por el seed para probar la bandeja de propuestas. No corresponde a ninguna empresa ni persona real.";
