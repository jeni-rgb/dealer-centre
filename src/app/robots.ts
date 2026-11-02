import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/", "/guides/"], disallow: ["/app", "/centre", "/admin", "/till", "/api", "/signup", "/signin", "/demo"] }], sitemap: "https://thedealercentre.co.uk/sitemap.xml" };
}
