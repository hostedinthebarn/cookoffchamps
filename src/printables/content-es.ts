import type { PrintablesContent } from "./content";

// The Spanish printables (SW-62), drafted by Claude like the rest of the Spanish
// site and covered by the native-speaker review (SW-29). Same sheet ids and refs
// as content.ts.

/** Debajo de cada hoja de conteo (SW-92): los votos en papel se suman a los del celular en la app. */
const TALLY_NOTE =
  "¿También dejas votar por celular en la app? Cuenta aquí y suma el total en la app, en Votos en papel. Cada persona vota de una sola forma: escanea el código o toma una boleta en papel.";

export const es: PrintablesContent = {
  lang: "es",
  langName: "Español",
  path: "/es/imprimibles/",
  title: "Imprimibles gratis para tu concurso",
  description:
    "Boletas y hojas de puntos gratis para imprimir: concurso de pays de Acción de Gracias, concurso de galletas navideñas, concurso de chili y concurso de barbacoa. PDF tamaño carta.",
  intro: "Boletas, hojas de puntos y hojas de conteo para tu próximo concurso. Gratis para imprimir y compartir, sin registrarte.",
  appHref: "/?lang=es",
  downloadPdf: "Descargar el PDF",
  orPrint: "O imprime esta página directamente desde tu navegador.",
  tipsTitle: "Consejos para el día",
  guideLink: "Lee la guía",
  allPrintables: "Todos los imprimibles",
  skipThePaper: "Olvídate del papel: los invitados votan en su teléfono y la app cuenta.",
  runItFree: "Organiza tu propio concurso, gratis, en cookoffchamps.com",
  backToApp: "Ir a Cookoff Champs",
  partOf: "Parte de",
  sheets: [
    {
      id: "pie",
      path: "/es/imprimibles/boleta-concurso-de-pays/",
      ref: "pie",
      guidePath: "/es/guias/concurso-de-pays-de-accion-de-gracias/",
      title: "Boleta para concurso de pays",
      description:
        "Boleta gratis para imprimir para un concurso de pays de Acción de Gracias, seis por hoja, con hoja de conteo de votos. PDF tamaño carta.",
      intro: "Seis boletas por hoja, más una hoja de conteo. Numera cada pay, reparte las boletas y cuenta al final.",
      tips: [
        "Pon una tarjeta con un número junto a cada pay en lugar del nombre de quien lo hizo, para que voten por el pay y no por su tía favorita.",
        "Una boleta por invitado. Imprime algunas de más para quien llegue tarde.",
        "Puede haber empates. Llámalos cocampeones, o que se vuelvan a probar los pays empatados.",
      ],
      parts: [
        { kind: "slips", heading: "Boleta del concurso de pays", lines: ["Mejor pay", "Mejor masa", "Más original"] },
        { kind: "tally", heading: "Conteo del concurso de pays", columns: ["Pay #", "Pay", "Repostero", "Votos", "Total"], note: TALLY_NOTE },
      ],
    },
    {
      id: "cookie",
      path: "/es/imprimibles/hoja-de-puntos-concurso-de-galletas/",
      ref: "cookie",
      guidePath: "/es/guias/concurso-de-galletas-de-navidad/",
      title: "Hoja de puntos para concurso de galletas",
      description:
        "Hoja de puntos gratis para imprimir para un concurso de galletas navideñas: el jurado califica sabor, textura, presentación y espíritu navideño. Incluye boletas. PDF tamaño carta.",
      intro: "Una hoja de puntos para cada juez, más boletas del voto del público para todos los demás.",
      tips: [
        "Dale a cada juez su propia hoja, y que califiquen antes de comentarlo entre ellos.",
        "Un plato de cada galleta por juez lo mantiene justo: a nadie le toca la rota.",
        "Suma cada fila: gana el total más alto. Deja aparte el voto del público, para que los invitados también tengan un premio por el que votar.",
      ],
      parts: [
        {
          kind: "scores",
          heading: "Hoja de puntos del concurso de galletas",
          scale: "Califica cada una del 1 (no me gustó) al 5 (excelente).",
          judge: "Juez",
          entry: "Galleta #",
          criteria: ["Sabor", "Textura", "Presentación", "Espíritu navideño"],
          total: "Total",
        },
        { kind: "slips", heading: "Voto del público: galletas", lines: ["Mi galleta favorita"] },
      ],
    },
    {
      id: "chili",
      path: "/es/imprimibles/boleta-concurso-de-chili/",
      ref: "chili",
      guidePath: "/es/guias/como-juzgar-un-concurso-de-chili/",
      title: "Boleta y hoja del jurado para concurso de chili",
      description:
        "Boleta gratis para imprimir para un concurso de chili, una hoja del jurado para aroma, color, consistencia, sabor y regusto, y una hoja de conteo. PDF tamaño carta.",
      intro: "Boletas para invitados, una hoja del jurado con las cinco cosas que se califican en un chili, y una hoja de conteo.",
      tips: [
        "Sirve cada chili en vasos iguales y numerados, para que nadie sepa de quién es cada uno.",
        "Ten agua, galletas saladas o pan entre probadas.",
        "El jurado califica cada chili antes de pasar al siguiente, sin ir y venir.",
      ],
      parts: [
        { kind: "slips", heading: "Boleta del concurso de chili", lines: ["Mejor chili", "Mejor picante"] },
        {
          kind: "scores",
          heading: "Hoja del jurado: chili",
          scale: "Califica cada uno del 1 (malo) al 10 (excelente).",
          judge: "Juez",
          entry: "Chili #",
          criteria: ["Aroma", "Color", "Consistencia", "Sabor", "Regusto"],
          total: "Total",
        },
        { kind: "tally", heading: "Conteo del concurso de chili", columns: ["Chili #", "Chili", "Cocinero", "Votos", "Total"], note: TALLY_NOTE },
      ],
    },
    {
      id: "bbq",
      path: "/es/imprimibles/hoja-del-jurado-concurso-de-barbacoa/",
      ref: "bbq",
      guidePath: "/es/guias/concurso-de-barbacoa-en-casa/",
      title: "Hoja del jurado y boleta para concurso de barbacoa",
      description:
        "Hoja del jurado gratis para imprimir para un concurso de barbacoa (sabor, suavidad, presentación), boleta del voto del público y hoja de conteo, todo en un PDF. Tamaño carta.",
      intro:
        "Un PDF gratis para un concurso de barbacoa en casa: una hoja para el jurado, boletas del voto del público para los invitados y una hoja de conteo.",
      sections: [
        {
          heading: "Hoja del jurado para barbacoa",
          text: "Una fila por participante, calificada del 1 al 10 en sabor, suavidad y presentación. El sabor vale doble y la suavidad una vez y media, los mismos pesos que la plantilla de barbacoa de la app. Es un formato amistoso para el patio, no una hoja oficial de KCBS.",
          to: "pdf",
          linkText: "Descargar el PDF",
        },
        {
          heading: "Boleta del voto del público y conteo",
          text: "Seis boletas por hoja para recortar, y una hoja de conteo. Están en el mismo PDF que la hoja del jurado.",
          to: "pdf",
          linkText: "Descargar el PDF",
        },
        {
          heading: "¿Prefieres votar por celular? Hazlo gratis en Cookoff Champs",
          text: "Olvídate del papel: los invitados votan en su teléfono y la app cuenta.",
          to: "app",
          linkText: "Ir a Cookoff Champs",
        },
      ],
      tips: [
        "Numera cada participante y guarda la lista de cocineros fuera de la vista, para que el jurado y los invitados califiquen la barbacoa y no a quien la hizo.",
        "Juzga una carne a la vez (costillas, brisket, pollo, cerdo) para no comparar cortes distintos.",
        "Multiplica cada calificación por su peso y suma la fila. Gana el total más alto. Deja aparte el voto del público, para que los invitados también tengan un premio por el que votar.",
      ],
      parts: [
        {
          kind: "scores",
          heading: "Hoja del jurado: barbacoa",
          scale: "Califica cada una del 1 (malo) al 10 (excelente). El sabor vale ×2, la suavidad ×1.5 y la presentación ×1.",
          judge: "Juez",
          entry: "Núm.",
          criteria: ["Sabor (×2)", "Suavidad (×1.5)", "Presentación (×1)"],
          total: "Total con pesos",
        },
        { kind: "slips", heading: "Voto del público: barbacoa", lines: ["Mi barbacoa favorita"] },
        { kind: "tally", heading: "Conteo del concurso de barbacoa", columns: ["Núm.", "Platillo", "Cocinero", "Votos", "Total"], note: TALLY_NOTE },
      ],
    },
  ],
};
