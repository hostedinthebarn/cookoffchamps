// Holiday search pages (SW-63): one guide per thing people search for. Each holds
// real advice, links to its printable (SW-62) and ends by pointing at the app.
// Words live here, apart from the template; content-es.ts is the Spanish version
// with the same guide ids, in the same order. Draft wording: Gary approves it
// before deploy.

/** A paragraph, or a bulleted list. */
export type Block = string | { list: string[] };

export interface Step {
  name: string;
  text: string;
}

export interface GuideSection {
  id: string;
  heading: string;
  body: Block[];
}

export interface Guide {
  id: string;
  /** Where the page is published. */
  path: string;
  /** The printable (src/printables) this guide links to, by sheet id. */
  printableId: string;
  title: string;
  description: string;
  intro: string;
  /** The HowTo in the structured data, and a numbered list on the page. */
  stepsTitle: string;
  steps: Step[];
  sections: GuideSection[];
  faq: { q: string; a: string }[];
}

export interface GuidesContent {
  lang: string;
  langName: string;
  /** The app's address in this language. */
  appHref: string;
  printableTitle: string;
  /** Link text for the printable's page, and for its PDF. */
  printablePage: string;
  printablePdf: string;
  faqTitle: string;
  moreGuides: string;
  /** The closing call to action. */
  runItTitle: string;
  runItText: string;
  runItButton: string;
  partOf: string;
  guides: Guide[];
}

export const en: GuidesContent = {
  lang: "en",
  langName: "English",
  appHref: "/",
  printableTitle: "Free printable",
  printablePage: "Open the printable",
  printablePdf: "Download the PDF",
  faqTitle: "Questions people ask",
  moreGuides: "More guides",
  runItTitle: "Run it in the app",
  runItText:
    "Cookoff Champs is free for family and friends. Set up your event, add each entry, print the QR poster and let guests vote on their phones, blind. When you are ready, the reveal shows third, second and then first place, one click at a time.",
  runItButton: "Run your own cookoff, free",
  partOf: "Part of",
  guides: [
    {
      id: "pie",
      path: "/guides/thanksgiving-pie-contest/",
      printableId: "pie",
      title: "How to run a Thanksgiving pie contest",
      description:
        "A simple way to run a Thanksgiving pie contest: pick categories, number the pies, vote blind, break ties fairly and make room for the kids. Free printable ballot.",
      intro:
        "A pie contest is the easiest dessert tradition to start. Everyone was going to eat pie anyway. These are the choices that make it feel fair, and keep it friendly.",
      stepsTitle: "The short version",
      steps: [
        { name: "Pick the categories", text: "Decide what can win: best overall, best crust, most creative, and a kids' prize if children are baking." },
        { name: "Collect the pies", text: "Ask bakers to arrive early. Write down who brought what, then keep that list out of sight." },
        { name: "Number every pie", text: "Put a number card beside each pie, and nothing else. Guests vote for a number, not for a person." },
        { name: "Let everyone taste and vote", text: "Give each guest one ballot, or one vote per category, and a few minutes to taste. Cut small slices." },
        { name: "Count the votes", text: "Add up the ballots, or let the app do it. Check for ties before you announce anything." },
        { name: "Announce the winners", text: "Read third, second and then first, and only then say whose pie it was." },
      ],
      sections: [
        {
          id: "categories",
          heading: "Choosing categories",
          body: [
            "One prize is fine for a small family table. Once there are more than six or so pies, a few categories give more bakers something to win.",
            { list: ["Best overall: the headline prize.", "Best crust: for the bakers who made their own.", "Most creative: for the pie nobody expected.", "Best traditional: pumpkin, pecan and apple deserve their own shelf."] },
            "Keep it to three or four. More than that and every pie wins something, which is kind but dilutes the fun.",
          ],
        },
        {
          id: "blind",
          heading: "Voting blind",
          body: [
            "The pie contest is only fair if guests cannot tell who baked what. Put the pies on a table with numbered cards, keep the baker list with one person, and ask bakers not to hover.",
            "Pies that are obviously someone's, like the one in grandmother's dish, are hard to hide. Move them to plain plates, or accept it and let those votes ride.",
            "Ask guests not to vote for their own pie. In a small group that is an honour-system rule, and it works better than you would expect.",
          ],
        },
        {
          id: "ties",
          heading: "Breaking ties",
          body: [
            "Decide how ties are settled before the votes are in, so nobody feels the rules changed.",
            { list: ["Co-champions: the simplest answer, and nobody argues.", "A re-taste: tied pies only, and a show of hands.", "A judge's call: one neutral person, who did not enter, chooses."] },
          ],
        },
        {
          id: "kids",
          heading: "Kids' entries",
          body: [
            "Children baking alongside the adults is the best part of the day, and a head-to-head against a 30-year pecan recipe is not always kind.",
            { list: ["Give the kids their own category, with its own prize.", "Let a child's pie also compete overall if they want to, but make it their choice.", "Let young children vote too: a sticker on a numbered card is enough for those who cannot write yet."] },
          ],
        },
        {
          id: "logistics",
          heading: "Practical details",
          body: [
            { list: ["Cut slices small. A pie cut into sixteen lets guests try all of them.", "Label allergens on the number card where you can: nuts, dairy, gluten.", "Keep plates, forks and napkins by the table, and a jug of water for between tastes.", "Allow about 20 minutes for tasting, so the voting does not get rushed."] },
          ],
        },
      ],
      faq: [
        { q: "How many pies do I need for a contest?", a: "Three is enough to make it a contest. Around eight to twelve is the practical maximum for guests to taste them all without getting full." },
        { q: "Should the pies be judged or voted on?", a: "For a family gathering, let all guests vote. It is more fun, and you do not need to find judges. For a larger or more serious event, a small panel of three judges, with a guests' prize on top, works well." },
        { q: "How do we stop people voting for their own pie?", a: "Ask them not to, and number the pies so most people do not know which is theirs. If the group is small, it is an honour system." },
        { q: "What if two pies tie?", a: "Call them co-champions, or taste only the tied pies again and vote by show of hands. Agree on the method before voting." },
      ],
    },
    {
      id: "cookie",
      path: "/guides/christmas-cookie-contest/",
      printableId: "cookie",
      title: "How to run a Christmas cookie contest",
      description:
        "How to run a Christmas cookie contest: set the rules, score taste, texture and looks, break ties and include the kids. Free printable score sheet.",
      intro:
        "A cookie contest works for a party, an office or a church hall. The trick is setting the rules early, and keeping the tasting short enough that people can still stand up.",
      stepsTitle: "The short version",
      steps: [
        { name: "Set the rules", text: "Decide how many cookies each baker brings, whether they must be homemade, and whether the recipe has to be a secret." },
        { name: "Choose how to judge", text: "Either guests vote, or a few judges score. Many contests do both: a judges' prize and a people's choice." },
        { name: "Plate and number", text: "Put a few of each cookie on a plain plate with a number. Hide the baker list." },
        { name: "Score or vote", text: "Judges score each plate before moving on. Guests mark their favorite on a ballot." },
        { name: "Add it up and break ties", text: "Total each row on the score sheet. If two cookies tie, use the tie-break you agreed on beforehand." },
        { name: "Announce and share", text: "Announce the winners, then let everyone eat what is left." },
      ],
      sections: [
        {
          id: "rules",
          heading: "Rules worth setting early",
          body: [
            { list: ["Quantity: a dozen is plenty, and enough for every judge to taste one.", "Homemade only, or bought dough decorated at home: decide which and say so on the invitation.", "Allergens: ask for a note on nuts, dairy and gluten, and put it on the plate.", "One entry per baker keeps the table to a size people can taste."] },
          ],
        },
        {
          id: "categories",
          heading: "Categories",
          body: [
            "A cookie swap table has lots of kinds. Categories stop sugar cookies from competing against gingerbread.",
            { list: ["Best classic: sugar cookies, snickerdoodles, shortbread.", "Best decorated: icing and sprinkles.", "Most creative: the one that surprises.", "Best chocolate: because there will be several."] },
          ],
        },
        {
          id: "judging",
          heading: "Blind judging and a score sheet",
          body: [
            "Judges should not know who baked what. Number the plates and keep the list with the organizer.",
            "A simple score sheet works well. Score each cookie from 1 to 5 on taste, texture, looks and holiday spirit, then add the row. Taste can count double if you want flavor to matter most.",
            "Ask judges to score each plate before talking about it. Once one person says \"wow\", everyone's score drifts up.",
          ],
        },
        {
          id: "ties",
          heading: "Breaking ties",
          body: [
            "Agree on the method before the scores come in.",
            { list: ["Highest taste score wins: the simplest tie-break and the one most people accept.", "A re-taste of the tied cookies by the judges, with a show of hands.", "Co-champions, with two prizes.", "Let the people's choice vote decide between the tied cookies."] },
          ],
        },
        {
          id: "kids",
          heading: "Kids' entries",
          body: [
            "Cookie baking is the one contest where children can truly compete, and often win on looks.",
            { list: ["Give the kids their own category, with its own prize.", "Let them decorate: a plain cookie with icing and sprinkles is an entry.", "Make a children's panel of judges for the kids' category, if you have enough older children.", "Give every child entrant a ribbon or a sticker, win or not."] },
          ],
        },
      ],
      faq: [
        { q: "How many cookies does each baker need to bring?", a: "A dozen is enough for most contests. Judges need one each, and guests need a taste for the people's choice vote." },
        { q: "Should we have judges or let guests vote?", a: "Both works well. A small group of judges with score sheets picks the best cookie, and a guests' vote picks the favorite." },
        { q: "What should the judges score?", a: "Taste, texture, looks and holiday spirit, each from 1 to 5, is a simple set that is easy to explain. The printable score sheet uses it." },
        { q: "How do we keep it fair for allergies?", a: "Ask bakers to label nuts, dairy and gluten, and put the label on the plate. Judges with allergies can skip a plate and score the rest." },
      ],
    },
    {
      id: "chili",
      path: "/guides/judge-a-chili-cookoff/",
      printableId: "chili",
      title: "How to judge a chili cookoff",
      description:
        "How to judge a chili cookoff: score aroma, colour, consistency, taste and aftertaste, taste blind, break ties and include kids' entries. Free printable judging sheet.",
      intro:
        "Chili judging has a long tradition, and a few rules make it fair. Here is a simple way to run it at a church supper, an office or a backyard.",
      stepsTitle: "The short version",
      steps: [
        { name: "Set up the cups", text: "Serve each chili in identical numbered cups, so nobody can tell whose is whose." },
        { name: "Brief the judges", text: "Explain the five scores and what a 1 and a 5 mean. Give each judge a sheet and a pencil." },
        { name: "Taste in order", text: "Judges taste the chilis one at a time and score each straight away, with water or plain crackers between." },
        { name: "Let guests vote", text: "Guests get a ballot for the people's choice, so everyone has a say." },
        { name: "Total the scores", text: "Add the scores for each chili across all judges, and check for ties." },
        { name: "Announce the winners", text: "Name third, second and first, then reveal whose chili it was." },
      ],
      sections: [
        {
          id: "criteria",
          heading: "What judges score",
          body: [
            "Many cookoffs judge on five things. Score each from 1 to 5, or from 1 to 10 if you want more room.",
            { list: ["Aroma: does it smell inviting before the first spoonful?", "Colour: a rich, appetising colour, not grey or watery.", "Consistency: not soup, not paste.", "Taste: the main score, the balance of spice, salt, heat and depth.", "Aftertaste: what is left a moment later, good or not."] },
            "Official cookoffs use their own scoring rules, so if you plan to enter a sanctioned event, check theirs. At home, any consistent scale is fine.",
          ],
        },
        {
          id: "blind",
          heading: "Blind tasting",
          body: [
            "Judging is only fair if the judges do not know whose chili they are tasting. Number the cups, keep the cook list with the organizer, and have cooks keep clear of the judges' table.",
            "Judges should taste in the same order, with water and plain crackers or bread between cups. Heat builds up, so a mild chili tasted last is at a disadvantage. If you can, shuffle the order for each judge.",
          ],
        },
        {
          id: "ties",
          heading: "Breaking ties",
          body: [
            "Decide ahead of time. The common choices:",
            { list: ["Highest taste score wins.", "Judges re-taste the tied chilis and vote by show of hands.", "Co-champions."] },
          ],
        },
        {
          id: "people",
          heading: "Judges and the people's choice",
          body: [
            "Three judges is a good panel. Five is better, because one unusual palate matters less. Pick people who like chili and are not entering.",
            "A people's choice vote costs nothing, and gives the guests a say. Keep it as a separate prize from the judges' winner.",
          ],
        },
        {
          id: "kids",
          heading: "Kids' entries",
          body: [
            { list: ["A kids' category, with a mild chili, keeps heat out of the comparison.", "Young tasters can vote in the people's choice with a sticker.", "Offer a mild option and a clearly labelled hot one, so no child gets a surprise."] },
          ],
        },
      ],
      faq: [
        { q: "What do chili judges look for?", a: "Most scoring sheets use aroma, colour, consistency, taste and aftertaste. Taste usually counts the most." },
        { q: "How many chilis can a judge taste?", a: "Around eight to ten before palates tire. With more, split the entries into rounds, with the top few from each round in a final." },
        { q: "How do you keep chili judging blind?", a: "Number identical cups, keep the cook list out of sight, and keep cooks away from the judges." },
        { q: "How should we settle a tie?", a: "Agree on the method beforehand. The highest taste score is the usual tie-break; a re-taste is the next." },
      ],
    },
  ],
};
