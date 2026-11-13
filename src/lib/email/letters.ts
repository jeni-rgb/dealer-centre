/** Every Dealer Centre email, on the same branded shell. Copy has no hyphens, dashes or middle dots. */

import { env } from "@/lib/env";
import { compareMini, dayMarks, esc, labelBadge, receiptCard, renderEmail } from "./layout";

export type Letter = { subject: string; text: string; html: string };

function pricingPage(fromLink: string): string {
  try {
    return `${new URL(fromLink).origin}/#pricing`;
  } catch {
    return "https://thedealercentre.co.uk/#pricing";
  }
}

const SHORT = `Named sales, the minute they go through the till.
What each centre owes you, before payout.
Stock on the floor and what has sold, at every centre.`;

function para(text: string): string {
  return `<p style="margin:0 0 14px;">${esc(text)}</p>`;
}

function appUrl(): string {
  return process.env.DEMO_MODE === "1" ? "" : env.appUrl();
}

export function tasterInviteLetter(name: string, link: string, centreName = "your centre"): Letter {
  const pricing = pricingPage(link);
  const text = `Hello ${name},

${centreName} has a free Basic account ready. 2 weeks of named sales and 25 labels free. Nothing is charged. Then Basic, unless you join Full at £25 a month plus VAT.

${link}

${SHORT}

Full list: ${pricing}

${centreName}
Dealer Centre`;
  const html = renderEmail({
    hero: "2 weeks of named sales",
    preheader: "25 labels free. Nothing is charged.",
    centreName,
    appUrl: appUrl(),
    button: { href: link, label: "Start my 2 weeks" },
    text,
    bodyHtml: `${para(`Hello ${name}. ${centreName} has a free Basic account ready.`)}
${labelBadge("ON US", "25 free labels")}
${dayMarks(0, "14 days of named sales")}
<div style="height:14px;line-height:14px;font-size:1px;">&nbsp;</div>
${compareMini()}
${para("Nothing is charged. Then Basic, unless you join Full at £25 a month plus VAT.")}
<p style="margin:0 0 14px;"><a href="${esc(pricing)}" style="color:#5C5319;">Full list</a></p>`,
  });
  return { subject: "2 free weeks of named sales", text, html };
}

export function tasterEndedLetter(name: string, joinUrl: string, centreName = "your centre"): Letter {
  const pricing = pricingPage(joinUrl);
  const text = `Hello ${name},

Your 2 weeks of named sales have ended. You are on Basic. Nothing is charged.

Join Full, £25 a month plus VAT, by Direct Debit:
${joinUrl}

${SHORT}

Full list: ${pricing}

${centreName}
Dealer Centre`;
  const html = renderEmail({
    hero: "Your 2 weeks have ended",
    preheader: "You are on Basic. Nothing was charged.",
    centreName,
    appUrl: appUrl(),
    button: { href: joinUrl, label: "Join Full" },
    text,
    bodyHtml: `${para(`Hello ${name}. You are on Basic. Nothing was charged.`)}
${dayMarks(14, "Day 14 of 14")}
<div style="height:14px;line-height:14px;font-size:1px;">&nbsp;</div>
${compareMini()}
${para("Full is £25 a month plus VAT, by Direct Debit. One bill for every centre.")}
<p style="margin:0 0 14px;"><a href="${esc(pricing)}" style="color:#5C5319;">Full list</a></p>`,
  });
  return { subject: "Your 2 weeks of named sales have ended", text, html };
}

export function saleLetter(p: { title: string; amount: string; ticket: string; place: string; when: string; href: string; centreName?: string }): Letter {
  const text = `Sold. ${p.title}. ${p.amount}. ${p.ticket}. ${p.place}. ${p.when}.\n\n${p.href}`;
  const html = renderEmail({
    hero: "Sold",
    preheader: `${p.title}, ${p.amount}`,
    centreName: p.centreName,
    appUrl: appUrl(),
    button: { href: p.href, label: "Open Today" },
    text,
    bodyHtml: receiptCard([
      { label: "Item", value: p.title },
      { label: "Paid", value: p.amount },
      { label: "Ticket", value: p.ticket },
      { label: "Where", value: p.place },
      { label: "When", value: p.when },
    ]),
  });
  return { subject: `Sold. ${p.title}. ${p.amount}`, text, html };
}

export function statementLetter(p: { dealerName: string; centreName: string; period: string; net: string; sales: number; href: string }): Letter {
  const text = `${p.dealerName}, your ${p.period} statement at ${p.centreName} is ${p.net}. ${p.sales} sales.\n\n${p.href}`;
  const html = renderEmail({
    hero: `${p.period} statement`,
    preheader: `${p.centreName}. ${p.net}.`,
    centreName: p.centreName,
    appUrl: appUrl(),
    button: { href: p.href, label: "Open statement" },
    text,
    bodyHtml: `${para(`${p.dealerName}, ${p.centreName} owes you this.`)}
${receiptCard([
    { label: "Month", value: p.period },
    { label: "Sales", value: String(p.sales) },
    { label: "Net", value: p.net },
  ])}`,
  });
  return { subject: `${p.period} statement, ${p.centreName}`, text, html };
}

export function welcomeLetter(p: { dealerName: string; addedBy: string; href: string }): Letter {
  const text = `${p.addedBy} added you to ${p.dealerName} on Dealer Centre.\n\nSign in:\n${p.href}`;
  const html = renderEmail({
    hero: `You are on ${p.dealerName}`,
    preheader: `${p.addedBy} added you.`,
    centreName: p.dealerName,
    appUrl: appUrl(),
    button: { href: p.href, label: "Sign in" },
    text,
    bodyHtml: para(`${p.addedBy} added you. The link works once.`),
  });
  return { subject: `You are on ${p.dealerName}`, text, html };
}

export function missingLetter(p: { title: string; ticket: string; amount: string; centreName: string }): Letter {
  const text = `Not on the shelf. ${p.title}. ${p.ticket}. ${p.amount}. ${p.centreName}. Check the pitch and the till. Reply to this email.`;
  const html = renderEmail({
    hero: "Not on the shelf",
    preheader: `${p.title} at ${p.centreName}.`,
    centreName: p.centreName,
    appUrl: appUrl(),
    text,
    bodyHtml: `${para("The runner could not find it. Check the pitch and the till. Reply to this email.")}
${receiptCard([
    { label: "Item", value: p.title },
    { label: "Ticket", value: p.ticket },
    { label: "Sold for", value: p.amount },
    { label: "Centre", value: p.centreName },
  ])}`,
  });
  return { subject: `Not on the shelf. ${p.title}`, text, html };
}

export function signInLetter(href: string): Letter {
  const text = `Sign in to Dealer Centre.\n\n${href}\n\nThe link works once. If you did not ask for this, ignore it.`;
  const html = renderEmail({
    hero: "Sign in",
    preheader: "The link works once.",
    appUrl: appUrl(),
    button: { href, label: "Sign in" },
    text,
    bodyHtml: para("Tap the button. The link works once. If you did not ask for this, ignore it."),
  });
  return { subject: "Your Dealer Centre sign in link", text, html };
}

export function trialLetter(kind: "started" | "ending", whenText: string, pounds: number): Letter {
  const price = `£${pounds} plus VAT`;
  const subject = kind === "started" ? "Your 5 day trial has started" : `Your first payment is on ${whenText}`;
  const text = kind === "started"
    ? `Your 5 day trial has started. Due today: £0. First payment ${price} on ${whenText}. Cancel from Account before then and the subscription is not charged.`
    : `Your trial is £0 until ${whenText}. That day the card is charged ${price}, then each month. Cancel from Account before then and the subscription is not charged.`;
  const html = renderEmail({
    hero: subject,
    preheader: text,
    appUrl: appUrl(),
    button: { href: `${appUrl() || "https://thedealercentre.co.uk"}/app/settings`, label: "Open Account" },
    text,
    bodyHtml: para(text),
  });
  return { subject, text, html };
}
