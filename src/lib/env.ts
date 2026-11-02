/** Environment names. Accepts the names in Jeni's keys file and the earlier names. */
const pick = (...names: string[]) => names.map((n) => process.env[n]).find((v) => v && v.length > 0);

export const env = {
  appUrl: () => pick("NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL") ? (pick("NEXT_PUBLIC_APP_URL") ?? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) : "https://dealer-centre.vercel.app",
  square: {
    appId: () => pick("SQUARE_APPLICATION_ID", "SQUARE_APP_ID")!,
    appSecret: () => pick("SQUARE_APPLICATION_SECRET", "SQUARE_APP_SECRET")!,
    webhookKey: () => pick("SQUARE_WEBHOOK_SIGNATURE_KEY")!,
    production: () => (pick("SQUARE_ENVIRONMENT", "SQUARE_ENV") ?? "sandbox") === "production",
  },
  stripe: {
    price: (tier: "25" | "100" | "150") => pick(`STRIPE_PRICE_${tier}`, tier === "25" ? "STRIPE_PRICE_50" : tier === "100" ? "STRIPE_PRICE_100" : "STRIPE_PRICE_250", "STRIPE_PRICE_ID")!,
    /** Kit plan: £299 a month + VAT, 12 months, Square Register kit included. */
    centrePrice: () => pick("STRIPE_PRICE_CENTRE", "STRIPE_PRICE_299") ?? "",
    /** Own till plan: £249 a month + VAT, monthly, 14 days free. Falls back to the kit price until it is set. */
    centreOwnTillPrice: () => pick("STRIPE_PRICE_CENTRE_OWN", "STRIPE_PRICE_249") ?? pick("STRIPE_PRICE_CENTRE", "STRIPE_PRICE_299") ?? "",
    /** Stripe tax rate id for 20% UK VAT. Prices are ex VAT; this adds the VAT line to every subscription and commission charge. */
    vatRate: () => pick("STRIPE_TAX_RATE_VAT"),
  },
  emailFrom: () => pick("EMAIL_FROM") ?? "Dealer Centre <onboarding@resend.dev>",
};
