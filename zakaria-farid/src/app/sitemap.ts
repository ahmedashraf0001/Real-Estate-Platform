import { MetadataRoute } from 'next';
import { getAllPropertySlugs } from '@/lib/supabase/queries';

const BASE_URL = 'https://zakariafarid.com';
const locales = ['en', 'ar'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllPropertySlugs().catch(() => []);

  const staticRoutes = ['', '/properties', '/about', '/contact', '/map'].flatMap((path) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.8,
    }))
  );

  const propertyRoutes = slugs.flatMap(({ slug }) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/properties/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }))
  );

  return [...staticRoutes, ...propertyRoutes];
}
