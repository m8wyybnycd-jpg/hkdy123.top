import { Helmet } from "react-helmet-async";
import {
  seoConfig,
  organizationJsonLd,
  websiteJsonLd,
  breadcrumbJsonLd,
  SITE_URL,
  SITE_NAME,
} from "../data/seoConfig";

interface SEOProps {
  /** Page key in seoConfig (e.g. "cloud-games", "home") */
  pageKey: string;
  /** Page name for breadcrumb (defaults to title) */
  breadcrumbName?: string;
}

/**
 * Reusable SEO component that sets dynamic title, meta description,
 * keywords, canonical URL, Open Graph tags, Twitter Card tags,
 * and JSON-LD structured data for each page.
 *
 * Usage: <SEO pageKey="cloud-games" />
 */
export default function SEO({ pageKey, breadcrumbName }: SEOProps) {
  const config = seoConfig[pageKey];
  if (!config) return null;

  const canonicalUrl = `${SITE_URL}${config.path}`;
  const ogImageUrl = `${SITE_URL}/og-image.svg`;
  const breadcrumb = breadcrumbJsonLd(config.path, breadcrumbName || config.title.split(" - ")[0]);

  return (
    <Helmet>
      {/* Title & Meta */}
      <title>{config.title}</title>
      <meta name="description" content={config.description} />
      <meta name="keywords" content={config.keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={config.ogType || "website"} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={config.title} />
      <meta property="og:description" content={config.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content="zh_CN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={config.title} />
      <meta name="twitter:description" content={config.description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(organizationJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumb)}
      </script>
    </Helmet>
  );
}
