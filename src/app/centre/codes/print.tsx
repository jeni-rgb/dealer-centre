"use client";
export function PrintButton() {
  return <button className="btn-sm print:hidden" onClick={() => window.print()}>Print</button>;
}
