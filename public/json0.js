(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtBytes = n => n < 1024 ? n.toLocaleString('en-US') + ' bytes' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const plural = (n, one, many) => n.toLocaleString('en-US') + ' ' + (n === 1 ? one : (many || one + 's'));
const say = msg => { $('#live').textContent = msg; };
const LH = 20, PADT = 8, MAX_FILE = 10 * 1024 * 1024;

/* ---------------- sample data (an API response before and after a plan upgrade) ---------------- */
const SAMPLE_A = {
  id: 'sub_8Kq2LmV41', object: 'subscription', status: 'active',
  customer: { id: 'cus_R2d9', email: 'ops@northwind-labs.io', country: 'DE' },
  plan: { id: 'starter', interval: 'month', amount: 900, currency: 'eur', seats: 1 },
  coupon: 'LAUNCH20',
  features: ['api', 'webhooks'],
  current_period_end: '2026-11-01T00:00:00Z',
  metadata: { source: 'checkout' }
};
const SAMPLE_B = {
  id: 'sub_8Kq2LmV41', object: 'subscription', status: 'active',
  customer: { id: 'cus_R2d9', email: 'ops@northwind-labs.io', country: 'DE' },
  plan: { id: 'team', interval: 'month', amount: 2900, currency: 'eur', seats: 5 },
  features: ['api', 'webhooks', 'sso', 'audit_log'],
  current_period_end: '2026-11-01T00:00:00Z',
  metadata: { source: 'checkout', upgraded_from: 'starter' }
};
const pretty = v => JSON.stringify(v, null, 2);

/* ---------------- a JSON parser that keeps line numbers for every path ---------------- */
const IDENT = /^[A-Za-z_$][\w$]*$/;
const joinKey = (path, k) => IDENT.test(k) ? (path ? path + '.' + k : k) : path + '[' + JSON.stringify(k) + ']';
function parseJSONPos(text) {
  const starts = [0];
  for (let j = 0; j < text.length; j++) if (text.charCodeAt(j) === 10) starts.push(j + 1);
  const lineOf = pos => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };
  const colOf = pos => pos - starts[lineOf(pos) - 1] + 1;
  const map = new Map();
  let i = 0;
  class PErr extends Error { constructor(m, p) { super(m); this.pos = p; } }
  const fail = (m, p = i) => { throw new PErr(m, p); };
  const ws = () => { while (i < text.length) { const c = text.charCodeAt(i); if (c === 32 || c === 9 || c === 10 || c === 13) i++; else break; } };
  const desc = p => p >= text.length ? 'the end of the document' : text[p] === '"' ? 'a quote' : '"' + text[p] + '"';
  const ESC = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
  function str() {
    const s = i; i++; let out = '';
    for (;;) {
      if (i >= text.length) fail('Unterminated string', s);
      const c = text[i];
      if (c === '"') { i++; return out; }
      if (c === '\n') fail('Line break inside a string', i);
      if (c === '\\') {
        const n = text[i + 1];
        if (n in ESC) { out += ESC[n]; i += 2; }
        else if (n === 'u') { const h = text.substr(i + 2, 4); if (!/^[0-9a-fA-F]{4}$/.test(h)) fail('Bad \\u escape', i); out += String.fromCharCode(parseInt(h, 16)); i += 6; }
        else fail('Bad escape \\' + (n || ''), i);
        continue;
      }
      out += c; i++;
    }
  }
  function num() {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
    if (!m) fail('Unexpected ' + desc(i) + '; a value was expected');
    i += m[0].length; return Number(m[0]);
  }
  const put = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
  function value(path, parent, startPos) {
    ws();
    if (i >= text.length) fail('Unexpected end of the document; a value was expected');
    const vStart = startPos == null ? i : startPos;
    const entry = { line: lineOf(vStart), end: 0, keys: null, parent };
    map.set(path, entry);
    const c = text[i]; let v;
    if (c === '{') {
      i++; v = {}; entry.keys = []; ws();
      if (text[i] === '}') i++;
      else for (;;) {
        ws();
        if (text[i] !== '"') fail(text[i] === '}' ? 'Trailing comma before "}"' : 'Expected a property name in double quotes, found ' + desc(i));
        const kPos = i, k = str(); ws();
        if (text[i] !== ':') fail('Expected ":" after the property name, found ' + desc(i));
        i++;
        const p = joinKey(path, k);
        put(v, k, value(p, path, kPos)); entry.keys.push(p);
        const after = i; ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === '}') { i++; break; }
        fail('Expected "," or "}" after this value, found ' + desc(i), after);
      }
    } else if (c === '[') {
      i++; v = []; entry.keys = []; ws();
      if (text[i] === ']') i++;
      else for (let n = 0; ; n++) {
        ws();
        if (text[i] === ']') fail('Trailing comma before "]"');
        const p = path + '[' + n + ']';
        v.push(value(p, path)); entry.keys.push(p);
        const after = i; ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; break; }
        fail('Expected "," or "]" after this item, found ' + desc(i), after);
      }
    } else if (c === '"') v = str();
    else if (text.startsWith('true', i)) { v = true; i += 4; }
    else if (text.startsWith('false', i)) { v = false; i += 5; }
    else if (text.startsWith('null', i)) { v = null; i += 4; }
    else if (c === '-' || (c >= '0' && c <= '9')) v = num();
    else fail('Unexpected ' + desc(i) + '; a value was expected');
    entry.end = lineOf(Math.max(i - 1, vStart));
    return v;
  }
  try {
    ws();
    if (i >= text.length) return { state: 'empty', lines: starts.length };
    const v = value('', null);
    ws();
    if (i < text.length) fail('Unexpected ' + desc(i) + ' after the end of the document');
    return { state: 'ok', value: v, map, lines: starts.length };
  } catch (e) {
    if (!(e instanceof PErr)) throw e;
    const p = Math.min(e.pos, text.length);
    return { state: 'error', message: e.message, line: lineOf(p), col: colOf(p), lines: starts.length };
  }
}

/* ---------------- the diff ---------------- */
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function deepEq(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEq(x, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => has(b, k) && deepEq(a[k], b[k]));
}
function diff(a, b, opts) {
  const out = [];
  (function walk(a, b, pa, pb) {
    if (isObj(a) && isObj(b)) {
      for (const k of Object.keys(a)) {
        if (has(b, k)) walk(a[k], b[k], joinKey(pa, k), joinKey(pb, k));
        else out.push({ kind: 'del', pa: joinKey(pa, k), pb: null, a: a[k] });
      }
      for (const k of Object.keys(b)) if (!has(a, k)) out.push({ kind: 'add', pa: null, pb: joinKey(pb, k), b: b[k] });
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (opts.ignoreOrder) {
        const used = new Array(b.length).fill(false), loose = [];
        a.forEach((x, i) => {
          const j = b.findIndex((y, j) => !used[j] && deepEq(x, y));
          if (j >= 0) { used[j] = true; walk(x, b[j], pa + '[' + i + ']', pb + '[' + j + ']'); } else loose.push(i);
        });
        loose.forEach(i => out.push({ kind: 'del', pa: pa + '[' + i + ']', pb: null, a: a[i] }));
        b.forEach((y, j) => { if (!used[j]) out.push({ kind: 'add', pa: null, pb: pb + '[' + j + ']', b: y }); });
      } else {
        const n = Math.min(a.length, b.length);
        for (let i = 0; i < n; i++) walk(a[i], b[i], pa + '[' + i + ']', pb + '[' + i + ']');
        for (let i = n; i < a.length; i++) out.push({ kind: 'del', pa: pa + '[' + i + ']', pb: null, a: a[i] });
        for (let j = n; j < b.length; j++) out.push({ kind: 'add', pa: null, pb: pb + '[' + j + ']', b: b[j] });
      }
      return;
    }
    out.push({ kind: deepEq(a, b) ? 'eq' : 'chg', pa, pb, a, b });
  })(a, b, '', '');
  return out;
}
window.json0Diff = (a, b, opts = {}) => diff(a, b, opts); // exposed for the headless check

/* ---------------- syntax highlight, one line at a time ---------------- */
const TOK = /("(?:[^"\\\n]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\],:])|([<>&])/g;
function hl(line) {
  return line.replace(TOK, (m, s, colon, n, lit, p, h) => {
    if (s) return colon ? '<span class="t-k">' + esc(s) + '</span><span class="t-p">' + colon + '</span>' : '<span class="t-s">' + esc(s) + '</span>';
    if (n) return '<span class="t-n">' + n + '</span>';
    if (lit) return '<span class="t-b">' + lit + '</span>';
    if (p) return '<span class="t-p">' + p + '</span>';
    return esc(h);
  });
}

/* ---------------- the editor: a textarea over a highlighted pre, with line numbers ---------------- */
function makeEditor(host, { placeholder, onInput, label, plain, readOnly }) {
  host.innerHTML = '<div class="ed-inner"><div class="ed-gutter" aria-hidden="true"></div><div class="ed-code"><pre class="ed-hl" aria-hidden="true"><code></code></pre><textarea class="ed-ta" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div></div>';
  const ta = $('textarea', host), code = $('code', host), gutter = $('.ed-gutter', host);
  ta.placeholder = placeholder || '';
  ta.setAttribute('aria-label', label);
  if (readOnly) ta.readOnly = true;
  let marks = new Map(), focus = null;
  const render = () => {
    const text = ta.value, lines = text.split('\n');
    const big = text.length > 400000;
    let html = '', g = '';
    for (let n = 0; n < lines.length; n++) {
      const ln = n + 1, cls = marks.get(ln) || '', f = focus && ln >= focus[0] && ln <= focus[1];
      html += '<div class="l' + (cls ? ' ' + cls : '') + (f ? ' focus' : '') + '">' + (big || plain ? esc(lines[n]) : hl(lines[n])) + '</div>';
      g += '<div' + (f ? ' class="on"' : '') + '>' + ln + '</div>';
    }
    code.innerHTML = html; gutter.innerHTML = g;
  };
  ta.addEventListener('input', () => { render(); onInput && onInput(); });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !readOnly && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.setRangeText('  ', s, en, 'end'); render(); onInput && onInput();
    }
  });
  render();
  return {
    ta, scroller: host,
    get: () => ta.value,
    set(t) { ta.value = t; render(); },
    mark(m, f) { marks = m || new Map(); focus = f || null; render(); },
    scrollToLine(line) { host.scrollTop = Math.max(0, (line - 1) * LH + PADT - host.clientHeight * 0.3); }
  };
}

/* ---------------- JSON Diff screen ---------------- */
const D = {
  names: { A: 'subscription-before.json', B: 'subscription-after.json' },
  opts: { ignoreOrder: false, redact: false, show: 'changes' },
  entries: [], pA: null, pB: null, sel: 0, geo: []
};
let timer = 0;
const queue = () => { clearTimeout(timer); timer = setTimeout(compare, 90); };
const edA = makeEditor($('#edA'), { label: 'Before document', placeholder: 'Paste JSON here, or open a file (up to 10 MB)', onInput: queue });
const edB = makeEditor($('#edB'), { label: 'After document', placeholder: 'Paste JSON here, or open a file (up to 10 MB)', onInput: queue });
const KIND = { chg: 'Changed', del: 'Removed', add: 'Added', eq: 'Equal' };
const SENSITIVE = /(e-?mail|token|secret|password|passwd|api[_-]?key|auth|phone|card|iban|ssn)/i;
const isSensitive = (path, v) => SENSITIVE.test(path || '') || (typeof v === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v));
function showVal(v, path) {
  if (D.opts.redact && isSensitive(path, v)) return 'redacted';
  let s = JSON.stringify(v);
  if (s === undefined) s = String(v);
  return s.length > 80 ? s.slice(0, 79) + '…' : s;
}
const displayPath = p => p === '' ? '(root)' : p;
const jsonPath = p => p === '' ? '$' : p.startsWith('[') ? '$' + p : '$.' + p;

function anchor(thisMap, otherMap, path) {
  const me = thisMap.get(path);
  const parent = me ? me.parent : null;
  const pe = parent != null ? thisMap.get(parent) : null;
  if (pe && pe.keys) {
    const idx = pe.keys.indexOf(path);
    for (let j = idx + 1; j < pe.keys.length; j++) { const o = otherMap.get(pe.keys[j]); if (o) return { line: o.line, edge: 'top' }; }
    for (let j = idx - 1; j >= 0; j--) { const o = otherMap.get(pe.keys[j]); if (o) return { line: o.end, edge: 'bottom' }; }
  }
  const op = parent != null ? otherMap.get(parent) : null;
  if (op) return { line: op.line, edge: 'bottom' };
  return { line: 1, edge: 'top' };
}

function compare() {
  const t0 = performance.now();
  const pA = parseJSONPos(edA.get()), pB = parseJSONPos(edB.get());
  D.pA = pA; D.pB = pB;
  paneState('A', pA); paneState('B', pB);
  if (pA.state === 'ok' && pB.state === 'ok') {
    D.entries = diff(pA.value, pB.value, D.opts);
    D.geo = D.entries.map(e => ({
      a: e.pa != null && pA.map.get(e.pa) ? { line: pA.map.get(e.pa).line, end: pA.map.get(e.pa).end } : (() => { const x = anchor(pB.map, pA.map, e.pb); return { line: x.line, end: x.line, edge: x.edge }; })(),
      b: e.pb != null && pB.map.get(e.pb) ? { line: pB.map.get(e.pb).line, end: pB.map.get(e.pb).end } : (() => { const x = anchor(pA.map, pB.map, e.pa); return { line: x.line, end: x.line, edge: x.edge }; })()
    }));
  } else { D.entries = []; D.geo = []; }
  const ms = performance.now() - t0;
  const changes = D.entries.filter(e => e.kind !== 'eq');
  const vis = visibleIdx();
  if (!vis.includes(D.sel)) D.sel = vis.length ? vis[0] : -1;
  const c = { chg: 0, del: 0, add: 0 }; changes.forEach(e => c[e.kind]++);
  console.assert(c.chg + c.del + c.add === changes.length, 'tally must equal the change list');
  D.counts = c;
  renderSummary(changes, c, ms);
  renderTally(changes, c);
  renderList();
  applyMarks();
  renderDetail();
}
function visibleIdx() { return D.entries.map((e, i) => i).filter(i => D.opts.show === 'all' || D.entries[i].kind !== 'eq'); }

function paneState(side, p) {
  const foot = $('#foot' + side), text = side === 'A' ? edA.get() : edB.get();
  const bytes = new Blob([text]).size;
  if (p.state === 'ok') foot.innerHTML = '<span class="ok">Valid JSON</span><span class="num">' + plural(p.lines, 'line') + ' · ' + fmtBytes(bytes) + '</span>';
  else if (p.state === 'empty') foot.innerHTML = '<span>Empty. Paste JSON, drop a file here, or open one.</span>';
  else foot.innerHTML = '<span class="bad num">Line ' + p.line + ', column ' + p.col + '</span><span>' + esc(p.message) + '</span>';
}

function renderSummary(changes, c, ms) {
  const sub = $('#diffSub'), stamp = $('#diffStamp');
  const { pA, pB } = D;
  if (pA.state !== 'ok' || pB.state !== 'ok') {
    const bad = [['Before', pA], ['After', pB]].filter(x => x[1].state === 'error');
    if (bad.length) sub.innerHTML = bad.map(([n, p]) => '<b>' + n + '</b> has a parse error on line ' + p.line).join(' and ') + ', so there is nothing to compare yet.';
    else sub.textContent = 'Paste or open two JSON documents to see what changed between them.';
    stamp.textContent = '';
    return;
  }
  if (!changes.length) {
    sub.innerHTML = '<b>No differences.</b> The two documents are equal' + (D.opts.ignoreOrder ? ' when array order is ignored.' : '.');
  } else {
    const roots = [...new Set(changes.map(e => topKey(e.pa != null ? e.pa : e.pb)))];
    let tail = '';
    if (isObj(pA.value) && isObj(pB.value)) {
      const all = new Set([...Object.keys(pA.value), ...Object.keys(pB.value)].map(k => topKey(joinKey('', k))));
      const eq = all.size - roots.length;
      tail = eq > 0 ? '; the other ' + plural(eq, 'top-level key') + (eq === 1 ? ' is' : ' are') + ' equal.' : '.';
    } else tail = '.';
    const names = roots.map(r => r === '' ? 'the root' : r);
    const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
    sub.innerHTML = '<b>' + plural(changes.length, 'change') + '</b> across ' + esc(list) + tail;
  }
  const keys = D.entries.length;
  stamp.textContent = 'Compared ' + plural(keys, 'value') + ' in ' + (ms < 1 ? ms.toFixed(2) : ms.toFixed(1)) + ' ms';
}
function topKey(p) { if (p === '') return ''; const m = /^([A-Za-z_$][\w$]*|\[[^\]]*\])/.exec(p); return m ? m[1] : p; }

function renderTally(changes, c) {
  const el = $('#tally'), h = $('#chgTitle');
  const { pA, pB } = D;
  if (pA.state !== 'ok' || pB.state !== 'ok') {
    h.innerHTML = '<span class="big" style="color:var(--faint)">—</span><span class="unit">no comparison yet</span>';
    el.innerHTML = '<div class="bar" aria-hidden="true"></div><p class="legend"><span>Waiting for two valid documents</span></p>';
    return;
  }
  const n = changes.length;
  const seg = (k, cls) => c[k] ? '<span class="' + cls + '" style="flex:' + c[k] + '"></span>' : '';
  h.innerHTML = '<span class="big">' + n + '</span><span class="unit">' + (n === 1 ? 'change' : 'changes') + ' in ' + plural(D.entries.length, 'value') + '</span>';
  el.innerHTML =
    (n ? '<div class="bar" role="img" aria-label="' + c.chg + ' changed, ' + c.del + ' removed, ' + c.add + ' added">' + seg('chg', 'sw-chg') + seg('del', 'sw-del') + seg('add', 'sw-add') + '</div>' : '<div class="bar" aria-hidden="true"></div>') +
    '<p class="legend"><span><i class="sw-chg"></i><b>' + c.chg + '</b> changed</span><span><i class="sw-del"></i><b>' + c.del + '</b> removed</span><span><i class="sw-add"></i><b>' + c.add + '</b> added</span></p>';
}

function renderList() {
  const el = $('#changeList');
  const { pA, pB } = D;
  if (pA.state === 'empty' && pB.state === 'empty') {
    el.innerHTML = '<div class="empty"><span>Nothing to compare. Paste two documents, open files, or bring back the sample.</span><button class="link-btn" id="loadSample">Load the subscription sample</button></div>';
    $('#loadSample').onclick = loadSample; return;
  }
  if (pA.state !== 'ok' || pB.state !== 'ok') {
    const which = [['Before', pA], ['After', pB]].filter(x => x[1].state !== 'ok').map(x => x[0] + (x[1].state === 'empty' ? ' is empty' : ' does not parse (line ' + x[1].line + ')'));
    el.innerHTML = '<div class="empty"><span>' + esc(which.join('; ')) + '. Changes appear as soon as both documents are valid JSON.</span></div>';
    return;
  }
  const idx = visibleIdx();
  if (!idx.length) { el.innerHTML = '<div class="empty"><span>No changes. Every value in Before matches After.</span></div>'; return; }
  el.innerHTML = idx.map(i => {
    const e = D.entries[i], p = e.pa != null ? e.pa : e.pb;
    let vals;
    if (e.kind === 'chg') vals = '<code class="old">' + esc(showVal(e.a, p)) + '</code><span class="arr" aria-label="to">→</span><code class="new">' + esc(showVal(e.b, p)) + '</code>';
    else if (e.kind === 'del') vals = '<code class="old">' + esc(showVal(e.a, p)) + '</code>';
    else if (e.kind === 'add') vals = '<code class="new">' + esc(showVal(e.b, p)) + '</code>';
    else vals = '<code>' + esc(showVal(e.a, p)) + '</code>';
    return '<button class="chg-row' + (e.kind === 'eq' ? ' eq' : '') + '" data-i="' + i + '" aria-current="' + (i === D.sel) + '">' +
      '<span class="chg-top"><code>' + esc(displayPath(p)) + '</code><span class="pill ' + e.kind + '">' + KIND[e.kind] + '</span></span>' +
      '<span class="chg-val">' + vals + '</span></button>';
  }).join('');
}
$('#changeList').addEventListener('click', e => {
  const b = e.target.closest('.chg-row'); if (!b) return;
  select(+b.dataset.i, true);
});
$('#changeList').addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const idx = visibleIdx(), k = idx.indexOf(D.sel);
  const nk = Math.min(idx.length - 1, Math.max(0, k + (e.key === 'ArrowDown' ? 1 : -1)));
  if (idx[nk] != null) { e.preventDefault(); select(idx[nk], true); const b = $('.chg-row[data-i="' + idx[nk] + '"]'); b && b.focus(); }
});
function select(i, scroll) {
  D.sel = i;
  $$('.chg-row').forEach(b => b.setAttribute('aria-current', String(+b.dataset.i === i)));
  applyMarks();
  if (scroll && D.geo[i]) { edA.scrollToLine(D.geo[i].a.line); edB.scrollToLine(D.geo[i].b.line); drawSeam(); }
  renderDetail();
}
function applyMarks() {
  const mA = new Map(), mB = new Map();
  const { pA, pB } = D;
  if (pA && pA.state === 'error') mA.set(pA.line, 'err');
  if (pB && pB.state === 'error') mB.set(pB.line, 'err');
  D.entries.forEach((e, i) => {
    if (e.kind === 'eq') return;
    const g = D.geo[i];
    if (e.kind !== 'add') for (let l = g.a.line; l <= g.a.end; l++) mA.set(l, e.kind);
    if (e.kind !== 'del') for (let l = g.b.line; l <= g.b.end; l++) mB.set(l, e.kind);
  });
  const s = D.entries[D.sel], g = D.geo[D.sel];
  const fA = s && s.pa != null ? [g.a.line, g.a.end] : null, fB = s && s.pb != null ? [g.b.line, g.b.end] : null;
  edA.mark(mA, fA); edB.mark(mB, fB);
  drawSeam();
}
function drawSeam() {
  const svg = $('#seam');
  if (!svg || !svg.getClientRects().length || !svg.clientWidth) return;
  const r = svg.getBoundingClientRect(), ra = edA.scroller.getBoundingClientRect(), rb = edB.scroller.getBoundingClientRect();
  const W = r.width, H = r.height;
  const top = Math.max(ra.top, rb.top) - r.top, bot = Math.min(ra.bottom, rb.bottom) - r.top;
  const y = (rect, sc, line, bottom) => rect.top - r.top + PADT + (line - 1) * LH + (bottom ? LH : 0) - sc.scrollTop;
  let out = '<defs><clipPath id="seamClip"><rect x="-2" y="' + top + '" width="' + (W + 4) + '" height="' + Math.max(0, bot - top) + '"/></clipPath></defs><g clip-path="url(#seamClip)">';
  const order = D.entries.map((e, i) => i).filter(i => D.entries[i].kind !== 'eq').sort((x, z) => (x === D.sel) - (z === D.sel));
  for (const i of order) {
    const e = D.entries[i], g = D.geo[i];
    const aT = e.pa != null ? y(ra, edA.scroller, g.a.line, false) : y(ra, edA.scroller, g.a.line, g.a.edge === 'bottom');
    const aB = e.pa != null ? y(ra, edA.scroller, g.a.end, true) : aT;
    const bT = e.pb != null ? y(rb, edB.scroller, g.b.line, false) : y(rb, edB.scroller, g.b.line, g.b.edge === 'bottom');
    const bB = e.pb != null ? y(rb, edB.scroller, g.b.end, true) : bT;
    if (Math.max(aB, bB) < top - 40 || Math.min(aT, bT) > bot + 40) continue;
    const pts = [[-1, aT], [5, aT], [W - 5, bT], [W + 1, bT], [W + 1, bB], [W - 5, bB], [5, aB], [-1, aB]].map(p => p[0] + ',' + p[1].toFixed(1)).join(' ');
    out += '<polygon class="band ' + e.kind + (i === D.sel ? ' sel' : '') + '" points="' + pts + '"/>';
  }
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = out + '</g>';
}
let seamRaf = 0;
const seamSoon = () => { cancelAnimationFrame(seamRaf); seamRaf = requestAnimationFrame(drawSeam); };
edA.scroller.addEventListener('scroll', seamSoon, { passive: true });
edB.scroller.addEventListener('scroll', seamSoon, { passive: true });
window.addEventListener('resize', seamSoon);

function renderDetail() {
  const el = $('#detail');
  const e = D.entries[D.sel];
  if (!e) { el.hidden = true; return; }
  el.hidden = false;
  const g = D.geo[D.sel], p = e.pa != null ? e.pa : e.pb;
  const typ = v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  const lines = (x) => 'line ' + x.line + (x.end > x.line ? '–' + x.end : '');
  const rows = [];
  rows.push(['Path', '<code>' + esc(jsonPath(p)) + '</code>']);
  rows.push(['Before', e.kind === 'add' ? '<span class="ln">not in Before</span>' : '<code>' + esc(showVal(e.a, p)) + '</code><span class="ln num">' + lines(g.a) + '</span>']);
  rows.push(['After', e.kind === 'del' ? '<span class="ln">not in After</span>' : '<code>' + esc(showVal(e.b, p)) + '</code><span class="ln num">' + lines(g.b) + '</span>']);
  if (e.kind === 'chg' && typ(e.a) !== typ(e.b)) rows.push(['Type', typ(e.a) + ' to ' + typ(e.b)]);
  el.innerHTML = '<div class="detail-head"><h3>' + KIND[e.kind] + ' value</h3><span class="links"><button class="link-btn" id="copyPath">Copy path</button><button class="link-btn" id="queryPath">Query in After</button></span></div>' +
    '<dl>' + rows.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('') + '</dl>';
  $('#copyPath').onclick = ev => copyText(jsonPath(p), ev.currentTarget, 'Path copied');
  $('#queryPath').onclick = () => { edQ.set(edB.get()); $('#qName').textContent = D.names.B; $('#qPath').value = jsonPath(e.pb != null ? e.pb : e.pa); go('jsonpath'); runQuery(); };
}

/* actions */
function loadSample() {
  edA.set(pretty(SAMPLE_A)); edB.set(pretty(SAMPLE_B));
  D.names = { A: 'subscription-before.json', B: 'subscription-after.json' }; syncNames(); D.sel = 0; compare();
}
function syncNames() { $('#nameA').textContent = D.names.A; $('#nameB').textContent = D.names.B; }
$('#btnSwap').onclick = () => { const a = edA.get(); edA.set(edB.get()); edB.set(a); D.names = { A: D.names.B, B: D.names.A }; syncNames(); compare(); say('Before and After swapped'); };
$('#btnFormat').onclick = () => {
  let n = 0;
  [[edA, D.pA], [edB, D.pB]].forEach(([ed, p]) => { if (p && p.state === 'ok') { ed.set(pretty(p.value)); n++; } });
  compare(); say(n ? 'Formatted ' + plural(n, 'document') : 'Nothing to format: fix the parse errors first');
};
$('#btnClear').onclick = () => { edA.set(''); edB.set(''); D.names = { A: 'Pasted', B: 'Pasted' }; syncNames(); compare(); edA.ta.focus(); say('Both documents cleared'); };
$('#optOrder').onchange = e => { D.opts.ignoreOrder = e.target.checked; compare(); };
$('#optRedact').onchange = e => { D.opts.redact = e.target.checked; renderList(); renderDetail(); };
$$('[data-show]').forEach(b => b.onclick = () => {
  D.opts.show = b.dataset.show;
  $$('[data-show]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  const vis = visibleIdx(); if (!vis.includes(D.sel)) D.sel = vis[0] ?? -1;
  renderList(); applyMarks(); renderDetail();
});

/* share: the state lives in the URL hash, never on a server */
const b64uEnc = str => { const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64uDecBytes = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const b64uDec = s => new TextDecoder().decode(b64uDecBytes(s));
async function copyText(text, btn, done) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } t.remove();
  }
  if (btn) {
    const span = btn.querySelector('span') || btn; const old = span.dataset.label || span.textContent; span.dataset.label = old;
    span.textContent = ok ? done : (btn.id === 'btnShare' ? 'Link is in the address bar' : 'Copy blocked');
    clearTimeout(btn._t); btn._t = setTimeout(() => { span.textContent = old; }, 2200);
  }
  say(ok ? done : 'Copy was blocked by the browser');
  return ok;
}
$('#btnShare').onclick = e => {
  const state = JSON.stringify({ a: edA.get(), b: edB.get(), o: D.opts.ignoreOrder ? 1 : 0 });
  const enc = b64uEnc(state);
  if (enc.length > 60000) { const s = e.currentTarget.querySelector('span'); s.textContent = 'Too large for a link'; setTimeout(() => s.textContent = 'Copy share link', 2400); return; }
  const path = '/json-diff#s=' + enc;
  try { history.replaceState(null, '', path); } catch (err) {}
  const url = location.origin + path;
  copyText(url, e.currentTarget, 'Link copied');
};

/* files: open or drop, up to 10 MB, read in the browser */
let fileTarget = 'A';
const fileHooks = {}; // filled in by the data tools below: target -> (text, name)
const fileIn = $('#fileIn');
$$('[data-open]').forEach(b => b.onclick = () => { fileTarget = b.dataset.open; fileIn.accept = /^C/.test(fileTarget) || fileTarget === 'R' ? '.csv,.tsv,.txt,.json,text/csv,text/plain,application/json' : '.json,.ndjson,.jsonl,.js,application/json,text/plain'; fileIn.value = ''; fileIn.click(); });
fileIn.onchange = () => { if (fileIn.files[0]) loadFile(fileIn.files[0], fileTarget); };
async function loadFile(f, target) {
  const foot = $('#foot' + target);
  if (f.size > MAX_FILE) { if (foot) foot.innerHTML = '<span class="bad">' + esc(f.name) + ' is ' + fmtBytes(f.size) + '; the limit is 10 MB.</span>'; return; }
  const text = await f.text();
  if (target === 'A' || target === 'B') { (target === 'A' ? edA : edB).set(text); D.names[target] = f.name; syncNames(); compare(); }
  else if (target === 'Q') { edQ.set(text); $('#qName').textContent = f.name; runQuery(); }
  else if (target === 'V') { edV.set(text); $('#vName').textContent = f.name; validate(); }
  else if (fileHooks[target]) fileHooks[target](text, f.name);
}
[['paneA', 'A'], ['paneB', 'B']].forEach(([id, side]) => {
  const p = $('#' + id);
  p.addEventListener('dragover', e => { e.preventDefault(); p.classList.add('drop'); });
  p.addEventListener('dragleave', () => p.classList.remove('drop'));
  p.addEventListener('drop', e => { e.preventDefault(); p.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (f) loadFile(f, side); });
});

/* ---------------- Query (a JSONPath subset) ---------------- */
function jsonpath(expr, root) {
  const s = expr.trim();
  if (!s.startsWith('$')) throw new Error('Start the expression with $');
  let i = 1, nodes = [{ p: '$', v: root }];
  const kid = (p, k) => IDENT.test(k) ? p + '.' + k : p + '[' + JSON.stringify(k) + ']';
  const children = n => Array.isArray(n.v) ? n.v.map((v, i) => ({ p: n.p + '[' + i + ']', v })) : isObj(n.v) ? Object.keys(n.v).map(k => ({ p: kid(n.p, k), v: n.v[k] })) : [];
  const child = (ns, k) => ns.flatMap(n => k === '*' ? children(n) : isObj(n.v) && has(n.v, k) ? [{ p: kid(n.p, k), v: n.v[k] }] : []);
  const descend = (ns, k) => { const out = []; const walk = n => { if (k === '*') out.push(...children(n)); else if (isObj(n.v) && has(n.v, k)) out.push({ p: kid(n.p, k), v: n.v[k] }); children(n).forEach(walk); }; ns.forEach(walk); return out; };
  while (i < s.length) {
    const rest = s.slice(i);
    let m;
    if (rest.startsWith('..')) {
      m = /^\.\.(\*|[A-Za-z_$][\w$-]*)/.exec(rest); if (!m) throw new Error('Expected a key after ".." at position ' + (i + 1));
      nodes = descend(nodes, m[1]);
    } else if (rest[0] === '.') {
      m = /^\.(\*|[A-Za-z_$][\w$-]*)/.exec(rest); if (!m) throw new Error('Expected a key after "." at position ' + (i + 1));
      nodes = child(nodes, m[1]);
    } else if (rest[0] === '[') {
      m = /^\[\s*(\*|-?\d+|'[^']*'|"[^"]*")\s*\]/.exec(rest); if (!m) throw new Error('Supported brackets are [n], [*] and [\'key\'] (position ' + (i + 1) + ')');
      const t = m[1];
      if (t === '*') nodes = child(nodes, '*');
      else if (/^-?\d+$/.test(t)) { const n = +t; nodes = nodes.flatMap(x => Array.isArray(x.v) ? (() => { const j = n < 0 ? x.v.length + n : n; return j >= 0 && j < x.v.length ? [{ p: x.p + '[' + j + ']', v: x.v[j] }] : []; })() : []); }
      else nodes = child(nodes, t.slice(1, -1));
    } else throw new Error('Unexpected "' + rest[0] + '" at position ' + (i + 1));
    i += m[0].length;
  }
  return nodes;
}
const edQ = makeEditor($('#edQ'), { label: 'Document to query', placeholder: 'Paste JSON to query', onInput: () => { clearTimeout(edQ._t); edQ._t = setTimeout(runQuery, 150); } });
function runQuery() {
  const p = parseJSONPos(edQ.get()), out = $('#qOut'), sub = $('#qSub'), foot = $('#footQ');
  const text = edQ.get();
  foot.innerHTML = p.state === 'ok' ? '<span class="ok">Valid JSON</span><span class="num">' + plural(p.lines, 'line') + ' · ' + fmtBytes(new Blob([text]).size) + '</span>' : p.state === 'empty' ? '<span>Empty. Paste a document or open a file.</span>' : '<span class="bad num">Line ' + p.line + ', column ' + p.col + '</span><span>' + esc(p.message) + '</span>';
  edQ.mark(p.state === 'error' ? new Map([[p.line, 'err']]) : new Map());
  const expr = $('#qPath').value;
  if (p.state !== 'ok') { out.innerHTML = '<div class="empty" style="margin:0">' + (p.state === 'empty' ? 'Paste a document to run the query against.' : 'The document does not parse (line ' + p.line + '), so the query cannot run.') + '</div>'; sub.textContent = 'Run a JSONPath expression against a document.'; return; }
  let res;
  try { res = jsonpath(expr, p.value); } catch (e) {
    out.innerHTML = '<p class="result-line bad"><svg aria-hidden="true"><use href="#i-alert"/></svg>' + esc(e.message) + '</p>'; sub.innerHTML = '<b>' + esc(expr) + '</b> is not a supported expression.'; return;
  }
  sub.innerHTML = '<b>' + esc(expr) + '</b> matched ' + plural(res.length, 'value') + ' in ' + esc($('#qName').textContent) + '.';
  const hits = new Map(), key = q => q === '$' ? '' : q.startsWith('$.') ? q.slice(2) : q.slice(1);
  res.forEach(r => { const m = p.map.get(key(r.p)); if (m) for (let l = m.line; l <= m.end; l++) hits.set(l, 'hit'); });
  edQ.mark(hits);
  const firstHit = res.length && p.map.get(key(res[0].p)); if (firstHit) edQ.scrollToLine(firstHit.line);
  out.innerHTML = res.length ? '<div class="matches">' + res.slice(0, 200).map(r => '<div class="match"><code class="p">' + esc(r.p) + '</code><pre>' + esc(JSON.stringify(r.v, null, 2)) + '</pre></div>').join('') + '</div>' + (res.length > 200 ? '<p class="meta">Showing the first 200 of ' + res.length.toLocaleString('en-US') + '.</p>' : '')
    : '<div class="empty" style="margin:0">No values match this path.</div>';
  const ex = ['$.plan', '$.features[*]', '$.features[-1]', '$..id', '$.customer.email', '$.metadata.*'];
  out.innerHTML += '<h3 class="ex-h">Examples on this document</h3><ul class="ex">' + ex.map(x => { let n = 0; try { n = jsonpath(x, p.value).length; } catch (e) {} return '<li><button class="ex-b" data-q="' + esc(x) + '"><code>' + esc(x) + '</code><span class="num">' + plural(n, 'match', 'matches') + '</span></button></li>'; }).join('') + '</ul>';
}
$('#qOut').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; $('#qPath').value = b.dataset.q; runQuery(); });
$('#qForm').onsubmit = e => { e.preventDefault(); runQuery(); };

/* ---------------- Validate ---------------- */
const BROKEN = pretty({ id: 'evt_3Nf81', type: 'invoice.paid', created: '2026-10-24T08:12:44Z', data: { invoice: 'in_7Hc2', amount_paid: 2900, currency: 'eur', customer: 'cus_R2d9' } }).replace('"currency": "eur",', '"currency": "eur"');
const edV = makeEditor($('#edV'), { label: 'Document to validate', placeholder: 'Paste JSON to validate', onInput: () => { clearTimeout(edV._t); edV._t = setTimeout(validate, 120); } });
function excerpt(text, line, col) {
  const L = text.split('\n'), from = Math.max(1, line - 3), to = Math.min(L.length, line + 1);
  let h = '<h3 class="ex-h">Around line ' + line + '</h3><div class="excerpt" aria-label="Source around the error">';
  for (let n = from; n <= to; n++) {
    h += '<div' + (n === line ? ' class="e"' : '') + '><span class="n">' + n + '</span>' + esc(L[n - 1]) + '</div>';
    if (n === line) h += '<div class="c"><span class="n"></span>' + ' '.repeat(Math.max(0, col - 1)) + '^ here</div>';
  }
  return h + '</div>';
}
function validate() {
  const text = edV.get(), p = parseJSONPos(text), out = $('#vOut'), sub = $('#vSub'), foot = $('#footV');
  edV.mark(p.state === 'error' ? new Map([[p.line, 'err']]) : new Map(), p.state === 'error' ? [p.line, p.line] : null);
  const bytes = new Blob([text]).size;
  if (p.state === 'empty') { sub.textContent = 'Paste or open a document to check it.'; out.innerHTML = '<div class="empty" style="margin:0">Nothing to validate yet.</div>'; foot.textContent = 'Empty.'; return; }
  if (p.state === 'error') {
    sub.innerHTML = '<b>Not valid JSON.</b> Line ' + p.line + ', column ' + p.col + ': ' + esc(p.message) + '.';
    foot.innerHTML = '<span class="bad num">Line ' + p.line + ', column ' + p.col + '</span><span>' + esc(p.message) + '</span>';
    const src = text.split('\n')[p.line - 1] || '';
    out.innerHTML = '<p class="result-line bad"><svg aria-hidden="true"><use href="#i-alert"/></svg>Not valid JSON</p>' +
      '<dl class="kv" style="margin-top:12px"><dt>Where</dt><dd class="num">line ' + p.line + ', column ' + p.col + '</dd><dt>Problem</dt><dd>' + esc(p.message) + '</dd><dt>Line ' + p.line + '</dt><dd><code>' + esc(src.trim()) + '</code></dd><dt>Size</dt><dd class="num">' + fmtBytes(bytes) + '</dd></dl>' + excerpt(text, p.line, p.col);
    return;
  }
  let depth = 0, values = 0, keys = 0;
  (function walk(v, d) { values++; depth = Math.max(depth, d); if (Array.isArray(v)) v.forEach(x => walk(x, d + 1)); else if (isObj(v)) Object.keys(v).forEach(k => { keys++; walk(v[k], d + 1); }); })(p.value, 0);
  const top = Array.isArray(p.value) ? 'array of ' + plural(p.value.length, 'item') : isObj(p.value) ? 'object with ' + plural(Object.keys(p.value).length, 'key') : typeof p.value;
  sub.innerHTML = '<b>Valid JSON:</b> ' + esc(top) + ', ' + plural(depth, 'level') + ' deep.';
  foot.innerHTML = '<span class="ok">Valid JSON</span><span class="num">' + plural(p.lines, 'line') + ' · ' + fmtBytes(bytes) + '</span>';
  out.innerHTML = '<p class="result-line ok"><svg aria-hidden="true"><use href="#i-valid"/></svg>Valid JSON</p>' +
    '<dl class="kv" style="margin-top:12px"><dt>Top level</dt><dd>' + esc(top) + '</dd><dt>Depth</dt><dd class="num">' + depth + '</dd><dt>Keys</dt><dd class="num">' + keys.toLocaleString('en-US') + '</dd><dt>Values</dt><dd class="num">' + values.toLocaleString('en-US') + '</dd><dt>Size</dt><dd class="num">' + fmtBytes(bytes) + '</dd></dl>' +
    (isObj(p.value) ? '<h3 class="ex-h">Top-level keys</h3><dl class="kv">' + Object.keys(p.value).map(k => { const m = p.map.get(joinKey('', k)); const v = p.value[k]; const t = v === null ? 'null' : Array.isArray(v) ? 'array of ' + v.length : typeof v; return '<dt><code>' + esc(k) + '</code></dt><dd>' + t + '<span class="sub num">line ' + m.line + '</span></dd>'; }).join('') + '</dl>' : '');
}
$('#vFormat').onclick = () => { const p = parseJSONPos(edV.get()); if (p.state === 'ok') { edV.set(pretty(p.value)); validate(); say('Formatted'); } else say('Fix the error on line ' + p.line + ' before formatting'); };

/* ---------------- IP (local reading only) ---------------- */
function readIP(s) {
  s = s.trim();
  const m4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (m4) {
    const o = m4.slice(1).map(Number);
    if (o.some(x => x > 255)) return { ok: false, why: 'Each IPv4 part must be 0 to 255.' };
    const n = ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
    const inR = (base, bits) => { const b = base.split('.').map(Number); const bn = ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3]; const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0; return ((n & mask) >>> 0) === ((bn & mask) >>> 0); };
    const kinds = [['127.0.0.0', 8, 'Loopback', '127.0.0.0/8'], ['10.0.0.0', 8, 'Private', '10.0.0.0/8, RFC 1918'], ['172.16.0.0', 12, 'Private', '172.16.0.0/12, RFC 1918'], ['192.168.0.0', 16, 'Private', '192.168.0.0/16, RFC 1918'], ['100.64.0.0', 10, 'Shared (carrier-grade NAT)', '100.64.0.0/10, RFC 6598'], ['169.254.0.0', 16, 'Link-local', '169.254.0.0/16'], ['224.0.0.0', 4, 'Multicast', '224.0.0.0/4'], ['0.0.0.0', 8, 'This network', '0.0.0.0/8'], ['240.0.0.0', 4, 'Reserved', '240.0.0.0/4']];
    const k = kinds.find(x => inR(x[0], x[1]));
    return { ok: true, ver: 'IPv4', kind: k ? k[2] : 'Public', range: k ? k[3] : 'Globally routable', int: n, hex: '0x' + n.toString(16).padStart(8, '0'), bin: o.map(x => x.toString(2).padStart(8, '0')).join('.') };
  }
  if (/^[0-9a-fA-F:]+$/.test(s) && s.includes(':')) {
    const dbl = s.split('::');
    if (dbl.length > 2) return { ok: false, why: '"::" may appear once.' };
    const L = dbl[0] ? dbl[0].split(':') : [], R = dbl.length === 2 && dbl[1] ? dbl[1].split(':') : [];
    if ([...L, ...R].some(g => !/^[0-9a-fA-F]{1,4}$/.test(g))) return { ok: false, why: 'Each IPv6 group is 1 to 4 hex digits.' };
    const fill = 8 - L.length - R.length;
    if (dbl.length === 1 ? L.length !== 8 : fill < 1) return { ok: false, why: 'An IPv6 address has 8 groups.' };
    const g = [...L, ...Array(dbl.length === 2 ? fill : 0).fill('0'), ...R].map(x => x.padStart(4, '0').toLowerCase());
    const first = parseInt(g[0], 16);
    const kind = g.every(x => x === '0000') ? 'Unspecified' : g.slice(0, 7).every(x => x === '0000') && g[7] === '0001' ? 'Loopback' : (first & 0xffc0) === 0xfe80 ? 'Link-local' : (first & 0xfe00) === 0xfc00 ? 'Unique local (private)' : (first & 0xff00) === 0xff00 ? 'Multicast' : g[0] === '2001' && g[1] === '0db8' ? 'Documentation' : 'Global unicast';
    return { ok: true, ver: 'IPv6', kind, range: kind === 'Global unicast' ? 'Globally routable' : '', full: g.join(':') };
  }
  return { ok: false, why: 'Not an IPv4 or IPv6 address.' };
}
function showIP() {
  const r = readIP($('#ipIn').value), out = $('#ipOut'), sub = $('#ipSub');
  if (!$('#ipIn').value.trim()) { out.innerHTML = ''; sub.textContent = 'Type an address to read it locally.'; return; }
  if (!r.ok) { out.innerHTML = '<dt>Result</dt><dd style="color:var(--negative)">' + esc(r.why) + '</dd>'; sub.textContent = 'That is not a valid IP address.'; return; }
  sub.innerHTML = '<b>' + esc($('#ipIn').value.trim()) + '</b>: ' + esc(r.kind) + ', ' + r.ver + '. Who owns it and where it is need a lookup over the network.';
  out.innerHTML = '<dt>Version</dt><dd>' + r.ver + '</dd><dt>Kind</dt><dd>' + esc(r.kind) + (r.range ? '<span class="sub">' + esc(r.range) + '</span>' : '') + '</dd>' +
    (r.ver === 'IPv4' ? '<dt>Integer</dt><dd><code>' + r.int + '</code></dd><dt>Hex</dt><dd><code>' + r.hex + '</code></dd><dt>Binary</dt><dd><code>' + r.bin + '</code></dd>' : '<dt>Expanded</dt><dd><code>' + r.full + '</code></dd>');
}
$('#ipIn').addEventListener('input', showIP);
$('#ipLookup').onclick = () => { $('#ipOffline').querySelector('b').textContent = 'Not looked up: this build is offline by design.'; say('Lookup not sent: it needs the network'); };

/* ---------------- Ping: times HTTPS requests to the host, only when asked ---------------- */
/* Browsers cannot send ICMP, so this times a HEAD request from this browser to https://<host>/, the way the
   old json0 Ping did: no-cors, no cache, no cookies, no referrer, a 5 s timeout. With no-cors the status code
   cannot be read, so a reply only proves the host answered. Nothing is sent until the Ping button is pressed. */
const PING = { run: 0, ctrl: null, busy: false, host: '', results: [], silent: -1 };
const PING_TRIES = 3, PING_TIMEOUT = 5000, PING_GAP = 1000;
function pingHostOf(v) {
  let host = '';
  try { host = new URL(/^[a-z]+:\/\//i.test(v) ? v : 'https://' + v).hostname; } catch (e) { host = ''; }
  return host && /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(host) ? host : '';
}
const PING_LABEL = { ok: 'Reached', timeout: 'Timed out', fail: 'Failed', stopped: 'Stopped', wait: 'Sending…' };
function drawPingRows() {
  const rows = [];
  for (let i = 0; i < PING_TRIES; i++) {
    const r = PING.results[i];
    const st = r ? PING_LABEL[r.s] : '—', cls = !r ? ' class="dash"' : r.s === 'fail' || r.s === 'timeout' ? ' style="color:var(--negative)"' : '';
    const ms = r && r.ms != null ? r.ms.toLocaleString('en-US') + ' ms' : '—';
    rows.push('<tr><td class="num">' + (i + 1) + '</td><td' + cls + '>' + st + '</td><td class="n num' + (r && r.ms != null ? '' : ' dash') + '">' + ms + '</td></tr>');
  }
  $('#pingRows').innerHTML = rows.join('');
}
function showPing() {
  const v = $('#pingIn').value.trim(), out = $('#pingOut'), host = pingHostOf(v);
  out.innerHTML = host ? '<dt>Host</dt><dd><code>' + esc(host) + '</code></dd><dt>Requests</dt><dd><code>https://' + esc(host) + '/</code></dd><dt>Method</dt><dd>HEAD, 3 times, no cache, 5 s timeout</dd>' : '<dt>Host</dt><dd style="color:var(--negative)">Not a valid host name or URL.</dd>';
  $('#pingSub').innerHTML = host ? '<b>' + esc(host) + '</b> has not been pinged yet. Press Ping to time 3 HTTPS requests from this browser.' : 'Type a host name or URL.';
}
function pingFetch(url) {
  const ctrl = new AbortController(); PING.ctrl = ctrl;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, PING_TIMEOUT);
  const t0 = performance.now();
  return fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'follow', signal: ctrl.signal })
    .then(() => ({ s: 'ok', ms: Math.round(performance.now() - t0) }))
    .catch(() => ({ s: timedOut ? 'timeout' : ctrl.signal.aborted ? 'stopped' : 'fail', ms: null }))
    .finally(() => clearTimeout(timer));
}
function pingFinding(host, stopped) {
  const done = PING.results.filter(r => r.s !== 'stopped' && r.s !== 'wait'), ok = done.filter(r => r.s === 'ok');
  const avg = ok.length ? Math.round(ok.reduce((a, r) => a + r.ms, 0) / ok.length) : 0;
  const tail = stopped ? ' Stopped after ' + plural(done.length, 'attempt') + '.' : '';
  if (!done.length) return '<b>' + esc(host) + '</b>: stopped before any attempt finished.';
  if (ok.length) return '<b>' + esc(host) + ' answered ' + ok.length + ' of ' + done.length + '</b>, average ' + avg.toLocaleString('en-US') + ' ms over HTTPS from this browser.' + tail;
  const t = done.filter(r => r.s === 'timeout').length;
  return '<b>' + esc(host) + ' did not answer</b>: ' + (t ? t + ' timed out after 5 s' + (done.length - t ? ', ' + (done.length - t) + ' failed' : '') : done.length + ' failed') + '. It may be down, not serving HTTPS, or unreachable from this network.' + tail;
}
async function runPing() {
  const host = pingHostOf($('#pingIn').value.trim());
  if (!host) { showPing(); $('#pingIn').focus(); say('Type a valid host name or URL first'); return; }
  if (navigator.onLine === false) { $('#pingSub').innerHTML = '<b>This browser is offline</b>, so nothing was sent to ' + esc(host) + '.'; say('Offline: nothing sent'); return; }
  const id = ++PING.run; PING.busy = true; PING.host = host; PING.results = [];
  $('#pingBtn').textContent = 'Stop'; drawPingRows();
  $('#pingSub').innerHTML = 'Pinging <b>' + esc(host) + '</b>…';
  for (let i = 0; i < PING_TRIES && id === PING.run; i++) {
    if (i) { await new Promise(r => setTimeout(r, PING_GAP)); if (PING.silent === id) return; if (id !== PING.run) break; }
    PING.results[i] = { s: 'wait', ms: null }; drawPingRows();
    const r = await pingFetch('https://' + host + '/');
    if (PING.silent === id) return;
    if (id !== PING.run && r.s !== 'stopped') break;
    PING.results[i] = r; drawPingRows();
    if (r.s === 'stopped') break;
  }
  const stopped = PING.results.some(r => r.s === 'stopped') || PING.results.length < PING_TRIES;
  PING.results = PING.results.filter(r => r.s !== 'wait'); drawPingRows();
  if (id === PING.run || stopped) {
    PING.busy = false; $('#pingBtn').textContent = 'Run again';
    $('#pingSub').innerHTML = pingFinding(host, stopped);
    say($('#pingSub').textContent);
  }
}
function stopPing(silent) { if (silent) PING.silent = PING.run; PING.run++; PING.busy = false; if (PING.ctrl) PING.ctrl.abort(); }
$('#pingIn').addEventListener('input', () => { if (PING.busy) stopPing(true); PING.results = []; drawPingRows(); $('#pingBtn').textContent = 'Ping'; showPing(); });
$('#pingForm').onsubmit = e => { e.preventDefault(); if (PING.busy) stopPing(); else runPing(); };
drawPingRows();

/* ---------------- Base64 ---------------- */
const b64 = { lock: false };
const toB64 = (text, url) => { const bytes = new TextEncoder().encode(text); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); const s = btoa(bin); return url ? s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : s; };
function encodeB64() {
  const t = $('#b64Text').value, url = $('#b64Url').checked, enc = toB64(t, url);
  $('#b64Enc').value = enc;
  const n = new TextEncoder().encode(t).length;
  $('#b64TextMeta').textContent = fmtBytes(n); $('#b64EncMeta').textContent = plural(enc.length, 'character');
  $('#b64TextFoot').textContent = 'Encoded ' + fmtBytes(n) + ' as UTF-8.'; $('#b64EncFoot').textContent = url ? 'URL-safe alphabet, no padding.' : 'Standard alphabet with padding.';
  $('#b64Sub').innerHTML = '<b>' + fmtBytes(n) + '</b> of text is ' + plural(enc.length, 'Base64 character') + '.';
}
function decodeB64() {
  const raw = $('#b64Enc').value.replace(/\s+/g, '');
  $('#b64EncMeta').textContent = plural(raw.length, 'character');
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(raw) || raw.replace(/=+$/, '').length % 4 === 1) { $('#b64EncFoot').innerHTML = '<span class="bad">Not Base64: only A-Z, a-z, 0-9, + / (or - _) and = padding.</span>'; $('#b64Sub').textContent = 'The Base64 side does not decode.'; return; }
  let bytes; try { bytes = b64uDecBytes(raw.replace(/=+$/, '')); } catch (e) { $('#b64EncFoot').innerHTML = '<span class="bad">Not Base64.</span>'; return; }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) {
    $('#b64Text').value = ''; $('#b64EncFoot').innerHTML = '<span class="bad">Decodes to ' + fmtBytes(bytes.length) + ' that are not UTF-8 text.</span>'; $('#b64TextMeta').textContent = ''; return;
  }
  $('#b64Text').value = text; $('#b64TextMeta').textContent = fmtBytes(bytes.length);
  $('#b64EncFoot').textContent = 'Decoded to ' + fmtBytes(bytes.length) + ' of UTF-8 text.'; $('#b64TextFoot').textContent = 'Type here to encode.';
  $('#b64Sub').innerHTML = '<b>' + plural(raw.length, 'Base64 character') + '</b> decode to ' + fmtBytes(bytes.length) + ' of text.';
}
$('#b64Text').addEventListener('input', encodeB64);
$('#b64Enc').addEventListener('input', decodeB64);
$('#b64Url').onchange = encodeB64;

/* ---------------- JWT ---------------- */
const SAMPLE_JWT = (() => {
  const h = { alg: 'HS256', typ: 'JWT' };
  const p = { iss: 'https://auth.northwind-labs.io', sub: 'cus_R2d9', email: 'ops@northwind-labs.io', plan: 'team', scope: 'billing:read billing:write', iat: Date.UTC(2026, 9, 11, 9, 0) / 1000, exp: Date.UTC(2026, 9, 18, 9, 0) / 1000 };
  return b64uEnc(JSON.stringify(h)) + '.' + b64uEnc(JSON.stringify(p)) + '.Qm9fV2x5c1Rk3kQ1Zr8mYp0sHn7aXc2LwE9uJt6vRgM';
})();
const isoUTC = d => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
function rel(sec) {
  const diffMs = Date.now() - sec * 1000, abs = Math.abs(diffMs);
  const unit = abs >= 86400000 ? [Math.round(abs / 86400000), 'day'] : abs >= 3600000 ? [Math.round(abs / 3600000), 'hour'] : [Math.max(1, Math.round(abs / 60000)), 'minute'];
  const t = plural(unit[0], unit[1]);
  return diffMs >= 0 ? t + ' ago' : 'in ' + t;
}
function decodeJWT() {
  const raw = $('#jwtIn').value.trim(), parts = raw.split('.');
  const H = $('#jwtHead'), P = $('#jwtPay'), C = $('#jwtClaims'), S = $('#jwtSig'), sub = $('#jwtSub');
  $('#jwtMeta').textContent = raw ? plural(raw.length, 'character') : '';
  const fail = msg => { H.textContent = ''; P.textContent = ''; C.innerHTML = '<dt>Token</dt><dd style="color:var(--negative)">' + esc(msg) + '</dd>'; S.innerHTML = ''; sub.textContent = msg; };
  if (!raw) { fail('Paste a token to decode it.'); C.innerHTML = ''; return; }
  if (parts.length !== 3) return fail('A JWT has three parts separated by dots; this has ' + parts.length + '.');
  let h, p;
  try { h = JSON.parse(b64uDec(parts[0])); } catch (e) { return fail('The header is not Base64url-encoded JSON.'); }
  try { p = JSON.parse(b64uDec(parts[1])); } catch (e) { return fail('The payload is not Base64url-encoded JSON.'); }
  H.textContent = pretty(h); P.textContent = pretty(p);
  const rows = [];
  const dateRow = (k, label, verb) => { if (typeof p[k] === 'number') { const d = new Date(p[k] * 1000); rows.push([label, '<span class="num">' + isoUTC(d) + '</span><span class="sub">' + verb(p[k]) + '</span>']); } };
  if (p.iss) rows.push(['Issuer', '<code>' + esc(p.iss) + '</code>']);
  if (p.sub) rows.push(['Subject', '<code>' + esc(p.sub) + '</code>']);
  dateRow('iat', 'Issued', s => 'issued ' + rel(s));
  dateRow('nbf', 'Not before', s => (Date.now() >= s * 1000 ? 'active since ' : 'active ') + rel(s));
  let status = 'has no expiry';
  if (typeof p.exp === 'number') {
    const expired = Date.now() >= p.exp * 1000;
    status = expired ? 'expired ' + rel(p.exp) : 'expires ' + rel(p.exp);
    rows.push(['Expires', '<span class="num">' + isoUTC(new Date(p.exp * 1000)) + '</span><span class="sub" style="color:' + (expired ? 'var(--negative)' : 'var(--positive)') + '">' + status + '</span>']);
  }
  rows.push(['Algorithm', esc(h.alg || 'none')]);
  C.innerHTML = rows.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
  S.innerHTML = '<p>' + (parts[2] ? plural(parts[2].length, 'character') + ' of ' + esc(h.alg || '') + ' signature. ' : 'No signature. ') + 'Not verified: checking it needs the signing secret or public key, which json0 never asks for.</p>';
  sub.innerHTML = '<b>' + esc(h.alg || 'unsigned') + ' token for ' + esc(p.sub || 'no subject') + '</b>, ' + esc(status) + '.';
}
$('#jwtIn').addEventListener('input', decodeJWT);

/* ---------------- Hash ---------------- */
const ALGS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
let hashSeq = 0;
async function doHash() {
  const t = $('#hashIn').value, seq = ++hashSeq, data = new TextEncoder().encode(t);
  $('#hashMeta').textContent = fmtBytes(data.length);
  const out = $('#hashOut');
  if (!(window.crypto && crypto.subtle)) { out.innerHTML = '<div class="offline"><b>Web Crypto is not available here.</b><span>This page is not in a secure context, so the browser hides crypto.subtle.</span></div>'; return; }
  const res = await Promise.all(ALGS.map(a => crypto.subtle.digest(a, data).then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''))));
  if (seq !== hashSeq) return;
  out.innerHTML = ALGS.map((a, i) => '<div class="hash-row"><span class="alg">' + a + '</span><code id="h' + i + '">' + res[i] + '</code><button class="btn ghost sm" data-copy="h' + i + '"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy</span></button></div>').join('');
  $('#hashSub').innerHTML = '<b>' + fmtBytes(data.length) + '</b> hashed four ways; SHA-256 begins <code>' + res[1].slice(0, 12) + '</code>.';
}
$('#hashIn').addEventListener('input', doHash);

/* ---------------- UUID ---------------- */
const uuid4 = () => crypto.randomUUID ? crypto.randomUUID() : (() => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); })();
let uuids = [];
function genUUID() {
  const inp = $('#uuidN'); let n = Math.round(+inp.value || 1); n = Math.min(50, Math.max(1, n)); inp.value = n;
  uuids = Array.from({ length: n }, uuid4); showUUID();
}
function showUUID() {
  const up = $('#uuidUpper').checked, list = uuids.map(u => up ? u.toUpperCase() : u);
  $('#uuidOut').innerHTML = list.map((u, i) => '<li><code id="u' + i + '">' + u + '</code><button class="btn ghost sm" data-copy="u' + i + '"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy</span></button></li>').join('');
  $('#uuidTitle').textContent = plural(list.length, 'UUID');
  $('#uuidSub').innerHTML = '<b>' + plural(list.length, 'version 4 UUID') + '</b> from crypto.randomUUID, 122 random bits each.';
  const s = list[0] || '';
  $('#uuidInfo').innerHTML = '<dt>Version</dt><dd>4 (random)<span class="sub">the 13th hex digit is <code>' + (s[14] || '4') + '</code></span></dd><dt>Variant</dt><dd>RFC 9562<span class="sub">the 17th hex digit is <code>' + (s[19] || '') + '</code>, one of 8, 9, a, b</span></dd><dt>Length</dt><dd class="num">36 characters</dd><dt>Random bits</dt><dd class="num">122</dd><dt>Source</dt><dd>' + (crypto.randomUUID ? 'crypto.randomUUID' : 'crypto.getRandomValues') + '</dd>';
}
$('#uuidGen').onclick = genUUID;
$('#uuidUpper').onchange = showUUID;
$('#uuidN').addEventListener('keydown', e => { if (e.key === 'Enter') genUUID(); });
$('#uuidCopy').onclick = e => copyText($$('#uuidOut code').map(c => c.textContent).join('\n'), e.currentTarget, 'Copied ' + uuids.length);

/* ---------------- XML to JSON ---------------- */
const SAMPLE_XML = '<invoice id="in_7Hc2" currency="eur" status="paid">\n  <customer id="cus_R2d9">ops@northwind-labs.io</customer>\n  <subscription>sub_8Kq2LmV41</subscription>\n  <line sku="team-seat" quantity="5">2900</line>\n  <line sku="starter-credit" quantity="1">-900</line>\n  <period start="2026-10-01" end="2026-11-01"/>\n</invoice>';
function xmlToObj(el) {
  const o = {};
  for (const a of el.attributes) o['@' + a.name] = a.value;
  const kids = [...el.children];
  const text = [...el.childNodes].filter(n => n.nodeType === 3 || n.nodeType === 4).map(n => n.nodeValue).join('').trim();
  if (!kids.length && !el.attributes.length) return text;
  for (const k of kids) { const v = xmlToObj(k); if (has(o, k.nodeName)) { if (!Array.isArray(o[k.nodeName])) o[k.nodeName] = [o[k.nodeName]]; o[k.nodeName].push(v); } else o[k.nodeName] = v; }
  if (text) o['#text'] = text;
  return o;
}
function convertXML() {
  const t = $('#xmlIn').value, out = $('#xmlOut'), foot = $('#xmlFoot');
  $('#xmlMeta').textContent = t ? fmtBytes(new Blob([t]).size) : '';
  if (!t.trim()) { out.textContent = ''; foot.textContent = 'Paste XML to convert it.'; $('#xmlSub').textContent = 'Paste XML to convert it.'; return; }
  const doc = new DOMParser().parseFromString(t, 'application/xml');
  const err = doc.getElementsByTagName('parsererror')[0];
  if (err) { const msg = (err.textContent || '').split('\n').map(s => s.trim()).filter(Boolean)[0] || 'The XML does not parse.'; out.textContent = ''; foot.innerHTML = '<span class="bad">' + esc(msg.replace(/^This page contains the following errors:/, '').trim() || msg) + '</span>'; $('#xmlSub').textContent = 'The XML does not parse.'; return; }
  const root = doc.documentElement, json = { [root.nodeName]: xmlToObj(root) };
  out.textContent = pretty(json);
  const count = doc.getElementsByTagName('*').length;
  foot.innerHTML = '<span class="ok">Well-formed XML</span><span class="num">' + plural(count, 'element') + '</span>';
  $('#xmlSub').innerHTML = '<b>&lt;' + esc(root.nodeName) + '&gt;</b> and ' + plural(count - 1, 'element') + ' inside it converted; repeated elements became arrays.';
}
$('#xmlIn').addEventListener('input', convertXML);

/* ================================================================================================
   The data tools (Format, Table, Schema and types, CSV, MongoDB, Redact). Same helpers as above.
   ================================================================================================ */

/* ---------------- shared helpers ---------------- */
const nf = n => n.toLocaleString('en-US');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const byteLen = t => new TextEncoder().encode(t).length;
function seg(el, onChange) {
  const btns = $$('button', el);
  btns.forEach(b => b.addEventListener('click', () => { btns.forEach(x => x.setAttribute('aria-pressed', String(x === b))); onChange && onChange(b.dataset.v); }));
  return { get: () => (btns.find(b => b.getAttribute('aria-pressed') === 'true') || btns[0]).dataset.v, set(v) { btns.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === v))); } };
}
function statsHTML(items) {
  return items.map(([dt, dd, cls]) => '<div><dt>' + dt + '</dt><dd' + (cls ? ' class="' + cls + '"' : '') + '>' + dd + '</dd></div>').join('');
}
function setStats(el, items) { el.style.setProperty('--n', items.length); el.innerHTML = statsHTML(items); }
function footParse(foot, p, text, what) {
  if (p.state === 'ok') foot.innerHTML = '<span class="ok">' + (what || 'Valid JSON') + '</span><span class="num">' + plural(p.lines, 'line') + ' · ' + fmtBytes(byteLen(text)) + '</span>';
  else if (p.state === 'empty') foot.innerHTML = '<span>Empty. Paste here or open a file.</span>';
  else foot.innerHTML = '<span class="bad num">Line ' + p.line + ', column ' + p.col + '</span><span>' + esc(p.message) + '</span>';
}
const debounce = (fn, ms) => { let t = 0; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
const emptyBox = msg => '<div class="empty">' + msg + '</div>';
const errLine = msg => '<p class="inline-err"><svg aria-hidden="true"><use href="#i-alert"/></svg><span>' + esc(msg) + '</span></p>';
const valType = v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
const short = (s, n = 60) => s.length > n ? s.slice(0, n - 1) + '…' : s;

/* ---------------- Format ---------------- */
const SAMPLE_INVOICE_MIN = JSON.stringify({ object: 'invoice', id: 'in_7Hc2', number: 'NWL-0412', status: 'paid', customer: { id: 'cus_R2d9', email: 'ops@northwind-labs.io', name: 'Northwind Labs GmbH', country: 'DE' }, subscription: 'sub_8Kq2LmV41', currency: 'eur', lines: [{ sku: 'team-seat', description: 'Team plan seat', quantity: 5, unit_amount: 580, amount: 2900 }, { sku: 'starter-credit', description: 'Unused time on Starter', quantity: 1, unit_amount: -900, amount: -900 }], subtotal: 2000, tax: 380, total: 2380, amount_paid: 2380, created: '2026-10-01T00:04:12Z', period: { start: '2026-10-01', end: '2026-11-01' }, metadata: { upgraded_from: 'starter' } });
const FMT = { mode: 'pretty', indent: '2', out: '' };
const edF = makeEditor($('#edF'), { label: 'JSON to format', placeholder: 'Paste JSON here, or open a file', onInput: debounce(runFormat, 120) });
const edFO = makeEditor($('#edFO'), { label: 'Formatted output', readOnly: true });
const fmtMode = seg($('#fmtMode'), v => { FMT.mode = v; runFormat(); });
seg($('#fmtIndent'), v => { FMT.indent = v; runFormat(); });
$('#fmtSort').onchange = runFormat;
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (isObj(v)) { const o = {}; Object.keys(v).sort().forEach(k => { o[k] = sortKeys(v[k]); }); return o; }
  return v;
}
function countKeys(v) { let n = 0; (function w(x) { if (Array.isArray(x)) x.forEach(w); else if (isObj(x)) Object.keys(x).forEach(k => { n++; w(x[k]); }); })(v); return n; }
function runFormat() {
  const text = edF.get(), sub = $('#fmtSub'), mode = FMT.mode;
  $$('#fmtIndent button').forEach(b => { b.disabled = mode !== 'pretty'; });
  $('#fmtSort').disabled = mode === 'unescape';
  const ind = FMT.indent === 'tab' ? '\t' : +FMT.indent;
  let out = '', err = null, p = null, outName = '';
  if (mode === 'unescape') {
    const t = text.trim();
    let s;
    try { s = JSON.parse(t); } catch (e) { s = undefined; }
    if (typeof s !== 'string') {
      if (/\\["\\nrtu\/]/.test(t)) { try { s = JSON.parse('"' + t.replace(/^'|'$/g, '').replace(/(^|[^\\])"/g, '$1\\"') + '"'); } catch (e) { s = undefined; } }
    }
    if (typeof s !== 'string') err = 'This is not an escaped JSON string. Paste a quoted string such as "{\\"id\\":1}".';
    else {
      const inner = parseJSONPos(s);
      out = inner.state === 'ok' ? JSON.stringify(inner.value, null, 2) : s;
      outName = inner.state === 'ok' ? 'unescaped, valid JSON, pretty-printed' : 'unescaped text (not JSON)';
    }
    $('#footF').innerHTML = text.trim() ? '<span class="num">' + fmtBytes(byteLen(text)) + '</span><span>escaped string</span>' : '<span>Empty. Paste an escaped JSON string.</span>';
  } else {
    p = parseJSONPos(text);
    footParse($('#footF'), p, text);
    edF.mark(p.state === 'error' ? new Map([[p.line, 'err']]) : new Map());
    if (p.state === 'ok') {
      const v = $('#fmtSort').checked ? sortKeys(p.value) : p.value;
      if (mode === 'pretty') { out = JSON.stringify(v, null, ind); outName = 'pretty, ' + (FMT.indent === 'tab' ? 'tabs' : FMT.indent + ' spaces'); }
      else if (mode === 'minify') { out = JSON.stringify(v); outName = 'minified'; }
      else { out = JSON.stringify(JSON.stringify(v)); outName = 'one JSON string literal'; }
      if ($('#fmtSort').checked) outName += ', keys sorted';
    } else if (p.state === 'error') err = 'The input does not parse: line ' + p.line + ', column ' + p.col + ', ' + p.message + '.';
  }
  FMT.out = out;
  edFO.set(err ? '' : out);
  $('#fmtOutName').textContent = outName;
  const a = byteLen(text), b = byteLen(out);
  if (err || !text.trim()) {
    sub.innerHTML = !text.trim() ? 'Paste a JSON document to format it.' : '<b>Nothing to format yet.</b> ' + esc(err);
    $('#footFO').innerHTML = err ? '<span class="bad">' + esc(err) + '</span>' : '<span>The output appears here.</span>';
    setStats($('#fmtStats'), [['Output size', '—'], ['Input size', text.trim() ? fmtBytes(a) : '—'], ['Change', '—'], ['Keys', '—']]);
    return;
  }
  const d = b - a, rel = a ? Math.round(d / a * 100) : 0;
  const keys = p && p.state === 'ok' ? countKeys(p.value) : countKeys((() => { try { return JSON.parse(out); } catch (e) { return null; } })());
  const verb = { pretty: 'Pretty-printed at ' + (FMT.indent === 'tab' ? 'tabs' : FMT.indent + ' spaces'), minify: 'Minified', escape: 'Escaped as a string', unescape: 'Unescaped' }[mode];
  sub.innerHTML = '<b>' + verb + ': ' + fmtBytes(a) + ' becomes ' + fmtBytes(b) + '</b> (' + (d >= 0 ? '+' : '') + rel + '%), ' + plural(keys, 'key') + (($('#fmtSort').checked && mode !== 'unescape') ? ' sorted A to Z.' : '.');
  setStats($('#fmtStats'), [['Output size', fmtBytes(b)], ['Input size', fmtBytes(a)], ['Change', (d >= 0 ? '+' : '−') + fmtBytes(Math.abs(d)) + '<small>' + (d >= 0 ? '+' : '') + rel + '%</small>'], ['Keys', nf(keys)]]);
  $('#footFO').innerHTML = '<span class="num">' + plural(out.split('\n').length, 'line') + ' · ' + fmtBytes(b) + '</span>';
}
$('#fmtCopy').onclick = e => copyText(FMT.out, e.currentTarget, 'Output copied');
$('#fmtCopy2').onclick = e => copyText(FMT.out, e.currentTarget, 'Copied');
$('#fmtUse').onclick = () => { if (!FMT.out) return; edF.set(FMT.out); if (FMT.mode === 'escape') { fmtMode.set('unescape'); FMT.mode = 'unescape'; } else if (FMT.mode === 'unescape') { fmtMode.set('pretty'); FMT.mode = 'pretty'; } runFormat(); say('Output moved to the input'); };
fileHooks.F = (t, n) => { edF.set(t); $('#fmtName').textContent = n; runFormat(); };

/* ---------------- Table (JSON to table) ---------------- */
const CUSTS = [
  ['cus_R2d9', 'Northwind Labs GmbH', 'DE'], ['cus_K7x1', 'Halden Freight AS', 'NO'], ['cus_P3m8', 'Okapi Studio SARL', 'FR'],
  ['cus_W5c2', 'Brightwater Analytics Ltd', 'GB'], ['cus_J8s4', 'Kestrel Robotics GmbH', 'DE'], ['cus_L2v6', 'Lumen and Vale Ltd', 'IE']
];
const SAMPLE_INVOICES = (() => {
  const plans = { starter: 900, team: 2900, scale: 7900 };
  const spec = [
    [0, 'team', 'paid', '2026-10-01T00:04:12Z', 'LAUNCH20'], [1, 'starter', 'paid', '2026-10-01T00:04:40Z'], [2, 'scale', 'paid', '2026-10-02T08:11:05Z', 'PARTNER10'],
    [3, 'team', 'open', '2026-10-03T09:30:00Z'], [4, 'scale', 'paid', '2026-10-04T14:02:51Z'], [5, 'starter', 'void', '2026-10-05T10:15:22Z'],
    [0, 'team', 'paid', '2026-10-08T00:04:12Z'], [1, 'starter', 'uncollectible', '2026-10-09T00:04:40Z'], [2, 'scale', 'open', '2026-10-12T08:11:05Z', 'PARTNER10'],
    [3, 'team', 'paid', '2026-10-15T09:30:00Z'], [4, 'scale', 'paid', '2026-10-18T14:02:51Z'], [5, 'team', 'open', '2026-10-22T10:15:22Z']
  ];
  return spec.map(([c, plan, status, created, coupon], i) => {
    const amt = plans[plan], off = coupon === 'LAUNCH20' ? 20 : coupon ? 10 : 0, due = amt - Math.round(amt * off / 100);
    const seats = plan === 'starter' ? 1 : plan === 'team' ? 5 : 12;
    const o = {
      id: 'in_' + ['7Hc2', '7Hd9', '7Hf1', '7Hg4', '7Hj8', '7Hk3', '8Aa2', '8Ab7', '8Ac1', '8Ad6', '8Ae9', '8Af5'][i], number: 'NWL-' + String(412 + i).padStart(4, '0'), status,
      customer: { id: CUSTS[c][0], name: CUSTS[c][1], country: CUSTS[c][2] },
      plan: { id: plan, interval: 'month', seats }, amount_due: due, amount_paid: status === 'paid' ? due : 0, currency: 'eur', created,
      lines: plan === 'starter' ? [{ sku: 'starter-seat', quantity: 1 }] : [{ sku: plan + '-seat', quantity: seats }, { sku: 'support', quantity: 1 }]
    };
    if (coupon) o.discount = { coupon, percent_off: off };
    return o;
  });
})();
const TBL = { rows: [], cols: [], sort: null, dir: 1, filter: '', source: '' };
const edT = makeEditor($('#edT'), { label: 'JSON array to tabulate', placeholder: 'Paste a JSON array of objects, an object with one array, or NDJSON', onInput: debounce(runTable, 150) });
/* rows from: an array, an object with one array field, or JSON Lines */
function rowsFrom(text) {
  const p = parseJSONPos(text);
  if (p.state === 'ok') {
    const v = p.value;
    if (Array.isArray(v)) return { rows: v, source: 'a top-level array', p };
    if (isObj(v)) {
      const arrs = Object.keys(v).filter(k => Array.isArray(v[k]));
      if (arrs.length === 1) return { rows: v[arrs[0]], source: 'the ' + arrs[0] + ' array', p };
      if (arrs.length > 1) { const k = arrs.sort((a, b) => v[b].length - v[a].length)[0]; return { rows: v[k], source: 'the ' + k + ' array (the longest of ' + arrs.length + ')', p }; }
      return { rows: [v], source: 'a single object', p };
    }
    return { error: 'A ' + valType(v) + ' is not a table. Paste an array of objects.', p };
  }
  if (p.state === 'empty') return { empty: true, p };
  const lines = text.split('\n'), rows = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim(); if (!l) continue;
    try { rows.push(JSON.parse(l)); } catch (e) { return { error: 'Not JSON, and line ' + (i + 1) + ' is not a JSON Lines record either: ' + p.message + ' (line ' + p.line + ').', p, line: p.line }; }
  }
  return rows.length > 1 ? { rows, source: 'JSON Lines (' + plural(rows.length, 'line') + ')', p: { state: 'ok', lines: lines.length }, ndjson: true } : { error: p.message, p };
}
function flattenRow(o, objPaths) {
  const out = {};
  (function w(v, path) {
    if (isObj(v)) { const ks = Object.keys(v); if (!ks.length) { out[path] = {}; return; } objPaths.add(path); ks.forEach(k => w(v[k], path ? path + '.' + k : k)); }
    else out[path || 'value'] = v;
  })(o, '');
  return out;
}
function colType(vals) {
  const t = new Set(vals.filter(v => v !== null && v !== undefined && v !== '').map(v => Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(v) ? 'date' : typeof v));
  if (t.has('integer') && t.has('number')) t.delete('integer');
  return t.size === 0 ? 'empty' : t.size === 1 ? [...t][0] : 'mixed';
}
const cellText = v => v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
function runTable() {
  const text = edT.get(), r = rowsFrom(text), sub = $('#tblSub');
  edT.mark(r.p && r.p.state === 'error' && !r.ndjson ? new Map([[r.p.line, 'err']]) : new Map());
  if (r.ndjson) $('#footT').innerHTML = '<span class="ok">Valid JSON Lines</span><span class="num">' + plural(r.rows.length, 'record') + ' · ' + fmtBytes(byteLen(text)) + '</span>';
  else footParse($('#footT'), r.p, text);
  if (r.empty || r.error) {
    TBL.rows = []; TBL.cols = [];
    sub.innerHTML = r.empty ? 'Paste a JSON array of objects, an object with one array field, or NDJSON.' : '<b>Not a table yet.</b> ' + esc(r.error);
    $('#tblWrap').innerHTML = emptyBox(r.empty ? 'Nothing to show. Paste rows on the left or open a file.' : esc(r.error));
    $('#tblFoot').textContent = ''; setStats($('#tblStats'), [['Rows', '—'], ['Columns', '—'], ['Shown', '—'], ['Sparsest column', '—']]);
    return;
  }
  const objPaths = new Set();
  const flat = r.rows.map(x => isObj(x) ? flattenRow(x, objPaths) : { value: x });
  const cols = [];
  flat.forEach(f => Object.keys(f).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
  const keep = cols.filter(c => !(objPaths.has(c) && flat.every(f => f[c] === null || f[c] === undefined)));
  TBL.rows = flat; TBL.source = r.source;
  TBL.cols = keep.map(c => {
    const vals = flat.map(f => f[c]);
    const filled = vals.filter(v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)).length;
    return { key: c, type: colType(vals), fill: pct(filled, flat.length), filled };
  });
  if (TBL.sort && !TBL.cols.some(c => c.key === TBL.sort)) TBL.sort = null;
  drawTable();
}
function tableView() {
  const q = TBL.filter.trim().toLowerCase();
  let rows = TBL.rows.map((r, i) => ({ r, i }));
  if (q) rows = rows.filter(({ r }) => TBL.cols.some(c => cellText(r[c.key]).toLowerCase().includes(q)));
  if (TBL.sort) {
    const k = TBL.sort, d = TBL.dir;
    rows.sort((a, b) => {
      const x = a.r[k], y = b.r[k], ex = x === null || x === undefined || x === '', ey = y === null || y === undefined || y === '';
      if (ex || ey) return ex === ey ? 0 : ex ? 1 : -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * d;
      if (Array.isArray(x) && Array.isArray(y)) return (x.length - y.length) * d;
      return cellText(x).localeCompare(cellText(y), 'en', { numeric: true }) * d;
    });
  }
  return rows;
}
function arrPreview(v) {
  const prev = v.slice(0, 2).map(x => isObj(x) ? Object.values(x).slice(0, 2).map(cellText).join(' ') : cellText(x)).join(', ');
  return '<span class="arr-prev"><b>' + v.length + '</b> · ' + esc(short(prev, 40)) + (v.length > 2 ? ', …' : '') + '</span>';
}
function drawTable() {
  const cols = TBL.cols, view = tableView(), n = TBL.rows.length;
  const numeric = c => c.type === 'integer' || c.type === 'number';
  const head = '<tr><th class="idx">#</th>' + cols.map(c => '<th class="' + (numeric(c) ? 'n' : '') + '"><button class="th-b" data-k="' + esc(c.key) + '"' + (TBL.sort === c.key ? ' aria-sort="' + (TBL.dir > 0 ? 'ascending' : 'descending') + '"' : '') + '><code>' + esc(c.key) + '</code>' + (TBL.sort === c.key ? (TBL.dir > 0 ? ' ↑' : ' ↓') : '') + '</button><span class="th-m num">' + c.type + ' · ' + c.fill + '%</span></th>').join('') + '</tr>';
  const body = view.slice(0, 500).map(({ r, i }) => '<tr><td class="idx num">' + (i + 1) + '</td>' + cols.map(c => {
    const v = r[c.key];
    if (v === undefined || v === null || v === '') return '<td class="dash' + (numeric(c) ? ' n' : '') + '">' + (v === null ? 'null' : '—') + '</td>';
    if (Array.isArray(v)) return '<td>' + arrPreview(v) + '</td>';
    if (typeof v === 'number') return '<td class="n">' + nf(v) + '</td>';
    if (typeof v === 'boolean') return '<td>' + v + '</td>';
    return '<td title="' + esc(cellText(v)) + '">' + esc(short(cellText(v), 80)) + '</td>';
  }).join('') + '</tr>').join('');
  $('#tblWrap').innerHTML = view.length ? '<table class="dt"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>' : emptyBox('No rows match “' + esc(TBL.filter) + '”.');
  $('#tblTitle').textContent = plural(n, 'row');
  $('#tblFoot').innerHTML = '<span class="num">' + (TBL.filter ? nf(view.length) + ' of ' + nf(n) + ' rows match' : nf(n) + ' rows') + ' · ' + plural(cols.length, 'column') + '</span><span>' + (TBL.sort ? 'sorted by ' + esc(TBL.sort) + (TBL.dir > 0 ? ', ascending' : ', descending') : 'click a header to sort') + '</span>';
  const nested = new Set(cols.filter(c => c.key.includes('.')).map(c => c.key.split('.')[0])).size;
  const sparse = cols.slice().sort((a, b) => a.fill - b.fill)[0];
  $('#tblSub').innerHTML = '<b>' + plural(n, 'row') + ' × ' + plural(cols.length, 'column') + '</b> from ' + esc(TBL.source) + (nested ? ', with ' + plural(nested, 'nested object') + ' flattened into dot paths' : '') + (sparse && sparse.fill < 100 ? '; the sparsest column, <code>' + esc(sparse.key) + '</code>, is filled in ' + sparse.filled + ' of ' + n + '.' : '; every column is filled in every row.');
  setStats($('#tblStats'), [['Rows', nf(n)], ['Columns', nf(cols.length)], ['Shown', nf(view.length) + (TBL.filter ? '<small>filtered</small>' : '')], ['Sparsest column', sparse ? '<code>' + esc(sparse.key) + '</code><small>' + sparse.fill + '%</small>' : '—']]);
}
$('#tblWrap').addEventListener('click', e => { const b = e.target.closest('.th-b'); if (!b) return; const k = b.dataset.k; if (TBL.sort === k) TBL.dir = -TBL.dir; else { TBL.sort = k; TBL.dir = 1; } drawTable(); });
$('#tblFilter').addEventListener('input', e => { TBL.filter = e.target.value; drawTable(); });
function delimited(cols, rows, d) {
  const q = s => { s = cellText(s); return d === ',' && /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : d === '\t' ? s.replace(/[\t\n\r]/g, ' ') : s; };
  return [cols.map(q).join(d), ...rows.map(r => cols.map(c => q(r[c])).join(d))].join('\n');
}
function markdownTable(cols, rows) {
  const m = s => cellText(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const num = cols.map(c => { const t = (TBL.cols.find(x => x.key === c) || {}).type; return t === 'integer' || t === 'number'; });
  return ['| ' + cols.map(m).join(' | ') + ' |', '| ' + num.map(n => n ? '---:' : '---').join(' | ') + ' |', ...rows.map(r => '| ' + cols.map(c => m(r[c])).join(' | ') + ' |')].join('\n');
}
const tblExport = kind => { const cols = TBL.cols.map(c => c.key), rows = tableView().map(x => x.r); return kind === 'md' ? markdownTable(cols, rows) : delimited(cols, rows, kind === 'tsv' ? '\t' : ','); };
$('#tblCSV').onclick = e => TBL.cols.length && copyText(tblExport('csv'), e.currentTarget, 'CSV copied');
$('#tblTSV').onclick = e => TBL.cols.length && copyText(tblExport('tsv'), e.currentTarget, 'TSV copied');
$('#tblMD').onclick = e => TBL.cols.length && copyText(tblExport('md'), e.currentTarget, 'Markdown copied');
fileHooks.T = (t, n) => { edT.set(t); $('#tblName').textContent = n; runTable(); };

/* ---------------- Schema and types ---------------- */
const SAMPLE_SUBS3 = [
  { id: 'sub_8Kq2LmV41', object: 'subscription', status: 'active', customer: { id: 'cus_R2d9', email: 'ops@northwind-labs.io', country: 'DE' }, plan: { id: 'team', interval: 'month', amount: 2900, currency: 'eur', seats: 5 }, features: ['api', 'webhooks', 'sso', 'audit_log'], current_period_end: '2026-11-01T00:00:00Z', portal_url: 'https://billing.northwind-labs.io/p/sub_8Kq2LmV41', metadata: { source: 'checkout', upgraded_from: 'starter' } },
  { id: 'sub_3Fh7QpZ02', object: 'subscription', status: 'active', customer: { id: 'cus_K7x1', email: 'billing@halden-freight.no', country: 'NO' }, plan: { id: 'starter', interval: 'month', amount: 900, currency: 'eur', seats: 1 }, coupon: 'LAUNCH20', features: ['api'], current_period_end: '2026-11-04T00:00:00Z', portal_url: 'https://billing.northwind-labs.io/p/sub_3Fh7QpZ02', metadata: { source: 'sales' } },
  { id: 'sub_2Wc8NvR15', object: 'subscription', status: 'past_due', customer: { id: 'cus_W5c2', email: 'finance@brightwater.io', country: 'GB' }, plan: { id: 'scale', interval: 'year', amount: 79000, currency: 'eur', seats: 12 }, features: ['api', 'webhooks', 'sso'], current_period_end: '2026-10-20T00:00:00Z', portal_url: 'https://billing.northwind-labs.io/p/sub_2Wc8NvR15', metadata: { source: 'checkout' } }
];
const SAMPLE_SUB_BAD = { id: 'sub_9Lm4TxB77', object: 'subscription', status: 'paused', customer: { id: 'cus_P3m8', country: 'FR' }, plan: { id: 'scale', interval: 'month', amount: '7900', currency: 'eur', seats: 12 }, features: ['api', 'sso'], current_period_end: 'next month', portal_url: 'https://billing.northwind-labs.io/p/sub_9Lm4TxB77', metadata: { source: 'partner' } };
const FORMATS = {
  'date-time': s => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s) && !isNaN(Date.parse(s)),
  date: s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)),
  email: s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s),
  uri: s => /^[a-z][a-z0-9+.-]*:\/\/[^\s]+$/i.test(s)
};
function shapeNode() { return { n: 0, types: {}, strs: [], props: new Map(), objN: 0, items: null }; }
function shapeAdd(node, v) {
  node.n++;
  const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
  node.types[t] = (node.types[t] || 0) + 1;
  if (t === 'string') node.strs.push(v);
  else if (t === 'object') { node.objN++; Object.keys(v).forEach(k => { if (!node.props.has(k)) node.props.set(k, { node: shapeNode(), seen: 0 }); const p = node.props.get(k); p.seen++; shapeAdd(p.node, v[k]); }); }
  else if (t === 'array') { if (!node.items) node.items = shapeNode(); v.forEach(x => shapeAdd(node.items, x)); }
}
function shapeTypes(node) { const t = Object.keys(node.types); return t.includes('integer') && t.includes('number') ? t.filter(x => x !== 'integer') : t; }
function strFormat(node) { if (!node.strs.length) return null; return Object.keys(FORMATS).find(f => node.strs.every(FORMATS[f])) || null; }
function strEnum(node, key) {
  const d = [...new Set(node.strs)];
  if (/(^|_)id$|^id$/i.test(key || '') || node.strs.length < 3 || d.length > 5 || d.length >= node.strs.length || strFormat(node)) return null;
  return d;
}
const pascal = s => (String(s).replace(/[^A-Za-z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^./, c => c.toUpperCase()) || 'Item').replace(/^(\d)/, '_$1');
const singular = s => /ies$/.test(s) ? s.slice(0, -3) + 'y' : /ses$/.test(s) ? s.slice(0, -2) : /s$/.test(s) && !/ss$/.test(s) ? s.slice(0, -1) : s + 'Item';
function toSchema(node, key, stats) {
  const types = shapeTypes(node), s = {};
  if (!types.length) return {};
  s.type = types.length === 1 ? types[0] : types;
  if (types.includes('string')) {
    const f = strFormat(node); if (f) { s.format = f; stats.formats.add(f); }
    const en = strEnum(node, key); if (en) { s.enum = types.length > 1 && types.includes('null') ? [...en, null] : en; stats.enums++; }
  }
  if (types.includes('object')) {
    s.properties = {}; const req = [];
    node.props.forEach((p, k) => { stats.props++; s.properties[k] = toSchema(p.node, k, stats); if (p.seen === node.objN) { req.push(k); stats.required++; } });
    if (req.length) s.required = req;
  }
  if (types.includes('array') && node.items && node.items.n) s.items = toSchema(node.items, singular(key || 'item'), stats);
  return s;
}
function inferAll(value) {
  const root = shapeNode(), isList = Array.isArray(value) && value.length && value.every(isObj);
  (isList ? value : [value]).forEach(v => shapeAdd(root, v));
  const objConst = root.props.get('object');
  const name = objConst && new Set(objConst.node.strs).size === 1 && objConst.node.strs.length === root.n ? pascal(objConst.node.strs[0]) : 'Root';
  const stats = { props: 0, required: 0, enums: 0, formats: new Set() };
  const body = toSchema(root, '', stats);
  const schema = Object.assign({ $schema: 'https://json-schema.org/draft/2020-12/schema', title: name }, body);
  return { root, schema, name, stats, isList, samples: root.n };
}
/* TypeScript and Zod from the same shape */
function genTS(root, name) {
  const decls = [], used = new Set();
  const uniq = n => { let x = n, i = 2; while (used.has(x)) x = n + i++; used.add(x); return x; };
  const tsType = (node, key) => {
    const parts = shapeTypes(node).map(t => {
      if (t === 'string') { const en = strEnum(node, key); return en ? en.map(x => JSON.stringify(x)).join(' | ') : 'string'; }
      if (t === 'integer' || t === 'number') return 'number';
      if (t === 'boolean') return 'boolean';
      if (t === 'null') return 'null';
      if (t === 'array') { const it = node.items && node.items.n ? tsType(node.items, singular(key)) : 'unknown'; return /[| ]/.test(it) ? '(' + it + ')[]' : it + '[]'; }
      return iface(node, pascal(key));
    });
    return parts.length ? parts.join(' | ') : 'unknown';
  };
  const iface = (node, nm) => {
    nm = uniq(nm);
    const slot = decls.length; decls.push('');
    const lines = []; node.props.forEach((p, k) => { const t = tsType(p.node, k), fmt = shapeTypes(p.node).includes('string') && strFormat(p.node); lines.push('  ' + (IDENT.test(k) ? k : JSON.stringify(k)) + (p.seen < node.objN ? '?' : '') + ': ' + t + ';' + (fmt ? ' // ' + fmt : '')); });
    decls[slot] = 'export interface ' + nm + ' {\n' + lines.join('\n') + '\n}';
    return nm;
  };
  if (shapeTypes(root).length === 1 && shapeTypes(root)[0] === 'object') iface(root, name);
  else decls.push('export type ' + name + ' = ' + tsType(root, name) + ';');
  return decls.filter(Boolean).join('\n\n') + '\n';
}
function genZod(root, name) {
  const ind = d => '  '.repeat(d);
  const z = (node, key, d) => {
    const types = shapeTypes(node), nul = types.includes('null'), rest = types.filter(t => t !== 'null');
    const one = t => {
      if (t === 'string') { const en = strEnum(node, key); if (en) return 'z.enum([' + en.map(x => JSON.stringify(x)).join(', ') + '])'; const f = strFormat(node); return 'z.string()' + (f === 'date-time' ? '.datetime({ offset: true })' : f === 'date' ? '.date()' : f === 'email' ? '.email()' : f === 'uri' ? '.url()' : ''); }
      if (t === 'integer') return 'z.number().int()';
      if (t === 'number') return 'z.number()';
      if (t === 'boolean') return 'z.boolean()';
      if (t === 'array') return 'z.array(' + (node.items && node.items.n ? z(node.items, singular(key), d) : 'z.unknown()') + ')';
      const lines = []; node.props.forEach((p, k) => lines.push(ind(d + 1) + (IDENT.test(k) ? k : JSON.stringify(k)) + ': ' + z(p.node, k, d + 1) + (p.seen < node.objN ? '.optional()' : '') + ','));
      return 'z.object({\n' + lines.join('\n') + '\n' + ind(d) + '})';
    };
    let out = !rest.length ? (nul ? 'z.null()' : 'z.unknown()') : rest.length === 1 ? one(rest[0]) : 'z.union([' + rest.map(one).join(', ') + '])';
    return nul && rest.length ? out + '.nullable()' : out;
  };
  const v = name.charAt(0).toLowerCase() + name.slice(1) + 'Schema';
  return "import { z } from 'zod';\n\nexport const " + v + ' = ' + z(root, name, 0) + ';\n\nexport type ' + name + ' = z.infer<typeof ' + v + '>;\n';
}
/* a validator for exactly the subset generated above */
function schemaValidate(s, v, path, errs) {
  const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type) {
    const ok = (Array.isArray(s.type) ? s.type : [s.type]).some(x => x === t || (x === 'integer' && t === 'number' && Number.isInteger(v)) || (x === 'number' && t === 'number'));
    if (!ok) { errs.push({ path, msg: 'expected ' + (Array.isArray(s.type) ? s.type.join(' or ') : s.type) + ', found ' + (t === 'number' && Number.isInteger(v) ? 'integer' : t) + ' ' + short(JSON.stringify(v), 30) }); return; }
  }
  if (s.enum && !s.enum.some(e => e === v)) errs.push({ path, msg: JSON.stringify(v) + ' is not one of ' + s.enum.map(e => JSON.stringify(e)).join(', ') });
  if (s.format && t === 'string' && FORMATS[s.format] && !FORMATS[s.format](v)) errs.push({ path, msg: JSON.stringify(short(v, 30)) + ' is not a valid ' + s.format });
  if (t === 'object') {
    (s.required || []).forEach(k => { if (!has(v, k)) errs.push({ path, msg: 'missing required property "' + k + '"' }); });
    if (s.properties) Object.keys(v).forEach(k => { if (s.properties[k]) schemaValidate(s.properties[k], v[k], path + (IDENT.test(k) ? '.' + k : '[' + JSON.stringify(k) + ']'), errs); });
  }
  if (t === 'array' && s.items) v.forEach((x, i) => schemaValidate(s.items, x, path + '[' + i + ']', errs));
  return errs;
}
const SCH = { tab: 'schema', res: null, out: { schema: '', ts: '', zod: '' } };
const edS = makeEditor($('#edS'), { label: 'Sample JSON', placeholder: 'Paste one or more sample documents (an array merges across items)', onInput: debounce(runSchema, 150) });
const edSO = makeEditor($('#edSO'), { label: 'Generated output', readOnly: true });
const edSV = makeEditor($('#edSV'), { label: 'Document to validate', placeholder: 'Paste a document to check against the inferred schema', onInput: debounce(runSchemaValidate, 150) });
const TAB_LABEL = { schema: 'JSON Schema', ts: 'TypeScript', zod: 'Zod', validate: 'errors' };
seg($('#schTab'), v => { SCH.tab = v; showSchemaTab(); });
function showSchemaTab() {
  const val = SCH.tab === 'validate';
  $('#edSO').hidden = val; $('#footSO').hidden = val; $('#schVal').hidden = !val;
  if (!val) { edSO.set(SCH.out[SCH.tab] || ''); edSO.scroller.scrollTop = 0; $('#footSO').innerHTML = SCH.out[SCH.tab] ? '<span class="num">' + plural(SCH.out[SCH.tab].split('\n').length, 'line') + ' · ' + fmtBytes(byteLen(SCH.out[SCH.tab])) + '</span><span>' + { schema: 'draft 2020-12', ts: 'interfaces, optional keys marked with ?', zod: 'zod 3' }[SCH.tab] + '</span>' : '<span>Nothing generated yet.</span>'; }
  $('#schCopy span').textContent = 'Copy ' + (val ? 'errors' : TAB_LABEL[SCH.tab]);
  if (val) runSchemaValidate();
}
function runSchema() {
  const text = edS.get(), p = parseJSONPos(text), sub = $('#schSub');
  footParse($('#footS'), p, text); edS.mark(p.state === 'error' ? new Map([[p.line, 'err']]) : new Map());
  if (p.state !== 'ok') {
    SCH.res = null; SCH.out = { schema: '', ts: '', zod: '' };
    sub.innerHTML = p.state === 'empty' ? 'Paste a sample document to infer its schema.' : '<b>The sample does not parse</b> (line ' + p.line + '), so there is nothing to infer.';
    setStats($('#schStats'), [['Properties', '—'], ['Required', '—'], ['Enums', '—'], ['Formats', '—']]);
    showSchemaTab(); return;
  }
  const r = inferAll(p.value); SCH.res = r;
  SCH.out = { schema: JSON.stringify(r.schema, null, 2) + '\n', ts: genTS(r.root, r.name), zod: genZod(r.root, r.name) };
  const f = [...r.stats.formats];
  sub.innerHTML = '<b>' + plural(r.stats.props, 'property', 'properties') + ', ' + r.stats.required + ' required</b>, inferred from ' + (r.isList ? plural(r.samples, 'sample') + ' merged' : 'one document') + '; ' + plural(r.stats.enums, 'enum') + ' and ' + (f.length ? plural(f.length, 'format') + ' (' + f.join(', ') + ')' : 'no formats') + ' detected.';
  setStats($('#schStats'), [['Properties', nf(r.stats.props)], ['Required', nf(r.stats.required) + '<small>' + (r.stats.props - r.stats.required) + ' optional</small>'], ['Enums', nf(r.stats.enums)], ['Formats', f.length ? f.join(', ') : 'none']]);
  showSchemaTab();
}
function runSchemaValidate() {
  const text = edSV.get(), p = parseJSONPos(text), out = $('#schErrs');
  footParse($('#footSV'), p, text); edSV.mark(p.state === 'error' ? new Map([[p.line, 'err']]) : new Map());
  if (!SCH.res) { out.innerHTML = emptyBox('Infer a schema from a valid sample first.'); return; }
  if (p.state !== 'ok') { out.innerHTML = emptyBox(p.state === 'empty' ? 'Paste a document to validate.' : 'This document does not parse (line ' + p.line + ').'); return; }
  const errs = [];
  if (Array.isArray(p.value) && SCH.res.isList) p.value.forEach((x, i) => schemaValidate(SCH.res.schema, x, '$[' + i + ']', errs)); else schemaValidate(SCH.res.schema, p.value, '$', errs);
  SCH.errs = errs;
  const marks = new Map();
  errs.forEach(e => { const key = e.path === '$' ? '' : e.path.replace(/^\$\.?/, ''); const m = p.map.get(key); if (m) marks.set(m.line, 'err'); });
  edSV.mark(marks);
  out.innerHTML = '<div class="panel-head" style="padding:12px 0 4px"><h2 class="tally-fig"><span class="big"' + (errs.length ? ' style="color:var(--negative)"' : '') + '>' + errs.length + '</span><span class="unit">' + (errs.length === 1 ? 'error' : 'errors') + ' against ' + esc(SCH.res.name) + '</span></h2>' + (errs.length ? '' : '<span class="pill add">Valid</span>') + '</div>' +
    (errs.length ? '<ul class="rows">' + errs.map(e => '<li><code class="p">' + esc(e.path) + '</code><span class="pill del">' + (/^missing/.test(e.msg) ? 'Required' : /not one of/.test(e.msg) ? 'Enum' : /valid/.test(e.msg) ? 'Format' : 'Type') + '</span><span class="why">' + esc(e.msg) + '</span></li>').join('') + '</ul>' : '<p class="note">The document matches every type, required property, enum and format in the inferred schema.</p>');
}
$('#schCopy').onclick = e => { if (SCH.tab === 'validate') copyText((SCH.errs || []).map(x => x.path + ': ' + x.msg).join('\n'), e.currentTarget, 'Errors copied'); else copyText(SCH.out[SCH.tab], e.currentTarget, 'Copied'); };
fileHooks.S = (t, n) => { edS.set(t); $('#schName').textContent = n; runSchema(); };

/* ---------------- CSV: an RFC 4180 parser, delimiter detection, writer ---------------- */
const DELIMS = [',', ';', '\t', '|'];
const DELIM_NAME = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' };
function parseCSV(text, d) {
  const rows = []; let row = [], f = '', i = 0, q = false, line = 1, qLine = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; }
      if (c === '\n') line++;
      f += c; i++; continue;
    }
    if (c === '"' && f === '') { q = true; qLine = line; i++; continue; }
    if (c === d) { row.push(f); f = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; i++; line++; continue; }
    f += c; i++;
  }
  if (q) return { error: 'A quoted field that opens on line ' + qLine + ' never closes.', line: qLine, rows };
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
  return { rows };
}
function detectDelim(text) {
  const sample = text.slice(0, 20000);
  let best = ',', bestScore = -1;
  for (const d of DELIMS) {
    const r = parseCSV(sample, d).rows.slice(0, 30).filter(x => x.length > 1 || x[0] !== '');
    if (!r.length) continue;
    const counts = r.map(x => x.length), mode = counts.sort((a, b) => counts.filter(v => v === b).length - counts.filter(v => v === a).length)[0];
    if (mode < 2) continue;
    const score = r.filter(x => x.length === mode).length * 100 + mode;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}
const csvField = (s, d) => { s = s == null ? '' : String(s); return s.includes(d) || /["\n\r]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const toCSV = (rows, d) => rows.map(r => r.map(x => csvField(x, d)).join(d)).join('\n');
function cellKind(s) {
  if (s === '') return 'empty';
  if (/^-?(0|[1-9]\d*)$/.test(s)) return 'integer';
  if (/^-?(0|[1-9]\d*)?\.\d+$|^-?\d+(\.\d+)?e[+-]?\d+$/i.test(s)) return 'number';
  if (/^(true|false)$/i.test(s)) return 'boolean';
  if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(s) && !isNaN(Date.parse(s.replace(' ', 'T')))) return 'date';
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return 'email';
  return 'text';
}
function csvTable(text, delimOpt, header) {
  const d = delimOpt === 'auto' ? detectDelim(text) : delimOpt;
  const r = parseCSV(text, d);
  if (r.error) return { error: r.error, line: r.line, d };
  const rows = r.rows;
  if (!rows.length) return { empty: true, d };
  const width = Math.max(...rows.map(x => x.length));
  const head = header ? rows[0].map((h, i) => h.trim() || 'column_' + (i + 1)) : Array.from({ length: width }, (_, i) => 'column_' + (i + 1));
  while (head.length < width) head.push('column_' + (head.length + 1));
  const recs = (header ? rows.slice(1) : rows).map(x => { const y = x.slice(); while (y.length < width) y.push(''); return y; });
  const ragged = (header ? rows.slice(1) : rows).filter(x => x.length !== width).length;
  return { d, head, recs, width, ragged };
}
function profileCol(vals) {
  const kinds = {}; vals.forEach(v => { const k = cellKind(v.trim()); kinds[k] = (kinds[k] || 0) + 1; });
  const empty = kinds.empty || 0; delete kinds.empty;
  if (kinds.integer && kinds.number) { kinds.number += kinds.integer; delete kinds.integer; }
  const ks = Object.keys(kinds);
  const type = ks.length === 0 ? 'empty' : ks.length === 1 ? ks[0] : 'mixed';
  const filled = vals.filter(v => v.trim() !== '');
  const uniq = new Set(filled);
  let range = '';
  if (type === 'integer' || type === 'number') { const ns = filled.map(Number); range = nf(Math.min(...ns)) + ' to ' + nf(Math.max(...ns)); }
  else if (type === 'date') { const s = filled.slice().sort(); range = s[0] + ' to ' + s[s.length - 1]; }
  else if (filled.length) {
    const c = new Map(); filled.forEach(v => c.set(v, (c.get(v) || 0) + 1));
    const top = [...c].sort((a, b) => b[1] - a[1])[0];
    range = top[1] > 1 ? '<code>' + esc(short(top[0], 28)) + '</code> × ' + top[1] : 'all distinct';
  }
  return { type, empty, unique: uniq.size, range, kinds };
}
function typedCell(s, kind) {
  if (kind === 'empty') return null;
  if (kind === 'integer' || kind === 'number') return Number(s);
  if (kind === 'boolean') return /^true$/i.test(s);
  return s;
}

/* ---------------- CSV viewer ---------------- */
const SAMPLE_CSV = [
  'customer_id,name,email,country,plan,mrr_eur,seats,created,active,notes',
  'cus_R2d9,"Northwind Labs, GmbH",ops@northwind-labs.io,DE,team,29.00,5,2026-03-14,true,Upgraded from Starter on 2026-10-22',
  'cus_K7x1,Halden Freight AS,billing@halden-freight.no,NO,starter,9.00,1,2026-04-02,true,',
  'cus_P3m8,Okapi Studio SARL,compta@okapi.studio,FR,scale,79.00,12,2026-04-19,true,',
  'cus_W5c2,Brightwater Analytics Ltd,finance@brightwater.io,GB,team,29.00,5,2026-05-07,false,Card declined twice',
  'cus_J8s4,"Kestrel Robotics ""KR"" GmbH",ap@kestrel-robotics.de,DE,enterprise,249.00,40,2026-05-30,true,"Invoice by post.',
  'Address on file"',
  'cus_L2v6,Lumen and Vale Ltd,,IE,starter,9.00,1,2026-06-11,true,Trial extended',
  'cus_T4h7,Tamsin Health BV,accounts@tamsin.health,NL,team,29.00,5,2026-07-01,false,',
  'cus_C9r3,Corvid Systems AB,billing@corvid.systems,SE,scale,79.00,12,2026-07-23,true,',
  'cus_W5c2,Brightwater Analytics Ltd,finance@brightwater.io,GB,team,29.00,5,2026-05-07,false,Card declined twice',
  'cus_N6p2,Fjord Mobility AS,okonomi@fjord-mobility.no,NO,starter,9.00,1,2026-08-15,true,',
  'cus_F3q8,Pellucid AB,ekonomi@pellucid.se,SE,team,29.00,5,2026-09-02,true,'
].join('\n');
const CSVV = { t: null, filter: '', sort: null, dir: 1, dups: [], out: '' };
const edC = makeEditor($('#edC'), { label: 'CSV text', plain: true, placeholder: 'Paste CSV or TSV, or open a file', onInput: debounce(runCSV, 150) });
const edCO = makeEditor($('#edCO'), { label: 'CSV as JSON', readOnly: true });
const csvDelim = seg($('#csvDelim'), runCSV);
const csvOutMode = seg($('#csvOutMode'), drawCSVOut);
$('#csvHeader').onchange = runCSV;
$('#csvTyped').onchange = drawCSVOut;
function runCSV() {
  const text = edC.get(), t0 = performance.now();
  const t = csvTable(text, csvDelim.get(), $('#csvHeader').checked);
  CSVV.t = t;
  const sub = $('#csvSub'), foot = $('#footC');
  edC.mark(t.error ? new Map([[t.line, 'err']]) : new Map());
  if (t.empty || t.error) {
    sub.innerHTML = t.empty ? 'Paste or open a CSV or TSV file.' : '<b>The CSV does not parse.</b> ' + esc(t.error);
    foot.innerHTML = t.empty ? '<span>Empty. Paste CSV or open a file.</span>' : '<span class="bad">' + esc(t.error) + '</span>';
    $('#csvWrap').innerHTML = emptyBox(t.empty ? 'Nothing to show yet.' : esc(t.error)); $('#csvFoot').textContent = '';
    $('#csvProf').innerHTML = ''; $('#csvProfMeta').textContent = ''; edCO.set(''); $('#footCO').textContent = ''; CSVV.out = '';
    setStats($('#csvStats'), [['Rows', '—'], ['Columns', '—'], ['Duplicate rows', '—'], ['Empty cells', '—']]); $('#csvStamp').textContent = '';
    return;
  }
  const seen = new Map(); CSVV.dups = [];
  t.recs.forEach((r, i) => { const k = JSON.stringify(r); if (seen.has(k)) CSVV.dups.push({ i, of: seen.get(k) }); else seen.set(k, i); });
  t.prof = t.head.map((h, c) => profileCol(t.recs.map(r => r[c])));
  const emptyCells = t.prof.reduce((a, p) => a + p.empty, 0);
  const nRows = t.recs.length;
  foot.innerHTML = '<span class="ok">Parsed</span><span class="num">' + plural(text.split('\n').length, 'line') + ' · ' + fmtBytes(byteLen(text)) + (t.ragged ? ' · ' + plural(t.ragged, 'short row') + ' padded' : '') + '</span>';
  $('#csvStamp').textContent = (csvDelim.get() === 'auto' ? 'Detected ' : 'Using ') + DELIM_NAME[t.d] + ' delimiter · parsed in ' + (performance.now() - t0).toFixed(1) + ' ms';
  const dupTxt = CSVV.dups.length ? plural(CSVV.dups.length, 'duplicate row') + ' (row ' + (CSVV.dups[0].i + 1) + ' repeats row ' + (CSVV.dups[0].of + 1) + (CSVV.dups.length > 1 ? ', and more' : '') + ')' : 'no duplicate rows';
  const mostEmpty = t.prof.map((p, c) => ({ p, c })).filter(x => x.p.empty).sort((a, b) => b.p.empty - a.p.empty)[0];
  sub.innerHTML = '<b>' + plural(nRows, 'row') + ' × ' + plural(t.width, 'column') + '</b>, ' + DELIM_NAME[t.d] + '-delimited; ' + dupTxt + (mostEmpty ? '; <code>' + esc(t.head[mostEmpty.c]) + '</code> is empty in ' + plural(mostEmpty.p.empty, 'row') + '.' : '.');
  setStats($('#csvStats'), [['Rows', nf(nRows)], ['Columns', nf(t.width)], ['Duplicate rows', nf(CSVV.dups.length), CSVV.dups.length ? 'warn' : ''], ['Empty cells', nf(emptyCells) + '<small>of ' + nf(nRows * t.width) + '</small>']]);
  $('#csvDedupe').disabled = !CSVV.dups.length;
  drawCSVTable(); drawCSVProfile(); drawCSVOut();
}
function drawCSVTable() {
  const t = CSVV.t; if (!t || !t.recs) return;
  const q = CSVV.filter.trim().toLowerCase(), dupSet = new Set(CSVV.dups.map(d => d.i));
  let view = t.recs.map((r, i) => ({ r, i }));
  if (q) view = view.filter(({ r }) => r.some(c => c.toLowerCase().includes(q)));
  if (CSVV.sort != null) {
    const c = CSVV.sort, num = ['integer', 'number'].includes(t.prof[c].type);
    view.sort((a, b) => { const x = a.r[c], y = b.r[c]; if (!x || !y) return !x === !y ? 0 : !x ? 1 : -1; return (num ? +x - +y : x.localeCompare(y, 'en', { numeric: true })) * CSVV.dir; });
  }
  const numCol = t.prof.map(p => p.type === 'integer' || p.type === 'number');
  const head = '<tr><th class="idx">#</th>' + t.head.map((h, c) => '<th class="' + (numCol[c] ? 'n' : '') + '"><button class="th-b" data-c="' + c + '"' + (CSVV.sort === c ? ' aria-sort="' + (CSVV.dir > 0 ? 'ascending' : 'descending') + '"' : '') + '><code>' + esc(h) + '</code>' + (CSVV.sort === c ? (CSVV.dir > 0 ? ' ↑' : ' ↓') : '') + '</button><span class="th-m num">' + t.prof[c].type + ' · ' + pct(t.recs.length - t.prof[c].empty, t.recs.length) + '%</span></th>').join('') + '</tr>';
  const body = view.slice(0, 1000).map(({ r, i }) => '<tr' + (dupSet.has(i) ? ' class="dup" title="Duplicate of row ' + (CSVV.dups.find(d => d.i === i).of + 1) + '"' : '') + '><td class="idx num">' + (i + 1) + '</td>' + r.map((v, c) => v === '' ? '<td class="dash' + (numCol[c] ? ' n' : '') + '">—</td>' : '<td class="' + (numCol[c] ? 'n' : '') + '" title="' + esc(v) + '">' + esc(short(v.replace(/\n/g, ' ⏎ '), 60)) + '</td>').join('') + '</tr>').join('');
  $('#csvWrap').innerHTML = view.length ? '<table class="dt"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>' : emptyBox('No rows match “' + esc(CSVV.filter) + '”.');
  $('#csvTitle').textContent = plural(t.recs.length, 'row');
  $('#csvFoot').innerHTML = '<span class="num">' + (q ? nf(view.length) + ' of ' + nf(t.recs.length) + ' rows match' : nf(t.recs.length) + ' rows') + '</span><span>' + (CSVV.dups.length ? 'duplicates are tinted' : 'no duplicates') + '</span>';
}
function drawCSVProfile() {
  const t = CSVV.t;
  $('#csvProfMeta').textContent = plural(t.width, 'column');
  $('#csvProf').innerHTML = '<table class="dt"><thead><tr><th>Column</th><th>Type</th><th class="n">Empty</th><th class="n">Unique</th><th>Range or top value</th></tr></thead><tbody>' +
    t.head.map((h, c) => { const p = t.prof[c]; return '<tr><td><code>' + esc(h) + '</code></td><td>' + (p.type === 'mixed' ? '<span class="pill chg">mixed</span> <span class="dash">' + Object.keys(p.kinds).join(', ') + '</span>' : p.type) + '</td><td class="n' + (p.empty ? '' : ' dash') + '">' + nf(p.empty) + '</td><td class="n">' + nf(p.unique) + '</td><td>' + (p.range || '<span class="dash">—</span>') + '</td></tr>'; }).join('') + '</tbody></table>';
}
function csvObjects(typed) {
  const t = CSVV.t;
  return t.recs.map(r => { const o = {}; t.head.forEach((h, c) => { const v = r[c]; o[h] = typed ? typedCell(v, (() => { const k = cellKind(v.trim()); const col = t.prof[c].type; return k === 'empty' ? 'empty' : (col === 'integer' || col === 'number' || col === 'boolean') ? k : 'text'; })()) : v; }); return o; });
}
function drawCSVOut() {
  const t = CSVV.t; if (!t || !t.recs) return;
  const objs = csvObjects($('#csvTyped').checked), nd = csvOutMode.get() === 'ndjson';
  CSVV.out = nd ? objs.map(o => JSON.stringify(o)).join('\n') : JSON.stringify(objs, null, 2);
  edCO.set(CSVV.out);
  const typedCols = $('#csvTyped').checked ? t.prof.filter(p => ['integer', 'number', 'boolean'].includes(p.type)).length : 0;
  $('#footCO').innerHTML = '<span class="num">' + plural(objs.length, nd ? 'line' : 'object') + ' · ' + fmtBytes(byteLen(CSVV.out)) + '</span><span>' + ($('#csvTyped').checked ? plural(typedCols, 'column') + ' typed, empty cells as null' : 'every value a string') + '</span>';
}
$('#csvWrap').addEventListener('click', e => { const b = e.target.closest('.th-b'); if (!b) return; const c = +b.dataset.c; if (CSVV.sort === c) CSVV.dir = -CSVV.dir; else { CSVV.sort = c; CSVV.dir = 1; } drawCSVTable(); });
$('#csvFilter').addEventListener('input', e => { CSVV.filter = e.target.value; drawCSVTable(); });
$('#csvDedupe').onclick = () => {
  const t = CSVV.t; if (!t || !CSVV.dups.length) return;
  const drop = new Set(CSVV.dups.map(d => d.i)), n = drop.size;
  const rows = ($('#csvHeader').checked ? [t.head] : []).concat(t.recs.filter((r, i) => !drop.has(i)));
  edC.set(toCSV(rows, t.d)); runCSV(); say('Removed ' + plural(n, 'duplicate row'));
};
$('#csvCopy').onclick = e => copyText(CSVV.out, e.currentTarget, 'Copied');
fileHooks.C = (t, n) => { edC.set(t); $('#csvName').textContent = n; runCSV(); };

/* ---------------- CSV diff ---------------- */
const CSV_A = ['customer_id,name,country,plan,mrr_eur,seats',
  'cus_R2d9,Northwind Labs GmbH,DE,starter,9.00,1', 'cus_K7x1,Halden Freight AS,NO,starter,9.00,1', 'cus_P3m8,Okapi Studio SARL,FR,scale,79.00,12',
  'cus_W5c2,Brightwater Analytics Ltd,GB,team,29.00,5', 'cus_J8s4,Kestrel Robotics GmbH,DE,enterprise,249.00,40', 'cus_L2v6,Lumen and Vale Ltd,IE,starter,9.00,1',
  'cus_T4h7,Tamsin Health BV,NL,team,29.00,5', 'cus_C9r3,Corvid Systems AB,SE,scale,79.00,12'].join('\n');
const CSV_B = ['customer_id,name,country,plan,mrr_eur,seats',
  'cus_K7x1,Halden Freight AS,NO,starter,9.00,3', 'cus_R2d9,Northwind Labs GmbH,DE,team,29.00,1', 'cus_P3m8,Okapi Studio SARL,FR,scale,79.00,12',
  'cus_W5c2,Brightwater Analytics Ltd,GB,team,29.00,5', 'cus_J8s4,Kestrel Robotics GmbH,DE,enterprise,249.00,40', 'cus_L2v6,Lumen and Vale Ltd,IE,starter,9.00,1',
  'cus_C9r3,Corvid Systems AB,SE,scale,79.00,12', 'cus_N6p2,Fjord Mobility AS,NO,starter,9.00,1', 'cus_F3q8,Pellucid AB,SE,team,29.00,5'].join('\n');
const CD = { key: null, show: 'changes', res: null, userKey: false };
const edCA = makeEditor($('#edCA'), { label: 'Before CSV', plain: true, placeholder: 'Paste the older CSV export', onInput: debounce(() => { CD.userKey = false; runCSVDiff(); }, 150) });
const edCB = makeEditor($('#edCB'), { label: 'After CSV', plain: true, placeholder: 'Paste the newer CSV export', onInput: debounce(() => { CD.userKey = false; runCSVDiff(); }, 150) });
seg($('#cdShow'), v => { CD.show = v; drawCSVDiffList(); });
$('#cdKey').onchange = e => { CD.key = e.target.value; CD.userKey = true; runCSVDiff(); };
$('#cdTrim').onchange = runCSVDiff;
function csvDiff(A, B, key, trim) {
  const norm = s => trim ? s.trim() : s;
  const ka = A.head.indexOf(key), kb = B.head.indexOf(key);
  const idx = (t, k) => { const m = new Map(), dup = []; t.recs.forEach(r => { const v = norm(r[k]); if (m.has(v)) dup.push(v); else m.set(v, r); }); return { m, dup }; };
  const ia = idx(A, ka), ib = idx(B, kb);
  if (ia.dup.length || ib.dup.length) return { error: '"' + key + '" is not unique: ' + [...new Set([...ia.dup, ...ib.dup])].slice(0, 3).join(', ') + ' appear more than once. Choose another key column.' };
  const common = A.head.filter(h => h !== key && B.head.includes(h));
  const rows = [];
  ia.m.forEach((ra, k) => {
    if (!ib.m.has(k)) { rows.push({ kind: 'del', key: k, row: ra, head: A.head }); return; }
    const rb = ib.m.get(k), cells = [];
    common.forEach(h => { const a = norm(ra[A.head.indexOf(h)]), b = norm(rb[B.head.indexOf(h)]); if (a !== b) cells.push({ col: h, a, b }); });
    rows.push({ kind: cells.length ? 'chg' : 'eq', key: k, cells, row: rb, head: B.head });
  });
  ib.m.forEach((rb, k) => { if (!ia.m.has(k)) rows.push({ kind: 'add', key: k, row: rb, head: B.head }); });
  const c = { add: 0, del: 0, chg: 0, cells: 0, eq: 0 };
  rows.forEach(r => { c[r.kind]++; if (r.kind === 'chg') c.cells += r.cells.length; });
  return { rows, c, colsAdded: B.head.filter(h => !A.head.includes(h)), colsRemoved: A.head.filter(h => !B.head.includes(h)) };
}
function runCSVDiff() {
  const t0 = performance.now();
  const A = csvTable(edCA.get(), 'auto', true), B = csvTable(edCB.get(), 'auto', true);
  const sub = $('#cdSub'), sel = $('#cdKey');
  [['A', A, edCA], ['B', B, edCB]].forEach(([s, t, ed]) => {
    const f = $('#footC' + s);
    ed.mark(t.error ? new Map([[t.line, 'err']]) : new Map());
    f.innerHTML = t.empty ? '<span>Empty. Paste a CSV export.</span>' : t.error ? '<span class="bad">' + esc(t.error) + '</span>' : '<span class="ok">Parsed</span><span class="num">' + plural(t.recs.length, 'row') + ' · ' + plural(t.width, 'column') + ' · ' + DELIM_NAME[t.d] + '</span>';
  });
  CD.res = null;
  const fail = msg => { sub.innerHTML = msg; $('#cdTitle').innerHTML = '<span class="big" style="color:var(--faint)">—</span><span class="unit">no comparison yet</span>'; $('#cdTally').innerHTML = '<div class="bar" aria-hidden="true"></div>'; $('#cdList').innerHTML = emptyBox(msg.replace(/<[^>]+>/g, '')); $('#cdStamp').textContent = ''; };
  if (!A.recs || !B.recs) { sel.innerHTML = ''; return fail(A.error || B.error ? '<b>A CSV does not parse</b>, so there is nothing to compare yet.' : 'Paste two CSV exports with a header row to compare them.'); }
  const common = A.head.filter(h => B.head.includes(h));
  if (!common.length) { sel.innerHTML = ''; return fail('<b>The two files share no column names</b>, so rows cannot be matched.'); }
  const uniqueIn = (t, h) => { const k = t.head.indexOf(h), s = new Set(t.recs.map(r => r[k].trim())); return s.size === t.recs.length && !s.has(''); };
  if (!CD.userKey || !common.includes(CD.key)) CD.key = common.find(h => uniqueIn(A, h) && uniqueIn(B, h)) || common[0];
  sel.innerHTML = common.map(h => '<option' + (h === CD.key ? ' selected' : '') + '>' + esc(h) + '</option>').join('');
  const r = csvDiff(A, B, CD.key, $('#cdTrim').checked);
  if (r.error) return fail('<b>Cannot match rows.</b> ' + esc(r.error));
  CD.res = r; const c = r.c, n = c.add + c.del + c.cells;
  $('#cdStamp').textContent = 'Compared ' + plural(A.recs.length + B.recs.length, 'row') + ' in ' + (performance.now() - t0).toFixed(1) + ' ms';
  sub.innerHTML = n ? '<b>' + plural(n, 'difference') + '</b> keyed on <code>' + esc(CD.key) + '</code>: ' + plural(c.add, 'row') + ' added, ' + c.del + ' removed, ' + plural(c.cells, 'cell') + ' changed in ' + plural(c.chg, 'row') + '; ' + plural(c.eq, 'row') + ' unchanged' + (r.colsAdded.length || r.colsRemoved.length ? '; columns ' + [r.colsAdded.length ? r.colsAdded.join(', ') + ' added' : '', r.colsRemoved.length ? r.colsRemoved.join(', ') + ' removed' : ''].filter(Boolean).join(', ') : '') + '.' : '<b>No differences.</b> Every row keyed on <code>' + esc(CD.key) + '</code> matches.';
  const segm = (k, cls) => k ? '<span class="' + cls + '" style="flex:' + k + '"></span>' : '';
  $('#cdTitle').innerHTML = '<span class="big">' + n + '</span><span class="unit">' + (n === 1 ? 'difference' : 'differences') + ' in ' + plural(Math.max(A.recs.length, B.recs.length), 'row') + '</span>';
  $('#cdTally').innerHTML = (n ? '<div class="bar" role="img" aria-label="' + c.cells + ' cells changed, ' + c.del + ' rows removed, ' + c.add + ' rows added">' + segm(c.cells, 'sw-chg') + segm(c.del, 'sw-del') + segm(c.add, 'sw-add') + '</div>' : '<div class="bar" aria-hidden="true"></div>') +
    '<p class="legend"><span><i class="sw-chg"></i><b>' + c.cells + '</b> cells changed in ' + plural(c.chg, 'row') + '</span><span><i class="sw-del"></i><b>' + c.del + '</b> rows removed</span><span><i class="sw-add"></i><b>' + c.add + '</b> rows added</span><span><b>' + c.eq + '</b> unchanged</span></p>';
  drawCSVDiffList();
}
function drawCSVDiffList() {
  const r = CD.res; if (!r) return;
  const order = { chg: 0, del: 1, add: 2, eq: 3 };
  const rows = r.rows.filter(x => CD.show === 'all' || x.kind !== 'eq').sort((a, b) => order[a.kind] - order[b.kind]);
  const label = x => { const i = x.head.findIndex(h => /name/i.test(h)); return i >= 0 ? x.row[i] : x.row.filter((v, j) => x.head[j] !== CD.key).slice(0, 2).join(', '); };
  $('#cdList').innerHTML = rows.length ? '<table class="dt"><thead><tr><th>' + esc(CD.key) + '</th><th>Change</th><th>Cells</th></tr></thead><tbody>' + rows.map(x =>
    '<tr><td><code>' + esc(x.key) + '</code></td><td><span class="pill ' + x.kind + '">' + { chg: 'Changed', add: 'Added', del: 'Removed', eq: 'Equal' }[x.kind] + '</span></td><td class="wrap">' +
    (x.kind === 'chg' ? '<span class="cell-chg">' + x.cells.map(cc => '<span class="col">' + esc(cc.col) + '</span><code class="old">' + esc(cc.a || '(empty)') + '</code><span class="arr">→</span><code>' + esc(cc.b || '(empty)') + '</code>').join('<span class="arr">·</span>') + '</span>'
      : '<span class="' + (x.kind === 'eq' ? 'dash' : '') + '">' + esc(label(x)) + (x.kind === 'add' ? ', new in After' : x.kind === 'del' ? ', not in After' : '') + '</span>') + '</td></tr>').join('') + '</tbody></table>'
    : emptyBox('No changed rows.');
}
$('#cdSwap').onclick = () => { const a = edCA.get(); edCA.set(edCB.get()); edCB.set(a); const n = $('#cdNameA').textContent; $('#cdNameA').textContent = $('#cdNameB').textContent; $('#cdNameB').textContent = n; runCSVDiff(); say('Before and After swapped'); };
$('#cdCopy').onclick = e => { const r = CD.res; if (!r) return; copyText(r.rows.filter(x => x.kind !== 'eq').map(x => x.kind === 'chg' ? 'changed ' + x.key + ': ' + x.cells.map(c => c.col + ' ' + c.a + ' -> ' + c.b).join('; ') : (x.kind === 'add' ? 'added ' : 'removed ') + x.key).join('\n'), e.currentTarget, 'Report copied'); };
fileHooks.CA = (t, n) => { edCA.set(t); $('#cdNameA').textContent = n; CD.userKey = false; runCSVDiff(); };
fileHooks.CB = (t, n) => { edCB.set(t); $('#cdNameB').textContent = n; CD.userKey = false; runCSVDiff(); };

/* ---------------- BSON values: mongosh syntax and Extended JSON v2, parsed into typed values ---------------- */
class BV { constructor(t, v) { this.t = t; this.v = v; } }
const BV_NAME = { oid: 'ObjectId', date: 'Date', int: 'Int32', long: 'Long', double: 'Double', dec: 'Decimal128', ts: 'Timestamp', bin: 'Binary', regex: 'Regular expression', minkey: 'MinKey', maxkey: 'MaxKey' };
const hexToB64 = h => btoa(h.match(/../g).map(x => String.fromCharCode(parseInt(x, 16))).join(''));
const isoOf = ms => new Date(ms).toISOString();
let oidCounter = (crypto.getRandomValues(new Uint32Array(1))[0]) & 0xffffff;
const PROC_RANDOM = [...crypto.getRandomValues(new Uint8Array(5))].map(x => x.toString(16).padStart(2, '0')).join('');
function newOid(sec) {
  oidCounter = (oidCounter + 1) & 0xffffff;
  return Math.floor(sec).toString(16).padStart(8, '0').slice(-8) + PROC_RANDOM + oidCounter.toString(16).padStart(6, '0');
}
/* a tolerant parser: JSON, plus unquoted keys, single quotes, comments, trailing commas, constructors and /regex/ */
function parseShell(text, opts = {}) {
  const starts = [0];
  for (let j = 0; j < text.length; j++) if (text.charCodeAt(j) === 10) starts.push(j + 1);
  const lineOf = pos => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };
  let i = 0; const flags = { shell: 0 };
  class SErr extends Error { constructor(m, p) { super(m); this.pos = p; } }
  const fail = (m, p = i) => { throw new SErr(m, p); };
  const desc = p => p >= text.length ? 'the end of the input' : '"' + text[p] + '"';
  const ws = () => {
    for (;;) {
      while (i < text.length && /\s/.test(text[i])) i++;
      if (text.startsWith('//', i)) { while (i < text.length && text[i] !== '\n') i++; continue; }
      if (text.startsWith('/*', i)) { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; continue; }
      break;
    }
  };
  const ESC = { '"': '"', "'": "'", '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '0': '\0' };
  function str() {
    const q = text[i], s = i; if (q === "'") flags.shell++; i++; let out = '';
    for (;;) {
      if (i >= text.length) fail('Unterminated string', s);
      const c = text[i];
      if (c === q) { i++; return out; }
      if (c === '\n') fail('Line break inside a string', i);
      if (c === '\\') { const n = text[i + 1]; if (n in ESC) { out += ESC[n]; i += 2; } else if (n === 'u') { const h = text.substr(i + 2, 4); if (!/^[0-9a-fA-F]{4}$/.test(h)) fail('Bad \\u escape', i); out += String.fromCharCode(parseInt(h, 16)); i += 6; } else { out += n; i += 2; } continue; }
      out += c; i++;
    }
  }
  const IDS = /^[A-Za-z_$][\w$]*/;
  function call(name, at) {
    i++; const args = []; ws();
    while (text[i] !== ')') { args.push(value()); ws(); if (text[i] === ',') { i++; ws(); } else if (text[i] !== ')') fail('Expected "," or ")" in ' + name + '(…), found ' + desc(i)); }
    i++; flags.shell++;
    const a = args[0], num = x => typeof x === 'number' ? x : typeof x === 'string' && /^-?\d+(\.\d+)?$/.test(x.trim()) ? Number(x) : NaN;
    switch (name) {
      case 'ObjectId': case 'ObjectID':
        if (a === undefined) return new BV('oid', newOid(Date.now() / 1000));
        if (typeof a !== 'string' || !/^[0-9a-fA-F]{24}$/.test(a)) fail('ObjectId needs 24 hex characters', at);
        return new BV('oid', a.toLowerCase());
      case 'ISODate': case 'Date': {
        if (a === undefined) return new BV('date', Date.now());
        const ms = typeof a === 'number' ? a : Date.parse(a);
        if (isNaN(ms)) fail('Not a valid date: ' + JSON.stringify(a), at);
        return new BV('date', ms);
      }
      case 'NumberLong': case 'Long': { const s = typeof a === 'number' ? String(a) : String(a).trim(); if (!/^-?\d+$/.test(s)) fail(name + ' needs an integer', at); return new BV('long', s.replace(/^(-?)0+(?=\d)/, '$1')); }
      case 'NumberInt': case 'Int32': { const n = num(a); if (!Number.isInteger(n) || Math.abs(n) > 2147483647) fail(name + ' needs a 32-bit integer', at); return new BV('int', n); }
      case 'NumberDecimal': case 'Decimal128': { const s = String(a).trim(); if (!/^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(s)) fail(name + ' needs a decimal number in quotes', at); return new BV('dec', s); }
      case 'Double': { const n = num(a); if (isNaN(n)) fail('Double needs a number', at); return new BV('double', n); }
      case 'Timestamp': { const t = isObj(a) ? a.t : a, inc = isObj(a) ? a.i : args[1]; if (!Number.isInteger(t) || !Number.isInteger(inc)) fail('Timestamp needs t and i', at); return new BV('ts', { t, i: inc }); }
      case 'BinData': { if (typeof args[1] !== 'string') fail('BinData needs a subtype and a Base64 string', at); return new BV('bin', { b64: args[1], sub: Number(a).toString(16).padStart(2, '0') }); }
      case 'HexData': return new BV('bin', { b64: hexToB64(String(args[1])), sub: Number(a).toString(16).padStart(2, '0') });
      case 'UUID': { const h = String(a || '').replace(/-/g, ''); if (!/^[0-9a-fA-F]{32}$/.test(h)) fail('UUID needs 32 hex digits', at); return new BV('bin', { b64: hexToB64(h), sub: '04' }); }
      case 'MinKey': return new BV('minkey', 1);
      case 'MaxKey': return new BV('maxkey', 1);
      default: fail(name + '(…) is not a constructor this tool knows', at);
    }
  }
  function value() {
    ws();
    if (i >= text.length) fail('Unexpected end of the input; a value was expected');
    const c = text[i];
    if (c === '{') {
      i++; const o = {}; ws();
      while (text[i] !== '}') {
        let k;
        if (text[i] === '"' || text[i] === "'") k = str();
        else { const m = IDS.exec(text.slice(i, i + 200)) || /^\d+/.exec(text.slice(i, i + 50)); if (!m) fail('Expected a property name, found ' + desc(i)); k = m[0]; i += k.length; flags.shell++; }
        ws(); if (text[i] !== ':') fail('Expected ":" after the property name, found ' + desc(i)); i++;
        Object.defineProperty(o, k, { value: value(), enumerable: true, writable: true, configurable: true });
        ws(); if (text[i] === ',') { i++; ws(); } else if (text[i] !== '}') fail('Expected "," or "}" after this value, found ' + desc(i));
      }
      i++; return o;
    }
    if (c === '[') {
      i++; const a = []; ws();
      while (text[i] !== ']') { a.push(value()); ws(); if (text[i] === ',') { i++; ws(); } else if (text[i] !== ']') fail('Expected "," or "]" after this item, found ' + desc(i)); }
      i++; return a;
    }
    if (c === '"' || c === "'") return str();
    if (c === '/') {
      const s = i; i++; let p = '', cls = false;
      while (i < text.length && (text[i] !== '/' || cls)) { if (text[i] === '\\') { p += text[i] + text[i + 1]; i += 2; continue; } if (text[i] === '[') cls = true; if (text[i] === ']') cls = false; if (text[i] === '\n') fail('Unterminated regular expression', s); p += text[i++]; }
      if (i >= text.length) fail('Unterminated regular expression', s);
      i++; const f = /^[a-z]*/.exec(text.slice(i))[0]; i += f.length; flags.shell++;
      return new BV('regex', { p, o: f.split('').sort().join('') });
    }
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
    if (m && m[0] !== '-') { i += m[0].length; return Number(m[0]); }
    const id = IDS.exec(text.slice(i, i + 200));
    if (id) {
      const at = i; let name = id[0]; i += name.length;
      if (name === 'true') return true; if (name === 'false') return false; if (name === 'null') return null;
      if (name === 'undefined') { flags.shell++; return null; }
      if (name === 'NaN' || name === 'Infinity') { flags.shell++; return new BV('double', name === 'NaN' ? NaN : Infinity); }
      if (name === 'new') { ws(); const n2 = IDS.exec(text.slice(i, i + 200)); if (!n2) fail('Expected a constructor after "new"'); name = n2[0]; i += name.length; }
      ws(); if (text[i] === '(') return call(name, at);
      fail('Unexpected word "' + name + '"', at);
    }
    fail('Unexpected ' + desc(i) + '; a value was expected');
  }
  try {
    ws();
    if (i >= text.length) return { state: 'empty', lines: starts.length };
    const vals = [value()]; ws();
    while (i < text.length) {
      if (!opts.many) fail('Unexpected ' + desc(i) + ' after the end of the document');
      if (text[i] === ',') { i++; ws(); if (i >= text.length) break; }
      vals.push(value()); ws();
    }
    return { state: 'ok', value: vals.length > 1 ? vals : vals[0], many: vals.length > 1, flags, lines: starts.length };
  } catch (e) {
    if (!(e instanceof SErr)) throw e;
    const p = Math.min(e.pos, text.length), line = lineOf(p);
    return { state: 'error', message: e.message, line, col: p - starts[line - 1] + 1, lines: starts.length };
  }
}
/* Extended JSON wrappers ({"$oid": …}) become typed values; counts what it saw */
function fromEJSON(v, seen = { canonical: 0, wrappers: 0 }) {
  if (v instanceof BV) return v;
  if (Array.isArray(v)) return v.map(x => fromEJSON(x, seen));
  if (!isObj(v)) return v;
  const ks = Object.keys(v), k = ks[0], x = v[k];
  const W = (t, val, canon) => { seen.wrappers++; if (canon) seen.canonical++; return new BV(t, val); };
  if (ks.length === 1) {
    if (k === '$oid' && typeof x === 'string' && /^[0-9a-f]{24}$/i.test(x)) return W('oid', x.toLowerCase());
    if (k === '$date') { if (isObj(x) && typeof x.$numberLong === 'string') return W('date', Number(x.$numberLong), true); if (typeof x === 'string' && !isNaN(Date.parse(x))) return W('date', Date.parse(x)); if (typeof x === 'number') return W('date', x); }
    if (k === '$numberInt' && /^-?\d+$/.test(x)) return W('int', Number(x), true);
    if (k === '$numberLong' && /^-?\d+$/.test(x)) return W('long', x, true);
    if (k === '$numberDouble' && typeof x === 'string') return W('double', x === 'Infinity' ? Infinity : x === '-Infinity' ? -Infinity : Number(x), true);
    if (k === '$numberDecimal' && typeof x === 'string') return W('dec', x);
    if (k === '$timestamp' && isObj(x)) return W('ts', { t: x.t, i: x.i });
    if (k === '$binary' && isObj(x)) return W('bin', { b64: x.base64, sub: String(x.subType).padStart(2, '0') });
    if (k === '$regularExpression' && isObj(x)) return W('regex', { p: x.pattern, o: x.options || '' });
    if (k === '$minKey') return W('minkey', 1);
    if (k === '$maxKey') return W('maxkey', 1);
    if (k === '$uuid' && typeof x === 'string') return W('bin', { b64: hexToB64(x.replace(/-/g, '')), sub: '04' });
    if (k === '$undefined') return null;
  }
  if (ks.length === 2 && has(v, '$binary') && has(v, '$type') && typeof v.$binary === 'string') return W('bin', { b64: v.$binary, sub: String(v.$type).padStart(2, '0') });
  const o = {}; ks.forEach(kk => { o[kk] = fromEJSON(v[kk], seen); }); return o;
}
const dblStr = n => !isFinite(n) ? (isNaN(n) ? 'NaN' : n > 0 ? 'Infinity' : '-Infinity') : Number.isInteger(n) && Math.abs(n) < 1e21 ? n + '.0' : String(n).replace('e+', 'E+').replace('e-', 'E-');
/* to a JSON-able structure in canonical, relaxed or plain form */
function toEJ(v, mode) {
  if (Array.isArray(v)) return v.map(x => toEJ(x, mode));
  if (typeof v === 'number') {
    if (mode === 'canonical') return Number.isInteger(v) && Math.abs(v) <= 2147483647 ? { $numberInt: String(v) } : { $numberDouble: dblStr(v) };
    return v;
  }
  if (v instanceof BV) {
    const x = v.v, P = mode === 'plain', C = mode === 'canonical';
    switch (v.t) {
      case 'oid': return P ? x : { $oid: x };
      case 'date': { const y = new Date(x).getUTCFullYear(); return P ? isoOf(x) : C || y < 1970 || y > 9999 ? { $date: { $numberLong: String(x) } } : { $date: isoOf(x) }; }
      case 'int': return C ? { $numberInt: String(x) } : x;
      case 'long': { const n = Number(x), safe = Number.isSafeInteger(n); return C ? { $numberLong: x } : safe ? n : P ? x : { $numberLong: x }; }
      case 'double': return C || !isFinite(x) ? (P ? (isFinite(x) ? x : null) : { $numberDouble: dblStr(x) }) : x;
      case 'dec': return P ? x : { $numberDecimal: x };
      case 'ts': return P ? { t: x.t, i: x.i } : { $timestamp: { t: x.t, i: x.i } };
      case 'bin': return P ? x.b64 : { $binary: { base64: x.b64, subType: x.sub } };
      case 'regex': return P ? '/' + x.p + '/' + x.o : { $regularExpression: { pattern: x.p, options: x.o } };
      case 'minkey': return P ? 'MinKey' : { $minKey: 1 };
      case 'maxkey': return P ? 'MaxKey' : { $maxKey: 1 };
    }
  }
  if (isObj(v)) { const o = {}; Object.keys(v).forEach(k => { o[k] = toEJ(v[k], mode); }); return o; }
  return v;
}
const sq = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
function toShell(v, d = 0) {
  const pad = '  '.repeat(d + 1), end = '  '.repeat(d);
  if (v instanceof BV) {
    const x = v.v;
    switch (v.t) {
      case 'oid': return 'ObjectId(' + sq(x) + ')';
      case 'date': return 'ISODate(' + sq(isoOf(x)) + ')';
      case 'int': return 'NumberInt(' + x + ')';
      case 'long': return 'NumberLong(' + sq(x) + ')';
      case 'double': return isFinite(x) ? (Number.isInteger(x) ? x + '.0' : String(x)) : String(x);
      case 'dec': return 'NumberDecimal(' + sq(x) + ')';
      case 'ts': return 'Timestamp({ t: ' + x.t + ', i: ' + x.i + ' })';
      case 'bin': return 'BinData(' + parseInt(x.sub, 16) + ', ' + sq(x.b64) + ')';
      case 'regex': return '/' + x.p + '/' + x.o;
      case 'minkey': return 'MinKey()';
      case 'maxkey': return 'MaxKey()';
    }
  }
  if (Array.isArray(v)) { if (!v.length) return '[]'; const flat = v.every(x => !isObj(x) && !Array.isArray(x)); const items = v.map(x => toShell(x, d + 1)); return flat && items.join(', ').length < 60 ? '[ ' + items.join(', ') + ' ]' : '[\n' + items.map(s => pad + s).join(',\n') + '\n' + end + ']'; }
  if (isObj(v)) { const ks = Object.keys(v); if (!ks.length) return '{}'; return '{\n' + ks.map(k => pad + (IDENT.test(k) ? k : sq(k)) + ': ' + toShell(v[k], d + 1)).join(',\n') + '\n' + end + '}'; }
  if (typeof v === 'string') return sq(v);
  return JSON.stringify(v);
}
function typedPaths(v, path = '', out = []) {
  if (v instanceof BV) out.push({ path: path || '(root)', t: v.t, v });
  else if (Array.isArray(v)) v.forEach((x, i) => typedPaths(x, path + '[' + i + ']', out));
  else if (isObj(v)) Object.keys(v).forEach(k => typedPaths(v[k], path ? path + '.' + k : k, out));
  return out;
}
/* documents for the Mongo tools: an array, NDJSON, EJSON or shell syntax */
function parseDocs(text) {
  const p = parseShell(text, { many: true });
  if (p.state !== 'ok') return p;
  const seen = { canonical: 0, wrappers: 0 };
  let v = fromEJSON(p.value, seen);
  const docs = p.many ? v : Array.isArray(v) ? v : [v];
  const bad = docs.findIndex(d => !isObj(d) || d instanceof BV);
  if (bad >= 0) return { state: 'error', message: 'Item ' + (bad + 1) + ' is ' + valType(docs[bad]) + ', not a document', line: 1, col: 1, lines: p.lines };
  return { state: 'ok', docs, many: p.many, flags: p.flags, seen, lines: p.lines };
}

/* ---------------- Extended JSON tool ---------------- */
const SAMPLE_SHELL = `// one subscription, as mongosh prints it
{
  _id: ObjectId("6ada0ea0e1b5f3a9d2c40e18"),
  customerId: ObjectId("6ada0e04e1b5f3a9d2c40d77"),
  status: 'active',
  plan: { id: 'team', interval: 'month', amount: NumberDecimal("29.00"), currency: 'eur', seats: NumberInt(5) },
  usage: { apiCalls: NumberLong("48211934"), storageBytes: NumberLong(1073741824), errorRate: 0.0042 },
  features: ['api', 'webhooks', 'sso', 'audit_log'],
  currentPeriodEnd: ISODate("2026-11-01T00:00:00Z"),
  createdAt: ISODate("2026-10-22T13:24:48.000Z"),
  lastSync: Timestamp({ t: 1792675488, i: 3 }),
  signingKeyHash: BinData(0, "d2hzZWNfbm9ydGh3aW5kX3dlYmhvb2tfdjI="),
  billingDomain: /@northwind-labs\\.io$/i
}`;
const LOST = { oid: 'a 24-character string', date: 'an ISO 8601 string', int: 'a plain number', long: 'a number (a string past 2^53)', double: 'a plain number', dec: 'a string, to keep its digits', ts: 'an object { t, i }', bin: 'a Base64 string, subtype dropped', regex: 'a "/pattern/flags" string', minkey: 'the string "MinKey"', maxkey: 'the string "MaxKey"' };
const EJ = { mode: 'canonical', out: '' };
const edE = makeEditor($('#edE'), { label: 'Input in mongosh, Extended JSON or JSON', placeholder: 'Paste mongosh output, Extended JSON or plain JSON', onInput: debounce(runEJSON, 150) });
const edEO = makeEditor($('#edEO'), { label: 'Converted output', readOnly: true });
const ejMode = seg($('#ejMode'), v => { EJ.mode = v; runEJSON(); });
const MODE_NAME = { canonical: 'canonical Extended JSON v2', relaxed: 'relaxed Extended JSON v2', shell: 'mongosh shell syntax', plain: 'plain JSON' };
function runEJSON() {
  const text = edE.get(), p = parseShell(text), sub = $('#ejSub'), foot = $('#footE');
  edE.mark(p.state === 'error' ? new Map([[p.line, 'err']]) : new Map());
  if (p.state !== 'ok') {
    EJ.out = ''; edEO.set(''); $('#ejTypes').innerHTML = ''; $('#ejTypesMeta').textContent = ''; $('#ejStamp').textContent = ''; $('#footEO').textContent = '';
    foot.innerHTML = p.state === 'empty' ? '<span>Empty. Paste a document.</span>' : '<span class="bad num">Line ' + p.line + ', column ' + p.col + '</span><span>' + esc(p.message) + '</span>';
    sub.innerHTML = p.state === 'empty' ? 'Paste a document in mongosh syntax, Extended JSON or plain JSON.' : '<b>The input does not parse</b> (line ' + p.line + '): ' + esc(p.message) + '.';
    return;
  }
  const seen = { canonical: 0, wrappers: 0 }, v = fromEJSON(p.value, seen);
  const inFmt = p.flags.shell ? 'shell' : seen.canonical ? 'canonical' : seen.wrappers ? 'relaxed' : 'plain';
  const typed = typedPaths(v);
  EJ.out = EJ.mode === 'shell' ? toShell(v) : JSON.stringify(toEJ(v, EJ.mode), null, 2);
  edEO.set(EJ.out);
  foot.innerHTML = '<span class="ok">Read as ' + MODE_NAME[inFmt] + '</span><span class="num">' + plural(p.lines, 'line') + ' · ' + fmtBytes(byteLen(text)) + '</span>';
  $('#ejStamp').textContent = 'Input detected: ' + MODE_NAME[inFmt];
  $('#ejOutName').textContent = MODE_NAME[EJ.mode];
  const counts = {}; typed.forEach(x => { counts[x.t] = (counts[x.t] || 0) + 1; });
  const kinds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const list = kinds.map(k => counts[k] + ' ' + BV_NAME[k] + (counts[k] > 1 && !/(expression|Binary)$/.test(BV_NAME[k]) ? 's' : '')).join(', ');
  sub.innerHTML = typed.length ? '<b>' + plural(typed.length, 'typed value') + '</b> (' + esc(list) + ') read from ' + MODE_NAME[inFmt] + ' and written as ' + MODE_NAME[EJ.mode] + (EJ.mode === 'plain' ? '; plain JSON keeps the values but drops every one of these types.' : ', with every type kept.') : 'No BSON types in this document, so ' + MODE_NAME[EJ.mode] + ' and plain JSON are the same' + (EJ.mode === 'canonical' ? ' apart from numbers, which canonical form wraps.' : '.');
  $('#footEO').innerHTML = EJ.mode === 'plain' && typed.length ? '<span class="bad">Types lost:</span><span>' + esc(kinds.map(k => BV_NAME[k] + ' to ' + LOST[k].replace(/^an? /, '')).slice(0, 3).join('; ')) + (kinds.length > 3 ? '; and ' + (kinds.length - 3) + ' more below' : '') + '</span>' : '<span class="num">' + plural(EJ.out.split('\n').length, 'line') + ' · ' + fmtBytes(byteLen(EJ.out)) + '</span><span>' + (EJ.mode === 'canonical' ? 'every number wrapped, nothing lost' : EJ.mode === 'relaxed' ? 'numbers and dates readable, types kept' : EJ.mode === 'shell' ? 'pastes into mongosh' : '') + '</span>';
  $('#ejTypesMeta').textContent = plural(typed.length, 'value') + ' of ' + plural(kinds.length, 'type');
  $('#ejTypes').innerHTML = typed.length ? '<table class="dt"><thead><tr><th>Type</th><th class="n">Count</th><th>First at</th><th>As ' + esc(MODE_NAME[EJ.mode === 'plain' ? 'canonical' : EJ.mode]) + '</th><th>In plain JSON it becomes</th></tr></thead><tbody>' + kinds.map(k => {
    const first = typed.find(x => x.t === k), shown = EJ.mode === 'shell' ? toShell(first.v) : JSON.stringify(toEJ(first.v, EJ.mode === 'plain' ? 'canonical' : EJ.mode));
    return '<tr><td>' + BV_NAME[k] + '</td><td class="n">' + counts[k] + '</td><td><code>' + esc(first.path) + '</code></td><td><code>' + esc(short(shown, 56)) + '</code></td><td>' + LOST[k] + '</td></tr>';
  }).join('') + '</tbody></table>' : emptyBox('No ObjectIds, dates, longs, decimals or other BSON types found.');
}
$('#ejCopy').onclick = e => copyText(EJ.out, e.currentTarget, 'Output copied');
$('#ejUse').onclick = () => { if (EJ.out) { edE.set(EJ.out); runEJSON(); say('Output moved to the input'); } };
fileHooks.E = (t, n) => { edE.set(t); $('#ejName').textContent = n; runEJSON(); };

/* ---------------- ObjectId ---------------- */
function decodeOid(h) {
  h = h.toLowerCase();
  return { hex: h, ts: parseInt(h.slice(0, 8), 16), rnd: h.slice(8, 18), cnt: parseInt(h.slice(18), 16), cntHex: h.slice(18) };
}
console.assert(decodeOid('507f1f77bcf86cd799439011').ts === 1350508407 && isoOf(1350508407000) === '2012-10-17T21:13:27.000Z', 'ObjectId 507f1f77… was created 2012-10-17T21:13:27Z');
const SAMPLE_OIDS = '6ada0e04e1b5f3a9d2c40d77\nObjectId("6ada0ea0e1b5f3a9d2c40e18")\n{"$oid": "6adb235be1b5f3a9d2c40f02"}\n6adc687c4b9e02d7a1003a1c\n6abda20a4b9e02d7a10039f0';
const OID = { ids: [], sel: 0, gen: [] };
const fmtUTC = sec => isoOf(sec * 1000).replace('T', ' ').replace('.000Z', ' UTC');
const fmtDay = sec => new Date(sec * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const spanTxt = s => s >= 86400 ? plural(Math.round(s / 86400), 'day') : s >= 3600 ? plural(Math.round(s / 3600), 'hour') : plural(Math.round(s / 60), 'minute');
function runOid() {
  const text = $('#oidIn').value, ids = [], seen = new Set();
  const re = /(?<![0-9a-fA-F])[0-9a-fA-F]{24}(?![0-9a-fA-F])/g; let m;
  while ((m = re.exec(text))) { const h = m[0].toLowerCase(); if (!seen.has(h)) { seen.add(h); ids.push(decodeOid(h)); } }
  OID.ids = ids; if (OID.sel >= ids.length) OID.sel = 0;
  const sub = $('#oidSub'), junk = text.split('\n').filter(l => l.trim() && !/[0-9a-fA-F]{24}/.test(l)).length;
  $('#oidFoot').innerHTML = ids.length ? '<span class="ok">' + plural(ids.length, 'ObjectId') + ' found</span>' + (junk ? '<span class="bad">' + plural(junk, 'line') + ' without an id</span>' : '') : text.trim() ? '<span class="bad">No 24-character hex ObjectId in this text.</span>' : '<span>Empty. Paste one id per line.</span>';
  if (!ids.length) {
    sub.textContent = text.trim() ? 'No ObjectId found. An ObjectId is 24 hex characters.' : 'Paste ObjectIds to read when they were created.';
    $('#oidTable').innerHTML = emptyBox('Nothing decoded yet.'); $('#oidDetail').innerHTML = '<p class="note">Select an id to see its bytes.</p>';
    setStats($('#oidStats'), [['Newest', '—'], ['ObjectIds', '0'], ['Oldest', '—'], ['Span', '—']]); return;
  }
  const ts = ids.map(x => x.ts), lo = Math.min(...ts), hi = Math.max(...ts), procs = new Set(ids.map(x => x.rnd)).size;
  sub.innerHTML = '<b>' + plural(ids.length, 'ObjectId') + ' created between ' + fmtDay(lo) + ' and ' + fmtDay(hi) + '</b>, by ' + plural(procs, 'process', 'processes') + ' (distinct random values); the newest was created ' + rel(hi) + '.';
  setStats($('#oidStats'), [['Newest', '<span class="num">' + fmtUTC(hi).slice(0, 16) + '</span>'], ['ObjectIds', nf(ids.length)], ['Oldest', '<span class="num">' + fmtUTC(lo).slice(0, 16) + '</span>'], ['Span', ids.length > 1 ? spanTxt(hi - lo) : '—']]);
  $('#oidTable').innerHTML = '<table class="dt"><thead><tr><th>ObjectId</th><th>Created (UTC)</th><th>Age</th><th>Random value</th><th class="n">Counter</th></tr></thead><tbody>' + ids.map((x, i) =>
    '<tr class="click' + (i === OID.sel ? ' sel' : '') + '" data-i="' + i + '" tabindex="0"><td><code>' + x.hex + '</code></td><td class="num">' + fmtUTC(x.ts) + '</td><td>' + rel(x.ts) + '</td><td><code>' + x.rnd + '</code></td><td class="n">' + nf(x.cnt) + '</td></tr>').join('') + '</tbody></table>';
  drawOidDetail();
}
function drawOidDetail() {
  const x = OID.ids[OID.sel]; if (!x) return;
  const d = new Date(x.ts * 1000);
  $('#oidDetail').innerHTML = '<div class="oid-anat" aria-label="ObjectId bytes"><span class="ts">' + x.hex.slice(0, 8) + '</span><span class="rnd">' + x.rnd + '</span><span class="cnt">' + x.cntHex + '</span></div>' +
    '<p class="oid-key"><span><i class="ts"></i>4-byte timestamp</span><span><i></i>5-byte random value</span><span><i class="cnt"></i>3-byte counter</span></p>' +
    '<dl class="kv" style="margin-top:12px"><dt>Created, UTC</dt><dd class="num">' + fmtUTC(x.ts) + '</dd><dt>Created, local</dt><dd class="num">' + d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' }) + '<span class="sub">' + esc(Intl.DateTimeFormat().resolvedOptions().timeZone || 'this browser') + '</span></dd><dt>Unix seconds</dt><dd class="num"><code>' + x.ts + '</code></dd><dt>Age</dt><dd>' + rel(x.ts) + '</dd><dt>Random value</dt><dd><code>' + x.rnd + '</code><span class="sub">same machine and process as ' + plural(OID.ids.filter(y => y.rnd === x.rnd).length - 1, 'other id') + ' here</span></dd><dt>Counter</dt><dd class="num">' + nf(x.cnt) + '<span class="sub">0x' + x.cntHex + '</span></dd></dl>';
}
$('#oidTable').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; OID.sel = +tr.dataset.i; $$('#oidTable tr[data-i]').forEach(r => r.classList.toggle('sel', r === tr)); drawOidDetail(); });
$('#oidTable').addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-i]'); tr && tr.click(); } });
$('#oidIn').addEventListener('input', runOid);
$('#oidCopySel').onclick = e => { const x = OID.ids[OID.sel]; if (x) copyText(x.hex, e.currentTarget, 'Id copied'); };
$('#oidCopyAll').onclick = e => copyText('object_id,created_utc,unix_seconds,random,counter\n' + OID.ids.map(x => [x.hex, isoOf(x.ts * 1000), x.ts, x.rnd, x.cnt].join(',')).join('\n'), e.currentTarget, 'CSV copied');
const dtLocalUTC = sec => isoOf(sec * 1000).slice(0, 19);
const fromDtLocal = v => { const ms = Date.parse(v.length === 16 ? v + ':00Z' : v + 'Z'); return isNaN(ms) ? null : Math.floor(ms / 1000); };
function genOids() {
  const sec = fromDtLocal($('#oidGenAt').value) ?? Math.floor(Date.now() / 1000);
  let n = Math.round(+$('#oidGenN').value || 1); n = Math.max(1, Math.min(20, n)); $('#oidGenN').value = n;
  OID.gen = Array.from({ length: n }, () => newOid(sec));
  $('#oidGenOut').innerHTML = OID.gen.map((h, i) => '<li><code id="og' + i + '">' + h + '</code><button class="btn ghost sm" data-copy="og' + i + '"><svg aria-hidden="true"><use href="#i-copy"/></svg><span>Copy</span></button></li>').join('');
}
$('#oidGen').onclick = genOids;
$('#oidGenNow').onclick = () => { $('#oidGenAt').value = dtLocalUTC(Math.floor(Date.now() / 1000)); genOids(); };
$('#oidGenCopy').onclick = e => copyText(OID.gen.join('\n'), e.currentTarget, 'Copied ' + OID.gen.length);
function oidRange() {
  const a = fromDtLocal($('#oidFrom').value), b = fromDtLocal($('#oidTo').value), out = $('#oidRange'), note = $('#oidRangeNote');
  if (a == null || b == null) { out.textContent = ''; note.textContent = 'Choose both dates.'; return; }
  if (b <= a) { out.textContent = ''; note.innerHTML = '<span style="color:var(--negative)">The end must be after the start.</span>'; return; }
  const h = s => s.toString(16).padStart(8, '0') + '0000000000000000';
  OID.range = '{ _id: { $gte: ObjectId("' + h(a) + '"), $lt: ObjectId("' + h(b) + '") } }';
  out.textContent = '{\n  _id: {\n    $gte: ObjectId("' + h(a) + '"),\n    $lt: ObjectId("' + h(b) + '")\n  }\n}';
  const inside = OID.ids.filter(x => x.ts >= a && x.ts < b).length;
  note.innerHTML = 'Matches documents created from ' + fmtUTC(a) + ' up to ' + fmtUTC(b) + ' (' + spanTxt(b - a) + '), using the _id index. ' + (OID.ids.length ? '<b>' + inside + ' of ' + OID.ids.length + '</b> ids above fall inside it.' : '');
}
$('#oidFrom').addEventListener('input', oidRange); $('#oidTo').addEventListener('input', oidRange);
$('#oidRangeCopy').onclick = e => OID.range && copyText(OID.range, e.currentTarget, 'Filter copied');

/* ---------------- MongoDB find, run locally ---------------- */
const isDoc = x => isObj(x) && !(x instanceof BV);
const SUBS10 = (() => {
  const P = { starter: 900, team: 2900, scale: 7900, enterprise: 24900 }, S = { starter: 1, team: 5, scale: 12, enterprise: 40 };
  const F = { starter: ['api'], team: ['api', 'webhooks', 'sso'], scale: ['api', 'webhooks', 'sso', 'audit_log'], enterprise: ['api', 'webhooks', 'sso', 'audit_log', 'scim'] };
  const rows = [
    ['sub_8Kq2LmV41', 'active', 'cus_R2d9', 'ops@northwind-labs.io', 'DE', 'team', '2026-11-01'],
    ['sub_3Fh7QpZ02', 'active', 'cus_K7x1', 'billing@halden-freight.no', 'NO', 'starter', '2026-11-04', { coupon: 'LAUNCH20' }],
    ['sub_9Lm4TxB77', 'active', 'cus_P3m8', 'compta@okapi.studio', 'FR', 'scale', '2026-11-19', { coupon: 'PARTNER10' }],
    ['sub_2Wc8NvR15', 'past_due', 'cus_W5c2', 'finance@brightwater.io', 'GB', 'team', '2026-10-20'],
    ['sub_6Jd1KsY39', 'active', 'cus_J8s4', 'ap@kestrel-robotics.de', 'DE', 'enterprise', '2026-11-30'],
    ['sub_4Pz6HgE58', 'trialing', 'cus_L2v6', 'hello@lumenvale.co', 'IE', 'starter', '2026-11-11', { trial_end: '2026-11-11T00:00:00Z' }],
    ['sub_7Rb3MwC81', 'canceled', 'cus_T4h7', 'accounts@tamsin.health', 'NL', 'team', '2026-10-01', { canceled_at: '2026-09-28T16:40:00Z' }],
    ['sub_1Xk9DfU44', 'active', 'cus_C9r3', 'billing@corvid.systems', 'SE', 'scale', '2026-11-23'],
    ['sub_5Ny2GaL63', 'active', 'cus_N6p2', 'okonomi@fjord-mobility.no', 'NO', 'starter', '2026-11-15', { coupon: 'LAUNCH20' }],
    ['sub_8Qe5JtV20', 'past_due', 'cus_F3q8', 'ekonomi@pellucid.se', 'SE', 'team', '2026-10-02']
  ];
  return rows.map(([id, status, cid, email, country, plan, end, extra]) => Object.assign({ _id: id, status, customer: { id: cid, email, country }, plan: { id: plan, interval: 'month', amount: P[plan], currency: 'eur', seats: S[plan] }, features: F[plan].slice(), current_period_end: end + 'T00:00:00Z' }, extra || {}));
})();
const MQ_OPS = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists', '$type', '$regex', '$options', '$not', '$elemMatch', '$size', '$all'];
class QErr extends Error {}
function fam(v) {
  if (v === undefined || v === null) return ['z', null];
  if (typeof v === 'number') return ['n', v];
  if (typeof v === 'string') return ['s', v];
  if (typeof v === 'boolean') return ['b', v];
  if (Array.isArray(v)) return ['a', v];
  if (v instanceof BV) {
    if (v.t === 'int' || v.t === 'double' || v.t === 'long') return ['n', Number(v.v)];
    if (v.t === 'dec') return ['n', Number(v.v)];
    if (v.t === 'date') return ['d', v.v];
    if (v.t === 'oid') return ['o', v.v];
    if (v.t === 'regex') return ['r', '/' + v.v.p + '/' + v.v.o];
    if (v.t === 'ts') return ['t', v.v.t * 4294967296 + v.v.i];
    return [v.t, JSON.stringify(v.v)];
  }
  return ['x', v];
}
function bEq(a, b) {
  const [fa, va] = fam(a), [fb, vb] = fam(b);
  if (fa !== fb) return false;
  if (fa === 'a') return va.length === vb.length && va.every((x, i) => bEq(x, vb[i]));
  if (fa === 'x') { const ka = Object.keys(va), kb = Object.keys(vb); return ka.length === kb.length && ka.every((k, i) => k === kb[i] && bEq(va[k], vb[k])); }
  return va === vb;
}
function bCmp(a, b) {
  const [fa, va] = fam(a), [fb, vb] = fam(b);
  if (fa !== fb || !'nsdobt'.includes(fa)) return null;
  return va < vb ? -1 : va > vb ? 1 : 0;
}
function resolvePath(doc, parts) {
  const walk = (v, i) => {
    if (i === parts.length) return [v];
    const p = parts[i];
    if (Array.isArray(v)) {
      const out = [];
      if (/^\d+$/.test(p) && +p < v.length) out.push(...walk(v[+p], i + 1));
      v.forEach(e => { if (isDoc(e)) out.push(...walk(e, i)); });
      return out;
    }
    if (isDoc(v) && has(v, p)) return walk(v[p], i + 1);
    return [];
  };
  return walk(doc, 0);
}
const cands = leaves => leaves.length ? leaves.flatMap(v => Array.isArray(v) ? [v, ...v] : [v]) : [undefined];
const TYPE_ALIAS = { 1: 'double', 2: 'string', 3: 'object', 4: 'array', 5: 'binData', 7: 'objectId', 8: 'bool', 9: 'date', 10: 'null', 11: 'regex', 16: 'int', 17: 'timestamp', 18: 'long', 19: 'decimal' };
function bsonType(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) && Math.abs(v) <= 2147483647 ? 'int' : 'double';
  if (Array.isArray(v)) return 'array';
  if (v instanceof BV) return { oid: 'objectId', date: 'date', int: 'int', long: 'long', double: 'double', dec: 'decimal', ts: 'timestamp', bin: 'binData', regex: 'regex', minkey: 'minKey', maxkey: 'maxKey' }[v.t];
  return 'object';
}
function typeIs(v, alias) {
  alias = TYPE_ALIAS[alias] || alias;
  if (!Object.values(TYPE_ALIAS).concat(['number', 'minKey', 'maxKey']).includes(alias)) throw new QErr('$type does not know the type "' + alias + '"');
  if (v === undefined) return false;
  const t = bsonType(v);
  if (alias === 'number') return ['int', 'long', 'double', 'decimal'].includes(t);
  if (alias === 'double' && typeof v === 'number') return true;
  return t === alias;
}
function reTest(c, p, o) {
  if (typeof c !== 'string') return false;
  let re; try { re = new RegExp(p, (o || '').replace(/[^imsu]/g, '')); } catch (e) { throw new QErr('Bad regular expression /' + p + '/: ' + e.message); }
  return re.test(c);
}
const isOpObj = x => isDoc(x) && Object.keys(x).length > 0 && Object.keys(x).every(k => k[0] === '$');
function matchCond(leaves, cond) {
  if (cond instanceof BV && cond.t === 'regex') return cands(leaves).some(c => reTest(c, cond.v.p, cond.v.o));
  if (!isOpObj(cond)) {
    if (isDoc(cond) && Object.keys(cond).some(k => k[0] === '$')) throw new QErr('Do not mix operators and plain fields in one condition: ' + Object.keys(cond).join(', '));
    return cands(leaves).some(c => bEq(c, cond));
  }
  return Object.keys(cond).every(op => evalOp(op, cond[op], leaves, cond));
}
function evalOp(op, arg, leaves, cond) {
  const cs = cands(leaves);
  const inList = () => { if (!Array.isArray(arg)) throw new QErr(op + ' needs an array, for example { status: { ' + op + ': ["active", "trialing"] } }'); return cs.some(c => arg.some(a => a instanceof BV && a.t === 'regex' ? reTest(c, a.v.p, a.v.o) : bEq(c, a))); };
  const cmpOp = test => cs.some(c => { const r = bCmp(c, arg); return r !== null && test(r); });
  switch (op) {
    case '$eq': return cs.some(c => bEq(c, arg));
    case '$ne': return !cs.some(c => bEq(c, arg));
    case '$gt': return cmpOp(r => r > 0);
    case '$gte': return cmpOp(r => r >= 0);
    case '$lt': return cmpOp(r => r < 0);
    case '$lte': return cmpOp(r => r <= 0);
    case '$in': return inList();
    case '$nin': return !inList();
    case '$exists': return (leaves.length > 0) === !!arg;
    case '$type': { const list = Array.isArray(arg) ? arg : [arg]; return leaves.some(l => list.some(a => typeIs(l, a))) || cs.some(c => list.some(a => typeIs(c, a))); }
    case '$regex': { const p = arg instanceof BV ? arg.v.p : arg, o = (arg instanceof BV ? arg.v.o : '') + (cond.$options || ''); if (typeof p !== 'string') throw new QErr('$regex needs a string pattern'); return cs.some(c => reTest(c, p, o)); }
    case '$options': if (!has(cond, '$regex')) throw new QErr('$options only works next to $regex'); return true;
    case '$not': if (!isOpObj(arg) && !(arg instanceof BV && arg.t === 'regex')) throw new QErr('$not needs an operator expression or a regex, for example { $not: { $gte: 2000 } }'); return !matchCond(leaves, arg);
    case '$elemMatch': if (!isDoc(arg)) throw new QErr('$elemMatch needs a document'); return leaves.some(l => Array.isArray(l) && l.some(e => isOpObj(arg) ? matchCond([e], arg) : isDoc(e) && matchDoc(e, arg)));
    case '$size': if (!Number.isInteger(fam(arg)[1])) throw new QErr('$size needs a whole number'); return leaves.some(l => Array.isArray(l) && l.length === fam(arg)[1]);
    case '$all': if (!Array.isArray(arg)) throw new QErr('$all needs an array'); return arg.length > 0 && arg.every(a => isDoc(a) && a.$elemMatch ? evalOp('$elemMatch', a.$elemMatch, leaves, a) : cs.some(c => bEq(c, a)));
    case '$and': case '$or': case '$nor': throw new QErr(op + ' belongs at the top of the filter or inside another $and/$or/$nor, not under a field');
    default: throw new QErr(op + ' is not supported in this tester. It runs ' + MQ_OPS.filter(x => x !== '$options').concat(['$and', '$or', '$nor']).join(' ') + ' locally.');
  }
}
function matchDoc(doc, filter) {
  if (!isDoc(filter)) throw new QErr('The filter must be a document, for example { status: "active" }');
  return Object.keys(filter).every(k => {
    const c = filter[k];
    if (k === '$and' || k === '$or' || k === '$nor') {
      if (!Array.isArray(c) || !c.length) throw new QErr(k + ' needs a non-empty array of filters');
      return k === '$and' ? c.every(f => matchDoc(doc, f)) : k === '$or' ? c.some(f => matchDoc(doc, f)) : !c.some(f => matchDoc(doc, f));
    }
    if (k === '$comment') return true;
    if (k[0] === '$') throw new QErr(k + ' is not supported in this tester; it needs the server. Use field conditions with $and, $or and $nor.');
    return matchCond(resolvePath(doc, k.split('.')), c);
  });
}
function specTree(spec) {
  const t = {}; Object.keys(spec).forEach(k => { const parts = k.split('.'); let n = t; parts.forEach((p, i) => { if (i === parts.length - 1) n[p] = true; else { if (n[p] === true) return; n[p] = n[p] || {}; n = n[p]; } }); });
  return t;
}
function project(doc, spec) {
  const keys = Object.keys(spec); if (!keys.length) return doc;
  const truth = v => !!fam(v)[1] || v === true;
  const inc = keys.filter(k => k !== '_id').some(k => truth(spec[k]));
  const exc = keys.filter(k => k !== '_id').some(k => !truth(spec[k]));
  if (inc && exc) throw new QErr('A projection either includes fields (1) or excludes them (0), not both, except for _id');
  const idOff = has(spec, '_id') && !truth(spec._id);
  if (inc) {
    const t = specTree(Object.fromEntries(keys.filter(k => k !== '_id' && truth(spec[k])).map(k => [k, 1])));
    const pick = (v, tree) => {
      if (Array.isArray(v)) return v.filter(isDoc).map(e => pick(e, tree));
      if (!isDoc(v)) return undefined;
      const o = {}; Object.keys(tree).forEach(k => { if (!has(v, k)) return; if (tree[k] === true) o[k] = v[k]; else { const r = pick(v[k], tree[k]); if (r !== undefined) o[k] = r; } }); return o;
    };
    const out = {}; if (!idOff && has(doc, '_id')) out._id = doc._id;
    return Object.assign(out, pick(doc, t));
  }
  const t = specTree(Object.fromEntries(keys.filter(k => !truth(spec[k])).map(k => [k, 0])));
  const drop = (v, tree) => {
    if (Array.isArray(v)) return v.map(e => isDoc(e) ? drop(e, tree) : e);
    if (!isDoc(v)) return v;
    const o = {}; Object.keys(v).forEach(k => { if (tree[k] === true) return; o[k] = tree[k] ? drop(v[k], tree[k]) : v[k]; }); return o;
  };
  return drop(doc, t);
}
const SORT_RANK = { z: 0, n: 1, s: 2, x: 3, a: 4, bin: 5, o: 6, b: 7, d: 8, t: 9, r: 10 };
function sortDocs(docs, spec) {
  const keys = Object.keys(spec);
  keys.forEach(k => { const d = fam(spec[k])[1]; if (d !== 1 && d !== -1) throw new QErr('Sort directions are 1 or -1; "' + k + '" has ' + JSON.stringify(spec[k])); });
  const first = (doc, k, dir) => { const ls = resolvePath(doc, k.split('.')), cs = ls.flatMap(v => Array.isArray(v) ? v : [v]); if (!cs.length) return undefined; return cs.slice().sort((a, b) => cmpAny(a, b) * dir)[0]; };
  const cmpAny = (a, b) => { const fa = fam(a)[0], fb = fam(b)[0]; if (fa !== fb) return (SORT_RANK[fa] ?? 3) - (SORT_RANK[fb] ?? 3); const r = bCmp(a, b); return r === null ? 0 : r; };
  return docs.map((d, i) => ({ d, i })).sort((x, y) => { for (const k of keys) { const dir = fam(spec[k])[1], r = cmpAny(first(x.d, k, dir), first(y.d, k, dir)) * dir; if (r) return r; } return x.i - y.i; }).map(x => x.d);
}
function parseSpec(text, what) {
  if (!text.trim()) return {};
  const p = parseShell(text);
  if (p.state === 'error') throw new QErr(what + ' does not parse: column ' + p.col + ', ' + p.message);
  const v = fromEJSON(p.value);
  if (!isDoc(v)) throw new QErr(what + ' must be a document');
  return v;
}
function runFind(docs, filterText, projText, sortText, limit) {
  const fp = parseShell(filterText.trim() ? filterText : '{}');
  if (fp.state === 'error') throw new QErr('The filter does not parse: line ' + fp.line + ', column ' + fp.col + ', ' + fp.message);
  const filter = fromEJSON(fp.value), proj = parseSpec(projText, 'The projection'), sort = parseSpec(sortText, 'The sort');
  let hits = docs.filter(d => matchDoc(d, filter));
  const matched = hits.length;
  if (Object.keys(sort).length) hits = sortDocs(hits, sort);
  if (limit > 0) hits = hits.slice(0, limit);
  return { matched, docs: hits.map(d => project(d, proj)), filter, sort, proj };
}
const MQ = { docs: [], last: null };
const edMQ = makeEditor($('#edMQ'), { label: 'Documents', placeholder: 'Paste documents: a JSON array, NDJSON, Extended JSON or mongosh output', onInput: debounce(runMongo, 200) });
const edMF = makeEditor($('#edMF'), { label: 'Find filter', placeholder: '{ status: "active" }', onInput: debounce(runMongo, 250) });
edMF.ta.id = 'mqFilterTa';
['#mqProj', '#mqSort', '#mqLimit'].forEach(s => $(s).addEventListener('input', debounce(runMongo, 250)));
$('#mqRun').onclick = () => runMongo();
const MQ_EXAMPLES = ['{ features: "sso" }', '{ "plan.id": { $in: ["team", "scale"] } }', '{ coupon: { $exists: true } }', '{ "customer.email": { $regex: "\\\\.no$" } }', '{ features: { $all: ["api", "audit_log"] } }', '{ $or: [{ status: "past_due" }, { "plan.seats": { $lt: 2 } }] }', '{ features: { $size: 1 } }', '{ status: { $not: { $in: ["active", "trialing"] } } }'];
function runMongo() {
  const text = edMQ.get(), p = parseDocs(text), out = $('#mqOut'), sub = $('#mqSub'), head = $('#mqCount');
  edMQ.mark(p.state === 'error' ? new Map([[p.line, 'err']]) : new Map());
  if (p.state !== 'ok') {
    $('#footMQ').innerHTML = p.state === 'empty' ? '<span>Empty. Paste documents or open a file.</span>' : '<span class="bad num">Line ' + p.line + ', column ' + p.col + '</span><span>' + esc(p.message) + '</span>';
    head.innerHTML = '<span class="big" style="color:var(--faint)">—</span><span class="unit">no documents</span>'; $('#mqMeta').textContent = '';
    out.innerHTML = emptyBox(p.state === 'empty' ? 'Paste documents to run the filter against.' : 'The documents do not parse (line ' + p.line + '), so the filter cannot run.');
    sub.textContent = 'Run a MongoDB find filter on pasted documents, locally.'; MQ.last = null; return;
  }
  MQ.docs = p.docs;
  $('#footMQ').innerHTML = '<span class="ok">' + plural(p.docs.length, 'document') + '</span><span class="num">' + (p.many ? 'NDJSON' : p.flags.shell ? 'mongosh syntax' : p.seen.wrappers ? 'Extended JSON' : 'JSON array') + ' · ' + fmtBytes(byteLen(text)) + '</span>';
  const lim = Math.max(0, Math.floor(+$('#mqLimit').value || 0));
  let r;
  try { r = runFind(p.docs, edMF.get(), $('#mqProj').value, $('#mqSort').value, lim); }
  catch (e) {
    if (!(e instanceof QErr)) throw e;
    MQ.last = null;
    head.innerHTML = '<span class="big" style="color:var(--faint)">—</span><span class="unit">not run</span>'; $('#mqMeta').textContent = '';
    out.innerHTML = '<div style="padding-top:4px">' + errLine(e.message) + '</div>';
    sub.innerHTML = '<b>The query did not run.</b> ' + esc(e.message.split('. ')[0]) + '.'; return;
  }
  MQ.last = r;
  const n = p.docs.length;
  head.innerHTML = '<span class="big">' + r.matched + '</span><span class="unit">of ' + plural(n, 'document') + ' match</span>';
  const sk = Object.keys(r.sort), pk = Object.keys(r.proj);
  $('#mqMeta').textContent = (sk.length ? 'sorted by ' + sk.map(k => k + (fam(r.sort[k])[1] > 0 ? ' ↑' : ' ↓')).join(', ') : 'natural order') + (lim && r.matched > lim ? ' · first ' + lim : '');
  sub.innerHTML = '<b>' + r.matched + ' of ' + plural(n, 'document') + ' match</b> (' + pct(r.matched, n) + '%)' + (sk.length ? ', sorted by ' + esc(sk.join(', ')) : '') + (pk.length ? ', projected to ' + plural(pk.length, 'field') : '') + (lim && r.matched > lim ? ', limited to ' + lim : '') + '. Run in this browser, no server.';
  out.innerHTML = (r.docs.length ? '<div class="matches">' + r.docs.slice(0, 100).map((d, i) => '<div class="match"><code class="p">' + (i + 1) + (has(d, '_id') ? ' · ' + esc(typeof d._id === 'string' ? d._id : JSON.stringify(toEJ(d._id, 'relaxed'))) : '') + '</code><pre>' + esc(JSON.stringify(toEJ(d, 'relaxed'), null, 2)) + '</pre></div>').join('') + '</div>' : emptyBox('No document matches this filter.')) +
    '<h3 class="ex-h">Examples on these documents</h3><ul class="ex">' + MQ_EXAMPLES.map(x => { let c = '—'; try { c = plural(runFind(p.docs, x, '', '', 0).matched, 'match', 'matches'); } catch (e) { if (!(e instanceof QErr)) throw e; } return '<li><button class="ex-b" data-mq="' + esc(x) + '"><code>' + esc(x) + '</code><span class="num">' + c + '</span></button></li>'; }).join('') + '</ul>';
}
$('#mqOut').addEventListener('click', e => { const b = e.target.closest('[data-mq]'); if (!b) return; edMF.set(b.dataset.mq); runMongo(); $('#mqOut').scrollTop = 0; });
$('#mqCopy').onclick = e => MQ.last && copyText(JSON.stringify(MQ.last.docs.map(d => toEJ(d, 'relaxed')), null, 2), e.currentTarget, 'Results copied');
fileHooks.MQ = (t, n) => { edMQ.set(t); $('#mqName').textContent = n; runMongo(); };

/* ---------------- Schema analyzer (like the Compass schema tab) ---------------- */
const TNAME = v => { const t = bsonType(v); return { string: 'String', bool: 'Boolean', int: 'Int32', double: 'Double', long: 'Int64', decimal: 'Decimal128', null: 'Null', array: 'Array', object: 'Document', objectId: 'ObjectId', date: 'Date', timestamp: 'Timestamp', binData: 'Binary', regex: 'RegExp', minKey: 'MinKey', maxKey: 'MaxKey' }[t]; };
const FAMILY = n => ['Int32', 'Int64', 'Double', 'Decimal128'].includes(n) ? 'Number' : n;
function analyzeDocs(docs) {
  const fields = new Map();
  const get = (path, depth) => { if (!fields.has(path)) fields.set(path, { path, depth, docs: new Set(), types: {}, n: 0, arr: { types: {}, len: 0, n: 0 }, samples: [] }); return fields.get(path); };
  const walk = (obj, prefix, depth, di) => Object.keys(obj).forEach(k => {
    const path = prefix ? prefix + '.' + k : k, f = get(path, depth), v = obj[k], tn = TNAME(v);
    f.docs.add(di); f.n++; f.types[tn] = (f.types[tn] || 0) + 1;
    if (Array.isArray(v)) { f.arr.n++; f.arr.len += v.length; v.forEach(e => { const en = TNAME(e); f.arr.types[en] = (f.arr.types[en] || 0) + 1; if (isDoc(e)) walk(e, path, depth + 1, di); else sample(f, e); }); }
    else if (isDoc(v)) walk(v, path, depth + 1, di);
    else sample(f, v);
  });
  const sample = (f, v) => { const s = v instanceof BV ? (v.t === 'date' ? isoOf(v.v).slice(0, 10) : v.t === 'oid' ? v.v : JSON.stringify(toEJ(v, 'relaxed'))) : JSON.stringify(v); if (f.samples.length < 3 && !f.samples.includes(s)) f.samples.push(s); };
  docs.forEach((d, i) => walk(d, '', 0, i));
  const N = docs.length;
  return [...fields.values()].map(f => {
    const fams = new Set(Object.keys(f.types).map(FAMILY).filter(x => x !== 'Null'));
    return Object.assign(f, { presence: pct(f.docs.size, N), present: f.docs.size, mixed: fams.size > 1, optional: f.docs.size < N, nullable: !!f.types.Null });
  });
}
const MA = { show: 'all', fields: [], n: 0 };
const edMS = makeEditor($('#edMS'), { label: 'Documents to analyse', placeholder: 'Paste documents: a JSON array, NDJSON, Extended JSON or mongosh output', onInput: debounce(runAnalyze, 200) });
seg($('#maShow'), v => { MA.show = v; drawAnalyze(); });
function runAnalyze() {
  const text = edMS.get(), p = parseDocs(text), sub = $('#maSub');
  edMS.mark(p.state === 'error' ? new Map([[p.line, 'err']]) : new Map());
  if (p.state !== 'ok') {
    $('#footMS').innerHTML = p.state === 'empty' ? '<span>Empty. Paste documents or open a file.</span>' : '<span class="bad num">Line ' + p.line + ', column ' + p.col + '</span><span>' + esc(p.message) + '</span>';
    sub.textContent = p.state === 'empty' ? 'Paste documents to see every field, its types and presence.' : 'The documents do not parse (line ' + p.line + ').';
    MA.fields = []; $('#maOut').innerHTML = emptyBox('Nothing to analyse yet.'); setStats($('#maStats'), [['Fields', '—'], ['Documents', '—'], ['Mixed types', '—'], ['Optional', '—']]); return;
  }
  MA.n = p.docs.length; MA.fields = analyzeDocs(p.docs);
  $('#footMS').innerHTML = '<span class="ok">' + plural(MA.n, 'document') + '</span><span class="num">' + fmtBytes(byteLen(text)) + '</span>';
  const mixed = MA.fields.filter(f => f.mixed), opt = MA.fields.filter(f => f.optional);
  const mix1 = mixed[0], mixTxt = mix1 ? '<code>' + esc(mix1.path) + '</code> is ' + Object.keys(mix1.types).sort((a, b) => mix1.types[b] - mix1.types[a]).map(t => t + ' in ' + mix1.types[t]).join(' and ') : '';
  sub.innerHTML = '<b>' + plural(MA.fields.length, 'field') + ' across ' + plural(MA.n, 'document') + '</b>; ' + (mixed.length ? '<b>' + plural(mixed.length, 'field has', 'fields have') + ' mixed types</b> to fix (' + mixTxt + (mixed.length > 1 ? ', and ' + (mixed.length - 1) + ' more' : '') + ')' : 'no field has mixed types') + '; ' + plural(opt.length, 'field is', 'fields are') + ' missing from some documents.';
  setStats($('#maStats'), [['Mixed types', nf(mixed.length), mixed.length ? 'warn' : ''], ['Fields', nf(MA.fields.length)], ['Documents', nf(MA.n)], ['Optional', nf(opt.length)]]);
  drawAnalyze();
}
function drawAnalyze() {
  const list = MA.fields.filter(f => MA.show === 'all' || f.mixed || f.optional);
  $('#maTitle').textContent = plural(list.length, 'field');
  $('#maOut').innerHTML = list.length ? '<table class="dt"><thead><tr><th>Field</th><th>Types</th><th class="n">Present</th><th>Sample values</th></tr></thead><tbody>' + list.map(f => {
    const ts = Object.keys(f.types).sort((a, b) => f.types[b] - f.types[a]);
    const major = FAMILY(ts[0]);
    const bar = '<span class="tbar" aria-hidden="true">' + ts.map((t, i) => '<span class="' + (f.mixed && FAMILY(t) !== major && t !== 'Null' ? 'bad' : i === 0 ? 't0' : '') + '" style="flex:' + f.types[t] + '"></span>').join('') + '</span>';
    const share = '<span class="tshare">' + ts.map(t => '<span>' + t + ' <b>' + pct(f.types[t], f.n) + '%</b></span>').join('') + (f.types.Array ? '<span>of ' + (Object.keys(f.arr.types).join(', ') || 'nothing') + ', ' + (f.arr.len / Math.max(1, f.arr.n)).toFixed(1) + ' items on average</span>' : '') + '</span>';
    const pill = f.mixed ? '<span class="pill chg">Mixed</span>' : f.optional ? '<span class="pill">Optional</span>' : '';
    return '<tr><td><span class="fld">' + (f.depth ? '<span class="depth">' + '·'.repeat(f.depth) + '</span>' : '') + '<code>' + esc(f.path) + '</code>' + pill + '</span></td><td>' + bar + share + '</td><td class="n"><span class="pbar" aria-hidden="true"><i style="width:' + f.presence + '%"></i></span>' + f.presence + '%<span class="th-m">' + f.present + ' of ' + MA.n + '</span></td><td class="samples">' + (f.samples.length ? f.samples.map(s => '<code>' + esc(short(s, 28)) + '</code>').join(', ') : '<span class="dash">—</span>') + '</td></tr>';
  }).join('') + '</tbody></table>' : emptyBox('Every field has one type and appears in every document.');
}
$('#maCopy').onclick = e => copyText('field,types,present_percent,mixed,optional\n' + MA.fields.map(f => [f.path, Object.keys(f.types).map(t => t + ' ' + pct(f.types[t], f.n) + '%').join(' / '), f.presence, f.mixed, f.optional].join(',')).join('\n'), e.currentTarget, 'CSV copied');
fileHooks.MS = (t, n) => { edMS.set(t); $('#maName').textContent = n; runAnalyze(); };
const SAMPLE_ANALYZE = (() => {
  const oids = ['6abda20a4b9e02d7a10039f0', '6abda2804b9e02d7a10039f1', '6ac3a1c84b9e02d7a1003a02', '6ac8e0b14b9e02d7a1003a0b', '6ad0f2e94b9e02d7a1003a12', '6ad5a3104b9e02d7a1003a19', '6ada0e04e1b5f3a9d2c40d77', '6ada0ea0e1b5f3a9d2c40e18', '6adb235be1b5f3a9d2c40f02', '6adc687c4b9e02d7a1003a1c'];
  return SUBS10.map((d, i) => {
    const o = JSON.parse(JSON.stringify(d));
    o.stripe_id = o._id; o._id = { $oid: oids[i] };
    if (i === 3) o.plan.seats = '5';
    if (i === 7) o.current_period_end = { $date: o.current_period_end };
    if (i === 8) o.customer.country = null;
    return o;
  });
})();

/* ---------------- Redact: find sensitive values, then mask, fake, hash or remove them ---------------- */
function luhn(s) { const d = s.replace(/\D/g, ''); if (d.length < 12 || d.length > 19) return false; let sum = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; } return sum % 10 === 0; }
function ibanOk(s) { s = s.replace(/\s/g, '').toUpperCase(); if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false; const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, c => c.charCodeAt(0) - 55); let m = 0; for (const ch of r) m = (m * 10 + +ch) % 97; return m === 1; }
console.assert(luhn('4242424242424242') && !luhn('4242424242424241'), 'Luhn: the 4242 test card passes, one digit off fails');
console.assert(ibanOk('DE89 3704 0044 0532 0130 00'), 'IBAN checksum of the standard German example');
const RD_KINDS = {
  jwt: { label: 'JWT', note: 'three Base64url parts' }, apikey: { label: 'API key', note: 'sk_live_, ghp_, AKIA… or by key name' }, email: { label: 'Email', note: 'addresses' },
  iban: { label: 'IBAN', note: 'mod-97 checksum valid' }, phone: { label: 'Phone number', note: 'international or by key name' }, card: { label: 'Card number', note: 'Luhn-checked' },
  ip: { label: 'IP address', note: 'IPv4 and IPv6' }, secret: { label: 'Secret by key name', note: 'password, secret, token, authorization, ssn' }
};
const KEY_SECRET = /^(password|passwd|pwd|pass|passphrase|secret|client_secret|[\w-]*_secret|secret_[\w-]*|token|access_token|refresh_token|id_token|[\w-]*_token|authorization|proxy-authorization|cookie|set-cookie|ssn|social_security_number|private_key|secret_key|access_key|api_key|apikey|x-api-key|[\w-]*_api_key)$/i;
const KEY_APIKEY = /^(api_key|apikey|x-api-key|[\w-]*_api_key|access_key|secret_key)$/i;
const KEY_PHONE = /^(phone|phone_number|mobile|tel|telephone|fax|cell)$/i;
const RE = {
  jwt: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g,
  apikey: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bAKIA[0-9A-Z]{16}\b|\bxox[abpr]-[A-Za-z0-9-]{10,}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bglpat-[A-Za-z0-9_-]{20}\b/g,
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  iban: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g,
  phone: /\+\d{1,3}(?:[ .-]?\(?\d{1,4}\)?){2,5}/g,
  card: /(?<!\d)[2-6](?:[ -]?\d){11,18}(?!\d)/g,
  ipv4: /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\d.])/g,
  ipv6: /(?<![0-9A-Fa-f:])(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}(?![0-9A-Fa-f:])|(?<![0-9A-Fa-f:])(?:[0-9A-Fa-f]{1,4}:){1,6}:(?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,5})?(?![0-9A-Fa-f:])/g
};
function scanString(s, key) {
  const out = [], taken = [];
  const free = (a, b) => !taken.some(([x, y]) => a < y && b > x);
  const add = (kind, a, b) => { taken.push([a, b]); out.push({ kind, start: a, end: b, value: s.slice(a, b) }); };
  if (key && KEY_SECRET.test(key) && s.trim()) {
    RE.jwt.lastIndex = 0; RE.apikey.lastIndex = 0;
    const kind = RE.jwt.test(s) ? 'jwt' : RE.apikey.test(s) || KEY_APIKEY.test(key) ? 'apikey' : 'secret';
    add(kind, 0, s.length); out[0].whole = true; out[0].byKey = true; return out;
  }
  if (key && KEY_PHONE.test(key) && (s.match(/\d/g) || []).length >= 7) { add('phone', 0, s.length); out[0].whole = true; return out; }
  const pass = (kind, re, ok) => { re.lastIndex = 0; let m; while ((m = re.exec(s))) { const a = m.index, b = a + m[0].length; if (free(a, b) && (!ok || ok(m[0]))) add(kind, a, b); } };
  pass('jwt', RE.jwt); pass('apikey', RE.apikey); pass('email', RE.email); pass('iban', RE.iban, ibanOk);
  pass('phone', RE.phone, v => { const n = (v.match(/\d/g) || []).length; return n >= 8 && n <= 15; });
  pass('card', RE.card, luhn); pass('ip', RE.ipv4); pass('ip', RE.ipv6, v => readIP(v).ok);
  out.forEach(f => { f.whole = f.start === 0 && f.end === s.length; });
  return out.sort((a, b) => a.start - b.start);
}
/* stable fakes: the same input always gives the same fake */
function cyrb53(str, seed = 0) { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'); }
function digitsFrom(seed, n) { let out = '', i = 0; while (out.length < n) out += BigInt('0x' + cyrb53(seed, i++)).toString().slice(1); return out.slice(0, n); }
const luhnDigit = body => { for (let d = 0; d < 10; d++) if (luhn(body + d)) return String(d); return '0'; };
const group4 = s => s.replace(/(.{4})(?=.)/g, '$1 ');
function fakeVal(kind, v) {
  const h = cyrb53(kind + '|' + v), d = n => digitsFrom(kind + v, n);
  switch (kind) {
    case 'email': return 'user-' + h.slice(0, 6) + '@redacted.invalid';
    case 'phone': return '+1 555 01' + d(2) + ' ' + d(4);
    case 'card': { const body = '400000' + d(9); const c = body + luhnDigit(body); return /[ -]/.test(v) ? group4(c) : c; }
    case 'iban': { const bban = d(18); const r = (bban + 'DE00').replace(/[A-Z]/g, c => c.charCodeAt(0) - 55); let m = 0; for (const ch of r) m = (m * 10 + +ch) % 97; const iban = 'DE' + String(98 - m).padStart(2, '0') + bban; return /\s/.test(v) ? group4(iban) : iban; }
    case 'jwt': { const j = b64uEnc('{"alg":"none"}') + '.' + b64uEnc('{"sub":"fake-' + h.slice(0, 8) + '"}') + '.'; return v.replace(RE.jwt, j).replace(/^(?!.*eyJ).*$/, j); }
    case 'apikey': { const m = /^(sk_live_|sk_test_|rk_live_|rk_test_|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|AKIA|xox[abpr]-|AIza|glpat-|whsec_)/.exec(v); const pre = m ? m[1] : ''; let body = ''; while (body.length < v.length - pre.length) body += cyrb53(v, body.length); body = body.slice(0, Math.max(8, v.length - pre.length)); return pre + (pre === 'AKIA' ? body.toUpperCase() : body); }
    case 'ip': return v.includes(':') ? '2001:db8::' + h.slice(0, 4) : '192.0.2.' + (parseInt(h.slice(0, 2), 16) % 254 + 1);
    default: return 'fake-' + h.slice(0, 12);
  }
}
function maskVal(kind, v) {
  if (kind === 'email') { const at = v.indexOf('@'); return v[0] + '***' + v.slice(at); }
  if (kind === 'card' || kind === 'iban' || kind === 'phone') { const nd = (v.match(/[0-9A-Za-z]/g) || []).length; let seen = 0; return v.replace(/[0-9A-Za-z]/g, c => (++seen > nd - 4 || (kind === 'iban' && seen <= 2)) ? c : '*'); }
  if (v.length <= 6) return '*'.repeat(v.length);
  return v.slice(0, 3) + '*'.repeat(Math.min(v.length - 5, 12)) + v.slice(-2);
}
const RD = { actions: {}, findings: [], mode: 'json', out: '', seq: 0, sel: -1, hashes: new Map() };
Object.keys(RD_KINDS).forEach(k => { RD.actions[k] = 'mask'; });
const edR = makeEditor($('#edR'), { label: 'Document to scan', placeholder: 'Paste JSON or CSV to scan for sensitive values', onInput: debounce(runRedact, 200) });
const edRO = makeEditor($('#edRO'), { label: 'Redacted document', readOnly: true });
/* The sample's keys are fakes, but they are shaped like real ones so the scan finds them. They are put
   together here at runtime so that no secret scanner mistakes this file for a leak. */
const FAKE_KEYS = (() => {
  const j = (...parts) => parts.join('');
  return {
    stripe: j('sk', '_li', 've_', '51NwLxQe8Rk2', 'SAMPLE', 'f3a9d2c40e18'),
    github: j('gh', 'p_', '7Kq2LmV41s', 'AmPlE0x9d2c', '40e18F3q8NwLxZ'),
    aws: j('AK', 'IA', 'IOSFODNN7', 'EXAMPLE'),
    webhook: j('wh', 'sec_', '9d2c40e18f3a', '9b5e1c7d')
  };
})();
const SAMPLE_REDACT = {
  event: 'customer.updated', received_at: '2026-10-24T08:12:44Z',
  customer: { id: 'cus_R2d9', name: 'Northwind Labs GmbH', email: 'ops@northwind-labs.io', phone: '+49 30 5557 2190', billing: { iban: 'DE89 3704 0044 0532 0130 00', card: { brand: 'visa', number: '4242 4242 4242 4242', exp_month: 8, exp_year: 2028 } } },
  request: { ip: '100.72.14.9', ipv6: '2a02:8108:1240:5e00:9d3c:1f2e:44a1:7b10', headers: { authorization: 'Bearer ' + SAMPLE_JWT, 'user-agent': 'northwind-sync/2.4.1' } },
  integrations: { stripe: FAKE_KEYS.stripe, github: FAKE_KEYS.github, aws_access_key_id: FAKE_KEYS.aws },
  admin: { username: 'dana.k', password: 'Spring-Harbor-2026!', webhook_secret: FAKE_KEYS.webhook },
  notes: 'Dana Kuehn called from +49 151 2345 6789 about in_7Hc2 and asked for receipts at finance@northwind-labs.io.'
};
function rdCollect(text) {
  const p = parseJSONPos(text);
  if (p.state === 'ok') {
    const fs = [];
    (function walk(v, path, key) {
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + '[' + i + ']', key));
      else if (isObj(v)) Object.keys(v).forEach(k => walk(v[k], joinKey(path, k), k));
      else if (typeof v === 'string' || (typeof v === 'number' && key && (KEY_SECRET.test(key) || KEY_PHONE.test(key)))) scanString(String(v), key).forEach(f => fs.push(Object.assign(f, { path, key, line: (p.map.get(path) || {}).line || 1, num: typeof v === 'number' })));
    })(p.value, '', '');
    return { mode: 'json', p, value: p.value, findings: fs };
  }
  if (p.state === 'empty') return { mode: 'empty', p, findings: [] };
  const d = detectDelim(text), c = parseCSV(text, d);
  if (!c.error && c.rows.length > 1 && c.rows[0].length > 1) {
    const head = c.rows[0], fs = [];
    c.rows.forEach((r, ri) => r.forEach((cell, ci) => { if (ri === 0) return; scanString(cell, head[ci]).forEach(f => fs.push(Object.assign(f, { path: 'row ' + ri + ' · ' + head[ci], key: head[ci], ri, ci, line: ri + 1 }))); }));
    return { mode: 'csv', d, rows: c.rows, findings: fs };
  }
  return { mode: 'error', p, findings: [] };
}
function rdReplace(f) {
  const a = RD.actions[f.kind];
  if (a === 'mask') return maskVal(f.kind, f.value);
  if (a === 'fake') return fakeVal(f.kind, f.value);
  if (a === 'hash') return 'sha256:' + (RD.hashes.get(f.value) || '').slice(0, 12);
  return null;
}
function rdApplyString(s, fs) {
  if (fs.some(f => f.whole && RD.actions[f.kind] === 'remove')) return undefined;
  let out = s;
  fs.slice().sort((a, b) => b.start - a.start).forEach(f => { const r = rdReplace(f); out = out.slice(0, f.start) + (r == null ? '' : r) + out.slice(f.end); });
  return out;
}
async function runRedact() {
  const seq = ++RD.seq, text = edR.get(), r = rdCollect(text), sub = $('#rdSub');
  RD.mode = r.mode; RD.findings = r.findings; RD.r = r;
  const need = [...new Set(r.findings.filter(f => RD.actions[f.kind] === 'hash' && !RD.hashes.has(f.value)).map(f => f.value))];
  if (need.length && window.crypto && crypto.subtle) {
    const hs = await Promise.all(need.map(v => crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''))));
    if (seq !== RD.seq) return;
    need.forEach((v, i) => RD.hashes.set(v, hs[i]));
  }
  const foot = $('#footR');
  if (r.mode === 'empty' || r.mode === 'error') {
    foot.innerHTML = r.mode === 'empty' ? '<span>Empty. Paste JSON or CSV.</span>' : '<span class="bad num">Line ' + r.p.line + ', column ' + r.p.col + '</span><span>' + esc(r.p.message) + ', and it is not CSV either</span>';
    sub.innerHTML = r.mode === 'empty' ? 'Paste JSON or CSV to scan it for sensitive values.' : '<b>Not JSON or CSV.</b> The JSON breaks on line ' + r.p.line + '.';
    RD.out = ''; edRO.set(''); $('#rdKinds').innerHTML = ''; $('#rdList').innerHTML = ''; $('#footRO').textContent = ''; $('#rdFindMeta').textContent = '';
    setStats($('#rdStats'), [['Findings', '—'], ['Kinds', '—'], ['Fields', '—'], ['Redacted size', '—']]); edR.mark(new Map()); return;
  }
  foot.innerHTML = '<span class="ok">' + (r.mode === 'json' ? 'Valid JSON' : 'CSV, ' + DELIM_NAME[r.d] + '-delimited') + '</span><span class="num">' + fmtBytes(byteLen(text)) + '</span>';
  /* the redacted document */
  if (r.mode === 'json') {
    const byPath = new Map(); r.findings.forEach(f => { if (!byPath.has(f.path)) byPath.set(f.path, []); byPath.get(f.path).push(f); });
    const rebuild = (v, path) => {
      if (Array.isArray(v)) return v.map((x, i) => rebuild(x, path + '[' + i + ']')).filter(x => x !== undefined);
      if (isObj(v)) { const o = {}; Object.keys(v).forEach(k => { const nv = rebuild(v[k], joinKey(path, k)); if (nv !== undefined) o[k] = nv; }); return o; }
      if (byPath.has(path)) { const s = rdApplyString(String(v), byPath.get(path)); return s === undefined ? undefined : byPath.get(path)[0].num && RD.actions[byPath.get(path)[0].kind] === 'hash' ? s : s; }
      return v;
    };
    RD.out = JSON.stringify(rebuild(r.value, ''), null, 2);
    $('#rdOutName').textContent = 'redacted.json';
  } else {
    const rows = r.rows.map((row, ri) => row.map((cell, ci) => { const fs = r.findings.filter(f => f.ri === ri && f.ci === ci); return fs.length ? (rdApplyString(cell, fs) ?? '') : cell; }));
    RD.out = toCSV(rows, r.d);
    $('#rdOutName').textContent = 'redacted.csv';
  }
  edRO.set(RD.out);
  /* lists */
  const counts = {}; r.findings.forEach(f => { counts[f.kind] = (counts[f.kind] || 0) + 1; });
  const kinds = Object.keys(RD_KINDS).filter(k => counts[k]);
  const fields = new Set(r.findings.map(f => f.path)).size;
  const acts = {}; r.findings.forEach(f => { acts[RD.actions[f.kind]] = (acts[RD.actions[f.kind]] || 0) + 1; });
  $('#rdKinds').innerHTML = kinds.length ? kinds.map(k => '<li><span class="k">' + RD_KINDS[k].label + '<small>' + RD_KINDS[k].note + '</small></span><span class="c num">' + counts[k] + '</span><div class="segmented" role="group" aria-label="Action for ' + RD_KINDS[k].label + '">' + ['mask', 'fake', 'hash', 'remove'].map(a => '<button data-kind="' + k + '" data-act="' + a + '" aria-pressed="' + (RD.actions[k] === a) + '">' + a[0].toUpperCase() + a.slice(1) + '</button>').join('') + '</div></li>').join('') : '<li><span class="note">No sensitive values found.</span></li>';
  $('#rdFindMeta').textContent = plural(r.findings.length, 'value') + ' in ' + plural(fields, 'field');
  $('#rdList').innerHTML = r.findings.map((f, i) => { const rep = rdReplace(f); return '<li data-i="' + i + '" style="cursor:pointer"><code class="p">' + esc(r.mode === 'json' ? jsonPath(f.path) : f.path) + '</code><span class="pill ' + (f.kind === 'secret' || f.kind === 'apikey' || f.kind === 'jwt' || f.kind === 'card' || f.kind === 'iban' ? 'del' : 'chg') + '">' + RD_KINDS[f.kind].label + '</span><span class="why"><code>' + esc(short(f.value, 34)) + '</code> → ' + (rep == null ? (f.whole ? 'key removed' : 'removed') : '<code>' + esc(short(rep, 34)) + '</code>') + (f.byKey ? ' · by key name' : '') + '</span></li>'; }).join('');
  const marks = new Map(); r.findings.forEach(f => marks.set(f.line, 'chg'));
  const sf = RD.findings[RD.sel]; edR.mark(marks, sf ? [sf.line, sf.line] : null);
  const NOUN = { jwt: ['JWT', 'JWTs'], apikey: ['API key', 'API keys'], email: ['email', 'emails'], iban: ['IBAN', 'IBANs'], phone: ['phone number', 'phone numbers'], card: ['card number', 'card numbers'], ip: ['IP address', 'IP addresses'], secret: ['secret by key name', 'secrets by key name'] };
  const list = kinds.map(k => plural(counts[k], NOUN[k][0], NOUN[k][1]));
  const listTxt = list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0];
  sub.innerHTML = r.findings.length ? '<b>' + plural(r.findings.length, 'sensitive value') + ' in ' + plural(fields, 'field') + '</b>: ' + esc(listTxt) + '. Scanned in this browser; nothing was sent.' : '<b>No sensitive values found</b> in this ' + (r.mode === 'json' ? 'document' : 'CSV') + '. Scanned in this browser.';
  setStats($('#rdStats'), [['Findings', nf(r.findings.length), r.findings.length ? 'bad' : ''], ['Kinds', nf(kinds.length)], ['Fields', nf(fields)], ['Redacted size', fmtBytes(byteLen(RD.out))]]);
  $('#footRO').innerHTML = '<span class="num">' + plural(r.findings.length, 'value') + ' redacted</span><span>' + Object.keys(acts).map(a => a[0].toUpperCase() + a.slice(1) + ' ' + acts[a]).join(' · ') + '</span>';
}
$('#rdKinds').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; RD.actions[b.dataset.kind] = b.dataset.act; runRedact(); });
$('#rdList').addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (!li) return; RD.sel = +li.dataset.i; const f = RD.findings[RD.sel]; runRedact().then(() => edR.scrollToLine(f.line)); });
$('#rdCopy').onclick = e => RD.out && copyText(RD.out, e.currentTarget, 'Redacted copy copied');
$('#rdCopy2').onclick = e => RD.out && copyText(RD.out, e.currentTarget, 'Copied');
fileHooks.R = (t, n) => { edR.set(t); $('#rdName').textContent = n; runRedact(); };

/* ---------------- samples for every data tool, and checks that they compute what they should ---------------- */
function startDataTools() {
  edF.set(SAMPLE_INVOICE_MIN); runFormat();
  edT.set(pretty(SAMPLE_INVOICES)); runTable();
  console.assert(TBL.rows.length === 12, 'Table: 12 invoice rows');
  edS.set(pretty(SAMPLE_SUBS3)); edSV.set(pretty(SAMPLE_SUB_BAD)); runSchema(); runSchemaValidate();
  console.assert(SCH.errs && SCH.errs.length === 5, 'Schema: the bad subscription has 5 errors', SCH.errs);
  edC.set(SAMPLE_CSV); runCSV();
  console.assert(CSVV.t.recs.length === 11 && CSVV.dups.length === 1 && CSVV.t.d === ',', 'CSV viewer: 11 rows, 1 duplicate, comma');
  console.assert(CSVV.t.recs[4][1] === 'Kestrel Robotics "KR" GmbH' && CSVV.t.recs[4][9].includes('\n') && CSVV.t.recs[0][1] === 'Northwind Labs, GmbH', 'CSV viewer: quotes, commas and newlines inside fields');
  edCA.set(CSV_A); edCB.set(CSV_B); runCSVDiff();
  console.assert(CD.res && CD.res.c.add === 2 && CD.res.c.del === 1 && CD.res.c.cells === 3 && CD.key === 'customer_id', 'CSV diff: 2 added, 1 removed, 3 cells changed, keyed on customer_id', CD.res && CD.res.c);
  edE.set(SAMPLE_SHELL); runEJSON();
  console.assert(typedPaths(fromEJSON(parseShell(SAMPLE_SHELL).value)).length === 11, 'Extended JSON: 11 typed values in the sample');
  console.assert(JSON.stringify(toEJ(new BV('date', Date.UTC(2026, 10, 1)), 'canonical')) === '{"$date":{"$numberLong":"1793491200000"}}', 'Extended JSON: canonical date');
  $('#oidIn').value = SAMPLE_OIDS; runOid();
  $('#oidGenAt').value = '2026-10-24T08:12:44'; genOids();
  $('#oidFrom').value = '2026-10-01T00:00:00'; $('#oidTo').value = '2026-11-01T00:00:00'; oidRange();
  console.assert(OID.ids.length === 5 && OID.ids[0].ts === 0x6ada0e04, 'ObjectId: 5 sample ids decoded');
  console.assert(OID.gen[0].startsWith('6adc687c'), 'ObjectId: generated from 2026-10-24 08:12:44 UTC');
  edMQ.set(pretty(SUBS10)); edMF.set('{ "plan.amount": { "$gte": 2000 }, "status": "active" }');
  $('#mqProj').value = '{ "customer.email": 1, "plan.id": 1, "plan.amount": 1 }'; $('#mqSort').value = '{ "plan.amount": -1 }';
  runMongo();
  console.assert(MQ.last && MQ.last.matched === 4 && MQ.last.docs[0]._id === 'sub_6Jd1KsY39', 'Query tester: 4 of 10 match, the enterprise plan first');
  console.assert(runFind(SUBS10, '{ features: "sso" }', '', '', 0).matched === 7, 'Query tester: an array field matches when any element does');
  edMS.set(pretty(SAMPLE_ANALYZE)); runAnalyze();
  console.assert(MA.fields.filter(f => f.mixed).map(f => f.path).join() === 'plan.seats,current_period_end', 'Schema analyzer: plan.seats and current_period_end have mixed types');
  edR.set(pretty(SAMPLE_REDACT)); runRedact().then(() => {
    const c = {}; RD.findings.forEach(f => { c[f.kind] = (c[f.kind] || 0) + 1; });
    console.assert(RD.findings.length === 14 && c.email === 2 && c.card === 1 && c.iban === 1 && c.apikey === 3 && c.jwt === 1 && c.ip === 2 && c.phone === 2 && c.secret === 2, 'Redact: 14 findings in the sample', c);
  });
}

/* copy buttons that point at an element */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const el = document.getElementById(b.dataset.copy); if (!el) return;
  copyText(el.value != null && el.tagName === 'TEXTAREA' ? el.value : el.textContent, b, 'Copied');
});

/* ---------------- Request a feature: writes a GitHub issue or an email; the form itself sends nothing ---------------- */
const RQ_ISSUES = 'https://github.com/Siddharthachuahan9/JSON0.dev/issues/new';
const RQ_MAIL = 'siddharthachauhan304@gmail.com';
const RQ_KINDS = {
  feature: { label: 'Feature request', label_gh: 'enhancement', hint: 'What should it do, and what would you use it for? A small sample helps. Leave out anything private.' },
  bug: { label: 'Bug report', label_gh: 'bug', hint: 'What you did, what happened, and what you expected instead. A small sample helps. Leave out anything private.' },
  question: { label: 'Question', label_gh: 'question', hint: 'Ask away. If it is about a document, a small made-up sample helps. Leave out anything private.' }
};
const RQ = { touched: {}, toolSet: false, mode: 'gh' };
function rqData() {
  const kind = RQ_KINDS[$('#rqKind').value] ? $('#rqKind').value : 'feature';
  const tool = $('#rqTool').value;
  return { kind, tool, toolName: tool === 'new' ? 'New tool' : (ROUTES[tool] || 'New tool'), title: $('#rqTitle').value.trim().replace(/\s+/g, ' '), details: $('#rqDetails').value.trim(), contact: $('#rqContact').value.trim() };
}
function rqErrors(d) {
  return {
    title: !d.title ? 'Give the request a title.' : d.title.length < 4 ? 'Make the title a few words long.' : '',
    details: !d.details ? 'Describe what you would like, or what went wrong.' : d.details.length < 20 ? 'Add a little more detail: at least 20 characters.' : ''
  };
}
function rqText(d, forMail) {
  const where = d.tool === 'new' ? 'New tool' : d.toolName + ' (https://json0.dev/' + d.tool + ')';
  const title = '[' + d.toolName + '] ' + (d.title || 'Untitled');
  const details = d.details || '(Your details appear here.)';
  if (forMail) {
    const body = ['Kind: ' + RQ_KINDS[d.kind].label, 'Tool: ' + where, 'Title: ' + (d.title || ''), '', details, ''].concat(d.contact ? ['From: ' + d.contact, ''] : []).concat(['Sent from the request form on json0.dev']).join('\n');
    return { title: 'json0 ' + RQ_KINDS[d.kind].label.toLowerCase() + ': ' + title, body };
  }
  const body = ['**Kind:** ' + RQ_KINDS[d.kind].label, '**Tool:** ' + where, '', details, '', '---'].concat(d.contact ? ['From: ' + d.contact] : []).concat(['Opened from the request form on json0.dev']).join('\n');
  return { title, body };
}
function rqUrls(d) {
  const gh = rqText(d, false), mail = rqText(d, true);
  let ghBody = gh.body, ghUrl;
  for (;;) {
    ghUrl = RQ_ISSUES + '?' + new URLSearchParams({ title: gh.title, body: ghBody, labels: RQ_KINDS[d.kind].label_gh }).toString();
    if (ghUrl.length <= 8000 || ghBody.length < 200) break;
    ghBody = ghBody.slice(0, Math.floor(ghBody.length * 0.85)) + '\n\n(Shortened: the rest did not fit in a link.)';
  }
  const crlf = t => encodeURIComponent(t.replace(/\r?\n/g, '\r\n'));
  return { gh: ghUrl, mail: 'mailto:' + RQ_MAIL + '?subject=' + crlf(mail.title) + '&body=' + crlf(mail.body), ghText: { title: gh.title, body: ghBody }, mailText: mail };
}
function rqShowErr(field, msg) {
  const inp = $(field === 'title' ? '#rqTitle' : '#rqDetails'), box = $(field === 'title' ? '#rqTitleErr' : '#rqDetailsErr');
  const show = !!msg && !!RQ.touched[field];
  box.hidden = !show; $('span', box).textContent = show ? msg : '';
  if (show) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
}
function rqRender() {
  const d = rqData(), errs = rqErrors(d), u = rqUrls(d);
  rqShowErr('title', errs.title); rqShowErr('details', errs.details);
  $('#rqGitHub').href = u.gh; $('#rqEmail').href = u.mail;
  $('#rqDetailsHint').textContent = RQ_KINDS[d.kind].hint;
  $('#rqDetailsCount').textContent = d.details.length.toLocaleString('en-US') + ' / 5,000';
  const t = RQ.mode === 'gh' ? u.ghText : u.mailText;
  $('#rqPrevTitle').textContent = t.title;
  $('#rqPrev').textContent = t.body;
  $('#rqPrevMeta').textContent = RQ.mode === 'gh' ? 'public once you submit it on GitHub' : 'to ' + RQ_MAIL;
  const ok = !errs.title && !errs.details;
  $('#rqSub').innerHTML = ok
    ? '<b>' + esc(RQ_KINDS[d.kind].label) + ' for ' + esc(d.toolName) + ' is ready</b>: open it as a GitHub issue or send it by email. The form itself sends nothing.'
    : 'Ask for a tool, report a bug or ask a question. <b>The form itself sends nothing</b>: it writes a GitHub issue or an email for you to send.';
  return { d, errs, u, ok };
}
function rqEnter(from) { if (!RQ.toolSet && from && from !== 'request' && ROUTES[from]) $('#rqTool').value = from; rqRender(); }
['#rqKind', '#rqTool', '#rqTitle', '#rqDetails', '#rqContact'].forEach(id => $(id).addEventListener('input', () => { if (id === '#rqTool') RQ.toolSet = true; rqRender(); }));
$('#rqKind').addEventListener('change', rqRender); $('#rqTool').addEventListener('change', () => { RQ.toolSet = true; rqRender(); });
$('#rqTitle').addEventListener('blur', () => { if ($('#rqTitle').value) { RQ.touched.title = true; rqRender(); } });
$('#rqDetails').addEventListener('blur', () => { if ($('#rqDetails').value) { RQ.touched.details = true; rqRender(); } });
['#rqGitHub', '#rqEmail'].forEach(id => $(id).addEventListener('click', e => {
  RQ.touched.title = RQ.touched.details = true;
  const r = rqRender();
  if (!r.ok) { e.preventDefault(); $(r.errs.title ? '#rqTitle' : '#rqDetails').focus(); say('Fill in the ' + (r.errs.title ? 'title' : 'details') + ' first'); return; }
  say(id === '#rqGitHub' ? 'GitHub opens in a new tab with the issue filled in' : 'Your mail app opens with the message written');
}));
$('#rqForm').addEventListener('submit', e => { e.preventDefault(); $('#rqGitHub').click(); });
$$('#rqPrevMode button').forEach(b => b.onclick = () => { RQ.mode = b.dataset.v; $$('#rqPrevMode button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); rqRender(); });
window.json0Request = { urls: () => rqUrls(rqData()), errors: () => rqErrors(rqData()) };
(() => {
  const d = { kind: 'bug', tool: 'csv', toolName: 'CSV viewer', title: 'Semicolon files', details: 'Line one\nLine two & more', contact: '@dana' };
  const u = rqUrls(d), q = new URL(u.gh).searchParams;
  console.assert(u.gh.startsWith(RQ_ISSUES + '?') && q.get('title') === '[CSV viewer] Semicolon files' && q.get('labels') === 'bug' && q.get('body').includes('Line two & more') && q.get('body').includes('From: @dana'), 'Request: the GitHub issue link carries the title, body and label', u.gh);
  console.assert(u.mail.startsWith('mailto:' + RQ_MAIL + '?subject=json0%20bug%20report%3A%20%5BCSV%20viewer%5D%20Semicolon%20files&body=') && u.mail.includes('Line%20one%0D%0ALine%20two%20%26%20more'), 'Request: the email link is encoded with CRLF line breaks', u.mail);
  console.assert(rqErrors({ title: '', details: 'short' }).title && rqErrors({ title: 'A title', details: 'short' }).details && !rqErrors({ title: 'A title', details: 'long enough to describe it' }).details, 'Request: title and details are validated');
})();

/* ---------------- routing, nav, theme, palette, keys ---------------- */
const ROUTES = { 'json-diff': 'Diff', jsonpath: 'Query', 'json-validate': 'Validate', 'json-format': 'Format', 'json-table': 'Table', 'json-schema': 'Schema and types', 'xml-to-json': 'XML to JSON', csv: 'CSV viewer', 'csv-diff': 'CSV diff', 'mongo-ejson': 'Extended JSON', objectid: 'ObjectId', 'mongo-query': 'Query tester', 'mongo-schema': 'Schema analyzer', redact: 'Redact', base64: 'Base64', jwt: 'JWT', hash: 'Hash', uuid: 'UUID', ip: 'IP', ping: 'Ping', request: 'Request a feature' };
const GROUP = r => ({ 'json-diff': 'JSON', jsonpath: 'JSON', 'json-validate': 'JSON', 'json-format': 'JSON', 'json-table': 'JSON', 'json-schema': 'JSON', 'xml-to-json': 'JSON', csv: 'CSV', 'csv-diff': 'CSV', 'mongo-ejson': 'MongoDB', objectid: 'MongoDB', 'mongo-query': 'MongoDB', 'mongo-schema': 'MongoDB', redact: 'Privacy', ip: 'Network', ping: 'Network', request: 'Feedback' }[r] || 'Encode');
const ICON = { 'json-diff': 'i-diff', jsonpath: 'i-query', 'json-validate': 'i-valid', ip: 'i-ip', ping: 'i-ping', base64: 'i-b64', jwt: 'i-jwt', hash: 'i-hash', uuid: 'i-uuid', 'xml-to-json': 'i-xml', 'json-format': 'i-format', 'json-table': 'i-table', 'json-schema': 'i-schema', csv: 'i-csv', 'csv-diff': 'i-csvdiff', 'mongo-ejson': 'i-ejson', objectid: 'i-oid', 'mongo-query': 'i-filter', 'mongo-schema': 'i-bars', redact: 'i-redact', request: 'i-request' };
/* Every tool has its own path (/json-diff, /csv …). The server renders the right view for each path;
   after that, moving between tools swaps the view in place and records the path with pushState. */
const TITLES = (() => { try { return JSON.parse($('#json0-routes').textContent); } catch (e) { return {}; } })();
let current = '', previous = '';
const routeOfPath = path => { const r = decodeURIComponent(path.replace(/^\/+|\/+$/g, '')); return r === '' ? 'json-diff' : r; };
function go(route) {
  if (!ROUTES[route]) route = 'json-diff';
  const path = '/' + route;
  if (location.pathname !== path || location.hash) { try { history.pushState(null, '', path); } catch (e) {} }
  show(route);
}
function show(route) {
  if (!ROUTES[route]) route = 'json-diff';
  if (current && current !== route) previous = current;
  current = route;
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== route; });
  $$('.nav-item').forEach(a => { if (a.dataset.route === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#mTool').textContent = ROUTES[route];
  if (TITLES[route]) document.title = TITLES[route];
  closeMenu();
  if (route === 'request') rqEnter(previous);
  if (route === 'json-diff') requestAnimationFrame(drawSeam);
}
$('#nav').addEventListener('click', e => {
  const a = e.target.closest('a.nav-item[data-route]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault(); go(a.dataset.route);
});
window.addEventListener('popstate', () => show(routeOfPath(location.pathname)));

/* Share links. New: /json-diff#s=<base64url JSON>. Also read: the prototype's #json-diff?s=<same>, and the
   old site's #s= or #share= links (lz-string, {tool, data}) for the diff, JSONPath and validate tools. */
const LZ = (() => {
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$', rev = {};
  for (let i = 0; i < keys.length; i++) rev[keys.charAt(i)] = i;
  function decompress(length, reset, next) {
    const dict = [0, 1, 2], data = { val: next(0), pos: reset, index: 1 }, out = [];
    let enlargeIn = 4, size = 4, numBits = 3, w, c, entry;
    const read = n => { let bits = 0, power = 1; const max = Math.pow(2, n); while (power !== max) { const b = data.val & data.pos; data.pos >>= 1; if (data.pos === 0) { data.pos = reset; data.val = next(data.index++); } bits |= (b > 0 ? 1 : 0) * power; power <<= 1; } return bits; };
    switch (read(2)) { case 0: c = String.fromCharCode(read(8)); break; case 1: c = String.fromCharCode(read(16)); break; default: return ''; }
    dict[3] = c; w = c; out.push(c);
    for (;;) {
      if (data.index > length) return '';
      let cc = read(numBits);
      if (cc === 0 || cc === 1) { dict[size++] = String.fromCharCode(read(cc === 0 ? 8 : 16)); cc = size - 1; enlargeIn--; }
      else if (cc === 2) return out.join('');
      if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      if (dict[cc]) entry = dict[cc]; else if (cc === size) entry = w + w.charAt(0); else return null;
      out.push(entry); dict[size++] = w + entry.charAt(0); enlargeIn--; w = entry;
      if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    }
  }
  return { fromURI: s => (s ? decompress(s.length, 32, i => rev[s.replace(/ /g, '+').charAt(i)]) : null) };
})();
function decodeShare(s) {
  try { const st = JSON.parse(b64uDec(s)); if (st && typeof st === 'object' && ('a' in st || 'b' in st)) return { route: 'json-diff', a: st.a || '', b: st.b || '', o: !!st.o }; } catch (e) {}
  try {
    const st = JSON.parse(LZ.fromURI(s) || 'null'), d = st && st.data;
    if (!d) return null;
    if (st.tool === 'diff' && (d.jsonA != null || d.jsonB != null)) return { route: 'json-diff', a: String(d.jsonA || ''), b: String(d.jsonB || ''), o: false };
    if (st.tool === 'jsonpath' && d.jsonSource != null) return { route: 'jsonpath', doc: String(d.jsonSource), query: d.query ? String(d.query) : '' };
    if (st.tool === 'validate' && d.jsonSource != null) return { route: 'json-validate', doc: String(d.jsonSource) };
  } catch (e) {}
  return null;
}
function applyShare(s) {
  const st = decodeShare(s);
  if (!st) { $('#diffSub').textContent = 'The shared link is damaged, so the sample is shown instead.'; return 'json-diff'; }
  if (st.route === 'json-diff') { edA.set(st.a); edB.set(st.b); D.opts.ignoreOrder = st.o; $('#optOrder').checked = st.o; D.names = { A: 'From the link', B: 'From the link' }; syncNames(); compare(); }
  else if (st.route === 'jsonpath') { edQ.set(st.doc); $('#qName').textContent = 'From the link'; if (st.query) $('#qPath').value = st.query; runQuery(); }
  else { edV.set(st.doc); $('#vName').textContent = 'From the link'; validate(); }
  return st.route;
}
/* reads the address once at start, and again when only the hash changes (a pasted share link) */
function readLocation() {
  const h = location.hash.slice(1);
  let route = routeOfPath(location.pathname), m;
  if ((m = /^([a-z0-9-]+)(?:\?(.*))?$/.exec(h)) && ROUTES[m[1]]) {
    route = m[1];
    const s = m[2] && new URLSearchParams(m[2]).get('s');
    if (s && route === 'json-diff') { route = applyShare(s); try { history.replaceState(null, '', '/' + route + '#s=' + s); } catch (e) {} }
    else { try { history.replaceState(null, '', '/' + route); } catch (e) {} }
  } else if ((m = /^(?:s|share)=(.+)$/.exec(h))) {
    route = applyShare(m[1]);
    if (location.pathname !== '/' + route) { try { history.replaceState(null, '', '/' + route + location.hash); } catch (e) {} }
  }
  show(route);
}
window.addEventListener('hashchange', readLocation);

const app = $('#app'), nav = $('#nav');
function openMenu() { nav.classList.add('open'); $('#menuBtn').setAttribute('aria-expanded', 'true'); $('.nav-item[aria-current]', nav)?.focus(); }
function closeMenu() { if (!nav.classList.contains('open')) return; nav.classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); }
$('#menuBtn').onclick = openMenu; $('#menuClose').onclick = closeMenu;

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark';
  $('#themeIcon').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  $('#themeLabel').textContent = dark ? 'Light' : 'Dark';
  $('#themeBtn').setAttribute('aria-label', dark ? 'Switch to the light theme' : 'Switch to the dark theme');
  store.set('json0-theme', t);
  requestAnimationFrame(drawSeam);
}
$('#themeBtn').onclick = () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

/* command palette */
const ACTIONS = [
  ...Object.keys(ROUTES).map(r => ({ label: ROUTES[r], hint: GROUP(r), icon: ICON[r], run: () => go(r) })),
  { label: 'Run the MongoDB filter', hint: 'Query tester', icon: 'i-filter', run: () => { go('mongo-query'); runMongo(); } },
  { label: 'Generate ObjectIds', hint: 'ObjectId', icon: 'i-oid', run: () => { go('objectid'); $('#oidGen').click(); } },
  { label: 'Copy the redacted document', hint: 'Redact', icon: 'i-redact', run: () => { go('redact'); $('#rdCopy').click(); } },
  { label: 'Remove duplicate CSV rows', hint: 'CSV viewer', icon: 'i-csv', run: () => { go('csv'); $('#csvDedupe').click(); } },
  { label: 'Copy the table as CSV', hint: 'Table', icon: 'i-table', run: () => { go('json-table'); $('#tblCSV').click(); } },
  { label: 'Minify JSON', hint: 'Format', icon: 'i-format', run: () => { go('json-format'); $('#fmtMode [data-v="minify"]').click(); } },
  { label: 'Format both documents', hint: 'Diff', icon: 'i-format', run: () => { go('json-diff'); $('#btnFormat').click(); } },
  { label: 'Swap Before and After', hint: 'Diff', icon: 'i-swap', run: () => { go('json-diff'); $('#btnSwap').click(); } },
  { label: 'Clear both documents', hint: 'Diff', icon: 'i-clear', run: () => { go('json-diff'); $('#btnClear').click(); } },
  { label: 'Copy share link', hint: 'Diff', icon: 'i-link', run: () => { go('json-diff'); $('#btnShare').click(); } },
  { label: 'Open a file as Before', hint: 'Diff', icon: 'i-upload', run: () => { go('json-diff'); $('[data-open="A"]').click(); } },
  { label: 'Toggle ignore array order', hint: 'Diff', icon: 'i-diff', run: () => { go('json-diff'); $('#optOrder').click(); } },
  { label: 'Load the subscription sample', hint: 'Diff', icon: 'i-diff', run: () => { go('json-diff'); loadSample(); } },
  { label: 'Guides', hint: 'Learn', icon: 'i-book', run: () => { location.href = '/guides'; } },
  { label: 'Switch theme', hint: 'View', icon: 'i-moon', run: () => $('#themeBtn').click() },
  { label: 'Hide or show the tool panel', hint: 'View', icon: 'i-menu', run: () => app.classList.toggle('nav-hidden') }
];
let palItems = [], palSel = 0, lastFocus = null;
function openPalette() { lastFocus = document.activeElement; $('#paletteWrap').hidden = false; $('#palIn').value = ''; filterPalette(); $('#palIn').focus(); }
function closePalette() { $('#paletteWrap').hidden = true; lastFocus && lastFocus.focus && lastFocus.focus(); }
function filterPalette() {
  const q = $('#palIn').value.trim().toLowerCase();
  palItems = ACTIONS.filter(a => !q || (a.label + ' ' + a.hint).toLowerCase().includes(q));
  palSel = 0; drawPalette();
}
function drawPalette() {
  $('#palList').innerHTML = palItems.length ? palItems.map((a, i) => '<li role="option" data-i="' + i + '" aria-selected="' + (i === palSel) + '"><svg aria-hidden="true"><use href="#' + a.icon + '"/></svg><span>' + esc(a.label) + '</span><small>' + a.hint + '</small></li>').join('') : '<p class="none">No tool or action matches.</p>';
  const s = $('#palList [aria-selected="true"]'); s && s.scrollIntoView({ block: 'nearest' });
}
$('#palIn').addEventListener('input', filterPalette);
$('#palIn').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); drawPalette(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); drawPalette(); }
  else if (e.key === 'Enter') { e.preventDefault(); const a = palItems[palSel]; if (a) { closePalette(); a.run(); } }
});
$('#palList').addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; const a = palItems[+li.dataset.i]; closePalette(); a.run(); });
$('#paletteWrap').addEventListener('mousedown', e => { if (e.target.id === 'paletteWrap') closePalette(); });
$('#searchBtn').onclick = openPalette;

document.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#paletteWrap').hidden ? openPalette() : closePalette(); }
  else if (mod && e.key === '/') { e.preventDefault(); app.classList.toggle('nav-hidden'); requestAnimationFrame(drawSeam); }
  else if (mod && e.key === 'Enter' && current === 'jsonpath') { e.preventDefault(); runQuery(); }
  else if (mod && e.key === 'Enter' && current === 'mongo-query') { e.preventDefault(); runMongo(); }
  else if (e.key === 'Escape') { if (!$('#paletteWrap').hidden) closePalette(); else closeMenu(); }
});

/* ---------------- start ---------------- */
const saved = store.get('json0-theme');
setTheme(saved === 'dark' ? 'dark' : 'light');
edA.set(pretty(SAMPLE_A)); edB.set(pretty(SAMPLE_B));
compare();
edQ.set(pretty(SAMPLE_B)); runQuery();
edV.set(BROKEN); validate();
$('#b64Text').value = '{"event":"invoice.paid","invoice":"in_7Hc2","amount_paid":2900}'; encodeB64();
$('#jwtIn').value = SAMPLE_JWT; decodeJWT();
$('#hashIn').value = 'ops@northwind-labs.io'; doHash();
genUUID();
$('#xmlIn').value = SAMPLE_XML; convertXML();
showIP(); showPing();
startDataTools();
readLocation();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(drawSeam));
})();
