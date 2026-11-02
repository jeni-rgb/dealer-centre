/** SKU rules. Storage form has no spaces, uppercase. Display form splits code and number. */

export function normaliseSku(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "TD 1", "TD01" and "TD0001" are the same ticket. Pads a short number to four digits. Leaves full tickets alone. */
export function canonicalTicket(raw: string): string {
  const s = normaliseSku(raw);
  if (/^[A-Z][A-Z0-9]{0,3}\d{4}$/.test(s)) return s; // already a full ticket, leave it alone
  const m = s.match(/^([A-Z][A-Z0-9]{0,3}?)(\d{1,3})$/);
  return m ? `${m[1]}${m[2].padStart(4, "0")}` : s;
}

/** Every spelling a typed ticket could mean, exact form first: "TD 1" -> ["TD1", "TD0001"]; "B14372" -> ["B14372", "B140372"]. */
export function ticketCandidates(raw: string): string[] {
  const s = normaliseSku(raw);
  const out = [s];
  const m = s.match(/^([A-Z][A-Z0-9]{0,3}?)(\d{1,3})$/);
  if (m) out.push(`${m[1]}${m[2].padStart(4, "0")}`);
  // "B14372" read as code B14 + 372 when the exact form is not an item
  const m2 = s.match(/^([A-Z][A-Z0-9]{1,3})(\d{3})$/);
  if (m2) out.push(`${m2[1]}${m2[2].padStart(4, "0")}`);
  return [...new Set(out)];
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
