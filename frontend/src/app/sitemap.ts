import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://agenciaweb.com";
  const locales = ["es", "en"];
  const publicRoutes = ["", "/auth/sign-in"];

  const entries: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    publicRoutes.forEach((route) => {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: route === "" ? 1 : 0.8,
      });
    });
  });

  return entries;
}
