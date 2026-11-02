import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://thedealercentre.co.uk";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/guides/dealers`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guides/centres`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
