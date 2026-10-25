import { getGuides, guideMarkdown } from '@/lib/guides';
import { SITE_URL, TOOL_ROUTES } from '@/lib/routing';

/** /llms.txt, following the llmstxt.org format: what json0 is, its tools, and its guides as Markdown. */
export function llmsTxt(): string {
  const tools = TOOL_ROUTES.filter((r) => r.group !== 'Feedback');
  const guides = getGuides();
  return [
    '# json0',
    '',
    `> json0 (${SITE_URL}) is a free set of ${tools.length} JSON, CSV and MongoDB tools that run entirely in the browser: diff, query, validate, format, tables, schema inference, redaction, Extended JSON, ObjectIds, encoders and more. Nothing pasted into a tool is uploaded; the only tool that makes a network request is Ping, and only to the host the user enters.`,
    '',
    'Every tool has its own URL and works without an account. Share links for JSON Diff keep both documents in the URL fragment, which browsers do not send to servers. The source is on GitHub: https://github.com/Siddharthachuahan9/JSON0.dev',
    '',
    '## Tools',
    '',
    ...tools.map((t) => `- [${t.name}](${SITE_URL}/${t.slug}): ${t.description}`),
    '',
    '## Guides',
    '',
    ...guides.map((g) => `- [${g.title}](${SITE_URL}/guides/${g.slug}.md): ${g.description}`),
    '',
    '## Optional',
    '',
    `- [All guides in one file](${SITE_URL}/llms-full.txt): the full Markdown of every guide.`,
    `- [Request a feature](${SITE_URL}/request): ask for a tool or report a bug, by GitHub issue or email.`,
    '',
  ].join('\n');
}

export function llmsFullTxt(): string {
  return [llmsTxt(), ...getGuides().map((g) => '\n---\n\n' + guideMarkdown(g))].join('\n');
}
