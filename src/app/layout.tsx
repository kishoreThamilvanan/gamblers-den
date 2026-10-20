import type { Metadata } from "next";
import "./globals.css";
import { AdminShortcutListener } from "@/components/poker/AdminShortcutListener";

export const metadata: Metadata = {
  title: "Gambler's Den - Casino Gaming & Poker Training",
  description: "Live casino simulation & poker training with real-time AI coach",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AdminShortcutListener />
        {children}
      </body>
    </html>
  );
}

