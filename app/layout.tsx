import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supreme Code",
  description: "Multi-agent AI deliberation system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-serif">
        {children}
      </body>
    </html>
  );
}
