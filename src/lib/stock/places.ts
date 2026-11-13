export type PlaceQty = { centreId: string | null; qty: number };

/** Place counts must add up to the colour. */
export function placesMatch(colourQty: number, places: PlaceQty[]): boolean {
  const sum = places.reduce((a, p) => a + (Number.isFinite(p.qty) ? p.qty : 0), 0);
  return sum === colourQty && places.every((p) => p.qty >= 0);
}

/** Move n from one place to another. Returns the next counts, or null when the source is short. */
export function movePlaces(places: PlaceQty[], from: string | null, to: string | null, n: number): PlaceQty[] | null {
  if (n < 1 || (from ?? "") === (to ?? "")) return null;
  const next = places.map((p) => ({ ...p }));
  const src = next.find((p) => (p.centreId ?? null) === from);
  if (!src || src.qty < n) return null;
  src.qty -= n;
  let dst = next.find((p) => (p.centreId ?? null) === to);
  if (!dst) {
    dst = { centreId: to, qty: 0 };
    next.push(dst);
  }
  dst.qty += n;
  return next;
}

/** A sale takes one from this place only. Other places stay put. */
export function takeOnePlace(places: PlaceQty[], centreId: string | null): { places: PlaceQty[]; taken: boolean; total: number } {
  const next = places.map((p) => ({ ...p }));
  const src = next.find((p) => (p.centreId ?? null) === centreId);
  const taken = !!src && src.qty > 0;
  if (taken && src) src.qty -= 1;
  const total = next.reduce((a, p) => a + p.qty, 0);
  return { places: next, taken, total };
}
