import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { EndOfDay } from "./form";

/** End of day sales entry. Built for a phone in one hand and a pile of tickets in the other. */
export default async function Eod({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  return <EndOfDay centreId={centre.id} centreName={centre.name} />;
}
