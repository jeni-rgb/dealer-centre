import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isDemo } from "@/lib/supabase/demo";
import { readInvoiceFile } from "@/lib/invoices/read";

const SAMPLE = [{ title: "Key box", qty: 20, costPence: 150 }];

/** Read a supplier invoice. CSV is local. PDF and photos use Gemini when the key is set. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 8_000_000) return NextResponse.json({ error: "Choose a PDF, photo or CSV" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const db = supabaseAdmin();
  const path = `invoices/${me.dealer_id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.]+/g, "").slice(0, 40) || "invoice"}`;
  if (!isDemo()) await db.storage.from("files").upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  const { data: invoice } = await db.from("invoices").insert({
    dealer_id: me.dealer_id,
    file_path: isDemo() ? null : path,
    file_name: file.name.slice(0, 120),
  }).select("id").single();
  const parsed = isDemo() && !file.name.toLowerCase().endsWith(".csv")
    ? { lines: SAMPLE, supplier: "Box Co", read: true }
    : await readInvoiceFile({ name: file.name, type: file.type, bytes }, process.env.GEMINI_API_KEY);
  return NextResponse.json({
    invoiceId: invoice?.id ?? (isDemo() ? "inv1" : null),
    supplier: parsed.supplier,
    lines: parsed.lines,
    read: parsed.read,
    ai: !!process.env.GEMINI_API_KEY,
  });
}
