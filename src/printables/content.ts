// Free holiday printables (SW-62): ballots and score sheets people print for their
// own contests. They're there to bring organizers in from search and from the
// paper itself, so every sheet carries a QR code to run the contest in the app,
// tagged ?ref= so the Worker can count it. Words live here, apart from the
// template; content-es.ts is the Spanish version, with the same sheet ids.

/** Under every tally sheet (SW-92): paper counts join the phone votes in the app. */
const TALLY_NOTE = "Also letting guests vote on phones in the app? Count these up and add them in the app under Paper votes. One way per guest: scan or take a paper ballot.";

/** One printed page of a sheet. */
export type Part =
  /** Ballot slips for guests, six to a page, cut apart. Each line ends in a blank for an entry number. */
  | { kind: "slips"; heading: string; lines: string[] }
  /** A judge's score sheet: one row per entry, a column per criterion. */
  | { kind: "scores"; heading: string; scale: string; judge: string; entry: string; criteria: string[]; total: string }
  /** The organizer's tally: entries down the side, votes counted with tally marks. */
  | { kind: "tally"; heading: string; columns: string[]; note: string };

/** An extra headed block on a sheet's page, under the download button: what is in the PDF, or where else to go. */
export interface Section {
  heading: string;
  text: string;
  /** Where the link goes: this sheet's PDF, or the app. */
  to: "pdf" | "app";
  linkText: string;
}

export interface Sheet {
  id: string;
  /** Where the page is published; the PDF is the same path with .pdf instead of the trailing slash. */
  path: string;
  /** The ?ref= the QR code carries, counted by the Worker. */
  ref: string;
  /** The guide (SW-63) that goes with this sheet, in this language. */
  guidePath: string;
  title: string;
  /** The page's H1, when it differs from the title. */
  h1?: string;
  description: string;
  intro: string;
  /** Headed blocks between the download button and the tips. */
  sections?: Section[];
  tips: string[];
  parts: Part[];
}

export interface PrintablesContent {
  lang: string;
  langName: string;
  /** The index page. */
  path: string;
  title: string;
  description: string;
  intro: string;
  /** The app's address in this language. */
  appHref: string;
  downloadPdf: string;
  orPrint: string;
  tipsTitle: string;
  /** Link text from a sheet to its guide. */
  guideLink: string;
  allPrintables: string;
  /** Printed at the foot of every page, beside the QR code. */
  skipThePaper: string;
  runItFree: string;
  backToApp: string;
  partOf: string;
  sheets: Sheet[];
}

export const en: PrintablesContent = {
  lang: "en",
  langName: "English",
  path: "/printables/",
  title: "Free cookoff printables",
  description:
    "Free printable ballots and score sheets for a Thanksgiving pie contest, a Christmas cookie contest, a chili cookoff and a backyard BBQ cookoff. Letter-size PDFs.",
  intro: "Ballots, score sheets and tally sheets for your next contest. Free to print and share, no sign-up.",
  appHref: "/",
  downloadPdf: "Download the PDF",
  orPrint: "Or print this page straight from your browser.",
  tipsTitle: "Tips for the day",
  guideLink: "Read the guide",
  allPrintables: "All printables",
  skipThePaper: "Skip the paper: guests vote on their phones and the app counts.",
  runItFree: "Run your own cookoff, free at cookoffchamps.com",
  backToApp: "Go to Cookoff Champs",
  partOf: "Part of",
  sheets: [
    {
      id: "pie",
      path: "/printables/pie-contest-ballot/",
      ref: "pie",
      guidePath: "/guides/thanksgiving-pie-contest/",
      title: "Pie contest ballot",
      description:
        "A free printable pie contest ballot for Thanksgiving, six to a page, with a tally sheet for counting the votes. Letter-size PDF.",
      intro: "Six ballots to a page, plus a tally sheet. Number each pie, hand out the ballots, and count up at the end.",
      tips: [
        "Put a number card beside each pie instead of the baker's name, so people vote for the pie and not for their favorite aunt.",
        "One ballot per guest. Print a few spares for late arrivals.",
        "Ties happen. Call them co-champions, or have the tied pies tasted again.",
      ],
      parts: [
        { kind: "slips", heading: "Pie contest ballot", lines: ["Best pie overall", "Best crust", "Most creative"] },
        { kind: "tally", heading: "Pie contest tally", columns: ["Pie #", "Pie", "Baker", "Votes", "Total"], note: TALLY_NOTE },
      ],
    },
    {
      id: "cookie",
      path: "/printables/cookie-contest-score-sheet/",
      ref: "cookie",
      guidePath: "/guides/christmas-cookie-contest/",
      title: "Cookie contest score sheet",
      description:
        "A free printable Christmas cookie contest score sheet: judges score taste, texture, looks and holiday spirit. Includes guest ballots. Letter-size PDF.",
      intro: "A score sheet for each judge, plus people's-choice ballots for everyone else.",
      tips: [
        "Give each judge their own sheet, and have them score before they talk it over.",
        "A plate of each cookie per judge keeps it fair: nobody gets the broken one.",
        "Add up each row, and the highest total wins. Keep the people's choice separate, so guests have a prize to vote for too.",
      ],
      parts: [
        {
          kind: "scores",
          heading: "Cookie contest score sheet",
          scale: "Score each from 1 (not for me) to 5 (outstanding).",
          judge: "Judge",
          entry: "Cookie #",
          criteria: ["Taste", "Texture", "Looks", "Holiday spirit"],
          total: "Total",
        },
        { kind: "slips", heading: "People's choice cookie", lines: ["My favorite cookie"] },
      ],
    },
    {
      id: "chili",
      path: "/printables/chili-cookoff-ballot/",
      ref: "chili",
      guidePath: "/guides/judge-a-chili-cookoff/",
      title: "Free Chili Cook-Off Ballot and Judging Sheet (PDF)",
      h1: "Free printable chili cook-off ballot and judging sheet",
      description:
        "Print a free chili cook-off ballot and judging sheet, both in one PDF, or let guests vote on their phones. Free from Cookoff Champs.",
      intro:
        "One free PDF for a chili cook-off: ballots for the guests, a judging sheet for the judges and a tally sheet to count the votes.",
      sections: [
        {
          heading: "Chili cook-off ballot",
          text: "Six guest ballots to a page, cut apart. Each guest writes the number of the best chili and the best heat. They're in the PDF.",
          to: "pdf",
          linkText: "Download the PDF",
        },
        {
          heading: "Printable chili judging sheet",
          text: "One row per chili, scored from 1 to 10 on aroma, color, consistency, taste and aftertaste. It's in the same PDF as the ballots.",
          to: "pdf",
          linkText: "Download the PDF",
        },
        {
          heading: "Rather vote on phones? Run it free on Cookoff Champs",
          text: "Skip the paper: guests vote on their phones and the app counts.",
          to: "app",
          linkText: "Go to Cookoff Champs",
        },
      ],
      tips: [
        "Serve every chili in identical numbered cups, so nobody can tell whose is whose.",
        "Have water, plain crackers or bread out for between tastes.",
        "Judges score each chili before moving on, rather than going back and forth.",
      ],
      parts: [
        { kind: "slips", heading: "Chili cookoff ballot", lines: ["Best chili", "Best heat"] },
        {
          kind: "scores",
          heading: "Chili judging sheet",
          scale: "Score each from 1 (poor) to 10 (excellent).",
          judge: "Judge",
          entry: "Chili #",
          criteria: ["Aroma", "Color", "Consistency", "Taste", "Aftertaste"],
          total: "Total",
        },
        { kind: "tally", heading: "Chili cookoff tally", columns: ["Chili #", "Chili", "Cook", "Votes", "Total"], note: TALLY_NOTE },
      ],
    },
    {
      id: "bbq",
      path: "/printables/bbq-cookoff-judging-sheet/",
      ref: "bbq",
      guidePath: "/guides/backyard-bbq-cookoff/",
      title: "Free BBQ Cook-Off Judging Sheet and Ballot (PDF)",
      h1: "Free printable BBQ cook-off judging sheet and ballot",
      description:
        "Print a free BBQ cook-off judging sheet (taste, tenderness, appearance), a people's-choice ballot and a tally sheet, in one PDF. Letter-size.",
      intro:
        "One free PDF for a backyard BBQ cook-off: a judging sheet for the judges, people's-choice ballots for the guests and a tally sheet to count the votes.",
      sections: [
        {
          heading: "Printable BBQ judging sheet",
          text: "One row per entry, scored from 1 to 10 on taste, tenderness and appearance. Taste counts double and tenderness one and a half times, the same weights as the BBQ preset in the app. It's a friendly backyard format, not an official KCBS score card.",
          to: "pdf",
          linkText: "Download the PDF",
        },
        {
          heading: "People's-choice ballot and tally",
          text: "Six guest ballots to a page, cut apart, and a tally sheet for counting. They're in the same PDF as the judging sheet.",
          to: "pdf",
          linkText: "Download the PDF",
        },
        {
          heading: "Rather vote on phones? Run it free on Cookoff Champs",
          text: "Skip the paper: guests vote on their phones and the app counts.",
          to: "app",
          linkText: "Go to Cookoff Champs",
        },
      ],
      tips: [
        "Number every entry and keep the cook list out of sight, so judges and guests score the barbecue and not the cook.",
        "Judge one meat at a time (ribs, brisket, chicken, pork) so scores aren't compared across different cuts.",
        "Multiply each score by its weight, then add the row. The highest total wins. Keep the people's choice separate, so guests have a prize to vote for too.",
      ],
      parts: [
        {
          kind: "scores",
          heading: "BBQ judging sheet",
          scale: "Score each from 1 (poor) to 10 (excellent). Taste counts ×2, tenderness ×1.5, appearance ×1.",
          judge: "Judge",
          entry: "Entry #",
          criteria: ["Taste (×2)", "Tenderness (×1.5)", "Appearance (×1)"],
          total: "Weighted total",
        },
        { kind: "slips", heading: "People's choice BBQ", lines: ["My favorite BBQ"] },
        { kind: "tally", heading: "BBQ cookoff tally", columns: ["Entry #", "Dish", "Cook", "Votes", "Total"], note: TALLY_NOTE },
      ],
    },
  ],
};
