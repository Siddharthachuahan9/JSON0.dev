import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Json0Page } from '@/components/Json0Page';
import { SITE_URL, getAllRouteSlugs, getRoute } from '@/lib/routing';
import { generateBreadcrumbSchema, generateToolSchema } from '@/lib/seo/jsonld';

interface ToolPageProps {
  params: Promise<{ tool: string }>;
}

/** Only the known tools exist; any other path is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllRouteSlugs().map((tool) => ({ tool }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const route = getRoute((await params).tool);
  if (!route) return {};
  const url = `${SITE_URL}/${route.slug}`;
  return {
    title: { absolute: route.title },
    description: route.description,
    alternates: { canonical: url },
    openGraph: { title: route.title, description: route.description, url, type: 'website', siteName: 'json0' },
    twitter: { card: 'summary', title: route.title, description: route.description },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const route = getRoute((await params).tool);
  if (!route) notFound();
  return <Json0Page slug={route.slug} schemas={[generateToolSchema(route), generateBreadcrumbSchema(route)]} />;
}
