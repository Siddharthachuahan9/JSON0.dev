/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocFrame } from '@/components/DocFrame';
import { AUTHOR, formatDate, getGuide, getGuides, guideUrl } from '@/lib/guides';
import { SITE_URL, getRoute } from '@/lib/routing';
import { jsonLd } from '@/lib/seo/jsonld';

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  const url = guideUrl(g);
  return {
    title: { absolute: `${g.title} | json0` },
    description: g.description,
    authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
    alternates: { canonical: url, types: { 'text/markdown': `${url}.md` } },
    openGraph: {
      title: g.title,
      description: g.description,
      url,
      type: 'article',
      siteName: 'json0',
      publishedTime: g.date,
      authors: [AUTHOR.url],
    },
    twitter: { card: 'summary', title: g.title, description: g.description },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const tool = getRoute(g.tool)!;
  const url = guideUrl(g);
  const others = getGuides().filter((x) => x.slug !== g.slug);
  const related = [...others.filter((x) => x.tool === g.tool || x.kind === g.kind), ...others].filter(
    (x, i, a) => a.indexOf(x) === i,
  ).slice(0, 4);

  const article = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: g.title,
    description: g.description,
    datePublished: g.date,
    dateModified: g.date,
    author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
    publisher: { '@type': 'Organization', name: 'json0', url: SITE_URL },
    mainEntityOfPage: url,
    url,
    inLanguage: 'en',
    about: { '@type': 'SoftwareApplication', name: tool.name, url: `${SITE_URL}/${tool.slug}`, applicationCategory: 'DeveloperApplication' },
    encoding: { '@type': 'MediaObject', encodingFormat: 'text/markdown', contentUrl: `${url}.md` },
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'json0', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
      { '@type': 'ListItem', position: 3, name: g.title, item: url },
    ],
  };

  return (
    <DocFrame current="guides">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <div className="guide-grid">
        <article className="guide">
          <h1>{g.headline}</h1>
          <p className="guide-lede">{g.description}</p>
          <p className="guide-meta">
            By <a href={AUTHOR.url}>{AUTHOR.name}</a>
            <span aria-hidden="true"> · </span>
            <time dateTime={g.date}>{formatDate(g.date)}</time>
            <span aria-hidden="true"> · </span>
            {g.minutes} min read
            <span aria-hidden="true"> · </span>
            <a href={`/guides/${g.slug}.md`} type="text/markdown">Markdown version</a>
          </p>
          <div className="guide-body" dangerouslySetInnerHTML={{ __html: g.html }} />
        </article>
        <aside className="guide-aside" aria-label="About this guide">
          <div className="panel">
            <div className="panel-head"><h2>Try it</h2></div>
            <div className="panel-body">
              <p className="guide-tool">{tool.name}</p>
              <p className="note">{tool.description}</p>
              <a className="btn primary guide-open" href={`/${tool.slug}`}>Open {tool.name}</a>
            </div>
          </div>
          {g.headings.length > 2 && (
            <nav className="panel" aria-label="On this page">
              <div className="panel-head"><h2>On this page</h2></div>
              <ul className="panel-body guide-toc">
                {g.headings.map((h) => (
                  <li key={h.id}><a href={`#${h.id}`} dangerouslySetInnerHTML={{ __html: h.html }} /></li>
                ))}
              </ul>
            </nav>
          )}
          <nav className="panel" aria-label="More guides">
            <div className="panel-head"><h2>More guides</h2></div>
            <ul className="panel-body guide-more">
              {related.map((x) => (
                <li key={x.slug}><a href={`/guides/${x.slug}`}>{x.headline}</a></li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </DocFrame>
  );
}
