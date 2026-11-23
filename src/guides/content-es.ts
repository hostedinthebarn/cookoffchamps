// La versión en español de las guías (SW-63): mismos ids y mismo orden que
// content.ts. Es una traducción, no una página distinta. Gary aprueba el texto
// antes de publicarlo.
import type { GuidesContent } from "./content";

export const es: GuidesContent = {
  lang: "es",
  langName: "Español",
  appHref: "/?lang=es",
  printableTitle: "Imprimible gratis",
  printablePage: "Abrir el imprimible",
  printablePdf: "Descargar el PDF",
  faqTitle: "Preguntas frecuentes",
  moreGuides: "Más guías",
  runItTitle: "Hazlo en la app",
  runItText:
    "Cookoff Champs es gratis para la familia y los amigos. Crea tu evento, agrega cada participante, imprime el cartel con el código QR y deja que los invitados voten desde el celular, a ciegas. Cuando quieras, la revelación muestra el tercer, el segundo y por último el primer lugar, con un clic cada vez.",
  runItButton: "Organiza tu concurso, gratis",
  partOf: "Parte de",
  guides: [
    {
      id: "pie",
      path: "/es/guias/concurso-de-pays-de-accion-de-gracias/",
      printableId: "pie",
      title: "Cómo organizar un concurso de pays de Acción de Gracias",
      description:
        "Una forma sencilla de organizar un concurso de pays de Acción de Gracias: elige categorías, numera los pays, vota a ciegas, desempata con justicia e incluye a los niños. Boleta imprimible gratis.",
      intro:
        "Un concurso de pays es la tradición de postre más fácil de empezar, porque todos iban a comer pay de todos modos. Estas son las decisiones que lo hacen justo y amistoso.",
      stepsTitle: "La versión corta",
      steps: [
        { name: "Elige las categorías", text: "Decide qué se puede ganar: mejor pay en general, mejor masa, más creativo y un premio infantil si hornean niños." },
        { name: "Reúne los pays", text: "Pide a los participantes que lleguen temprano. Anota quién trajo cada uno y guarda esa lista fuera de la vista." },
        { name: "Numera cada pay", text: "Pon una tarjeta con un número junto a cada pay, y nada más. Los invitados votan por un número, no por una persona." },
        { name: "Que todos prueben y voten", text: "Da a cada invitado una boleta, o un voto por categoría, y unos minutos para probar. Corta rebanadas pequeñas." },
        { name: "Cuenta los votos", text: "Suma las boletas, o deja que la app lo haga. Revisa si hay empates antes de anunciar nada." },
        { name: "Anuncia a los ganadores", text: "Lee el tercer lugar, el segundo y por último el primero, y solo entonces di de quién era el pay." },
      ],
      sections: [
        {
          id: "categories",
          heading: "Cómo elegir las categorías",
          body: [
            "Con una mesa familiar pequeña basta un premio. Con más de seis pays, unas cuantas categorías dan a más personas algo que ganar.",
            { list: ["Mejor pay en general: el premio principal.", "Mejor masa: para quienes la hicieron desde cero.", "Más creativo: para el pay que nadie esperaba.", "Mejor clásico: la calabaza, la nuez y la manzana merecen su propio premio."] },
            "Que sean tres o cuatro. Con más, todos los pays ganan algo, que es amable pero le quita emoción.",
          ],
        },
        {
          id: "blind",
          heading: "Votar a ciegas",
          body: [
            "El concurso solo es justo si los invitados no saben quién horneó qué. Pon los pays en una mesa con tarjetas numeradas, deja la lista con una sola persona y pide a los participantes que no ronden la mesa.",
            "Algunos pays se reconocen a simple vista, como el que viene en el molde de la abuela. Pásalos a un plato liso, o acéptalo y deja que esos votos corran.",
            "Pide que nadie vote por su propio pay. En un grupo pequeño es cuestión de honor, y funciona mejor de lo que parece.",
          ],
        },
        {
          id: "ties",
          heading: "Cómo desempatar",
          body: [
            "Decide cómo se resuelven los empates antes de contar, para que nadie sienta que cambiaron las reglas.",
            { list: ["Campeones compartidos: lo más sencillo, y nadie discute.", "Una nueva prueba: solo los pays empatados, y se vota levantando la mano.", "La decisión de un juez: una persona neutral, que no participe, elige."] },
          ],
        },
        {
          id: "kids",
          heading: "Pays de los niños",
          body: [
            "Que los niños horneen junto a los adultos es lo mejor del día, pero competir contra una receta de nuez de treinta años no siempre es justo.",
            { list: ["Dales su propia categoría, con su propio premio.", "Si quieren, deja que su pay compita también en general, pero que sea decisión suya.", "Deja votar a los más pequeños: una calcomanía en una tarjeta numerada basta si aún no escriben."] },
          ],
        },
        {
          id: "logistics",
          heading: "Detalles prácticos",
          body: [
            { list: ["Corta rebanadas pequeñas. Un pay en dieciséis porciones deja probarlos todos.", "Anota los alérgenos en la tarjeta si puedes: nueces, lácteos, gluten.", "Ten platos, tenedores y servilletas junto a la mesa, y una jarra de agua entre bocados.", "Calcula unos 20 minutos para probar, para que la votación no se apresure."] },
          ],
        },
      ],
      faq: [
        { q: "¿Cuántos pays necesito para un concurso?", a: "Con tres ya es un concurso. De ocho a doce es el máximo práctico para que los invitados prueben todos sin llenarse." },
        { q: "¿Los pays los juzga un jurado o se vota?", a: "En una reunión familiar, que voten todos los invitados: es más divertido y no hay que buscar jueces. En un evento más grande o más serio, funciona un jurado de tres personas, con un premio de los invitados además." },
        { q: "¿Cómo evitamos que voten por su propio pay?", a: "Pídeles que no lo hagan, y numera los pays para que la mayoría no sepa cuál es el suyo. En un grupo pequeño es cuestión de honor." },
        { q: "¿Y si dos pays empatan?", a: "Decláralos campeones compartidos, o prueba solo los empatados otra vez y vota levantando la mano. Acuerda el método antes de votar." },
      ],
    },
    {
      id: "cookie",
      path: "/es/guias/concurso-de-galletas-de-navidad/",
      printableId: "cookie",
      title: "Cómo organizar un concurso de galletas de Navidad",
      description:
        "Cómo organizar un concurso de galletas de Navidad: fija las reglas, califica sabor, textura y aspecto, desempata e incluye a los niños. Hoja de puntos imprimible gratis.",
      intro:
        "Un concurso de galletas sirve para una fiesta, una oficina o el salón de la iglesia. Lo importante es fijar las reglas temprano y que la prueba sea lo bastante corta para que la gente aún pueda ponerse de pie.",
      stepsTitle: "La versión corta",
      steps: [
        { name: "Fija las reglas", text: "Decide cuántas galletas lleva cada persona, si deben ser caseras y si la receta tiene que ser secreta." },
        { name: "Elige cómo juzgar", text: "Pueden votar los invitados o calificar unos jueces. Muchos concursos hacen las dos cosas: un premio del jurado y otro del público." },
        { name: "Emplata y numera", text: "Pon unas cuantas de cada galleta en un plato liso con un número. Esconde la lista de quién las trajo." },
        { name: "Califica o vota", text: "Los jueces califican cada plato antes de pasar al siguiente. Los invitados marcan su favorita en una boleta." },
        { name: "Suma y desempata", text: "Suma cada fila de la hoja de puntos. Si dos galletas empatan, usa el desempate acordado de antemano." },
        { name: "Anuncia y comparte", text: "Anuncia a los ganadores y deja que todos se coman lo que sobre." },
      ],
      sections: [
        {
          id: "rules",
          heading: "Reglas que conviene fijar temprano",
          body: [
            { list: ["Cantidad: una docena es suficiente, y alcanza para que cada juez pruebe una.", "Solo caseras, o masa comprada decorada en casa: decide cuál y dilo en la invitación.", "Alérgenos: pide una nota sobre nueces, lácteos y gluten, y ponla en el plato.", "Una entrada por persona mantiene la mesa en un tamaño que se puede probar."] },
          ],
        },
        {
          id: "categories",
          heading: "Categorías",
          body: [
            "En una mesa de intercambio de galletas hay de todo. Las categorías evitan que las galletas de azúcar compitan contra el pan de jengibre.",
            { list: ["Mejor clásica: de azúcar, snickerdoodles, polvorones.", "Mejor decorada: betún y chispas.", "Más creativa: la que sorprende.", "Mejor de chocolate: porque habrá varias."] },
          ],
        },
        {
          id: "judging",
          heading: "Jurado a ciegas y hoja de puntos",
          body: [
            "Los jueces no deben saber quién hizo cada galleta. Numera los platos y deja la lista con el organizador.",
            "Una hoja de puntos sencilla funciona bien. Califica cada galleta del 1 al 5 en sabor, textura, aspecto y espíritu navideño, y suma la fila. El sabor puede valer doble si quieres que pese más.",
            "Pide a los jueces que califiquen cada plato antes de comentarlo. En cuanto alguien dice «¡guau!», todas las notas suben.",
          ],
        },
        {
          id: "ties",
          heading: "Cómo desempatar",
          body: [
            "Acuerda el método antes de ver las calificaciones.",
            { list: ["Gana la nota más alta de sabor: el desempate más sencillo y el que más gente acepta.", "Los jueces vuelven a probar las galletas empatadas y votan levantando la mano.", "Campeones compartidos, con dos premios.", "Que el voto del público decida entre las empatadas."] },
          ],
        },
        {
          id: "kids",
          heading: "Galletas de los niños",
          body: [
            "Es el concurso donde los niños sí compiten de verdad, y a menudo ganan en aspecto.",
            { list: ["Dales su propia categoría, con su propio premio.", "Déjalos decorar: una galleta lisa con betún y chispas es una entrada.", "Si hay suficientes niños mayores, forma un jurado infantil para esa categoría.", "Da un listón o una calcomanía a cada niño participante, gane o no."] },
            { parts: ["¿Decoran con niños? ", { text: "Galletas de azúcar para un concurso de decoración infantil", href: "/es/guias/galletas-de-azucar-para-decorar/" }, " trae una galleta, un glaseado y una forma de organizar la mesa."] },
          ],
        },
      ],
      faq: [
        { q: "¿Cuántas galletas debe llevar cada persona?", a: "Una docena basta en la mayoría de los concursos. Cada juez necesita una, y los invitados necesitan probar para votar por su favorita." },
        { q: "¿Jueces o votan los invitados?", a: "Las dos cosas funcionan. Un grupo pequeño de jueces con hojas de puntos elige la mejor galleta, y el voto de los invitados elige la favorita." },
        { q: "¿Qué deben calificar los jueces?", a: "Sabor, textura, aspecto y espíritu navideño, cada uno del 1 al 5, es un conjunto sencillo y fácil de explicar. La hoja de puntos imprimible lo usa." },
        { q: "¿Cómo lo hacemos justo con las alergias?", a: "Pide que rotulen nueces, lácteos y gluten, y pon la nota en el plato. Los jueces con alergias pueden saltarse un plato y calificar el resto." },
      ],
    },
    {
      id: "sugar-cookies",
      path: "/es/guias/galletas-de-azucar-para-decorar/",
      printableId: "cookie",
      title: "Galletas de azúcar para un concurso de decoración infantil",
      description:
        "Una galleta sencilla para extender con rodillo que conserva su forma al cortarla, un glaseado fácil y cómo organizar un concurso de decoración para niños con un listón para cada niño.",
      intro:
        "Un concurso de decoración necesita una galleta que conserve la forma con que se cortó. Una estrella que se derrite hasta volverse una mancha no le deja nada que decorar a un niño de siete años. La base es la galleta de mantequilla navideña de King Arthur Baking, una masa sencilla sin polvo de hornear que, según la página de la receta, casi no se extiende en el horno. La receta es de King Arthur y hemos copiado los ingredientes tal como los publican. Más abajo hay un glaseado sencillo de la misma página, y después cómo organizaríamos el concurso: una categoría propia para los niños y un listón para cada uno.",
      stepsTitle: "La versión corta",
      steps: [
        { name: "Prepara la masa", text: "Bate el azúcar, la mantequilla, la yema, la sal y el sabor hasta que quede suave, y luego incorpora la harina." },
        { name: "Refrigérala", text: "Divide la masa en dos, aplana cada mitad en forma de disco y refrigérala 2 horas o toda la noche." },
        { name: "Extiende y corta", text: "Calienta el horno a 350 °F. Deja un disco fuera de 20 a 30 minutos, extiéndelo a un grosor de entre 1/8 y 3/16 de pulgada y corta las formas." },
        { name: "Hornea y enfría", text: "Hornea de 12 a 14 minutos, hasta que estén firmes y apenas doradas en los bordes, y déjalas enfriar en la bandeja." },
        { name: "Prepara el glaseado", text: "Mezcla azúcar glas, leche y jarabe de maíz claro, divídelo en tazones y tiñe cada uno." },
        { name: "Deja que los niños decoren", text: "Da a cada niño unas galletas frías, el glaseado y los azúcares, y califica los platos con la hoja de puntuación." },
      ],
      sections: [
        {
          id: "cookies",
          heading: "Prepara las galletas",
          body: [
            { parts: ["Fuente: King Arthur Baking, ", { text: "Holiday butter cookies", href: "https://www.kingarthurbaking.com/recipes/holiday-butter-cookies-recipe" }, " (en inglés). Rinde unas 5 docenas de galletas de 2 pulgadas, suficientes para una mesa de niños. Cuenta con unas 2 horas y 42 minutos en total, la mayor parte en el refrigerador."] },
            "Ingredientes de las galletas, como los enumera King Arthur:",
            {
              list: [
                "1 1/4 tazas (142 g) de azúcar glas",
                "18 cucharadas (255 g) de mantequilla con sal, a temperatura ambiente",
                "1 yema de huevo grande",
                "1/2 cucharadita de sal de mesa",
                "1/4 cucharadita de King Arthur Fiori di Sicilia, o el sabor que prefieras",
                "2 3/4 tazas (330 g) de harina de trigo todo uso King Arthur sin blanquear",
              ],
            },
            "Notas de King Arthur: si usas mantequilla sin sal, pon 1 cucharadita de sal. En lugar del Fiori di Sicilia puedes usar 2 cucharaditas de extracto de vainilla, 1 cucharadita de extracto de almendra, o ambos. El extracto de almendra agrega almendras a la lista de alérgenos de abajo.",
            "Bate el azúcar, la mantequilla, la yema, la sal y el sabor hasta que quede suave. Incorpora la harina. Si la masa no se une, agrega una cucharada de agua. Divídela en dos, aplana cada mitad en forma de disco y refrigérala 2 horas o toda la noche.",
            "Calienta el horno a 350 °F. Deja un disco fuera de 20 a 30 minutos, hasta que se pueda extender pero siga frío. Extiéndelo a un grosor de entre 1/8 y 3/16 de pulgada, corta las formas y junta los recortes para extenderlos otra vez. Hornea en bandejas sin engrasar o forradas con papel pergamino de 12 a 14 minutos, hasta que las galletas estén firmes y apenas doradas en los bordes. Déjalas enfriar en la bandeja. Espera a que estén completamente frías antes de que alguien las glasee.",
            "Por favor, no dejes que los niños coman la masa cruda. Lleva yema de huevo cruda y harina cruda, y ambas son un buen motivo para esperar al horno.",
          ],
        },
        {
          id: "icing",
          heading: "Prepara el glaseado",
          body: [
            "Fuente: el glaseado impreso en la misma página de King Arthur.",
            "Ingredientes del glaseado:",
            {
              list: [
                "2 1/4 tazas (255 g) de azúcar glas",
                "de 2 1/2 a 3 cucharadas (de 35 g a 43 g) de leche",
                "2 cucharadas (39 g) de jarabe de maíz claro",
                "Colorante alimentario natural, opcional",
                "1 taza (227 g) de azúcar granulada gruesa o de colores, para decorar, opcional",
              ],
            },
            "Mezcla el azúcar, 2 1/2 cucharadas de leche y el jarabe de maíz. Si queda espeso, agrega leche una cucharadita a la vez. Pruébalo primero en una galleta y agrega leche o azúcar hasta que se extienda como quieras. Divídelo en tazones pequeños y tiñe cada uno. Espolvorea el azúcar mientras el glaseado aún está húmedo, porque no se pega una vez que se seca.",
          ],
        },
        {
          id: "contest",
          heading: "Organiza el concurso de decoración",
          body: [
            "Dale a los niños su propia categoría con su propio premio, aparte de los reposteros adultos. Una galleta sencilla con glaseado y chispas es una participación completa, así que un niño no necesita hornear nada. Pon las galletas frías, los tazones de glaseado y los azúcares en una mesa, y dale a cada niño 3 o 4 galletas para trabajar.",
            "Si hay suficientes niños mayores, deja que ellos sean el jurado de la categoría infantil. Todo niño que participa recibe un listón o una calcomanía, gane o no. Eso es lo que recuerdan. El premio es para una galleta, y el listón es para todos.",
            { parts: ["Numera los platos terminados y califícalos con la hoja de puntos para imprimir, igual que juzgarías las galletas de los adultos. Las reglas completas, las categorías, cómo desempatar y cómo juzgar a ciegas están en nuestra guía gratuita, ", { text: "Cómo organizar un concurso de galletas de Navidad", href: "/es/guias/concurso-de-galletas-de-navidad/" }, ", y la hoja es la ", { text: "hoja de puntos para concurso de galletas", href: "/es/imprimibles/hoja-de-puntos-concurso-de-galletas/" }, "."] },
          ],
        },
        {
          id: "labels",
          heading: "Etiqueta los platos",
          body: [
            "Pide a todos que indiquen si hay nueces, lácteos y gluten, y que pongan la etiqueta en el plato. Esta receta tiene trigo (harina), lácteos (mantequilla, y leche en el glaseado) y huevo (la yema), y también frutos secos si usas el extracto de almendra. La página de King Arthur no trae declaración de alérgenos, así que esta lista sale de los ingredientes de arriba.",
          ],
        },
      ],
      faq: [
        { q: "¿Pueden los niños comer la masa?", a: "No. Lleva yema de huevo cruda y harina cruda. Esperen a la galleta horneada." },
        { q: "¿Tiene que ser esta receta?", a: "No. Una galleta sencilla con glaseado y chispas es una participación válida, así que la masa comprada en la tienda también sirve. Esta es una receta que, según King Arthur, conserva su forma." },
        { q: "¿Cuántas galletas salen?", a: "King Arthur dice que unas 5 docenas de 2 pulgadas." },
      ],
      credit: "Receta: King Arthur Baking, Holiday butter cookies. No tenemos ninguna relación con King Arthur Baking.",
      runItText: "Organiza todo el concurso en la app Cookoff Champs: los invitados votan desde el teléfono, gratis y sin saber quién hizo cada galleta.",
    },
    {
      id: "chili",
      path: "/es/guias/como-juzgar-un-concurso-de-chili/",
      printableId: "chili",
      title: "Cómo juzgar un concurso de chili",
      description:
        "Cómo juzgar un concurso de chili: califica aroma, color, consistencia, sabor y retrogusto, prueba a ciegas, desempata e incluye a los niños. Hoja del jurado imprimible gratis.",
      intro:
        "Juzgar chili tiene una larga tradición, y unas pocas reglas lo hacen justo. Esta es una forma sencilla de hacerlo en una cena de la iglesia, una oficina o el patio de casa.",
      stepsTitle: "La versión corta",
      steps: [
        { name: "Prepara los vasos", text: "Sirve cada chili en vasos idénticos y numerados, para que nadie sepa de quién es cada uno." },
        { name: "Explica a los jueces", text: "Explica las cinco calificaciones y qué significa un 1 y un 5. Da a cada juez una hoja y un lápiz." },
        { name: "Prueba en orden", text: "Los jueces prueban los chilis uno por uno y califican cada uno enseguida, con agua o galletas saladas simples entre uno y otro." },
        { name: "Deja votar a los invitados", text: "Los invitados reciben una boleta para el premio del público, para que todos opinen." },
        { name: "Suma las calificaciones", text: "Suma las notas de cada chili entre todos los jueces y revisa si hay empates." },
        { name: "Anuncia a los ganadores", text: "Nombra el tercer lugar, el segundo y el primero, y luego revela de quién era cada chili." },
      ],
      sections: [
        {
          id: "criteria",
          heading: "Qué califican los jueces",
          body: [
            "Muchos concursos juzgan cinco cosas. Califica cada una del 1 al 5, o del 1 al 10 si quieres más margen.",
            { list: ["Aroma: ¿huele bien antes de la primera cucharada?", "Color: un color rico y apetitoso, ni gris ni aguado.", "Consistencia: ni sopa ni pasta.", "Sabor: la nota principal, el equilibrio de picante, sal, calor y profundidad.", "Retrogusto: lo que queda un momento después, bueno o no."] },
            "Los concursos oficiales tienen sus propias reglas de puntuación; si piensas inscribirte en uno, revisa las suyas. En casa sirve cualquier escala, siempre que sea la misma para todos.",
          ],
        },
        {
          id: "blind",
          heading: "Cata a ciegas",
          body: [
            "El jurado solo es justo si no sabe de quién es el chili que prueba. Numera los vasos, deja la lista de cocineros con el organizador y pide a los cocineros que se alejen de la mesa de los jueces.",
            "Los jueces deben probar en el mismo orden, con agua y galletas saladas simples o pan entre vasos. El picante se acumula, así que un chili suave que se prueba al final queda en desventaja. Si puedes, cambia el orden para cada juez.",
          ],
        },
        {
          id: "ties",
          heading: "Cómo desempatar",
          body: [
            "Decídelo con tiempo. Las opciones más comunes:",
            { list: ["Gana la nota más alta de sabor.", "Los jueces vuelven a probar los chilis empatados y votan levantando la mano.", "Campeones compartidos."] },
          ],
        },
        {
          id: "people",
          heading: "Jueces y premio del público",
          body: [
            "Tres jueces son un buen jurado. Cinco son mejor, porque un paladar fuera de lo común pesa menos. Elige personas a las que les guste el chili y que no participen.",
            "El voto del público no cuesta nada y da voz a los invitados. Que sea un premio aparte del ganador del jurado.",
          ],
        },
        {
          id: "kids",
          heading: "Chilis de los niños",
          body: [
            { list: ["Una categoría infantil, con chili suave, deja el picante fuera de la comparación.", "Los catadores pequeños pueden votar en el premio del público con una calcomanía.", "Ofrece una opción suave y otra picante bien rotulada, para que ningún niño se lleve una sorpresa."] },
          ],
        },
      ],
      faq: [
        { q: "¿Qué buscan los jueces de chili?", a: "La mayoría de las hojas de puntos usan aroma, color, consistencia, sabor y retrogusto. El sabor suele valer más." },
        { q: "¿Cuántos chilis puede probar un juez?", a: "Unos ocho a diez antes de que el paladar se canse. Con más, divide las entradas en rondas y lleva a los mejores de cada una a una final." },
        { q: "¿Cómo se mantiene a ciegas el concurso de chili?", a: "Numera vasos idénticos, guarda la lista de cocineros fuera de la vista y mantén a los cocineros lejos de los jueces." },
        { q: "¿Cómo resolvemos un empate?", a: "Acuerda el método de antemano. Lo habitual es la nota más alta de sabor; el siguiente paso es volver a probar." },
      ],
    },
  ],
};
