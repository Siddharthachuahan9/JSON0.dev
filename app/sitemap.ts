import type { MetadataRoute } from 'next';
import { getGuides, guideUrl } from '@/lib/guides';
import { SITE_URL, TOOL_ROUTES } from '@/lib/routing';

export const dynamic = 'force-static';

const UPDATED = '2026-10-25';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: UPDATED, changeFrequency: 'weekly', priority: 1 },
    ...TOOL_ROUTES.map((r) => ({
      url: `${SITE_URL}/${r.slug}`,
      lastModified: UPDATED,
      changeFrequency: 'monthly' as const,
      priority: r.group === 'Feedback' ? 0.4 : r.group === 'JSON' ? 0.9 : 0.8,
    })),
    { url: `${SITE_URL}/guides`, lastModified: UPDATED, changeFrequency: 'weekly', priority: 0.8 },
    ...getGuides().map((g) => ({ url: guideUrl(g), lastModified: g.date, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
