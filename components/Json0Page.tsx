import Script from 'next/script';
import { getTitleMap } from '@/lib/routing';
import { jsonLd } from '@/lib/seo/jsonld';
import { renderShell } from '@/lib/shell/render';

/**
 * One json0 page: the whole shell, server-rendered with the given tool's view showing, plus the client
 * script that runs every tool and switches between them without a reload.
 */
export function Json0Page({ slug, schemas }: { slug: string; schemas: unknown[] }) {
  return (
    <>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      ))}
      <script id="json0-routes" type="application/json" dangerouslySetInnerHTML={{ __html: jsonLd(getTitleMap()) }} />
      <div id="json0" dangerouslySetInnerHTML={{ __html: renderShell(slug) }} />
      <Script src="/json0.js" strategy="afterInteractive" />
    </>
  );
}
