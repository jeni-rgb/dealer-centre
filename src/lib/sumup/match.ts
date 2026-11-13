import { canonicalTicket } from "@/lib/sku";
import { TICKET } from "@/lib/full/sumup";

/** SumUp amounts are in pounds. £12.50 becomes 1250. */
export function majorToPence(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

/** Ticket number typed into a SumUp description or product name. */
export function findTicket(text: string): string | null {
  const m = text.match(TICKET);
  if (!m) return null;
  const sku = canonicalTicket(m[1]);
  return /^[A-Z][A-Z0-9]{0,3}\d{1,4}$/.test(sku) ? sku : null;
}

export type MatchPlan =
  | { kind: "matched"; sku: string }
  | { kind: "duplicate"; sku: string }
  | { kind: "unmatched"; ticket: string | null };

/** A live ticket records. The same ticket and amount on the same day is already in, so the file upload is not recorded again. */
export function planMatch(input: {
  description: string;
  amountPence: number;
  day: string;
  live: { sku: string }[];
  taken: { ticket: string; amountPence: number; day: string }[];
}): MatchPlan {
  const ticket = findTicket(input.description);
  if (!ticket) return { kind: "unmatched", ticket: null };
  const hit = input.taken.find((s) => s.ticket === ticket && s.amountPence === input.amountPence && s.day === input.day);
  if (hit) return { kind: "duplicate", sku: ticket };
  if (input.live.some((i) => i.sku === ticket)) return { kind: "matched", sku: ticket };
  return { kind: "unmatched", ticket };
}
