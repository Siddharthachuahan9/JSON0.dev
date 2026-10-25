/**
 * Guides: Markdown files in content/guides, read at build time. Each one is served three ways:
 * as an HTML page (/guides/<slug>), as raw Markdown for LLMs and scripts (/guides/<slug>.md), and
 * inside /llms-full.txt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import { SITE_URL, getRoute } from '@/lib/routing';

export const AUTHOR = { name: 'Siddhartha Chauhan', url: 'https://sidstack.in' };

/** Reading order on /guides and in llms.txt. */
const ORDER = [
  'json-diff-tools-compared',
  'mongodb-json-tools-compared',
  'redact-secrets-before-sharing-json',
  'compare-json-ignore-array-order',
  'json-to-csv-nested-objects',
  'json-schema-typescript-zod-from-json',
  'compare-two-csv-files-by-key',
  'mongodb-objectid-timestamp',
  'decode-jwt-safely',
  'jsonpath-cheat-sheet',
];

export interface Guide {
  slug: string;
  /** the full title, for search results and the Markdown version */
  title: string;
  /** the short headline on the page (two lines at most on a phone) */
  headline: string;
  description: string;
  date: string;
  kind: 'comparison' | 'guide';
  /** slug of the json0 tool the guide leads to */
  tool: string;
  markdown: string;
  html: string;
  headings: { id: string; html: string }[];
  minutes: number;
}

const DIR = path.join(process.cwd(), 'content', 'guides');

const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parse(slug: string): Guide {
  const raw = fs.readFileSync(path.join(DIR, `${slug}.md`), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n+([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`content/guides/${slug}.md has no front matter`);
  const meta: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(': ');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 2).trim();
  }
  for (const k of ['title', 'description', 'date', 'kind', 'tool']) {
    if (!meta[k]) throw new Error(`content/guides/${slug}.md is missing "${k}"`);
  }
  if (!getRoute(meta.tool)) throw new Error(`content/guides/${slug}.md names an unknown tool "${meta.tool}"`);

  const markdown = m[2].trim() + '\n';
  const headings: Guide['headings'] = [];
  const md = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const id = slugify(inner);
        if (depth === 2) headings.push({ id, html: inner });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href) && !href.startsWith(SITE_URL);
        return `<a href="${href}"${title ? ` title="${title}"` : ''}${external ? ' rel="noopener"' : ''}>${text}</a>`;
      },
    },
  });
  // tables scroll sideways inside their own box on a phone, never the page
  const html = (md.parse(markdown) as string).replace(/<table>/g, '<div class="guide-table"><table>').replace(/<\/table>/g, '</table></div>');
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: meta.title,
    headline: meta.headline || meta.title,
    description: meta.description,
    date: meta.date,
    kind: meta.kind === 'comparison' ? 'comparison' : 'guide',
    tool: meta.tool,
    markdown,
    html,
    headings,
    minutes: Math.max(1, Math.round(words / 220)),
  };
}

let cache: Guide[] | null = null;

export function getGuides(): Guide[] {
  if (!cache) {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
    const missing = files.filter((f) => !ORDER.includes(f));
    if (missing.length) throw new Error(`Add ${missing.join(', ')} to ORDER in lib/guides.ts`);
    cache = ORDER.map(parse);
  }
  return cache;
}

export function getGuide(slug: string): Guide | null {
  return getGuides().find((g) => g.slug === slug) ?? null;
}

export const guideUrl = (g: Guide) => `${SITE_URL}/guides/${g.slug}`;

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** The Markdown version of a guide, as served at /guides/<slug>.md and in llms-full.txt. */
export function guideMarkdown(g: Guide): string {
  return [
    `# ${g.title}`,
    '',
    `> ${g.description}`,
    '',
    `By ${AUTHOR.name} (${AUTHOR.url}), ${formatDate(g.date)}. Canonical page: ${guideUrl(g)}`,
    `Tool: ${getRoute(g.tool)!.name}, ${SITE_URL}/${g.tool}`,
    '',
    // site-relative links become absolute, so the file makes sense outside json0.dev
    g.markdown.replace(/\]\(\//g, `](${SITE_URL}/`),
  ].join('\n');
}
