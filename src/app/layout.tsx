import { ReactNode } from "react";
import "./globals.css";
import { RumProvider } from "@/components/providers/RumProvider";

// This layout is used when no locale is matched,
// and it satisfying Next.js requirement for a root layout.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <RumProvider>
          {children}
        </RumProvider>
      </body>
    </html>
  );
}
