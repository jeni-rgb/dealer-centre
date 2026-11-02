/** SKU rules. Storage form has no spaces, uppercase. Display form splits code and number. */

export function normaliseSku(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "TD 1", "TD01" and "TD0001" are the same ticket. Pads a short number to four digits. Leaves full tickets alone. */
export function canonicalTicket(raw: string): string {
  const s = normaliseSku(raw);
  const m = s.match(/^([A-Z][A-Z0-9]{0,3}?)(\d{1,3})$/);
  return m ? `${m[1]}${m[2].padStart(4, "0")}` : s;
}

export function displaySku(sku: string): string {
  const s = normaliseSku(sku);
  const m = s.match(/^([A-Z][A-Z0-9]{1,3}?)(\d{4})$/);
  return m ? `${m[1]} ${m[2]}` : s;
}

export function isValidDealerCode(code: string): boolean {
  return /^[A-Z][A-Z0-9]{1,3}$/.test(code);
}

/** Suggest a dealer code from a business name: initials, then first letters, 2 to 4 chars. */
export function suggestDealerCode(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  let code = words.map((w) => w[0]).join("");
  if (code.length < 2) code = (words[0] ?? "DC").slice(0, 3);
  code = code.replace(/^[0-9]+/, "");
  if (code.length < 2) code = "D" + code;
  return code.slice(0, 4).padEnd(2, "X");
}

/** Pull a ticket number out of free text typed at a till, e.g. "b14 372" or "B14-0372". */
export function extractTicketFromNote(note: string | null | undefined, dealerCode?: string): string | null {
  if (!note) return null;
  const cleaned = note.toUpperCase().replace(/[^A-Z0-9]/g, " ").trim();
  const full = cleaned.match(/\b([A-Z][A-Z0-9]{1,3})\s?(\d{1,4})\b/);
  if (full) return `${full[1]}${full[2].padStart(4, "0")}`;
  if (dealerCode) {
    const num = cleaned.match(/\b(\d{1,4})\b/);
    if (num) return `${dealerCode}${num[1].padStart(4, "0")}`;
  }
  return null;
}
