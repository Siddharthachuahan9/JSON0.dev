/**
 * Routes: every tool has its own path. The server renders that tool's view for each path; the client
 * script (public/json0.js) switches views in place with history.pushState and sets document.title from
 * the titles here.
 */

export type ToolGroup = 'JSON' | 'CSV' | 'MongoDB' | 'Privacy' | 'Encode' | 'Network' | 'Feedback';

export interface ToolRoute {
  slug: string;
  /** The tool's name as people search for it (JSON-LD, breadcrumbs). */
  name: string;
  group: ToolGroup;
  title: string;
  description: string;
  features: string[];
}

export const SITE_URL = 'https://json0.dev';
export const DEFAULT_SLUG = 'json-diff';

export const TOOL_ROUTES: ToolRoute[] = [
  {
    slug: 'json-diff',
    name: 'JSON Diff',
    group: 'JSON',
    title: 'JSON Diff - Compare JSON Online | json0',
    description:
      'Compare two JSON documents side by side and see every added, removed and changed key, with array order optional. Runs locally in your browser; nothing is uploaded.',
    features: ['Side-by-side JSON comparison', 'Added, removed and changed keys by path', 'Ignore array order', 'Shareable links kept in the URL hash'],
  },
  {
    slug: 'jsonpath',
    name: 'JSONPath Query',
    group: 'JSON',
    title: 'JSONPath Query Tool - Query JSON Online | json0',
    description:
      'Run JSONPath expressions against a JSON document and see each match with its path. Runs locally in your browser; nothing is uploaded.',
    features: ['JSONPath expressions', 'Every match with its path', 'Recursive descent and wildcards', 'Local processing'],
  },
  {
    slug: 'json-validate',
    name: 'JSON Validator',
    group: 'JSON',
    title: 'JSON Validator - Validate JSON Online | json0',
    description:
      'Validate JSON and get the exact line, column and reason for every syntax error, with the broken lines shown. Runs locally in your browser; nothing is uploaded.',
    features: ['JSON syntax validation', 'Line and column of each error', 'Plain-language error messages', 'Local processing'],
  },
  {
    slug: 'json-format',
    name: 'JSON Formatter',
    group: 'JSON',
    title: 'JSON Formatter and Minifier - Pretty-Print JSON | json0',
    description:
      'Pretty-print, minify, sort keys, or escape and unescape JSON as a string, with the size before and after. Runs locally in your browser; nothing is uploaded.',
    features: ['Pretty-print at 2 or 4 spaces or tabs', 'Minify', 'Sort keys', 'Escape and unescape JSON strings'],
  },
  {
    slug: 'json-table',
    name: 'JSON to Table',
    group: 'JSON',
    title: 'JSON to Table - View a JSON Array as a Table, Export CSV | json0',
    description:
      'Turn a JSON array into a sortable, filterable table with nested objects flattened into columns, then copy it as CSV, TSV or Markdown. Runs locally in your browser.',
    features: ['JSON array to table', 'Nested objects flattened to dot paths', 'Sort and filter rows', 'Copy as CSV, TSV or Markdown'],
  },
  {
    slug: 'json-schema',
    name: 'JSON Schema Generator',
    group: 'JSON',
    title: 'JSON Schema, TypeScript and Zod from JSON | json0',
    description:
      'Infer a JSON Schema, TypeScript types and a Zod schema from sample JSON, then validate documents against it. Runs locally in your browser; nothing is uploaded.',
    features: ['JSON Schema (draft 2020-12) inference', 'TypeScript types', 'Zod schema', 'Validate a document against the schema'],
  },
  {
    slug: 'xml-to-json',
    name: 'XML to JSON Converter',
    group: 'JSON',
    title: 'XML to JSON Converter - Convert XML Locally | json0',
    description:
      'Convert XML to JSON with attributes and text kept and repeated elements turned into arrays. Runs locally in your browser; nothing is uploaded.',
    features: ['XML to JSON conversion', 'Attributes as @name, text as #text', 'Repeated elements become arrays', 'Local processing'],
  },
  {
    slug: 'csv',
    name: 'CSV Viewer',
    group: 'CSV',
    title: 'CSV Viewer - Open, Filter and Convert CSV to JSON | json0',
    description:
      'Open a CSV or TSV file as a table, profile every column, find and remove duplicate rows, and convert it to JSON or NDJSON. Runs locally in your browser.',
    features: ['CSV and TSV viewer with delimiter detection', 'Column profile', 'Duplicate rows found and removed', 'CSV to JSON and NDJSON'],
  },
  {
    slug: 'csv-diff',
    name: 'CSV Diff',
    group: 'CSV',
    title: 'CSV Diff - Compare Two CSV Files by Key Column | json0',
    description:
      'Compare two CSV exports row by row on a key column and see the rows added, removed and every changed cell. Runs locally in your browser; nothing is uploaded.',
    features: ['Row-by-row CSV comparison', 'Key column chosen automatically', 'Added, removed and changed cells', 'Copy a report'],
  },
  {
    slug: 'mongo-ejson',
    name: 'MongoDB Extended JSON Converter',
    group: 'MongoDB',
    title: 'MongoDB Extended JSON Converter - mongosh, EJSON, JSON | json0',
    description:
      'Convert between mongosh shell syntax, canonical and relaxed Extended JSON v2 and plain JSON, keeping ObjectId, Date, Long and Decimal128 types. Runs locally in your browser.',
    features: ['mongosh shell syntax', 'Canonical and relaxed Extended JSON v2', 'Plain JSON', 'Typed values listed by path'],
  },
  {
    slug: 'objectid',
    name: 'MongoDB ObjectId Decoder',
    group: 'MongoDB',
    title: 'MongoDB ObjectId to Timestamp - Decode and Generate | json0',
    description:
      'Read the creation time inside MongoDB ObjectIds, generate ObjectIds for a date, and build an _id range filter for a time window. Runs locally in your browser.',
    features: ['ObjectId to timestamp', 'Byte-by-byte anatomy', 'Generate ObjectIds for a date', '_id range filter for a time window'],
  },
  {
    slug: 'mongo-query',
    name: 'MongoDB Query Tester',
    group: 'MongoDB',
    title: 'MongoDB Query Tester - Run find() Filters on JSON | json0',
    description:
      'Test a MongoDB find filter, projection, sort and limit on pasted documents and see which ones match, without a database. Runs locally in your browser.',
    features: ['MongoDB find filters', 'Projection, sort and limit', 'Operators such as $gte, $in, $regex and $exists', 'No database needed'],
  },
  {
    slug: 'mongo-schema',
    name: 'MongoDB Schema Analyzer',
    group: 'MongoDB',
    title: 'MongoDB Schema Analyzer - Field Types and Presence | json0',
    description:
      'See every field across a set of MongoDB documents with its types, how often it is present, and which fields have mixed types to fix. Runs locally in your browser.',
    features: ['Every field across documents', 'Type share per field', 'Presence per field', 'Mixed and optional fields flagged'],
  },
  {
    slug: 'redact',
    name: 'JSON and CSV Redactor',
    group: 'Privacy',
    title: 'Redact JSON and CSV - Mask Secrets and Personal Data | json0',
    description:
      'Find emails, phone numbers, card numbers, IBANs, API keys, JWTs and IP addresses in JSON or CSV, then mask, fake, hash or remove them. Runs locally in your browser.',
    features: ['Finds personal data and secrets', 'Card numbers checked with Luhn, IBANs with their checksum', 'Mask, fake, hash or remove each kind', 'Local processing with Web Crypto'],
  },
  {
    slug: 'base64',
    name: 'Base64 Encoder and Decoder',
    group: 'Encode',
    title: 'Base64 Encoder and Decoder Online | json0',
    description:
      'Encode text to Base64 or decode it back, with UTF-8 handled and an optional URL-safe alphabet. Runs locally in your browser; nothing is uploaded.',
    features: ['Encode to Base64', 'Decode from Base64', 'URL-safe alphabet', 'UTF-8 text'],
  },
  {
    slug: 'jwt',
    name: 'JWT Decoder',
    group: 'Encode',
    title: 'JWT Decoder - Decode JWT Tokens Online | json0',
    description:
      'Decode a JSON Web Token and read its header, payload and claims, with issue and expiry times in plain dates. Runs locally in your browser; nothing is uploaded.',
    features: ['Decode JWT header and payload', 'Claims with readable dates', 'Expiry checked against your clock', 'Local processing'],
  },
  {
    slug: 'hash',
    name: 'Hash Generator',
    group: 'Encode',
    title: 'Hash Generator - SHA-1, SHA-256, SHA-384, SHA-512 | json0',
    description:
      'Compute SHA-1, SHA-256, SHA-384 and SHA-512 digests of any text with the browser’s Web Crypto. Runs locally in your browser; nothing is uploaded.',
    features: ['SHA-1, SHA-256, SHA-384, SHA-512', 'Web Crypto', 'Hex output', 'Local processing'],
  },
  {
    slug: 'uuid',
    name: 'UUID Generator',
    group: 'Encode',
    title: 'UUID Generator - Generate v4 UUIDs Online | json0',
    description:
      'Generate up to 50 version 4 UUIDs at once from crypto.randomUUID, in lower or upper case, and copy them all. Runs locally in your browser.',
    features: ['Version 4 UUIDs', 'Bulk generation', 'Upper or lower case', 'crypto.randomUUID'],
  },
  {
    slug: 'ip',
    name: 'IP Address Inspector',
    group: 'Network',
    title: 'IP Address Inspector - IPv4 and IPv6 Details | json0',
    description:
      'Read an IPv4 or IPv6 address locally: its version, its range (private, shared, loopback, public and more) and its integer, hex and binary forms. Nothing is uploaded.',
    features: ['IPv4 and IPv6', 'Private, shared and reserved ranges', 'Integer, hex and binary forms', 'Local processing'],
  },
  {
    slug: 'ping',
    name: 'Ping Tool',
    group: 'Network',
    title: 'Ping Tool - Time HTTPS Requests to a Host | json0',
    description:
      'Check a host or URL and see the HTTPS requests that would time it, since browsers cannot send ICMP pings. This version sends no network requests.',
    features: ['Host and URL parsing', 'HTTPS timing plan instead of ICMP', 'No network requests'],
  },
  {
    slug: 'request',
    name: 'Request a Feature',
    group: 'Feedback',
    title: 'Request a Feature or Report a Bug | json0',
    description:
      'Ask for a new json0 tool, report a bug or ask a question. The form writes a GitHub issue or an email for you to send; it sends nothing by itself.',
    features: ['Feature requests, bug reports and questions', 'Prefilled GitHub issue', 'Prefilled email'],
  },
];

export function getRoute(slug: string): ToolRoute | null {
  return TOOL_ROUTES.find((r) => r.slug === slug) ?? null;
}

export function getAllRouteSlugs(): string[] {
  return TOOL_ROUTES.map((r) => r.slug);
}

/** slug -> document.title, read by the client script when it switches views. */
export function getTitleMap(): Record<string, string> {
  return Object.fromEntries(TOOL_ROUTES.map((r) => [r.slug, r.title]));
}
