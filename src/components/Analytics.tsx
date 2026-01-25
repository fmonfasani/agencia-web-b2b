"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
      trackPageView(url);
    }
  }, [pathname, searchParams]);

  return null;
}
