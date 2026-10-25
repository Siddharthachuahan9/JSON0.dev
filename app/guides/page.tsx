/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { DocFrame } from '@/components/DocFrame';
import { getGuides, guideUrl } from '@/lib/guides';
import { SITE_URL, TOOL_ROUTES } from '@/lib/routing';
import { jsonLd } from '@/lib/seo/jsonld';

const title = 'Guides: JSON, CSV and MongoDB, compared and explained | json0';
const description =
  'Practical guides and honest comparisons for working with JSON, CSV and MongoDB data: diffing, redacting, converting, inferring schemas, ObjectIds, JWTs and JSONPath.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/guides` },
  openGraph: { title, description, url: `${SITE_URL}/guides`, type: 'website', siteName: 'json0' },
  twitter: { card: 'summary', title, description },
};

export default function GuidesIndex() {
  const guides = getGuides();
  const groups = [
    { name: 'Comparisons', items: guides.filter((g) => g.kind === 'comparison') },
    { name: 'How to', items: guides.filter((g) => g.kind === 'guide') },
  ];
  const tools = TOOL_ROUTES.filter((r) => r.group !== 'Feedback');
  const list = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'json0 guides',
    itemListElement: guides.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: guideUrl(g), name: g.title })),
  };

  return (
    <DocFrame current="guides">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />
      <div className="guides-index">
        <div className="title-row">
          <div>
            <h1>Guides</h1>
            <p className="sub">
              <b>{guides.length} guides</b> on comparing, cleaning and converting JSON, CSV and MongoDB data, with the
              json0 tool for each. Every guide is also available as Markdown, and <a href="/llms.txt">llms.txt</a> lists
              them all.
            </p>
          </div>
        </div>
        {groups.map((grp) => (
          <section className="panel guides-group" key={grp.name} aria-labelledby={`g-${grp.name}`}>
            <div className="panel-head"><h2 id={`g-${grp.name}`}>{grp.name}</h2><span className="meta">{grp.items.length} guides</span></div>
            <ul className="panel-body guides-list">
              {grp.items.map((g) => (
                <li key={g.slug}>
                  <a href={`/guides/${g.slug}`}>{g.headline}</a>
                  <p className="note">{g.description}</p>
                  <span className="meta num">{g.minutes} min read</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="panel guides-group" aria-labelledby="g-tools">
          <div className="panel-head"><h2 id="g-tools">What json0 does</h2><span className="meta">{tools.length} tools, all in the browser</span></div>
          <div className="panel-body guide-table">
            <table className="t">
              <thead><tr><th>Tool</th><th>What it does</th></tr></thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.slug}>
                    <td><a href={`/${t.slug}`}>{t.name}</a></td>
                    <td>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DocFrame>
  );
}
