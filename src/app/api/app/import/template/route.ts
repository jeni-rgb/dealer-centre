import { SHEET_TEMPLATE } from "@/lib/items/sheet";

export async function GET() {
  return new Response(SHEET_TEMPLATE, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=stock-template.csv",
    },
  });
}
