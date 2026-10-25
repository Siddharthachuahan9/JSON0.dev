/* The json0 shell: the SVG sprite, the frame, the sidebar and every tool view, ported from the approved
   framed-sheet prototype. public/json0.js brings it to life; renderShell() picks the view a path shows,
   so each route ships its own heading and finding line in the HTML. */
export const SHELL_HTML = String.raw`<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="i-mark" viewBox="0 0 32 32"><path d="M12 6c0-.55-.45-1-1-1H9C7.9 5 7 5.9 7 7v5c0 1.1-.9 2-2 2 1.1 0 2 .9 2 2v5c0 1.1.9 2 2 2h2c.55 0 1-.45 1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><ellipse cx="20" cy="14" rx="6" ry="9" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="i-diff" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="5" height="11" rx="1"/><rect x="9" y="2.5" width="5" height="11" rx="1"/><path d="M4.5 6v3M11.5 6v3M10 7.5h3"/></g></symbol>
    <symbol id="i-query" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></g></symbol>
    <symbol id="i-valid" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="m5.5 8 1.8 1.8L10.8 6.3"/></g></symbol>
    <symbol id="i-ip" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c1.8 1.6 2.6 3.6 2.6 6S9.8 12.4 8 14C6.2 12.4 5.4 10.4 5.4 8S6.2 3.6 8 2Z"/></g></symbol>
    <symbol id="i-ping" viewBox="0 0 16 16"><path d="M1.5 8.5h3l1.8-4.5 3.4 8 1.8-3.5h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-b64" viewBox="0 0 16 16"><path d="M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-jwt" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="10.5" r="3"/><path d="m7.6 8.4 5.9-5.9M11.5 4.5l1.5 1.5M10 6l1.2 1.2"/></g></symbol>
    <symbol id="i-hash" viewBox="0 0 16 16"><path d="M6 2.5 5 13.5M11 2.5l-1 11M2.5 5.5h11M2 10.5h11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
    <symbol id="i-uuid" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="5.5" cy="5.5" r=".6" fill="currentColor"/><circle cx="10.5" cy="10.5" r=".6" fill="currentColor"/><circle cx="8" cy="8" r=".6" fill="currentColor"/></g></symbol>
    <symbol id="i-xml" viewBox="0 0 16 16"><path d="M2 5h9.5M9 2.5 11.5 5 9 7.5M14 11H4.5M7 8.5 4.5 11 7 13.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-lock" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></g></symbol>
    <symbol id="i-search" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></g></symbol>
    <symbol id="i-menu" viewBox="0 0 16 16"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
    <symbol id="i-x" viewBox="0 0 16 16"><path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
    <symbol id="i-moon" viewBox="0 0 16 16"><path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
    <symbol id="i-sun" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/></g></symbol>
    <symbol id="i-upload" viewBox="0 0 16 16"><path d="M8 10.5V2.5M5 5.5l3-3 3 3M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-swap" viewBox="0 0 16 16"><path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-format" viewBox="0 0 16 16"><path d="M2.5 3.5h11M5 6.5h8.5M5 9.5h8.5M2.5 12.5h11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
    <symbol id="i-clear" viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5a1 1 0 0 0 1 1h3.8a1 1 0 0 0 1-1l.6-8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-link" viewBox="0 0 16 16"><path d="M6.8 9.2a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 0 0-4-4l-.6.6M9.2 6.8a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 0 0 4 4l.6-.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
    <symbol id="i-copy" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5v-.5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6.5a1 1 0 0 0 1 1h.5"/></g></symbol>
    <symbol id="i-table" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M2 10h12M6.5 6.5v7"/></g></symbol>
    <symbol id="i-schema" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="5" height="4" rx="1"/><rect x="9" y="7" width="5" height="3" rx="1"/><rect x="9" y="11.5" width="5" height="3" rx="1"/><path d="M4.5 6v6.5H9M4.5 8.5H9"/></g></symbol>
    <symbol id="i-csv" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 1.8h5.5L13 5.3v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1Z"/><path d="M9.5 1.8v3.5H13M5.5 8.5h5M5.5 11h5M8 7v5.5"/></g></symbol>
    <symbol id="i-csvdiff" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M8 2.5v11M4.5 9.5h1.5M10 9.5h2M11 8.5v2"/></g></symbol>
    <symbol id="i-ejson" viewBox="0 0 16 16"><path d="M5.5 2.5H5a1.5 1.5 0 0 0-1.5 1.5v2.5L2 8l1.5 1.5V12A1.5 1.5 0 0 0 5 13.5h.5M10.5 2.5h.5A1.5 1.5 0 0 1 12.5 4v2.5L14 8l-1.5 1.5V12a1.5 1.5 0 0 1-1.5 1.5h-.5M6.5 8h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-oid" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.2 1.4"/></g></symbol>
    <symbol id="i-filter" viewBox="0 0 16 16"><path d="M2.5 3h11L9.3 8.2v4.3l-2.6 1V8.2L2.5 3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
    <symbol id="i-bars" viewBox="0 0 16 16"><path d="M2.5 4h11M2.5 8h7M2.5 12h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
    <symbol id="i-redact" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8 13 3.8v3.7c0 3-2.1 5.4-5 6.7-2.9-1.3-5-3.7-5-6.7V3.8l5-2Z"/><path d="M5.5 8h5"/></g></symbol>
    <symbol id="i-chev" viewBox="0 0 16 16"><path d="m4.5 6.5 3.5 3.5 3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-plus" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
    <symbol id="i-alert" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.8v3.6M8 11h0"/></g></symbol>
    <symbol id="i-request" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2.5h10a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H7.5l-3.5 2.5V11H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"/><path d="M8 4.5v4M6 6.5h4"/></g></symbol>
  </defs>
</svg>

<div class="app" id="app">
  <div class="brand"><svg class="mark" aria-hidden="true"><use href="#i-mark"/></svg><b>json0</b></div>

  <header class="topbar">
    <button class="icon-btn m-only" id="menuBtn" aria-label="Open the tool menu" aria-controls="nav" aria-expanded="false"><svg><use href="#i-menu"/></svg></button>
    <span class="m-brand m-only"><svg class="mark" aria-hidden="true"><use href="#i-mark"/></svg><b>json0</b><span class="tool" id="mTool">Diff</span></span>
    <button class="search" id="searchBtn" aria-label="Search tools and actions (Cmd+K)"><svg aria-hidden="true"><use href="#i-search"/></svg><span>Search tools and actions</span><kbd>&#8984;K</kbd></button>
    <div class="top-right">
      <p class="local" id="localNote"><svg aria-hidden="true"><use href="#i-lock"/></svg>Local only: nothing you paste leaves this browser</p>
      <button class="icon-btn" id="themeBtn" aria-label="Switch to the dark theme"><svg aria-hidden="true"><use href="#i-moon" id="themeIcon"/></svg><span class="theme-label" id="themeLabel">Dark</span></button>
    </div>
  </header>

  <nav class="sidebar" id="nav" aria-label="Tools">
    <div class="side-close"><span class="m-brand"><svg class="mark" aria-hidden="true"><use href="#i-mark"/></svg><b>json0</b></span><button class="icon-btn" id="menuClose" aria-label="Close the tool menu"><svg><use href="#i-x"/></svg></button></div>
    <p class="group-label">JSON</p>
    <a class="nav-item" href="/json-diff" data-route="json-diff"><svg aria-hidden="true"><use href="#i-diff"/></svg>Diff</a>
    <a class="nav-item" href="/jsonpath" data-route="jsonpath"><svg aria-hidden="true"><use href="#i-query"/></svg>Query</a>
    <a class="nav-item" href="/json-validate" data-route="json-validate"><svg aria-hidden="true"><use href="#i-valid"/></svg>Validate</a>
    <a class="nav-item" href="/json-format" data-route="json-format"><svg aria-hidden="true"><use href="#i-format"/></svg>Format</a>
    <a class="nav-item" href="/json-table" data-route="json-table"><svg aria-hidden="true"><use href="#i-table"/></svg>Table</a>
    <a class="nav-item" href="/json-schema" data-route="json-schema"><svg aria-hidden="true"><use href="#i-schema"/></svg>Schema and types</a>
    <a class="nav-item" href="/xml-to-json" data-route="xml-to-json"><svg aria-hidden="true"><use href="#i-xml"/></svg>XML to JSON</a>
    <p class="group-label">CSV</p>
    <a class="nav-item" href="/csv" data-route="csv"><svg aria-hidden="true"><use href="#i-csv"/></svg>CSV viewer</a>
    <a class="nav-item" href="/csv-diff" data-route="csv-diff"><svg aria-hidden="true"><use href="#i-csvdiff"/></svg>CSV diff</a>
    <p class="group-label">MongoDB</p>
    <a class="nav-item" href="/mongo-ejson" data-route="mongo-ejson"><svg aria-hidden="true"><use href="#i-ejson"/></svg>Extended JSON</a>
    <a class="nav-item" href="/objectid" data-route="objectid"><svg aria-hidden="true"><use href="#i-oid"/></svg>ObjectId</a>
    <a class="nav-item" href="/mongo-query" data-route="mongo-query"><svg aria-hidden="true"><use href="#i-filter"/></svg>Query tester</a>
    <a class="nav-item" href="/mongo-schema" data-route="mongo-schema"><svg aria-hidden="true"><use href="#i-bars"/></svg>Schema analyzer</a>
    <p class="group-label">Privacy</p>
    <a class="nav-item" href="/redact" data-route="redact"><svg aria-hidden="true"><use href="#i-redact"/></svg>Redact</a>
    <p class="group-label">Encode</p>
    <a class="nav-item" href="/base64" data-route="base64"><svg aria-hidden="true"><use href="#i-b64"/></svg>Base64</a>
    <a class="nav-item" href="/jwt" data-route="jwt"><svg aria-hidden="true"><use href="#i-jwt"/></svg>JWT</a>
    <a class="nav-item" href="/hash" data-route="hash"><svg aria-hidden="true"><use href="#i-hash"/></svg>Hash</a>
    <a class="nav-item" href="/uuid" data-route="uuid"><svg aria-hidden="true"><use href="#i-uuid"/></svg>UUID</a>
    <p class="group-label">Network</p>
    <a class="nav-item" href="/ip" data-route="ip"><svg aria-hidden="true"><use href="#i-ip"/></svg>IP</a>
    <a class="nav-item" href="/ping" data-route="ping"><svg aria-hidden="true"><use href="#i-ping"/></svg>Ping</a>
    <p class="group-label">Feedback</p>
    <a class="nav-item" href="/request" data-route="request"><svg aria-hidden="true"><use href="#i-request"/></svg>Request a feature</a>
    <div class="side-foot">
      <div><span>Command palette</span><kbd>&#8984;K</kbd></div>
      <div><span>Hide this panel</span><kbd>&#8984;/</kbd></div>
      <div><span>Run a query</span><kbd>&#8984;&#8629;</kbd></div>
    </div>
  </nav>

  <main class="sheet" id="sheet">

    <!-- ================= JSON Diff ================= -->
    <section class="view" data-view="json-diff">
      <div class="title-row">
        <div>
          <h1>JSON Diff</h1>
          <p class="sub" id="diffSub"><b>7 changes</b> across plan, coupon, features and metadata; the other 5 top-level keys are equal.</p>
        </div>
        <div class="actions">
          <button class="btn" id="btnSwap"><svg aria-hidden="true"><use href="#i-swap"/></svg>Swap</button>
          <button class="btn" id="btnFormat"><svg aria-hidden="true"><use href="#i-format"/></svg>Format</button>
          <button class="btn" id="btnClear"><svg aria-hidden="true"><use href="#i-clear"/></svg>Clear</button>
          <button class="btn primary" id="btnShare"><svg aria-hidden="true"><use href="#i-link"/></svg><span>Copy share link</span></button>
        </div>
      </div>
      <div class="toolbar">
        <label class="check"><input type="checkbox" class="switch" id="optOrder">Ignore array order</label>
        <label class="check"><input type="checkbox" class="switch" id="optRedact">Redact sensitive values</label>
        <span class="spacer"></span>
        <span class="stamp num" id="diffStamp" aria-live="polite"></span>
      </div>
      <div class="diff-grid">
        <div class="docs" id="docs">
          <div class="pane" id="paneA">
            <div class="pane-head"><h2>Before</h2><span class="fname" id="nameA">subscription-before.json</span><button class="btn ghost sm" data-open="A"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
            <div class="ed" id="edA"></div>
            <div class="pane-foot" id="footA"></div>
          </div>
          <svg class="seam" id="seam" aria-hidden="true"></svg>
          <div class="pane" id="paneB">
            <div class="pane-head"><h2>After</h2><span class="fname" id="nameB">subscription-after.json</span><button class="btn ghost sm" data-open="B"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
            <div class="ed" id="edB"></div>
            <div class="pane-foot" id="footB"></div>
          </div>
        </div>
        <aside class="panel changes" aria-labelledby="chgTitle">
          <div class="panel-head">
            <h2 id="chgTitle" class="tally-fig">Changes</h2>
            <div class="segmented" role="group" aria-label="Rows to list">
              <button aria-pressed="true" data-show="changes">Changes only</button>
              <button aria-pressed="false" data-show="all">All keys</button>
            </div>
          </div>
          <div class="tally" id="tally"></div>
          <div class="change-list" id="changeList"></div>
          <div class="detail" id="detail"></div>
        </aside>
      </div>
    </section>

    <!-- ================= Query ================= -->
    <section class="view" data-view="jsonpath" hidden>
      <div class="title-row">
        <div><h1>Query</h1><p class="sub" id="qSub"><b>$.plan.amount</b> matched 1 value in subscription-after.json.</p></div>
      </div>
      <div class="cols wide-left">
        <div class="pane tool-pane">
          <div class="pane-head"><h2>Document</h2><span class="fname" id="qName">subscription-after.json</span><button class="btn ghost sm" data-open="Q"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edQ"></div>
          <div class="pane-foot" id="footQ"></div>
        </div>
        <div class="panel tool-pane">
          <div class="panel-head"><h2>JSONPath</h2><span class="meta">$.a.b · [n] · [*] · ..key</span></div>
          <div class="panel-body" style="padding-bottom:12px">
            <form class="field-row" id="qForm">
              <label class="vh" for="qPath">JSONPath expression</label>
              <input class="input" id="qPath" spellcheck="false" autocomplete="off" style="font-family:var(--mono)" value="$.plan.amount">
              <button class="btn primary" type="submit">Run <kbd style="background:transparent;border-color:transparent;color:inherit">&#8984;&#8629;</kbd></button>
            </form>
          </div>
          <div class="out" id="qOut" style="white-space:normal;font-family:var(--font)"></div>
        </div>
      </div>
    </section>

    <!-- ================= Validate ================= -->
    <section class="view" data-view="json-validate" hidden>
      <div class="title-row">
        <div><h1>Validate</h1><p class="sub" id="vSub"><b>Not valid JSON.</b> Line 8, column 22: Expected "," or "}" after this value, found a quote.</p></div>
        <div class="actions"><button class="btn" id="vFormat"><svg aria-hidden="true"><use href="#i-format"/></svg>Format</button></div>
      </div>
      <div class="cols wide-left">
        <div class="pane tool-pane">
          <div class="pane-head"><h2>Document</h2><span class="fname" id="vName">webhook-payload.json</span><button class="btn ghost sm" data-open="V"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edV"></div>
          <div class="pane-foot" id="footV"></div>
        </div>
        <div class="panel tool-pane">
          <div class="panel-head"><h2>Result</h2></div>
          <div class="panel-body" id="vOut"></div>
        </div>
      </div>
    </section>

    <!-- ================= IP ================= -->
    <section class="view" data-view="ip" hidden>
      <div class="title-row"><div><h1>IP</h1><p class="sub" id="ipSub"><b>100.72.14.9</b>: Shared (carrier-grade NAT), IPv4. Who owns it and where it is need a lookup over the network.</p></div></div>
      <div class="cols">
        <div class="panel">
          <div class="panel-head"><h2>Address</h2></div>
          <div class="panel-body">
            <label class="lbl" for="ipIn">IPv4 or IPv6 address</label>
            <input class="input" id="ipIn" style="width:100%;font-family:var(--mono)" spellcheck="false" value="100.72.14.9">
            <dl class="kv" id="ipOut" style="margin-top:16px"></dl>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Owner and location</h2><button class="btn sm" id="ipLookup">Look up</button></div>
          <div class="panel-body"><div class="offline" id="ipOffline"><b>Not looked up.</b><span>Finding who owns an address and where it is needs a request to an IP information service, so the address would leave this browser. This build makes no network requests, so this panel stays empty rather than guessed.</span></div>
            <dl class="kv" style="margin-top:12px"><dt>Organisation</dt><dd class="dash">—</dd><dt>Network (ASN)</dt><dd class="dash">—</dd><dt>Country</dt><dd class="dash">—</dd><dt>City</dt><dd class="dash">—</dd></dl></div>
        </div>
      </div>
    </section>

    <!-- ================= Ping ================= -->
    <section class="view" data-view="ping" hidden>
      <div class="title-row"><div><h1>Ping</h1><p class="sub" id="pingSub"><b>api.northwind-labs.io</b> has not been pinged. Timing it means sending requests from your browser.</p></div></div>
      <div class="cols">
        <div class="panel">
          <div class="panel-head"><h2>Host</h2></div>
          <div class="panel-body">
            <form class="field-row" id="pingForm">
              <label class="vh" for="pingIn">Host or URL</label>
              <input class="input" id="pingIn" style="font-family:var(--mono)" spellcheck="false" value="api.northwind-labs.io">
              <button class="btn primary" type="submit">Ping</button>
            </form>
            <dl class="kv" id="pingOut" style="margin-top:16px"></dl>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Round trips</h2><span class="meta">3 attempts</span></div>
          <div class="panel-body">
            <table class="t"><thead><tr><th>Attempt</th><th>Status</th><th class="n">Time</th></tr></thead>
              <tbody><tr><td colspan="3" style="border-bottom:0"><div class="offline" id="pingOffline"><b>No requests sent.</b><span>Browsers cannot send ICMP pings, so json0 times HTTPS requests to the host instead. That means contacting the host from your browser; this build makes no network requests, so there are no timings to show.</span></div></td></tr>
                <tr><td class="num">1</td><td>Not sent</td><td class="n dash">—</td></tr><tr><td class="num">2</td><td>Not sent</td><td class="n dash">—</td></tr><tr><td class="num">3</td><td>Not sent</td><td class="n dash">—</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= Base64 ================= -->
    <section class="view" data-view="base64" hidden>
      <div class="title-row"><div><h1>Base64</h1><p class="sub" id="b64Sub"><b>63 bytes</b> of text is 84 Base64 characters.</p></div>
        <div class="actions"><label class="check"><input type="checkbox" class="switch" id="b64Url">URL-safe alphabet</label></div></div>
      <div class="cols">
        <div class="pane tool-pane"><div class="pane-head"><h2>Text</h2><span class="fname num" id="b64TextMeta"></span></div>
          <textarea class="plain" id="b64Text" spellcheck="false" aria-label="Text"></textarea>
          <div class="pane-foot" id="b64TextFoot">Type here to encode.</div></div>
        <div class="pane tool-pane"><div class="pane-head"><h2>Base64</h2><span class="fname num" id="b64EncMeta"></span><button class="btn ghost sm" data-copy="b64Enc"><svg aria-hidden="true"><use href="#i-copy"/></svg>Copy</button></div>
          <textarea class="plain" id="b64Enc" spellcheck="false" aria-label="Base64"></textarea>
          <div class="pane-foot" id="b64EncFoot">Type or paste here to decode.</div></div>
      </div>
    </section>

    <!-- ================= JWT ================= -->
    <section class="view" data-view="jwt" hidden>
      <div class="title-row"><div><h1>JWT</h1><p class="sub" id="jwtSub"><b>HS256 token for cus_R2d9</b>; its expiry is read against this device’s clock.</p></div></div>
      <div class="cols">
        <div class="stack">
          <div class="pane" style="height:220px"><div class="pane-head"><h2>Token</h2><span class="fname" id="jwtMeta"></span></div>
            <textarea class="plain" id="jwtIn" spellcheck="false" aria-label="Token" style="overflow-wrap:anywhere;white-space:pre-wrap;word-break:break-all"></textarea></div>
          <div class="panel"><div class="panel-head"><h2>Claims</h2></div><div class="panel-body"><dl class="kv" id="jwtClaims"></dl></div></div>
        </div>
        <div class="stack">
          <div class="panel"><div class="panel-head"><h2>Header</h2></div><pre class="out" id="jwtHead" style="border-top:0;padding:12px 20px 20px"></pre></div>
          <div class="panel"><div class="panel-head"><h2>Payload</h2></div><pre class="out" id="jwtPay" style="border-top:0;padding:12px 20px 20px"></pre></div>
          <div class="panel"><div class="panel-head"><h2>Signature</h2></div><div class="panel-body" id="jwtSig"></div></div>
        </div>
      </div>
    </section>

    <!-- ================= Hash ================= -->
    <section class="view" data-view="hash" hidden>
      <div class="title-row"><div><h1>Hash</h1><p class="sub" id="hashSub"><b>21 bytes</b> hashed four ways; SHA-256 begins <code>9ee4f2bb8af0</code>.</p></div></div>
      <div class="cols">
        <div class="pane" style="min-height:240px"><div class="pane-head"><h2>Input</h2><span class="fname num" id="hashMeta"></span></div>
          <textarea class="plain" id="hashIn" spellcheck="false" aria-label="Text to hash"></textarea></div>
        <div class="panel"><div class="panel-head"><h2>Digests</h2><span class="meta">hex, lower case</span></div><div class="panel-body" id="hashOut"></div></div>
      </div>
    </section>

    <!-- ================= UUID ================= -->
    <section class="view" data-view="uuid" hidden>
      <div class="title-row"><div><h1>UUID</h1><p class="sub" id="uuidSub"><b>8 version 4 UUIDs</b> from crypto.randomUUID, 122 random bits each.</p></div>
        <div class="actions">
          <label class="vh" for="uuidN">How many</label>
          <input class="input num" type="number" id="uuidN" min="1" max="50" value="8" style="width:72px">
          <button class="btn" id="uuidCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg>Copy all</button>
          <button class="btn primary" id="uuidGen">Generate</button>
        </div></div>
      <div class="cols">
        <div class="panel"><div class="panel-head"><h2 id="uuidTitle">UUIDs</h2><label class="check"><input type="checkbox" class="switch" id="uuidUpper">Upper case</label></div><div class="panel-body"><ul class="uuid-list" id="uuidOut"></ul></div></div>
        <div class="panel"><div class="panel-head"><h2>Format</h2></div><div class="panel-body"><dl class="kv" id="uuidInfo"></dl></div></div>
      </div>
    </section>

    <!-- ================= XML to JSON ================= -->
    <section class="view" data-view="xml-to-json" hidden>
      <div class="title-row"><div><h1>XML to JSON</h1><p class="sub" id="xmlSub"><b>&lt;invoice&gt;</b> and 5 elements inside it converted; repeated elements became arrays.</p></div>
        <div class="actions"><button class="btn" data-copy="xmlOut"><svg aria-hidden="true"><use href="#i-copy"/></svg>Copy JSON</button></div></div>
      <div class="cols">
        <div class="pane tool-pane"><div class="pane-head"><h2>XML</h2><span class="fname" id="xmlMeta"></span></div>
          <textarea class="plain" id="xmlIn" spellcheck="false" aria-label="XML"></textarea>
          <div class="pane-foot" id="xmlFoot"></div></div>
        <div class="pane tool-pane"><div class="pane-head"><h2>JSON</h2><span class="fname">attributes as @name, text as #text</span></div>
          <pre class="out" id="xmlOut"></pre></div>
      </div>
    </section>

    <!-- ================= Format ================= -->
    <section class="view" data-view="json-format" hidden>
      <div class="title-row">
        <div><h1>Format</h1><p class="sub" id="fmtSub"><b>Pretty-printed at 2 spaces: 621 bytes becomes 836 bytes</b> (+35%), 32 keys.</p></div>
        <div class="actions">
          <button class="btn" id="fmtUse"><svg aria-hidden="true"><use href="#i-swap"/></svg>Use output as input</button>
          <button class="btn primary" id="fmtCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy output</span></button>
        </div>
      </div>
      <div class="opts">
        <div class="segmented" role="group" aria-label="Output" id="fmtMode">
          <button aria-pressed="true" data-v="pretty">Pretty</button><button aria-pressed="false" data-v="minify">Minify</button><button aria-pressed="false" data-v="escape">Escape as string</button><button aria-pressed="false" data-v="unescape">Unescape string</button>
        </div>
        <div class="segmented" role="group" aria-label="Indent" id="fmtIndent">
          <button aria-pressed="true" data-v="2">2 spaces</button><button aria-pressed="false" data-v="4">4 spaces</button><button aria-pressed="false" data-v="tab">Tab</button>
        </div>
        <label class="check"><input type="checkbox" class="switch" id="fmtSort">Sort keys</label>
      </div>
      <dl class="stats" id="fmtStats"></dl>
      <div class="cols">
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>Input</h2><span class="fname" id="fmtName">invoice.min.json</span><button class="btn ghost sm" data-open="F"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edF"></div>
          <div class="pane-foot" id="footF"></div>
        </div>
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>Output</h2><span class="fname" id="fmtOutName"></span><button class="btn ghost sm" id="fmtCopy2"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy</span></button></div>
          <div class="ed" id="edFO"></div>
          <div class="pane-foot" id="footFO"></div>
        </div>
      </div>
    </section>

    <!-- ================= Table ================= -->
    <section class="view" data-view="json-table" hidden>
      <div class="title-row">
        <div><h1>Table</h1><p class="sub" id="tblSub"><b>12 rows × 16 columns</b> from a top-level array, with 3 nested objects flattened into dot paths; the sparsest column, <code>discount.coupon</code>, is filled in 3 of 12.</p></div>
        <div class="actions">
          <button class="btn" id="tblTSV"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy TSV</span></button>
          <button class="btn" id="tblMD"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy Markdown</span></button>
          <button class="btn primary" id="tblCSV"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy CSV</span></button>
        </div>
      </div>
      <dl class="stats" id="tblStats"></dl>
      <div class="split">
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>JSON</h2><span class="fname" id="tblName">invoices.json</span><button class="btn ghost sm" data-open="T"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edT"></div>
          <div class="pane-foot" id="footT"></div>
        </div>
        <div class="panel data-panel tool-pane short">
          <div class="panel-head"><h2 id="tblTitle">Rows</h2>
            <div class="filter"><svg aria-hidden="true"><use href="#i-search"/></svg><label class="vh" for="tblFilter">Filter rows</label><input class="input" id="tblFilter" placeholder="Filter rows" autocomplete="off" spellcheck="false"></div></div>
          <div class="tbl-wrap" id="tblWrap"></div>
          <div class="tbl-foot" id="tblFoot"></div>
        </div>
      </div>
    </section>

    <!-- ================= Schema and types ================= -->
    <section class="view" data-view="json-schema" hidden>
      <div class="title-row">
        <div><h1>Schema and types</h1><p class="sub" id="schSub"><b>20 properties, 18 required</b>, inferred from 3 samples merged; 6 enums and 3 formats (email, date-time, uri) detected.</p></div>
        <div class="actions"><button class="btn primary" id="schCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy JSON Schema</span></button></div>
      </div>
      <dl class="stats" id="schStats"></dl>
      <div class="cols">
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>Sample</h2><span class="fname" id="schName">subscriptions.json</span><button class="btn ghost sm" data-open="S"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edS"></div>
          <div class="pane-foot" id="footS"></div>
        </div>
        <div class="pane tool-pane short">
          <div class="tabs-head">
            <div class="segmented" role="group" aria-label="Output" id="schTab">
              <button aria-pressed="true" data-v="schema">JSON Schema</button><button aria-pressed="false" data-v="ts">TypeScript</button><button aria-pressed="false" data-v="zod">Zod</button><button aria-pressed="false" data-v="validate">Validate a document</button>
            </div>
          </div>
          <div class="ed" id="edSO" style="border-top:0"></div>
          <div id="schVal" hidden style="display:flex;flex-direction:column;min-height:0;flex:1">
            <div class="ed" id="edSV" style="border-top:0;flex:1 1 55%"></div>
            <div class="pane-foot" id="footSV"></div>
            <div class="scroll-list" id="schErrs" style="flex:1 1 45%;border-top:1px solid var(--rule);padding-top:4px"></div>
          </div>
          <div class="pane-foot" id="footSO"></div>
        </div>
      </div>
    </section>

    <!-- ================= CSV viewer ================= -->
    <section class="view" data-view="csv" hidden>
      <div class="title-row">
        <div><h1>CSV viewer</h1><p class="sub" id="csvSub"><b>11 rows × 10 columns</b>, comma-delimited; 1 duplicate row (row 9 repeats row 4); <code>notes</code> is empty in 6 rows.</p></div>
        <div class="actions">
          <button class="btn" data-open="C"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button>
          <button class="btn primary" id="csvDedupe">Remove duplicates</button>
        </div>
      </div>
      <div class="opts">
        <div class="segmented" role="group" aria-label="Delimiter" id="csvDelim">
          <button aria-pressed="true" data-v="auto">Auto</button><button aria-pressed="false" data-v=",">Comma</button><button aria-pressed="false" data-v=";">Semicolon</button><button aria-pressed="false" data-v="&#9;">Tab</button><button aria-pressed="false" data-v="|">Pipe</button>
        </div>
        <label class="check"><input type="checkbox" class="switch" id="csvHeader" checked>First row is the header</label>
        <span class="spacer"></span>
        <span class="stamp" id="csvStamp"></span>
      </div>
      <dl class="stats" id="csvStats"></dl>
      <div class="split">
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>CSV</h2><span class="fname" id="csvName">customers.csv</span></div>
          <div class="ed" id="edC"></div>
          <div class="pane-foot" id="footC"></div>
        </div>
        <div class="panel data-panel tool-pane short">
          <div class="panel-head"><h2 id="csvTitle">Rows</h2>
            <div class="filter"><svg aria-hidden="true"><use href="#i-search"/></svg><label class="vh" for="csvFilter">Filter rows</label><input class="input" id="csvFilter" placeholder="Filter rows" autocomplete="off" spellcheck="false"></div></div>
          <div class="tbl-wrap" id="csvWrap"></div>
          <div class="tbl-foot" id="csvFoot"></div>
        </div>
      </div>
      <div class="cols row-gap">
        <div class="panel data-panel tool-pane half">
          <div class="panel-head"><h2>Column profile</h2><span class="meta" id="csvProfMeta"></span></div>
          <div class="tbl-wrap" id="csvProf"></div>
        </div>
        <div class="pane tool-pane half">
          <div class="tabs-head">
            <div class="segmented" role="group" aria-label="Convert to" id="csvOutMode"><button aria-pressed="true" data-v="json">JSON array</button><button aria-pressed="false" data-v="ndjson">NDJSON</button></div>
            <label class="check"><input type="checkbox" class="switch" id="csvTyped" checked>Typed numbers and booleans</label>
            <span class="spacer"></span>
            <button class="btn ghost sm" id="csvCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy</span></button>
          </div>
          <div class="ed" id="edCO" style="border-top:0"></div>
          <div class="pane-foot" id="footCO"></div>
        </div>
      </div>
    </section>

    <!-- ================= CSV diff ================= -->
    <section class="view" data-view="csv-diff" hidden>
      <div class="title-row">
        <div><h1>CSV diff</h1><p class="sub" id="cdSub"><b>6 differences</b> keyed on <code>customer_id</code>: 2 rows added, 1 removed, 3 cells changed in 2 rows; 5 rows unchanged.</p></div>
        <div class="actions">
          <button class="btn" id="cdSwap"><svg aria-hidden="true"><use href="#i-swap"/></svg>Swap</button>
          <button class="btn primary" id="cdCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy report</span></button>
        </div>
      </div>
      <div class="opts">
        <label class="lbl-inline" for="cdKey">Key column</label>
        <span class="select-wrap"><select class="input" id="cdKey"></select><svg aria-hidden="true"><use href="#i-chev"/></svg></span>
        <label class="check"><input type="checkbox" class="switch" id="cdTrim" checked>Ignore spaces around values</label>
        <span class="spacer"></span>
        <span class="stamp num" id="cdStamp"></span>
      </div>
      <div class="cols">
        <div class="pane tool-pane half">
          <div class="pane-head"><h2>Before</h2><span class="fname" id="cdNameA">customers-2026-10-01.csv</span><button class="btn ghost sm" data-open="CA"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edCA"></div>
          <div class="pane-foot" id="footCA"></div>
        </div>
        <div class="pane tool-pane half">
          <div class="pane-head"><h2>After</h2><span class="fname" id="cdNameB">customers-2026-10-24.csv</span><button class="btn ghost sm" data-open="CB"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edCB"></div>
          <div class="pane-foot" id="footCB"></div>
        </div>
      </div>
      <div class="panel row-gap">
        <div class="panel-head"><h2 class="tally-fig" id="cdTitle">Differences</h2>
          <div class="segmented" role="group" aria-label="Rows to list" id="cdShow"><button aria-pressed="true" data-v="changes">Changes only</button><button aria-pressed="false" data-v="all">All rows</button></div></div>
        <div class="tally" id="cdTally"></div>
        <div class="tbl-wrap" id="cdList" style="border-top:0"></div>
      </div>
    </section>

    <!-- ================= Extended JSON ================= -->
    <section class="view" data-view="mongo-ejson" hidden>
      <div class="title-row">
        <div><h1>Extended JSON</h1><p class="sub" id="ejSub"><b>11 typed values</b> (2 ObjectIds, 2 Longs, 2 Dates, 1 Decimal128, 1 Int32, 1 Timestamp, 1 Binary, 1 Regular expression) read from mongosh shell syntax and written as canonical Extended JSON v2, with every type kept.</p></div>
        <div class="actions"><button class="btn" id="ejUse"><svg aria-hidden="true"><use href="#i-swap"/></svg>Use output as input</button><button class="btn primary" id="ejCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy output</span></button></div>
      </div>
      <div class="opts">
        <div class="segmented" role="group" aria-label="Output format" id="ejMode">
          <button aria-pressed="true" data-v="canonical">Canonical EJSON</button><button aria-pressed="false" data-v="relaxed">Relaxed EJSON</button><button aria-pressed="false" data-v="shell">mongosh shell</button><button aria-pressed="false" data-v="plain">Plain JSON</button>
        </div>
        <span class="spacer"></span>
        <span class="stamp" id="ejStamp"></span>
      </div>
      <div class="cols">
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>Input</h2><span class="fname" id="ejName">subscription.mongosh.js</span><button class="btn ghost sm" data-open="E"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edE"></div>
          <div class="pane-foot" id="footE"></div>
        </div>
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>Output</h2><span class="fname" id="ejOutName"></span></div>
          <div class="ed" id="edEO"></div>
          <div class="pane-foot" id="footEO"></div>
        </div>
      </div>
      <div class="panel row-gap">
        <div class="panel-head"><h2>Typed values</h2><span class="meta" id="ejTypesMeta"></span></div>
        <div class="tbl-wrap" id="ejTypes" style="border-top:0;padding:4px 8px 8px"></div>
      </div>
    </section>

    <!-- ================= ObjectId ================= -->
    <section class="view" data-view="objectid" hidden>
      <div class="title-row">
        <div><h1>ObjectId</h1><p class="sub" id="oidSub"><b>5 ObjectIds created between 30 Sept 2026 and 24 Oct 2026</b>, by 2 processes (distinct random values).</p></div>
        <div class="actions"><button class="btn primary" id="oidCopyAll"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy decoded as CSV</span></button></div>
      </div>
      <dl class="stats" id="oidStats"></dl>
      <div class="cols wide-left">
        <div class="panel data-panel tool-pane half">
          <div class="panel-head"><h2>Decoded</h2><span class="meta">select a row for its bytes</span></div>
          <div class="tbl-wrap" id="oidTable"></div>
        </div>
        <div class="pane tool-pane half">
          <div class="pane-head"><h2>ObjectIds</h2><span class="fname">hex, ObjectId("…") or {"$oid": "…"}, one or many</span></div>
          <textarea class="plain" id="oidIn" spellcheck="false" aria-label="ObjectIds to decode"></textarea>
          <div class="pane-foot" id="oidFoot"></div>
        </div>
      </div>
      <div class="cols row-gap">
        <div class="panel"><div class="panel-head"><h2>Selected</h2><button class="btn ghost sm" id="oidCopySel"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy id</span></button></div><div class="panel-body" id="oidDetail"></div></div>
        <div class="stack">
          <div class="panel"><div class="panel-head"><h2>Generate</h2><button class="btn ghost sm" id="oidGenCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy all</span></button></div>
            <div class="panel-body">
              <div class="form-grid">
                <div><label class="lbl" for="oidGenAt">Created at (UTC)</label><input class="input num" type="datetime-local" id="oidGenAt" step="1"></div>
                <div><label class="lbl" for="oidGenN">How many</label><div class="field-row"><input class="input num" type="number" id="oidGenN" min="1" max="20" value="3"><button class="btn" id="oidGenNow">Now</button><button class="btn" id="oidGen">Generate</button></div></div>
              </div>
              <ul class="uuid-list" id="oidGenOut" style="margin-top:12px"></ul>
            </div></div>
          <div class="panel"><div class="panel-head"><h2>Range filter</h2><button class="btn ghost sm" id="oidRangeCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy filter</span></button></div>
            <div class="panel-body">
              <div class="form-grid">
                <div><label class="lbl" for="oidFrom">From (UTC, inclusive)</label><input class="input num" type="datetime-local" id="oidFrom" step="1"></div>
                <div><label class="lbl" for="oidTo">To (UTC, exclusive)</label><input class="input num" type="datetime-local" id="oidTo" step="1"></div>
              </div>
              <pre class="code-out" id="oidRange" style="margin-top:12px"></pre>
              <p class="note" id="oidRangeNote" style="margin-top:8px"></p>
            </div></div>
        </div>
      </div>
    </section>

    <!-- ================= Query tester ================= -->
    <section class="view" data-view="mongo-query" hidden>
      <div class="title-row">
        <div><h1>Query tester</h1><p class="sub" id="mqSub"><b>4 of 10 documents match</b> (40%), sorted by plan.amount, projected to 3 fields. Run in this browser, no server.</p></div>
        <div class="actions"><button class="btn" id="mqCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy results</span></button><button class="btn primary" id="mqRun">Run <kbd style="background:transparent;border-color:transparent;color:inherit">&#8984;&#8629;</kbd></button></div>
      </div>
      <div class="cols">
        <div class="pane tool-pane">
          <div class="pane-head"><h2>Documents</h2><span class="fname" id="mqName">subscriptions.json</span><button class="btn ghost sm" data-open="MQ"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edMQ"></div>
          <div class="pane-foot" id="footMQ"></div>
        </div>
        <div class="panel tool-pane data-panel auto-m">
          <div class="panel-body" style="padding-bottom:16px;flex:none">
            <div class="form-grid">
              <div class="full"><label class="lbl" for="mqFilterTa">Filter</label><div class="mini-ed"><div class="ed" id="edMF"></div></div></div>
              <div class="full"><label class="lbl" for="mqProj">Projection</label><input class="input mono" id="mqProj" spellcheck="false" autocomplete="off"></div>
              <div><label class="lbl" for="mqSort">Sort</label><input class="input mono" id="mqSort" spellcheck="false" autocomplete="off"></div>
              <div><label class="lbl" for="mqLimit">Limit</label><input class="input num" id="mqLimit" type="number" min="0" placeholder="No limit"></div>
            </div>
          </div>
          <div class="panel-head" style="padding-top:12px;border-top:1px solid var(--rule)"><h2 class="tally-fig" id="mqCount">Results</h2><span class="meta" id="mqMeta"></span></div>
          <div class="scroll-list" id="mqOut"></div>
        </div>
      </div>
    </section>

    <!-- ================= Schema analyzer ================= -->
    <section class="view" data-view="mongo-schema" hidden>
      <div class="title-row">
        <div><h1>Schema analyzer</h1><p class="sub" id="maSub"><b>18 fields across 10 documents</b>; <b>2 fields have mixed types</b> to fix (<code>plan.seats</code> is Int32 in 9 and String in 1, and 1 more); 3 fields are missing from some documents.</p></div>
        <div class="actions"><button class="btn primary" id="maCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy as CSV</span></button></div>
      </div>
      <dl class="stats" id="maStats"></dl>
      <div class="split">
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>Documents</h2><span class="fname" id="maName">subscriptions.export.json</span><button class="btn ghost sm" data-open="MS"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button></div>
          <div class="ed" id="edMS"></div>
          <div class="pane-foot" id="footMS"></div>
        </div>
        <div class="panel data-panel tool-pane short">
          <div class="panel-head"><h2 id="maTitle">Fields</h2>
            <div class="segmented" role="group" aria-label="Fields to list" id="maShow"><button aria-pressed="true" data-v="all">All fields</button><button aria-pressed="false" data-v="issues">Mixed or optional</button></div></div>
          <div class="tbl-wrap" id="maOut"></div>
        </div>
      </div>
    </section>

    <!-- ================= Redact ================= -->
    <section class="view" data-view="redact" hidden>
      <div class="title-row">
        <div><h1>Redact</h1><p class="sub" id="rdSub"><b>14 sensitive values in 13 fields</b>: 1 JWT, 3 API keys, 2 emails, 1 IBAN, 2 phone numbers, 1 card number, 2 IP addresses and 2 secrets by key name. Scanned in this browser; nothing was sent.</p></div>
        <div class="actions"><button class="btn" data-open="R"><svg aria-hidden="true"><use href="#i-upload"/></svg>Open file</button><button class="btn primary" id="rdCopy"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy redacted</span></button></div>
      </div>
      <p class="note" style="margin:-8px 0 16px;display:flex;gap:6px;align-items:center"><svg aria-hidden="true" style="width:14px;height:14px;color:var(--accent);flex:none"><use href="#i-lock"/></svg><span>The scan runs in this browser. Nothing you paste here is sent anywhere, and the hashes are computed with Web Crypto on this device.</span></p>
      <dl class="stats" id="rdStats"></dl>
      <div class="cols">
        <div class="pane tool-pane short">
          <div class="pane-head"><h2>Input</h2><span class="fname" id="rdName">support-export.json</span></div>
          <div class="ed" id="edR"></div>
          <div class="pane-foot" id="footR"></div>
        </div>
        <div class="panel tool-pane short data-panel auto-m">
          <div class="panel-head"><h2>By kind</h2><span class="meta">choose what happens to each</span></div>
          <div class="scroll-list kinds-wrap" style="flex:none;max-height:46%;padding-bottom:4px"><ul class="kinds" id="rdKinds"></ul></div>
          <div class="panel-head" style="padding-top:12px;border-top:1px solid var(--rule)"><h2>Findings</h2><span class="meta" id="rdFindMeta"></span></div>
          <div class="scroll-list"><ul class="rows" id="rdList"></ul></div>
        </div>
      </div>
      <div class="pane tool-pane half row-gap">
        <div class="pane-head"><h2>Redacted</h2><span class="fname" id="rdOutName"></span><button class="btn ghost sm" id="rdCopy2"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy</span></button></div>
        <div class="ed" id="edRO"></div>
        <div class="pane-foot" id="footRO"></div>
      </div>
    </section>
    <!-- ================= Request a feature ================= -->
    <section class="view" data-view="request" hidden>
      <div class="title-row">
        <div><h1>Request a feature</h1><p class="sub" id="rqSub">Ask for a tool, report a bug or ask a question. <b>The form itself sends nothing</b>: it writes a GitHub issue or an email for you to send.</p></div>
      </div>
      <div class="cols wide-left">
        <div class="panel">
          <div class="panel-head"><h2>Your request</h2><span class="meta">Title and details are required</span></div>
          <div class="panel-body">
            <form id="rqForm" novalidate>
              <div class="form-grid rq-grid">
                <div><label class="lbl" for="rqKind">Kind</label><span class="select-wrap"><select class="input" id="rqKind"><option value="feature">Feature request</option><option value="bug">Bug report</option><option value="question">Question</option></select><svg aria-hidden="true"><use href="#i-chev"/></svg></span></div>
                <div><label class="lbl" for="rqTool">Tool</label><span class="select-wrap"><select class="input" id="rqTool"><option value="new">New tool</option><optgroup label="JSON"><option value="json-diff">Diff</option><option value="jsonpath">Query</option><option value="json-validate">Validate</option><option value="json-format">Format</option><option value="json-table">Table</option><option value="json-schema">Schema and types</option><option value="xml-to-json">XML to JSON</option></optgroup><optgroup label="CSV"><option value="csv">CSV viewer</option><option value="csv-diff">CSV diff</option></optgroup><optgroup label="MongoDB"><option value="mongo-ejson">Extended JSON</option><option value="objectid">ObjectId</option><option value="mongo-query">Query tester</option><option value="mongo-schema">Schema analyzer</option></optgroup><optgroup label="Privacy"><option value="redact">Redact</option></optgroup><optgroup label="Encode"><option value="base64">Base64</option><option value="jwt">JWT</option><option value="hash">Hash</option><option value="uuid">UUID</option></optgroup><optgroup label="Network"><option value="ip">IP</option><option value="ping">Ping</option></optgroup></select><svg aria-hidden="true"><use href="#i-chev"/></svg></span></div>
                <div class="full"><label class="lbl" for="rqTitle">Title</label><input class="input" id="rqTitle" maxlength="120" autocomplete="off" aria-describedby="rqTitleErr" placeholder="Compare CSV files keyed on two columns">
                  <p class="inline-err" id="rqTitleErr" hidden><svg aria-hidden="true"><use href="#i-alert"/></svg><span></span></p></div>
                <div class="full"><label class="lbl" for="rqDetails">Details</label><textarea class="input rq-ta" id="rqDetails" rows="8" maxlength="5000" aria-describedby="rqDetailsHint rqDetailsErr"></textarea>
                  <p class="inline-err" id="rqDetailsErr" hidden><svg aria-hidden="true"><use href="#i-alert"/></svg><span></span></p>
                  <div class="rq-hint"><p class="note" id="rqDetailsHint">What should it do, and what would you use it for? A small sample helps. Leave out anything private.</p><span class="meta num" id="rqDetailsCount">0 / 5,000</span></div></div>
                <div class="full"><label class="lbl" for="rqContact">Your email or handle, if you would like a reply</label><input class="input" id="rqContact" maxlength="120" autocomplete="email" aria-describedby="rqContactNote">
                  <p class="note rq-under" id="rqContactNote">Optional. On GitHub it appears in the issue, so it is public there.</p></div>
              </div>
              <div class="rq-actions">
                <a class="btn primary" id="rqGitHub" href="https://github.com/Siddharthachuahan9/JSON0.dev/issues/new" target="_blank" rel="noopener noreferrer">Open as a GitHub issue</a>
                <a class="btn" id="rqEmail" href="mailto:siddharthachauhan304@gmail.com">Send by email</a>
              </div>
              <p class="note rq-sends"><svg aria-hidden="true"><use href="#i-lock"/></svg><span>This form sends nothing by itself. <b>Open as a GitHub issue</b> opens a new tab with the issue filled in; it posts publicly once you submit it there. <b>Send by email</b> opens your mail app with the message written.</span></p>
            </form>
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <div class="panel-head"><h2>Preview</h2>
              <div class="segmented" role="group" aria-label="Preview as" id="rqPrevMode"><button type="button" aria-pressed="true" data-v="gh">GitHub issue</button><button type="button" aria-pressed="false" data-v="mail">Email</button></div></div>
            <div class="panel-body">
              <p class="meta" id="rqPrevMeta">public once you submit it on GitHub</p>
              <p class="rq-prev-title" id="rqPrevTitle">[New tool] Untitled</p>
              <pre class="code-out rq-prev" id="rqPrev"></pre>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Write to me directly</h2></div>
            <div class="panel-body">
              <div class="rq-addr"><code id="rqAddr">siddharthachauhan304@gmail.com</code><button class="btn sm" type="button" data-copy="rqAddr"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy</span></button></div>
              <p class="note rq-site">Or reach me at <a class="rq-link" href="https://sidstack.in">sidstack.in</a></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

</div>

<div class="palette-wrap" id="paletteWrap" hidden>
  <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
    <input id="palIn" placeholder="Go to a tool or run an action" autocomplete="off" spellcheck="false" aria-label="Search tools and actions" aria-controls="palList">
    <ul id="palList" role="listbox"></ul>
  </div>
</div>
<input type="file" id="fileIn" accept=".json,application/json,text/plain" hidden>
<p class="vh" id="live" aria-live="polite"></p>`;
