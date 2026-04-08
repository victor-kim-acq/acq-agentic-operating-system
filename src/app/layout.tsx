import type { Metadata } from "next";
import Link from "next/link";
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
      <body className="antialiased">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Canvas
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/mits"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              MITs
            </Link>
            <Link
              href="/members"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Members
            </Link>
            <Link
              href="/campaigns"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Campaigns
            </Link>
          </div>
          <span className="text-xs text-slate-400">ACQ Agentic OS</span>
        </nav>
        <div className="pt-[44px]">{children}</div>
      </body>
    </html>
  );
}
