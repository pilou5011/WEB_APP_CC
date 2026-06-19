import type { MetadataRoute } from 'next';
import { SITE_URL, absoluteUrl } from '@/lib/site-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  /** Accueil en priorité maximale ; pages légales indexées mais secondaires. */
  const entries: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'];
    priority: number;
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1 },
    { path: '/mentions-legales', changeFrequency: 'yearly', priority: 0.4 },
    { path: '/politique-confidentialite', changeFrequency: 'yearly', priority: 0.4 },
    { path: '/conditions-generales-utilisation', changeFrequency: 'yearly', priority: 0.4 },
  ];

  return entries.map(({ path, changeFrequency, priority }) => ({
    url: path === '' ? SITE_URL : absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
