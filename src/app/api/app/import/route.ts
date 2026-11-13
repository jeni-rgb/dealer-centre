import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dealerWithListing } from "@/lib/billing/tokens";
import { namedSales } from "@/lib/billing/pricing";
import { checkRows, guessSheetMap, rowsFromCsv, SHEET_FIELDS, type SheetMap } from "@/lib/items/sheet";
import { createItem } from "@/lib/items/create";

export const maxDuration = 60;

function tableFrom(name: string, buf: Buffer): string[][] {
  if (name.toLowerCase().endsWith(".csv") || name.toLowerCase().endsWith(".txt")) return rowsFromCsv(buf.toString("utf8"));
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as string[][];
}

/** Preview, then import. Full only. A missing ticket is generated. A ticket already on the stock is skipped. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const db = supabaseAdmin();
  const dealer = await dealerWithListing(db, me.dealer_id, "plan");
  if (!dealer || !namedSales(dealer)) return NextResponse.json({ error: "Full" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file" }, { status: 400 });
  const table = tableFrom(file.name, Buffer.from(await file.arrayBuffer()));
  if (table.length < 2) return NextResponse.json({ error: "The file has no rows" }, { status: 400 });
  const headers = table[0].map((h) => String(h));
  const guessed = guessSheetMap(headers);
  const rawMap = String(form.get("map") ?? "");
  const map: SheetMap = rawMap ? { ...guessed, ...JSON.parse(rawMap) } : guessed;
  const { data: items } = await db.from("items").select("sku").eq("dealer_id", me.dealer_id);
  const { data: links } = await db.from("dealer_centres").select("centre_id, centres(name)").eq("dealer_id", me.dealer_id).is("left_at", null);
  const centres = (links ?? []).map((l) => ({ id: l.centre_id as string, name: (l.centres as unknown as { name: string } | null)?.name ?? "" })).filter((c) => c.name);
  const rows = checkRows(table, map, { tickets: (items ?? []).map((i) => i.sku), centres: centres.map((c) => c.name) });
  if (form.get("commit") !== "1") return NextResponse.json({ headers, map, fields: SHEET_FIELDS, rows });
  let imported = 0;
  const results = [];
  for (const row of rows) {
    if (row.status !== "ok") { results.push({ line: row.line, status: row.status, message: row.message }); continue; }
    const centre = centres.find((c) => c.name.toLowerCase() === row.centre.toLowerCase());
    try {
      if (row.ticket) {
        const { error } = await db.from("items").insert({
          dealer_id: me.dealer_id,
          centre_id: centre?.id ?? null,
          sku: row.ticket,
          title: row.title,
          description: row.description || null,
          delivery: row.size,
          price_pence: row.pricePence,
          listed_price_pence: row.pricePence,
          photos: [],
          status: "live",
          price_source: "app",
          on_own_shopify: false,
          on_centre_shopify: false,
        });
        if (error) { results.push({ line: row.line, status: "error", message: "Ticket already used" }); continue; }
      } else {
        await createItem(db, me.dealer_id, {
          title: row.title,
          description: row.description || undefined,
          delivery: row.size,
          price_pence: row.pricePence,
          centre_id: centre?.id ?? null,
          photos: [],
          on_own_shopify: false,
          on_centre_shopify: false,
          print_now: false,
          source: "app",
        });
      }
      imported++;
      results.push({ line: row.line, status: "imported", message: row.ticket ?? "New ticket" });
    } catch (e) {
      results.push({ line: row.line, status: "error", message: e instanceof Error ? e.message : "Could not add" });
    }
  }
  return NextResponse.json({ imported, results });
}
