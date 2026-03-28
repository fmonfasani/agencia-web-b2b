import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
  useMessages: () => ({}),
  useTimeZone: () => "UTC",
}));

// Mock next/navigation or i18n routing
vi.mock("@/i18n/routing", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ children, ...props }: any) =>
    React.createElement("a", props, children),
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  trackCTAClick: vi.fn(),
  trackNavigation: vi.fn(),
  trackWhatsAppClick: vi.fn(),
  trackFormSubmit: vi.fn(),
}));

// Mock next-auth to avoid native next/server dependency branching in tests
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn().mockResolvedValue(null),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

// Mock lucide-react (Explicit named icons used in tests/components)
vi.mock("lucide-react", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icon = ({ children, ...props }: any) =>
    React.createElement("div", props, children);
  return {
    MessageCircle: icon,
    Code2: icon,
    Menu: icon,
    X: icon,
    Languages: icon,
    ArrowUpRight: icon,
    Send: icon,
    Mail: icon,
    MapPin: icon,
    CheckCircle2: icon,
  };
});
