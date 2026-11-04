// The privacy page (BIZ-38), from Counsel's draft B in review-2026-Q4. Words live
// here, apart from the page template; the Spanish version is below, with the same
// sections in the same order. Every fact was checked against the code, and the Q&A
// in src/help/ must say the same things: change both together.
// Until BIZ-1 forms the LLC the party is "Hosted in the Barn"; then name it here.
// Not legal advice.

export interface PrivacySection {
  id: string;
  title: string;
  body: string[];
}

export interface PrivacyContent {
  lang: string;
  langName: string;
  /** Where the page is published, e.g. "/privacy/". */
  path: string;
  title: string;
  /** The footer link's text. */
  linkText: string;
  description: string;
  /** Shown as "Last updated: …"; change it whenever the words change. */
  updatedLabel: string;
  updated: string;
  appHref: string;
  /** The Q&A, linked at the foot of the page. */
  helpLink: string;
  helpHref: string;
  partOf: string;
  sections: PrivacySection[];
}

/** The address for privacy questions and requests; it must be routed to a real inbox. */
export const PRIVACY_EMAIL = "privacy@cookoffchamps.com";

export const en: PrivacyContent = {
  lang: "en",
  langName: "English",
  path: "/privacy/",
  title: "Privacy at Cookoff Champs",
  linkText: "Privacy",
  description: "What Cookoff Champs keeps about organizers, cooks and guests, for how long, and who else handles it.",
  updatedLabel: "Last updated",
  updated: "2026-11-03",
  appHref: "/",
  helpLink: "Help and questions",
  helpHref: "/help/#privacy",
  partOf: "Part of",
  sections: [
    {
      id: "who",
      title: "Who we are",
      body: [`Cookoff Champs is run by Hosted in the Barn. Questions or requests: ${PRIVACY_EMAIL}.`],
    },
    {
      id: "what-we-keep",
      title: "What we keep",
      body: [
        "Organizers: your email address, your events and a login session.",
        "Co-organizers: the email address the organizer added, and the invite we send you.",
        "Cooks: the name, dish and photo the organizer enters.",
        "Guests: a random ID in a cookie, kept with your vote. No guest names or emails.",
        "IP addresses: only in a scrambled form (a keyed hash), to limit login emails and code guesses. It can't be turned back into the address without a secret key that only the app holds.",
      ],
    },
    {
      id: "photos",
      title: "Photos",
      body: ["We remove location, time and phone details from every photo before storing it. Anyone with the event link can see them."],
    },
    {
      id: "how-long",
      title: "How long",
      body: [
        "Login links: 15 minutes. Sessions: 30 days. Vote cookie: one year. Scrambled IP addresses: a day at most. Events, votes and photos: until the event's creator deletes it.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      body: [
        "Two, both needed for the app to work: one keeps you logged in, one remembers your vote. Your language choice is kept in your browser (localStorage). No advertising cookies, so there is no cookie banner.",
        "We count page visits with Cloudflare Web Analytics, which sets no cookies and builds no profile of you.",
      ],
    },
    {
      id: "others",
      title: "Who else handles it",
      body: [
        "Cloudflare (hosting, storage, anti-bot check, visit counts) and Resend (email). They process it for us, not for themselves. We don't sell data.",
        "We also read the analytics for our own social media accounts (Facebook, Instagram, YouTube and Pinterest) to see how our posts do. That's about our posts and holds nothing about the people who use the app.",
      ],
    },
    {
      id: "choices",
      title: "Your choices",
      body: [
        `Ask us to see, correct or delete what we hold about you: ${PRIVACY_EMAIL}. The creator of an event can delete it, and its photos and votes, at any time.`,
      ],
    },
    {
      id: "changes",
      title: "Changes",
      body: ["We'll date this page and note what changed."],
    },
  ],
};

export const es: PrivacyContent = {
  lang: "es",
  langName: "Español",
  path: "/es/privacidad/",
  title: "Privacidad en Cookoff Champs",
  linkText: "Privacidad",
  description: "Qué guarda Cookoff Champs de quien organiza, quien cocina y los invitados, por cuánto tiempo y quién más lo maneja.",
  updatedLabel: "Última actualización",
  updated: "2026-11-03",
  appHref: "/?lang=es",
  helpLink: "Ayuda y preguntas",
  helpHref: "/es/ayuda/#privacy",
  partOf: "Parte de",
  sections: [
    {
      id: "who",
      title: "Quiénes somos",
      body: [`Cookoff Champs está a cargo de Hosted in the Barn. Preguntas o solicitudes: ${PRIVACY_EMAIL}.`],
    },
    {
      id: "what-we-keep",
      title: "Qué guardamos",
      body: [
        "Quien organiza: tu correo, tus concursos y una sesión de acceso.",
        "Quien coorganiza: el correo que agregó quien organiza, y la invitación que te enviamos.",
        "Quien cocina: el nombre, el platillo y la foto que escribe quien organiza.",
        "Invitados: un identificador al azar en una cookie, guardado con tu voto. Sin nombres ni correos de invitados.",
        "Direcciones IP: solo de forma codificada (un hash con clave), para limitar los correos de acceso y los intentos de código. No se puede convertir de nuevo en la dirección sin una clave secreta que solo tiene la app.",
      ],
    },
    {
      id: "photos",
      title: "Fotos",
      body: ["Quitamos los datos de ubicación, hora y teléfono de cada foto antes de guardarla. Cualquiera que tenga el enlace del concurso puede verlas."],
    },
    {
      id: "how-long",
      title: "Por cuánto tiempo",
      body: [
        "Enlaces de acceso: 15 minutos. Sesiones: 30 días. Cookie del voto: un año. Direcciones IP codificadas: un día como máximo. Concursos, votos y fotos: hasta que quien creó el concurso lo borre.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      body: [
        "Dos, y las dos son necesarias para que la app funcione: una mantiene tu sesión abierta y otra recuerda tu voto. Tu elección de idioma se guarda en tu navegador (localStorage). No hay cookies de publicidad, así que no hay aviso de cookies.",
        "Contamos las visitas con Cloudflare Web Analytics, que no usa cookies ni crea un perfil tuyo.",
      ],
    },
    {
      id: "others",
      title: "Quién más lo maneja",
      body: [
        "Cloudflare (alojamiento, almacenamiento, verificación contra robots y conteo de visitas) y Resend (correo). Lo procesan por nosotros, no para sí mismos. No vendemos datos.",
        "También leemos las estadísticas de nuestras propias cuentas en redes sociales (Facebook, Instagram, YouTube y Pinterest) para ver cómo les va a nuestras publicaciones. Son datos sobre nuestras publicaciones y no incluyen nada sobre las personas que usan la app.",
      ],
    },
    {
      id: "choices",
      title: "Tus opciones",
      body: [
        `Pídenos ver, corregir o borrar lo que tenemos sobre ti: ${PRIVACY_EMAIL}. Quien creó un concurso puede borrarlo, junto con sus fotos y votos, cuando quiera.`,
      ],
    },
    {
      id: "changes",
      title: "Cambios",
      body: ["Pondremos fecha a esta página y anotaremos qué cambió."],
    },
  ],
};
