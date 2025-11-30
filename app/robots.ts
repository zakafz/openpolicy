import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/auth/", "/create/"],
      },
    ],
    sitemap: "https://openpolicyhq.com/sitemap.xml",
  };
}
