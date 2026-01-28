import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import StructuredData from "@/components/StructuredData";
import GoogleTagManager from "@/components/GoogleTagManager";
import Analytics from "@/components/Analytics";
import CookieConsent from "@/components/CookieConsent";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agenciaweb.com"),
  title: {
    default: "Agencia Web | Desarrollo B2B de Alto Rendimiento",
    template: "%s | Agencia Web",
  },
  description:
    "Potenciamos empresas de servicios B2B con desarrollo web de alto rendimiento. Entrega rápida, soporte directo y enfoque total en conversiones.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://agenciaweb.com",
    siteName: "Agencia Web",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Agencia Web B2B",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agencia Web | Desarrollo B2B de Alto Rendimiento",
    description:
      "Potenciamos empresas de servicios B2B con desarrollo web de alto rendimiento.",
  },
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="scroll-smooth">
      <head>
        <GoogleTagManager />
      </head>
      <body
        className={`${manrope.variable} font-sans antialiased text-text-main bg-white`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          {/* GTM noscript fallback */}
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>

          <StructuredData />
          <Analytics />
          {children}
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
