// The public Q&A (SW-24), approved by Gary 2026-10-26. Words live here, apart
// from the page template; the Spanish version (SW-27) is content-es.ts, a
// translation with the same sections and question ids, so an answer's #anchor
// is the same in both. Every fact was checked against the code.

/** A paragraph, or a numbered list. */
export type Block = string | { steps: string[] };

export interface Question {
  id: string; // the #anchor; stable once published, since people will link to it
  q: string;
  a: Block[];
}

export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

export interface HelpContent {
  lang: string;
  /** The language's name in itself, for the link from the other version. */
  langName: string;
  /** Where the page is published, e.g. "/help/". */
  path: string;
  title: string;
  description: string;
  intro: string;
  filterLabel: string;
  noMatches: string;
  backToApp: string;
  /** The app's address in this language: "/?lang=es" opens it in Spanish. */
  appHref: string;
  linkLabel: string;
  /** The footer link to the printables (SW-62), in this language. */
  printablesLink: string;
  printablesHref: string;
  /** Footer links to the holiday guides (SW-63), in this language. */
  guides: { text: string; href: string }[];
  /** The footer link to the third-party licence notices (SW-89). */
  noticesLink: string;
  partOf: string;
  /** The privacy page (BIZ-38): linked from the footer and from the Privacy section. */
  privacyLink: string;
  privacyHref: string;
  /** The line that links to the full privacy page, under the Privacy section's questions. */
  privacyNote: string;
  sections: Section[];
}

export const en: HelpContent = {
  lang: "en",
  langName: "English",
  path: "/help/",
  title: "Help and questions",
  description:
    "How Cookoff Champs works: blind voting by QR code, running a family cookoff, the 3-2-1 reveal, and what we store.",
  intro: "How voting works, how to run a cookoff, and what we keep about you. Type below to find a question.",
  filterLabel: "Find a question",
  noMatches: "No questions match that. Try a shorter word.",
  backToApp: "Go to Cookoff Champs",
  appHref: "/",
  linkLabel: "Link to this answer",
  printablesLink: "Free printables",
  printablesHref: "/printables/",
  guides: [
    { text: "Pie contest guide", href: "/guides/thanksgiving-pie-contest/" },
    { text: "Cookie contest guide", href: "/guides/christmas-cookie-contest/" },
    { text: "Chili judging guide", href: "/guides/judge-a-chili-cookoff/" },
  ],
  noticesLink: "Open-source licences",
  partOf: "Part of",
  privacyLink: "Privacy",
  privacyHref: "/privacy/",
  privacyNote: "The full privacy page:",
  sections: [
    {
      id: "guests",
      title: "For guests: voting",
      questions: [
        {
          id: "how-to-vote",
          q: "How do I vote?",
          a: [
            "Scan the QR code on the poster or on a dish's tent card. No app, no account. If your phone won't scan, go to cookoffchamps.com and type the 6-character code from the poster. Then tap your favourite dish in each category.",
          ],
        },
        {
          id: "blind-voting",
          q: "Why can't I see who cooked each dish?",
          a: [
            "Voting is blind. You see the entry number, the dish name and a photo, never the cook, so you vote for the food and not for your favourite aunt. Cooks' names appear for the first time at the reveal.",
          ],
        },
        {
          id: "change-vote",
          q: "Can I change my vote?",
          a: ["Yes, until the organizer closes voting. Tap a different dish and your vote moves to it. You still have one vote per category."],
        },
        {
          id: "one-vote-per-phone",
          q: "Is it really one vote per phone?",
          a: [
            "One vote per phone per category, remembered by your browser. It's a soft limit: a private tab or a second browser could vote again. That's a deliberate trade-off for a family event.",
            "The organizer sees a live count of votes cast, so a pile of extra votes stands out against the number of guests in the room. We don't fingerprint phones, because two guests with the same model of phone could be turned away.",
          ],
        },
        {
          id: "see-standings",
          q: "Can I see who's winning?",
          a: ["No. Nobody sees the standings while voting is open, except the organizer, and only by tapping to peek. That keeps the reveal a surprise."],
        },
        {
          id: "voting-closed",
          q: "What happens when voting closes?",
          a: [
            "The voting link shows \"Voting is closed. The results are coming soon!\" until the organizer runs the reveal. After the reveal, the same link shows the results for good: places, vote counts and photos.",
          ],
        },
        {
          id: "ties",
          q: "What if two dishes tie?",
          a: ["They share the place and are revealed together. A tie for first makes them co-champions. There's no tie-break and no runoff."],
        },
        {
          id: "spanish",
          q: "Can I use it in Spanish?",
          a: [
            "Yes. The app starts in your phone's language, and the English / Español button at the top of each page switches it; your choice is remembered on that phone. An organizer's login and invitation emails come in the language they're using.",
            "The names people type, like dishes, cooks and categories, appear exactly as they were typed.",
          ],
        },
      ],
    },
    {
      id: "organizers",
      title: "For organizers: running a cookoff",
      questions: [
        {
          id: "cost",
          q: "What does it cost?",
          a: ["Family cookoffs are free, with no limit on events."],
        },
        {
          id: "set-up",
          q: "How do I set up a cookoff?",
          a: [
            {
              steps: [
                "Log in with your email address. We send you a link; there's no password.",
                "Create the event: a name and, if you like, a date.",
                "Add each dish: the cook's name, the dish name and a photo.",
                "Print the voting poster, the tent cards, or both.",
                "Open voting when people are ready to taste.",
              ],
            },
          ],
        },
        {
          id: "photos",
          q: "Do I need to take photos?",
          a: [
            "They're optional, but they help guests find the right dish. Take them on your phone as each dish arrives. The app shrinks each photo on your phone before uploading it (to 1,600 pixels on the long side), so it's quick even on venue wifi.",
          ],
        },
        {
          id: "printing",
          q: "What do I print?",
          a: [
            "Two things, each on US Letter, and you can print either or both. The voting poster has the event name, a large QR code and the typed code for phones that won't scan. The tent cards have one card per dish with its entry number and name, plus a small QR code that opens voting with that dish highlighted.",
            "Number the dishes on the table to match.",
          ],
        },
        {
          id: "categories",
          q: "Can I have more than one category?",
          a: [
            "Yes. Add categories such as Chili, Dessert or Sides, and each gets its own winner. Guests get one vote per category, and the reveal goes through each category in turn.",
            "A new event starts with one category, and the category controls stay out of the way until you add a second.",
          ],
        },
        {
          id: "co-organizers",
          q: "Can someone help me run it?",
          a: [
            "Yes. Invite co-organizers by email. A co-organizer can add dishes, open and close voting, peek at the standings, print, run the reveal and undo it. Only the person who created the event can delete it or manage co-organizers.",
          ],
        },
        {
          id: "peek",
          q: "Can I see the standings before the reveal?",
          a: [
            "Yes. While voting is open, tap \"Peek at the standings\". The panel hides itself again after 20 seconds, so a phone held up near guests doesn't give the game away. The votes-cast count is always shown.",
          ],
        },
        {
          id: "reopen-voting",
          q: "I closed voting too soon. Can I reopen it?",
          a: [
            "Yes. Tap \"Reopen voting\". Every vote cast so far is kept, and guests can carry on voting or change their votes. The app asks before closing voting, so it's hard to do by accident.",
          ],
        },
        {
          id: "change-dishes",
          q: "Can I change the dishes after voting closes?",
          a: [
            "No. Once voting closes, dishes and categories are frozen so the results can't shift underneath the reveal. If you need to fix something, reopen voting first.",
          ],
        },
        {
          id: "reveal",
          q: "How does the reveal work?",
          a: [
            "Open the reveal on a phone or, better, a TV. Each tap (or the space bar or right arrow) shows the next place, with the dish's photo and, for the first time, the cook's name: 3rd, then 2nd, then 1st.",
            "The app asks before the reveal starts, because once the champion is shown the results go public on the guests' link.",
          ],
        },
        {
          id: "undo-reveal",
          q: "I revealed the winners by mistake. Can I undo it?",
          a: [
            "Yes. On the event page, tap \"Undo the reveal\". The results are hidden again, and the guests' link goes back to \"results coming soon\". From there you can reopen voting or run the reveal again.",
            "The app warns you first, because if you reopen voting, the standings people already saw could change.",
          ],
        },
        {
          id: "results-last",
          q: "How long do the results stay up?",
          a: ["For good. The voting link becomes a results page after the reveal, and nothing expires. The event stays in your list until you delete it."],
        },
        {
          id: "delete-event",
          q: "Can I delete an event?",
          a: [
            "Yes, if you created it. Deleting removes the event, its photos and its votes permanently, and the link stops working for everyone. The app asks first.",
          ],
        },
      ],
    },
    {
      id: "pro",
      title: "Judged (pro) cookoffs",
      questions: [
        {
          id: "pro-what",
          q: "What is a judged cookoff?",
          a: [
            "A cookoff where named judges score the dishes and decide the placings, as at a church, charity or office championship. You choose Family or Pro when you create the event, and it's fixed once voting opens. Entries, categories, printing and the reveal work as in a family cookoff.",
          ],
        },
        {
          id: "pro-cost",
          q: "What does a judged cookoff cost?",
          a: [
            "Judged cookoffs are free for a limited time while they're in preview. They'll become a paid feature later. Events you run during the preview, and their results pages, keep working.",
          ],
        },
        {
          id: "pro-tickets",
          q: "Why do dishes use raffle tickets?",
          a: [
            "Use a roll of double raffle tickets: half goes on the dish, half to the cook. When a dish is turned in, type its ticket number in. The app checks no two dishes share one. Judges and guests see the ticket number instead of \"Entry 1\", and the cook's half proves which dish is theirs.",
            "Tear the tickets off in random order. Handed out in sequence, the numbers show who arrived first.",
          ],
        },
        {
          id: "pro-judges",
          q: "How do judges score?",
          a: [
            "Add each judge by name. Each gets a personal link or QR code, with no account to make. On it they score every dish on each criterion, a whole number from 1 to 10: 5 is average, 8 is excellent and 10 is the best they've had. There's room for a comment too.",
            "A judge's scores for a dish lock when they submit them, as with a paper sheet handed in. If a judge made a mistake, you can unlock that dish for them before the reveal. The event page shows each judge's progress, such as \"Pat: 14 of 18 scored\".",
          ],
        },
        {
          id: "pro-blind",
          q: "Do judges know whose dish it is?",
          a: [
            "No. Judges see the ticket number only, since the plate is in front of them. You can choose to show them the dish names too, but it's off by default, because a name like \"Grandma's Prize Chili\" gives the cook away. Until the reveal, guests see dish names only if the judges do, since a judge could open the guests' page too.",
          ],
        },
        {
          id: "pro-criteria",
          q: "How do the criteria and weights work?",
          a: [
            "Start from a Chili, BBQ or General preset, then rename, add or remove criteria. Each has a weight, with taste usually heaviest: Taste ×2, Texture ×1.5, Appearance ×1 and Aroma ×1, as in sanctioned barbecue. A judge's score for a dish is the weighted average of their criterion scores, so it stays on the 1 to 10 scale. The criteria are fixed once voting opens.",
          ],
        },
        {
          id: "pro-outliers",
          q: "Why are the highest and lowest scores dropped?",
          a: [
            "With 5 or more judges, each dish's highest and lowest score are dropped before averaging, as in diving and gymnastics. At a community event a friend scoring a friend up is as likely as a rival scoring them down. With fewer than 5 judges, nothing is dropped, because that would throw away too much. You can turn it off.",
          ],
        },
        {
          id: "pro-ties",
          q: "What if two dishes tie?",
          a: [
            "The tie is broken on the most heavily weighted criterion, then the next, and so on. If the dishes are still level, they share the place. There are no coin flips.",
          ],
        },
        {
          id: "pro-missed",
          q: "What if a judge misses a dish or has to leave?",
          a: [
            "A dish a judge didn't score is averaged over the judges who did. Before you close judging, the app lists any dish a judge hasn't scored.",
            "To stop a judge's link working, revoke it. You choose what happens to their scores: keep them if they had to leave early, or drop them if the link got into the wrong hands.",
          ],
        },
        {
          id: "pro-comments",
          q: "Who sees the judges' comments?",
          a: [
            "You do, with the judge's name, on the event page and in the export. As an option, cooks can read the comments on their own dish after the reveal by typing their ticket number, without the judges' names. Ticket numbers are easy to guess, so judges are told their comments may be read, and should keep them kind and useful.",
          ],
        },
        {
          id: "pro-peoples-choice",
          q: "Can guests still vote?",
          a: [
            "Yes, for a People's Choice award, which is on unless you turn it off. Guests vote for their favourite as in a family cookoff, one vote per phone per category. It doesn't change the judges' placings. One open and close covers judging and guest voting together.",
          ],
        },
        {
          id: "pro-grand-champion",
          q: "What is the Grand Champion?",
          a: [
            "An optional award when there are several categories: the best total across every category, for cooks who entered them all. A cook's name is matched however it was typed, so \"Ana Ruiz\" and \"ana ruiz\" are the same cook. With two dishes in one category, their better one counts.",
          ],
        },
        {
          id: "pro-reveal",
          q: "How does a judged reveal work?",
          a: [
            "People's Choice comes first, then each category's 3rd, 2nd and 1st place, then the Grand Champion. Each place shows the dish's final score, such as 8.74, where a family reveal shows votes.",
          ],
        },
        {
          id: "pro-final",
          q: "Why can't I undo a judged reveal?",
          a: [
            "Because the judges' results are a verdict, and hiding them again would look like changing it. The app says so before the reveal starts and asks you to tick \"I understand the results will be final\". Until then you can still reopen judging and unlock scores.",
          ],
        },
        {
          id: "pro-results",
          q: "What do the results show?",
          a: [
            "The guests' link becomes a results page with the places, each dish's final score and how it scored on each criterion. Judges' names are never shown publicly. You can download a spreadsheet (CSV) with every judge's scores and comments for your records.",
          ],
        },
      ],
    },
    {
      id: "privacy",
      title: "Privacy",
      questions: [
        {
          id: "guest-data",
          q: "What do you store about guests?",
          a: [
            "Very little. When you vote, your browser gets a random ID in a cookie so your vote can be remembered and changed. It lasts a year. We store that ID with your vote. No name, no email, no account.",
            "Voting also runs Cloudflare Turnstile, an invisible check that blocks automated ballot-stuffing.",
          ],
        },
        {
          id: "organizer-data",
          q: "What do you store about organizers?",
          a: [
            "Your email address and the events you run. Login links work once and expire after 15 minutes. Once you're logged in, you stay logged in on that browser for 30 days.",
          ],
        },
        {
          id: "ip-addresses",
          q: "Do you keep IP addresses?",
          a: [
            "Only in a scrambled form, and only briefly: a day at most for login emails and 20 minutes at most for typed codes. We use them to stop one address sending lots of login emails or guessing codes. Then they're deleted.",
            "The scrambled form can't be turned back into the address without a secret key that only the app holds.",
          ],
        },
        {
          id: "photo-visibility",
          q: "Who can see the photos?",
          a: [
            "Anyone with the event's link. The link uses a long, unguessable ID, so only people you share the poster or code with can find it.",
          ],
        },
        {
          id: "photo-location",
          q: "Do photos give away where they were taken?",
          a: [
            "No. Phone photos carry hidden details: the location, the date and time, and the phone's make and model. We strip all of it from every photo before it's stored, so a dish photo shows the dish and nothing else.",
            "What we can't remove is what's in the picture itself, so keep house numbers and faces out of the shot if that matters to you.",
          ],
        },
        {
          id: "tracking",
          q: "Are there ads or tracking?",
          a: ["No ads, and no tracking that follows you. We use Cloudflare Web Analytics to count page visits. It doesn't set cookies or build a profile of you."],
        },
        {
          id: "cook-data",
          q: "What do you store about cooks?",
          a: [
            "The name the organizer types in for each dish, the dish name and its photo. Guests don't see the cook's name until the reveal. If you're a cook and want your name or photo taken down, ask the organizer, or email privacy@cookoffchamps.com.",
          ],
        },
        {
          id: "other-handlers",
          q: "Who else handles the data?",
          a: [
            "Cloudflare runs the app, stores events and photos, and runs the anti-bot check. Resend delivers login and invite emails. We don't sell data or share it with anyone else.",
          ],
        },
        {
          id: "who-runs-it",
          q: "Who runs Cookoff Champs?",
          a: [
            "Hosted in the Barn, from a barn office in rural Texas. It started as the app for our own family cookoffs. The code is open source on GitHub.",
          ],
        },
      ],
    },
  ],
};
