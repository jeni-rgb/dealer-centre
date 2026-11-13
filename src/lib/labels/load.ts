import type { Admin } from "@/lib/supabase/server";
import { pngSize } from "./mono";
import type { LabelInput } from "./render";

export async function logoForDealer(db: Admin, dealerId: string | null | undefined): Promise<LabelInput["logo"]> {
  if (!dealerId) return null;
  const { data: dealer } = await db.from("dealers").select("logo_path").eq("id", dealerId).maybeSingle();
  const path = dealer?.logo_path as string | null | undefined;
  if (!path) return null;
  const file = await db.storage.from("files").download(path);
  const blob = file.data;
  if (!blob) return null;
  const png = new Uint8Array(await blob.arrayBuffer());
  const { width, height } = pngSize(png);
  if (width < 2 || height < 2) return null;
  return { png, width, height };
}
