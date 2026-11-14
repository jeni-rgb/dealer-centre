import { OnboardForm } from "./form";
import { PageHeader } from "../ui";

export default function Onboard() {
  return (
    <>
      <PageHeader title="Onboard a centre" subtitle="Creates the centre, the owner account and every dealer, then gives you a sign in link." />
      <OnboardForm />
    </>
  );
}
