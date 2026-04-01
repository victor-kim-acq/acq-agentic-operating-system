import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACQ Agentic Operating System",
  description: "Agentic operating system for ACQ Vantage business processes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
