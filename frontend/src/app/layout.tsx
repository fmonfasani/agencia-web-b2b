import { ReactNode } from "react";
import "./globals.css";
import { RumProvider } from "@/components/providers/RumProvider";
import { ToastContainer } from "@/components/ui/toast";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// This layout is used when no locale is matched,
// and it satisfying Next.js requirement for a root layout.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body>
        <RumProvider>
          {children}
        </RumProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
