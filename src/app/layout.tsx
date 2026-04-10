import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased" style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}>
        <nav
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm px-6 py-3 flex items-center justify-between border-b"
          style={{
            background: "rgba(255,255,255,0.92)",
            borderColor: "var(--neutral-200)",
          }}
        >
          <div className="flex items-center gap-6">
            {[
              { href: "/", label: "Canvas" },
              { href: "/dashboard", label: "Dashboard" },
              { href: "/mits", label: "MITs" },
              { href: "/members", label: "Members" },
              { href: "/agents", label: "Agents" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm transition-colors"
                style={{ color: "var(--neutral-500)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--neutral-800)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--neutral-500)")}
              >
                {label}
              </Link>
            ))}
          </div>
          <span className="text-xs" style={{ color: "var(--neutral-400)" }}>ACQ Agentic OS</span>
        </nav>
        <div className="pt-[44px]">{children}</div>
      </body>
    </html>
  );
}
