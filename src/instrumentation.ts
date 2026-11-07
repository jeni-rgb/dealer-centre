export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEMO_MODE === "1") return;
  const { holdUnstartedDealerTrials } = await import("@/lib/billing/dealer-trial");
  const work = holdUnstartedDealerTrials().catch((e) => console.error("[dealer trial]", e));
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, 8000))]);
}
