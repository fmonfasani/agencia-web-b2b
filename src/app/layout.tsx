import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import StructuredData from "@/components/StructuredData";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${manrope.variable} font-sans antialiased text-text-main bg-white`}
        suppressHydrationWarning
      >
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
