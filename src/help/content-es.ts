import type { HelpContent } from "./content";

// The public Q&A in Spanish (SW-27): a translation of content.ts with the same
// sections and question ids. Button names in quotes match the app's Spanish
// wording in src/client/i18n/es.ts.
// ⚠️ Drafted by Claude 2026-10-26, not yet checked by a native speaker.

export const es: HelpContent = {
  lang: "es",
  langName: "Español",
  path: "/es/ayuda/",
  title: "Ayuda y preguntas",
  description:
    "Cómo funciona Cookoff Champs: votación a ciegas con código QR, cómo organizar un concurso familiar de cocina, el anuncio de ganadores del 3.º al 1.º y qué datos guardamos.",
  intro: "Cómo se vota, cómo organizar un concurso y qué guardamos de ti. Escribe abajo para buscar una pregunta.",
  filterLabel: "Buscar una pregunta",
  noMatches: "Ninguna pregunta coincide. Prueba con una palabra más corta.",
  backToApp: "Ir a Cookoff Champs",
  appHref: "/?lang=es",
  linkLabel: "Enlace a esta respuesta",
  printablesLink: "Imprimibles gratis",
  printablesHref: "/es/imprimibles/",
  guides: [
    { text: "Guía del concurso de pays", href: "/es/guias/concurso-de-pays-de-accion-de-gracias/" },
    { text: "Guía del concurso de galletas", href: "/es/guias/concurso-de-galletas-de-navidad/" },
    { text: "Guía para juzgar chili", href: "/es/guias/como-juzgar-un-concurso-de-chili/" },
  ],
  noticesLink: "Licencias de código abierto",
  partOf: "Parte de",
  privacyLink: "Política de privacidad",
  privacyHref: "/es/privacidad/",
  privacyNote: "La página completa de privacidad:",
  sections: [
    {
      id: "guests",
      title: "Para invitados: cómo votar",
      questions: [
        {
          id: "how-to-vote",
          q: "¿Cómo voto?",
          a: [
            "Escanea el código QR del cartel o de la tarjeta de un platillo. No necesitas app ni cuenta. Si tu teléfono no lo escanea, entra a cookoffchamps.com y escribe el código de 6 caracteres del cartel. Luego toca tu platillo favorito en cada categoría.",
          ],
        },
        {
          id: "blind-voting",
          q: "¿Por qué no puedo ver quién cocinó cada platillo?",
          a: [
            "La votación es a ciegas. Ves el número del platillo, su nombre y una foto, pero nunca quién lo cocinó, para que votes por la comida y no por tu tía favorita. Los nombres de quienes cocinaron aparecen por primera vez en el anuncio de ganadores.",
          ],
        },
        {
          id: "change-vote",
          q: "¿Puedo cambiar mi voto?",
          a: ["Sí, hasta que se cierre la votación. Toca otro platillo y tu voto pasa a ese. Sigues teniendo un voto por categoría."],
        },
        {
          id: "one-vote-per-phone",
          q: "¿De verdad es un voto por teléfono?",
          a: [
            "Un voto por teléfono en cada categoría, y tu navegador lo recuerda. Es un límite suave: una pestaña privada o un segundo navegador podrían votar otra vez. Es una decisión a propósito para un evento familiar.",
            "Quien organiza ve en vivo cuántos votos se han emitido, así que un montón de votos de más se nota frente al número de invitados. No identificamos los teléfonos por sus características, porque dos invitados con el mismo modelo podrían quedarse sin votar.",
          ],
        },
        {
          id: "see-standings",
          q: "¿Puedo ver quién va ganando?",
          a: [
            "No. Mientras la votación está abierta nadie ve las posiciones, excepto quien organiza, y solo si toca para echar un vistazo. Así el anuncio sigue siendo una sorpresa.",
          ],
        },
        {
          id: "voting-closed",
          q: "¿Qué pasa cuando se cierra la votación?",
          a: [
            "El enlace para votar dice \"La votación está cerrada. ¡Pronto vienen los resultados!\" hasta que se anuncian los ganadores. Después del anuncio, el mismo enlace muestra los resultados para siempre: lugares, votos y fotos.",
          ],
        },
        {
          id: "ties",
          q: "¿Y si dos platillos empatan?",
          a: ["Comparten el lugar y se anuncian juntos. Un empate en primer lugar los hace campeones a los dos. No hay desempate ni segunda vuelta."],
        },
        {
          id: "spanish",
          q: "¿Está en español?",
          a: [
            "Sí. La app empieza en el idioma de tu teléfono, y el botón English / Español arriba de cada página lo cambia; tu elección se recuerda en ese teléfono. Los correos para entrar y las invitaciones de quien organiza llegan en el idioma que está usando.",
            "Los nombres que la gente escribe, como platillos, cocineros y categorías, aparecen tal como se escribieron.",
          ],
        },
      ],
    },
    {
      id: "organizers",
      title: "Para quien organiza: cómo llevar el concurso",
      questions: [
        {
          id: "cost",
          q: "¿Cuánto cuesta?",
          a: ["Los concursos familiares son gratis y sin límite de eventos."],
        },
        {
          id: "set-up",
          q: "¿Cómo preparo un concurso?",
          a: [
            {
              steps: [
                "Entra con tu correo. Te mandamos un enlace; no hay contraseña.",
                "Crea el concurso: un nombre y, si quieres, una fecha.",
                "Agrega cada platillo: el nombre de quien lo cocinó, el nombre del platillo y una foto.",
                "Imprime el cartel para votar, las tarjetas de mesa o las dos cosas.",
                "Abre la votación cuando la gente esté lista para probar.",
              ],
            },
          ],
        },
        {
          id: "photos",
          q: "¿Tengo que tomar fotos?",
          a: [
            "Son opcionales, pero ayudan a los invitados a encontrar el platillo correcto. Tómalas con tu teléfono conforme llega cada platillo. La app achica cada foto en tu teléfono antes de subirla (a 1,600 píxeles del lado más largo), así que es rápido aunque el wifi del lugar sea lento.",
          ],
        },
        {
          id: "printing",
          q: "¿Qué imprimo?",
          a: [
            "Dos cosas, cada una en tamaño carta, y puedes imprimir una o las dos. El cartel para votar trae el nombre del concurso, un código QR grande y el código para escribir en los teléfonos que no escanean. Las tarjetas de mesa traen una tarjeta por platillo con su número y nombre, más un código QR pequeño que abre la votación con ese platillo resaltado.",
            "Numera los platillos en la mesa para que coincidan.",
          ],
        },
        {
          id: "categories",
          q: "¿Puedo tener más de una categoría?",
          a: [
            "Sí. Agrega categorías como Chili, Postres o Guarniciones, y cada una tiene su propio ganador. Los invitados tienen un voto por categoría, y el anuncio de ganadores va categoría por categoría.",
            "Un concurso nuevo empieza con una sola categoría, y los controles de categorías no estorban hasta que agregas una segunda.",
          ],
        },
        {
          id: "co-organizers",
          q: "¿Alguien me puede ayudar a organizarlo?",
          a: [
            "Sí. Invita a otras personas al equipo organizador por correo. Pueden agregar platillos, abrir y cerrar la votación, echar un vistazo a las posiciones, imprimir, anunciar a los ganadores y deshacer el anuncio. Solo quien creó el concurso puede borrarlo o cambiar el equipo organizador.",
          ],
        },
        {
          id: "peek",
          q: "¿Puedo ver las posiciones antes del anuncio?",
          a: [
            "Sí. Mientras la votación está abierta, toca \"Echar un vistazo a las posiciones\". El panel se vuelve a ocultar solo después de 20 segundos, para que un teléfono a la vista de los invitados no arruine la sorpresa. El número de votos emitidos siempre se ve.",
          ],
        },
        {
          id: "reopen-voting",
          q: "Cerré la votación muy pronto. ¿La puedo reabrir?",
          a: [
            "Sí. Toca \"Reabrir la votación\". Se conservan todos los votos que ya había, y los invitados pueden seguir votando o cambiar su voto. La app pregunta antes de cerrar la votación, así que es difícil cerrarla por accidente.",
          ],
        },
        {
          id: "change-dishes",
          q: "¿Puedo cambiar los platillos después de cerrar la votación?",
          a: [
            "No. Al cerrar la votación, los platillos y las categorías quedan fijos para que los resultados no cambien justo antes del anuncio. Si necesitas corregir algo, primero reabre la votación.",
          ],
        },
        {
          id: "reveal",
          q: "¿Cómo funciona el anuncio de ganadores?",
          a: [
            "Abre el anuncio en un teléfono o, mejor todavía, en una tele. Cada toque (o la barra espaciadora o la flecha derecha) muestra el siguiente lugar, con la foto del platillo y, por primera vez, el nombre de quien lo cocinó: tercero, luego segundo y luego primero.",
            "La app pregunta antes de empezar el anuncio, porque cuando aparece el primer lugar los resultados se publican en el enlace de los invitados.",
          ],
        },
        {
          id: "undo-reveal",
          q: "Anuncié a los ganadores por error. ¿Lo puedo deshacer?",
          a: [
            "Sí. En la página del concurso, toca \"Deshacer el anuncio\". Los resultados se vuelven a ocultar, y el enlace de los invitados vuelve a decir que pronto vienen los resultados. Desde ahí puedes reabrir la votación o volver a anunciar a los ganadores.",
            "La app te avisa primero, porque si reabres la votación, las posiciones que la gente ya vio podrían cambiar.",
          ],
        },
        {
          id: "results-last",
          q: "¿Cuánto tiempo se quedan publicados los resultados?",
          a: [
            "Para siempre. Después del anuncio, el enlace para votar se convierte en una página de resultados, y nada vence. El concurso sigue en tu lista hasta que lo borres.",
          ],
        },
        {
          id: "delete-event",
          q: "¿Puedo borrar un concurso?",
          a: [
            "Sí, si tú lo creaste. Al borrarlo se eliminan para siempre el concurso, sus fotos y sus votos, y el enlace deja de funcionar para todos. La app pregunta primero.",
          ],
        },
      ],
    },
    {
      id: "pro",
      title: "Concursos con jueces (pro)",
      questions: [
        {
          id: "pro-what",
          q: "¿Qué es un concurso con jueces?",
          a: [
            "Un concurso en el que jueces con nombre califican los platillos y deciden los lugares, como en un campeonato de una iglesia, una obra benéfica o una oficina. Eliges Familiar o Pro al crear el concurso, y queda fijo cuando se abre la votación. Los platillos, las categorías, lo que se imprime y el anuncio funcionan igual que en un concurso familiar.",
          ],
        },
        {
          id: "pro-cost",
          q: "¿Cuánto cuesta un concurso con jueces?",
          a: [
            "Los concursos con jueces son gratis por tiempo limitado mientras están en versión preliminar. Más adelante serán de pago. Los concursos que hagas durante este periodo, y sus páginas de resultados, siguen funcionando.",
          ],
        },
        {
          id: "pro-tickets",
          q: "¿Por qué los platillos usan boletos de rifa?",
          a: [
            "Usa un rollo de boletos dobles: una mitad va en el platillo y la otra se la queda quien cocinó. Al entregar cada platillo, escribe su número de boleto. La aplicación revisa que no se repita. Jueces e invitados ven el número de boleto en lugar de \"Platillo 1\", y la mitad del cocinero prueba cuál platillo es suyo.",
            "Corta los boletos en orden aleatorio. Si se reparten en secuencia, los números revelan quién llegó primero.",
          ],
        },
        {
          id: "pro-judges",
          q: "¿Cómo califican los jueces?",
          a: [
            "Agrega a cada juez por su nombre. Cada uno recibe un enlace o código QR personal, sin crear cuenta. Ahí califica cada platillo en cada criterio con un número entero del 1 al 10: 5 es normal, 8 es excelente y 10 es lo mejor que ha probado. También puede dejar un comentario.",
            "Las calificaciones de un platillo se bloquean al enviarlas, como una hoja de papel entregada. Si un juez se equivocó, puedes desbloquearle ese platillo antes del anuncio. La página del concurso muestra el avance de cada juez, por ejemplo \"Pat: 14 de 18 calificados\".",
          ],
        },
        {
          id: "pro-blind",
          q: "¿Los jueces saben de quién es cada platillo?",
          a: [
            "No. Los jueces solo ven el número de boleto, porque el plato lo tienen enfrente. Puedes mostrarles también el nombre de los platillos, pero viene desactivado, porque un nombre como \"El chili premiado de la abuela\" delata a quien lo cocinó. Hasta el anuncio, los invitados ven los nombres solo si los jueces también, ya que un juez podría abrir la página de los invitados.",
          ],
        },
        {
          id: "pro-criteria",
          q: "¿Cómo funcionan los criterios y sus pesos?",
          a: [
            "Empieza con una plantilla de chili, barbacoa o uso general, y luego cambia el nombre, agrega o quita criterios. Cada uno tiene un peso, y el sabor suele pesar más: Sabor ×2, Textura ×1.5, Presentación ×1 y Aroma ×1, como en la barbacoa de competencia. La calificación de un juez para un platillo es el promedio ponderado de sus criterios, así que se queda en la escala del 1 al 10. Los criterios quedan fijos cuando se abre la votación.",
          ],
        },
        {
          id: "pro-outliers",
          q: "¿Por qué se quitan la calificación más alta y la más baja?",
          a: [
            "Con 5 jueces o más, antes de promediar se quitan la calificación más alta y la más baja de cada platillo, como en clavados y gimnasia. En un evento de la comunidad es tan probable que un amigo suba la calificación de otro como que un rival la baje. Con menos de 5 jueces no se quita nada, porque se perdería demasiado. Puedes desactivarlo.",
          ],
        },
        {
          id: "pro-ties",
          q: "¿Qué pasa si dos platillos empatan?",
          a: [
            "El empate se rompe con el criterio de más peso, luego con el siguiente, y así sucesivamente. Si siguen iguales, comparten el lugar. No se echa a la suerte.",
          ],
        },
        {
          id: "pro-missed",
          q: "¿Y si un juez no califica un platillo o se tiene que ir?",
          a: [
            "Un platillo que un juez no calificó se promedia con los jueces que sí lo hicieron. Antes de cerrar, la aplicación avisa qué platillos le faltan a cada juez.",
            "Para que el enlace de un juez deje de funcionar, revócalo. Tú decides qué pasa con sus calificaciones: consérvalas si tuvo que irse antes, o quítalas si el enlace cayó en malas manos.",
          ],
        },
        {
          id: "pro-comments",
          q: "¿Quién ve los comentarios de los jueces?",
          a: [
            "Tú, con el nombre del juez, en la página del concurso y en la exportación. Como opción, cada cocinero puede leer los comentarios sobre su platillo después del anuncio escribiendo su número de boleto, sin los nombres de los jueces. Los números de boleto son fáciles de adivinar, así que se avisa a los jueces que sus comentarios podrían leerse y que los hagan amables y útiles.",
          ],
        },
        {
          id: "pro-peoples-choice",
          q: "¿Los invitados todavía pueden votar?",
          a: [
            "Sí, por el premio del público, que está activado a menos que lo quites. Los invitados votan por su favorito como en un concurso familiar, un voto por teléfono en cada categoría. No cambia los lugares que deciden los jueces. Al abrir y cerrar la votación se abren y cierran juntos los jueces y el voto del público.",
          ],
        },
        {
          id: "pro-grand-champion",
          q: "¿Qué es el gran campeón?",
          a: [
            "Un premio opcional cuando hay varias categorías: el mejor total sumando todas las categorías, entre quienes participaron en todas. El nombre del cocinero se reconoce aunque se haya escrito distinto, así que \"Ana Ruiz\" y \"ana ruiz\" son la misma persona. Si tiene dos platillos en una categoría, cuenta el mejor.",
          ],
        },
        {
          id: "pro-reveal",
          q: "¿Cómo es el anuncio en un concurso con jueces?",
          a: [
            "Primero va el premio del público, luego el 3.º, 2.º y 1.er lugar de cada categoría, y al final el gran campeón. Cada lugar muestra la calificación final del platillo, por ejemplo 8.74, donde un anuncio familiar muestra los votos.",
          ],
        },
        {
          id: "pro-final",
          q: "¿Por qué no puedo deshacer el anuncio en un concurso con jueces?",
          a: [
            "Porque los resultados de los jueces son un veredicto, y volver a ocultarlos parecería que se cambió. La aplicación lo dice antes de empezar el anuncio y te pide marcar \"Entiendo que los resultados serán definitivos\". Hasta entonces todavía puedes reabrir la votación y desbloquear calificaciones.",
          ],
        },
        {
          id: "pro-results",
          q: "¿Qué muestran los resultados?",
          a: [
            "El enlace de los invitados se convierte en una página de resultados con los lugares, la calificación final de cada platillo y cómo salió en cada criterio. Los nombres de los jueces nunca se muestran en público. Puedes descargar una hoja de cálculo (CSV) con las calificaciones y comentarios de cada juez para tus registros.",
          ],
        },
      ],
    },
    {
      id: "privacy",
      title: "Privacidad",
      questions: [
        {
          id: "guest-data",
          q: "¿Qué guardan de los invitados?",
          a: [
            "Muy poco. Cuando votas, tu navegador recibe un identificador al azar en una cookie para que tu voto se pueda recordar y cambiar. Dura un año. Guardamos ese identificador con tu voto. Sin nombre, sin correo y sin cuenta.",
            "Al votar también se usa Cloudflare Turnstile, una verificación invisible que bloquea el relleno automático de votos.",
          ],
        },
        {
          id: "organizer-data",
          q: "¿Qué guardan de quien organiza?",
          a: [
            "Tu correo y los concursos que organizas. Los enlaces para entrar funcionan una sola vez y vencen en 15 minutos. Ya que entraste, tu sesión sigue abierta en ese navegador por 30 días.",
          ],
        },
        {
          id: "ip-addresses",
          q: "¿Guardan direcciones IP?",
          a: [
            "Solo de forma codificada y solo por poco tiempo: un día como máximo para los correos de acceso y 20 minutos como máximo para los códigos escritos. Los usamos para evitar que una misma dirección envíe muchos correos de acceso o pruebe muchos códigos. Después se borran.",
            "La forma codificada no se puede convertir de nuevo en la dirección sin una clave secreta que solo tiene la app.",
          ],
        },
        {
          id: "photo-visibility",
          q: "¿Quién puede ver las fotos?",
          a: [
            "Cualquiera que tenga el enlace del concurso. El enlace usa un identificador largo e imposible de adivinar, así que solo lo encuentran las personas con quienes compartes el cartel o el código.",
          ],
        },
        {
          id: "photo-location",
          q: "¿Las fotos revelan dónde se tomaron?",
          a: [
            "No. Las fotos del teléfono llevan datos ocultos: la ubicación, la fecha y la hora, y la marca y el modelo del teléfono. Los quitamos todos de cada foto antes de guardarla, así que la foto de un platillo muestra el platillo y nada más.",
            "Lo que no podemos quitar es lo que aparece en la imagen, así que deja fuera de la foto los números de casa y las caras si eso te importa.",
          ],
        },
        {
          id: "tracking",
          q: "¿Hay anuncios o rastreo?",
          a: ["No hay anuncios ni rastreo que te siga. Usamos Cloudflare Web Analytics para contar las visitas a las páginas. No usa cookies ni crea un perfil tuyo."],
        },
        {
          id: "cook-data",
          q: "¿Qué guardan de quienes cocinan?",
          a: [
            "El nombre que quien organiza escribe para cada platillo, el nombre del platillo y su foto. Los invitados no ven el nombre de quien cocinó hasta el anuncio de ganadores. Si cocinaste y quieres que quitemos tu nombre o tu foto, pídeselo a quien organiza o escribe a privacy@cookoffchamps.com.",
          ],
        },
        {
          id: "judge-data",
          q: "¿Qué guardan de los jueces en un concurso profesional?",
          a: [
            "El nombre que quien organiza escribe para cada juez, y las calificaciones y los comentarios que da. Quien organiza puede descargarlos junto con los resultados. Quienes cocinaron pueden leer los comentarios sobre su propio platillo si quien organiza lo permite, sin el nombre del juez, y los resultados públicos nunca muestran los nombres de los jueces. Al borrar el concurso se borra todo.",
          ],
        },
        {
          id: "other-handlers",
          q: "¿Quién más maneja los datos?",
          a: [
            "Cloudflare hace funcionar la app, guarda los concursos y las fotos, y hace la verificación contra robots. Resend entrega los correos de acceso y de invitación. No vendemos los datos ni los compartimos con nadie más.",
          ],
        },
        {
          id: "who-runs-it",
          q: "¿Quién está detrás de Cookoff Champs?",
          a: [
            "Hosted in the Barn, desde una oficina en un granero en el campo de Texas. Empezó como la app para los concursos de cocina de nuestra propia familia. El código es abierto y está en GitHub.",
          ],
        },
      ],
    },
  ],
};
