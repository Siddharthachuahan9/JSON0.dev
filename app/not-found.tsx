import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Not found | json0' },
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="nf">
      <div className="nf-brand">
        <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M12 6c0-.55-.45-1-1-1H9C7.9 5 7 5.9 7 7v5c0 1.1-.9 2-2 2 1.1 0 2 .9 2 2v5c0 1.1.9 2 2 2h2c.55 0 1-.45 1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="20" cy="14" rx="6" ry="9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <b>json0</b>
      </div>
      <div className="nf-sheet">
        <h1>No tool at this address</h1>
        <p className="sub">The link may be mistyped, or the tool may have moved. Every json0 tool is listed in the sidebar.</p>
        {/* Plain links on purpose: the tool pages load their own script, so they are opened with a full page load. */}
        <p className="nf-actions">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="btn primary" href="/json-diff">Open JSON Diff</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="btn" href="/request">Request a tool</a>
        </p>
      </div>
    </main>
  );
}
