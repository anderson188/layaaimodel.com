import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { DISCLAIMER, SITE_DESCRIPTION, SITE_TITLE, SITE_URL, UPSTREAM_REPO } from "@/lib/site";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  applicationName: SITE_TITLE,
  alternates: { canonical: `${SITE_URL}/` },
  robots: { index: true, follow: true },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "layaaimodel.com",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col bg-paper pb-16 font-sans text-ink antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
        >
          Skip to content
        </a>
        <Header />
        <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:py-16">
          {children}
        </main>
        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-5 py-2.5 text-center text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p>{DISCLAIMER}</p>
            <a className="text-accent hover:underline" href={UPSTREAM_REPO}>
              Upstream repository
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
