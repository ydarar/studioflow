import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StudioFlow Sample App",
  description: "Deterministic sample app for StudioFlow flows"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
