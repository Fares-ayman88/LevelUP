import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LevelUp MVP Demo",
  description: "Interactive education management demo for Egyptian tutoring centers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html suppressHydrationWarning data-scroll-behavior="smooth" lang="en" className="dark">
      <body suppressHydrationWarning className={`${manrope.variable} ${spaceGrotesk.variable} ${ibmPlexSansArabic.variable}`}>{children}</body>
    </html>
  );
}
