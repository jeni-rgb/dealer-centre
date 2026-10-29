import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Signed download for private files (statement PDFs, label PDFs). Ownership is checked by path prefix. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return new NextResponse("sign in", { status: 401 });
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const allowed = me.is_platform_admin || (me.dealer_id && (path.startsWith(`labels/${me.dealer_id}/`) || path.startsWith(`statements/${me.dealer_id}/`)));
  if (!allowed) return new NextResponse("no", { status: 403 });
  const { data } = await supabaseAdmin().storage.from("files").createSignedUrl(path, 300);
  if (!data) return new NextResponse("not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
