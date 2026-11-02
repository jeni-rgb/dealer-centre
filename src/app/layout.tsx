import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dealer Centre",
  description: "List it once, label it once, sell it on the floor or online.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Dealer Centre", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FDFBEF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
