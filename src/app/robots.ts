import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin/", "/onboarding/", "/api/"],
        },
        sitemap: "https://agenciaweb.com/sitemap.xml",
    };
}
