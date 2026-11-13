/** Table email shell. Inline styles, bulletproof button, light colours so Gmail, Apple Mail and Outlook keep the brand. */

export const EMAIL = {
  cream: "#FDFBEF",
  page: "#F4F0E4",
  olive: "#5C5319",
  gold: "#C2B34A",
  goldSoft: "#F3EFD4",
  ink: "#1A1A17",
  muted: "#6E6A58",
  line: "#E4DECB",
  white: "#FFFFFF",
};

const FONT = "Montserrat, Arial, Helvetica, sans-serif";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function pounds(pence: number): string {
  const v = Math.abs(pence) / 100;
  const n = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return `${pence < 0 ? "minus " : ""}£${n}`;
}

export function button(href: string, label: string): string {
  const h = esc(href);
  const l = esc(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${EMAIL.olive}">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${h}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="16%" stroke="f" fillcolor="${EMAIL.olive}">
<w:anchorlock/>
<center style="color:${EMAIL.cream};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;">${l}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${h}" style="display:inline-block;background:${EMAIL.olive};color:${EMAIL.cream};font-family:${FONT};font-size:16px;font-weight:700;line-height:48px;text-align:center;text-decoration:none;padding:0 28px;border-radius:8px;">${l}</a>
<!--<![endif]-->
</td></tr></table>`;
}

/** Fourteen day marks. filled is how many days have been used. */
export function dayMarks(filled: number, caption: string): string {
  const cells = Array.from({ length: 14 }, (_, i) => {
    const on = i < filled;
    return `<td width="16" height="10" bgcolor="${on ? EMAIL.olive : EMAIL.goldSoft}" style="font-size:1px;line-height:10px;">&nbsp;</td>${i < 13 ? `<td width="4" style="font-size:1px;line-height:1px;">&nbsp;</td>` : ""}`;
  }).join("");
  return `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:16px;color:${EMAIL.muted};">${esc(caption)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`;
}

export function labelBadge(kicker: string, title: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;"><tr>
<td width="8" bgcolor="${EMAIL.gold}" style="font-size:1px;line-height:1px;">&nbsp;</td>
<td bgcolor="${EMAIL.white}" style="padding:14px 16px;border:1px solid ${EMAIL.line};border-left:0;">
<div style="font-family:${FONT};font-size:11px;letter-spacing:0.08em;font-weight:700;color:${EMAIL.olive};">${esc(kicker)}</div>
<div style="font-family:${FONT};font-size:22px;line-height:28px;font-weight:700;color:${EMAIL.ink};">${esc(title)}</div>
</td></tr></table>`;
}

export function compareMini(): string {
  const cell = (title: string, price: string, line: string, bg: string, color: string) => `<td width="50%" valign="top" bgcolor="${bg}" style="padding:14px 12px;border:1px solid ${EMAIL.line};">
<div style="font-family:${FONT};font-size:11px;letter-spacing:0.06em;font-weight:700;color:${color};">${esc(title)}</div>
<div style="font-family:${FONT};font-size:18px;line-height:24px;font-weight:700;color:${EMAIL.ink};margin-top:4px;">${esc(price)}</div>
<div style="font-family:${FONT};font-size:13px;line-height:18px;color:${EMAIL.muted};margin-top:6px;">${esc(line)}</div>
</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;"><tr>
${cell("BASIC", "Free", "One printed total from each centre.", EMAIL.white, EMAIL.muted)}
<td width="8" style="font-size:1px;">&nbsp;</td>
${cell("FULL", "£25 a month", "Named sales. One bill. Direct Debit.", EMAIL.goldSoft, EMAIL.olive)}
</tr></table>`;
}

export function receiptCard(rows: { label: string; value: string }[]): string {
  const body = rows.map((r) => `<tr>
<td style="padding:8px 0;font-family:${FONT};font-size:13px;color:${EMAIL.muted};border-bottom:1px solid ${EMAIL.line};">${esc(r.label)}</td>
<td align="right" style="padding:8px 0;font-family:${FONT};font-size:14px;font-weight:700;color:${EMAIL.ink};border-bottom:1px solid ${EMAIL.line};">${esc(r.value)}</td>
</tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL.white}" style="margin:0 0 16px;border:1px solid ${EMAIL.line};"><tr><td style="padding:8px 16px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>
</td></tr></table>`;
}

export type EmailParts = {
  hero: string;
  preheader: string;
  bodyHtml: string;
  text: string;
  button?: { href: string; label: string };
  centreName?: string;
  appUrl?: string;
};

export function renderEmail(p: EmailParts): string {
  const origin = p.appUrl === "" ? "" : (p.appUrl ?? "https://thedealercentre.co.uk").replace(/\/$/, "");
  const logo = `${origin}/icon-192.png`;
  const centre = p.centreName?.trim() || "Dealer Centre";
  const btn = p.button ? `<div style="margin:8px 0 4px;">${button(p.button.href, p.button.label)}</div>` : "";
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(p.hero)}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&amp;display=swap" rel="stylesheet">
<style>
:root { color-scheme: light only; }
@media (prefers-color-scheme: dark) {
  .dc-page, .dc-page table, .dc-card { background: ${EMAIL.cream} !important; }
  .dc-ink { color: ${EMAIL.ink} !important; }
  .dc-muted { color: ${EMAIL.muted} !important; }
}
</style>
</head>
<body class="dc-page" style="margin:0;padding:0;background:${EMAIL.page};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(p.preheader)}</div>
<table role="presentation" class="dc-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL.page}" style="background:${EMAIL.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td class="dc-card" bgcolor="${EMAIL.cream}" style="background:${EMAIL.cream};padding:28px 28px 8px;border-radius:16px 16px 0 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" valign="middle"><img src="${logo}" width="40" height="40" alt="Dealer Centre" style="display:block;border:0;outline:none;width:40px;height:40px;"></td>
<td valign="middle" style="padding-left:10px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.04em;color:${EMAIL.olive};">DEALER CENTRE</td>
</tr></table>
<h1 class="dc-ink" style="margin:22px 0 8px;font-family:${FONT};font-size:28px;line-height:34px;font-weight:700;color:${EMAIL.ink};">${esc(p.hero)}</h1>
</td></tr>
<tr><td class="dc-card" bgcolor="${EMAIL.cream}" style="background:${EMAIL.cream};padding:0 28px 28px;">
<div class="dc-muted" style="font-family:${FONT};font-size:15px;line-height:22px;color:${EMAIL.muted};">${p.bodyHtml}</div>
${btn}
</td></tr>
<tr><td style="padding:16px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${EMAIL.muted};">
${esc(centre)}<br>
Dealer Centre<br>
<a href="mailto:hello@thedealercentre.co.uk" style="color:${EMAIL.olive};text-decoration:underline;">hello@thedealercentre.co.uk</a><br>
<a href="mailto:hello@thedealercentre.co.uk?subject=Stop%20these%20notes" style="color:${EMAIL.olive};text-decoration:underline;">Unsubscribe</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
