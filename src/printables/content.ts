// Free holiday printables (SW-62): ballots and score sheets people print for their
// own contests. They're there to bring organizers in from search and from the
// paper itself, so every sheet carries a QR code to run the contest in the app,
// tagged ?ref= so the Worker can count it. Words live here, apart from the
// template; content-es.ts is the Spanish version, with the same sheet ids.

/** One printed page of a sheet. */
export type Part =
  /** Ballot slips for guests, six to a page, cut apart. Each line ends in a blank for an entry number. */
  | { kind: "slips"; heading: string; lines: string[] }
  /** A judge's score sheet: one row per entry, a column per criterion. */
  | { kind: "scores"; heading: string; scale: string; judge: string; entry: string; criteria: string[]; total: string }
  /** The organizer's tally: entries down the side, votes counted with tally marks. */
  | { kind: "tally"; heading: string; columns: string[] };

export interface Sheet {
  id: string;
  /** Where the page is published; the PDF is the same path with .pdf instead of the trailing slash. */
  path: string;
  /** The ?ref= the QR code carries, counted by the Worker. */
  ref: "pie" | "cookie" | "chili";
  /** The guide (SW-63) that goes with this sheet, in this language. */
  guidePath: string;
  title: string;
  description: string;
  intro: string;
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
    "Free printable ballots and score sheets for a Thanksgiving pie contest, a Christmas cookie contest and a chili cookoff. Letter-size PDFs.",
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
        { kind: "tally", heading: "Pie contest tally", columns: ["Pie #", "Pie", "Baker", "Votes", "Total"] },
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
      title: "Chili cookoff ballot and judging sheet",
      description:
        "A free printable chili cookoff ballot, a judging sheet for aroma, colour, consistency, taste and aftertaste, and a tally sheet. Letter-size PDF.",
      intro: "Guest ballots, a judge's sheet scored on the five things chili judges look for, and a tally sheet.",
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
          criteria: ["Aroma", "Colour", "Consistency", "Taste", "Aftertaste"],
          total: "Total",
        },
        { kind: "tally", heading: "Chili cookoff tally", columns: ["Chili #", "Chili", "Cook", "Votes", "Total"] },
      ],
    },
  ],
};
