/**
 * The frame for reading pages (guides): the same tinted ground and white sheet as the tools, with a
 * plain top bar instead of the tool sidebar. Links are ordinary links: the tool pages load their own
 * script, so they open with a full page load.
 */
/* eslint-disable @next/next/no-html-link-for-pages */
export function DocFrame({ current, children }: { current: 'guides' | 'privacy' | 'none'; children: React.ReactNode }) {
  return (
    <div className="doc">
      <header className="doc-top">
        <a className="doc-brand" href="/">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M12 6c0-.55-.45-1-1-1H9C7.9 5 7 5.9 7 7v5c0 1.1-.9 2-2 2 1.1 0 2 .9 2 2v5c0 1.1.9 2 2 2h2c.55 0 1-.45 1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="20" cy="14" rx="6" ry="9" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <b>json0</b>
        </a>
        <nav className="doc-nav" aria-label="Site">
          <a href="/json-diff">Tools</a>
          <a href="/guides" aria-current={current === 'guides' ? 'page' : undefined}>Guides</a>
          <a href="/request">Request a feature</a>
        </nav>
      </header>
      <main className="doc-sheet">{children}</main>
      <footer className="doc-foot">
        <a href="/privacy" aria-current={current === 'privacy' ? 'page' : undefined}>Privacy</a>
        <a href="/guides">Guides</a>
        <a href="/llms.txt">llms.txt</a>
        <a href="https://github.com/Siddharthachuahan9/JSON0.dev">Source on GitHub</a>
      </footer>
    </div>
  );
}
