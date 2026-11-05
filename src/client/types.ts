import type { Placing } from "../shared/ranking";
import type { ScorePlacing } from "../shared/scoring";

export type Status = "setup" | "open" | "closed" | "revealed";
export type Kind = "family" | "pro";

export interface EventSummary {
  id: string;
  code: string;
  name: string;
  date: string | null;
  status: Status;
  /** Missing only on views that never show it (the guest's page, so far). */
  kind?: Kind;
}

export interface ManageEntry {
  id: string;
  categoryId: string;
  number: number;
  cookName: string;
  dishName: string;
  photoKey: string | null;
  /** The raffle-ticket number (pro events, SW-25); null until turned in. */
  ticket: string | null;
}

export interface Judge {
  id: string;
  name: string;
}

export interface Criterion {
  id: string;
  name: string;
  weight: number;
  position: number;
}

/** A pro event's scoring setup and progress (SW-25). */
export interface Judging {
  criteria: Criterion[];
  dropOutliers: boolean;
  showDishNames: boolean;
  /** The submitted cards: which judge has scored which dish. */
  scored: { judgeId: string; entryId: string }[];
}

export interface ManageView {
  event: EventSummary;
  role: "creator" | "co";
  proPreview: boolean;
  categories: { id: string; name: string; position: number }[];
  entries: ManageEntry[];
  organizers: { email: string; role: "creator" | "co" }[];
  votesCast: { categoryId: string; votes: number }[];
  judges: Judge[];
  judging: Judging;
}

export interface JudgeDish {
  entryId: string;
  ticket: string;
  category: string | null;
  dishName?: string;
}

export interface JudgeCard {
  entryId: string;
  scores: Record<string, number>;
  comment: string | null;
  locked: boolean;
}

export interface JudgePage {
  judge: { name: string };
  event: { id: string; name: string; date: string | null; status: Status };
  criteria: { id: string; name: string; weight: number }[];
  dishes: JudgeDish[];
  cards: JudgeCard[];
}

export interface JudgedScore {
  entryId: string;
  categoryId: string;
  score: number | null;
  judges: number;
  counted: number;
  byCriterion: Record<string, number>;
}

export interface Totals {
  totals: { entryId: string; categoryId: string; votes: number }[];
  /** Pro events only (SW-25): the judged standings. */
  judged?: { scores: JudgedScore[]; placings: Record<string, ScorePlacing[]> };
}

export interface PublicEntry {
  id: string;
  number: number;
  dishName: string;
  photoKey: string | null;
  cookName?: string;
  votes?: number;
}

export interface PublicView {
  event: EventSummary;
  turnstileSiteKey: string;
  myVotes: Record<string, string>;
  categories: { id: string; name: string; entries: PublicEntry[]; placings?: Placing[] }[];
}
