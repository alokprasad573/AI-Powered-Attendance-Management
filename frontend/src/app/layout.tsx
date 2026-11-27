import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { AppProviders } from "@/components/providers/app-providers";
import {
  SITE_DESCRIPTION,
  SITE_ICON_PATH,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TITLE_DEFAULT,
  SITE_TITLE_TEMPLATE,
  SITE_URL,
} from "@/constants/seo";
import { buildWebApplicationJsonLd, serializeJsonLd } from "@/services/seo";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: SITE_TITLE_TEMPLATE,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_ICON_PATH,
        alt: `${SITE_NAME} emblem`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      {
        url: SITE_ICON_PATH,
        type: "image/svg+xml",
      },
    ],
    shortcut: SITE_ICON_PATH,
    apple: SITE_ICON_PATH,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090A0B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const jsonLdPayload = serializeJsonLd(buildWebApplicationJsonLd());

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body className="relative isolate min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased selection:bg-[#B9D0D8]/25 selection:text-[#F5F6F6]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdPayload }}
        />
        <a
          href="#main-content"
          className="visually-hidden fixed left-4 top-4 z-[95] rounded-[10px] bg-[var(--accent-primary)] px-4 py-2 font-semibold text-[var(--bg-primary)] shadow-lg"
        >
          Skip to main content
        </a>
        <AmbientBackground />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
