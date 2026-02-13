import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudioFlow Demo Lab",
  description: "Complex frontend-only app for deterministic automation demos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
