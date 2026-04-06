import { ReactNode } from "react";
import "./globals.css";
import { RumProvider } from "@/components/providers/RumProvider";
import { ToastContainer } from "@/components/ui/toast";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

// Root layout — must own <html> and <body> in Next.js app router.
// The [locale]/layout.tsx renders providers inside <body> without re-declaring these tags.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${manrope.variable} font-sans antialiased`}
      >
        <RumProvider>{children}</RumProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
