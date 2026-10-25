import { getGuide, getGuides, guideMarkdown, guideUrl } from '@/lib/guides';

/* Served at /guides/<slug>.md through a rewrite in next.config.js. */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return getGuides().map((g) => ({ slug: g.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) return new Response('Not found\n', { status: 404 });
  return new Response(guideMarkdown(g), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${guideUrl(g)}>; rel="canonical"`,
    },
  });
}
