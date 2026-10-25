/* eslint-disable @next/next/no-html-link-for-pages */
import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { DocFrame } from '@/components/DocFrame';
import { formatDate, renderMarkdown } from '@/lib/guides';
import { PRIVACY_UPDATED } from '@/lib/llms';
import { SITE_URL } from '@/lib/routing';

const title = 'Privacy: how json0 handles your data | json0';
const description =
  'What you paste into json0 is processed in your browser and never sent to json0. No accounts, cookies, analytics or ads. Which requests the site makes, what the host logs, and how to check it yourself.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: { title, description, url: `${SITE_URL}/privacy`, type: 'website', siteName: 'json0' },
  twitter: { card: 'summary', title, description },
};

export default function PrivacyPage() {
  const { html, headings } = renderMarkdown(fs.readFileSync(path.join(process.cwd(), 'content', 'privacy.md'), 'utf8'));
  return (
    <DocFrame current="privacy">
      <div className="guide-grid">
        <article className="guide">
          <h1>How json0 handles your data</h1>
          <p className="guide-lede">Everything you paste is processed in your browser. Here is exactly what the site does and does not send.</p>
          <p className="guide-meta">Updated <time dateTime={PRIVACY_UPDATED}>{formatDate(PRIVACY_UPDATED)}</time></p>
          <div className="guide-body" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
        <aside className="guide-aside" aria-label="About this page">
          <div className="panel">
            <div className="panel-head"><h2>In one look</h2></div>
            <ul className="panel-body privacy-facts">
              <li><b>Your data</b>Processed in your browser, never sent to json0</li>
              <li><b>Accounts</b>None</li>
              <li><b>Cookies</b>None</li>
              <li><b>Analytics and ads</b>None</li>
              <li><b>Fonts</b>Self-hosted on json0.dev</li>
              <li><b>Requests you trigger</b>Ping, to the host you type; the request form, to GitHub or your mail app</li>
              <li><b>Hosting</b>Vercel keeps standard request logs, including IP addresses</li>
            </ul>
          </div>
          <nav className="panel" aria-label="On this page">
            <div className="panel-head"><h2>On this page</h2></div>
            <ul className="panel-body guide-toc">
              {headings.map((h) => (
                <li key={h.id}><a href={`#${h.id}`} dangerouslySetInnerHTML={{ __html: h.html }} /></li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </DocFrame>
  );
}
