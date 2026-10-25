import { SHELL_HTML } from './markup';
import { getRoute } from '@/lib/routing';

/** Nav labels, as the sidebar shows them; the small-screen bar repeats the current one. */
const LABELS: Record<string, string> = Object.fromEntries(
  [...SHELL_HTML.matchAll(/data-route="([a-z0-9-]+)"><svg aria-hidden="true"><use href="#[^"]+"\/><\/svg>([^<]+)<\/a>/g)].map(
    (m) => [m[1], m[2]],
  ),
);

/**
 * The shell for one path: that tool's view is shown and every other view hidden, its sidebar item is
 * marked current, and the small-screen bar names it. Same markup the client script switches between.
 */
export function renderShell(slug: string): string {
  if (!getRoute(slug) || !LABELS[slug]) throw new Error(`No view for "${slug}"`);
  // The path's own view goes first in the sheet, so its h1 is the document's first heading.
  const own = new RegExp(`\\s*<!-- =+ [^>]* =+ -->\\s*<section class="view" data-view="${slug}"[^>]*>[\\s\\S]*?</section>`);
  const block = SHELL_HTML.match(own);
  if (!block) throw new Error(`No section for "${slug}"`);
  const html = SHELL_HTML.replace(block[0], '').replace('<main class="sheet" id="sheet">', `<main class="sheet" id="sheet">${block[0]}`);
  return html.replace(/<section class="view" data-view="([a-z0-9-]+)"(?: hidden)?>/g, (_, view: string) =>
    view === slug ? `<section class="view" data-view="${view}">` : `<section class="view" data-view="${view}" hidden>`,
  )
    .replace(`data-route="${slug}">`, `data-route="${slug}" aria-current="page">`)
    .replace(/(<span class="tool" id="mTool">)[^<]*(<\/span>)/, `$1${LABELS[slug]}$2`);
}
