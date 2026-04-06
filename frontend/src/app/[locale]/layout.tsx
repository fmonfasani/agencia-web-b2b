import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import StructuredData from "@/components/StructuredData";
import GoogleTagManager from "@/components/GoogleTagManager";
import Analytics from "@/components/Analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import CookieConsent from "@/components/CookieConsent";
import SalesChatWidget from "@/components/SalesChatWidget";
import BrandingProvider from "@/components/BrandingProvider";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Branding will be provided by BrandingProvider (client-side from localStorage or context)
  // Don't fetch from DB in server-side metadata - use defaults instead
  const branding: any = null;

  const appName = branding?.appName || "Agencia Web";
  const description =
    branding?.description ||
    "Potenciamos empresas de servicios B2B con desarrollo web de alto rendimiento. Entrega rápida, soporte directo y enfoque total en conversiones.";

  return {
    metadataBase: new URL("https://agenciaweb.com"),
    title: {
      default: `${appName} | B2B Growth Platform`,
      template: `%s | ${appName}`,
    },
    description,
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "es_AR",
      url: "https://agenciaweb.com",
      siteName: appName,
      images: [
        {
          url: branding?.logoUrl || "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: appName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${appName} | Desarrollo B2B`,
      description,
    },
  };
}
type Locale = (typeof routing.locales)[number];

const isLocale = (value: string): value is Locale =>
  routing.locales.includes(value as Locale);

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = await getMessages();

  // Branding is handled client-side by BrandingProvider
  // This avoids server-side DB calls that would block rendering
  const branding = null;

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <BrandingProvider branding={branding}>
        <GoogleTagManager />
        <StructuredData />
        <Analytics />
        <VercelAnalytics />
        {children}
        <CookieConsent />
        <SalesChatWidget />
      </BrandingProvider>
    </NextIntlClientProvider>
  );
}
