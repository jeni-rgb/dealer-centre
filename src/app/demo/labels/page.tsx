import { notFound } from "next/navigation";
import sharp from "sharp";
import { isDemo } from "@/lib/supabase/demo";
import { toMonoPng, pngSize } from "@/lib/labels/mono";
import { renderLabelSvg } from "@/lib/labels/render";

/** Two sample labels. Demo only. Nothing is stored. */
export default async function LabelSamples() {
  if (!isDemo()) notFound();
  const mark = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="white"/><text x="8" y="58" font-size="52" font-family="Arial" font-weight="700" fill="black">BA</text></svg>`)).png().toBuffer();
  const mono = await toMonoPng(mark);
  const logo = { png: new Uint8Array(mono), ...pngSize(mono) };
  const base = { sku: "B140372", dealerCode: "B14", dealerName: "Bloom Antiques", title: "Victorian writing slope", pricePence: 14500, centreName: "Looses Emporium", widthMm: 62, heightMm: 29 };
  const plain = await renderLabelSvg(base);
  const withLogo = await renderLabelSvg({ ...base, logo });
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 bg-white px-6 py-10">
      <h1 className="text-[24px] font-semibold">Label samples</h1>
      <section id="plain"><h2 className="mb-3 text-[16px] font-semibold">No logo</h2><div dangerouslySetInnerHTML={{ __html: plain }} /></section>
      <section id="logo"><h2 className="mb-3 text-[16px] font-semibold">With logo</h2><div dangerouslySetInnerHTML={{ __html: withLogo }} /></section>
    </main>
  );
}
