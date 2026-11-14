/** Deep links that open the handheld reader with the amount and ticket already filled in. */

export function sumupReaderUrl(p: { amountPence: number; ticket: string; affiliateKey: string; callback: string; foreignId: string }): string {
  const q = new URLSearchParams({
    amount: (p.amountPence / 100).toFixed(2),
    currency: "GBP",
    "affiliate-key": p.affiliateKey,
    title: p.ticket,
    "foreign-tx-id": p.foreignId,
    callbacksuccess: p.callback,
    callbackfail: p.callback,
  });
  return `sumupmerchant://pay/1.0?${q.toString()}`;
}

export function squareReaderUrl(p: { amountPence: number; ticket: string; clientId: string; callback: string; state: string }): string {
  const data = {
    amount_money: { amount: String(p.amountPence), currency_code: "GBP" },
    callback_url: p.callback,
    client_id: p.clientId,
    version: "1.3",
    notes: p.ticket,
    state: p.state,
    options: { supported_tender_types: ["CARD_FROM_READER"] },
  };
  return `square-commerce-v1://payment/create?data=${encodeURIComponent(JSON.stringify(data))}`;
}

/** Legacy iZettle app link. The current Zettle SDK is for a native app, not a website, so this only works when Zettle still honours the old scheme and the key matches. */
export function zettleReaderUrl(p: { amountPence: number; ticket: string; apiKey: string; success: string; failure: string; reference: string }): string {
  const q = new URLSearchParams({
    "x-source": "Dealer Centre",
    "x-success": p.success,
    "x-failure": p.failure,
    "api-key": p.apiKey,
    price: (p.amountPence / 100).toFixed(2),
    currency: "GBP",
    title: p.ticket,
    reference: p.reference,
  });
  return `izettle://x-callback-url/payment/1.0?${q.toString()}`;
}
