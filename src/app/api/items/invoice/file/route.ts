import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** The supplier invoice kept against the stock. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id && !me?.is_platform_admin) return new NextResponse("Sign in", { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const db = supabaseAdmin();
  const { data } = await db.from("invoices").select("dealer_id, file_path, file_name").eq("id", id).maybeSingle();
  if (!data || (data.dealer_id !== me?.dealer_id && !me?.is_platform_admin)) return new NextResponse("Not found", { status: 404 });
  if (!data.file_path) return new NextResponse("No file stored", { status: 404 });
  const file = await db.storage.from("files").download(data.file_path);
  if (!file.data) return new NextResponse("Not found", { status: 404 });
  const name = (data.file_name || "invoice").replace(/[^\w. ]+/g, "");
  return new NextResponse(file.data, { headers: { "content-type": file.data.type || "application/octet-stream", "content-disposition": `inline; filename="${name}"` } });
}
