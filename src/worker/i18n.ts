// The organizer's emails in English or Spanish (SW-27). There are no accounts to
// hold a setting, so the app sends the language it's showing with each request
// that sends an email: a login link comes in the language it was asked for in,
// and an invite in the inviter's.

export type Lang = "en" | "es";

/** The language a request asked for; English unless it says Spanish. */
export function langOf(value: unknown): Lang {
  return value === "es" ? "es" : "en";
}

export interface LoginEmailText {
  subject: string;
  intro: string;
  footer: string;
}

export interface Invite {
  by: string;
  eventName: string;
}

const TEXT = {
  en: {
    subject: "Your Cookoff Champs login link",
    intro: "Here's your link to log in to Cookoff Champs.",
    inviteSubject: (i: Invite) => `You're helping run ${i.eventName}`,
    inviteIntro: (i: Invite) =>
      `${i.by} has made you a co-organizer of "${i.eventName}" on Cookoff Champs. This link logs you in and opens the event.`,
    footer: "The link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.",
  },
  es: {
    subject: "Tu enlace para entrar a Cookoff Champs",
    intro: "Aquí está tu enlace para entrar a Cookoff Champs.",
    inviteSubject: (i: Invite) => `Te invitaron a organizar ${i.eventName}`,
    inviteIntro: (i: Invite) =>
      `${i.by} te agregó al equipo organizador de "${i.eventName}" en Cookoff Champs. Este enlace te da acceso y abre el concurso.`,
    footer: "El enlace funciona una sola vez y vence en 15 minutos. Si no lo pediste, ignora este correo.",
  },
};

/** The login email's words; with `invite`, the co-organizer invitation instead. */
export function loginEmail(lang: Lang, invite?: Invite): LoginEmailText {
  const t = TEXT[lang];
  return invite
    ? { subject: t.inviteSubject(invite), intro: t.inviteIntro(invite), footer: t.footer }
    : { subject: t.subject, intro: t.intro, footer: t.footer };
}

/** The organizer's results export (SW-25): its column headings. */
export const EXPORT_HEADINGS: Record<Lang, { fixed: string[]; judgeScore: string; comment: string }> = {
  en: {
    fixed: ["Category", "Ticket", "Cook", "Dish", "Place", "Final score", "Judges counted", "People's Choice votes", "Judge"],
    judgeScore: "Judge's score",
    comment: "Comment",
  },
  es: {
    fixed: ["Categoría", "Boleto", "Cocinero", "Platillo", "Lugar", "Calificación final", "Jueces contados", "Votos del público", "Juez"],
    judgeScore: "Calificación del juez",
    comment: "Comentario",
  },
};
