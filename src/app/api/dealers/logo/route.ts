import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toMonoPng } from "@/lib/labels/mono";

const OK = new Set(["image/png", "image/jpeg", "image/svg+xml"]);

export async function GET() {
  const me = await getMe();
  if (!me?.dealer_id) return new NextResponse("sign in", { status: 401 });
  const db = supabaseAdmin();
  const { data } = await db.from("dealers").select("logo_path").eq("id", me.dealer_id).maybeSingle();
  if (!data?.logo_path) return new NextResponse("none", { status: 404 });
  const file = await db.storage.from("files").download(data.logo_path);
  if (!file.data) return new NextResponse("none", { status: 404 });
  const buf = Buffer.from(await file.data.arrayBuffer());
  return new NextResponse(buf, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}

/** Save a dealer logo as a black and white PNG. PNG, JPG or SVG. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file" }, { status: 400 });
  const type = file.type || (file.name.endsWith(".svg") ? "image/svg+xml" : file.name.endsWith(".png") ? "image/png" : "image/jpeg");
  if (!OK.has(type) && !/\.(png|jpe?g|svg)$/i.test(file.name)) return NextResponse.json({ error: "Use a PNG, JPG or SVG" }, { status: 400 });
  if (file.size > 2_000_000) return NextResponse.json({ error: "File is too big" }, { status: 400 });
  let mono: Buffer;
  try {
    mono = await toMonoPng(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Could not read that file" }, { status: 400 });
  }
  const path = `logos/${me.dealer_id}.png`;
  const db = supabaseAdmin();
  const up = await db.storage.from("files").upload(path, mono, { contentType: "image/png", upsert: true });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 400 });
  const { error } = await db.from("dealers").update({ logo_path: path }).eq("id", me.dealer_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  await supabaseAdmin().from("dealers").update({ logo_path: null }).eq("id", me.dealer_id);
  return NextResponse.json({ ok: true });
}
