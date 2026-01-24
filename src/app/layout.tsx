import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Agencia Web - Desarrollo B2B de Alto Rendimiento",
  description:
    "Conseguí más consultas con una web rápida y mantenida por expertos. Entrega en 10 días, hosting incluido y soporte humano directo.",
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
        {children}
      </body>
    </html>
  );
}
