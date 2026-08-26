import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRIME TECHNICAL MASTER — F&O SCANNER",
  description: "Live NSE F&O stock scanner powered by Upstox market data.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
