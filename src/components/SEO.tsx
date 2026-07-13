import { Helmet } from "react-helmet-async";
import {
  seoConfig,
  organizationJsonLd,
  websiteJsonLd,
  breadcrumbJsonLd,
  SITE_URL,
  SITE_NAME,
} from "../data/seoConfig";
import type { PageConfig } from "../types/pageConfig";

interface SEOProps {
  /** Page key in seoConfig (e.g. "cloud-games", "home") */
  pageKey: string;
  /** Page name for breadcrumb (defaults to title) */
  breadcrumbName?: string;
  /**
   * Dynamic page config from D1 (via usePageConfigs). When provided,
   * the admin-managed title and description override the static seoConfig
   * values, so SEO meta tags stay in sync with backend edits.
   */
  pageConfig?: PageConfig | null;
}

/**
 * Reusable SEO component that sets dynamic title, meta description,
 * keywords, canonical URL, Open Graph tags, Twitter Card tags,
 * and JSON-LD structured data for each page.
 *
 * If `pageConfig` is provided (from the D1-backed page_configs table),
 * its `title` and `description` fields take precedence over the static
 * `seoConfig` baseline, enabling admin-managed SEO without code deploys.
 *
 * Usage: <SEO pageKey="cloud-games" pageConfig={config} />
 */
export default function SEO({ pageKey, breadcrumbName, pageConfig }: SEOProps) {
  const staticConfig = seoConfig[pageKey];
  if (!staticConfig) return null;

  // Admin-managed values override static defaults when available
  const title = pageConfig?.title || staticConfig.title;
  const description = pageConfig?.description || staticConfig.description;
  const subtitle = pageConfig?.subtitle || staticConfig.description;

  const canonicalUrl = `${SITE_URL}${staticConfig.path}`;
  const ogImageUrl = `${SITE_URL}/og-image.svg`;
  const breadcrumb = breadcrumbJsonLd(staticConfig.path, breadcrumbName || title.split(" - ")[0]);

  return (
    <Helmet>
      {/* Title & Meta */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={staticConfig.keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={staticConfig.ogType || "website"} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={subtitle} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content="zh_CN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
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
