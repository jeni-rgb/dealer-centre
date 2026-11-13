/** Best sellers by piece size and by item. */

export type SoldPiece = { title: string; group: string; amountPence: number };

const GROUP_NAME: Record<string, string> = { small: "Small pieces", medium: "Medium pieces", large: "Large pieces", furniture: "Furniture" };

export function groupName(delivery: string | null | undefined): string {
  return GROUP_NAME[delivery ?? ""] ?? "Other";
}

export function rankSold(rows: SoldPiece[], limit = 5): { items: { title: string; count: number; amountPence: number }[]; groups: { title: string; count: number; amountPence: number }[] } {
  const fold = (key: (r: SoldPiece) => string) => {
    const map = new Map<string, { title: string; count: number; amountPence: number }>();
    for (const r of rows) {
      const title = key(r);
      const cur = map.get(title) ?? { title, count: 0, amountPence: 0 };
      cur.count += 1;
      cur.amountPence += r.amountPence;
      map.set(title, cur);
    }
    return [...map.values()].sort((a, b) => b.amountPence - a.amountPence || b.count - a.count).slice(0, limit);
  };
  return { items: fold((r) => r.title || "Untitled"), groups: fold((r) => r.group) };
}
