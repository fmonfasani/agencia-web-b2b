import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "../globals.css";
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
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAuth as requireCustomAuth } from "@/lib/auth/request-auth";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Try to get tenant info for white-labeling
  let branding: any = null;
  try {
    const session = await auth();
    let tenantId = (session?.user as any)?.tenantId;

    if (!tenantId) {
      const custom = await requireCustomAuth();
      if (custom?.session?.tenantId) {
        tenantId = custom.session.tenantId;
      }
    }

    if (tenantId) {
      const tenant = await (prisma.tenant as any).findUnique({
        where: { id: tenantId },
        select: { branding: true },
      });
      branding = tenant?.branding;
    }
  } catch (e) {
    // Silent fail in metadata
  }

  const appName = branding?.appName || "Agencia Web";
  const description = branding?.description || "Potenciamos empresas de servicios B2B con desarrollo web de alto rendimiento. Entrega rápida, soporte directo y enfoque total en conversiones.";

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

  // Resolve tenant branding
  let branding = null;
  try {
    const session = await auth();
    let tenantId = (session?.user as any)?.tenantId;

    if (!tenantId) {
      const custom = await requireCustomAuth();
      if (custom?.session?.tenantId) {
        tenantId = custom.session.tenantId;
      }
    }

    if (tenantId) {
      const tenant = await (prisma.tenant as any).findUnique({
        where: { id: tenantId },
        select: { branding: true },
      });
      branding = tenant?.branding;
    }
  } catch (error) {
    console.error("Layout branding fetch error:", error);
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className={`${manrope.variable} font-sans antialiased text-text-main bg-white scroll-smooth`}>
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
        </div>
      </body>
    </html>
  );
}
