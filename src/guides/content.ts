// Holiday search pages (SW-63): one guide per thing people search for. Each holds
// real advice, links to its printable (SW-62) and ends by pointing at the app.
// Words live here, apart from the template; content-es.ts is the Spanish version
// with the same guide ids, in the same order. Draft wording: Gary approves it
// before deploy.

/** A paragraph, or a bulleted list. */
export type Block = string | { list: string[] } | { parts: (string | { text: string; href: string })[] };

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
  /** A credit line shown under the questions, for a guide built on someone else's recipe. */
  credit?: string;
  /** Replaces the shared closing text, when this guide has its own. */
  runItText?: string;
  /** Links to story pages (SW-124) about this guide's subject, shown under the guide. */
  stories?: { lead: string; text: string; href: string }[];
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
            "Ask guests not to vote for their own pie. In a small group that is an honor-system rule, and it works better than you would expect.",
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
        { q: "How do we stop people voting for their own pie?", a: "Ask them not to, and number the pies so most people do not know which is theirs. If the group is small, it is an honor system." },
        { q: "What if two pies tie?", a: "Call them co-champions, or taste only the tied pies again and vote by show of hands. Agree on the method before voting." },
      ],
    },
    {
      id: "cookie",
      path: "/guides/christmas-cookie-contest/",
      printableId: "cookie",
      stories: [{ lead: "The story behind the cookie", text: "Where do Christmas cookies come from?", href: "/stories/christmas-cookie-history/" }],
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
            { parts: ["Decorating with children? ", { text: "Sugar cookies for a kids' decorating contest", href: "/guides/sugar-cookies-for-decorating/" }, " has a cookie, an icing and a way to run the table."] },
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
      id: "sugar-cookies",
      path: "/guides/sugar-cookies-for-decorating/",
      printableId: "cookie",
      title: "Sugar cookies for a kids' decorating contest",
      description:
        "A plain roll-out cookie that holds its shape when cut, a simple icing, and how to run a kids' decorating contest with a ribbon for every child.",
      intro:
        "A decorating contest needs a cookie that stays the shape it was cut. A star that melts into a blob gives a seven-year-old nothing to work with. The base here is King Arthur Baking's holiday butter cookie, a plain dough with no baking powder, which the recipe page says barely spreads in the oven. The recipe is King Arthur's, and we have copied the ingredients as they print them. Below it is a simple icing from the same page, then how we would run the contest: a category of its own for the kids, and a ribbon for every child.",
      stepsTitle: "The short version",
      steps: [
        { name: "Mix the dough", text: "Beat the sugar, butter, egg yolk, salt and flavoring until smooth, then stir in the flour." },
        { name: "Chill it", text: "Split the dough in two, flatten each half into a disk and chill for 2 hours or overnight." },
        { name: "Roll and cut", text: "Heat the oven to 350°F. Let a disk soften for 20 to 30 minutes, roll it between 1/8 and 3/16 inch thick and cut your shapes." },
        { name: "Bake and cool", text: "Bake for 12 to 14 minutes, until set and barely brown at the edges, then cool on the pan." },
        { name: "Make the icing", text: "Stir confectioners' sugar, milk and light corn syrup together, divide it into bowls and tint each one." },
        { name: "Let the kids decorate", text: "Give each child a few cooled cookies, the icing and the sugars, then judge the plates with the score sheet." },
      ],
      sections: [
        {
          id: "cookies",
          heading: "Make the cookies",
          body: [
            { parts: ["Source: King Arthur Baking, ", { text: "Holiday butter cookies", href: "https://www.kingarthurbaking.com/recipes/holiday-butter-cookies-recipe" }, ". It makes about 5 dozen 2-inch cookies, which is plenty for a table of children. Plan on about 2 hours 42 minutes in all, most of it chilling."] },
            "Ingredients for the cookies, as King Arthur lists them:",
            {
              list: [
                "1 1/4 cups (142g) confectioners' sugar",
                "18 tablespoons (255g) salted butter, at room temperature",
                "1 large egg yolk",
                "1/2 teaspoon table salt",
                "1/4 teaspoon King Arthur Fiori di Sicilia, or a flavor of your choice",
                "2 3/4 cups (330g) King Arthur Unbleached All-Purpose Flour",
              ],
            },
            "King Arthur's own notes: with unsalted butter, use 1 teaspoon of salt. In place of the Fiori di Sicilia you can use 2 teaspoons of vanilla extract, 1 teaspoon of almond extract, or both. Almond extract adds almonds to the allergen label below.",
            "Beat the sugar, butter, egg yolk, salt and flavoring together until smooth. Stir in the flour. If the dough won't come together, add a tablespoon of water. Split it in two, flatten each half into a disk, and chill them for 2 hours or overnight.",
            "Heat the oven to 350°F. Let a disk sit out for 20 to 30 minutes, until it rolls but is still cold. Roll it between 1/8 and 3/16 inch thick, cut your shapes, and gather the scraps to roll again. Bake on ungreased or parchment-lined sheets for 12 to 14 minutes, until the cookies are set and barely brown at the edges. Cool them on the pan. Wait until they are completely cool before anyone ices one.",
            "Please keep the children out of the raw dough. It has a raw egg yolk and raw flour in it, and both are a reason to wait for the oven.",
          ],
        },
        {
          id: "icing",
          heading: "Make the icing",
          body: [
            "Source: the icing printed on the same King Arthur page.",
            "Ingredients for the icing:",
            {
              list: [
                "2 1/4 cups (255g) confectioners' sugar",
                "2 1/2 to 3 tablespoons (35g to 43g) milk",
                "2 tablespoons (39g) light corn syrup",
                "Natural food coloring, optional",
                "1 cup (227g) coarse sparkling sugar or colored sugars, for decorating, optional",
              ],
            },
            "Stir the sugar, 2 1/2 tablespoons of milk and the corn syrup together. If it is stiff, add milk a teaspoon at a time. Try it on one cookie first, and add milk or sugar until it spreads the way you like. Divide it into small bowls and tint each one. Sprinkle sugar on while the icing is still wet, because it won't stick once the icing sets.",
          ],
        },
        {
          id: "contest",
          heading: "Run the decorating contest",
          body: [
            "Give the kids their own category with its own prize, apart from the grown-up bakers. A plain cookie with icing and sprinkles is a full entry, so a child doesn't need to bake anything. Put the cooled cookies, the icing bowls and the sugars on a table, and give each child 3 or 4 cookies to work on.",
            "If there are enough older children, let them judge the kids' category as a panel. Every child who enters gets a ribbon or a sticker, win or not. That is the part they remember. The prize is for one cookie, and the ribbon is for all of them.",
            { parts: ["Number the finished plates and score them with the printable cookie score sheet, the same way you would judge the adults' cookies. The full rules, the categories, how to break a tie and how to judge blind are in our free guide, ", { text: "How to run a Christmas cookie contest", href: "/guides/christmas-cookie-contest/" }, ", and the sheet is the ", { text: "cookie contest score sheet", href: "/printables/cookie-contest-score-sheet/" }, "."] },
          ],
        },
        {
          id: "labels",
          heading: "Label the plates",
          body: [
            "Ask everyone to label nuts, dairy and gluten, and put the label on the plate. This recipe has wheat (flour), dairy (butter, and milk in the icing) and eggs (the yolk), and nuts too if you use the almond extract. Our guide's usual line covers nuts, dairy and gluten; we added eggs because the dough has one. King Arthur's page carries no allergen statement, so this list comes from the ingredients above.",
          ],
        },
      ],
      faq: [
        { q: "Can the kids eat the dough?", a: "No. It has raw egg yolk and raw flour. Wait for the baked cookie." },
        { q: "Does it have to be this recipe?", a: "No. A plain cookie with icing and sprinkles is an entry, so store-bought dough works too. This recipe is one that King Arthur says holds its shape." },
        { q: "How many cookies does it make?", a: "King Arthur says about 5 dozen at 2 inches." },
      ],
      credit: "Recipe: King Arthur Baking, Holiday butter cookies. We have no connection to King Arthur Baking.",
      runItText: "Run the whole contest in the Cookoff Champs app: guests vote on their phones, free, without seeing who baked what.",
    },
    {
      id: "chili",
      path: "/guides/judge-a-chili-cookoff/",
      printableId: "chili",
      title: "How to judge a chili cookoff",
      description:
        "How to judge a chili cookoff: score aroma, color, consistency, taste and aftertaste, taste blind, break ties and include kids' entries. Free printable judging sheet.",
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
            { list: ["Aroma: does it smell inviting before the first spoonful?", "Color: a rich, appetizing color, not gray or watery.", "Consistency: not soup, not paste.", "Taste: the main score, the balance of spice, salt, heat and depth.", "Aftertaste: what is left a moment later, good or not."] },
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
            { list: ["A kids' category, with a mild chili, keeps heat out of the comparison.", "Young tasters can vote in the people's choice with a sticker.", "Offer a mild option and a clearly labeled hot one, so no child gets a surprise."] },
          ],
        },
      ],
      faq: [
        { q: "What do chili judges look for?", a: "Most scoring sheets use aroma, color, consistency, taste and aftertaste. Taste usually counts the most." },
        { q: "How many chilis can a judge taste?", a: "Around eight to ten before palates tire. With more, split the entries into rounds, with the top few from each round in a final." },
        { q: "How do you keep chili judging blind?", a: "Number identical cups, keep the cook list out of sight, and keep cooks away from the judges." },
        { q: "How should we settle a tie?", a: "Agree on the method beforehand. The highest taste score is the usual tie-break; a re-taste is the next." },
      ],
    },
    {
      id: "bbq",
      path: "/guides/backyard-bbq-cookoff/",
      printableId: "bbq",
      title: "How to run a backyard BBQ cook-off",
      description:
        "How to run a backyard BBQ cook-off: pick meat categories, use blind turn-in boxes, judge taste, tenderness and appearance, break ties and stay food-safe. Free printable judging sheet.",
      intro:
        "A backyard BBQ cook-off needs more planning than a pie contest, because the food is hot, it takes hours and everyone's meat is ready at once. A few rules set early keep it fair, keep it safe and keep it fun. This is a friendly format for a yard or a church lot, not a sanctioned KCBS contest, which has its own rules and trained judges.",
      stepsTitle: "The short version",
      steps: [
        { name: "Pick the categories", text: "Choose the meats that can win: ribs, brisket, chicken, pork, or whatever your cooks are good at." },
        { name: "Set a turn-in time", text: "Every cook hands in their entry at the same time, so the food is judged at the same temperature." },
        { name: "Use blind turn-in boxes", text: "A helper puts each entry in a plain box with a number, and keeps the cook list out of sight." },
        { name: "Judge one meat at a time", text: "Judges score taste, tenderness and appearance for each entry before moving on." },
        { name: "Let guests vote too", text: "Guests taste the leftovers from numbered trays and mark a people's-choice ballot, or vote on their phones." },
        { name: "Add it up and announce", text: "Weight the scores, check for ties, and read third, second and then first before saying whose it was." },
      ],
      sections: [
        {
          id: "categories",
          heading: "Choosing meat categories",
          body: [
            "Brisket and chicken don't compare, so judge each meat on its own. Pick the ones your cooks actually make.",
            { list: ["Ribs: the crowd favorite, and the easiest to enter.", "Brisket: long cook, big prize.", "Chicken: thighs are forgiving, and it is the cheapest entry.", "Pork: pulled pork or pork shoulder.", "A sauce or side category, if you want more cooks to win something."] },
            "Three or four categories are plenty. A grand champion can be the best total across the categories, or a separate vote.",
          ],
        },
        {
          id: "blind",
          heading: "Blind turn-in boxes",
          body: [
            "The contest is only fair if judges cannot tell whose barbecue they are eating. The usual way is a numbered box.",
            { list: ["Each cook brings their entry in a plain container, with no name, logo or sauce label on it.", "At turn-in, a helper moves it to an identical box with a number card, and writes the number against the cook's name.", "Keep that list with one person who is not judging, and do not read it out until the winners are announced.", "Ask cooks not to hover by the judging table."] },
            "Pick the numbers at random so nobody can guess the order cooks arrived in.",
          ],
        },
        {
          id: "judging",
          heading: "Judging: taste, tenderness and appearance",
          body: [
            "Three things to score keeps it simple. Our printable sheet scores each from 1 to 10 and counts taste double and tenderness one and a half times, the same weights as the BBQ preset in the app. The weights are our own friendly-contest choice, not an official scale.",
            { list: ["Taste: the main score. Seasoning, smoke and balance.", "Tenderness: should be done but not mush. Ribs should pull clean from the bone without falling off it.", "Appearance: how the entry looks in the box, before the first bite."] },
            "Judge one meat at a time, and have judges score each entry before talking about it. A common order is lighter to richer: chicken, then ribs, then pork and brisket. Water and plain bread between entries help.",
          ],
        },
        {
          id: "ties",
          heading: "Breaking ties",
          body: [
            "Agree on the method before the scores come in.",
            { list: ["Highest taste score wins: the simplest tie-break.", "A re-taste of the tied entries by the judges.", "Co-champions, with two prizes.", "Let the people's-choice vote decide between the tied entries."] },
          ],
        },
        {
          id: "kids",
          heading: "Kids and guests",
          body: [
            { list: ["Let guests vote for a people's choice, kids included. A sticker on a numbered tray is enough for young children.", "Offer a sauce on the side and a clearly labeled hot one, so no child gets a surprise.", "Give young cooks their own category, with a ribbon for every child."] },
          ],
        },
        {
          id: "safety",
          heading: "Food safety",
          body: [
            "Barbecue sits out for a long time at a contest, so plan for it. These are USDA guidelines, which we have not tested:",
            { list: ["Cook poultry to 165°F, and pork and whole cuts of beef to 145°F, checked with a thermometer.", "Keep hot food at 140°F or above, and cold sides at 40°F or below.", "Throw away food that has sat out more than two hours, or one hour if it is over 90°F outside.", "Label allergens on the number card where you can: nuts, dairy, gluten, and shellfish in any sauce."] },
          ],
        },
      ],
      faq: [
        { q: "How many entries do I need for a BBQ cook-off?", a: "Three is enough to make it a contest. Beyond about eight or ten per meat, judges get full and the scores drift." },
        { q: "Should the BBQ be judged or voted on?", a: "For a family gathering, let all guests vote. For a bigger event, add a small panel of judges with score sheets, and give a guests' prize on top." },
        { q: "Is this the same as a KCBS contest?", a: "No. KCBS sanctions its own contests with its own rules and certified judges. This is a friendly format for the backyard, and the printable sheet is not an official KCBS score card." },
        { q: "How do we judge a cook-off fairly?", a: "Number every entry in an identical box, hide the cook list, judge one meat at a time and have judges score before they talk." },
      ],
    },
  ],
};
