/**
 * JSON-LD structured data for search results.
 */

import { SITE_URL, TOOL_ROUTES, type ToolRoute } from '@/lib/routing';

const CREATOR = { '@type': 'Person', name: 'Siddharthachuahan9', url: 'https://sidstack.in' };

export function generateWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'json0',
    alternateName: 'json0.dev',
    url: SITE_URL,
    description:
      'JSON, CSV and MongoDB tools that run in your browser: diff, query, validate, format, tables, schemas, redaction and more. Nothing you paste leaves your device.',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    creator: CREATOR,
    featureList: TOOL_ROUTES.filter((r) => r.group !== 'Feedback').map((r) => r.name),
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    softwareVersion: '2.0',
  };
}

export function generateToolSchema(route: ToolRoute) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: route.name,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_URL}/${route.slug}`,
    description: route.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    creator: CREATOR,
    inLanguage: 'en-US',
    featureList: route.features,
  };
}

export function generateBreadcrumbSchema(route: ToolRoute) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'json0', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: route.name, item: `${SITE_URL}/${route.slug}` },
    ],
  };
}

/** Serialises JSON-LD for a <script> tag; "<" is escaped so the data cannot close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
