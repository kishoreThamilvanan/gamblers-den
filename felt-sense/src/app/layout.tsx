import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeltSense - Poker Training",
  description: "Live poker training for $1/$2 and $1/$3 NLHE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
