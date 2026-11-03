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
  partOf: "Parte de",
  privacyLink: "Privacidad",
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
            "Solo de forma codificada y solo por poco tiempo: un día para los correos de acceso y diez minutos para los códigos escritos. Los usamos para evitar que una misma dirección envíe muchos correos de acceso o pruebe muchos códigos. Después se borran.",
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
