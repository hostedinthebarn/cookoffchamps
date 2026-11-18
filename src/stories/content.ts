// Story pages (SW-124): a longer, sourced page behind each story post. Words live
// here, apart from the template (render.ts). English only for now; a Spanish
// version is not planned unless Gary asks. The text of each story is approved by
// Gary before deploy (page 1: GEN-145).

/** A run of text, or a link inside a paragraph. */
export type Part = string | { text: string; href: string };

export interface Story {
  id: string;
  /** Where the page is published. */
  path: string;
  /** The title tag and the share title, as approved. The h1 is `heading`. */
  title: string;
  heading: string;
  description: string;
  /** The day it went up, YYYY-MM-DD. Shown on the page and in the Article data. */
  datePublished: string;
  /** Each paragraph is a list of parts, so sources can be linked inline. */
  paragraphs: Part[][];
  sources: { text: string; href: string }[];
}

export interface StoriesContent {
  lang: string;
  indexPath: string;
  indexTitle: string;
  indexDescription: string;
  indexIntro: string;
  publisher: string;
  publishedOn: string;
  sourcesTitle: string;
  /** The closing block, with a link to the guide and one to the score sheet. */
  closing: {
    title: string;
    before: string;
    guideText: string;
    guideHref: string;
    middle: string;
    sheetText: string;
    sheetHref: string;
    after: string;
  };
  allStories: string;
  partOf: string;
  stories: Story[];
}

export const en: StoriesContent = {
  lang: "en",
  indexPath: "/stories/",
  indexTitle: "Stories",
  indexDescription: "Short, sourced stories behind the dishes we judge: where Christmas cookies and the cookie swap come from, and more.",
  indexIntro: "Short stories behind the dishes people cook and compete over, each with its sources.",
  publisher: "Cookoff Champs",
  publishedOn: "Published",
  sourcesTitle: "Sources",
  closing: {
    title: "Running a cookie swap or contest this year?",
    before: "Our free guide to running a Christmas cookie contest covers the judging and the rules: ",
    guideText: "How to run a Christmas cookie contest",
    guideHref: "/guides/christmas-cookie-contest/",
    middle: ". It comes with a printable ",
    sheetText: "cookie score sheet",
    sheetHref: "/printables/cookie-contest-score-sheet/",
    after: ". If you would rather skip the paper, guests can vote on their phones, free, without seeing who baked what.",
  },
  allStories: "All stories",
  partOf: "Part of",
  stories: [
    {
      id: "christmas-cookie-history",
      path: "/stories/christmas-cookie-history/",
      title: "Where do Christmas cookies come from? A short history",
      heading: "Where do Christmas cookies come from?",
      description:
        'Christmas cookies go back to medieval spice baking. Where the word "cookie" comes from, how German cookie cutters took over American Christmas, and when the cookie swap began.',
      // ⚠️ Gary: confirm this date matches the day the page goes live.
      datePublished: "2026-11-18",
      paragraphs: [
        ["Christmas cookies start in medieval Europe, in recipes made once spices like cinnamon and ginger reached the bakers' kitchens. The rest of the story crosses an ocean and takes a few centuries."],
        [
          'The ocean part comes with the name. "Cookie" is Dutch, from koekje, "little cake", and Dutch settlers brought cookies with them to New Amsterdam in the 1620s. ',
          { text: "Wikipedia, Cookie", href: "https://en.wikipedia.org/wiki/Cookie" },
        ],
        [
          "The Christmas part came more than 250 years later. Between 1871 and 1906, cheap cookie cutters imported from Germany filled American Christmas markets, and many of the designs were made to hang on a Christmas tree. ",
          { text: "Food Timeline, Christmas foods", href: "https://www.foodtimeline.org/christmasfood.html#cookies" },
          ", quoting William Woys Weaver, The Christmas Cook (1990); tree designs: ",
          { text: "Wikipedia, Christmas cookie", href: "https://en.wikipedia.org/wiki/Christmas_cookie" },
        ],
        [
          "Then people started trading them. Cookie exchanges first show up in newspapers during World War I, and the cookie swap took off as a trend in the early 1960s. If you have ever left a party with a tin of other people's cookies, you were taking part in a tradition about sixty years old. ",
          { text: "Food Timeline, cookie exchanges", href: "https://www.foodtimeline.org/christmasfood.html#exchanges" },
        ],
      ],
      sources: [
        { text: "Food Timeline, Christmas foods: cookies", href: "https://www.foodtimeline.org/christmasfood.html#cookies" },
        { text: "Wikipedia, Cookie", href: "https://en.wikipedia.org/wiki/Cookie" },
        { text: "Wikipedia, Christmas cookie", href: "https://en.wikipedia.org/wiki/Christmas_cookie" },
        { text: "Food Timeline, cookie exchanges", href: "https://www.foodtimeline.org/christmasfood.html#exchanges" },
      ],
    },
  ],
};
