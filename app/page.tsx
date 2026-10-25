import type { Metadata } from 'next';
import { Json0Page } from '@/components/Json0Page';
import { DEFAULT_SLUG, SITE_URL, getRoute } from '@/lib/routing';
import { generateToolSchema, generateWebApplicationSchema } from '@/lib/seo/jsonld';

const route = getRoute(DEFAULT_SLUG)!;
const title = 'json0 - JSON Diff and JSON, CSV and MongoDB Tools Online';
const description =
  'Compare JSON side by side, then query, validate, format, tabulate, redact and convert JSON, CSV and MongoDB data. Everything runs in your browser; nothing is uploaded.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: { title, description, url: `${SITE_URL}/`, type: 'website', siteName: 'json0' },
  twitter: { card: 'summary', title, description },
};

export default function Home() {
  return <Json0Page slug={DEFAULT_SLUG} schemas={[generateWebApplicationSchema(), generateToolSchema(route)]} />;
}
