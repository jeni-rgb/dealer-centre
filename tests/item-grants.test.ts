import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

function filesUnder(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === "node_modules" || name === ".next") continue;
    const st = statSync(path);
    if (st.isDirectory()) out.push(...filesUnder(path, ext));
    else if (name.endsWith(ext)) out.push(path);
  }
  return out;
}

/** Columns an authenticated session may select on items. Table-wide select was revoked in 0014. */
function grantedItemColumns(): Set<string> {
  const cols = new Set<string>();
  const sql = filesUnder(join(root, "supabase/migrations"), ".sql").map((f) => readFileSync(f, "utf8")).join("\n");
  const re = /grant\s+select\s*\(([^)]+)\)\s+on\s+(?:table\s+)?(?:public\.)?items\s+to\s+authenticated/gi;
  for (const hit of sql.matchAll(re)) {
    for (const col of hit[1].split(",")) {
      const name = col.trim().replace(/"/g, "");
      if (name) cols.add(name);
    }
  }
  return cols;
}

function topLevelParts(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = list.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function columnsInSelect(list: string): string[] {
  return topLevelParts(list).flatMap((part) => {
    if (part === "*") return ["*"];
    if (part.includes("(")) return [];
    const name = part.split(/\s+/)[0]?.replace(/"/g, "") ?? "";
    return name ? [name] : [];
  });
}

/** Item columns selected through supabaseServer(), which is the signed-in session. */
function userClientItemColumns(): { file: string; column: string }[] {
  const found: { file: string; column: string }[] = [];
  for (const file of filesUnder(join(root, "src"), ".ts").concat(filesUnder(join(root, "src"), ".tsx"))) {
    const src = readFileSync(file, "utf8");
    if (!src.includes("supabaseServer(")) continue;
    const vars = [...src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*await\s+supabaseServer\(\)/g)].map((m) => m[1]);
    if (!vars.length) continue;
    const alt = vars.join("|");
    const re = new RegExp(
      `\\b(?:${alt})\\s*\\.\\s*from\\(\\s*["']items["']\\s*\\)\\s*\\.\\s*select\\(\\s*(["'\`])([\\s\\S]*?)\\1`,
      "g",
    );
    for (const hit of src.matchAll(re)) {
      if (hit[2].trim() === "*") found.push({ file, column: "*" });
      for (const column of columnsInSelect(hit[2])) found.push({ file: file.slice(root.length + 1), column });
    }
  }
  return found;
}

describe("authenticated item column grants", () => {
  it("covers every items column a signed-in session selects", () => {
    const granted = grantedItemColumns();
    expect(granted.has("qty")).toBe(true);
    expect(granted.has("qty_start")).toBe(true);
    expect(granted.has("invoice_id")).toBe(true);
    const used = userClientItemColumns();
    expect(used.some((use) => use.file.endsWith("src/app/app/stock/page.tsx") && use.column === "qty")).toBe(true);
    const missing = used.filter((use) => !granted.has(use.column));
    expect(missing).toEqual([]);
  });

  it("lets a dealer read their own places and invoices", () => {
    const sql = readFileSync(join(root, "supabase/migrations/0035_item_qty_grants.sql"), "utf8");
    expect(sql).toMatch(/grant select on item_places to authenticated/i);
    expect(sql).toMatch(/create policy item_places_dealer on item_places for select/i);
    expect(sql).toMatch(/dealer_id = current_dealer_id\(\)/);
    expect(sql).toMatch(/grant select on invoices to authenticated/i);
    expect(sql).toMatch(/create policy invoices_dealer on invoices for select/i);
  });
});
