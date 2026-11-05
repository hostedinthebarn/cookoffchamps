import type { Placing } from "../shared/ranking";

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

export interface ManageView {
  event: EventSummary;
  role: "creator" | "co";
  proPreview: boolean;
  categories: { id: string; name: string; position: number }[];
  entries: ManageEntry[];
  organizers: { email: string; role: "creator" | "co" }[];
  votesCast: { categoryId: string; votes: number }[];
  judges: Judge[];
}

export interface JudgePage {
  judge: { name: string };
  event: { id: string; name: string; date: string | null; status: Status };
}

export interface Totals {
  totals: { entryId: string; categoryId: string; votes: number }[];
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
