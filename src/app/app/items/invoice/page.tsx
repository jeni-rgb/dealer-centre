import { redirect } from "next/navigation";

/** Bulk buy now starts inside List an item. */
export default function InvoiceMoved() {
  redirect("/app/items/new");
}
