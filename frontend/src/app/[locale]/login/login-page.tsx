/**
 * app/[locale]/login/page.tsx
 *
 * Página de login simple
 * Usa el componente LoginForm
 */

import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Login | Webshooks",
};

export default function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = "es"; // Usar params.locale cuando esté disponible

  return (
    <div>
      <LoginForm locale={locale} />
    </div>
  );
}
