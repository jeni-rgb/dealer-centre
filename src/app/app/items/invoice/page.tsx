import { requireDealer } from "@/lib/auth";
import { DealerNav, Screen } from "@/components/ui";
import { InvoiceForm } from "./form";

export default async function InvoicePage() {
  await requireDealer();
  return (
    <Screen title="Invoice" back={{ href: "/app/stock" }}>
      <InvoiceForm />
      <DealerNav active="stock" />
    </Screen>
  );
}
