import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  const messagesMap: Record<string, () => Promise<any>> = {
    es: () => import("../../messages/es.json"),
    en: () => import("../../messages/en.json"),
  };

  const loadMessages = messagesMap[locale] || messagesMap.es;

  return {
    locale,
    messages: (await loadMessages()).default,
  };
});
