import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Haziri.AI — AI-Powered Attendance & Identity Platform",
  description:
    "AI-powered facial recognition attendance management system for teachers and students.",
  icons: {
    icon: [
      {
        url: "/brand/haziri-mark.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/brand/haziri-mark.svg",
    apple: "/brand/haziri-mark.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#090A0B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body className="relative isolate min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased selection:bg-[#B9D0D8]/25 selection:text-[#F5F6F6]">
        <a
          href="#main-content"
          className="visually-hidden fixed left-4 top-4 z-50 rounded-[10px] bg-[var(--accent-primary)] px-4 py-2 font-semibold text-[var(--bg-primary)] shadow-lg"
        >
          Skip to main content
        </a>
        <AmbientBackground />
        <div className="relative z-10 min-h-dvh">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
