import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PaperScout AI — Academic venue discovery & recommendation",
  description:
    "Search academic papers, journals, special issues, and conferences, and get AI-assisted venue recommendations for your abstract. Sample/mock data MVP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <SiteNav />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[var(--border)] px-4 py-6 text-center text-xs text-[var(--muted-foreground)]">
          PaperScout AI — MVP. Venue data shown is unverified sample/mock data.
        </footer>
      </body>
    </html>
  );
}
