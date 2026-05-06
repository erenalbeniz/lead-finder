import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Nav, MobileNav } from "@/components/nav";
import { AnimatedBackground } from "@/components/animated-background";
import { Toaster } from "@/components/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "LeadFinder · Malta web design lead engine",
  description:
    "Find local Malta businesses that need a new or improved website. Score, audit, and reach out — all from one premium dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} dark`}>
      <body className="relative min-h-screen font-sans">
        <AnimatedBackground />
        <div className="relative flex min-h-screen">
          <Nav />
          <div className="flex-1 min-w-0">
            <MobileNav />
            <main className="px-5 md:px-10 py-8 md:py-10 max-w-[1440px] mx-auto">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
